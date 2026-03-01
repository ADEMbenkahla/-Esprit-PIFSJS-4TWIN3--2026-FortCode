const ProgrammingRoom = require("../models/ProgrammingRoom");
const User = require("../models/User");

// =============================
// 🏗️ CREATE PROGRAMMING ROOM (Recruiter)
// =============================
exports.createRoom = async (req, res) => {
  try {
    const {
      name,
      description,
      language,
      difficulty,
      maxParticipants,
      duration,
      isPublic,
      scheduledAt
    } = req.body;
    
    const creatorId = req.user.id;

    // Vérifier que l'utilisateur est un recruiter
    const user = await User.findById(creatorId);
    if (!user || (user.role !== "recruiter" && user.role !== "admin")) {
      return res.status(403).json({ 
        message: "Only recruiters can create programming rooms" 
      });
    }

    const room = await ProgrammingRoom.create({
      name,
      description,
      creatorId,
      language: language || "javascript",
      difficulty: difficulty || "intermediate",
      maxParticipants: maxParticipants || 10,
      duration: duration || 60,
      isPublic: isPublic !== undefined ? isPublic : true,
      scheduledAt: scheduledAt || null
    });

    await room.populate("creatorId", "username email avatar nickname");

    res.status(201).json({
      message: "Programming room created successfully",
      room
    });

  } catch (error) {
    console.error("Create Room Error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// =============================
// 📋 GET ALL ROOMS
// =============================
exports.getAllRooms = async (req, res) => {
  try {
    const { status, language, difficulty, isPublic } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (language) filter.language = language;
    if (difficulty) filter.difficulty = difficulty;
    if (isPublic !== undefined) filter.isPublic = isPublic === 'true';

    const rooms = await ProgrammingRoom.find(filter)
      .populate("creatorId", "username email avatar nickname")
      .populate("currentParticipants.userId", "username avatar nickname")
      .sort({ createdAt: -1 });

    res.json({ rooms });

  } catch (error) {
    console.error("Get All Rooms Error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// =============================
// 🔍 GET ROOM BY ID
// =============================
exports.getRoomById = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await ProgrammingRoom.findById(roomId)
      .populate("creatorId", "username email avatar nickname")
      .populate("currentParticipants.userId", "username avatar nickname");

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json({ room });

  } catch (error) {
    console.error("Get Room Error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// =============================
// 🚪 JOIN ROOM
// =============================
exports.joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await ProgrammingRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Vérifier si la salle est complète
    if (room.currentParticipants.length >= room.maxParticipants) {
      return res.status(400).json({ message: "Room is full" });
    }

    // Vérifier si l'utilisateur est déjà dans la salle
    const alreadyJoined = room.currentParticipants.some(
      p => p.userId.toString() === userId.toString()
    );

    if (alreadyJoined) {
      return res.status(400).json({ message: "You already joined this room" });
    }

    // Ajouter l'utilisateur
    room.currentParticipants.push({ userId });
    await room.save();

    await room.populate("creatorId", "username email avatar nickname");
    await room.populate("currentParticipants.userId", "username avatar nickname");

    res.json({
      message: "Joined room successfully",
      room
    });

  } catch (error) {
    console.error("Join Room Error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// =============================
// 🚶 LEAVE ROOM
// =============================
exports.leaveRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await ProgrammingRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Retirer l'utilisateur
    room.currentParticipants = room.currentParticipants.filter(
      p => p.userId.toString() !== userId.toString()
    );
    await room.save();

    res.json({ message: "Left room successfully" });

  } catch (error) {
    console.error("Leave Room Error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// =============================
// ▶️ START ROOM (Recruiter/Creator)
// =============================
exports.startRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await ProgrammingRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Seul le créateur peut démarrer la salle
    if (room.creatorId.toString() !== userId.toString()) {
      return res.status(403).json({ 
        message: "Only the room creator can start the room" 
      });
    }

    if (room.status !== "waiting") {
      return res.status(400).json({ 
        message: "Room is not in waiting status" 
      });
    }

    room.status = "active";
    room.startedAt = new Date();
    await room.save();

    await room.populate("creatorId", "username email avatar nickname");
    await room.populate("currentParticipants.userId", "username avatar nickname");

    res.json({
      message: "Room started successfully",
      room
    });

  } catch (error) {
    console.error("Start Room Error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// =============================
// ✅ COMPLETE ROOM (Recruiter/Creator)
// =============================
exports.completeRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await ProgrammingRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Seul le créateur peut compléter la salle
    if (room.creatorId.toString() !== userId.toString()) {
      return res.status(403).json({ 
        message: "Only the room creator can complete the room" 
      });
    }

    room.status = "completed";
    room.completedAt = new Date();
    await room.save();

    res.json({
      message: "Room completed successfully",
      room
    });

  } catch (error) {
    console.error("Complete Room Error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// =============================
// 🗑️ DELETE ROOM (Recruiter/Creator or Admin)
// =============================
exports.deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const room = await ProgrammingRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Seul le créateur ou un admin peut supprimer
    if (room.creatorId.toString() !== userId.toString() && userRole !== "admin") {
      return res.status(403).json({ 
        message: "You don't have permission to delete this room" 
      });
    }

    // On ne peut supprimer que les salles en attente ou terminées
    if (room.status === "active") {
      return res.status(400).json({ 
        message: "Cannot delete an active room" 
      });
    }

    await ProgrammingRoom.findByIdAndDelete(roomId);

    res.json({ message: "Room deleted successfully" });

  } catch (error) {
    console.error("Delete Room Error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};
