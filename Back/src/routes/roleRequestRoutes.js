const express = require("express");
const router = express.Router();

const {
  createRoleRequest,
  getMyRoleRequests,
  getAllRoleRequests,
  approveRoleRequest,
  rejectRoleRequest,
  deleteRoleRequest
} = require("../controllers/roleRequestController");

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");
const upload = require("../middlewares/uploadMiddleware");

/* =====================================================
   👤 USER ROUTES (Participant)
===================================================== */

// Create a new role request (with optional file upload)
router.post("/", authMiddleware, upload.single("proofDocument"), createRoleRequest);

// Get my role requests
router.get("/my-requests", authMiddleware, getMyRoleRequests);

// Delete my role request
router.delete("/:requestId", authMiddleware, deleteRoleRequest);


/* =====================================================
   👑 ADMIN ROUTES
===================================================== */

// Get all role requests (with optional status filter)
router.get("/", authMiddleware, roleMiddleware("admin"), getAllRoleRequests);

// Approve a role request
router.put("/:requestId/approve", authMiddleware, roleMiddleware("admin"), approveRoleRequest);

// Reject a role request
router.put("/:requestId/reject", authMiddleware, roleMiddleware("admin"), rejectRoleRequest);


module.exports = router;
