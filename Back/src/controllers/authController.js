const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const sendEmail = require("../utils/sendEmail");
const fs = require("fs");
const path = require("path");

const TWO_FA_EMAIL_TTL_MS = 10 * 60 * 1000;

const generateEmailOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const hashOtp = (otp) => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};


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
      avatar: userAvatar,
      nickname: username // Default nickname is username
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
    const { identifier, email, password } = req.body;
    let loginId = (identifier || email || "").toString().trim();

    console.log(`DEBUG: Login Attempt - Identifier: [${loginId}], Password length: ${password ? password.length : 0}`);

    if (!loginId || !password) {
      return res.status(400).json({ message: "Login identifier and password are required" });
    }

    // Comprehensive search: username or email (case-insensitive)
    const user = await User.findOne({
      $or: [
        { email: { $regex: new RegExp(`^${loginId}$`, "i") } },
        { username: { $regex: new RegExp(`^${loginId}$`, "i") } }
      ]
    });

    if (!user) {
      console.log(`DEBUG: No user found for identifier: [${loginId}]`);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 🔥 Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ message: "Account is deactivated" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("DEBUG: Password match result:", isMatch);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const twoFactor = user.settings && user.settings.twoFactor ? user.settings.twoFactor : null;
    if (twoFactor && twoFactor.enabled) {
      const method = twoFactor.method || "totp";

      if (method === "email") {
        const otp = generateEmailOtp();
        user.settings.twoFactor.emailOtpHash = hashOtp(otp);
        user.settings.twoFactor.emailOtpExpires = new Date(Date.now() + TWO_FA_EMAIL_TTL_MS);
        await user.save();

        const html = `
          <div style="font-family: Arial, sans-serif;">
            <h2>FortCode 2FA Code</h2>
            <p>Your one-time code is:</p>
            <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${otp}</div>
            <p>This code expires in 10 minutes.</p>
          </div>
        `;

        await sendEmail({
          email: user.email,
          subject: "Your FortCode 2FA Code",
          html
        });
      }

      const twoFactorToken = jwt.sign(
        { id: user._id, type: "2fa" },
        process.env.JWT_SECRET,
        { expiresIn: "5m" }
      );

      return res.json({
        message: "2FA required",
        twoFactorRequired: true,
        method,
        twoFactorToken
      });
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
// 🔐 LOGIN 2FA VERIFY
// =============================
exports.login2fa = async (req, res) => {
  try {
    const { twoFactorToken, code } = req.body;

    if (!twoFactorToken || !code) {
      return res.status(400).json({ message: "2FA token and code are required" });
    }

    let payload;
    try {
      payload = jwt.verify(twoFactorToken, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ message: "Invalid or expired 2FA token" });
    }

    if (!payload || payload.type !== "2fa") {
      return res.status(401).json({ message: "Invalid 2FA token" });
    }

    const user = await User.findById(payload.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const twoFactor = user.settings && user.settings.twoFactor ? user.settings.twoFactor : null;
    if (!twoFactor || !twoFactor.enabled) {
      return res.status(400).json({ message: "2FA is not enabled" });
    }

    let verified = false;

    const method = twoFactor.method || "totp";
    if (method === "totp") {
      if (!twoFactor.totpSecret) {
        return res.status(400).json({ message: "2FA secret not found" });
      }
      verified = speakeasy.totp.verify({
        secret: twoFactor.totpSecret,
        encoding: "base32",
        token: code,
        window: 1
      });
    } else if (method === "email") {
      if (!twoFactor.emailOtpHash || !twoFactor.emailOtpExpires) {
        return res.status(400).json({ message: "2FA code not requested" });
      }
      if (twoFactor.emailOtpExpires.getTime() < Date.now()) {
        return res.status(400).json({ message: "2FA code expired" });
      }
      verified = hashOtp(code) === twoFactor.emailOtpHash;
      if (verified) {
        user.settings.twoFactor.emailOtpHash = "";
        user.settings.twoFactor.emailOtpExpires = null;
        await user.save();
      }
    }

    if (!verified) {
      return res.status(400).json({ message: "Invalid 2FA code" });
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
// 🔐 2FA SETUP
// =============================
exports.setupTwoFactor = async (req, res) => {
  try {
    const { method } = req.body;
    if (method !== "totp" && method !== "email") {
      return res.status(400).json({ message: "Invalid 2FA method" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.settings) {
      user.settings = {};
    }
    if (!user.settings.twoFactor) {
      user.settings.twoFactor = {};
    }

    user.settings.twoFactor.method = method;
    user.settings.twoFactor.enabled = false;

    if (method === "totp") {
      const secret = speakeasy.generateSecret({
        name: `FortCode (${user.email})`
      });

      user.settings.twoFactor.tempTotpSecret = secret.base32;
      await user.save();

      const qrCode = await qrcode.toDataURL(secret.otpauth_url);

      return res.json({
        method: "totp",
        qrCode,
        otpauthUrl: secret.otpauth_url
      });
    }

    const otp = generateEmailOtp();
    user.settings.twoFactor.emailOtpHash = hashOtp(otp);
    user.settings.twoFactor.emailOtpExpires = new Date(Date.now() + TWO_FA_EMAIL_TTL_MS);
    await user.save();

    const html = `
      <div style="font-family: Arial, sans-serif;">
        <h2>FortCode 2FA Setup</h2>
        <p>Your verification code is:</p>
        <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${otp}</div>
        <p>This code expires in 10 minutes.</p>
      </div>
    `;

    await sendEmail({
      email: user.email,
      subject: "Your FortCode 2FA Setup Code",
      html
    });

    res.json({
      method: "email",
      message: "2FA code sent"
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// =============================
// 🔐 2FA VERIFY
// =============================
exports.verifyTwoFactor = async (req, res) => {
  try {
    const { method, code } = req.body;
    if (!code) {
      return res.status(400).json({ message: "2FA code is required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const twoFactor = user.settings && user.settings.twoFactor ? user.settings.twoFactor : null;
    if (!twoFactor) {
      return res.status(400).json({ message: "2FA is not configured" });
    }

    const resolvedMethod = method || twoFactor.method || "totp";
    let verified = false;

    if (resolvedMethod === "totp") {
      if (!twoFactor.tempTotpSecret) {
        return res.status(400).json({ message: "2FA setup not started" });
      }
      verified = speakeasy.totp.verify({
        secret: twoFactor.tempTotpSecret,
        encoding: "base32",
        token: code,
        window: 1
      });

      if (verified) {
        user.settings.twoFactor.totpSecret = twoFactor.tempTotpSecret;
        user.settings.twoFactor.tempTotpSecret = "";
        user.settings.twoFactor.enabled = true;
        user.settings.twoFactor.method = "totp";
      }
    } else if (resolvedMethod === "email") {
      if (!twoFactor.emailOtpHash || !twoFactor.emailOtpExpires) {
        return res.status(400).json({ message: "2FA code not requested" });
      }
      if (twoFactor.emailOtpExpires.getTime() < Date.now()) {
        return res.status(400).json({ message: "2FA code expired" });
      }
      verified = hashOtp(code) === twoFactor.emailOtpHash;

      if (verified) {
        user.settings.twoFactor.emailOtpHash = "";
        user.settings.twoFactor.emailOtpExpires = null;
        user.settings.twoFactor.enabled = true;
        user.settings.twoFactor.method = "email";
      }
    }

    if (!verified) {
      return res.status(400).json({ message: "Invalid 2FA code" });
    }

    await user.save();

    res.json({
      message: "2FA enabled",
      twoFactor: {
        enabled: user.settings.twoFactor.enabled,
        method: user.settings.twoFactor.method
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// =============================
// 🔐 2FA DISABLE
// =============================
exports.disableTwoFactor = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.settings) {
      user.settings = {};
    }
    if (!user.settings.twoFactor) {
      user.settings.twoFactor = {};
    }

    user.settings.twoFactor.enabled = false;
    user.settings.twoFactor.method = "totp";
    user.settings.twoFactor.totpSecret = "";
    user.settings.twoFactor.tempTotpSecret = "";
    user.settings.twoFactor.emailOtpHash = "";
    user.settings.twoFactor.emailOtpExpires = null;

    await user.save();

    res.json({ message: "2FA disabled" });
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

    // Create reset URL
    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

    // Load and prepare email template
    const templatePath = path.join(__dirname, "../templates/forgotPassword.html");
    const logoPath = path.join(__dirname, "../assets/logo.png");
    let htmlContent = fs.readFileSync(templatePath, "utf8");

    // Replace placeholders
    htmlContent = htmlContent
      .replace("{{username}}", user.username)
      .replace("{{resetUrl}}", resetUrl);

    try {
      await sendEmail({
        email: user.email,
        subject: "Reset Your FortCode Password",
        html: htmlContent,
        attachments: [
          {
            filename: "logo.png",
            path: logoPath,
            cid: "logo", // same cid value as in the html img src
          },
        ],
      });

      res.status(200).json({ message: "Email sent" });
    } catch (error) {
      console.error("Email send error:", error);
      user.resetToken = undefined;
      user.resetTokenExpire = undefined;
      await user.save();

      return res.status(500).json({ message: "Email could not be sent. Check server logs." });
    }

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

    const userObj = user.toObject();
    if (userObj.settings && userObj.settings.twoFactor) {
      delete userObj.settings.twoFactor.totpSecret;
      delete userObj.settings.twoFactor.tempTotpSecret;
      delete userObj.settings.twoFactor.emailOtpHash;
      delete userObj.settings.twoFactor.emailOtpExpires;
    }

    res.json({
      message: "Profile retrieved successfully",
      user: userObj
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
    const { username, email, password, nickname, settings } = req.body;
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

    // Update nickname if provided
    if (nickname !== undefined) {
      user.nickname = nickname;
    }

    // Update settings if provided
    if (settings) {
      if (!user.settings) {
        user.settings = {};
      }
      if (settings.theme) user.settings.theme = settings.theme;
      if (settings.accentColor) user.settings.accentColor = settings.accentColor;
      if (settings.fontSize) user.settings.fontSize = settings.fontSize;
      if (settings.fontFamily) user.settings.fontFamily = settings.fontFamily;
      if (settings.highContrast !== undefined) user.settings.highContrast = settings.highContrast;
      if (settings.reduceMotion !== undefined) user.settings.reduceMotion = settings.reduceMotion;
      if (settings.soundEnabled !== undefined) user.settings.soundEnabled = settings.soundEnabled;
    }

    await user.save();

    const updatedUser = await User.findById(user._id).select("-password");
    const updatedObj = updatedUser.toObject();
    if (updatedObj.settings && updatedObj.settings.twoFactor) {
      delete updatedObj.settings.twoFactor.totpSecret;
      delete updatedObj.settings.twoFactor.tempTotpSecret;
      delete updatedObj.settings.twoFactor.emailOtpHash;
      delete updatedObj.settings.twoFactor.emailOtpExpires;
    }

    res.json({
      message: "Profile updated successfully",
      user: updatedObj
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
// 👨‍💼 ADMIN: GET ALL USERS (PAGINATED & FILTERED)
// =============================
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 7;
    const skip = (page - 1) * limit;
    const { search, role } = req.query;

    let query = {};

    // Apply search filter (username or email)
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    // Apply role filter
    if (role && role !== "All Users") {
      query.role = role.toLowerCase().slice(0, -1); // "Admins" -> "admin"
      // Handle the case where role is "Admins", "Participants", "Recruiters"
      if (role === "Admins") query.role = "admin";
      if (role === "Participants") query.role = "participant";
      if (role === "Recruiters") query.role = "recruiter";
    }

    const totalUsers = await User.countDocuments(query);
    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const sanitizedUsers = users.map((user) => {
      const userObj = user.toObject();
      if (userObj.settings && userObj.settings.twoFactor) {
        delete userObj.settings.twoFactor.totpSecret;
        delete userObj.settings.twoFactor.tempTotpSecret;
        delete userObj.settings.twoFactor.emailOtpHash;
        delete userObj.settings.twoFactor.emailOtpExpires;
      }
      return userObj;
    });

    res.json({
      message: "Users retrieved successfully",
      users: sanitizedUsers,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page,
      limit
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
    const { username, email, password, role, avatar: providedAvatar } = req.body;

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

    // Use provided avatar or generate DiceBear Avatar
    const avatar = providedAvatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(username)}`;

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
    console.log("DEBUG: updateUser Body:", req.body);
    const { username, email, password, role, avatar } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updateData = {};

    // Update username if provided
    if (username && username !== user.username) {
      const existingUsername = await User.findOne({ username, _id: { $ne: userId } });
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      updateData.username = username;
    }

    // Update email if provided
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email, _id: { $ne: userId } });
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      updateData.email = email;
    }

    // Update password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update role if provided
    if (role) {
      const validRoles = ["participant", "admin", "recruiter"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          message: `Invalid role. Allowed roles: ${validRoles.join(", ")}`
        });
      }
      updateData.role = role;
    }

    // Update avatar if provided
    if (avatar) {
      console.log("DEBUG: Avatar detected in request:", avatar);
      updateData.avatar = avatar;
    }

    console.log("DEBUG: Applying Update to DB:", updateData);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");

    console.log("DEBUG: Final User in DB after update:", updatedUser.avatar);

    res.json({
      message: "User updated successfully",
      user: updatedUser
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


