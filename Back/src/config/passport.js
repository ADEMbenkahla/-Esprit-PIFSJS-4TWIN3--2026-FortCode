const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Extract profile info
                const email = profile.emails[0].value;
                const googleId = profile.id;
                const name = profile.displayName;
                const avatar = profile.photos[0]?.value || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(email)}`;

                // Check if user exists
                let user = await User.findOne({ email });

                if (user) {
                    // User exists - update googleId if not set
                    if (!user.googleId) {
                        user.googleId = googleId;
                        await user.save();
                    }
                    return done(null, user);
                } else {
                    // New user - return profile data without creating account
                    // Frontend will handle registration
                    return done(null, {
                        isNewUser: true,
                        profile: {
                            googleId,
                            email,
                            name,
                            avatar
                        }
                    });
                }
            } catch (error) {
                return done(error, null);
            }
        }
    )
);

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

module.exports = passport;
