const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const {
  createVirtualRoomRequest,
  getMyVirtualRoomRequest,
  getAllVirtualRoomRequests,
  updateVirtualRoomRequestStatus
} = require("../controllers/virtualRoomController");

// Recruiter endpoints (admin can use recruiter APIs too)
router.post(
  "/recruiter/virtual-room/request",
  authMiddleware,
  roleMiddleware("recruiter", "admin"),
  createVirtualRoomRequest
);

router.get(
  "/recruiter/virtual-room/request",
  authMiddleware,
  roleMiddleware("recruiter", "admin"),
  getMyVirtualRoomRequest
);

// Admin endpoints
router.get(
  "/admin/virtual-room/requests",
  authMiddleware,
  roleMiddleware("admin"),
  getAllVirtualRoomRequests
);

router.patch(
  "/admin/virtual-room/requests/:id",
  authMiddleware,
  roleMiddleware("admin"),
  updateVirtualRoomRequestStatus
);

module.exports = router;

