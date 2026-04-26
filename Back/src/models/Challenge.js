const mongoose = require("mongoose");

const testCaseSchema = new mongoose.Schema(
  {
    name: { type: String, default: "Test" },
    assertion: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const challengeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard", "expert"],
      default: "medium",
    },
    language: {
      type: String,
      enum: ["javascript", "python", "java", "cpp", "csharp", "go", "rust", "typescript"],
      default: "javascript",
    },
    starterCode: {
      type: String,
      default: "",
    },
    testCases: {
      type: [testCaseSchema],
      default: [],
    },
    category: {
      type: String,
      default: "general",
    },
    type: {
      type: String,
      enum: ["Stage", "Battle"],
      default: "Stage",
    },
    /** Training stage that owns this challenge (Stage type). Null = pool / not assigned. Battle challenges stay null. */
    stageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stage",
      default: null,
    },
    constraints: {
      type: String,
    },
    xpReward: {
      type: Number,
      default: 100,
    },
  },
  { timestamps: true }
);

challengeSchema.index({ type: 1, stageId: 1 });
challengeSchema.index({ stageId: 1 });

module.exports = mongoose.model("Challenge", challengeSchema);
