const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("./config/passport");
const connectDB = require("./config/db");

const path = require("path");

connectDB();

const app = express();

app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
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

// Routes
app.use("/api/auth", require("./routes/googleAuthRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/admin/activity", require("./routes/activityRoutes"));
app.use("/api/admin/dashboard", require("./routes/dashboardRoutes"));
<<<<<<< HEAD
app.use("/api", require("./routes/virtualRoomRoutes"));
app.use("/api", require("./routes/battleRoomRoutes"));
=======
app.use("/api/role-requests", require("./routes/roleRequestRoutes"));
app.use("/api/programming-rooms", require("./routes/programmingRoomRoutes"));
app.use("/api/stages", require("./routes/stageRoutes"));
app.use("/api/challenges", require("./routes/challengeRoutes"));
>>>>>>> da4a379f517619ed5f2890a9aff73fb6d70d1968

module.exports = app;

