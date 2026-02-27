const mongoose = require("mongoose");

const battleRoomSchema = new mongoose.Schema(
  {
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    // Participants invited to this room (only they can see and join the battle)
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    challenge: {
      title: { type: String, required: true },
      description: { type: String, default: "" },
      starterCode: { type: String, default: "" },
      language: { type: String, default: "javascript" },
    },
    timeLimitMinutes: {
      type: Number,
      required: true,
      min: 1,
      max: 300,
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "live", "ended"],
      default: "draft",
    },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

battleRoomSchema.index({ recruiter: 1, status: 1 });
battleRoomSchema.index({ participants: 1 });

module.exports = mongoose.model("BattleRoom", battleRoomSchema);
