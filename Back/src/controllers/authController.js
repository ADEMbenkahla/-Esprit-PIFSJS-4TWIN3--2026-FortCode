const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");


// =============================
// 🔐 REGISTER
// =============================
exports.register = async (req, res) => {
  try {
    console.log("Registration request body:", req.body);
    const { username, email, password, googleId, avatar } = req.body;

    // Check if email exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Check if username exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Hash password only if provided (not for Google users where password might be handled differently)
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Generate DiceBear Avatar if not provided
    const userAvatar = avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(username)}`;

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      googleId: googleId || undefined,
      avatar: userAvatar
    });

    res.status(201).json({
      message: "User created successfully"
    });

  } catch (error) {
    console.error("Registration Error:", error);

    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      });
    }

    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// =============================
// 🔐 LOGIN
// =============================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 🔥 Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ message: "Account is deactivated" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login successful",
      token,
      role: user.role,
      email: user.email
    });


  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// =============================
// 🔐 FORGOT PASSWORD
// =============================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetToken = resetToken;
    user.resetTokenExpire = Date.now() + 3600000; // 1 hour

    await user.save();

    res.json({
      message: "Password reset token generated",
      resetToken  // ⚠️ En production on envoie par email
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// =============================
// 🔐 RESET PASSWORD
// =============================
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpire = undefined;

    await user.save();

    res.json({ message: "Password reset successful" });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// =============================
// 👤 GET PROFILE
// =============================
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Profile retrieved successfully",
      user
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// =============================
// 👤 UPDATE PROFILE
// =============================
exports.updateProfile = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update username if provided
    if (username) {
      // Check if new username is unique
      const existingUsername = await User.findOne({ username, _id: { $ne: user._id } });
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      user.username = username;
    }

    // Update email if provided
    if (email) {
      // Check if new email is unique
      const existingEmail = await User.findOne({ email, _id: { $ne: user._id } });
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      user.email = email;
    }

    // Update password if provided (optional)
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: await User.findById(user._id).select("-password")
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// =============================
// 👨‍💼 REGISTER ADMIN
// =============================
exports.registerAdmin = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if email exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role: "admin"
    });

    res.status(201).json({
      message: "Admin user created successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// =============================
// 👨‍💼 ADMIN: GET ALL USERS
// =============================
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.json({
      message: "All users retrieved successfully",
      total: users.length,
      users
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// =============================
// 👨‍💼 ADMIN: TOGGLE USER ACTIVATION
// =============================
exports.toggleUserActivation = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isActive: user.isActive
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// =============================
// 👨‍💼 ADMIN: ASSIGN ROLE
// =============================
exports.assignRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Validate role
    const validRoles = ["participant", "admin", "recruiter"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        message: `Invalid role. Allowed roles: ${validRoles.join(", ")}`
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.role = role;
    await user.save();

    res.json({
      message: "Role assigned successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// =============================
// 👨‍💼 ADMIN: CREATE USER
// =============================
exports.createUser = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Validate required fields
    if (!username || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate role
    const validRoles = ["participant", "admin", "recruiter"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        message: `Invalid role. Allowed roles: ${validRoles.join(", ")}`
      });
    }

    // Check if email exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Check if username exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate DiceBear Avatar
    const avatar = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(username)}`;

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role,
      avatar
    });

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// =============================
// 👨‍💼 ADMIN: UPDATE USER
// =============================
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, email, password, role } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update username if provided
    if (username && username !== user.username) {
      const existingUsername = await User.findOne({ username, _id: { $ne: userId } });
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      user.username = username;
    }

    // Update email if provided
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email, _id: { $ne: userId } });
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      user.email = email;
    }

    // Update password if provided
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    // Update role if provided
    if (role) {
      const validRoles = ["participant", "admin", "recruiter"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          message: `Invalid role. Allowed roles: ${validRoles.join(", ")}`
        });
      }
      user.role = role;
    }

    await user.save();

    res.json({
      message: "User updated successfully",
      user: await User.findById(userId).select("-password")
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


