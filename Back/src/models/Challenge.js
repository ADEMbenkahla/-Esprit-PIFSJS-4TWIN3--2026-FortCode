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
    constraints: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Challenge", challengeSchema);
