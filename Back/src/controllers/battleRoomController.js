const BattleRoom = require("../models/BattleRoom");
const BattleSubmission = require("../models/BattleSubmission");
const User = require("../models/User");

const getRecruiterId = (req) => req.user && (req.user.id || req.user._id);

// List participants (for recruiter to select when creating a room)
exports.listParticipants = async (req, res) => {
  try {
    const users = await User.find({ role: "participant", isActive: true })
      .select("_id username email nickname")
      .sort({ username: 1 });
    return res.json({ participants: users });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create battle room (User Story 4.4)
exports.createBattleRoom = async (req, res) => {
  try {
    const recruiterId = getRecruiterId(req);
    if (!recruiterId) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "recruiter") return res.status(403).json({ message: "Forbidden" });

    const { title, description, participantIds, challenge, timeLimitMinutes } = req.body;
    if (!title || !timeLimitMinutes) {
      return res.status(400).json({ message: "Title and time limit are required" });
    }

    const room = await BattleRoom.create({
      recruiter: recruiterId,
      title,
      description: description || "",
      participants: Array.isArray(participantIds) ? participantIds : [],
      challenge: {
        title: challenge?.title || "Coding Challenge",
        description: challenge?.description || "",
        starterCode: challenge?.starterCode || "",
        language: challenge?.language || "javascript",
      },
      timeLimitMinutes: Math.min(300, Math.max(1, Number(timeLimitMinutes) || 60)),
      status: "draft",
    });

    // Create placeholder submissions for each participant
    if (room.participants.length) {
      await BattleSubmission.insertMany(
        room.participants.map((p) => ({
          battleRoom: room._id,
          participant: p,
          status: "pending",
        }))
      );
    }

    const populated = await BattleRoom.findById(room._id)
      .populate("participants", "username email nickname")
      .lean();
    return res.status(201).json({ message: "Battle room created", room: populated });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// List my battle rooms
exports.listMyBattleRooms = async (req, res) => {
  try {
    const recruiterId = getRecruiterId(req);
    if (!recruiterId) return res.status(401).json({ message: "Unauthorized" });

    const { status } = req.query;
    const filter = { recruiter: recruiterId };
    if (status) filter.status = status;

    const rooms = await BattleRoom.find(filter)
      .populate("participants", "username email nickname")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ rooms });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get one room with submissions (User Story 4.5 – monitor submissions)
exports.getBattleRoom = async (req, res) => {
  try {
    const recruiterId = getRecruiterId(req);
    if (!recruiterId) return res.status(401).json({ message: "Unauthorized" });

    const room = await BattleRoom.findOne({ _id: req.params.id, recruiter: recruiterId })
      .populate("participants", "username email nickname avatar")
      .lean();
    if (!room) return res.status(404).json({ message: "Battle room not found" });

    const submissions = await BattleSubmission.find({ battleRoom: room._id })
      .populate("participant", "username email nickname avatar")
      .sort({ updatedAt: -1 })
      .lean();
    return res.json({ room: { ...room, submissions } });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Start or end battle (User Story 4.4 & 4.6)
exports.updateBattleRoomStatus = async (req, res) => {
  try {
    const recruiterId = getRecruiterId(req);
    if (!recruiterId) return res.status(401).json({ message: "Unauthorized" });

    const { status } = req.body;
    if (!["draft", "scheduled", "live", "ended"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const room = await BattleRoom.findOne({ _id: req.params.id, recruiter: recruiterId });
    if (!room) return res.status(404).json({ message: "Battle room not found" });

    room.status = status;
    if (status === "live") room.startedAt = new Date();
    if (status === "ended") room.endedAt = new Date();
    await room.save();

    const populated = await BattleRoom.findById(room._id)
      .populate("participants", "username email nickname")
      .lean();
    return res.json({ message: "Battle room updated", room: populated });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get submissions for a room (User Story 4.5)
exports.getSubmissions = async (req, res) => {
  try {
    const recruiterId = getRecruiterId(req);
    if (!recruiterId) return res.status(401).json({ message: "Unauthorized" });

    const room = await BattleRoom.findOne({ _id: req.params.id, recruiter: recruiterId });
    if (!room) return res.status(404).json({ message: "Battle room not found" });

    const submissions = await BattleSubmission.find({ battleRoom: room._id })
      .populate("participant", "username email nickname avatar")
      .sort({ submittedAt: -1 })
      .lean();
    return res.json({ submissions });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Add recruiter comment/rating to a submission (User Story 4.5)
exports.updateSubmissionEvaluation = async (req, res) => {
  try {
    const recruiterId = getRecruiterId(req);
    if (!recruiterId) return res.status(401).json({ message: "Unauthorized" });

    const room = await BattleRoom.findOne({ _id: req.params.id, recruiter: recruiterId });
    if (!room) return res.status(404).json({ message: "Battle room not found" });

    const sub = await BattleSubmission.findOne({
      _id: req.params.subId,
      battleRoom: room._id,
    });
    if (!sub) return res.status(404).json({ message: "Submission not found" });

    const { recruiterComment, recruiterRating } = req.body;
    if (recruiterComment !== undefined) sub.recruiterComment = recruiterComment;
    if (recruiterRating !== undefined) sub.recruiterRating = Math.min(5, Math.max(0, Number(recruiterRating)));
    sub.status = "evaluated";
    await sub.save();

    const populated = await BattleSubmission.findById(sub._id)
      .populate("participant", "username email nickname")
      .lean();
    return res.json({ message: "Submission updated", submission: populated });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
