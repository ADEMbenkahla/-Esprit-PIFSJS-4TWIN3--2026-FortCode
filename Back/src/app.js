const express = require("express");
const cors = require("cors");
const compression = require("compression");
const session = require("express-session");
const passport = require("./config/passport");
const connectDB = require("./config/db");

const path = require("path");

connectDB();

const app = express();

app.use(compression());
app.use(cors({
    origin: [
        'http://localhost:5173', 
        'http://127.0.0.1:5173', 
        'http://localhost:4173', 
        'http://127.0.0.1:4173',
        process.env.NGROK_URL,
        process.env.FRONTEND_NGROK_URL
    ].filter(Boolean),
    credentials: true
}));
app.use(express.json());

// Serve static assets
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Session middleware (required for passport)
app.use(session({
    secret: process.env.SESSION_SECRET || 'fortcode_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true in production with HTTPS
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Middleware
const activityLogger = require("./middlewares/activityLogger");
app.use(activityLogger);

// Routes// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

app.use("/api/auth", require("./routes/googleAuthRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/admin/activity", require("./routes/activityRoutes"));
app.use("/api/admin/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/stages", require("./routes/stageRoutes"));
app.use("/api/missions", require("./routes/missionRoutes"));
app.use("/api/challenges", require("./routes/challengeRoutes"));
app.use("/api", require("./routes/virtualRoomRoutes"));
app.use("/api/battle-rooms", require("./routes/battleRoomRoutes"));
app.use("/api/role-requests", require("./routes/roleRequestRoutes"));
app.use("/api/matches", require("./routes/matchRoutes"));

// Keep API error responses JSON-friendly (including multer upload errors).
app.use((err, req, res, next) => {
    if (!err) return next();

    if (err.name === "MulterError") {
        return res.status(400).json({
            message: err.code === "LIMIT_FILE_SIZE"
                ? "Uploaded file is too large"
                : "Upload failed",
            error: err.message
        });
    }

    if (err.message && err.message.toLowerCase().includes("invalid") && err.message.toLowerCase().includes("file")) {
        return res.status(400).json({ message: err.message });
    }

    return res.status(500).json({ message: "Server error", error: err.message || "Unknown error" });
});

module.exports = app;

