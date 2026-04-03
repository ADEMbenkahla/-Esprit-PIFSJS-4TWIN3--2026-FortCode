const mongoose = require("mongoose");

const stageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard", "expert"],
      default: "easy",
    },
    order: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      enum: ["training", "mission"],
      default: "training",
    },
    prerequisiteStageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stage",
      default: null,
    },
    challenges: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Challenge",
      },
    ],
  },
  { timestamps: true }
);

stageSchema.index({ category: 1, order: 1 });

module.exports = mongoose.model("Stage", stageSchema);
