const BattleRoom = require("../models/BattleRoom");
const BattleSubmission = require("../models/BattleSubmission");
const User = require("../models/User");
const mongoose = require("mongoose");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");
const { fetchSonarStub, fetchAiFeedback } = require("../utils/stageAnalysis");
const { runChallengeCode } = require("../utils/runChallengeCode");
const { generateExercises, httpStatusForAiError } = require("../services/aiExerciseService");
const aiJudgeService = require("../services/aiJudgeService");
const complexityService = require("../services/complexityService");

const getRecruiterId = (req) => req.user && (req.user.id || req.user._id);
const getUserId = (req) => req.user && (req.user.id || req.user._id);

const ALLOWED_STATUSES = ["draft", "scheduled", "live", "ended"];
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const hashValue = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
const getQualityGrade = (score) => {
  const numeric = Number(score);
  if (Number.isNaN(numeric)) return "";
  if (numeric >= 90) return "A";
  if (numeric >= 80) return "B";
  if (numeric >= 70) return "C";
  if (numeric >= 60) return "D";
  return "E";
};
const buildSecurityAlerts = (code) => {
  const text = String(code || "");
  const alerts = [];
  if (/\beval\s*\(/i.test(text)) alerts.push("Use of eval() detected");
  if (/\bFunction\s*\(/i.test(text)) alerts.push("Dynamic Function constructor detected");
  if (/child_process|exec\s*\(|spawn\s*\(/i.test(text)) alerts.push("Potential process execution detected");
  if (/document\.write|innerHTML|outerHTML/i.test(text)) alerts.push("Potential unsafe DOM injection pattern detected");
  if (/while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)/i.test(text)) alerts.push("Infinite-loop pattern detected");
  return alerts;
};
const analyzeBattleCode = async (code, language, challengeTitle, context = {}) => {
  const [sonar, aiFeedback] = await Promise.all([
    fetchSonarStub(code, language, context),
    fetchAiFeedback(code, challengeTitle),
  ]);

  const hasRealSonar = String(sonar?.source || "").startsWith("sonarcloud");

  return {
    sonar,
    aiFeedback,
    qualityScore: sonar?.qualityScore ?? null,
    qualityGrade: getQualityGrade(sonar?.qualityScore),
    qualityIssues: sonar?.issues || [],
    // Keep regex alerts only for heuristic mode to avoid conflicting with SonarCloud metrics.
    securityAlerts: hasRealSonar ? [] : buildSecurityAlerts(code),
  };
};
const normalizeFraudReason = (value) => {
  const reason = String(value || "focus-lost").trim().slice(0, 120);
  return reason || "focus-lost";
};
const parseArrayInput = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_e) {
    return trimmed.split(/[,;\s]+/).filter(Boolean);
  }
};
const parseObjectInput = (value) => {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string") return {};
  const trimmed = value.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch (_e) {
    return {};
  }
};
const normalizeCriteria = (value) => {
  const list = Array.isArray(value) ? value : [value];
  return [...new Set(
    list
      .map((item) => String(item || "").trim().toLowerCase())
      .filter(Boolean)
  )];
};
const normalizeExpectedFunctions = (value) => {
  if (!Array.isArray(value)) return ["solve"];
  const valid = value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((name) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name));

  const unique = [...new Set(valid)];
  return unique.length ? unique : ["solve"];
};
const normalizeChallengeTests = (testCases) => {
  if (!Array.isArray(testCases)) return [];
  return testCases
    .map((tc, index) => ({
      name: String(tc?.name || `Test ${index + 1}`).trim().slice(0, 120),
      assertion: String(tc?.assertion || "").trim(),
      hidden: tc?.hidden !== false,
    }))
    .filter((tc) => tc.assertion.length > 0)
    .slice(0, 30);
};
const computeCorrectnessFromRun = (run) => {
  const testResults = Array.isArray(run?.testResults) ? run.testResults : [];
  const totalTests = testResults.length;
  const passedTests = testResults.filter((item) => item?.passed).length;
  const correctnessScore = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : null;

  return { testResults, totalTests, passedTests, correctnessScore };
};
const computeFinalScore = ({ qualityScore, correctnessScore }) => {
  if (correctnessScore == null && qualityScore == null) return null;
  if (correctnessScore == null) return Math.round(Number(qualityScore) || 0);
  if (qualityScore == null) return Math.round(Number(correctnessScore) || 0);
  return Math.round(Number(correctnessScore) * 0.7 + Number(qualityScore) * 0.3);
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

// Generate only exercise draft (title/description/tests), without creating a room.
exports.generateExerciseDraft = async (req, res) => {
  try {
    const recruiterId = getRecruiterId(req);
    if (!recruiterId) return res.status(401).json({ message: "Unauthorized" });
    if (!["recruiter", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const prompt = String(req.body?.prompt || "").trim();
    const difficulty = String(req.body?.difficulty || "medium").trim().toLowerCase();
    const language = String(req.body?.language || "javascript").trim().toLowerCase();
    const locale = req.body?.locale;
    const criteria = normalizeCriteria(req.body?.criteria || []);
    const randomize = req.body?.randomize !== false;
    const expectedFunctions = normalizeExpectedFunctions(req.body?.expectedFunctions);
    const functionName = expectedFunctions[0] || "solve";

    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    const extraHints = [
      criteria.length ? `Focus: ${criteria.join(", ")}.` : "",
      randomize ? "Prefer varied structure and naming within the constraints." : "",
    ]
      .filter(Boolean)
      .join(" ");

    let items;
    try {
      items = await generateExercises({
        topic: prompt,
        difficulty,
        language,
        count: 1,
        functionName,
        locale,
        extraHints,
      });
    } catch (e) {
      const code = e.code || "AI_GENERATION_FAILED";
      const status = httpStatusForAiError(e);
      const body = {
        message: e.message || "AI exercise generation failed",
        code,
      };
      if (e.helpUrl) body.helpUrl = e.helpUrl;
      if (e.detail) body.detail = e.detail;
      return res.status(status).json(body);
    }

    const raw = items[0];
    if (!raw) {
      return res.status(502).json({ message: "AI returned no exercise", code: "AI_GENERATION_FAILED" });
    }

    const exercise = {
      title: String(raw.title || "").trim(),
      description: String(raw.description || "").trim(),
      language: String(raw.language || language).toLowerCase().trim(),
      starterCode: String(raw.starterCode || "").trim(),
      expectedFunctions: normalizeExpectedFunctions(expectedFunctions),
      testCases: normalizeChallengeTests(raw.testCases),
      constraints: String(raw.constraints || "").trim(),
      xpReward: Number.isFinite(Number(raw.xpReward)) ? Number(raw.xpReward) : 100,
    };

    if (!exercise.title || !exercise.description || !exercise.testCases.length) {
      return res.status(502).json({
        message: "AI returned an incomplete exercise",
        code: "AI_INCOMPLETE",
      });
    }

    return res.json({
      message: "Exercise generated with AI",
      exercise,
      source: "openai",
      provider: "openai",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    });
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

    const title = String(req.body.title || "").trim();
    const description = String(req.body.description || "").trim();
    const participantIds = parseArrayInput(req.body.participantIds);
    const inviteEmails = parseArrayInput(req.body.inviteEmails);
    const challenge = parseObjectInput(req.body.challenge);
    const challengeTests = normalizeChallengeTests(challenge?.testCases);
    const timeLimitMinutes = Number(req.body.timeLimitMinutes);
    if (!title || !timeLimitMinutes) {
      return res.status(400).json({ message: "Title and time limit are required" });
    }

    const normalizedParticipantIds = [
      ...new Set(
        (Array.isArray(participantIds) ? participantIds : [])
          .map((id) => String(id || "").trim())
          .filter(Boolean)
      ),
    ];

    const normalizedInviteEmails = [
      ...new Set(
        (Array.isArray(inviteEmails) ? inviteEmails : [])
          .map((email) => normalizeEmail(email))
          .filter(Boolean)
      ),
    ];

    if (normalizedParticipantIds.length === 0 && normalizedInviteEmails.length === 0) {
      return res.status(400).json({ message: "Select participants or add invitation emails" });
    }

    const invalidEmails = normalizedInviteEmails.filter((email) => !isValidEmail(email));
    if (invalidEmails.length) {
      return res.status(400).json({ message: `Invalid invitation emails: ${invalidEmails.join(", ")}` });
    }

    const validParticipants = await User.find({
      _id: { $in: normalizedParticipantIds },
      role: "participant",
      isActive: true,
    })
      .select("_id")
      .lean();

    if (validParticipants.length !== normalizedParticipantIds.length) {
      return res.status(400).json({ message: "Some selected users are not active participants" });
    }

    const participantsByEmail = normalizedInviteEmails.length
      ? await User.find({
        email: { $in: normalizedInviteEmails },
        role: "participant",
        isActive: true,
      })
        .select("_id email")
        .lean()
      : [];

    const participantIdSet = new Set([
      ...validParticipants.map((p) => String(p._id)),
      ...participantsByEmail.map((p) => String(p._id)),
    ]);

    const roomInviteDetails = normalizedInviteEmails.map((email) => {
      const token = crypto.randomBytes(24).toString("hex");
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      return {
        email,
        token,
        code,
        tokenHash: hashValue(token),
        codeHash: hashValue(code),
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      };
    });

    const statementAttachment = req.file
      ? {
        fileName: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/battle-statements/${req.file.filename}`,
      }
      : null;

    const room = await BattleRoom.create({
      recruiter: recruiterId,
      title,
      description,
      participants: [...participantIdSet],
      invitations: roomInviteDetails.map((i) => ({
        email: i.email,
        tokenHash: i.tokenHash,
        codeHash: i.codeHash,
        expiresAt: i.expiresAt,
        status: "pending",
      })),
      challenge: {
        title: challenge?.title || "Coding Challenge",
        description: challenge?.description || "",
        starterCode: challenge?.starterCode || "",
        language: challenge?.language || "javascript",
        generatedExerciseSnapshot: challenge?.generatedExerciseSnapshot || null,
        testCases: challengeTests,
        statementAttachment,
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

    const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const emailResults = { sent: 0, failed: 0 };

    await Promise.all(
      roomInviteDetails.map(async (invite) => {
        const inviteUrl = `${frontendBaseUrl}/room-invitation?token=${invite.token}`;
        const html = `
          <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
            <h2 style="margin-bottom:8px;">Battle Room Invitation</h2>
            <p>You have been invited to join the battle room <strong>${title}</strong> on FortCode.</p>
            <p><strong>Challenge:</strong> ${challenge?.title || "Coding Challenge"}<br/>
            <strong>Time limit:</strong> ${Math.min(300, Math.max(1, Number(timeLimitMinutes) || 60))} minutes</p>
            <p><strong>Invitation code:</strong> <span style="font-size:20px;letter-spacing:2px;">${invite.code}</span></p>
            <p style="margin:16px 0;">
              <a href="${inviteUrl}" style="display:inline-block;background:#2563eb;color:white;padding:10px 16px;border-radius:6px;text-decoration:none;">Open Invitation</a>
            </p>
            <p style="font-size:12px;color:#6b7280;">Open the visitor portal link and enter your invitation code. No recruiter account access is required.</p>
          </div>
        `;

        try {
          await sendEmail({
            email: invite.email,
            subject: `FortCode Battle Invitation: ${title}`,
            message: `You are invited to ${title}. Invitation code: ${invite.code}. Open: ${inviteUrl}`,
            html,
          });
          emailResults.sent += 1;
        } catch (error) {
          emailResults.failed += 1;
        }
      })
    );
    return res.status(201).json({
      message: "Battle room created",
      room: populated,
      invitations: {
        total: roomInviteDetails.length,
        sent: emailResults.sent,
        failed: emailResults.failed,
      },
    });
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

    const submissionsByParticipant = new Map(
      submissions.map((submission) => [String(submission.participant?._id || submission.participant), submission])
    );

    const visitorDetails = (room.invitations || [])
      .filter((invite) => invite.status === "accepted")
      .sort((a, b) => new Date(b.acceptedAt || 0) - new Date(a.acceptedAt || 0))
      .map((invite) => {
        const submission = invite.acceptedBy ? submissionsByParticipant.get(String(invite.acceptedBy)) : null;
        return {
          email: invite.email,
          acceptedAt: invite.acceptedAt,
          acceptedBy: invite.acceptedBy || null,
          qualityScore: submission?.qualityScore ?? null,
          qualityGrade: submission?.qualityGrade || "",
          correctnessScore: submission?.correctnessScore ?? null,
          finalScore: submission?.finalScore ?? null,
          offTopic: submission?.offTopic || false,
          qualitySummary: submission?.sonarSummary || "",
          qualityIssues: submission?.qualityIssues || [],
          securityAlerts: submission?.securityAlerts || [],
          fraudDetected: submission?.fraudDetected || false,
          fraudReason: submission?.fraudReason || "",
          fraudDetectedAt: submission?.fraudDetectedAt || null,
          recruiterConfirmed: submission?.recruiterConfirmed || false,
          confirmedAt: submission?.confirmedAt || null,
        };
      });

    return res.json({ room: { ...room, submissions, visitorDetails } });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Start or end battle (User Story 4.4 & 4.6)
exports.updateBattleRoomStatus = async (req, res) => {
  try {
    const recruiterId = getRecruiterId(req);
    if (!recruiterId) return res.status(401).json({ message: "Unauthorized" });

    const { status, shareResults } = req.body;
    const hasStatusChange = typeof status === "string" && status.length > 0;
    const hasShareToggle = shareResults !== undefined;

    if (!hasStatusChange && !hasShareToggle) {
      return res.status(400).json({ message: "No update payload provided" });
    }

    if (hasStatusChange && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const room = await BattleRoom.findOne({ _id: req.params.id, recruiter: recruiterId });
    if (!room) return res.status(404).json({ message: "Battle room not found" });

    if (hasStatusChange) {
      const transitions = {
        draft: ["scheduled", "live", "ended"],
        scheduled: ["live", "ended"],
        live: ["ended"],
        ended: [],
        // Legacy compatibility for older documents.
        waiting: ["live", "ended"],
        active: ["ended"],
        completed: [],
        cancelled: [],
      };
      const allowedTransitions = transitions[room.status];
      if (!allowedTransitions) {
        return res.status(400).json({ message: `Unknown current room status: ${room.status}` });
      }
      if (!allowedTransitions.includes(status)) {
        return res.status(400).json({ message: `Cannot move room from ${room.status} to ${status}` });
      }

      room.status = status;
      if (status === "live") room.startedAt = new Date();
      if (status === "ended") {
        room.endedAt = new Date();

        // Resolve ties with AI Judge when battle ends
        await internalResolveBattleRoom(room);
      }
    }

    if (shareResults !== undefined) {
      room.resultsShared = Boolean(shareResults);
      room.resultsSharedAt = room.resultsShared ? new Date() : null;
    }

    await room.save();

    const populated = await BattleRoom.findById(room._id)
      .populate("participants", "username email nickname")
      .lean();
    return res.json({ message: "Battle room updated", room: populated });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// List battle rooms visible to an invited participant.
// We only expose rooms that are currently live or already ended.
exports.listParticipantBattleRooms = async (req, res) => {
  try {
    const participantId = getUserId(req);
    if (!participantId) return res.status(401).json({ message: "Unauthorized" });

    const rooms = await BattleRoom.find({
      participants: participantId,
      status: { $in: ["live", "ended"] },
    })
      .populate("recruiter", "username nickname email")
      .sort({ startedAt: -1, createdAt: -1 })
      .lean();

    return res.json({ rooms });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get one battle room only if current participant is invited.
exports.getParticipantBattleRoom = async (req, res) => {
  try {
    const participantId = getUserId(req);
    if (!participantId) return res.status(401).json({ message: "Unauthorized" });

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Battle room not found" });
    }

    const room = await BattleRoom.findOne({
      _id: req.params.id,
      participants: participantId,
      status: { $in: ["live", "ended"] },
    })
      .populate("recruiter", "username nickname email")
      .lean();

    if (!room) return res.status(404).json({ message: "Battle room not found" });

    const submission = await BattleSubmission.findOne({
      battleRoom: room._id,
      participant: participantId,
    }).lean();

    return res.json({ room: { ...room, mySubmission: submission || null } });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Public preview endpoint for users opening an invitation link before login/signup.
exports.previewBattleInvitation = async (req, res) => {
  try {
    const token = String(req.query.token || "").trim();
    if (!token) return res.status(400).json({ message: "Invitation token is required" });

    const tokenHash = hashValue(token);
    const now = new Date();

    const room = await BattleRoom.findOne({ "invitations.tokenHash": tokenHash })
      .populate("recruiter", "username nickname")
      .lean();

    if (!room) return res.status(404).json({ message: "Invitation not found" });

    const invitation = (room.invitations || []).find((i) => i.tokenHash === tokenHash);
    if (!invitation || invitation.status !== "pending" || new Date(invitation.expiresAt) < now) {
      return res.status(410).json({ message: "Invitation is expired or unavailable" });
    }

    return res.json({
      invitation: {
        email: invitation.email,
        expiresAt: invitation.expiresAt,
      },
      room: {
        _id: room._id,
        title: room.title,
        status: room.status,
        challenge: room.challenge,
        timeLimitMinutes: room.timeLimitMinutes,
        recruiter: room.recruiter,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Accept invitation: anyone (authenticated or not) with email + code can join.
// If user is unauthenticated, creates participant account auto-magically.
exports.acceptBattleInvitation = async (req, res) => {
  try {
    const inviteToken = String(req.body.token || "").trim();
    const code = String(req.body.code || "").trim();
    if (!inviteToken || !code) {
      return res.status(400).json({ message: "Invitation token and code are required" });
    }
    const tokenHash = hashValue(inviteToken);
    const codeHash = hashValue(code);
    const now = new Date();

    // Find invitation by token and keep minimal room fields needed later.
    const room = await BattleRoom.findOne(
      { "invitations.tokenHash": tokenHash },
      {
        title: 1,
        status: 1,
        participants: 1,
        invitations: { $elemMatch: { tokenHash } },
      }
    );
    if (!room) return res.status(404).json({ message: "Invitation not found" });

    const invite = room.invitations[0];
    if (!invite) return res.status(404).json({ message: "Invitation not found" });
    if (invite.status !== "pending") return res.status(400).json({ message: "Invitation was already used" });
    if (invite.codeHash !== codeHash) {
      return res.status(400).json({ message: "Invalid invitation code" });
    }
    if (new Date(invite.expiresAt) < now) {
      await BattleRoom.updateOne(
        { _id: room._id, "invitations.tokenHash": tokenHash },
        { "$set": { "invitations.$.status": "expired" } }
      );
      return res.status(410).json({ message: "Invitation expired" });
    }

    const email = normalizeEmail(invite.email);

    // Find or create user for the invited email.
    let user = await User.findOne({ email });
    if (!user) {
      // Auto-create participant account
      const username = email.split("@")[0];
      let uniqueUsername = username;
      let counter = 1;
      while (await User.findOne({ username: uniqueUsername })) {
        uniqueUsername = `${username}${counter++}`;
      }

      user = await User.create({
        username: uniqueUsername,
        email,
        password: null,
        role: "participant",
        isVerified: true,
        isActive: true,
        avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(uniqueUsername)}`,
      });
    } else if (!user.isActive) {
      // Invitation acceptance re-activates invited accounts.
      user.isActive = true;
      await user.save();
    }

    // Add to room if not already there
    const alreadyParticipant = room.participants.some((p) => String(p) === String(user._id));
    if (!alreadyParticipant) {
      await BattleRoom.updateOne(
        { _id: room._id },
        { $push: { participants: user._id } }
      );
    }

    // Mark invitation as accepted
    await BattleRoom.updateOne(
      { _id: room._id, "invitations.tokenHash": tokenHash },
      {
        "$set": {
          "invitations.$.status": "accepted",
          "invitations.$.acceptedAt": now,
          "invitations.$.acceptedBy": user._id,
        },
      }
    );

    // Ensure submission exists
    await BattleSubmission.findOneAndUpdate(
      { battleRoom: room._id, participant: user._id },
      { $setOnInsert: { status: "pending" } },
      { upsert: true }
    );

    // Generate token for auto-login
    const authToken = jwt.sign(
      { id: user._id, role: "participant" },
      process.env.JWT_SECRET,
      { expiresIn: process.env.BATTLE_INVITE_JWT_EXPIRES_IN || "7d" }
    );

    return res.json({
      message: "Invitation accepted successfully",
      token: authToken,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: "participant",
      },
      room: {
        _id: room._id,
        title: room.title,
        status: room.status,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Participant access endpoint used by visitor programmer page to wait for recruiter start.
exports.getParticipantBattleRoomAccess = async (req, res) => {
  try {
    const participantId = getUserId(req);
    if (!participantId) return res.status(401).json({ message: "Unauthorized" });
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Battle room not found" });
    }

    const room = await BattleRoom.findOne({
      _id: req.params.id,
      participants: participantId,
    })
      .populate("recruiter", "username nickname")
      .lean();

    if (!room) return res.status(404).json({ message: "Battle room not found" });

    const alreadyCounted = Array.isArray(room.visitorAccessedBy)
      && room.visitorAccessedBy.some((id) => String(id) === String(participantId));

    if (!alreadyCounted) {
      await BattleRoom.updateOne(
        { _id: room._id },
        {
          $addToSet: { visitorAccessedBy: participantId },
          $inc: { visitorAccessCount: 1 },
        }
      );
    }

    const refreshed = alreadyCounted
      ? room
      : await BattleRoom.findById(room._id)
        .populate("recruiter", "username nickname")
        .lean();

    const submission = await BattleSubmission.findOne({
      battleRoom: refreshed._id,
      participant: participantId,
    }).lean();

    let sharedRanking = [];
    if (refreshed.resultsShared) {
      const submissions = await BattleSubmission.find({ battleRoom: refreshed._id })
        .populate("participant", "username nickname email")
        .lean();

      sharedRanking = submissions
        .filter((sub) => sub?.status === "submitted" || sub?.status === "evaluated" || sub?.finalScore != null)
        .sort((a, b) => {
          // Rule 1: AI/Plagiarism automatically loses (put them at bottom)
          const isAiA = a?.mlDetection?.label === "IA" || a?.mlDetection?.label === "Plagiat";
          const isAiB = b?.mlDetection?.label === "IA" || b?.mlDetection?.label === "Plagiat";

          if (isAiA && !isAiB) return 1;
          if (!isAiA && isAiB) return -1;
          if (isAiA && isAiB) return 0; // Both AI, tie at bottom

          // Rule 2: Compare scores/correctness
          const scoreA = Number(a?.finalScore ?? a?.score ?? 0);
          const scoreB = Number(b?.finalScore ?? b?.score ?? 0);
          if (scoreB !== scoreA) return scoreB - scoreA;

          const corrA = Number(a?.correctnessScore ?? 0);
          const corrB = Number(b?.correctnessScore ?? 0);
          if (corrB !== corrA) return corrB - corrA;

          // Rule 3: Tie-breaker - First to submit wins
          const timeA = a?.submittedAt ? new Date(a.submittedAt).getTime() : Number.POSITIVE_INFINITY;
          const timeB = b?.submittedAt ? new Date(b.submittedAt).getTime() : Number.POSITIVE_INFINITY;
          if (timeA !== timeB) return timeA - timeB;

          const nameA = String(a?.participant?.username || a?.participant?.nickname || "");
          const nameB = String(b?.participant?.username || b?.participant?.nickname || "");
          return nameA.localeCompare(nameB);
        })
        .map((sub, index) => {
          const participant = sub?.participant || {};
          const isAi = sub?.mlDetection?.label === "IA" || sub?.mlDetection?.label === "Plagiat";
          return {
            rank: index + 1,
            participantId: participant?._id ? String(participant._id) : "",
            name: participant?.username || participant?.nickname || participant?.email || "Participant",
            email: participant?.email || "",
            score: isAi ? 0 : Number(sub?.finalScore ?? sub?.score ?? 0),
            correctnessScore: isAi ? 0 : Number(sub?.correctnessScore ?? 0),
            executionTimeMs: sub?.executionTimeMs != null ? Number(sub.executionTimeMs) : null,
            outputSnapshot: String(sub?.outputSnapshot || "").trim(),
            isCurrentUser: String(sub?.participant?._id || sub?.participant || "") === String(participantId),
            isAutoLoss: isAi,
            mlLabel: sub?.mlDetection?.label || "Humain"
          };
        });
    }

    return res.json({
      room: {
        _id: refreshed._id,
        title: refreshed.title,
        status: refreshed.status,
        challenge: refreshed.challenge,
        timeLimitMinutes: refreshed.timeLimitMinutes,
        recruiter: refreshed.recruiter,
        startedAt: refreshed.startedAt,
        endedAt: refreshed.endedAt,
        resultsShared: Boolean(refreshed.resultsShared),
        sharedRanking,
        visitorAccessCount: refreshed.visitorAccessCount || 0,
        mySubmission: submission || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Participant anti-fraud report: emitted when visitor leaves tab/window while battle is live.
exports.reportParticipantFraudEvent = async (req, res) => {
  try {
    const participantId = getUserId(req);
    if (!participantId) return res.status(401).json({ message: "Unauthorized" });
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Battle room not found" });
    }

    const room = await BattleRoom.findOne({ _id: req.params.id, participants: participantId }).lean();
    if (!room) return res.status(404).json({ message: "Battle room not found" });

    const reason = normalizeFraudReason(req.body?.reason);
    const now = new Date();
    const updated = await BattleSubmission.findOneAndUpdate(
      { battleRoom: room._id, participant: participantId },
      {
        $set: {
          fraudDetected: true,
          fraudReason: reason,
          fraudDetectedAt: now,
        },
        $inc: { fraudEventsCount: 1 },
        $setOnInsert: { status: "pending" },
      },
      { new: true, upsert: true }
    ).lean();

    return res.status(200).json({
      message: "Fraud event recorded. Submission is blocked.",
      submission: updated,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Participant runs code without final submission lock.
exports.runParticipantBattleCode = async (req, res) => {
  try {
    const participantId = getUserId(req);
    if (!participantId) return res.status(401).json({ message: "Unauthorized" });
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Battle room not found" });
    }

    const room = await BattleRoom.findOne({ _id: req.params.id, participants: participantId }).lean();
    if (!room) return res.status(404).json({ message: "Battle room not found" });
    if (room.status !== "live" && room.status !== "ended") {
      return res.status(400).json({ message: "Challenge has not started yet" });
    }

    const existingSubmission = await BattleSubmission.findOne({
      battleRoom: room._id,
      participant: participantId,
    }).lean();
    if (existingSubmission?.fraudDetected) {
      return res.status(403).json({
        message: "Execution blocked due to fraud detection.",
        fraudDetected: true,
      });
    }

    const code = String(req.body.code || "");
    const testRun = runChallengeCode(room.challenge?.language, code, room.challenge?.testCases || []);
    const correctness = computeCorrectnessFromRun(testRun);

    await BattleSubmission.findOneAndUpdate(
      { battleRoom: room._id, participant: participantId },
      {
        $set: {
          code,
          status: existingSubmission?.status || "pending",
          executionTimeMs: testRun?.executionTimeMs != null ? Number(testRun.executionTimeMs) : null,
          outputSnapshot: testRun?.outputSnapshot || "",
          correctnessScore: correctness.correctnessScore,
          metrics: {
            passedTests: correctness.passedTests,
            totalTests: correctness.totalTests,
          },
        },
      },
      { upsert: true }
    );

    return res.json({
      message: "Code executed",
      analysis: {
        tests: {
          total: correctness.totalTests,
          passed: correctness.passedTests,
          failed: Math.max(0, correctness.totalTests - correctness.passedTests),
          results: correctness.testResults,
          executionTimeMs: testRun?.executionTimeMs != null ? Number(testRun.executionTimeMs) : null,
          outputSnapshot: testRun?.outputSnapshot || "",
        },
        correctnessScore: correctness.correctnessScore,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Participant submits code from programmer page while battle is live.
exports.submitParticipantBattleCode = async (req, res) => {
  try {
    const participantId = getUserId(req);
    if (!participantId) return res.status(401).json({ message: "Unauthorized" });
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Battle room not found" });
    }

    const room = await BattleRoom.findOne({ _id: req.params.id, participants: participantId }).lean();
    if (!room) return res.status(404).json({ message: "Battle room not found" });
    if (room.status !== "live") {
      return res.status(400).json({ message: "Challenge has not started yet or is already ended" });
    }

    const existingSubmission = await BattleSubmission.findOne({
      battleRoom: room._id,
      participant: participantId,
    }).lean();
    if (existingSubmission?.fraudDetected) {
      return res.status(403).json({
        message: "Submission blocked due to fraud detection.",
        fraudDetected: true,
      });
    }
    if (["submitted", "evaluated"].includes(String(existingSubmission?.status || ""))) {
      return res.status(403).json({
        message: "You already submitted your final answer. Editing and re-submission are disabled.",
        finalSubmitted: true,
      });
    }

    const code = String(req.body.code || "");
    const { testRun, correctness, mlDetection, analysis, isAiAutoLoss } = await performSubmissionAnalysis(room, participantId, code);

    const finalScore = computeFinalScore({
      qualityScore: analysis.qualityScore,
      correctnessScore: correctness.correctnessScore,
    });
    const offTopic = correctness.correctnessScore != null && correctness.correctnessScore < 50;

    const updated = await updateBattleSubmission(room._id, participantId, {
      code,
      testRun,
      correctness,
      mlDetection,
      analysis,
      finalScore,
      isAiAutoLoss,
      offTopic
    });

    let xpResult = null;
    if (!isAiAutoLoss) {
      const gamificationService = require("../services/gamificationService");
      try {
        xpResult = await gamificationService.addXP(participantId, 150, "arena");
      } catch (err) {
        console.error("XP Award Error:", err);
      }
    }

    res.json({
      message: isAiAutoLoss ? "Code submitted (AI/Plagiarism detected - Auto-loss)" : "Code submitted",
      submission: updated,
      xp: xpResult,
      analysis: {
        ...analysis,
        isAutoLoss: isAiAutoLoss,
        tests: {
          total: correctness.totalTests,
          passed: isAiAutoLoss ? 0 : correctness.passedTests,
          results: isAiAutoLoss ? [] : correctness.testResults,
          executionTimeMs: testRun?.executionTimeMs != null ? Number(testRun.executionTimeMs) : null,
          outputSnapshot: testRun?.outputSnapshot || "",
        },
        correctnessScore: isAiAutoLoss ? 0 : correctness.correctnessScore,
        finalScore: isAiAutoLoss ? 0 : finalScore,
        offTopic: isAiAutoLoss ? true : offTopic,
      },
    });

    await checkAndEndBattleRoom(room);
  } catch (error) {
    console.error("Submission error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

async function performSubmissionAnalysis(room, participantId, code) {
  const testRun = runChallengeCode(room.challenge?.language, code, room.challenge?.testCases || []);
  const correctness = computeCorrectnessFromRun(testRun);
  const combinedAnalysis = await complexityService.analyzeCodeWithBothModels(code);
  const mlDetection = combinedAnalysis.mlDetection;

  const [sonar, aiFeedback] = await Promise.all([
    fetchSonarStub(code, room.challenge?.language, {
      participantId: participantId.toString(),
      roomId: room._id.toString(),
      projectName: room.title,
    }),
    fetchAiFeedback(code, room.challenge?.title),
  ]);

  const analysis = {
    sonar,
    aiFeedback,
    qualityScore: sonar.qualityScore,
    qualityGrade: getQualityGrade(sonar.qualityScore),
    qualityIssues: sonar.issues || [],
    securityAlerts: sonar.issues?.filter((i) => i.severity === "CRITICAL" || i.severity === "MAJOR") || [],
  };

  const isAiAutoLoss = mlDetection && (mlDetection.label === "IA" || mlDetection.label === "Plagiat");
  return { testRun, correctness, mlDetection, analysis, isAiAutoLoss };
}

async function updateBattleSubmission(roomId, participantId, data) {
  const { code, testRun, correctness, mlDetection, analysis, finalScore, isAiAutoLoss, offTopic } = data;
  return await BattleSubmission.findOneAndUpdate(
    { battleRoom: roomId, participant: participantId },
    {
      $set: {
        code,
        status: "submitted",
        submittedAt: new Date(),
        score: isAiAutoLoss ? 0 : (finalScore || 0),
        executionTimeMs: testRun?.executionTimeMs || null,
        outputSnapshot: testRun?.outputSnapshot || "",
        sonarSummary: analysis.sonar?.summary || "",
        sonarSource: analysis.sonar?.source || "",
        sonarProjectKey: analysis.sonar?.projectKey || "",
        qualityGateStatus: analysis.sonar?.qualityGateStatus || "",
        sonarMetrics: {
          bugs: analysis.sonar?.metrics?.bugs || null,
          vulnerabilities: analysis.sonar?.metrics?.vulnerabilities || null,
          codeSmells: analysis.sonar?.metrics?.code_smells || null,
          securityRating: analysis.sonar?.metrics?.security_rating || "",
          reliabilityRating: analysis.sonar?.metrics?.reliability_rating || "",
          maintainabilityRating: analysis.sonar?.metrics?.sqale_rating || "",
          securityHotspotsReviewed: analysis.sonar?.metrics?.security_hotspots_reviewed || null,
          count_milestones_met: 0,
          duplications: analysis.sonar?.metrics?.duplicated_lines_density || null,
        },
        aiFeedback: analysis.aiFeedback?.summary || analysis.aiFeedback?.message || "",
        qualityScore: isAiAutoLoss ? 0 : analysis.qualityScore,
        qualityGrade: isAiAutoLoss ? "F" : analysis.qualityGrade,
        correctnessScore: isAiAutoLoss ? 0 : correctness.correctnessScore,
        finalScore: isAiAutoLoss ? 0 : finalScore,
        mlDetection,
        offTopic: isAiAutoLoss ? true : offTopic,
        qualityIssues: analysis.qualityIssues,
        securityAlerts: analysis.securityAlerts,
        metrics: {
          passedTests: isAiAutoLoss ? 0 : correctness.passedTests,
          totalTests: correctness.totalTests,
        },
      },
    },
    { new: true, upsert: true }
  ).lean();
}

async function checkAndEndBattleRoom(room) {
  const participantCount = room.participants.length;
  const submissionCount = await BattleSubmission.countDocuments({
    battleRoom: room._id,
    status: "submitted"
  });

  if (submissionCount >= participantCount) {
    const roomToUpdate = await BattleRoom.findById(room._id);
    if (roomToUpdate && roomToUpdate.status === "live") {
      roomToUpdate.status = "ended";
      roomToUpdate.endedAt = new Date();
      roomToUpdate.resultsShared = true;
      roomToUpdate.resultsSharedAt = new Date();
      await internalResolveBattleRoom(roomToUpdate);
    }
  }
}
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

    const { recruiterComment, recruiterRating, recruiterConfirmed } = req.body;
    if (recruiterComment !== undefined) sub.recruiterComment = recruiterComment;
    if (recruiterRating !== undefined) sub.recruiterRating = Math.min(5, Math.max(0, Number(recruiterRating)));
    if (recruiterConfirmed !== undefined) {
      sub.recruiterConfirmed = Boolean(recruiterConfirmed);
      sub.confirmedAt = recruiterConfirmed ? new Date() : null;
    }
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

/**
 * Helper to resolve the winner of a battle room using AI Judge and Complexity analysis.
 */
async function internalResolveBattleRoom(room) {
  try {
    const submissions = await BattleSubmission.find({ battleRoom: room._id, status: "submitted" }).populate("participant", "username");
    if (submissions.length >= 2) {
      const sorted = submissions.sort((a, b) => {
        const scoreA = Number(a.finalScore || 0);
        const scoreB = Number(b.finalScore || 0);
        if (scoreB !== scoreA) return scoreB - scoreA;

        const correctA = Number(a.correctnessScore || 0);
        const correctB = Number(b.correctnessScore || 0);
        if (correctB !== correctA) return correctB - correctA;

        const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : new Date(a.createdAt).getTime();
        const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : new Date(b.createdAt).getTime();
        return timeA - timeB;
      });

      const top1 = sorted[0];
      const top2 = sorted[1];

      if (Number(top1.finalScore || 0) === Number(top2.finalScore || 0)) {
        console.log(`[BattleRoom] Resolving tie: ${top1.participant.username} vs ${top2.participant.username}`);
        
        const [analysis1, analysis2] = await Promise.all([
          complexityService.predictComplexity(top1.code),
          complexityService.predictComplexity(top2.code)
        ]);

        const judgeResult = await aiJudgeService.judgeMatch(
          { 
            code: top1.code, 
            username: top1.participant.username, 
            language: room.challenge.language || "javascript",
            complexity: analysis1.complexity 
          },
          { 
            code: top2.code, 
            username: top2.participant.username, 
            language: room.challenge.language || "javascript",
            complexity: analysis2.complexity 
          },
          room.challenge.description || ""
        );

        if (judgeResult.winnerIndex === 0) room.aiWinner = top1.participant._id;
        else if (judgeResult.winnerIndex === 1) room.aiWinner = top2.participant._id;

        room.aiJustification = judgeResult.justification || "";
      }
    }
    await room.save();
  } catch (err) {
    console.error("[BattleRoom] Resolution Error:", err);
  }
}
