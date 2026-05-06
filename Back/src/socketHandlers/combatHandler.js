const Match = require("../models/Match");
const { runChallengeCode } = require("../utils/runChallengeCode");
const complexityService = require("../services/complexityService");
const aiJudgeService = require("../services/aiJudgeService");
const { getIO } = require("../socket");
const { resolveMatchXp } = require("./matchmakingHandler");

function handleCombat(socket, userId) {
    const io = getIO();

    socket.on("joinMatch", async ({ matchId, roomId }) => {
        const actualRoomId = roomId || `match:${matchId}`;
        socket.join(actualRoomId);

        try {
            const match = await Match.findById(matchId);
            if (!match) return;

            let pIndex = match.players.findIndex(p => p.socketId === socket.id);

            if (pIndex === -1) {
                const roomClients = await io.in(actualRoomId).allSockets();
                pIndex = match.players.findIndex(p => {
                    if (p.user.toString() !== userId) return false;
                    return !roomClients.has(p.socketId);
                });
            }

            if (pIndex !== -1) {
                match.players[pIndex].socketId = socket.id;
                match.markModified('players');
                await match.save();
                socket.playerIndex = pIndex;
            }

            socket.emit("matchFound", { match });
        } catch (err) {
            console.error("[ARENA] Error during joinMatch:", err);
        }
    });

    socket.on("executeIncantation", async ({ matchId, roomId, code, language }) => {
        try {
            const match = await Match.findOne({ _id: matchId });
            if (!match || (match.status !== "live" && match.status !== "waiting")) return;

            const idx = socket.playerIndex;
            if (idx === undefined || match.players[idx].finished) return;

            const lang = language || 'javascript';
            const challengeData = match.challenge?.data?.[lang];
            const testResults = runChallengeCode(lang, code, challengeData?.testCases || []);
            
            const combinedAnalysis = await complexityService.analyzeCodeWithBothModels(code);
            const mlResult = combinedAnalysis.mlDetection;

            const isAi = mlResult.label === "IA" || mlResult.label === "Plagiat";
            const updateAttacker = {};
            updateAttacker[`players.${idx}.code`] = code;
            updateAttacker[`players.${idx}.mlDetection`] = { prediction: mlResult.prediction, label: mlResult.label };

            const updatedMatch = await Match.findOneAndUpdate(
                { _id: matchId },
                { $set: updateAttacker },
                { new: true }
            );

            if (testResults.passed && !isAi) {
                await handleDamage(updatedMatch, idx, matchId, roomId, userId, testResults);
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

    async function handleDamage(updatedMatch, idx, matchId, roomId, userId, testResults) {
        const damage = 25;
        const oppIdx = idx === 0 ? 1 : 0;
        const opp = updatedMatch.players[oppIdx];
        if (!opp) return;

        const newHealth = Math.max(0, opp.health - damage);
        const defenderUpdate = {};
        defenderUpdate[`players.${oppIdx}.health`] = newHealth;

        const finalMatch = await Match.findOneAndUpdate(
            { _id: matchId },
            { $set: defenderUpdate },
            { new: true }
        );

        if (newHealth <= 0) {
            await endMatchKO(finalMatch, userId, roomId);
        } else {
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

    async function endMatchKO(finalMatch, winnerId, roomId) {
        finalMatch.status = "completed";
        finalMatch.winner = winnerId;
        finalMatch.completedAt = new Date();
        await finalMatch.save();
        const p1Id = (finalMatch.players[0].user?._id || finalMatch.players[0].user).toString();
        const p2Id = (finalMatch.players[1].user?._id || finalMatch.players[1].user).toString();
        const xpSource = finalMatch.type === "ranked" ? "arena" : "training";
        const xpResults = await resolveMatchXp(winnerId, p1Id, p2Id, xpSource);
        const endPayload = { winnerId, match: finalMatch, xpResults };
        io.to(roomId).emit("matchEnded", endPayload);
        io.to(`user:${p1Id}`).emit("matchEnded", endPayload);
        io.to(`user:${p2Id}`).emit("matchEnded", endPayload);
    }

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
            
            const combinedAnalysis = await complexityService.analyzeCodeWithBothModels(code);
            const mlResult = combinedAnalysis.mlDetection;

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

            if (match.players.every(p => p.finished)) {
                await resolveMatchCompletion(match, matchId, roomId);
            } else {
                socket.emit("waitingForOpponent");
                const myUid = (match.players[idx].user?._id || match.players[idx].user).toString();
                io.to(roomId).emit("playerFinished", { userId: myUid, username: socket.userUsername });
            }
        } catch (err) {
            console.error("Submission error:", err);
        }
    });

    async function resolveMatchCompletion(match, matchId, roomId) {
        try {
            const p1Id = (match.players[0].user?._id || match.players[0].user || "").toString();
            const p2Id = (match.players[1].user?._id || match.players[1].user || "").toString();

            const isAi1 = match.players[0].mlDetection?.label === "IA" || match.players[0].mlDetection?.label === "Plagiat";
            const isAi2 = match.players[1].mlDetection?.label === "IA" || match.players[1].mlDetection?.label === "Plagiat";

            let winnerId = "draw";
            let pct1 = 0, pct2 = 0, res1 = [], res2 = [];

            if (isAi1 && !isAi2) winnerId = p2Id;
            else if (!isAi1 && isAi2) winnerId = p1Id;
            else if (isAi1 && isAi2) winnerId = "draw";
            else {
                const results = await evaluateHumanVsHuman(match);
                winnerId = results.winnerId;
                pct1 = results.pct1;
                pct2 = results.pct2;
                res1 = results.res1;
                res2 = results.res2;
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
                xpResults,
                evaluation: {
                    [p1Id]: { correctness: pct1, results: res1 },
                    [p2Id]: { correctness: pct2, results: res2 }
                }
            };
            io.to(roomId).emit("matchEnded", endPayload);
        } catch (fatalErr) {
            console.error("[Arena] Resolution Error:", fatalErr);
            const fallbackMatch = await Match.findById(matchId);
            io.to(roomId).emit("matchEnded", { winnerId: "draw", match: fallbackMatch, error: "Final resolution failed." });
        }
    }

    async function evaluateHumanVsHuman(match) {
        const getTests = (pIdx) => {
            const player = match.players[pIdx];
            const rawLang = (player.language || "javascript").toLowerCase();
            let tests = match.challenge?.testCases?.length > 0 ? match.challenge.testCases : (match.challenge?.data?.[rawLang]?.testCases || []);
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

        if (pct1 > pct2) return { winnerId: (match.players[0].user?._id || match.players[0].user).toString(), pct1, pct2, res1, res2 };
        if (pct2 > pct1) return { winnerId: (match.players[1].user?._id || match.players[1].user).toString(), pct1, pct2, res1, res2 };

        const judgeResult = await aiJudgeService.judgeMatch(
            { code: match.players[0].code, username: match.players[0].username, language: match.players[0].language || "javascript", complexity: match.players[0].complexityAnalysis?.complexity },
            { code: match.players[1].code, username: match.players[1].username, language: match.players[1].language || "javascript", complexity: match.players[1].complexityAnalysis?.complexity },
            match.challenge?.description || ""
        );

        let winnerId = "draw";
        if (judgeResult.winnerIndex === 0) winnerId = (match.players[0].user?._id || match.players[0].user).toString();
        else if (judgeResult.winnerIndex === 1) winnerId = (match.players[1].user?._id || match.players[1].user).toString();
        else if (match.players[0].health > match.players[1].health) winnerId = (match.players[0].user?._id || match.players[0].user).toString();
        else if (match.players[1].health > match.players[0].health) winnerId = (match.players[1].user?._id || match.players[1].user).toString();

        return { winnerId, pct1, pct2, res1, res2 };
    }

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
}

module.exports = { handleCombat };
