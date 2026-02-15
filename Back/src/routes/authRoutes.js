const express = require("express");
const router = express.Router();

const {
  register,
  registerAdmin,
  login,
  getProfile,
  updateProfile,
  getAllUsers,
  toggleUserActivation,
  assignRole,
  createUser,
  updateUser
} = require("../controllers/authController");

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

/* =====================================================
   🔓 PUBLIC ROUTES
===================================================== */

// Register user
router.post("/register", register);

// Register admin (optionnel)
router.post("/register-admin", registerAdmin);

// Login
router.post("/login", login);


/* =====================================================
   🔐 USER PROTECTED ROUTES
===================================================== */

// Get logged-in user profile
router.get("/profile", authMiddleware, getProfile);

// Update logged-in user profile
router.put("/profile", authMiddleware, updateProfile);


/* =====================================================
   👑 ADMIN ROUTES (Protected + Role Check)
===================================================== */

// Get all users
router.get(
  "/admin/users",
  authMiddleware,
  roleMiddleware("admin"),
  getAllUsers
);

// Create user (Admin only)
router.post(
  "/admin/users",
  authMiddleware,
  roleMiddleware("admin"),
  createUser
);

// Update user (Admin only)
router.put(
  "/admin/users/:userId",
  authMiddleware,
  roleMiddleware("admin"),
  updateUser
);

// Activate / Deactivate user
router.patch(
  "/admin/users/:userId/toggle",
  authMiddleware,
  roleMiddleware("admin"),
  toggleUserActivation
);

// Change user role
router.patch(
  "/admin/users/:userId/role",
  authMiddleware,
  roleMiddleware("admin"),
  assignRole
);


/* =====================================================
   🚪 LOGOUT (Stateless JWT)
===================================================== */

router.post("/logout", authMiddleware, (req, res) => {
  // JWT est stateless → côté client on supprime le token
  res.json({ message: "Logout successful" });
});


module.exports = router;
