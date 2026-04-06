const mongoose = require("mongoose");

const userStageProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    stageId: {
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
  },
  { timestamps: true }
);

userStageProgressSchema.index({ userId: 1, stageId: 1 }, { unique: true });

module.exports = mongoose.model("UserStageProgress", userStageProgressSchema);
