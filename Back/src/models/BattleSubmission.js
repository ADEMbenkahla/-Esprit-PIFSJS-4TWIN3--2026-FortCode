const mongoose = require("mongoose");

const battleSubmissionSchema = new mongoose.Schema(
  {
    battleRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BattleRoom",
      required: true,
    },
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    code: {
      type: String,
      default: "",
    },
    score: {
      type: Number,
      default: 0,
    },
    executionTimeMs: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "submitted", "evaluated"],
      default: "pending",
    },
    // Recruiter evaluation (User Story 4.5)
    recruiterComment: { type: String, default: "" },
    recruiterRating: { type: Number, min: 0, max: 5, default: null },
    // Placeholders for SonarQube and AI feedback (User Story 4.5)
    sonarSummary: { type: String, default: "" },
    aiFeedback: { type: String, default: "" },
    // Performance metrics
    metrics: {
      efficiency: { type: String, default: "" },
      readability: { type: String, default: "" },
      passedTests: { type: Number, default: 0 },
      totalTests: { type: Number, default: 0 },
    },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

battleSubmissionSchema.index({ battleRoom: 1, participant: 1 }, { unique: true });

module.exports = mongoose.model("BattleSubmission", battleSubmissionSchema);
