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
  deleteMyAccount,
  setupTwoFactor,
  verifyTwoFactor,
  disableTwoFactor,
  getAllUsers,
  toggleUserActivation,
  assignRole,
  createUser,
  updateUser,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  deleteAccount
} = require("../controllers/authController");

const {
  generateRegistrationOptions,
  verifyRegistration,
  generateAuthenticationOptions,
  verifyAuthentication
} = require("../controllers/webauthnController");

const {
  registerFace,
  loginFace
} = require("../controllers/faceAuthController");

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

/* =====================================================
   🔓 PUBLIC ROUTES
===================================================== */

// Register user
router.post("/register", register);

// Register admin (optionnel)
router.post("/register-admin", registerAdmin);

// Verify Email
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);

// Login
router.post("/login", login);

// Login 2FA verify
router.post("/login/2fa", login2fa);

// Forgot password
router.put("/forgot-password", forgotPassword);

// Reset password
router.put("/reset-password/:token", resetPassword);

// WebAuthn Login
router.post("/webauthn/login-options", generateAuthenticationOptions);
router.post("/webauthn/login-verify", verifyAuthentication);


/* =====================================================
   🔐 USER PROTECTED ROUTES
===================================================== */

// Get logged-in user profile
router.get("/profile", authMiddleware, getProfile);

// Refresh token with updated user info
router.post("/refresh-token", authMiddleware, refreshToken);

// Update logged-in user profile
router.put("/profile", authMiddleware, updateProfile);

<<<<<<< HEAD
// Delete my account (participant only)
router.delete("/profile", authMiddleware, deleteMyAccount);
=======
// Delete logged-in user account
router.delete("/profile", authMiddleware, deleteAccount);
>>>>>>> da4a379f517619ed5f2890a9aff73fb6d70d1968

// 2FA setup/verify/disable
router.post("/2fa/setup", authMiddleware, setupTwoFactor);
router.post("/2fa/verify", authMiddleware, verifyTwoFactor);
router.post("/2fa/disable", authMiddleware, disableTwoFactor);

// WebAuthn Registration
router.get("/webauthn/register-options", authMiddleware, generateRegistrationOptions);
router.post("/webauthn/register-verify", authMiddleware, verifyRegistration);

// Face ID (face-api.js) Routes
router.post("/face/register", authMiddleware, registerFace);
router.post("/face/login", loginFace);


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
