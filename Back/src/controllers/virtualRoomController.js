const VirtualRoomRequest = require("../models/VirtualRoomRequest");
const crypto = require("crypto");

async function generateUniqueRoomSlug() {
  // short, URL-safe, hard to guess
  for (let i = 0; i < 8; i += 1) {
    const slug = `fortcode-${crypto.randomBytes(10).toString("hex")}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await VirtualRoomRequest.exists({ roomSlug: slug });
    if (!exists) return slug;
  }
  throw new Error("Could not generate a unique virtual room slug");
}

function buildInternalRoomLink(roomSlug) {
  return `/virtual-room/${roomSlug}`;
}

// Recruiter: create a new virtual room request
exports.createVirtualRoomRequest = async (req, res) => {
  try {
    // authMiddleware attaches { id, role } to req.user
    const recruiterId = req.user && (req.user.id || req.user._id);

    if (!recruiterId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role !== "recruiter") {
      return res.status(403).json({ message: "Only recruiters can request a virtual room" });
    }

    // Prevent multiple active requests
    const existingActive = await VirtualRoomRequest.findOne({
      recruiter: recruiterId,
      status: { $in: ["pending", "approved"] }
    });

    if (existingActive) {
      return res.status(400).json({
        message: "You already have an active virtual room request",
        request: existingActive
      });
    }

    const { message } = req.body || {};

    const request = await VirtualRoomRequest.create({
      recruiter: recruiterId,
      adminMessage: "",
      roomSlug: "",
      roomLink: "",
      status: "pending",
      note: message
    });

    return res.status(201).json({
      message: "Virtual room request submitted successfully",
      request
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error while creating virtual room request",
      error: error.message
    });
  }
};

// Recruiter: get latest virtual room request status
exports.getMyVirtualRoomRequest = async (req, res) => {
  try {
    // authMiddleware attaches { id, role } to req.user
    const recruiterId = req.user && (req.user.id || req.user._id);

    if (!recruiterId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const request = await VirtualRoomRequest.findOne({ recruiter: recruiterId })
      .sort({ createdAt: -1 });

    if (!request) {
      return res.status(404).json({ message: "No virtual room request found" });
    }

    return res.json({
      message: "Virtual room request retrieved successfully",
      request
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error while fetching virtual room request",
      error: error.message
    });
  }
};

// Admin: list all virtual room requests
exports.getAllVirtualRoomRequests = async (req, res) => {
  try {
    const { status } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    const requests = await VirtualRoomRequest.find(query)
      .populate("recruiter", "username email role")
      .sort({ createdAt: -1 });

    return res.json({
      message: "Virtual room requests retrieved successfully",
      requests
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error while fetching virtual room requests",
      error: error.message
    });
  }
};

// Admin: update a virtual room request status / details
exports.updateVirtualRoomRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminMessage } = req.body;

    const validStatuses = ["pending", "approved", "rejected"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Allowed statuses: ${validStatuses.join(", ")}`
      });
    }

    const request = await VirtualRoomRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: "Virtual room request not found" });
    }

    if (status) {
      request.status = status;
    }
    if (typeof adminMessage === "string") {
      request.adminMessage = adminMessage;
    }

    // When approved, auto-generate an in-app virtual room (no manual meet link).
    if (request.status === "approved") {
      if (!request.roomSlug) {
        request.roomSlug = await generateUniqueRoomSlug();
      }
      request.roomLink = buildInternalRoomLink(request.roomSlug);
    }

    await request.save();

    return res.json({
      message: "Virtual room request updated successfully",
      request
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error while updating virtual room request",
      error: error.message
    });
  }
};


