const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/User");

let io;

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
            credentials: true
        }
    });

    io.on("connection", async (socket) => {
        console.log("A user connected:", socket.id);

        // Authentication via token in handshake
        const token = socket.handshake.auth.token;
        if (!token) {
            console.log("No token provided, disconnecting socket.");
            socket.disconnect();
            return;
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;

            socket.userId = userId;

            // Update user status to online
            await User.findByIdAndUpdate(userId, { isOnline: true });
            io.emit("userStatusChanged", { userId, isOnline: true });

            socket.on("disconnect", async () => {
                console.log("User disconnected:", socket.userId);
                if (socket.userId) {
                    // Give it a small delay to allow list to update OR check current socket list
                    setTimeout(async () => {
                        const sockets = await io.fetchSockets();
                        const isStillConnected = sockets.some(s => s.userId === socket.userId);

                        if (!isStillConnected) {
                            try {
                                await User.findByIdAndUpdate(socket.userId, { isOnline: false });
                                io.emit("userStatusChanged", { userId: socket.userId, isOnline: false });
                                console.log(`User ${socket.userId} is now offline (no active sockets).`);
                            } catch (err) {
                                console.error("Error updating user status on disconnect:", err);
                            }
                        }
                    }, 1000); // Small grace period
                }
            });

        } catch (error) {
            console.error("Socket authentication error:", error.message);
            socket.disconnect();
        }
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

module.exports = { initSocket, getIO };
