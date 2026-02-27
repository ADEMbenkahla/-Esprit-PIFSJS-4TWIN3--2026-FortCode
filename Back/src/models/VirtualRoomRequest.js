const mongoose = require("mongoose");

const virtualRoomRequestSchema = new mongoose.Schema(
  {
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    note: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    adminMessage: {
      type: String,
      default: ""
    },
    // Auto-generated interview room identifier (used for in-app integration).
    // When approved, recruiters join `/virtual-room/:roomSlug` inside FortCode.
    roomSlug: {
      type: String,
      default: "",
      unique: true,
      sparse: true,
      index: true
    },
    roomLink: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("VirtualRoomRequest", virtualRoomRequestSchema);


