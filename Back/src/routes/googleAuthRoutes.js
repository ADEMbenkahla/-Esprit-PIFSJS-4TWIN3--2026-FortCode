const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');

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
    (req, res) => {
        const user = req.user;

        // Check if new user
        if (user.isNewUser) {
            // Redirect to register page with Google data
            const { googleId, email, name, avatar } = user.profile;
            const redirectUrl = `http://localhost:5173/register?google=true&googleId=${encodeURIComponent(googleId)}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`;
            return res.redirect(redirectUrl);
        }

        // Existing user - generate JWT token
        const token = jwt.sign(
            { id: user._id, role: user.role, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Redirect to frontend with token
        res.redirect(`http://localhost:5173/auth/callback?token=${token}&role=${user.role}`);
    }
);

module.exports = router;
