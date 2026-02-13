
const express = require("express");
const router = express.Router();
const { 
  register, 
  login, 
  getProfile, 
  updateProfile, 
  registerAdmin,
  getAllUsers,
  toggleUserActivation,
  assignRole
} = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

router.post("/register", register);
router.post("/register-admin", registerAdmin);
router.post("/login", login);

// Simple demo login endpoint (without DB validation)
router.post("/demo-login", (req, res) => {
  const { email, password } = req.body;
  const demoUser = {
    email: "user@algoarena.com",
    password: "123456"
  };

  if (email === demoUser.email && password === demoUser.password) {
    res.json({ success: true, message: "Login successful" });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

// Profile routes (protected)
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);

// Admin routes (protected)
router.get("/admin/users", authMiddleware, roleMiddleware("admin"), getAllUsers);
router.patch("/admin/users/:userId/toggle", authMiddleware, roleMiddleware("admin"), toggleUserActivation);
router.patch("/admin/users/:userId/role", authMiddleware, roleMiddleware("admin"), assignRole);
module.exports = router;
