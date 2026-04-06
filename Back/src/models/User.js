const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  avatar: {
    type: String,
    default: ""
  },

  password: {
    type: String,
    required: false
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  role: {
    type: String,
    enum: ["participant", "admin", "recruiter"],
    default: "participant"
  },
  rating: {
    type: Number,
    default: 1000 // Elo-like rating
  },
  gamification: {
    points: { type: Number, default: 0 },
    rankedRating: { type: Number, default: 0 },
    badges: [{ type: String }],
    level: { type: Number, default: 1 },
    streak: { type: Number, default: 0 },
    rank: {
      type: String,
      enum: ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ascendant", "Immortal", "Radiant"],
      default: "Iron"
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  resetToken: String,
  resetTokenExpire: Date,

  deactivatedAt: {
    type: Date,
    default: null
  },

  isVerified: {
    type: Boolean,
    default: false
  },
  verificationCode: String,
  verificationCodeExpire: Date,


  // User personalization settings
  settings: {
    theme: {
      type: String,
      enum: ["dark", "light", "auto"],
      default: "dark"
    },
    accentColor: {
      type: String,
      enum: ["blue", "purple", "green", "amber", "red", "cyan"],
      default: "blue"
    },
    fontSize: {
      type: String,
      enum: ["small", "medium", "large", "xlarge"],
      default: "medium"
    },
    fontFamily: {
      type: String,
      enum: ["inter", "outfit", "orbitron", "serif"],
      default: "inter"
    },
    highContrast: {
      type: Boolean,
      default: false
    },
    reduceMotion: {
      type: Boolean,
      default: false
    },
    soundEnabled: {
      type: Boolean,
      default: true
    },
    twoFactor: {
      enabled: {
        type: Boolean,
        default: false
      },
      method: {
        type: String,
        enum: ["totp", "email"],
        default: "totp"
      },
      totpSecret: {
        type: String,
        default: ""
      },
      tempTotpSecret: {
        type: String,
        default: ""
      },
      emailOtpHash: {
        type: String,
        default: ""
      },
      emailOtpExpires: {
        type: Date,
        default: null
      }
    }
  },
  webauthn: [{
    credentialID: { type: String, required: true },
    publicKey: { type: String, required: true },
    counter: { type: Number, required: true },
    transports: [{ type: String }],
    fmt: { type: String },
    created: { type: Date, default: Date.now }
  }],
  currentChallenge: { type: String },
  faceDescriptor: { type: [Number], default: [] },
  faceRegistered: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
