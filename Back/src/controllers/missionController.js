const Mission = require("../models/Mission");
const UserMissionProgress = require("../models/UserMissionProgress");
const mongoose = require("mongoose");

const toUserId = (req) => {
    if (!req.user || !req.user.id) {
        throw new Error("USER_NOT_AUTHENTICATED");
    }
    return new mongoose.Types.ObjectId(String(req.user.id));
};

exports.getMyMissions = async (req, res) => {
    try {
        const userId = toUserId(req);
        const missions = await Mission.find()
            .sort({ level: 1, order: 1 })
            .populate("prerequisiteMissionId", "title order")
            .populate("challenges", "title difficulty language");

        const progressList = await UserMissionProgress.find({ userId });

        const missionsWithStatus = await Promise.all(
            missions.map(async (m) => {
                const progress = progressList.find(
                    (p) => String(p.missionId) === String(m._id)
                );

                let status = "locked";
                if (!m.prerequisiteMissionId) {
                    status = "available";
                } else {
                    const preReqProg = progressList.find(
                        (p) => String(p.missionId) === String(m.prerequisiteMissionId._id)
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
            .populate("prerequisiteMissionId", "title");

        if (!mission) {
            return res.status(404).json({ message: "Mission not found" });
        }

        const progress = await UserMissionProgress.findOne({
            userId,
            missionId: mission._id,
        });

        if (mission.prerequisiteMissionId) {
            const preReqProg = await UserMissionProgress.findOne({
                userId,
                missionId: mission.prerequisiteMissionId._id,
            });
            if (!preReqProg || preReqProg.status !== "completed") {
                return res.status(403).json({
                    message: "Mission locked. Complete prerequisites first.",
                    code: "MISSION_LOCKED",
                    prerequisiteTitle: mission.prerequisiteMissionId.title,
                });
            }
        }

        const missionObj = mission.toObject();
        res.json({
            ...missionObj,
            progress: progress || { progressPercent: 0, completedChallenges: [] },
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

        const challenge = mission.challenges.find(
            (c) => String(c._id) === String(challengeId)
        );
        if (!challenge)
            return res.status(404).json({ message: "Challenge not found in mission" });

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

        if (!progress.completedChallenges.includes(challengeId)) {
            progress.completedChallenges.push(challengeId);
        }

        const totalChallenges = mission.challenges.length;
        const completedCount = progress.completedChallenges.length;
        progress.progressPercent = Math.round((completedCount / totalChallenges) * 100);

        if (progress.progressPercent === 100) {
            progress.status = "completed";
            progress.completedAt = new Date();
        }

        await progress.save();

        res.json({
            message: "Solution accepted",
            progress,
            stageCompleted: progress.status === "completed",
        });
    } catch (err) {
        console.error("Submit mission failure:", err);
        res.status(500).json({ message: err.message });
    }
};
