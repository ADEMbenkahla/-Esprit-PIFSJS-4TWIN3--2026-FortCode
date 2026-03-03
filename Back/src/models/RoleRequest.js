const mongoose = require("mongoose");

const roleRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  requestedRole: {
    type: String,
    enum: ["recruiter"],
    required: true
  },
  justification: {
    type: String,
    required: true,
    minlength: 20,
    maxlength: 500
  },
  proofDocument: {
    type: String, // Chemin du fichier uploadé
    required: false
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  reviewedAt: {
    type: Date
  },
  adminComment: {
    type: String,
    maxlength: 500
  }
}, { timestamps: true });

// Index pour optimiser les requêtes
roleRequestSchema.index({ userId: 1, status: 1 });
roleRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("RoleRequest", roleRequestSchema);
