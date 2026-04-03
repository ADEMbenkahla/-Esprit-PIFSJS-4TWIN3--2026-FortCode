const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} = require("@simplewebauthn/server");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Human-readable title for your website
const rpName = "FortCode";
// A unique identifier for your website
const rpID = "localhost";
// The origin of your website
const origin = `http://${rpID}:5173`;

/**
 * Registration - Step 1: Generate options
 */
exports.generateRegistrationOptions = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const options = await generateRegistrationOptions({
            rpName,
            rpID,
            userID: Buffer.from(user._id.toString()),
            userName: user.email,
            attestationType: "none",
            authenticatorSelection: {
                residentKey: "preferred",
                userVerification: "preferred",
                // authenticatorAttachment: "platform", // Commented out to allow phones/security keys
            },
            excludeCredentials: user.webauthn.map((cred) => ({
                id: Buffer.from(cred.credentialID, "base64url"),
                type: "public-key",
                transports: cred.transports,
            })),
        });

        // Save challenge to user
        user.currentChallenge = options.challenge;
        await user.save();

        res.json(options);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error generating registration options", error: error.message });
    }
};

/**
 * Registration - Step 2: Verify response
 */
exports.verifyRegistration = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const expectedChallenge = user.currentChallenge;

        const verification = await verifyRegistrationResponse({
            response: req.body,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
        });

        if (verification.verified) {
            const { registrationInfo } = verification;
            const { credentialPublicKey, credentialID, counter } = registrationInfo;

            // Add new credential to user
            user.webauthn.push({
                credentialID: Buffer.from(credentialID).toString("base64url"),
                publicKey: Buffer.from(credentialPublicKey).toString("base64url"),
                counter,
                transports: req.body.response.transports,
            });

            user.currentChallenge = undefined;
            await user.save();

            res.json({ verified: true });
        } else {
            res.status(400).json({ verified: false, message: "Verification failed" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error verifying registration", error: error.message });
    }
};

/**
 * Authentication - Step 1: Generate options
 */
exports.generateAuthenticationOptions = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        const options = await generateAuthenticationOptions({
            rpID,
            allowCredentials: user.webauthn.map((cred) => ({
                id: cred.credentialID,
                type: "public-key",
                transports: cred.transports,
            })),
            userVerification: "preferred",
        });

        user.currentChallenge = options.challenge;
        await user.save();

        res.json(options);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error generating authentication options", error: error.message });
    }
};

/**
 * Authentication - Step 2: Verify response
 */
exports.verifyAuthentication = async (req, res) => {
    try {
        const { email, body: response } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        const expectedChallenge = user.currentChallenge;

        const dbCredential = user.webauthn.find(
            (cred) => cred.credentialID === response.id
        );

        if (!dbCredential) {
            return res.status(400).json({ message: "Credential not found on this user" });
        }

        const verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            authenticator: {
                credentialID: Buffer.from(dbCredential.credentialID, "base64url"),
                credentialPublicKey: Buffer.from(dbCredential.publicKey, "base64url"),
                counter: dbCredential.counter,
            },
        });

        if (verification.verified) {
            // Update counter
            dbCredential.counter = verification.authenticationInfo.newCounter;
            user.currentChallenge = undefined;
            await user.save();

            // Issue JWT
            const token = jwt.sign(
                { id: user._id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: "1h" }
            );

            res.json({
                verified: true,
                token,
                role: user.role,
                email: user.email
            });
        } else {
            res.status(400).json({ verified: false, message: "Verification failed" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error verifying authentication", error: error.message });
    }
};
