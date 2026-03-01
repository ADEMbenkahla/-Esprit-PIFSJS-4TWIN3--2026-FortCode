const express = require("express");
const router = express.Router();

const {
  register,
  registerAdmin,
  login,
  login2fa,
  getProfile,
  refreshToken,
  updateProfile,
  setupTwoFactor,
  verifyTwoFactor,
  disableTwoFactor,
  getAllUsers,
  toggleUserActivation,
  assignRole,
  createUser,
  updateUser,
  forgotPassword,
  resetPassword
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

// Login 2FA verify
router.post("/login/2fa", login2fa);

// Forgot password
router.put("/forgot-password", forgotPassword);

// Reset password
router.put("/reset-password/:token", resetPassword);


/* =====================================================
   🔐 USER PROTECTED ROUTES
===================================================== */

// Get logged-in user profile
router.get("/profile", authMiddleware, getProfile);

// Refresh token with updated user info
router.post("/refresh-token", authMiddleware, refreshToken);

// Update logged-in user profile
router.put("/profile", authMiddleware, updateProfile);

// 2FA setup/verify/disable
router.post("/2fa/setup", authMiddleware, setupTwoFactor);
router.post("/2fa/verify", authMiddleware, verifyTwoFactor);
router.post("/2fa/disable", authMiddleware, disableTwoFactor);


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
