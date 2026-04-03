const User = require("../models/User");
const jwt = require("jsonwebtoken");

/**
 * Calculate Euclidean distance between two descriptors
 */
const euclideanDistance = (d1, d2) => {
    if (!d1 || !d2 || d1.length !== d2.length) return Infinity;
    return Math.sqrt(d1.reduce((acc, val, i) => acc + (val - d2[i]) ** 2, 0));
};

/**
 * Register Face - Step 1: Save descriptor
 */
exports.registerFace = async (req, res) => {
    try {
        const { descriptor } = req.body;
        if (!descriptor || !Array.isArray(descriptor)) {
            return res.status(400).json({ message: "Invalid descriptor format" });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.faceDescriptor = descriptor;
        user.faceRegistered = true;
        await user.save();

        res.json({ success: true, message: "Face registered successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error registering face", error: error.message });
    }
};

/**
 * Login Face - Step 1: Compare descriptor
 */
exports.loginFace = async (req, res) => {
    try {
        const { email, descriptor } = req.body;
        if (!email || !descriptor || !Array.isArray(descriptor)) {
            return res.status(400).json({ message: "Invalid partial data" });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        if (!user.faceRegistered || !user.faceDescriptor || user.faceDescriptor.length === 0) {
            return res.status(400).json({ message: "Face ID not registered for this user" });
        }

        // Compare descriptors
        const distance = euclideanDistance(descriptor, user.faceDescriptor);
        const THRESHOLD = 0.45; // Standard threshold for face-api.js recognition

        console.log(`Face match distance for ${email}: ${distance}`);

        if (distance < THRESHOLD) {
            // Issue JWT
            const token = jwt.sign(
                { id: user._id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: "1h" }
            );

            res.json({
                success: true,
                token,
                role: user.role,
                email: user.email
            });
        } else {
            res.status(401).json({ success: false, message: "Face does not match" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error during face login", error: error.message });
    }
};
