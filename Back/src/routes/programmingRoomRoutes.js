const express = require("express");
const router = express.Router();

const {
  createRoom,
  getAllRooms,
  getRoomById,
   lookupRoomInvitation,
   checkInvitationAccess,
   getProgrammerRoom,
   logInvitationMonitoringEvent,
   submitInvitationResult,
  joinRoom,
  leaveRoom,
  startRoom,
   updateRoomRubric,
   submitBattleResult,
   getRoomMonitoring,
   syncSubmissionSonarQube,
   confirmBattleResult,
   suggestBattleResultScore,
  completeRoom,
  deleteRoom
} = require("../controllers/programmingRoomController");

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");
const uploadExercise = require("../middlewares/exerciseUploadMiddleware");

/* =====================================================
   🔓 PUBLIC/AUTHENTICATED ROUTES
===================================================== */

// Get all rooms (authenticated users can see public rooms)
router.get("/", authMiddleware, getAllRooms);

// Public invitation flow
router.get("/invitations/lookup", lookupRoomInvitation);
router.post("/invitations/access", checkInvitationAccess);
router.get("/invitations/programmer-room", getProgrammerRoom);
router.post("/invitations/monitoring/event", logInvitationMonitoringEvent);
router.post("/invitations/monitoring/result", submitInvitationResult);

// Get room by ID
router.get("/:roomId", authMiddleware, getRoomById);

// Join a room
router.post("/:roomId/join", authMiddleware, joinRoom);

// Leave a room
router.post("/:roomId/leave", authMiddleware, leaveRoom);

// Submit a result for review
router.post("/:roomId/results", authMiddleware, submitBattleResult);


/* =====================================================
   👨‍🏫 RECRUITER ROUTES
===================================================== */

// Create a new room (recruiter only)
router.post("/", authMiddleware, roleMiddleware("recruiter", "admin"), uploadExercise.single("exerciseFile"), createRoom);

// Start a room (creator only, verified in controller)
router.put("/:roomId/start", authMiddleware, roleMiddleware("recruiter", "admin"), startRoom);

// Update room grading rubric
router.put("/:roomId/rubric", authMiddleware, roleMiddleware("recruiter", "admin"), updateRoomRubric);

// Room monitoring dashboard data
router.get("/:roomId/monitoring", authMiddleware, roleMiddleware("recruiter", "admin"), getRoomMonitoring);

// Sync SonarQube quality for a submission
router.post("/:roomId/monitoring/results/:resultId/sonarqube/sync", authMiddleware, roleMiddleware("recruiter", "admin"), syncSubmissionSonarQube);

// Confirm a submitted result
router.post("/:roomId/monitoring/results/:resultId/confirm", authMiddleware, roleMiddleware("recruiter", "admin"), confirmBattleResult);

// Get AI score suggestion
router.get("/:roomId/monitoring/results/:resultId/score-suggestion", authMiddleware, roleMiddleware("recruiter", "admin"), suggestBattleResultScore);

// Complete a room (creator only, verified in controller)
router.put("/:roomId/complete", authMiddleware, roleMiddleware("recruiter", "admin"), completeRoom);

// Delete a room (creator or admin, verified in controller)
router.delete("/:roomId", authMiddleware, deleteRoom);


module.exports = router;
