const Challenge = require("../models/Challenge");
const Stage = require("../models/Stage");
const { moveChallengeToStage } = require("../utils/stageChallengeSync");
const { generateExercises, httpStatusForAiError } = require("../services/aiExerciseService");
const { generateFallbackStageExercises } = require("../utils/fallbackStageExercises");

function sanitizeTestCases(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t) => t && typeof t === "object")
    .map((t) => ({
      name: (t.name && String(t.name).trim()) || "Test",
      assertion: t.assertion != null ? String(t.assertion) : "",
    }));
}

exports.createChallenge = async (req, res) => {
  try {
    const {
      title,
      description,
      difficulty,
      category,
      type,
      constraints,
      language,
      starterCode,
      testCases,
      xpReward,
      stageId: stageIdBody,
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: "Title is required." });
    }
    if (!description || !String(description).trim()) {
      return res.status(400).json({ message: "Description is required." });
    }

    const challengeType = type === "Battle" ? "Battle" : "Stage";

    const newChallenge = new Challenge({
      title: String(title).trim(),
      description: String(description).trim(),
      difficulty: difficulty || "medium",
      category: (category && String(category).trim()) || "general",
      type: challengeType,
      constraints,
      language: language || "javascript",
      starterCode: starterCode != null ? String(starterCode) : "",
      testCases: sanitizeTestCases(testCases),
      xpReward: Number.isFinite(Number(xpReward)) ? Number(xpReward) : 100,
    });
    const savedChallenge = await newChallenge.save();

    if (stageIdBody && challengeType === "Stage") {
      try {
        await moveChallengeToStage(savedChallenge._id, stageIdBody);
      } catch (e) {
        await Challenge.findByIdAndDelete(savedChallenge._id);
        const status = e.code === "NOT_FOUND" ? 404 : e.code === "BATTLE_NOT_ALLOWED" ? 403 : 400;
        return res.status(status).json({ message: e.message || "Invalid stage", code: e.code });
      }
    }

    const populated = await Challenge.findById(savedChallenge._id).populate("stageId", "title order category");
    res.status(201).json(populated);
  } catch (error) {
    console.error("Error creating challenge:", error);
    res.status(500).json({ message: "Error creating challenge", error: error.message });
  }
};

exports.getAllChallenges = async (req, res) => {
  try {
    const { type, pool, stageId } = req.query;
    const query = {};
    if (type === "Stage" || type === "Battle") query.type = type;
    if (pool === "true") query.stageId = null;
    if (stageId) query.stageId = stageId;

    const challenges = await Challenge.find(query)
      .populate("stageId", "title order category")
      .sort({ createdAt: -1 });
    res.status(200).json(challenges);
  } catch (error) {
    console.error("Error fetching challenges:", error);
    res.status(500).json({ message: "Error fetching challenges", error: error.message });
  }
};

exports.getChallengeById = async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id).populate("stageId", "title order category");
    if (!challenge) {
      return res.status(404).json({ message: "Challenge not found" });
    }
    res.status(200).json(challenge);
  } catch (error) {
    console.error("Error fetching challenge:", error);
    res.status(500).json({ message: "Error fetching challenge", error: error.message });
  }
};

exports.updateChallenge = async (req, res) => {
  try {
    const allowed = [
      "title",
      "description",
      "difficulty",
      "category",
      "type",
      "constraints",
      "language",
      "starterCode",
      "testCases",
      "xpReward",
    ];
    const updates = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        if (key === "testCases") {
          updates.testCases = sanitizeTestCases(req.body.testCases);
        } else if (key === "xpReward") {
          updates.xpReward = Number.isFinite(Number(req.body.xpReward)) ? Number(req.body.xpReward) : 100;
        } else {
          updates[key] = req.body[key];
        }
      }
    }
    if (updates.title !== undefined) updates.title = String(updates.title).trim();
    if (updates.description !== undefined) updates.description = String(updates.description).trim();
    if (updates.category !== undefined) {
      updates.category = (updates.category && String(updates.category).trim()) || "general";
    }
    if (updates.starterCode !== undefined) updates.starterCode = String(updates.starterCode ?? "");

    const stageIdInBody = Object.prototype.hasOwnProperty.call(req.body, "stageId");
    const newStageId = stageIdInBody ? req.body.stageId : undefined;

    const updatedChallenge = await Challenge.findByIdAndUpdate(req.params.id, { $set: updates }, {
      new: true,
      runValidators: true,
    });
    if (!updatedChallenge) {
      return res.status(404).json({ message: "Challenge not found" });
    }

    if (updates.type === "Battle") {
      try {
        await moveChallengeToStage(req.params.id, null);
      } catch (_err) {
        /* noop */
      }
    }

    if (stageIdInBody) {
      const target =
        newStageId === null || newStageId === "" ? null : newStageId;
      if (updatedChallenge.type === "Battle" && target) {
        return res.status(400).json({ message: "Battle challenges cannot be linked to a stage", code: "BATTLE_NOT_ALLOWED" });
      }
      try {
        await moveChallengeToStage(req.params.id, target);
      } catch (e) {
        return res.status(e.code === "NOT_FOUND" ? 404 : 400).json({
          message: e.message || "Could not update stage link",
          code: e.code,
        });
      }
    }

    const out = await Challenge.findById(req.params.id).populate("stageId", "title order category");
    res.status(200).json(out);
  } catch (error) {
    console.error("Error updating challenge:", error);
    res.status(500).json({ message: "Error updating challenge", error: error.message });
  }
};

exports.deleteChallenge = async (req, res) => {
  try {
    const deletedChallenge = await Challenge.findByIdAndDelete(req.params.id);
    if (!deletedChallenge) {
      return res.status(404).json({ message: "Challenge not found" });
    }
    await Stage.updateMany({}, { $pull: { challenges: deletedChallenge._id } });
    res.status(200).json({ message: "Challenge deleted", id: deletedChallenge._id });
  } catch (error) {
    console.error("Error deleting challenge:", error);
    res.status(500).json({ message: "Error deleting challenge", error: error.message });
  }
};

/** Admin/Recruiter: generate a draft exercise (does not persist) */
exports.generateChallengeDraft = async (req, res) => {
  try {
    const {
      prompt,
      topic,
      difficulty = "medium",
      language = "javascript",
      count = 1,
      functionName = "solve",
      useFallbackOnError = true,
      timeoutMs = 18000,
    } = req.body || {};

    const finalTopic = String(prompt || topic || "").trim();
    if (!finalTopic) {
      return res.status(400).json({ message: "prompt is required", code: "AI_BAD_REQUEST" });
    }

    try {
      const aiPromise = generateExercises({
        topic: finalTopic,
        difficulty,
        language,
        count: Number(count) || 1,
        functionName: String(functionName || "solve"),
        locale: "en",
      });
      const boundedAiPromise = Promise.race([
        aiPromise,
        new Promise((_, reject) =>
          setTimeout(() => {
            const e = new Error("AI generation timeout");
            e.code = "AI_TIMEOUT";
            reject(e);
          }, Math.max(5000, Number(timeoutMs) || 18000))
        ),
      ]);
      const exercises = await boundedAiPromise;
      const first = Array.isArray(exercises) ? exercises[0] : null;
      if (!first) return res.status(502).json({ message: "AI returned no exercise", code: "AI_GENERATION_FAILED" });
      return res.json({ exercise: first, source: "ai" });
    } catch (aiErr) {
      if (!useFallbackOnError) throw aiErr;
      const fallback = generateFallbackStageExercises({
        topic: finalTopic,
        difficulty,
        language,
        count: 1,
      })?.[0];
      return res.status(200).json({
        exercise: fallback,
        source: "fallback",
        warning:
          aiErr?.code === "AI_TIMEOUT"
            ? "AI generation exceeded time limit; fallback draft returned."
            : aiErr.message || "AI generation failed; fallback draft returned.",
        code: aiErr.code,
        helpUrl: aiErr.helpUrl,
        detail: aiErr.detail || aiErr.cause?.message,
      });
    }
  } catch (err) {
    console.error("Error generating challenge draft:", err);
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
