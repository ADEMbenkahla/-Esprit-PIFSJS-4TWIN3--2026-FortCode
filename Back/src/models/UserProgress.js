const mongoose = require("mongoose");

const userProgressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    stage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Stage",
        required: true
    },
    completedChallenges: [{
        challengeId: { type: Number, required: true },
        code: { type: String, required: true },
        stars: { type: Number, default: 0 }
    }],
    isCompleted: {
        type: Boolean,
        default: false
    },
    stars: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Ensure unique progress per user and stage
userProgressSchema.index({ user: 1, stage: 1 }, { unique: true });

module.exports = mongoose.model("UserProgress", userProgressSchema);
