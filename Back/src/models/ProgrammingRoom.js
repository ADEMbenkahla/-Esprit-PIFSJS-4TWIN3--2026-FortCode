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
  invitations: [{
    email: {
      type: String,
      trim: true,
      lowercase: true,
      required: true
    },
    inviteCode: {
      type: String,
      trim: true,
      uppercase: true,
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "sent", "opened", "accepted", "expired"],
      default: "pending"
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    openedAt: {
      type: Date
    },
    acceptedAt: {
      type: Date
    }
  }],
  challengeTitle: {
    type: String,
    trim: true,
    maxlength: 120,
    default: ""
  },
  challengeDescription: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: ""
  },
  gradingRubric: {
    totalPoints: {
      type: Number,
      default: 100,
      min: 1,
      max: 1000
    },
    criteria: [{
      label: {
        type: String,
        trim: true,
        maxlength: 80,
        default: ""
      },
      points: {
        type: Number,
        default: 0,
        min: 0,
        max: 1000
      },
      description: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ""
      }
    }]
  },
  exerciseFile: {
    url: {
      type: String,
      default: ""
    },
    originalName: {
      type: String,
      default: ""
    },
    mimeType: {
      type: String,
      default: ""
    },
    uploadedAt: {
      type: Date
    }
  },
  timeLimit: {
    type: Number,
    default: 60,
    min: 15,
    max: 240
  },
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
  executionLogs: [{
    email: {
      type: String,
      trim: true,
      lowercase: true,
      required: true
    },
    action: {
      type: String,
      enum: ["run", "submit"],
      default: "run"
    },
    status: {
      type: String,
      enum: ["success", "error"],
      default: "success"
    },
    runtimeMs: {
      type: Number,
      default: 0
    },
    errorMessage: {
      type: String,
      default: ""
    },
    suspicious: {
      type: Boolean,
      default: false
    },
    suspicionReason: {
      type: String,
      default: ""
    },
    codeSnippet: {
      type: String,
      default: ""
    },
    outputSnippet: {
      type: String,
      default: ""
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  resultSubmissions: [{
    email: {
      type: String,
      trim: true,
      lowercase: true,
      required: true
    },
    codeSnapshot: {
      type: String,
      default: ""
    },
    outputSnapshot: {
      type: String,
      default: ""
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    confirmedByRecruiter: {
      type: Boolean,
      default: false
    },
    confirmedAt: {
      type: Date
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    awardedScore: {
      type: Number,
      min: 0,
      max: 1000,
      default: 0
    },
    awardedCriteria: [{
      label: {
        type: String,
        trim: true,
        maxlength: 80,
        default: ""
      },
      points: {
        type: Number,
        default: 0,
        min: 0,
        max: 1000
      }
    }],
    recruiterFeedback: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: ""
    },
    sonarQube: {
      projectKey: {
        type: String,
        trim: true,
        default: ""
      },
      qualityGateStatus: {
        type: String,
        default: ""
      },
      scanStatus: {
        type: String,
        default: ""
      },
      metrics: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      },
      issuesCount: {
        type: Number,
        default: 0
      },
      lastSyncAt: {
        type: Date
      },
      dashboardUrl: {
        type: String,
        default: ""
      },
      errorMessage: {
        type: String,
        default: ""
      }
    }
  }],
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
