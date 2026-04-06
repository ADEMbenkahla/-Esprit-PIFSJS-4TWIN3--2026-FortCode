const mongoose = require("mongoose");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Match = require("./models/Match");
const BattleChallenge = require("./models/BattleChallenge");

let io;
const trainingQueue = [];
const rankedQueue = [];

const broadcastStats = async () => {
    const sockets = await io.fetchSockets();
    const uniqueUsers = new Set(sockets.map(s => s.userId).filter(id => !!id));
    io.emit("statsUpdate", { onlineCount: uniqueUsers.size });
};

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
            credentials: true
        }
    });

    io.on("connection", async (socket) => {
        console.log("A user connected:", socket.id);

        const token = socket.handshake.auth.token;
        if (!token) {
            socket.disconnect();
            return;
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
            socket.userId = userId;

            const user = await User.findById(userId).select("username avatar rating rank");
            socket.user = user;

            await User.findByIdAndUpdate(userId, { isOnline: true });
            io.emit("userStatusChanged", { userId, isOnline: true });
            broadcastStats();

            // --- MATCHMAKING ---
            socket.on("findMatch", async ({ type }) => {
                const queue = type === "ranked" ? rankedQueue : trainingQueue;

                // Prevent duplicate queueing
                if (queue.some(s => s.userId === userId)) return;

                console.log(`User ${user.username} searching for ${type} match`);

                if (queue.length > 0) {
                    const opponentSocket = queue.shift();
                    const matchId = new mongoose.Types.ObjectId();
                    const roomId = `match_${matchId}`;

                    // Fetch Random Battle Challenge
                    const randomChallenges = await BattleChallenge.aggregate([{ $sample: { size: 1 } }]);
                    const challenge = randomChallenges[0] || {
                        title: "Default Challenge",
                        description: "Solve this simple task.",
                        languages: {
                            javascript: { starterCode: "// JS", tests: "" },
                            python: { starterCode: "# PY", tests: "" }
                        }
                    };

                    // Create match in DB
                    const match = await Match.create({
                        _id: matchId,
                        type,
                        players: [
                            { user: opponentSocket.userId, username: opponentSocket.user.username, avatar: opponentSocket.user.avatar },
                            { user: userId, username: user.username, avatar: user.avatar }
                        ],
                        status: "active",
                        challenge: {
                            title: challenge.title,
                            description: challenge.description,
                            // Store the whole language map so frontend can choose
                            data: challenge.languages
                        },
                        startedAt: new Date()
                    });

                    opponentSocket.join(roomId);
                    socket.join(roomId);

                    // Emit to each individually to ensure receipt
                    const matchData = { matchId, roomId, match };
                    opponentSocket.emit("matchFound", matchData);
                    socket.emit("matchFound", matchData);

                    // Also broadcast to room for good measure
                    io.to(roomId).emit("matchFound", matchData);
                } else {
                    queue.push(socket);
                    socket.emit("waitingInQueue", { type });
                }
            });

            socket.on("joinMatch", async ({ matchId, roomId }) => {
                console.log(`📡 JoinMatch request: user=${user.username}, matchId=${matchId}, roomId=${roomId}`);
                socket.join(roomId);
                try {
                    const match = await Match.findById(matchId);
                    if (match) {
                        socket.emit("matchFound", { matchId, roomId, match });
                        console.log(`✅ Sent matchFound to ${user.username}`);
                    } else {
                        console.error(`❌ Match ${matchId} not found in DB`);
                    }
                } catch (err) {
                    console.error("🔥 Error in joinMatch findById:", err);
                }
            });

            socket.on("cancelSearch", () => {
                const tIdx = trainingQueue.findIndex(s => s.userId === userId);
                if (tIdx !== -1) trainingQueue.splice(tIdx, 1);
                const rIdx = rankedQueue.findIndex(s => s.userId === userId);
                if (rIdx !== -1) rankedQueue.splice(rIdx, 1);
            });

            // --- BATTLE SYNC ---
            socket.on("codeUpdate", ({ roomId, code }) => {
                socket.to(roomId).emit("opponentCodeUpdate", { code });
            });

            socket.on("battleEvent", ({ roomId, event, data }) => {
                // e.g., "damageTaken", "spellCast"
                socket.to(roomId).emit("opponentBattleEvent", { event, data });
            });

            socket.on("matchResult", async ({ roomId, matchId, winnerId }) => {
                const match = await Match.findById(matchId);
                if (match && match.status === "active") {
                    match.status = "completed";
                    match.winner = winnerId;
                    match.completedAt = new Date();
                    await match.save();

                    // Update Elo for ranked
                    if (match.type === "ranked") {
                        await User.findByIdAndUpdate(winnerId, { $inc: { points: 20, rating: 15 } });
                        const opponent = match.players.find(p => p.user.toString() !== winnerId.toString());
                        if (opponent) {
                            await User.findByIdAndUpdate(opponent.user, { $inc: { rating: -10 } });
                        }
                    }

                    io.to(roomId).emit("matchEnded", { winnerId, match });
                }
            });

            socket.on("quitMatch", async ({ roomId, matchId }) => {
                const match = await Match.findById(matchId);
                if (match && match.status === "active") {
                    match.status = "cancelled";
                    await match.save();

                    const winner = match.players.find(p => p.user.toString() !== userId.toString());
                    io.to(roomId).emit("matchEnded", {
                        winnerId: winner ? winner.user : null,
                        match,
                        reason: "opponent_quit"
                    });
                }
            });

            socket.on("disconnect", async () => {
                // Remove from queues
                const tIdx = trainingQueue.findIndex(s => s.userId === userId);
                if (tIdx !== -1) trainingQueue.splice(tIdx, 1);
                const rIdx = rankedQueue.findIndex(s => s.userId === userId);
                if (rIdx !== -1) rankedQueue.splice(rIdx, 1);
                broadcastStats();

                if (socket.userId) {
                    setTimeout(async () => {
                        const sockets = await io.fetchSockets();
                        if (!sockets.some(s => s.userId === socket.userId)) {
                            await User.findByIdAndUpdate(socket.userId, { isOnline: false });
                            io.emit("userStatusChanged", { userId: socket.userId, isOnline: false });
                        }
                    }, 1000);
                }
            });

        } catch (error) {
            console.error("Socket error:", error);
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
