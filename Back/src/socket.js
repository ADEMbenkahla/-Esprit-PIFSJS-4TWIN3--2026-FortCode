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
            origin: [
                "https://fortcode-frontend.onrender.com",
                "http://localhost:5173", 
                "http://127.0.0.1:5173",
                process.env.FRONTEND_NGROK_URL,
                process.env.NGROK_URL // Also allow backend ngrok just in case
            ].filter(Boolean),
            credentials: true
        }
    });

    const { handleMatchmaking } = require("./socketHandlers/matchmakingHandler");
    const { handleCombat } = require("./socketHandlers/combatHandler");

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

            if (!userSockets.has(userId)) {
                userSockets.set(userId, new Set());
            }
            userSockets.get(userId).add(socket);

            socket.join(`user:${userId}`);

            await User.findByIdAndUpdate(userId, { isOnline: true });
            io.emit("userStatusChanged", { userId, isOnline: true });
            io.emit("statsUpdate", { onlineCount: userSockets.size });

            // Handle Matchmaking and Combat via specialized handlers
            handleMatchmaking(socket, userId, matchmakingQueue);
            handleCombat(socket, userId);

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
