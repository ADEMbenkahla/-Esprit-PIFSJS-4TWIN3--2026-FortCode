const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema({
    players: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        username: String,
        avatar: String,
        code: { type: String, default: "" },
        health: { type: Number, default: 100 },
        isReady: { type: Boolean, default: false },
        mlDetection: {
            prediction: { type: Number, enum: [0, 1, 2], default: null },
            label: { type: String, default: "" }
        },
        finished: { type: Boolean, default: false },
        socketId: { type: String }
    }],
    type: {
        type: String,
        enum: ["training", "ranked"],
        required: true
    },
    status: {
        type: String,
        enum: ["waiting", "active", "live", "completed", "cancelled"],
        default: "waiting"
    },
    winner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    challenge: {
        title: String,
        description: String,
        data: mongoose.Schema.Types.Mixed // Stores { javascript: {...}, python: {...} }
    },
    startedAt: Date,
    completedAt: Date
}, { timestamps: true });

module.exports = mongoose.model("Match", matchSchema);
