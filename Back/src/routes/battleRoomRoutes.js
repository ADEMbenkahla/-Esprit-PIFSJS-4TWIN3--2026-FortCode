const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");
const battleUpload = require("../middlewares/battleUploadMiddleware");
const {
  listParticipants,
  generateExerciseDraft,
  createBattleRoom,
  listMyBattleRooms,
  getBattleRoom,
  updateBattleRoomStatus,
  getSubmissions,
  updateSubmissionEvaluation,
  listParticipantBattleRooms,
  getParticipantBattleRoom,
  getParticipantBattleRoomAccess,
  reportParticipantFraudEvent,
  submitParticipantBattleCode,
  previewBattleInvitation,
  acceptBattleInvitation,
} = require("../controllers/battleRoomController");

// Apply recruiter/admin only on these paths — NOT router.use() on the whole /api mount,
// otherwise every /api/* request (e.g. /api/stages/me) hits this middleware and blocks participants.
const staff = [authMiddleware, roleMiddleware("recruiter", "admin")];
const participantOnly = [authMiddleware, roleMiddleware("participant")];

router.get("/recruiter/participants", ...staff, listParticipants);
router.post("/recruiter/battle-rooms/generate-exercise", ...staff, generateExerciseDraft);
router.post("/recruiter/battle-rooms", ...staff, battleUpload.single("exerciseFile"), createBattleRoom);
router.get("/recruiter/battle-rooms", ...staff, listMyBattleRooms);
router.get("/recruiter/battle-rooms/:id", ...staff, getBattleRoom);
router.patch("/recruiter/battle-rooms/:id", ...staff, updateBattleRoomStatus);
router.get("/recruiter/battle-rooms/:id/submissions", ...staff, getSubmissions);
router.patch("/recruiter/battle-rooms/:id/submissions/:subId", ...staff, updateSubmissionEvaluation);

router.get("/participant/battle-rooms", ...participantOnly, listParticipantBattleRooms);
router.get("/participant/battle-rooms/:id", ...participantOnly, getParticipantBattleRoom);
router.get("/participant/battle-rooms/:id/access", ...participantOnly, getParticipantBattleRoomAccess);
router.post("/participant/battle-rooms/:id/fraud", ...participantOnly, reportParticipantFraudEvent);
router.post("/participant/battle-rooms/:id/submit", ...participantOnly, submitParticipantBattleCode);

router.get("/battle-invitations/preview", previewBattleInvitation);
router.post("/battle-invitations/accept", acceptBattleInvitation);

module.exports = router;
