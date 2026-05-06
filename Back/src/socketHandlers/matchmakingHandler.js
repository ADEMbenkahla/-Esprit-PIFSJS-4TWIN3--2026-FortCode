const Match = require("../models/Match");
const Challenge = require("../models/Challenge");
const { getIO } = require("../socket");

async function resolveMatchXp(winnerId, p1Id, p2Id, xpSource) {
    const gamificationService = require("../services/gamificationService");
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

function handleMatchmaking(socket, userId, matchmakingQueue) {
    const gamificationService = require("../services/gamificationService");
    const io = getIO();

    socket.on("findMatch", async ({ type }) => {
        console.log(`[ARENA] Search request received from ${socket.userUsername} for ${type}`);

        if (type === "ranked") {
            const isEligible = await gamificationService.isRankedEligible(userId);
            if (!isEligible) {
                socket.emit("matchmakingError", { message: "You must be at least Level 20 to play Ranked." });
                return;
            }
        }

        matchmakingQueue[type] = matchmakingQueue[type].filter(p => p.userId !== userId);

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
                const payload = { matchId: match._id.toString(), roomId: `match:${match._id}`, match };

                io.to(`user:${userId}`).emit("matchFound", payload);
                io.to(`user:${opponent.userId}`).emit("matchFound", payload);
                socket.emit("matchFound", payload);

                const opponentSocket = Array.from(io.sockets.sockets.values()).find(s => s.id === opponent.socketId);
                if (opponentSocket) opponentSocket.emit("matchFound", payload);

            } catch (err) {
                console.error("[ARENA] Failed to create match:", err);
            }
        } else {
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
}

module.exports = { handleMatchmaking, resolveMatchXp };
