const mongoose = require("mongoose");
const Stage = require("../models/Stage");
const Challenge = require("../models/Challenge");
const UserStageProgress = require("../models/UserStageProgress");
const { runChallengeCode } = require("../utils/runChallengeCode");
const { fetchSonarStub, fetchAiFeedback, fetchExerciseHelp } = require("../utils/stageAnalysis");
const gamificationService = require("../services/gamificationService");
const { generateChallenges } = require("../services/aiStageGenerator");
const { httpStatusForAiError } = require("../services/aiExerciseService");
const { generateFallbackStageExercises } = require("../utils/fallbackStageExercises");
const {
  replaceStageChallenges,
  detachChallengeFromStage,
  clearStageIdForDeletedStage,
} = require("../utils/stageChallengeSync");

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
      .sort({ category: 1, level: 1, order: 1 })
      .populate("challenges", "title difficulty language")
      .populate("prerequisiteStageId", "title order");
    res.json(stages);
  } catch (err) {
    console.error(err);
    if (err.code && String(err.code).startsWith("AI_")) {
      return res.status(httpStatusForAiError(err)).json({
        message: err.message,
        code: err.code,
        detail: err.detail || err.cause?.message,
        helpUrl: err.helpUrl,
      });
    }
    res.status(500).json({ message: "Server error", detail: err.message });
  }
};

/** Participant: request help (hint/explain/course) for a challenge */
exports.getChallengeHelp = async (req, res) => {
  try {
    const { id: stageId, challengeId } = req.params;
    const userId = toUserId(req);
    const type = String(req.body?.type || "hint").trim().toLowerCase();

    const HELP_COSTS = { hint: 5, explain: 10, course: 15 };
    const xpCost = HELP_COSTS[type] ?? HELP_COSTS.hint;

    const stage = await Stage.findById(stageId).populate("challenges");
    if (!stage) return res.status(404).json({ message: "Stage not found" });

    const access = await assertParticipantCanAccessStage(userId, stage);
    if (!access.ok) {
      return res.status(403).json({
        message: "Stage locked",
        prerequisiteTitle: access.prerequisiteTitle,
      });
    }

    const challenge = (stage.challenges || []).find((c) => String(c?._id) === String(challengeId));
    if (!challenge) {
      return res.status(404).json({ message: "Challenge not found on this stage" });
    }

    let xp = null;
    try {
      xp = await gamificationService.spendXP(userId, xpCost);
    } catch (e) {
      if (e?.code === "INSUFFICIENT_XP") {
        return res.status(400).json({
          message: "Not enough XP",
          code: "INSUFFICIENT_XP",
          required: e.required,
          current: e.current,
        });
      }
      throw e;
    }

    const help = await fetchExerciseHelp({
      type,
      stageTitle: stage.title,
      challengeTitle: challenge.title,
      challengeDescription: challenge.description,
      language: challenge.language,
      starterCode: challenge.starterCode,
      code: req.body?.code,
    });

    return res.json({
      message: "Help generated",
      help,
      xp,
      xpCost,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", detail: err.message });
  }
};

/** Admin: create */
exports.createStage = async (req, res) => {
  try {
    const {
      title,
      description,
      difficulty,
      level,
      order,
      category,
      prerequisiteStageId,
      challenges,
      language = "javascript",
      count = 5,
      generateWithAi = false,
    } = req.body;

    const normalizedLevel = Number(level ?? order);
    if (!title || !Number.isFinite(normalizedLevel) || normalizedLevel < 1) {
      return res.status(400).json({ message: "title and level (or order) are required" });
    }

    let prerequisite = null;
    if (prerequisiteStageId) {
      prerequisite = await Stage.findById(prerequisiteStageId).select("_id");
      if (!prerequisite) {
        return res.status(404).json({ message: "Prerequisite stage not found" });
      }
    }

    const stage = new Stage({
      title,
      description: description || "",
      difficulty: difficulty || "easy",
      level: normalizedLevel,
      order: normalizedLevel,
      category: category || "training",
      prerequisiteStageId: prerequisite?._id || null,
      challenges: [],
    });
    await stage.save();

    if (Array.isArray(challenges) && challenges.length) await replaceStageChallenges(stage._id, challenges);

    // AI generation is explicit (separate action in Admin UI), never forced by default.
    if (generateWithAi) {
      try {
        const generated = await generateChallenges({
          topic: title,
          difficulty: difficulty || "easy",
          language,
          count: Number(count),
        });

        for (const g of generated) {
          const ch = new Challenge({
            title: g.title,
            description: g.description || "",
            difficulty: g.difficulty || difficulty || "easy",
            type: "Stage",
            stageId: stage._id,
            language: g.language || language,
            starterCode: g.starterCode || "",
            testCases: Array.isArray(g.testCases) ? g.testCases : [],
            category: g.category || "general",
            constraints: g.constraints || "",
            xpReward: g.xpReward ?? (difficulty === "easy" ? 50 : difficulty === "medium" ? 100 : 200),
          });
          await ch.save();
          stage.challenges.push(ch._id);
        }
        await stage.save();
      } catch (aiErr) {
        console.error("AI generation failed (stage still created):", aiErr.message);
      }
    }

    const populated = await Stage.findById(stage._id)
      .populate("challenges")
      .populate("prerequisiteStageId", "title order");
    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    if (["NOT_FOUND", "BAD_IDS", "DUPLICATE_IDS", "BATTLE_NOT_ALLOWED"].includes(err.code)) {
      const status = err.code === "NOT_FOUND" ? 404 : 400;
      return res.status(status).json({ message: err.message, code: err.code });
    }
    res.status(500).json({ message: "Server error", detail: err.message });
  }
};

/** Admin: update */
exports.updateStage = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    const hasChallengesUpdate = Object.prototype.hasOwnProperty.call(updates, "challenges");
    const challengeIds = hasChallengesUpdate ? updates.challenges : null;
    const hasLevel = updates.level !== undefined;
    const hasOrder = updates.order !== undefined;
    if (hasLevel || hasOrder) {
      const normalizedLevel = Number(hasLevel ? updates.level : updates.order);
      if (!Number.isFinite(normalizedLevel) || normalizedLevel < 1) {
        return res.status(400).json({ message: "level/order must be a number greater than 0" });
      }
      updates.level = normalizedLevel;
      updates.order = normalizedLevel;
    }
    if (hasChallengesUpdate) delete updates.challenges;
    delete updates._id;

    const stage = await Stage.findByIdAndUpdate(id, { $set: updates }, { new: true })
      .populate("challenges")
      .populate("prerequisiteStageId", "title order");
    if (!stage) return res.status(404).json({ message: "Stage not found" });

    if (hasChallengesUpdate) {
      if (!Array.isArray(challengeIds)) {
        return res.status(400).json({ message: "challenges must be an array of IDs" });
      }
      const synced = await replaceStageChallenges(id, challengeIds);
      const populated = await Stage.findById(synced._id)
        .populate("challenges")
        .populate("prerequisiteStageId", "title order");
      return res.json(populated);
    }

    res.json(stage);
  } catch (err) {
    console.error(err);
    if (["NOT_FOUND", "BAD_IDS", "DUPLICATE_IDS", "BATTLE_NOT_ALLOWED"].includes(err.code)) {
      const status = err.code === "NOT_FOUND" ? 404 : 400;
      return res.status(status).json({ message: err.message, code: err.code });
    }
    res.status(500).json({ message: "Server error", detail: err.message });
  }
};

/** Admin: delete */
exports.deleteStage = async (req, res) => {
  try {
    const { id } = req.params;
    const stage = await Stage.findByIdAndDelete(id);
    if (!stage) return res.status(404).json({ message: "Stage not found" });
    await clearStageIdForDeletedStage(id);
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
    const stage = await replaceStageChallenges(id, challengeIds);

    const progresses = await UserStageProgress.find({ stageId: id });
    for (const p of progresses) {
      p.completedChallenges = p.completedChallenges.filter((cid) =>
        stage.challenges.some((i) => i.equals(cid))
      );
      recomputeProgressFields(p, stage);
      await p.save();
    }

    const populated = await Stage.findById(id).populate("challenges").populate("prerequisiteStageId", "title order");
    res.json(populated);
  } catch (err) {
    console.error(err);
    if (err.code === "NOT_FOUND") return res.status(404).json({ message: err.message, code: err.code });
    if (["BAD_IDS", "DUPLICATE_IDS", "BATTLE_NOT_ALLOWED"].includes(err.code)) {
      return res.status(400).json({ message: err.message, code: err.code });
    }
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
    await detachChallengeFromStage(id, challengeId);
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
      .sort({ level: 1, order: 1 })
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
      output: run.outputSnapshot,
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
      fetchSonarStub(code, challenge.language, {
        participantId: userId,
        stageId,
        projectName: stage.title,
      }),
      fetchAiFeedback(code, challenge.title),
    ]);

    let progress = await UserStageProgress.findOne({ userId, stageId });
    if (!progress) {
      progress = new UserStageProgress({ userId, stageId, completedChallenges: [], status: "available" });
    }

    if (!progress.failedAttemptsByChallenge) {
      progress.failedAttemptsByChallenge = new Map();
    }
    if (!progress.lastCodeByChallenge) {
      progress.lastCodeByChallenge = new Map();
    }

    const failKey = String(challenge._id);
    const currentFails = Number(progress.failedAttemptsByChallenge.get(failKey) || 0);
    const lastCode = progress.lastCodeByChallenge.get(failKey) || "";
    const currentCode = String(code || "").trim();

    // Check if code is meaningful (non-empty, not just whitespace)
    const isMeaningfulCode = currentCode.length > 0;

    // Check for duplicate submission to prevent spam
    const isDuplicate = currentCode === lastCode;

    if (!run.passed) {
      // Only increment if code is meaningful and not a duplicate
      if (isMeaningfulCode && !isDuplicate) {
        const nextFails = currentFails + 1;
        progress.failedAttemptsByChallenge.set(failKey, nextFails);
        progress.lastCodeByChallenge.set(failKey, currentCode);
        await progress.save();

        // Calculate stuckLevel: 0=normal, 1=warning (3 fails), 2=struggling (5 fails), 3=critical (6+ fails)
        let stuckLevel = 0;
        if (nextFails >= 6) stuckLevel = 3;
        else if (nextFails >= 5) stuckLevel = 2;
        else if (nextFails >= 3) stuckLevel = 1;

        // Backend decides if auto hint should trigger (stuckLevel >= 2 and meaningful code)
        const autoHintTrigger = stuckLevel >= 2;
        const submissionId = `${challengeId}-${Date.now()}`;

        console.log("[STUCK DETECTOR] Failed submission - userId:", userId, "challengeId:", challengeId, "fails:", nextFails, "stuckLevel:", stuckLevel, "autoHintTrigger:", autoHintTrigger, "submissionId:", submissionId);

        return res.status(400).json({
          message: "Tests did not pass",
          testResults: run.testResults,
          executionTimeMs: run.executionTimeMs,
          sonar,
          aiFeedback,
          isStuck: nextFails >= 3,
          failedSubmissionsInRow: nextFails,
          stuckLevel,
          autoHintTrigger,
          submissionId,
        });
      } else {
        // Don't increment for empty or duplicate submissions
        const nextFails = currentFails;
        let stuckLevel = 0;
        if (nextFails >= 6) stuckLevel = 3;
        else if (nextFails >= 5) stuckLevel = 2;
        else if (nextFails >= 3) stuckLevel = 1;

        // Backend decides if auto hint should trigger (stuckLevel >= 2 and meaningful code)
        const autoHintTrigger = stuckLevel >= 2;
        const submissionId = `${challengeId}-${Date.now()}`;

        console.log("[STUCK DETECTOR] Failed submission (no increment) - userId:", userId, "challengeId:", challengeId, "fails:", nextFails, "stuckLevel:", stuckLevel, "autoHintTrigger:", autoHintTrigger, "isDuplicate:", isDuplicate, "isMeaningfulCode:", isMeaningfulCode, "submissionId:", submissionId);

        return res.status(400).json({
          message: "Tests did not pass",
          testResults: run.testResults,
          executionTimeMs: run.executionTimeMs,
          sonar,
          aiFeedback,
          isStuck: nextFails >= 3,
          failedSubmissionsInRow: nextFails,
          stuckLevel,
          autoHintTrigger,
          isDuplicate,
          isMeaningfulCode,
          submissionId,
        });
      }
    }

    // Passed: reset failure counter for this challenge.
    if (currentFails > 0) {
      progress.failedAttemptsByChallenge.set(failKey, 0);
    }

    const cidStr = challenge._id.toString();
    const isNewCompletion = !progress.completedChallenges.some((c) => c.toString() === cidStr);
    
    if (isNewCompletion) {
      progress.completedChallenges.push(challenge._id);
    }

    const stageFresh = await Stage.findById(stageId);
    recomputeProgressFields(progress, stageFresh);
    await progress.save();

    let xpResult = null;
    if (isNewCompletion) {
      try {
        xpResult = await gamificationService.addXP(userId, challenge.xpReward || 100);
      } catch (err) {
        console.error("XP Award Error:", err);
      }
    }

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

    // Passed: reset failure counter and last code for this challenge.
    if (currentFails > 0) {
      progress.failedAttemptsByChallenge.set(failKey, 0);
      progress.lastCodeByChallenge.set(failKey, currentCode);
    }

    console.log("[STUCK DETECTOR] Success submission - userId:", userId, "challengeId:", challengeId, "stuckLevel: 0", "autoHintTrigger: false");

    const submissionId = `${challengeId}-${Date.now()}`;

    res.json({
      message: "Submission accepted",
      testResults: run.testResults,
      executionTimeMs: run.executionTimeMs,
      output: run.outputSnapshot,
      sonar,
      aiFeedback,
      isStuck: false,
      failedSubmissionsInRow: 0,
      stuckLevel: 0,
      autoHintTrigger: false,
      submissionId,
      progress: {
        status: progress.status,
        progressPercent: progress.progressPercent,
        completedChallenges: progress.completedChallenges,
        completedAt: progress.completedAt,
      },
      stageCompleted: progress.status === "completed",
      xpReward: xpResult ? {
        xpAwarded: true,
        xpAmount: xpResult.gainedXP,
        newPoints: xpResult.points,
        newLevel: xpResult.level,
        levelUp: xpResult.levelUp
      } : null,
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

/** Admin: generate exercises for a stage using AI */
exports.generateStageExercises = async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    const { id } = req.params;
    const { count = 3, topic, difficulty = "easy", language = "javascript" } = req.body;

    const stage = await Stage.findById(id);
    if (!stage) return res.status(404).json({ message: "Stage not found" });

    let generated = [];
    let source = "ai";
    let warning = null;
    try {
      generated = await generateChallenges({
        topic: topic || stage.title,
        difficulty,
        language,
        count: Number(count),
      });
    } catch (aiErr) {
      generated = generateFallbackStageExercises({
        topic: topic || stage.title,
        difficulty,
        language,
        count: Number(count),
      });
      source = "fallback";
      warning = aiErr.message || "AI generation failed; fallback drafts were generated.";
    }

    const created = [];
    for (const g of generated) {
      const ch = new Challenge({
        title: g.title,
        description: g.description || "",
        difficulty: g.difficulty || difficulty,
        type: "Stage",
        stageId: stage._id,
        language: g.language || language,
        starterCode: g.starterCode || "",
        testCases: Array.isArray(g.testCases) ? g.testCases : [],
        category: g.category || "general",
        constraints: g.constraints || "",
        xpReward: g.xpReward || (difficulty === "easy" ? 50 : difficulty === "medium" ? 100 : 200),
      });
      await ch.save();
      stage.challenges.push(ch._id);
      created.push(ch);
    }

    await stage.save();
    const populated = await Stage.findById(id).populate("challenges").populate("prerequisiteStageId", "title order");
    res.status(201).json({ created, stage: populated, source, warning });
  } catch (err) {
    console.error(err);
    if (err.code && String(err.code).startsWith("AI_")) {
      return res.status(httpStatusForAiError(err)).json({
        message: err.message,
        code: err.code,
        detail: err.detail || err.cause?.message,
        helpUrl: err.helpUrl,
      });
    }
    res.status(500).json({ message: "Server error", detail: err.message });
  }
};
