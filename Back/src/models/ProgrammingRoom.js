const mongoose = require("mongoose");

const programmingRoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  language: {
    type: String,
    enum: ["javascript", "python", "java", "cpp", "csharp", "go", "rust", "typescript"],
    default: "javascript"
  },
  difficulty: {
    type: String,
    enum: ["beginner", "intermediate", "advanced", "expert"],
    default: "intermediate"
  },
  maxParticipants: {
    type: Number,
    default: 10,
    min: 2,
    max: 50
  },
  currentParticipants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  duration: {
    type: Number, // in minutes
    default: 60,
    min: 15,
    max: 240
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ["waiting", "active", "completed", "cancelled"],
    default: "waiting"
  },
  scheduledAt: {
    type: Date
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  roomCode: {
    type: String,
    unique: true,
    sparse: true
  }
}, { timestamps: true });

// Generate a unique room code before saving
programmingRoomSchema.pre('save', function(next) {
  if (!this.roomCode) {
    this.roomCode = generateRoomCode();
  }
  next();
});

// Generate a random 6-character room code
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Indexes for performance
programmingRoomSchema.index({ creatorId: 1, status: 1 });
programmingRoomSchema.index({ status: 1, scheduledAt: 1 });
programmingRoomSchema.index({ roomCode: 1 });

module.exports = mongoose.model("ProgrammingRoom", programmingRoomSchema);
