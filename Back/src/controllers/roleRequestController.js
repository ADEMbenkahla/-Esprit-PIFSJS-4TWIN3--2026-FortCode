const RoleRequest = require("../models/RoleRequest");
const User = require("../models/User");

// =============================
// 📝 CREATE ROLE REQUEST (Participant)
// =============================
exports.createRoleRequest = async (req, res) => {
  try {
    const { justification } = req.body;
    const userId = req.user.id;

    // Vérifier si l'utilisateur est bien un participant
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "participant") {
      return res.status(403).json({ 
        message: "Only participants can request role upgrade" 
      });
    }

    // Vérifier s'il n'y a pas déjà une demande en attente
    const existingRequest = await RoleRequest.findOne({
      userId,
      status: "pending"
    });

    if (existingRequest) {
      return res.status(400).json({ 
        message: "You already have a pending request" 
      });
    }

    // Récupérer le chemin du fichier uploadé (si présent)
    const proofDocument = req.file ? `/uploads/proof-documents/${req.file.filename}` : null;

    // Créer la demande
    const roleRequest = await RoleRequest.create({
      userId,
      requestedRole: "recruiter",
      justification,
      proofDocument
    });

    await roleRequest.populate("userId", "username email avatar");

    res.status(201).json({
      message: "Role request submitted successfully",
      request: roleRequest
    });

  } catch (error) {
    console.error("Create Role Request Error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// =============================
// 📋 GET MY ROLE REQUESTS (Participant)
// =============================
exports.getMyRoleRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await RoleRequest.find({ userId })
      .populate("reviewedBy", "username email")
      .sort({ createdAt: -1 });

    res.json({ requests });

  } catch (error) {
    console.error("Get My Role Requests Error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// =============================
// 📋 GET ALL ROLE REQUESTS (Admin)
// =============================
exports.getAllRoleRequests = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      filter.status = status;
    }

    const requests = await RoleRequest.find(filter)
      .populate("userId", "username email avatar nickname")
      .populate("reviewedBy", "username email")
      .sort({ createdAt: -1 });

    res.json({ requests });

  } catch (error) {
    console.error("Get All Role Requests Error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// =============================
// ✅ APPROVE ROLE REQUEST (Admin)
// =============================
exports.approveRoleRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminComment } = req.body;
    const adminId = req.user.id;

    const roleRequest = await RoleRequest.findById(requestId);
    if (!roleRequest) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (roleRequest.status !== "pending") {
      return res.status(400).json({ 
        message: "This request has already been processed" 
      });
    }

    // Mettre à jour la demande
    roleRequest.status = "approved";
    roleRequest.reviewedBy = adminId;
    roleRequest.reviewedAt = new Date();
    roleRequest.adminComment = adminComment || "";
    await roleRequest.save();

    // Mettre à jour le rôle de l'utilisateur
    await User.findByIdAndUpdate(roleRequest.userId, {
      role: roleRequest.requestedRole
    });

    await roleRequest.populate("userId", "username email avatar");
    await roleRequest.populate("reviewedBy", "username email");

    res.json({
      message: "Role request approved successfully",
      request: roleRequest
    });

  } catch (error) {
    console.error("Approve Role Request Error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// =============================
// ❌ REJECT ROLE REQUEST (Admin)
// =============================
exports.rejectRoleRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminComment } = req.body;
    const adminId = req.user.id;

    const roleRequest = await RoleRequest.findById(requestId);
    if (!roleRequest) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (roleRequest.status !== "pending") {
      return res.status(400).json({ 
        message: "This request has already been processed" 
      });
    }

    // Mettre à jour la demande
    roleRequest.status = "rejected";
    roleRequest.reviewedBy = adminId;
    roleRequest.reviewedAt = new Date();
    roleRequest.adminComment = adminComment || "";
    await roleRequest.save();

    await roleRequest.populate("userId", "username email avatar");
    await roleRequest.populate("reviewedBy", "username email");

    res.json({
      message: "Role request rejected",
      request: roleRequest
    });

  } catch (error) {
    console.error("Reject Role Request Error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// =============================
// 🗑️ DELETE ROLE REQUEST (Admin or User)
// =============================
exports.deleteRoleRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const roleRequest = await RoleRequest.findById(requestId);
    if (!roleRequest) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Seul l'utilisateur qui a créé la demande ou un admin peut la supprimer
    if (roleRequest.userId.toString() !== userId.toString() && userRole !== "admin") {
      return res.status(403).json({ 
        message: "You don't have permission to delete this request" 
      });
    }

    // On ne peut supprimer que les demandes en attente ou rejetées
    if (roleRequest.status === "approved") {
      return res.status(400).json({ 
        message: "Cannot delete approved requests" 
      });
    }

    await RoleRequest.findByIdAndDelete(requestId);

    res.json({ message: "Role request deleted successfully" });

  } catch (error) {
    console.error("Delete Role Request Error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};
