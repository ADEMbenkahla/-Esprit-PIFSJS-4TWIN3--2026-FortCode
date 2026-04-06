const ProgrammingRoom = require("../models/ProgrammingRoom");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const { generateScoreSuggestion } = require("../services/aiScoreAgent");
const { getIO } = require("../socket");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { execFile, exec } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const SONARQUBE_URL = process.env.SONARQUBE_URL || "";
const SONARQUBE_TOKEN = process.env.SONARQUBE_TOKEN || "";
const SONARQUBE_ORGANIZATION = String(process.env.SONARQUBE_ORGANIZATION || "").trim();
const SONAR_SCANNER_BIN = process.env.SONAR_SCANNER_BIN || "sonar-scanner";

const getScannerBin = () => String(SONAR_SCANNER_BIN || "sonar-scanner")
  .trim()
  .replace(/^['"]+|['"]+$/g, "");

const runScannerCommand = async (cwd) => {
  const scannerBin = getScannerBin();
  const execOptions = {
    cwd,
    timeout: 180000,
    maxBuffer: 4 * 1024 * 1024
  };

  if (process.platform === "win32") {
    return execAsync(`"${scannerBin}"`, {
      ...execOptions,
      windowsHide: true
    });
  }

  return execFileAsync(scannerBin, [], execOptions);
};

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const parseEmailList = (rawEmails) => {
  if (!rawEmails) return [];
  const asArray = Array.isArray(rawEmails)
    ? rawEmails
    : String(rawEmails).split(/[\n,;\s]+/);
  return [...new Set(asArray.map(normalizeEmail).filter(Boolean))];
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim().toLowerCase());

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseBoolean = (value, fallback = true) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
};

const normalizeGradingRubric = (rawRubric) => {
  if (!rawRubric) return { totalPoints: 100, criteria: [] };

  const parsed = typeof rawRubric === "string"
    ? (() => {
        try { return JSON.parse(rawRubric); } catch { return null; }
      })()
    : rawRubric;

  if (!parsed || typeof parsed !== "object") return { totalPoints: 100, criteria: [] };

  const rawTotal = Number(parsed.totalPoints);
  const totalPoints = Number.isFinite(rawTotal) && rawTotal > 0 ? Math.min(1000, Math.max(1, rawTotal)) : 100;
  const criteria = Array.isArray(parsed.criteria)
    ? parsed.criteria
      .map((item) => ({
        label: String(item?.label || "").trim(),
        points: Number.isFinite(Number(item?.points)) ? Math.min(1000, Math.max(0, Number(item.points))) : 0,
        description: String(item?.description || "").trim()
      }))
      .filter((item) => item.label)
    : [];

  return { totalPoints, criteria };
};

const parseMetricNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeConfidence = (value) => {
  if (value >= 0.75) return "high";
  if (value >= 0.4) return "medium";
  return "low";
};

const normalizeLanguageLabel = (value) => String(value || "").trim().toLowerCase();

const detectLanguageFromCode = (codeSnapshot) => {
  const code = String(codeSnapshot || "");
  if (!code.trim()) return "unknown";

  const signatures = {
    java: [
      /\bpublic\s+class\b/i,
      /\bSystem\.out\.println\s*\(/,
      /\bimport\s+java\./i,
      /\bpublic\s+static\s+void\s+main\s*\(/i
    ],
    cpp: [/#include\s*<iostream>/i, /\bstd::/, /\bcout\s*<</, /\bcin\s*>>/],
    python: [/^\s*def\s+[a-zA-Z_][\w]*\s*\(/m, /^\s*import\s+[a-zA-Z_][\w.]*/m, /\bprint\s*\(/, /:\s*(#.*)?$/m],
    csharp: [/\busing\s+System\b/, /\bnamespace\s+[A-Za-z_][\w.]*/, /\bConsole\.Write(Line)?\s*\(/, /\bstatic\s+void\s+Main\s*\(/i],
    go: [/^\s*package\s+main\b/m, /\bfunc\s+main\s*\(/, /\bfmt\.Print(ln|f)?\s*\(/],
    rust: [/\bfn\s+main\s*\(/, /\blet\s+mut\s+/, /println!\s*\(/],
    typescript: [/\binterface\s+[A-Za-z_][\w]*/, /\btype\s+[A-Za-z_][\w]*\s*=\s*/, /:\s*(string|number|boolean|unknown|any|void)\b/, /\bimport\s+type\b/],
    javascript: [/\bconsole\.log\s*\(/, /\bfunction\s+[A-Za-z_$][\w$]*\s*\(/, /\bconst\s+[A-Za-z_$][\w$]*\s*=\s*/, /\b(module\.exports|exports\.)/]
  };

  let bestLanguage = "unknown";
  let bestScore = 0;

  Object.entries(signatures).forEach(([language, patterns]) => {
    const matched = patterns.reduce((count, regex) => (regex.test(code) ? count + 1 : count), 0);
    if (matched > bestScore) {
      bestLanguage = language;
      bestScore = matched;
    }
  });

  return bestScore === 0 ? "unknown" : bestLanguage;
};

const truncateText = (value, max = 4000) => String(value || "").slice(0, max);

const getMonitoringStats = (room) => {
  const logs = Array.isArray(room?.executionLogs) ? room.executionLogs : [];
  const submissions = Array.isArray(room?.resultSubmissions) ? room.resultSubmissions : [];
  return {
    runs: logs.filter((item) => item.action === "run").length,
    errors: logs.filter((item) => item.status === "error").length,
    suspicious: logs.filter((item) => item.suspicious).length,
    pendingResults: submissions.filter((item) => !item.confirmedByRecruiter).length,
    confirmedResults: submissions.filter((item) => item.confirmedByRecruiter).length
  };
};

const emitMonitoringUpdate = (roomId, payload) => {
  try {
    const io = getIO();
    io.to(`battle-room:${roomId}`).emit("battleRoom:monitoring", payload);
  } catch (socketError) {
    console.warn("Socket monitoring emit skipped:", socketError.message);
  }
};

const escapeHtml = (value) => String(value || "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const generateInviteCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 8; index += 1) {
    code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return code;
};

const buildInvitationEmailHtml = ({ username, roomName, challengeTitle, inviteCode, roomId, participantEmail, timeLimit }) => {
  const invitationUrl = `${FRONTEND_URL}/room-invitation?roomId=${encodeURIComponent(roomId)}&email=${encodeURIComponent(participantEmail)}`;
  return `
    <div style="margin:0;padding:0;background:#020617;font-family:Arial,sans-serif;color:#f8fafc;">
      <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
        <div style="background:#0f172a;border:1px solid rgba(59,130,246,0.18);border-radius:20px;padding:32px;">
          <h1 style="margin:0 0 12px;font-size:28px;color:#ffffff;">FortCode Programming Room Invitation</h1>
          <p style="color:#cbd5e1;font-size:16px;line-height:1.6;">Hello <strong>${escapeHtml(username)}</strong>, you were invited to join the programming room <strong>${escapeHtml(roomName)}</strong>.</p>
          <div style="margin:24px 0;padding:16px;border-radius:14px;background:rgba(30,41,59,0.8);border:1px solid rgba(59,130,246,0.18);">
            <p style="margin:0 0 8px;color:#cbd5e1;"><strong>Challenge:</strong> ${escapeHtml(challengeTitle || roomName)}</p>
            <p style="margin:0 0 8px;color:#cbd5e1;"><strong>Time limit:</strong> ${escapeHtml(timeLimit)} minutes</p>
            <p style="margin:0;color:#cbd5e1;"><strong>Invitation code:</strong> <span style="color:#fbbf24;letter-spacing:2px;">${escapeHtml(inviteCode)}</span></p>
          </div>
          <div style="text-align:center;margin:28px 0;">
            <a href="${invitationUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 26px;border-radius:12px;font-weight:700;">Open invitation</a>
          </div>
          <p style="font-size:13px;color:#94a3b8;line-height:1.6;">If the button does not work, open this link manually:<br>${escapeHtml(invitationUrl)}</p>
        </div>
      </div>
    </div>
  `;
};

const createRoomInvitations = async ({ room, inviterName, invitedEmails }) => {
  const emails = parseEmailList(invitedEmails).filter(isValidEmail);
  if (!emails.length) {
    return [];
  }

  const invitations = emails.map((email) => ({
    email,
    inviteCode: generateInviteCode(),
    status: "pending",
    sentAt: new Date()
  }));

  room.invitations = [...(room.invitations || []), ...invitations];
  await room.save();

  const emailJobs = invitations.map(async (invitation) => {
    try {
      await sendEmail({
        email: invitation.email,
        subject: `FortCode invitation: ${room.name}`,
        message: `You have been invited to join ${room.name}`,
        html: buildInvitationEmailHtml({
          username: inviterName,
          roomName: room.name,
          challengeTitle: room.challengeTitle || room.name,
          inviteCode: invitation.inviteCode,
          roomId: room._id,
          participantEmail: invitation.email,
          timeLimit: room.timeLimit || room.duration || 60
        })
      });

      const savedInvitation = (room.invitations || []).find((item) =>
        normalizeEmail(item.email) === normalizeEmail(invitation.email) &&
        String(item.inviteCode || "").trim().toUpperCase() === String(invitation.inviteCode || "").trim().toUpperCase()
      );
      if (savedInvitation) {
        savedInvitation.status = "sent";
      }
    } catch (error) {
      console.error(`Invitation email failed for ${invitation.email}:`, error.message);
    }
  });

  await Promise.all(emailJobs);
  room.markModified("invitations");
  await room.save();
  return invitations;
};

const findInvitationForEmail = (room, email, inviteCode) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedCode = String(inviteCode || "").trim().toUpperCase();
  return (room?.invitations || []).find((invitation) => {
    const invitationEmail = normalizeEmail(invitation.email);
    const invitationCode = String(invitation.inviteCode || "").trim().toUpperCase();
    return invitationEmail === normalizedEmail && (!normalizedCode || invitationCode === normalizedCode);
  }) || null;
};

const buildInvitationPayload = (room, invitation) => ({
  roomId: room._id,
  roomName: room.name,
  roomStatus: room.status,
  challengeTitle: room.challengeTitle || room.name,
  challengeDescription: room.challengeDescription || room.description || "",
  timeLimit: room.timeLimit || room.duration || 60,
  language: room.language,
  difficulty: room.difficulty,
  inviteCode: invitation.inviteCode,
  status: invitation.status,
  exerciseFile: room.exerciseFile || null
});

// =============================
// 🏗️ CREATE PROGRAMMING ROOM (Recruiter)
// =============================
exports.createRoom = async (req, res) => {
  try {
    const {
      name,
      description,
      language,
      difficulty,
      maxParticipants,
      duration,
      timeLimit,
      challengeTitle,
      challengeDescription,
      gradingRubric,
      invitedEmails,
      scheduledAt
    } = req.body;

    const creatorId = req.user.id;
    const uploadedExercise = req.file;
    const user = await User.findById(creatorId);
    if (!user || (user.role !== "recruiter" && user.role !== "admin")) {
      return res.status(403).json({
        message: "Only recruiters can create programming rooms"
      });
    }

    const room = await ProgrammingRoom.create({
      name,
      description,
      creatorId,
      language: language || "javascript",
      difficulty: difficulty || "intermediate",
      maxParticipants: maxParticipants || 10,
      duration: duration || 60,
      timeLimit: Number.isFinite(Number(timeLimit)) ? Number(timeLimit) : (duration || 60),
      challengeTitle: challengeTitle || "",
      challengeDescription: challengeDescription || "",
      gradingRubric: normalizeGradingRubric(gradingRubric),
      exerciseFile: uploadedExercise
        ? {
            url: `/uploads/exercises/${uploadedExercise.filename}`,
            originalName: uploadedExercise.originalname,
            mimeType: uploadedExercise.mimetype,
            uploadedAt: new Date()
          }
        : undefined,
      // Business rule: recruiter rooms are invitation-based and always private.
      isPublic: false,
      scheduledAt: scheduledAt || null
    });

    const inviterName = user.username || user.email || "FortCode recruiter";
    const invitations = await createRoomInvitations({
      room,
      inviterName,
      invitedEmails
    });

    await room.populate("creatorId", "username email avatar");

    res.status(201).json({
      message: "Programming room created successfully",
      room,
      invitations
    });
  } catch (error) {
    console.error("Create Room Error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// =============================
// 📋 GET ALL ROOMS
// =============================
exports.getAllRooms = async (req, res) => {
  try {
    const { status, language, difficulty, isPublic } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (language) filter.language = language;
    if (difficulty) filter.difficulty = difficulty;
    if (isPublic !== undefined) filter.isPublic = isPublic === 'true';

    const rooms = await ProgrammingRoom.find(filter)
      .populate("creatorId", "username email avatar")
      .populate("currentParticipants.userId", "username avatar")
      .sort({ createdAt: -1 });

    res.json({ rooms });

  } catch (error) {
    console.error("Get All Rooms Error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// =============================
// 🔍 GET ROOM BY ID
// =============================
exports.getRoomById = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await ProgrammingRoom.findById(roomId)
      .populate("creatorId", "username email avatar")
      .populate("currentParticipants.userId", "username avatar");

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json({ room });

  } catch (error) {
    console.error("Get Room Error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

exports.lookupRoomInvitation = async (req, res) => {
  try {
    const { roomId, email } = req.query;
    if (!roomId || !email) {
      return res.status(400).json({ message: "roomId and email are required" });
    }

    const room = await ProgrammingRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    const invitation = findInvitationForEmail(room, email);
    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    if (!invitation.openedAt) {
      invitation.openedAt = new Date();
      invitation.status = invitation.status === "pending" ? "opened" : invitation.status;
      await room.save();
    }

    return res.json({ invitation: buildInvitationPayload(room, invitation) });
  } catch (error) {
    console.error("Lookup Room Invitation Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.checkInvitationAccess = async (req, res) => {
  try {
    const { roomId, email, inviteCode } = req.body || {};
    if (!roomId || !email || !inviteCode) {
      return res.status(400).json({ message: "roomId, email and inviteCode are required" });
    }

    const room = await ProgrammingRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    const invitation = findInvitationForEmail(room, email, inviteCode);
    if (!invitation) {
      return res.status(404).json({ message: "Invalid invitation code" });
    }

    if (String(invitation.inviteCode || "").trim().toUpperCase() !== String(inviteCode).trim().toUpperCase()) {
      return res.status(403).json({ message: "Invalid invitation code" });
    }

    if (room.status === "completed" || room.status === "cancelled") {
      return res.json({ access: { status: room.status, invitation: buildInvitationPayload(room, invitation) } });
    }

    if (room.status === "waiting") {
      invitation.status = invitation.status === "pending" ? "opened" : invitation.status;
      await room.save();
      return res.json({ access: { status: "waiting", invitation: buildInvitationPayload(room, invitation) } });
    }

    invitation.status = "accepted";
    invitation.acceptedAt = new Date();
    await room.save();

    return res.json({ access: { status: "active", invitation: buildInvitationPayload(room, invitation) } });
  } catch (error) {
    console.error("Check Invitation Access Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getProgrammerRoom = async (req, res) => {
  try {
    const { roomId, email, inviteCode } = req.query;
    if (!roomId || !email || !inviteCode) {
      return res.status(400).json({ message: "roomId, email and inviteCode are required" });
    }

    const room = await ProgrammingRoom.findById(roomId)
      .populate("creatorId", "username avatar")
      .populate("currentParticipants.userId", "username avatar");

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const invitation = findInvitationForEmail(room, email, inviteCode);
    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    if (String(invitation.inviteCode || "").trim().toUpperCase() !== String(inviteCode).trim().toUpperCase()) {
      return res.status(403).json({ message: "Invalid invitation code" });
    }

    if (room.status !== "active" && room.status !== "waiting") {
      return res.status(409).json({ message: "Room is not available", roomStatus: room.status });
    }

    invitation.status = room.status === "active" ? "accepted" : (invitation.status === "pending" ? "opened" : invitation.status);
    if (room.status === "active" && !invitation.acceptedAt) {
      invitation.acceptedAt = new Date();
    }
    await room.save();

    return res.json({ room, invitation: buildInvitationPayload(room, invitation) });
  } catch (error) {
    console.error("Get Programmer Room Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// =============================
// 🚪 JOIN ROOM
// =============================
exports.joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const room = await ProgrammingRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const isCreator = String(room.creatorId) === String(userId);
    if (!room.isPublic && !isCreator && userRole !== "admin") {
      return res.status(403).json({
        message: "This room is private. Use invitation access instead."
      });
    }

    // Vérifier si la salle est complète
    if (room.currentParticipants.length >= room.maxParticipants) {
      return res.status(400).json({ message: "Room is full" });
    }

    // Vérifier si l'utilisateur est déjà dans la salle
    const alreadyJoined = room.currentParticipants.some(
      p => p.userId.toString() === userId.toString()
    );

    if (alreadyJoined) {
      return res.status(400).json({ message: "You already joined this room" });
    }

    // Ajouter l'utilisateur
    room.currentParticipants.push({ userId });
    await room.save();

    await room.populate("creatorId", "username email avatar");
    await room.populate("currentParticipants.userId", "username avatar");

    res.json({
      message: "Joined room successfully",
      room
    });

  } catch (error) {
    console.error("Join Room Error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// =============================
// 🚶 LEAVE ROOM
// =============================
exports.leaveRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await ProgrammingRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Retirer l'utilisateur
    room.currentParticipants = room.currentParticipants.filter(
      p => p.userId.toString() !== userId.toString()
    );
    await room.save();

    res.json({ message: "Left room successfully" });

  } catch (error) {
    console.error("Leave Room Error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

exports.logInvitationMonitoringEvent = async (req, res) => {
  try {
    const {
      roomId,
      email,
      inviteCode,
      action = "run",
      status = "success",
      runtimeMs = 0,
      errorMessage = "",
      codeSnippet = "",
      outputSnippet = ""
    } = req.body || {};

    if (!roomId || !email || !inviteCode) {
      return res.status(400).json({ message: "roomId, email and inviteCode are required" });
    }

    const room = await ProgrammingRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const invitation = findInvitationForEmail(room, email, inviteCode);
    if (!invitation) {
      return res.status(404).json({ message: "Invalid invitation code" });
    }

    const safeRuntimeMs = Number.isFinite(Number(runtimeMs)) ? Math.max(0, Number(runtimeMs)) : 0;
    const suspicious = status === "error" || safeRuntimeMs > Math.max(3000, (room.timeLimit || room.duration || 60) * 1000);

    room.executionLogs.push({
      email: normalizeEmail(email),
      action: action === "submit" ? "submit" : "run",
      status: status === "error" ? "error" : "success",
      runtimeMs: safeRuntimeMs,
      errorMessage: truncateText(errorMessage, 1000),
      suspicious,
      suspicionReason: suspicious ? (status === "error" ? "Execution error" : "Runtime exceeded threshold") : "",
      codeSnippet: truncateText(codeSnippet, 5000),
      outputSnippet: truncateText(outputSnippet, 3000)
    });

    await room.save();

    emitMonitoringUpdate(room._id, {
      type: "visitor_event",
      roomId: room._id,
      email: normalizeEmail(email),
      action,
      status,
      runtimeMs: safeRuntimeMs,
      suspicious,
      stats: getMonitoringStats(room)
    });

    return res.json({ message: "Event logged" });
  } catch (error) {
    console.error("Log Invitation Monitoring Event Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.submitInvitationResult = async (req, res) => {
  try {
    const { roomId, email, inviteCode, codeSnapshot = "", outputSnapshot = "" } = req.body || {};
    if (!roomId || !email || !inviteCode) {
      return res.status(400).json({ message: "roomId, email and inviteCode are required" });
    }

    const room = await ProgrammingRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const invitation = findInvitationForEmail(room, email, inviteCode);
    if (!invitation) {
      return res.status(404).json({ message: "Invalid invitation code" });
    }

    const safeCodeSnapshot = truncateText(codeSnapshot, 10000);
    const safeOutputSnapshot = truncateText(outputSnapshot, 5000);

    room.resultSubmissions.push({
      email: normalizeEmail(email),
      codeSnapshot: safeCodeSnapshot,
      outputSnapshot: safeOutputSnapshot,
      submittedAt: new Date(),
      confirmedByRecruiter: false,
      sonarQube: {
        projectKey: "",
        qualityGateStatus: "PENDING",
        scanStatus: "queued",
        metrics: {},
        issuesCount: 0,
        errorMessage: ""
      }
    });

    invitation.status = "accepted";
    invitation.acceptedAt = new Date();
    await room.save();

    emitMonitoringUpdate(room._id, {
      type: "visitor_result_submission",
      roomId: room._id,
      email: normalizeEmail(email),
      stats: getMonitoringStats(room)
    });

    return res.json({ message: "Result submitted for recruiter review" });
  } catch (error) {
    console.error("Submit Invitation Result Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// =============================
// ▶️ START ROOM (Recruiter/Creator)
// =============================
exports.startRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await ProgrammingRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Seul le créateur peut démarrer la salle
    if (room.creatorId.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "Only the room creator can start the room"
      });
    }

    if (room.status !== "waiting") {
      return res.status(400).json({
        message: "Room is not in waiting status"
      });
    }

    room.status = "active";
    room.startedAt = new Date();
    await room.save();

    await room.populate("creatorId", "username email avatar");
    await room.populate("currentParticipants.userId", "username avatar");

    emitMonitoringUpdate(room._id, {
      type: "battle_started",
      roomId: room._id,
      startedAt: room.startedAt,
      status: room.status,
      stats: getMonitoringStats(room)
    });

    res.json({
      message: "Room started successfully",
      room
    });

  } catch (error) {
    console.error("Start Room Error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// =============================
// ✅ COMPLETE ROOM (Recruiter/Creator)
// =============================
exports.completeRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await ProgrammingRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Seul le créateur peut compléter la salle
    if (room.creatorId.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "Only the room creator can complete the room"
      });
    }

    room.status = "completed";
    room.completedAt = new Date();
    await room.save();

    emitMonitoringUpdate(room._id, {
      type: "battle_completed",
      roomId: room._id,
      completedAt: room.completedAt,
      status: room.status,
      stats: getMonitoringStats(room)
    });

    res.json({
      message: "Room completed successfully",
      room
    });

  } catch (error) {
    console.error("Complete Room Error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// =============================
// 🗑️ DELETE ROOM (Recruiter/Creator or Admin)
// =============================
exports.deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const room = await ProgrammingRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Seul le créateur ou un admin peut supprimer
    if (room.creatorId.toString() !== userId.toString() && userRole !== "admin") {
      return res.status(403).json({
        message: "You don't have permission to delete this room"
      });
    }

    // On ne peut supprimer que les salles en attente ou terminées
    if (room.status === "active") {
      return res.status(400).json({
        message: "Cannot delete an active room"
      });
    }

    await ProgrammingRoom.findByIdAndDelete(roomId);

    res.json({ message: "Room deleted successfully" });

  } catch (error) {
    console.error("Delete Room Error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

exports.updateRoomRubric = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { gradingRubric } = req.body || {};

    const room = await ProgrammingRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.creatorId.toString() !== userId.toString() && userRole !== "admin") {
      return res.status(403).json({ message: "Only room creator can update rubric" });
    }

    room.gradingRubric = normalizeGradingRubric(gradingRubric);
    await room.save();

    emitMonitoringUpdate(room._id, {
      type: "rubric_updated",
      roomId: room._id,
      gradingRubric: room.gradingRubric
    });

    return res.json({
      message: "Room grading rubric updated",
      gradingRubric: room.gradingRubric
    });
  } catch (error) {
    console.error("Update Room Rubric Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.suggestBattleResultScore = async (req, res) => {
  try {
    const { roomId, resultId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const room = await ProgrammingRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const isCreator = room.creatorId.toString() === userId.toString();
    if (!isCreator && userRole !== "admin") {
      return res.status(403).json({ message: "Only room creator can request score suggestions" });
    }

    const submission = room.resultSubmissions.id(resultId);
    if (!submission) {
      return res.status(404).json({ message: "Result submission not found" });
    }

    const suggestion = await generateScoreSuggestion({
      submission,
      totalPoints: room?.gradingRubric?.totalPoints || 100,
      expectedLanguage: room?.language || ""
    });

    return res.json({
      message: "Score suggestion generated",
      suggestion
    });
  } catch (error) {
    console.error("Suggest Score Error:", error);
    const reason = String(error.message || "");
    const isQuota = reason.includes("429") || reason.toLowerCase().includes("quota");
    const isKey = reason.includes("OPENAI_API_KEY");

    const message = isKey
      ? "OPENAI_API_KEY is missing"
      : isQuota
        ? "OpenAI quota/rate limit reached"
        : "AI score generation is unavailable";

    return res.status(500).json({ message, error: error.message });
  }
};

exports.submitBattleResult = async (req, res) => {
  try {
    const { roomId, codeSnapshot = "", outputSnapshot = "", projectKey = "" } = req.body || {};
    const userId = req.user.id;
    const userEmail = normalizeEmail(req.user.email || req.body?.email || "");

    if (!roomId) {
      return res.status(400).json({ message: "roomId is required" });
    }

    const room = await ProgrammingRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.status !== "active" && room.status !== "waiting") {
      return res.status(409).json({ message: "Room is not accepting submissions" });
    }

    const safeCodeSnapshot = truncateText(codeSnapshot, 10000);
    const safeOutputSnapshot = truncateText(outputSnapshot, 5000);

    room.resultSubmissions.push({
      email: userEmail || String(userId),
      codeSnapshot: safeCodeSnapshot,
      outputSnapshot: safeOutputSnapshot,
      sonarQube: {
        projectKey: String(projectKey || "").trim(),
        qualityGateStatus: "PENDING",
        metrics: {},
        issuesCount: 0,
        scanStatus: "queued",
        errorMessage: ""
      }
    });

    await room.save();

    emitMonitoringUpdate(room._id, {
      type: "result_submission",
      roomId: room._id,
      submission: room.resultSubmissions[room.resultSubmissions.length - 1],
      stats: getMonitoringStats(room)
    });

    return res.json({ message: "Result submitted for recruiter confirmation" });
  } catch (error) {
    console.error("Submit Battle Result Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getRoomMonitoring = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const room = await ProgrammingRoom.findById(roomId)
      .populate("creatorId", "username email")
      .populate("resultSubmissions.confirmedBy", "username email");

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const isCreator = room.creatorId?._id?.toString() === userId.toString();
    if (!isCreator && userRole !== "admin") {
      return res.status(403).json({ message: "Only room creator can monitor this battle" });
    }

    const executionLogs = (room.executionLogs || []).slice(-120).reverse();
    const resultSubmissions = (room.resultSubmissions || []).slice(-80).reverse();
    const alerts = executionLogs.filter((entry) => entry.suspicious || entry.status === "error");

    return res.json({
      monitoring: {
        roomId: room._id,
        roomStatus: room.status,
        gradingRubric: room.gradingRubric || { totalPoints: 100, criteria: [] },
        stats: getMonitoringStats(room),
        alerts,
        executionLogs,
        resultSubmissions
      }
    });
  } catch (error) {
    console.error("Get Room Monitoring Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.syncSubmissionSonarQube = async (req, res) => {
  try {
    const { roomId, resultId } = req.params;
    const { projectKey } = req.body || {};
    const userId = req.user.id;
    const userRole = req.user.role;

    const room = await ProgrammingRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const isCreator = room.creatorId.toString() === userId.toString();
    if (!isCreator && userRole !== "admin") {
      return res.status(403).json({ message: "Only room creator can sync SonarQube quality" });
    }

    const submission = room.resultSubmissions.id(resultId);
    if (!submission) {
      return res.status(404).json({ message: "Result submission not found" });
    }

    const finalProjectKey = String(projectKey || submission?.sonarQube?.projectKey || "").trim();
    if (!finalProjectKey) {
      return res.status(400).json({ message: "SonarQube project key is required" });
    }

    const baseUrl = String(SONARQUBE_URL || "").trim().replace(/\/+$/, "");
    if (!baseUrl || !SONARQUBE_TOKEN) {
      return res.status(503).json({ message: "SONARQUBE_URL and SONARQUBE_TOKEN must be configured" });
    }

    const fetchJson = async (apiPath, queryParams = {}) => {
      const url = new URL(`${baseUrl}${apiPath}`);
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
      });

      const auth = Buffer.from(`${SONARQUBE_TOKEN}:`).toString("base64");
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: { Authorization: `Basic ${auth}`, Accept: "application/json" }
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`SonarQube request failed (${response.status}): ${text}`);
      }

      return response.json();
    };

    const measuresResponse = await fetchJson("/api/measures/component", {
      component: finalProjectKey,
      metricKeys: ["bugs", "vulnerabilities", "code_smells", "coverage", "duplicated_lines_density", "ncloc"].join(",")
    });
    const qualityGateResponse = await fetchJson("/api/qualitygates/project_status", { projectKey: finalProjectKey });
    const issuesResponse = await fetchJson("/api/issues/search", { componentKeys: finalProjectKey, ps: 1, p: 1 });

    const measures = (measuresResponse?.component?.measures || []).reduce((acc, item) => {
      acc[item.metric] = item.value;
      return acc;
    }, {});

    submission.sonarQube = {
      projectKey: finalProjectKey,
      qualityGateStatus: qualityGateResponse?.projectStatus?.status || "UNKNOWN",
      scanStatus: "success",
      metrics: measures,
      issuesCount: Number.isFinite(Number(issuesResponse?.total)) ? Number(issuesResponse.total) : 0,
      lastSyncAt: new Date(),
      dashboardUrl: `${baseUrl}/project/overview?id=${encodeURIComponent(finalProjectKey)}`,
      errorMessage: ""
    };

    await room.save();

    emitMonitoringUpdate(room._id, {
      type: "sonarqube_synced",
      roomId: room._id,
      resultId: submission._id,
      sonarQube: submission.sonarQube
    });

    return res.json({ message: "SonarQube quality synced", sonarQube: submission.sonarQube });
  } catch (error) {
    console.error("Sync SonarQube Error:", error);
    return res.status(500).json({ message: "Unable to sync SonarQube quality", error: error.message });
  }
};

exports.confirmBattleResult = async (req, res) => {
  try {
    const { roomId, resultId } = req.params;
    const { awardedScore, awardedCriteria, recruiterFeedback } = req.body || {};
    const userId = req.user.id;
    const userRole = req.user.role;

    const room = await ProgrammingRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const isCreator = room.creatorId.toString() === userId.toString();
    if (!isCreator && userRole !== "admin") {
      return res.status(403).json({ message: "Only room creator can confirm results" });
    }

    const submission = room.resultSubmissions.id(resultId);
    if (!submission) {
      return res.status(404).json({ message: "Result submission not found" });
    }

    submission.confirmedByRecruiter = true;
    submission.confirmedAt = new Date();
    submission.confirmedBy = userId;
    submission.awardedScore = Number.isFinite(Number(awardedScore)) ? Number(awardedScore) : submission.awardedScore;
    submission.awardedCriteria = Array.isArray(awardedCriteria) ? awardedCriteria : submission.awardedCriteria;
    submission.recruiterFeedback = truncateText(recruiterFeedback, 2000);

    await room.save();

    emitMonitoringUpdate(room._id, {
      type: "result_confirmed",
      roomId: room._id,
      resultId: submission._id,
      email: submission.email,
      awardedScore: submission.awardedScore || 0,
      awardedCriteria: submission.awardedCriteria || [],
      recruiterFeedback: submission.recruiterFeedback || "",
      confirmedAt: submission.confirmedAt,
      stats: getMonitoringStats(room)
    });

    return res.json({ message: "Result confirmed by recruiter" });
  } catch (error) {
    console.error("Confirm Battle Result Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
