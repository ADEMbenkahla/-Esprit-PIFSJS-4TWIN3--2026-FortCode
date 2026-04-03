const mongoose = require("mongoose");
const Stage = require("../models/Stage");
const Challenge = require("../models/Challenge");
const UserStageProgress = require("../models/UserStageProgress");
const { runChallengeCode } = require("../utils/runChallengeCode");
const { fetchSonarStub, fetchAiFeedback } = require("../utils/stageAnalysis");

function toUserId(req) {
  return new mongoose.Types.ObjectId(String(req.user.id));
}

async function isPrerequisiteCompleted(userId, prerequisiteStageId) {
  if (!prerequisiteStageId) return true;
  const p = await UserStageProgress.findOne({
    userId,
    stageId: prerequisiteStageId,
    status: "completed",
  });
  return Boolean(p);
}

async function assertParticipantCanAccessStage(userId, stage) {
  const ok = await isPrerequisiteCompleted(userId, stage.prerequisiteStageId);
  if (!ok) {
    let prereqTitle = "previous stage";
    if (stage.prerequisiteStageId) {
      const pre = await Stage.findById(stage.prerequisiteStageId).select("title");
      if (pre) prereqTitle = pre.title;
    }
    return { ok: false, prerequisiteTitle: prereqTitle };
  }
  return { ok: true };
}

function recomputeProgressFields(progressDoc, stage) {
  const total = stage.challenges?.length || 0;
  const done = progressDoc.completedChallenges?.length || 0;
  const progressPercent = total === 0 ? 0 : Math.min(100, Math.round((done / total) * 100));
  progressDoc.progressPercent = progressPercent;
  if (progressPercent >= 100 && total > 0) {
    progressDoc.status = "completed";
    progressDoc.completedAt = progressDoc.completedAt || new Date();
  } else if (done > 0) {
    progressDoc.status = "in-progress";
    progressDoc.completedAt = null;
  } else {
    progressDoc.status = "available";
    progressDoc.completedAt = null;
  }
}

/** Admin: list all stages */
exports.adminListStages = async (req, res) => {
  try {
    const stages = await Stage.find()
      .sort({ category: 1, order: 1 })
      .populate("challenges", "title difficulty language")
      .populate("prerequisiteStageId", "title order");
    res.json(stages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", detail: err.message });
  }
};

/** Admin: create */
exports.createStage = async (req, res) => {
  try {
    const {
      title,
      description,
      difficulty,
      order,
      category,
      prerequisiteStageId,
      challenges,
    } = req.body;

    if (!title || order === undefined) {
      return res.status(400).json({ message: "title and order are required" });
    }

    const stage = new Stage({
      title,
      description: description || "",
      difficulty: difficulty || "easy",
      order: Number(order),
      category: category || "training",
      prerequisiteStageId: prerequisiteStageId || null,
      challenges: Array.isArray(challenges) ? challenges : [],
    });
    await stage.save();
    const populated = await Stage.findById(stage._id)
      .populate("challenges")
      .populate("prerequisiteStageId", "title order");
    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", detail: err.message });
  }
};

/** Admin: update */
exports.updateStage = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    if (updates.order !== undefined) updates.order = Number(updates.order);
    delete updates._id;

    const stage = await Stage.findByIdAndUpdate(id, { $set: updates }, { new: true })
      .populate("challenges")
      .populate("prerequisiteStageId", "title order");
    if (!stage) return res.status(404).json({ message: "Stage not found" });
    res.json(stage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", detail: err.message });
  }
};

/** Admin: delete */
exports.deleteStage = async (req, res) => {
  try {
    const { id } = req.params;
    const stage = await Stage.findByIdAndDelete(id);
    if (!stage) return res.status(404).json({ message: "Stage not found" });
    await UserStageProgress.deleteMany({ stageId: id });
    await Stage.updateMany({ prerequisiteStageId: id }, { $set: { prerequisiteStageId: null } });
    res.json({ message: "Stage deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", detail: err.message });
  }
};

/** Admin: assign challenges (replaces order) */
exports.assignChallengesToStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { challengeIds } = req.body;
    if (!Array.isArray(challengeIds)) {
      return res.status(400).json({ message: "challengeIds array required" });
    }
    const stage = await Stage.findById(id);
    if (!stage) return res.status(404).json({ message: "Stage not found" });

    const ids = challengeIds.map((c) => new mongoose.Types.ObjectId(String(c)));
    const count = await Challenge.countDocuments({ _id: { $in: ids } });
    if (count !== ids.length) {
      return res.status(400).json({ message: "One or more challenge IDs are invalid" });
    }

    stage.challenges = ids;
    await stage.save();

    const progresses = await UserStageProgress.find({ stageId: id });
    for (const p of progresses) {
      p.completedChallenges = p.completedChallenges.filter((cid) =>
        ids.some((i) => i.equals(cid))
      );
      recomputeProgressFields(p, stage);
      await p.save();
    }

    const populated = await Stage.findById(id).populate("challenges").populate("prerequisiteStageId", "title order");
    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", detail: err.message });
  }
};

/** Admin: remove one challenge from stage */
exports.removeChallengeFromStage = async (req, res) => {
  try {
    const { id, challengeId } = req.params;
    const stage = await Stage.findById(id);
    if (!stage) return res.status(404).json({ message: "Stage not found" });
    const cid = new mongoose.Types.ObjectId(String(challengeId));
    stage.challenges = stage.challenges.filter((c) => !c.equals(cid));
    await stage.save();

    await UserStageProgress.updateMany(
      { stageId: id },
      { $pull: { completedChallenges: cid } }
    );
    const progresses = await UserStageProgress.find({ stageId: id });
    for (const p of progresses) {
      recomputeProgressFields(p, stage);
      await p.save();
    }

    const populated = await Stage.findById(id).populate("challenges").populate("prerequisiteStageId", "title order");
    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", detail: err.message });
  }
};

/** Participant: all stages with my progress */
exports.getMyStages = async (req, res) => {
  try {
    const userId = toUserId(req);
    const { category } = req.query;
    const query = {};
    if (category) query.category = category;

    const stages = await Stage.find(query)
      .sort({ order: 1 })
      .populate("prerequisiteStageId", "title order")
      .populate("challenges", "title difficulty language");

    const progresses = await UserStageProgress.find({ userId });
    const byStage = new Map(progresses.map((p) => [p.stageId.toString(), p]));

    const enriched = [];
    for (const stage of stages) {
      const access = await assertParticipantCanAccessStage(userId, stage);
      const prog = byStage.get(stage._id.toString());
      const total = stage.challenges?.length || 0;
      const done = prog?.completedChallenges?.length || 0;

      if (!access.ok) {
        enriched.push({
          ...stage.toObject(),
          progress: {
            status: "locked",
            progressPercent: 0,
            completedChallenges: [],
            completedAt: null,
          },
          participantStatus: "locked",
          prerequisiteTitle: access.prerequisiteTitle,
          challengeCount: total,
        });
        continue;
      }

      let participantStatus = "available";
      let progressPercent = total ? Math.round((done / total) * 100) : 0;
      let completedChallenges = prog?.completedChallenges || [];
      let completedAt = prog?.completedAt || null;

      if (prog) {
        participantStatus =
          prog.status === "completed"
            ? "completed"
            : done > 0
              ? "in-progress"
              : "available";
        progressPercent = prog.progressPercent;
      }

      enriched.push({
        ...stage.toObject(),
        progress: {
          status: participantStatus,
          progressPercent,
          completedChallenges,
          completedAt,
        },
        participantStatus,
        prerequisiteTitle: access.prerequisiteTitle,
        challengeCount: total,
      });
    }

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", detail: err.message });
  }
};

/** Admin or participant (if not locked) */
exports.getStageDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const stage = await Stage.findById(id).populate("challenges").populate("prerequisiteStageId", "title order");
    if (!stage) return res.status(404).json({ message: "Stage not found" });

    if (req.user.role === "admin") {
      return res.json({ ...stage.toObject(), progress: null });
    }

    if (!["participant", "recruiter", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const userId = toUserId(req);
    const access = await assertParticipantCanAccessStage(userId, stage);
    if (!access.ok) {
      return res.status(403).json({
        message: "This stage is locked. Complete the prerequisite first.",
        code: "STAGE_LOCKED",
        prerequisiteTitle: access.prerequisiteTitle,
      });
    }

    let progress = await UserStageProgress.findOne({ userId, stageId: id });
    const completedSet = new Set((progress?.completedChallenges || []).map((c) => c.toString()));

    const challenges = (stage.challenges || [])
      .filter(Boolean)
      .map((c) => ({
        ...c.toObject(),
        completed: completedSet.has(c._id.toString()),
      }));

    res.json({
      ...stage.toObject(),
      challenges,
      progress: progress
        ? {
            status: progress.status,
            progressPercent: progress.progressPercent,
            completedChallenges: progress.completedChallenges,
            completedAt: progress.completedAt,
          }
        : {
            status: "available",
            progressPercent: 0,
            completedChallenges: [],
            completedAt: null,
          },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", detail: err.message });
  }
};

/** Run tests only */
exports.runChallenge = async (req, res) => {
  try {
    const { id: stageId, challengeId } = req.params;
    const { code } = req.body;
    const userId = toUserId(req);

    const stage = await Stage.findById(stageId).populate("challenges");
    if (!stage) return res.status(404).json({ message: "Stage not found" });

    const access = await assertParticipantCanAccessStage(userId, stage);
    if (!access.ok) {
      return res.status(403).json({
        message: "Stage locked",
        prerequisiteTitle: access.prerequisiteTitle,
      });
    }

    const challenge = await Challenge.findById(challengeId);
    if (!challenge || !stage.challenges.some((c) => c._id.equals(challenge._id))) {
      return res.status(404).json({ message: "Challenge not found on this stage" });
    }

    const run = runChallengeCode(challenge.language, code || "", challenge.testCases || []);
    res.json({
      passed: run.passed,
      testResults: run.testResults,
      executionTimeMs: run.executionTimeMs,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", detail: err.message });
  }
};

/** Submit: tests + sonar + AI + mark complete if all tests pass */
exports.submitChallenge = async (req, res) => {
  try {
    const { id: stageId, challengeId } = req.params;
    const { code } = req.body;
    const userId = toUserId(req);

    const stage = await Stage.findById(stageId);
    if (!stage) return res.status(404).json({ message: "Stage not found" });

    const access = await assertParticipantCanAccessStage(userId, stage);
    if (!access.ok) {
      return res.status(403).json({
        message: "Stage locked",
        prerequisiteTitle: access.prerequisiteTitle,
      });
    }

    const challenge = await Challenge.findById(challengeId);
    if (!challenge || !stage.challenges.some((c) => c.equals(challenge._id))) {
      return res.status(404).json({ message: "Challenge not found on this stage" });
    }

    const run = runChallengeCode(challenge.language, code || "", challenge.testCases || []);

    const [sonar, aiFeedback] = await Promise.all([
      fetchSonarStub(code, challenge.language),
      fetchAiFeedback(code, challenge.title),
    ]);

    if (!run.passed) {
      return res.status(400).json({
        message: "Tests did not pass",
        testResults: run.testResults,
        executionTimeMs: run.executionTimeMs,
        sonar,
        aiFeedback,
      });
    }

    let progress = await UserStageProgress.findOne({ userId, stageId });
    if (!progress) {
      progress = new UserStageProgress({ userId, stageId, completedChallenges: [], status: "available" });
    }

    const cidStr = challenge._id.toString();
    if (!progress.completedChallenges.some((c) => c.toString() === cidStr)) {
      progress.completedChallenges.push(challenge._id);
    }

    const stageFresh = await Stage.findById(stageId);
    recomputeProgressFields(progress, stageFresh);
    await progress.save();

    let nextStageUnlocked = false;
    if (progress.status === "completed") {
      const next = await Stage.find({
        prerequisiteStageId: stageId,
        category: stageFresh.category,
      })
        .sort({ order: 1 })
        .select("_id");
      nextStageUnlocked = next.length > 0;
    }

    res.json({
      message: "Submission accepted",
      testResults: run.testResults,
      executionTimeMs: run.executionTimeMs,
      sonar,
      aiFeedback,
      progress: {
        status: progress.status,
        progressPercent: progress.progressPercent,
        completedChallenges: progress.completedChallenges,
        completedAt: progress.completedAt,
      },
      stageCompleted: progress.status === "completed",
      nextStageUnlocked,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", detail: err.message });
  }
};

/** Spec alias: same as submit (server validates, never trusts client percent) */
exports.completeChallenge = exports.submitChallenge;

exports.resetAllProgress = async (req, res) => {
  try {
    const userId = toUserId(req);
    await UserStageProgress.deleteMany({ userId });
    res.json({ message: "All stage progress reset" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", detail: err.message });
  }
};

exports.resetStageProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { challengeId } = req.body;
    const userId = toUserId(req);

    if (challengeId) {
      const cid = new mongoose.Types.ObjectId(String(challengeId));
      await UserStageProgress.updateOne(
        { userId, stageId: id },
        { $pull: { completedChallenges: cid }, $set: { completedAt: null } }
      );
      const progress = await UserStageProgress.findOne({ userId, stageId: id });
      const stage = await Stage.findById(id);
      if (progress && stage) {
        recomputeProgressFields(progress, stage);
        await progress.save();
      }
      return res.json({ message: "Challenge progress cleared" });
    }

    await UserStageProgress.deleteOne({ userId, stageId: id });
    res.json({ message: "Stage progress reset" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", detail: err.message });
  }
};
