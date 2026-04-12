const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Match = require("./models/Match");
const Challenge = require("./models/Challenge");
const { runChallengeCode } = require("./utils/runChallengeCode");
const { detectCodeOrigin } = require("./services/mlDetectionAgent");

let io;

// Matchmaking queues 
const matchmakingQueue = {
    training: [],
    ranked: []
};

// Map each userId to a SET of active sockets (to handle multi-tab)
const userSockets = new Map();

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
            credentials: true
        }
    });

    io.on("connection", async (socket) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            socket.disconnect();
            return;
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = String(decoded.id);

            const user = await User.findById(userId).select("username avatar");

            socket.userId = userId;
            socket.userUsername = user?.username || "Player";
            socket.userAvatar = user?.avatar || "";

            console.log(`[Socket] User ${socket.userUsername} connected (${socket.id})`);

            // Register socket in user's socket set
            if (!userSockets.has(userId)) {
                userSockets.set(userId, new Set());
            }
            userSockets.get(userId).add(socket);

            // Join universal user room for broadcasts
            socket.join(`user:${userId}`);

            await User.findByIdAndUpdate(userId, { isOnline: true });
            io.emit("userStatusChanged", { userId, isOnline: true });
            io.emit("statsUpdate", { onlineCount: userSockets.size });

            // --- 1. Matchmaking ---

            socket.on("findMatch", async ({ type }) => {
                console.log(`[ARENA] Search request received from ${socket.userUsername}`);

                // Allow matching with self by filtering by socketId
                matchmakingQueue[type] = matchmakingQueue[type].filter(p => p.socketId !== socket.id);

                if (matchmakingQueue[type].length > 0) {
                    const opponent = matchmakingQueue[type].shift();
                    console.log(`[ARENA] FOUND MATCH: ${socket.userUsername} vs ${opponent.username}`);

                    try {
                        let challenge = await Challenge.findOne({ type: "Battle" }) || await Challenge.findOne();
                        if (!challenge) {
                            console.error("[ARENA] No challenges found in DB!");
                            return;
                        }

                        const match = new Match({
                            players: [
                                { user: opponent.userId, username: opponent.username, avatar: opponent.avatar, socketId: opponent.socketId },
                                { user: userId, username: socket.userUsername, avatar: socket.userAvatar, socketId: socket.id }
                            ],
                            type: "training",
                            status: "live",
                            challenge: {
                                title: challenge.title,
                                description: challenge.description,
                                data: {
                                    [challenge.language || 'javascript']: challenge,
                                    // Also provide fallback for other languages if possible or use the same
                                    'javascript': challenge,
                                    'python': challenge,
                                    'java': challenge
                                }
                            },
                            startedAt: new Date()
                        });

                        await match.save();
                        console.log(`[ARENA] Match created in database: ${match._id}`);

                        const payload = { matchId: match._id.toString(), roomId: `match:${match._id}`, match };

                        // Multi-channel emission for maximum reliability
                        io.to(`user:${userId}`).emit("matchFound", payload);
                        io.to(`user:${opponent.userId}`).emit("matchFound", payload);

                        // Direct feedback to current socket
                        socket.emit("matchFound", payload);

                        // Find opponent socket by ID and emit directly
                        const opponentSocket = Array.from(io.sockets.sockets.values()).find(s => s.id === opponent.socketId);
                        if (opponentSocket) opponentSocket.emit("matchFound", payload);

                        console.log(`[ARENA] Redirection dispatched successfully`);

                    } catch (err) {
                        console.error("[ARENA] Failed to create match:", err);
                    }
                } else {
                    console.log(`[ARENA] Adding ${socket.userUsername} to ${type} queue`);
                    matchmakingQueue[type].push({
                        userId: userId,
                        socketId: socket.id,
                        username: socket.userUsername,
                        avatar: socket.userAvatar
                    });
                }
            });

            socket.on("cancelSearch", () => {
                for (const mode in matchmakingQueue) {
                    matchmakingQueue[mode] = matchmakingQueue[mode].filter(p => p.socketId !== socket.id);
                }
            });

            // --- 2. Live Combat Sync ---

            socket.on("joinMatch", async ({ matchId, roomId }) => {
                const actualRoomId = roomId || `match:${matchId}`;
                socket.join(actualRoomId);

                try {
                    const match = await Match.findById(matchId);
                    if (!match) return;

                    // Support for multi-tab testing with the same account
                    // Find if I'm already assigned, or find an empty/stale slot
                    let pIndex = match.players.findIndex(p => p.socketId === socket.id);

                    if (pIndex === -1) {
                        // Find a slot for this userId that is either empty OR has a disconnected socket
                        pIndex = match.players.findIndex(p => {
                            if (p.user.toString() !== userId) return false;
                            if (!p.socketId) return true;
                            // Check if the stored socket is still alive
                            return !io.sockets.sockets.has(p.socketId);
                        });
                    }

                    if (pIndex !== -1) {
                        match.players[pIndex].socketId = socket.id;
                        match.markModified('players');
                        await match.save();
                        socket.playerIndex = pIndex;
                        console.log(`[ARENA] Assigned ${socket.userUsername} to slot ${pIndex}`);
                    }

                    socket.emit("matchFound", { match });
                } catch (err) {
                    console.error("[ARENA] Error during joinMatch:", err);
                }
            });

            socket.on("executeIncantation", async ({ matchId, roomId, code, language }) => {
                try {
                    // 1. Initial validation
                    const match = await Match.findOne({ _id: matchId });
                    if (!match || (match.status !== "live" && match.status !== "waiting")) return;

                    const idx = socket.playerIndex;
                    if (idx === undefined) return;
                    if (match.players[idx].finished) return;

                    console.log(`[Arena] ${socket.userUsername} casts a spell`);
                    const lang = language || 'javascript';
                    const challengeData = match.challenge?.data?.[lang];
                    const testResults = runChallengeCode(lang, code, challengeData?.testCases || []);
                    const mlResult = await detectCodeOrigin(code);

                    // 2. Atomic update of attacker state
                    const updateAttacker = {};
                    updateAttacker[`players.${idx}.code`] = code;
                    updateAttacker[`players.${idx}.mlDetection`] = { prediction: mlResult.prediction, label: mlResult.label };

                    const updatedMatch = await Match.findOneAndUpdate(
                        { _id: matchId },
                        { $set: updateAttacker },
                        { new: true }
                    );

                    // 3. Handle damage if test passed
                    if (testResults.passed) {
                        const damage = 25;
                        const oppIdx = idx === 0 ? 1 : 0;
                        const opp = updatedMatch.players[oppIdx];
                        if (opp) {
                            const newHealth = Math.max(0, opp.health - damage);

                            // Atomic update of defender health
                            const defenderUpdate = {};
                            defenderUpdate[`players.${oppIdx}.health`] = newHealth;

                            const finalMatch = await Match.findOneAndUpdate(
                                { _id: matchId },
                                { $set: defenderUpdate },
                                { new: true }
                            );

                            if (newHealth <= 0) {
                                // KO victory!
                                finalMatch.status = "completed";
                                finalMatch.winner = userId;
                                finalMatch.completedAt = new Date();
                                await finalMatch.save();
                                const endPayload = { winnerId: userId, match: finalMatch };
                                io.to(roomId).emit("matchEnded", endPayload);
                                io.to(`user:${finalMatch.players[0].user}`).emit("matchEnded", endPayload);
                                io.to(`user:${finalMatch.players[1].user}`).emit("matchEnded", endPayload);
                            } else {
                                // Just damage
                                io.to(roomId).emit("opponentBattleEvent", {
                                    event: "damageTaken",
                                    data: {
                                        attackerId: userId,
                                        targetId: opp.user,
                                        damage,
                                        newHealth,
                                        results: testResults.testResults,
                                        output: testResults.outputSnapshot
                                    }
                                });
                            }
                        }
                    } else {
                        socket.emit("opponentBattleEvent", {
                            event: "spellFizzled",
                            data: { results: testResults.testResults, output: testResults.outputSnapshot }
                        });
                    }
                } catch (err) {
                    console.error("Incantation error:", err);
                }
            });

            socket.on("codeUpdate", ({ roomId, code }) => {
                socket.to(roomId).emit("opponentCodeUpdate", { code });
            });

            socket.on("battleEvent", ({ roomId, event, data }) => {
                socket.to(roomId).emit("opponentBattleEvent", { event, data });
            });

            socket.on("submitMatch", async ({ roomId, matchId, code, language }) => {
                try {
                    const idx = socket.playerIndex;
                    if (idx === undefined) return;
                    console.log(`[Arena] Submit from ${socket.userUsername} (Slot ${idx})`);
                    const mlResult = await detectCodeOrigin(code);

                    const updateQuery = {};
                    updateQuery[`players.${idx}.finished`] = true;
                    updateQuery[`players.${idx}.code`] = code;
                    updateQuery[`players.${idx}.mlDetection`] = { prediction: mlResult.prediction, label: mlResult.label };

                    const match = await Match.findOneAndUpdate(
                        { _id: matchId },
                        { $set: updateQuery },
                        { new: true }
                    );

                    if (!match) return;

                    const allFinished = match.players.every(p => p.finished);
                    console.log(`[Arena] Submission saved for slot ${idx}. All finished? ${allFinished}`);

                    if (allFinished) {
                        const p1Id = (match.players[0].user?._id || match.players[0].user).toString();
                        const p2Id = (match.players[1].user?._id || match.players[1].user).toString();
                        let winnerId = "draw";
                        if (match.players[0].health > match.players[1].health) winnerId = p1Id;
                        else if (match.players[1].health > match.players[0].health) winnerId = p2Id;

                        const finalMatch = await Match.findOneAndUpdate(
                            { _id: matchId },
                            { $set: { status: "completed", winner: winnerId === "draw" ? null : winnerId, completedAt: new Date() } },
                            { new: true }
                        );

                        const endPayload = { winnerId, match: finalMatch };
                        io.to(roomId).emit("matchEnded", endPayload);
                        io.to(`user:${p1Id}`).emit("matchEnded", endPayload);
                        io.to(`user:${p2Id}`).emit("matchEnded", endPayload);
                        console.log(`[Arena] Match ${matchId} completed. Winner: ${winnerId}`);
                    } else {
                        socket.emit("waitingForOpponent");
                        const myUid = (match.players[idx].user?._id || match.players[idx].user).toString();
                        io.to(roomId).emit("playerFinished", { userId: myUid, username: socket.userUsername });
                    }
                } catch (err) {
                    console.error("Submission error:", err);
                }
            });

            socket.on("quitMatch", async ({ roomId, matchId }) => {
                try {
                    const match = await Match.findById(matchId);
                    if (match && match.status !== "completed") {
                        const winner = match.players.find(p => p.user.toString() !== userId);
                        match.status = "completed";
                        match.winner = winner ? winner.user : null;
                        match.completedAt = new Date();
                        await match.save();
                        io.to(roomId).emit("matchEnded", { winnerId: match.winner, match });
                    }
                } catch (err) { }
            });

            socket.on("disconnect", async () => {
                const sessions = userSockets.get(userId);
                if (sessions) {
                    sessions.delete(socket);
                    if (sessions.size === 0) {
                        userSockets.delete(userId);
                        for (const mode in matchmakingQueue) {
                            matchmakingQueue[mode] = matchmakingQueue[mode].filter(p => p.userId !== userId);
                        }
                    }
                }

                if (socket.userId) {
                    setTimeout(async () => {
                        const activeSessions = userSockets.get(socket.userId);
                        if (!activeSessions || activeSessions.size === 0) {
                            await User.findByIdAndUpdate(socket.userId, { isOnline: false });
                            io.emit("userStatusChanged", { userId: socket.userId, isOnline: false });
                        }
                    }, 1500);
                }
            });

        } catch (error) {
            socket.disconnect();
        }
    });

    return io;
};

const getIO = () => {
    if (!io) throw new Error("Socket.io not initialized!");
    return io;
};

module.exports = { initSocket, getIO };
