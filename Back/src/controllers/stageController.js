const Stage = require("../models/Stage");
const UserProgress = require("../models/UserProgress");

// Get all stages for the authenticated user
exports.getStages = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { category } = req.query; // Get category from query params

        const query = {};
        if (category) query.category = category;

        const stages = await Stage.find(query).sort({ level: 1 }).populate("prerequisites");
        const userProgress = userId ? await UserProgress.find({ user: userId }) : [];

        const enrichedStages = stages.map(stage => {
            const rawStage = stage.toObject();
            const progress = userProgress.find(p => p.stage && p.stage.toString() === stage._id.toString());

            let status = "locked";
            if (stage.level === 1) status = "unlocked";

            // Prereq check
            if (stage.prerequisites && stage.prerequisites.length > 0) {
                const allPrereqsCompleted = stage.prerequisites.every(prereq => {
                    if (!prereq) return false;
                    const pid = prereq._id ? prereq._id.toString() : prereq.toString();
                    const pprog = userProgress.find(p => p.stage && p.stage.toString() === pid);
                    return pprog && pprog.isCompleted;
                });
                if (allPrereqsCompleted) status = "unlocked";
            } else if (stage.level > 1) {
                const prevStage = stages.find(s => s.level === stage.level - 1 && s.category === stage.category);
                if (prevStage) {
                    const pprog = userProgress.find(p => p.stage && p.stage.toString() === prevStage._id.toString());
                    if (pprog && pprog.isCompleted) status = "unlocked";
                }
            }

            if (progress) {
                if (progress.isCompleted) status = "completed";
                return {
                    ...rawStage,
                    progress: {
                        completedChallenges: progress.completedChallenges || [],
                        isCompleted: progress.isCompleted || false,
                        stars: progress.stars || 0
                    },
                    status: status === "completed" ? "completed" : "unlocked"
                };
            }

            return { ...rawStage, status };
        });

        res.json(enrichedStages);
    } catch (error) {
        console.error("Error in getStages:", error);
        res.status(500).json({ message: "Server error", detail: error.message });
    }
};

// Get single stage details with progress
exports.getStageById = async (req, res) => {
    try {
        const { stageId } = req.params;
        const userId = req.user?.id;

        const stage = await Stage.findById(stageId);
        if (!stage) return res.status(404).json({ message: "Stage not found" });

        const progress = userId ? await UserProgress.findOne({ user: userId, stage: stageId }) : null;

        const stageObj = stage.toObject();
        res.json({
            ...stageObj,
            progress: progress ? {
                completedChallenges: progress.completedChallenges || [],
                isCompleted: progress.isCompleted || false,
                stars: progress.stars || 0
            } : { completedChallenges: [], isCompleted: false, stars: 0 }
        });
    } catch (error) {
        console.error("Error in getStageById:", error);
        res.status(500).json({ message: "Server error", detail: error.message });
    }
};

// Reset all progress for the user
exports.resetAllProgress = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        await UserProgress.deleteMany({ user: userId });
        res.json({ message: "All progress reset successfully" });
    } catch (error) {
        console.error("Error in resetAllProgress:", error);
        res.status(500).json({ message: "Server error", detail: error.message });
    }
};

// Reset progress for a single stage (optionally for a single challenge)
exports.resetStageProgress = async (req, res) => {
    try {
        const { stageId } = req.params;
        const { challengeId } = req.body; // New: allow resetting a specific challenge
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        if (challengeId) {
            // Remove only the specific challenge
            await UserProgress.updateOne(
                { user: userId, stage: stageId },
                {
                    $pull: { completedChallenges: { challengeId: parseInt(challengeId) } },
                    $set: { isCompleted: false } // Mark as not completed if we reset one part
                }
            );

            // Re-calculate total stars for the progress document
            const progress = await UserProgress.findOne({ user: userId, stage: stageId });
            if (progress) {
                progress.stars = progress.completedChallenges.reduce((acc, c) => acc + (c.stars || 0), 0);
                await progress.save();
            }

            return res.json({ message: "Challenge progress reset successfully" });
        }

        // Default: reset entire stage
        await UserProgress.deleteOne({ user: userId, stage: stageId });
        res.json({ message: "Stage progress reset successfully" });
    } catch (error) {
        console.error("Error in resetStageProgress:", error);
        res.status(500).json({ message: "Server error", detail: error.message });
    }
};

// Update challenge progress
exports.updateProgress = async (req, res) => {
    try {
        const { stageId } = req.params;
        const { challengeId, stars, code } = req.body;
        const userId = req.user?.id;

        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const stage = await Stage.findById(stageId);
        if (!stage) return res.status(404).json({ message: "Stage not found" });

        let progress = await UserProgress.findOne({ user: userId, stage: stageId });
        if (!progress) {
            progress = new UserProgress({ user: userId, stage: stageId, completedChallenges: [] });
        }

        const cIdx = progress.completedChallenges.findIndex(c => c.challengeId === challengeId);
        if (cIdx !== -1) {
            progress.completedChallenges[cIdx].code = code;
            progress.completedChallenges[cIdx].stars = stars || 0;
        } else {
            progress.completedChallenges.push({ challengeId, code, stars: stars || 0 });
        }

        progress.stars = progress.completedChallenges.reduce((acc, c) => acc + (c.stars || 0), 0);
        if (progress.completedChallenges.length === stage.challenges.length) {
            progress.isCompleted = true;
        }

        await progress.save();
        res.json({ message: "Progress updated successfully", progress });
    } catch (error) {
        console.error("Error in updateProgress:", error);
        res.status(500).json({ message: "Server error", detail: error.message });
    }
};
