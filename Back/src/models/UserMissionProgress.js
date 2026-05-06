const mongoose = require("mongoose");

const userMissionProgressSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        missionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Stage",
            required: true,
        },
        status: {
            type: String,
            enum: ["locked", "available", "in-progress", "completed"],
            default: "available",
        },
        completedChallenges: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Challenge",
            },
        ],
        progressPercent: {
            type: Number,
            min: 0,
            max: 100,
            default: 0,
        },
        completedAt: {
            type: Date,
            default: null,
        },
        failedAttemptsByChallenge: {
            type: Map,
            of: Number,
            default: {},
        },
        lastCodeByChallenge: {
            type: Map,
            of: String,
            default: {},
        },
        starsByChallenge: {
            type: Map,
            of: Number,
            default: {},
        },
        lastSubmissionReport: {
            type: Map,
            of: Object,
            default: {},
        },
    },
    { timestamps: true }
);

userMissionProgressSchema.index({ userId: 1, missionId: 1 }, { unique: true });

module.exports = mongoose.model("UserMissionProgress", userMissionProgressSchema);
