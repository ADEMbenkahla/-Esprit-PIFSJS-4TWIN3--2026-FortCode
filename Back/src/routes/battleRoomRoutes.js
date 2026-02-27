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

router.use(authMiddleware);
router.use(roleMiddleware("recruiter"));

router.get("/recruiter/participants", listParticipants);
router.post("/recruiter/battle-rooms", createBattleRoom);
router.get("/recruiter/battle-rooms", listMyBattleRooms);
router.get("/recruiter/battle-rooms/:id", getBattleRoom);
router.patch("/recruiter/battle-rooms/:id", updateBattleRoomStatus);
router.get("/recruiter/battle-rooms/:id/submissions", getSubmissions);
router.patch("/recruiter/battle-rooms/:id/submissions/:subId", updateSubmissionEvaluation);

module.exports = router;
