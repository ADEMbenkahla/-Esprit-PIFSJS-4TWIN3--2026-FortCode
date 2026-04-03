const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const fs = require('fs');
const path = require('path');

// Initiate Google OAuth
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

// Google OAuth callback
router.get('/google/callback',
    passport.authenticate('google', {
        failureRedirect: 'http://localhost:5173/',
        session: false
    }),
    async (req, res) => {
        const user = req.user;

        // Check if new user
        if (user.isNewUser) {
            // Auto create user
            const { googleId, email, name, avatar } = user.profile;

            // Generate unique username
            let baseUsername = name.replace(/\s+/g, '_');
            let uniqueUsername = baseUsername;
            let counter = 1;
            while (await User.findOne({ username: uniqueUsername })) {
                uniqueUsername = `${baseUsername}${counter}`;
                counter++;
            }

            const newUser = await User.create({
                username: uniqueUsername,
                email,
                googleId,
                avatar,
                isVerified: true
            });

            // Send Welcome Email
            try {
                const templatePath = path.join(__dirname, "../templates/welcomeGoogle.html");
                const logoPath = path.join(__dirname, "../assets/logo.png");
                let htmlContent = fs.readFileSync(templatePath, "utf8");

                htmlContent = htmlContent.replace("{{username}}", newUser.username);

                sendEmail({ // Non-blocking async to not delay user login
                    email: newUser.email,
                    subject: "Welcome to FortCode",
                    message: "Access the Platform",
                    html: htmlContent,
                    attachments: [
                        {
                            filename: "logo.png",
                            path: logoPath,
                            cid: "logo",
                        },
                    ],
                }).catch(err => console.error("Google verify/welcome email error:", err));
            } catch (error) {
                console.error("Welcome email error:", error);
            }

            // Generate JWT token
            const token = jwt.sign(
                { id: newUser._id, role: newUser.role || 'participant', username: newUser.username },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            return res.redirect(
                `http://localhost:5173/auth/callback?token=${encodeURIComponent(token)}&role=${encodeURIComponent(newUser.role)}`
            );
        }

        // 🔥 Check if account is active
        if (!user.isActive) {
            return res.redirect('http://localhost:5173/?error=deactivated');
        }

        // Existing user - generate JWT token
        const token = jwt.sign(
            { id: user._id, role: user.role || 'participant', username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Redirect to frontend with token
        res.redirect(
            `http://localhost:5173/auth/callback?token=${encodeURIComponent(token)}&role=${encodeURIComponent(user.role)}`
        );
    }
);

module.exports = router;
