const express = require("express");
const router = express.Router();

const {
  createRoom,
  getAllRooms,
  getRoomById,
  joinRoom,
  leaveRoom,
  startRoom,
  completeRoom,
  deleteRoom
} = require("../controllers/programmingRoomController");

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

/* =====================================================
   🔓 PUBLIC/AUTHENTICATED ROUTES
===================================================== */

// Get all rooms (authenticated users can see public rooms)
router.get("/", authMiddleware, getAllRooms);

// Get room by ID
router.get("/:roomId", authMiddleware, getRoomById);

// Join a room
router.post("/:roomId/join", authMiddleware, joinRoom);

// Leave a room
router.post("/:roomId/leave", authMiddleware, leaveRoom);


/* =====================================================
   👨‍🏫 RECRUITER ROUTES
===================================================== */

// Create a new room (recruiter only)
router.post("/", authMiddleware, roleMiddleware("recruiter", "admin"), createRoom);

// Start a room (creator only, verified in controller)
router.put("/:roomId/start", authMiddleware, roleMiddleware("recruiter", "admin"), startRoom);

// Complete a room (creator only, verified in controller)
router.put("/:roomId/complete", authMiddleware, roleMiddleware("recruiter", "admin"), completeRoom);

// Delete a room (creator or admin, verified in controller)
router.delete("/:roomId", authMiddleware, deleteRoom);


module.exports = router;
