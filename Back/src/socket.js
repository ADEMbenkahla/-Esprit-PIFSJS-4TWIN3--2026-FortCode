const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Match = require("./models/Match");
const Challenge = require("./models/Challenge");
const { runChallengeCode } = require("./utils/runChallengeCode");
const complexityService = require("./services/complexityService");
const aiJudgeService = require("./services/aiJudgeService");

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
            const gamificationService = require("./services/gamificationService");

            async function resolveMatchXp(winnerId, p1Id, p2Id, xpSource) {
                // If it's a draw, 100 XP (50%). If lose, 40 XP (20%). If win, 200 XP (100%).
                const p1XpAmt = (winnerId === p1Id) ? 200 : (winnerId === "draw" ? 100 : 40);
                const p2XpAmt = (winnerId === p2Id) ? 200 : (winnerId === "draw" ? 100 : 40);

                const xpRes = await Promise.allSettled([
                    gamificationService.addXP(p1Id, p1XpAmt, xpSource),
                    gamificationService.addXP(p2Id, p2XpAmt, xpSource)
                ]);

                return {
                    [p1Id]: xpRes[0].status === "fulfilled" ? xpRes[0].value : { gainedXP: 0 },
                    [p2Id]: xpRes[1].status === "fulfilled" ? xpRes[1].value : { gainedXP: 0 }
                };
            }


            socket.on("findMatch", async ({ type }) => {
                console.log(`[ARENA] Search request received from ${socket.userUsername} for ${type}`);

                // Check Level 20 requirement for Ranked
                if (type === "ranked") {
                    const isEligible = await gamificationService.isRankedEligible(userId);
                    if (!isEligible) {
                        socket.emit("matchmakingError", { message: "You must be at least Level 20 to play Ranked." });
                        return;
                    }
                }

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
                                language: challenge.language || "javascript",
                                testCases: challenge.toObject().testCases || [],
                                data: {
                                    [challenge.language || 'javascript']: challenge.toObject(),
                                    'javascript': challenge.toObject(),
                                    'python': challenge.toObject()
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

                    // Support for LiveBattle's separate socket connection
                    // Find if I'm already assigned, or find our user's slot
                    let pIndex = match.players.findIndex(p => p.socketId === socket.id);

                    if (pIndex === -1) {
                        // Find a slot assigned to this user that hasn't ALREADY been claimed by another active tab IN THIS MATCH ROOM
                        const roomClients = await io.in(actualRoomId).allSockets();
                        pIndex = match.players.findIndex(p => {
                            if (p.user.toString() !== userId) return false;
                            // If the socket currently occupying this slot is active in this room, skip it (it's the other tab)
                            return !roomClients.has(p.socketId);
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
                    
                    // Utiliser le service unifié pour les deux analyses
                    const combinedAnalysis = await complexityService.analyzeCodeWithBothModels(code);
                    const mlResult = combinedAnalysis.mlDetection;

                    // 2. Atomic update of attacker state
                    const isAi = mlResult.label === "IA" || mlResult.label === "Plagiat";
                    const updateAttacker = {};
                    updateAttacker[`players.${idx}.code`] = code;
                    updateAttacker[`players.${idx}.mlDetection`] = { prediction: mlResult.prediction, label: mlResult.label };
                    updateAttacker[`players.${idx}.complexityAnalysis`] = combinedAnalysis.complexityAnalysis;

                    const updatedMatch = await Match.findOneAndUpdate(
                        { _id: matchId },
                        { $set: updateAttacker },
                        { new: true }
                    );

                    // 3. Handle damage if test passed AND NOT AI
                    if (testResults.passed && !isAi) {
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
                                const p1Id = (finalMatch.players[0].user?._id || finalMatch.players[0].user).toString();
                                const p2Id = (finalMatch.players[1].user?._id || finalMatch.players[1].user).toString();
                                const xpSource = finalMatch.type === "ranked" ? "arena" : "training";
                                const xpResults = await resolveMatchXp(userId, p1Id, p2Id, xpSource);
                                const endPayload = { winnerId: userId, match: finalMatch, xpResults };
                                io.to(roomId).emit("matchEnded", endPayload);
                                io.to(`user:${p1Id}`).emit("matchEnded", endPayload);
                                io.to(`user:${p2Id}`).emit("matchEnded", endPayload);
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
                    updateQuery[`players.${idx}.finishedAt`] = new Date();
                    updateQuery[`players.${idx}.code`] = code;
                    updateQuery[`players.${idx}.language`] = language || "javascript";
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
                        try {
                            const p1Id = (match.players[0].user?._id || match.players[0].user || "").toString();
                            const p2Id = (match.players[1].user?._id || match.players[1].user || "").toString();

                            const isAi1 = match.players[0].mlDetection?.label === "IA" || match.players[0].mlDetection?.label === "Plagiat";
                            const isAi2 = match.players[1].mlDetection?.label === "IA" || match.players[1].mlDetection?.label === "Plagiat";

                            let winnerId = "draw";

                            if (isAi1 && !isAi2) {
                                winnerId = p2Id;
                            } else if (!isAi1 && isAi2) {
                                winnerId = p1Id;
                            } else if (isAi1 && isAi2) {
                                winnerId = "draw";
                            } else {
                                // Human vs Human Evaluation
                                const getTests = (pIdx) => {
                                    const player = match.players[pIdx];
                                    const rawLang = (player.language || "javascript").toLowerCase();

                                    // Robust retrieval
                                    let tests = [];
                                    if (match.challenge?.testCases?.length > 0) {
                                        tests = match.challenge.testCases;
                                    } else {
                                        const data = match.challenge?.data || {};
                                        const langKey = Object.keys(data).find(k => k.toLowerCase() === rawLang) || rawLang;
                                        tests = data[langKey]?.testCases || [];
                                    }
                                    return { lang: rawLang, tests: Array.isArray(tests) ? tests : [] };
                                };

                                const { lang: l1, tests: tests1 } = getTests(0);
                                const { lang: l2, tests: tests2 } = getTests(1);

                                const [runP1, runP2] = await Promise.all([
                                    runChallengeCode(l1, match.players[0].code, tests1),
                                    runChallengeCode(l2, match.players[1].code, tests2)
                                ]);

                                const res1 = runP1.testResults || [];
                                const res2 = runP2.testResults || [];
                                const pct1 = res1.length > 0 ? (res1.filter(r => r.passed).length / res1.length) * 100 : 0;
                                const pct2 = res2.length > 0 ? (res2.filter(r => r.passed).length / res2.length) * 100 : 0;

                                console.log(`[Arena] Result Calc [p1:${pct1}%, p2:${pct2}%]`);

                                if (pct1 > pct2) {
                                    winnerId = p1Id;
                                } else if (pct2 > pct1) {
                                    winnerId = p2Id;
                                } else if (pct1 === 100 && pct2 === 100) {
                                    // Both are 100% correct, use complexity-based tie-breakers
                                    const player1Submission = {
                                        mlDetection: match.players[0].mlDetection,
                                        complexityAnalysis: match.players[0].complexityAnalysis,
                                        submittedAt: match.players[0].finishedAt
                                    };
                                    const player2Submission = {
                                        mlDetection: match.players[1].mlDetection,
                                        complexityAnalysis: match.players[1].complexityAnalysis,
                                        submittedAt: match.players[1].finishedAt
                                    };
                                    
                                    const comparisonResult = complexityService.compareSubmissions(player1Submission, player2Submission);
                                    if (comparisonResult < 0) {
                                        winnerId = p1Id; // Player 1 wins
                                    } else if (comparisonResult > 0) {
                                        winnerId = p2Id; // Player 2 wins
                                    } else {
                                        // Complete tie - use health as final tiebreaker
                                        if (match.players[0].health > match.players[1].health) {
                                            winnerId = p1Id;
                                        } else if (match.players[1].health > match.players[0].health) {
                                            winnerId = p2Id;
                                        } else {
                                            // Ultimate tie - draw
                                            winnerId = "draw";
                                        }
                                    }
                                } else {
                                    // Both were equal but NOT 100% (e.g. both 0% or both 50%) -> DRAW
                                    winnerId = "draw";
                                }
                            }

                            const finalMatch = await Match.findOneAndUpdate(
                                { _id: matchId },
                                { $set: { status: "completed", winner: winnerId === "draw" ? null : winnerId, completedAt: new Date() } },
                                { new: true }
                            );

                            const xpSource = match.type === "ranked" ? "arena" : "training";
                            const xpResults = await resolveMatchXp(winnerId, p1Id, p2Id, xpSource);

                            const endPayload = {
                                winnerId,
                                match: finalMatch,
                                xpResults: xpResults,
                                evaluation: {
                                    [p1Id]: { correctness: pct1 || 0, results: res1 },
                                    [p2Id]: { correctness: pct2 || 0, results: res2 }
                                }
                            };
                            console.log(`[Arena] Result Calc [p1:${pct1}%, p2:${pct2}%]. Winner: ${winnerId}`);
                            io.to(roomId).emit("matchEnded", endPayload);
                        } catch (fatalErr) {
                            console.error("[Arena] Resolution Error:", fatalErr);
                            // Ensure we fetch state for fallback
                            const fallbackMatch = await Match.findById(matchId);
                            io.to(roomId).emit("matchEnded", {
                                winnerId: "draw",
                                match: fallbackMatch,
                                error: "Final resolution failed."
                            });
                        }
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
                        const p1Id = (match.players[0].user?._id || match.players[0].user).toString();
                        const p2Id = (match.players[1].user?._id || match.players[1].user).toString();
                        const xpSource = match.type === "ranked" ? "arena" : "training";
                        const xpResults = await resolveMatchXp(match.winner?.toString(), p1Id, p2Id, xpSource);
                        io.to(roomId).emit("matchEnded", { winnerId: match.winner, match, xpResults });
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
