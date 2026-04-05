const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");
const {
  listParticipants,
  generateBattleExercise,
  createBattleRoom,
  listMyBattleRooms,
  getBattleRoom,
  updateBattleRoomStatus,
  getSubmissions,
  updateSubmissionEvaluation,
} = require("../controllers/battleRoomController");

// Apply recruiter/admin only on these paths — NOT router.use() on the whole /api mount,
// otherwise every /api/* request (e.g. /api/stages/me) hits this middleware and blocks participants.
const staff = [authMiddleware, roleMiddleware("recruiter", "admin")];

const statementsDir = path.join(__dirname, "../../uploads/battle-statements");
if (!fs.existsSync(statementsDir)) {
  fs.mkdirSync(statementsDir, { recursive: true });
}

const statementStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, statementsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const base = path.basename(file.originalname || "statement", ext).replace(/[^a-zA-Z0-9-_]/g, "_");
    const userId = req.user?.id || "user";
    cb(null, `${userId}_${Date.now()}_${base}${ext}`);
  },
});

const statementFileFilter = (req, file, cb) => {
  const allowed = new Set([
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
    "application/x-zip-compressed",
    "application/octet-stream",
  ]);
  if (allowed.has(file.mimetype)) return cb(null, true);
  return cb(new Error("Invalid file type. Allowed: PDF, TXT, MD, DOC, DOCX, ZIP"), false);
};

const battleStatementUpload = multer({
  storage: statementStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: statementFileFilter,
});

router.get("/recruiter/participants", ...staff, listParticipants);
router.post("/recruiter/battle-rooms/generate-exercise", ...staff, generateBattleExercise);
router.post("/recruiter/battle-rooms", ...staff, battleStatementUpload.single("exerciseFile"), createBattleRoom);
router.get("/recruiter/battle-rooms", ...staff, listMyBattleRooms);
router.get("/recruiter/battle-rooms/:id", ...staff, getBattleRoom);
router.patch("/recruiter/battle-rooms/:id", ...staff, updateBattleRoomStatus);
router.get("/recruiter/battle-rooms/:id/submissions", ...staff, getSubmissions);
router.patch("/recruiter/battle-rooms/:id/submissions/:subId", ...staff, updateSubmissionEvaluation);

module.exports = router;
