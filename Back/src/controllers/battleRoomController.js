const BattleRoom = require("../models/BattleRoom");
const BattleSubmission = require("../models/BattleSubmission");
const User = require("../models/User");
const axios = require("axios");

const getRecruiterId = (req) => req.user && (req.user.id || req.user._id);

function toStringArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((v) => String(v || "").trim())
      .filter(Boolean);
  }
  return String(value)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseMaybeJson(value, fallback) {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  try {
    return JSON.parse(trimmed);
  } catch {
    return fallback;
  }
}

function sanitizeTestCases(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((tc) => ({
      name: typeof tc?.name === "string" ? tc.name.trim() : "",
      assertion: typeof tc?.assertion === "string" ? tc.assertion.trim() : "",
      hidden: Boolean(tc?.hidden),
    }))
    .filter((tc) => tc.assertion);
}

function buildStarterCode(functionNames = []) {
  if (!functionNames.length) {
    return [
      "// Write your solution below",
      "function solve(input) {",
      "  // TODO",
      "  return input;",
      "}",
      "",
      "module.exports = { solve };",
    ].join("\n");
  }

  const blocks = functionNames.map((fn) => {
    return [
      `function ${fn}() {`,
      "  // TODO",
      "  return null;",
      "}",
      "",
    ].join("\n");
  });

  return [
    "// Implement the expected functions below",
    ...blocks,
    `module.exports = { ${functionNames.join(", ")} };`,
  ].join("\n");
}

function fallbackGeneration({ prompt, difficulty, expectedFunctions, criteria }) {
  const functionNames = toStringArray(expectedFunctions);
  const normalizedCriteria = toStringArray(criteria);
  const title = prompt && String(prompt).trim() ? String(prompt).trim().slice(0, 80) : "AI Generated Coding Challenge";
  const descriptionLines = [
    "Solve the challenge while keeping your code clean and readable.",
    difficulty ? `Difficulty: ${difficulty}` : null,
    functionNames.length ? `Expected functions: ${functionNames.join(", ")}` : null,
    normalizedCriteria.length ? `Evaluation criteria: ${normalizedCriteria.join(", ")}` : null,
  ].filter(Boolean);

  const assertions = functionNames.length
    ? functionNames.flatMap((fn) => [
        { name: `${fn} should be defined`, assertion: `typeof ${fn} === 'function'`, hidden: false },
        { name: `${fn} should return a non-undefined value`, assertion: `${fn}() !== undefined`, hidden: true },
      ])
    : [
        { name: "solve should be defined", assertion: "typeof solve === 'function'", hidden: false },
        { name: "solve should return non-undefined", assertion: "solve({}) !== undefined", hidden: true },
      ];

  return {
    title,
    description: descriptionLines.join("\n"),
    language: "javascript",
    starterCode: buildStarterCode(functionNames.length ? functionNames : ["solve"]),
    expectedFunctions: functionNames,
    criteria: normalizedCriteria,
    testCases: assertions,
  };
}

async function tryGenerateWithOpenAI({ prompt, difficulty, expectedFunctions, criteria, randomize }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const functionNames = toStringArray(expectedFunctions);
  const normalizedCriteria = toStringArray(criteria);

  const systemPrompt = [
    "You are a senior JavaScript coding challenge designer.",
    "Return ONLY valid JSON.",
    "No markdown, no code fences, no explanations outside JSON.",
    "JSON schema:",
    '{"title":"string","description":"string","language":"javascript","starterCode":"string","expectedFunctions":["string"],"criteria":["string"],"testCases":[{"name":"string","assertion":"string","hidden":false}]}'
  ].join("\n");

  const userPrompt = [
    `Prompt: ${prompt || "Generate a practical coding challenge"}`,
    `Difficulty: ${difficulty || "medium"}`,
    `Expected functions: ${functionNames.join(", ") || "solve"}`,
    `Criteria: ${normalizedCriteria.join(", ") || "correctness, readability"}`,
    `Randomize examples: ${Boolean(randomize)}`,
    "Constraints for assertions:",
    "- Assertions must be executable JavaScript expressions that evaluate to true when solution is correct.",
    "- Use only function names from expectedFunctions.",
    "- Include 4 to 8 test cases.",
    "- At least 1 hidden test case.",
  ].join("\n");

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: randomize ? 0.7 : 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 20000,
    }
  );

  const content = response?.data?.choices?.[0]?.message?.content;
  if (!content) return null;
  const parsed = JSON.parse(content);

  return {
    title: String(parsed.title || "AI Generated Coding Challenge").trim(),
    description: String(parsed.description || "").trim(),
    language: "javascript",
    starterCode: String(parsed.starterCode || "").trim(),
    expectedFunctions: toStringArray(parsed.expectedFunctions),
    criteria: toStringArray(parsed.criteria),
    testCases: sanitizeTestCases(parsed.testCases),
  };
}

// Generate AI battle exercise (title/description/starterCode/tests JSON)
exports.generateBattleExercise = async (req, res) => {
  try {
    const recruiterId = getRecruiterId(req);
    if (!recruiterId) return res.status(401).json({ message: "Unauthorized" });
    if (!["recruiter", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const {
      prompt,
      difficulty,
      language,
      expectedFunctions,
      expectedFunctionName,
      criteria,
      randomize,
    } = req.body || {};

    const safeLanguage = (language || "javascript").toString().toLowerCase();
    if (safeLanguage !== "javascript") {
      return res.status(400).json({ message: "Only JavaScript generation is supported for now" });
    }

    let exercise = null;
    const normalizedExpectedFunctions = toStringArray(expectedFunctions || expectedFunctionName);
    try {
      exercise = await tryGenerateWithOpenAI({
        prompt,
        difficulty,
        expectedFunctions: normalizedExpectedFunctions,
        criteria,
        randomize,
      });
    } catch (error) {
      console.warn("AI generation failed, using fallback:", error.message);
    }

    if (!exercise) {
      exercise = fallbackGeneration({
        prompt,
        difficulty,
        expectedFunctions: normalizedExpectedFunctions,
        criteria,
      });
    }

    exercise.language = "javascript";
    exercise.expectedFunctions = toStringArray(exercise.expectedFunctions);
    exercise.criteria = toStringArray(exercise.criteria);
    exercise.testCases = sanitizeTestCases(exercise.testCases);

    if (!exercise.starterCode) {
      exercise.starterCode = buildStarterCode(exercise.expectedFunctions.length ? exercise.expectedFunctions : ["solve"]);
    }

    if (!exercise.testCases.length) {
      exercise.testCases = fallbackGeneration({
        prompt,
        difficulty,
        expectedFunctions: exercise.expectedFunctions,
        criteria: exercise.criteria,
      }).testCases;
    }

    return res.json({
      message: "Exercise generated",
      source: process.env.OPENAI_API_KEY ? "ai_or_fallback" : "fallback",
      exercise,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// List participants (for recruiter to select when creating a room)
exports.listParticipants = async (req, res) => {
  try {
    const users = await User.find({ role: "participant", isActive: true })
      .select("_id username email nickname")
      .sort({ username: 1 });
    return res.json({ participants: users });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create battle room (User Story 4.4)
exports.createBattleRoom = async (req, res) => {
  try {
    const recruiterId = getRecruiterId(req);
    if (!recruiterId) return res.status(401).json({ message: "Unauthorized" });
    if (!["recruiter", "admin"].includes(req.user.role))
      return res.status(403).json({ message: "Forbidden" });

    const body = req.body || {};
    const parsedChallenge = parseMaybeJson(body.challenge, {});
    const challenge = parsedChallenge && typeof parsedChallenge === "object" ? parsedChallenge : {};
    const participantIds = Array.isArray(body.participantIds)
      ? body.participantIds
      : parseMaybeJson(body.participantIds, []);
    const title = body.title;
    const description = body.description;
    const timeLimitMinutes = body.timeLimitMinutes;

    const expectedFunctions = toStringArray(
      challenge.expectedFunctions || body.expectedFunctions || body.expectedFunctionName
    );
    const criteria = toStringArray(challenge.criteria || body.criteria);
    const testCases = sanitizeTestCases(
      challenge.testCases || parseMaybeJson(body.testCases, [])
    );

    if (!title || !timeLimitMinutes) {
      return res.status(400).json({ message: "Title and time limit are required" });
    }

    const statementFileUrl = req.file ? `/uploads/battle-statements/${req.file.filename}` : "";

    const room = await BattleRoom.create({
      recruiter: recruiterId,
      title,
      description: description || "",
      participants: Array.isArray(participantIds) ? participantIds : [],
      challenge: {
        title: challenge?.title || "Coding Challenge",
        description: challenge?.description || "",
        starterCode: challenge?.starterCode || "",
        language: challenge?.language || body.language || "javascript",
        statementFileUrl,
        expectedFunctions,
        criteria,
        testCases,
      },
      timeLimitMinutes: Math.min(300, Math.max(1, Number(timeLimitMinutes) || 60)),
      status: "draft",
    });

    // Create placeholder submissions for each participant
    if (room.participants.length) {
      await BattleSubmission.insertMany(
        room.participants.map((p) => ({
          battleRoom: room._id,
          participant: p,
          status: "pending",
        }))
      );
    }

    const populated = await BattleRoom.findById(room._id)
      .populate("participants", "username email nickname")
      .lean();
    return res.status(201).json({ message: "Battle room created", room: populated });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// List my battle rooms
exports.listMyBattleRooms = async (req, res) => {
  try {
    const recruiterId = getRecruiterId(req);
    if (!recruiterId) return res.status(401).json({ message: "Unauthorized" });

    const { status } = req.query;
    const filter = { recruiter: recruiterId };
    if (status) filter.status = status;

    const rooms = await BattleRoom.find(filter)
      .populate("participants", "username email nickname")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ rooms });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get one room with submissions (User Story 4.5 – monitor submissions)
exports.getBattleRoom = async (req, res) => {
  try {
    const recruiterId = getRecruiterId(req);
    if (!recruiterId) return res.status(401).json({ message: "Unauthorized" });

    const room = await BattleRoom.findOne({ _id: req.params.id, recruiter: recruiterId })
      .populate("participants", "username email nickname avatar")
      .lean();
    if (!room) return res.status(404).json({ message: "Battle room not found" });

    const submissions = await BattleSubmission.find({ battleRoom: room._id })
      .populate("participant", "username email nickname avatar")
      .sort({ updatedAt: -1 })
      .lean();
    return res.json({ room: { ...room, submissions } });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Start or end battle (User Story 4.4 & 4.6)
exports.updateBattleRoomStatus = async (req, res) => {
  try {
    const recruiterId = getRecruiterId(req);
    if (!recruiterId) return res.status(401).json({ message: "Unauthorized" });

    const { status } = req.body;
    if (!["draft", "scheduled", "live", "ended"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const room = await BattleRoom.findOne({ _id: req.params.id, recruiter: recruiterId });
    if (!room) return res.status(404).json({ message: "Battle room not found" });

    room.status = status;
    if (status === "live") room.startedAt = new Date();
    if (status === "ended") room.endedAt = new Date();
    await room.save();

    const populated = await BattleRoom.findById(room._id)
      .populate("participants", "username email nickname")
      .lean();
    return res.json({ message: "Battle room updated", room: populated });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get submissions for a room (User Story 4.5)
exports.getSubmissions = async (req, res) => {
  try {
    const recruiterId = getRecruiterId(req);
    if (!recruiterId) return res.status(401).json({ message: "Unauthorized" });

    const room = await BattleRoom.findOne({ _id: req.params.id, recruiter: recruiterId });
    if (!room) return res.status(404).json({ message: "Battle room not found" });

    const submissions = await BattleSubmission.find({ battleRoom: room._id })
      .populate("participant", "username email nickname avatar")
      .sort({ submittedAt: -1 })
      .lean();
    return res.json({ submissions });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Add recruiter comment/rating to a submission (User Story 4.5)
exports.updateSubmissionEvaluation = async (req, res) => {
  try {
    const recruiterId = getRecruiterId(req);
    if (!recruiterId) return res.status(401).json({ message: "Unauthorized" });

    const room = await BattleRoom.findOne({ _id: req.params.id, recruiter: recruiterId });
    if (!room) return res.status(404).json({ message: "Battle room not found" });

    const sub = await BattleSubmission.findOne({
      _id: req.params.subId,
      battleRoom: room._id,
    });
    if (!sub) return res.status(404).json({ message: "Submission not found" });

    const { recruiterComment, recruiterRating } = req.body;
    if (recruiterComment !== undefined) sub.recruiterComment = recruiterComment;
    if (recruiterRating !== undefined) sub.recruiterRating = Math.min(5, Math.max(0, Number(recruiterRating)));
    sub.status = "evaluated";
    await sub.save();

    const populated = await BattleSubmission.findById(sub._id)
      .populate("participant", "username email nickname")
      .lean();
    return res.json({ message: "Submission updated", submission: populated });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
