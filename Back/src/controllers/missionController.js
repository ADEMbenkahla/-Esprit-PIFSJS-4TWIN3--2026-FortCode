const Mission = require("../models/Stage");
const UserMissionProgress = require("../models/UserMissionProgress");
const Challenge = require("../models/Challenge");
const mongoose = require("mongoose");
const { runChallengeCode } = require("../utils/runChallengeCode");
const { fetchSonarStub, fetchAiFeedback } = require("../utils/stageAnalysis");
const aiAnalysisService = require("../services/aiAnalysisService");
const gamificationService = require("../services/gamificationService");

const toUserId = (req) => {
    if (!req.user || !req.user.id) {
        throw new Error("USER_NOT_AUTHENTICATED");
    }
    return new mongoose.Types.ObjectId(String(req.user.id));
};

/** Helper: safely get a value from a Mongoose Map or plain object */
function mapGet(mapOrObj, key) {
    if (!mapOrObj) return undefined;
    if (typeof mapOrObj.get === "function") return mapOrObj.get(key);
    return mapOrObj[key];
}

exports.getMyMissions = async (req, res) => {
    try {
        const userId = toUserId(req);
        const missions = await Mission.find({ category: "mission" })
            .sort({ level: 1, order: 1 })
            .populate("prerequisiteStageId", "title order")
            .populate("challenges", "title difficulty language");

        const progressList = await UserMissionProgress.find({ userId });

        const missionsWithStatus = await Promise.all(
            missions.map(async (m) => {
                const progress = progressList.find(
                    (p) => String(p.missionId) === String(m._id)
                );

                let status = "locked";
                if (!m.prerequisiteStageId) {
                    status = "available";
                } else {
                    const preReqProg = progressList.find(
                        (p) => String(p.missionId) === String(m.prerequisiteStageId._id)
                    );
                    if (preReqProg && preReqProg.status === "completed") {
                        status = "available";
                    }
                }

                if (progress) {
                    if (progress.status === "completed") status = "completed";
                    else if (progress.status === "in-progress") status = "in-progress";
                }

                const missionObj = m.toObject();
                return {
                    ...missionObj,
                    id: missionObj._id,
                    status,
                    locked: status === "locked",
                    progress: progress || { progressPercent: 0, completedChallenges: [] },
                };
            })
        );

        res.json(missionsWithStatus);
    } catch (err) {
        console.error("Error in getMyMissions:", err);
        res.status(500).json({ message: err.message });
    }
};

exports.getMissionById = async (req, res) => {
    try {
        const userId = toUserId(req);
        const mission = await Mission.findById(req.params.id)
            .populate("challenges")
            .populate("prerequisiteStageId", "title");

        if (!mission) {
            return res.status(404).json({ message: "Mission not found" });
        }

        const progress = await UserMissionProgress.findOne({
            userId,
            missionId: mission._id,
        });

        if (mission.prerequisiteStageId) {
            const preReqProg = await UserMissionProgress.findOne({
                userId,
                missionId: mission.prerequisiteStageId._id,
            });
            if (!preReqProg || preReqProg.status !== "completed") {
                return res.status(403).json({
                    message: "Mission locked. Complete prerequisites first.",
                    code: "MISSION_LOCKED",
                    prerequisiteTitle: mission.prerequisiteStageId.title,
                });
            }
        }

        const completedSet = new Set((progress?.completedChallenges || []).map((c) => c.toString()));
        const challenges = (mission.challenges || []).map((c) => {
            const cid = c._id.toString();
            // FIX #4: use mapGet helper to handle both Mongoose Map and plain object
            const savedReport = mapGet(progress?.lastSubmissionReport, cid);
            return {
                ...c.toObject(),
                completed: completedSet.has(cid),
                stars: mapGet(progress?.starsByChallenge, cid) || 0,
                savedReport: savedReport || null,
            };
        });

        res.json({
            ...mission.toObject(),
            challenges,
            progress: progress
                ? {
                    status: progress.status,
                    progressPercent: progress.progressPercent,
                    completedChallenges: progress.completedChallenges,
                    completedAt: progress.completedAt,
                }
                : { status: "available", progressPercent: 0, completedChallenges: [], completedAt: null },
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.submitMissionChallenge = async (req, res) => {
    try {
        const userId = toUserId(req);
        const { missionId, challengeId } = req.params;
        const { code } = req.body;

        const mission = await Mission.findById(missionId).populate("challenges");
        if (!mission) return res.status(404).json({ message: "Mission not found" });

        const challenge = await Challenge.findById(challengeId);
        if (!challenge || !mission.challenges.some((c) => String(c._id) === String(challengeId))) {
            return res.status(404).json({ message: "Challenge not found in mission" });
        }

        // 1. Run the code
        const run = runChallengeCode(challenge.language, code || "", challenge.testCases || []);

        // 2. Perform Analysis (Sonar + AI)
        const [sonar, aiFeedback] = await Promise.all([
            fetchSonarStub(code, challenge.language, {
                participantId: userId,
                missionId,
                projectName: mission.title,
            }),
            fetchAiFeedback(code, challenge.title),
        ]);

        const fullAiAnalysis = await aiAnalysisService.performFullAnalysis(code, challenge.language, challenge.title);

        let progress = await UserMissionProgress.findOne({ userId, missionId });
        if (!progress) {
            progress = new UserMissionProgress({
                userId,
                missionId,
                status: "in-progress",
                completedChallenges: [],
                starsByChallenge: {},
            });
        }

        if (!progress.lastSubmissionReport) progress.lastSubmissionReport = new Map();

        const cidStr = String(challengeId);
        const currentCode = String(code || "").trim();

        let xpResult = null;

        if (run.passed) {
            // FIX #3: compare as strings to avoid ObjectId/string mismatch
            const alreadyCompleted = progress.completedChallenges.some(
                (c) => String(c) === cidStr
            );
            if (!alreadyCompleted) {
                progress.completedChallenges.push(new mongoose.Types.ObjectId(cidStr));
            }

            const totalChallenges = Math.max(1, (mission.challenges || []).filter(Boolean).length);
            const completedCount = progress.completedChallenges.length;

            // Mission map rule: first successful exercise completes the mission and unlocks next one.
            const markMissionCompleted = completedCount >= 1;
            if (markMissionCompleted) {
                progress.progressPercent = 100;
                progress.status = "completed";
                progress.completedAt = new Date();
            } else {
                progress.progressPercent = Math.round((completedCount / totalChallenges) * 100);
                progress.status = completedCount > 0 ? "in-progress" : "available";
                progress.completedAt = null;
            }

            // Grant full XP on success
            if (!alreadyCompleted) {
                try {
                    xpResult = await gamificationService.addXP(userId, challenge.xpReward || 100, "mission");
                } catch (err) { }
            }
        } else {
            // Grant 20% XP for effort on failure
            try {
                xpResult = await gamificationService.addXP(userId, Math.floor((challenge.xpReward || 100) * 0.20), "mission");
            } catch (err) { }
        }

        // Store report for the frontend (for "View Submit History")
        const report = {
            fullAiAnalysis,
            sonar,
            executionTimeMs: run.executionTimeMs,
            output: run.outputSnapshot,
            code: currentCode,
            passed: run.passed,
            xpAwarded: xpResult?.gainedXP || 0,
        };
        progress.lastSubmissionReport.set(cidStr, report);

        await progress.save();

        // Build the progress object to return to frontend
        const progressData = {
            status: progress.status,
            progressPercent: progress.progressPercent,
            completedChallenges: progress.completedChallenges,
            completedAt: progress.completedAt,
        };

        // FIX #1 & #2: return 400 on failure (so frontend catch triggers),
        // and always include `progress` in the response body.
        if (!run.passed) {
            return res.status(400).json({
                message: "Tests did not pass",
                passed: run.passed,
                testResults: run.testResults,
                executionTimeMs: run.executionTimeMs,
                output: run.outputSnapshot,
                report,
                progress: progressData,
                xpResult,
                stageCompleted: false,
            });
        }

        return res.json({
            message: "Tests passed! Challenge complete.",
            passed: run.passed,
            testResults: run.testResults,
            executionTimeMs: run.executionTimeMs,
            output: run.outputSnapshot,
            report,
            progress: progressData,
            xpResult,
            stageCompleted: progress.status === "completed",
        });
    } catch (err) {
        console.error("Submit mission failure:", err);
        res.status(500).json({ message: err.message });
    }
};

/** Run tests only (mission flow) */
exports.runMissionChallenge = async (req, res) => {
    try {
        const userId = toUserId(req);
        const { missionId, challengeId } = req.params;
        const { code } = req.body;

        const mission = await Mission.findById(missionId).populate("challenges");
        if (!mission) return res.status(404).json({ message: "Mission not found" });

        const challenge = await Challenge.findById(challengeId);
        if (!challenge || !mission.challenges.some((c) => String(c._id) === String(challengeId))) {
            return res.status(404).json({ message: "Challenge not found in mission" });
        }

        const run = runChallengeCode(challenge.language, code || "", challenge.testCases || []);

        // Persist failed run attempts so submit can rely on real user attempts.
        let progress = await UserMissionProgress.findOne({ userId, missionId });
        if (!progress) {
            progress = new UserMissionProgress({
                userId,
                missionId,
                status: "in-progress",
                completedChallenges: [],
                starsByChallenge: {},
            });
        }
        if (!progress.failedAttemptsByChallenge) progress.failedAttemptsByChallenge = new Map();
        if (!progress.lastCodeByChallenge) progress.lastCodeByChallenge = new Map();

        const failKey = String(challenge._id);
        const currentFails = Number(progress.failedAttemptsByChallenge.get(failKey) || 0);
        const lastCode = String(progress.lastCodeByChallenge.get(failKey) || "");
        const currentCode = String(code || "").trim();
        const isMeaningfulCode = currentCode.length > 0;
        const isDuplicate = currentCode === lastCode;

        if (!run.passed) {
            if (isMeaningfulCode && !isDuplicate) {
                progress.failedAttemptsByChallenge.set(failKey, currentFails + 1);
                progress.lastCodeByChallenge.set(failKey, currentCode);
                await progress.save();
            }
        } else if (isMeaningfulCode) {
            progress.lastCodeByChallenge.set(failKey, currentCode);
            await progress.save();
        }

        return res.json({
            passed: run.passed,
            testResults: run.testResults,
            executionTimeMs: run.executionTimeMs,
            outputSnapshot: run.outputSnapshot,
        });
    } catch (err) {
        console.error("Run mission challenge failure:", err);
        res.status(500).json({ message: err.message });
    }
};

exports.resetAllMissionProgress = async (req, res) => {
    try {
        const userId = toUserId(req);
        await UserMissionProgress.deleteMany({ userId });
        res.json({ message: "All mission progress reset" });
    } catch (err) {
        console.error("Reset mission progress failure:", err);
        res.status(500).json({ message: err.message });
    }
};
