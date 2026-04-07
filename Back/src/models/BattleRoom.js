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
    invitations: [
      {
        email: { type: String, required: true, lowercase: true, trim: true },
        tokenHash: { type: String, required: true },
        codeHash: { type: String, required: true },
        status: {
          type: String,
          enum: ["pending", "accepted", "expired", "cancelled"],
          default: "pending",
        },
        invitedAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true },
        acceptedAt: { type: Date, default: null },
        acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      },
    ],
    challenge: {
      title: { type: String, required: true },
      description: { type: String, default: "" },
      starterCode: { type: String, default: "" },
      language: { type: String, default: "javascript" },
      generatedExerciseSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
      testCases: {
        type: [
          {
            name: { type: String, default: "" },
            assertion: { type: String, default: "" },
            hidden: { type: Boolean, default: true },
          },
        ],
        default: [],
      },
      statementAttachment: {
        fileName: { type: String, default: "" },
        originalName: { type: String, default: "" },
        mimeType: { type: String, default: "" },
        size: { type: Number, default: 0 },
        url: { type: String, default: "" },
      },
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
    visitorAccessCount: {
      type: Number,
      default: 0,
    },
    visitorAccessedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

battleRoomSchema.index({ recruiter: 1, status: 1 });
battleRoomSchema.index({ participants: 1 });
battleRoomSchema.index({ "invitations.email": 1, "invitations.status": 1 });

module.exports = mongoose.model("BattleRoom", battleRoomSchema);
