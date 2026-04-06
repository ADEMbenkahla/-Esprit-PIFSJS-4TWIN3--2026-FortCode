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
    recruiterConfirmed: { type: Boolean, default: false },
    confirmedAt: { type: Date, default: null },
    // Placeholders for SonarQube and AI feedback (User Story 4.5)
    sonarSummary: { type: String, default: "" },
    sonarSource: { type: String, default: "" },
    sonarProjectKey: { type: String, default: "" },
    qualityGateStatus: { type: String, default: "" },
    sonarMetrics: {
      bugs: { type: Number, default: null },
      vulnerabilities: { type: Number, default: null },
      codeSmells: { type: Number, default: null },
      securityRating: { type: String, default: "" },
      reliabilityRating: { type: String, default: "" },
      maintainabilityRating: { type: String, default: "" },
      securityHotspotsReviewed: { type: Number, default: null },
      duplications: { type: Number, default: null },
    },
    aiFeedback: { type: String, default: "" },
    qualityScore: { type: Number, min: 0, max: 100, default: null },
    qualityGrade: { type: String, default: "" },
    correctnessScore: { type: Number, min: 0, max: 100, default: null },
    finalScore: { type: Number, min: 0, max: 100, default: null },
    offTopic: { type: Boolean, default: false },
    qualityIssues: {
      type: [
        {
          severity: { type: String, default: "INFO" },
          message: { type: String, default: "" },
        },
      ],
      default: [],
    },
    securityAlerts: { type: [String], default: [] },
    // Anti-fraud tracking: set when participant leaves tab/window during live battle.
    fraudDetected: { type: Boolean, default: false },
    fraudReason: { type: String, default: "" },
    fraudEventsCount: { type: Number, default: 0 },
    fraudDetectedAt: { type: Date, default: null },
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
