const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Match = require("./models/Match");
const Challenge = require("./models/Challenge");
const { runChallengeCode } = require("./utils/runChallengeCode");

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
            const userId = decoded.id.toString();

            const user = await User.findById(userId).select("username avatar");
            
            socket.userId = userId;
            socket.userUsername = user?.username || "Player";
            socket.userAvatar = user?.avatar || "";

            // Register socket in user's socket set
            if (!userSockets.has(userId)) {
                userSockets.set(userId, new Set());
            }
            userSockets.get(userId).add(socket);
            
            // Join universal user room for high-reliability broadcasts
            socket.join(`user:${userId}`);

            console.log(`[Socket] User ${socket.userUsername} connected (${userSockets.get(userId).size} active sessions)`);

            await User.findByIdAndUpdate(userId, { isOnline: true });
            io.emit("userStatusChanged", { userId, isOnline: true });

            // --- 1. Matchmaking ---

            socket.on("findMatch", async ({ type }) => {
                if (!matchmakingQueue[type]) return;

                console.log(`[Arena] Search: ${socket.userUsername} (${type})`);

                // Clean existing queue entries for this user
                matchmakingQueue[type] = matchmakingQueue[type].filter(p => p.userId !== userId);

                let opponent = null;
                while (matchmakingQueue[type].length > 0) {
                    const candidate = matchmakingQueue[type].shift();
                    const activeSessions = userSockets.get(candidate.userId);
                    
                    if (activeSessions && activeSessions.size > 0) {
                        opponent = candidate;
                        break;
                    }
                }

                if (opponent) {
                    try {
                        console.log(`[Arena] MATCH FOUND: ${opponent.username} vs ${socket.userUsername}`);

                        let challenge = await Challenge.findOne({ type: "Battle" }) || await Challenge.findOne();
                        if (!challenge) {
                            io.to(`user:${userId}`).emit("error", { message: "No challenges in DB" });
                            return;
                        }

                        const match = new Match({
                            players: [
                                { user: opponent.userId, username: opponent.username, avatar: opponent.avatar },
                                { user: userId, username: socket.userUsername, avatar: socket.userAvatar }
                            ],
                            type,
                            status: "waiting",
                            challenge: {
                                title: challenge.title,
                                description: challenge.description,
                                data: { [challenge.language || 'javascript']: challenge }
                            },
                            startedAt: new Date()
                        });

                        await match.save();

                        const payload = { 
                            matchId: match._id.toString(), 
                            roomId: `match:${match._id}`,
                            match 
                        };

                        // Join rooms for all current user sessions 
                        userSockets.get(userId)?.forEach(s => s.join(payload.roomId));
                        userSockets.get(opponent.userId)?.forEach(s => s.join(payload.roomId));

                        // NUCLEAR BROADCAST: Send to user rooms AND direct sockets
                        // Ensure redirection happens everywhere
                        io.to(`user:${userId}`).emit("matchFound", payload);
                        io.to(`user:${opponent.userId}`).emit("matchFound", payload);
                        
                        console.log(`[Arena] Redirection sent to user:${userId} and user:${opponent.userId}`);
                        
                        // TIMER SAFETY: End match after 3:30 (210s)
                        setTimeout(async () => {
                            try {
                                const currentMatch = await Match.findById(match._id);
                                if (currentMatch && currentMatch.status !== "completed") {
                                    // Determine winner by health
                                    let winnerId = "draw";
                                    const p1 = currentMatch.players[0];
                                    const p2 = currentMatch.players[1];
                                    
                                    if (p1.health > p2.health) winnerId = p1.user;
                                    else if (p2.health > p1.health) winnerId = p2.user;
                                    
                                    currentMatch.status = "completed";
                                    currentMatch.winner = winnerId === "draw" ? null : winnerId;
                                    currentMatch.completedAt = new Date();
                                    await currentMatch.save();
                                    
                                    io.to(payload.roomId).emit("matchEnded", { winnerId, match: currentMatch });
                                    console.log(`[Arena] Match ${match._id} expired. Winner: ${winnerId}`);
                                }
                            } catch (e) { }
                        }, 210000); // 3m 30s

                    } catch (err) {
                        console.error("[Arena] Match error:", err);
                    }
                } else {
                    matchmakingQueue[type].push({
                        userId: userId,
                        username: socket.userUsername,
                        avatar: socket.userAvatar
                    });
                }
            });

            socket.on("cancelSearch", () => {
                for (const mode in matchmakingQueue) {
                    matchmakingQueue[mode] = matchmakingQueue[mode].filter(p => p.userId !== userId);
                }
            });

            // --- 2. Live Combat Sync ---

            socket.on("joinMatch", async ({ matchId, roomId }) => {
                const actualRoomId = roomId || `match:${matchId}`;
                socket.join(actualRoomId);
                try {
                    const match = await Match.findById(matchId);
                    if (match) socket.emit("matchFound", { match });
                } catch (err) { }
            });

            socket.on("executeIncantation", async ({ matchId, roomId, code, language }) => {
                try {
                    const match = await Match.findById(matchId);
                    if (!match || match.status === "completed") return;

                    const lang = language || 'javascript';
                    const challengeData = match.challenge?.data?.[lang];
                    const testCases = challengeData?.testCases || [];

                    console.log(`[Arena] ${socket.userUsername} casts a spell in ${matchId}`);

                    const result = runChallengeCode(lang, code, testCases);

                    if (result.passed) {
                        const damage = 25;
                        
                        // Find the opponent and reduce their health
                        const opponentIndex = match.players.findIndex(p => p.user.toString() !== userId);
                        if (opponentIndex !== -1) {
                            match.players[opponentIndex].health = Math.max(0, match.players[opponentIndex].health - damage);
                            
                            const newHealth = match.players[opponentIndex].health;
                            let isGameOver = newHealth <= 0;
                            
                            if (isGameOver) {
                                match.status = "completed";
                                match.winner = userId;
                                match.completedAt = new Date();
                            }

                            await match.save();

                            // Broadcast the HIT to both players
                            io.to(roomId).emit("opponentBattleEvent", { 
                                event: "damageTaken", 
                                data: { 
                                    attackerId: userId,
                                    targetId: match.players[opponentIndex].user,
                                    damage: damage,
                                    newHealth: newHealth,
                                    results: result.testResults,
                                    output: result.outputSnapshot
                                } 
                            });

                            if (isGameOver) {
                                io.to(roomId).emit("matchEnded", { winnerId: userId, match });
                            }
                            
                            console.log(`[Arena] Spell SUCCESS! ${match.players[opponentIndex].username} health: ${newHealth}`);
                        }
                    } else {
                        socket.emit("opponentBattleEvent", { 
                            event: "spellFizzled", 
                            data: { 
                                results: result.testResults,
                                output: result.outputSnapshot
                            } 
                        });
                        console.log(`[Arena] Spell FAILED by ${socket.userUsername}.`);
                    }

                } catch (err) {
                    console.error("Incantation error:", err);
                    socket.emit("error", { message: "Failed to process incantation" });
                }
            });

            socket.on("codeUpdate", ({ roomId, code }) => {
                socket.to(roomId).emit("opponentCodeUpdate", { code });
            });

            socket.on("battleEvent", ({ roomId, event, data }) => {
                socket.to(roomId).emit("opponentBattleEvent", { event, data });
            });

            socket.on("matchResult", async ({ roomId, matchId, winnerId }) => {
                try {
                    const match = await Match.findByIdAndUpdate(matchId, {
                        status: "completed", winner: winnerId, completedAt: new Date()
                    }, { new: true });
                    io.to(roomId).emit("matchEnded", { winnerId, match });
                } catch (err) { }
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

            // --- 3. Cleanup ---

            socket.on("disconnect", async () => {
                const sessions = userSockets.get(userId);
                if (sessions) {
                    sessions.delete(socket);
                    if (sessions.size === 0) {
                        userSockets.delete(userId);
                        // Only remove from queue if ALL tabs closed
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
