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
    level: {
      type: Number,
      required: true,
      min: 1,
    },
    order: {
      type: Number,
      required: true,
      min: 1,
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

stageSchema.pre("validate", function normalizeLevelOrder() {
  if ((this.level === undefined || this.level === null) && this.order !== undefined) {
    this.level = this.order;
  }
  if ((this.order === undefined || this.order === null) && this.level !== undefined) {
    this.order = this.level;
  }
});

stageSchema.index({ category: 1, order: 1 });
stageSchema.index({ category: 1, level: 1 });

module.exports = mongoose.model("Stage", stageSchema);
