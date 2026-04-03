const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");
const {
  listParticipants,
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

router.get("/recruiter/participants", ...staff, listParticipants);
router.post("/recruiter/battle-rooms", ...staff, createBattleRoom);
router.get("/recruiter/battle-rooms", ...staff, listMyBattleRooms);
router.get("/recruiter/battle-rooms/:id", ...staff, getBattleRoom);
router.patch("/recruiter/battle-rooms/:id", ...staff, updateBattleRoomStatus);
router.get("/recruiter/battle-rooms/:id/submissions", ...staff, getSubmissions);
router.patch("/recruiter/battle-rooms/:id/submissions/:subId", ...staff, updateSubmissionEvaluation);

module.exports = router;
