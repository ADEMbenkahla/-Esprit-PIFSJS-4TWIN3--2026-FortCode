const Challenge = require("../models/Challenge");
const Stage = require("../models/Stage");

function sanitizeTestCases(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t) => t && typeof t === "object")
    .map((t) => ({
      name: (t.name && String(t.name).trim()) || "Test",
      assertion: t.assertion != null ? String(t.assertion) : "",
    }));
}

exports.createChallenge = async (req, res) => {
  try {
    const {
      title,
      description,
      difficulty,
      category,
      type,
      constraints,
      language,
      starterCode,
      testCases,
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: "Le titre est requis." });
    }
    if (!description || !String(description).trim()) {
      return res.status(400).json({ message: "La description est requise." });
    }

    const newChallenge = new Challenge({
      title: String(title).trim(),
      description: String(description).trim(),
      difficulty: difficulty || "medium",
      category: (category && String(category).trim()) || "general",
      type: type || "Stage",
      constraints,
      language: language || "javascript",
      starterCode: starterCode != null ? String(starterCode) : "",
      testCases: sanitizeTestCases(testCases),
    });
    const savedChallenge = await newChallenge.save();
    res.status(201).json(savedChallenge);
  } catch (error) {
    console.error("Error creating challenge:", error);
    res.status(500).json({ message: "Error creating challenge", error: error.message });
  }
};

exports.getAllChallenges = async (req, res) => {
  try {
    const challenges = await Challenge.find().sort({ createdAt: -1 });
    res.status(200).json(challenges);
  } catch (error) {
    console.error("Error fetching challenges:", error);
    res.status(500).json({ message: "Error fetching challenges", error: error.message });
  }
};

exports.getChallengeById = async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({ message: "Challenge not found" });
    }
    res.status(200).json(challenge);
  } catch (error) {
    console.error("Error fetching challenge:", error);
    res.status(500).json({ message: "Error fetching challenge", error: error.message });
  }
};

exports.updateChallenge = async (req, res) => {
  try {
    const allowed = [
      "title",
      "description",
      "difficulty",
      "category",
      "type",
      "constraints",
      "language",
      "starterCode",
      "testCases",
    ];
    const updates = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        if (key === "testCases") {
          updates.testCases = sanitizeTestCases(req.body.testCases);
        } else {
          updates[key] = req.body[key];
        }
      }
    }
    if (updates.title !== undefined) updates.title = String(updates.title).trim();
    if (updates.description !== undefined) updates.description = String(updates.description).trim();
    if (updates.category !== undefined) {
      updates.category = (updates.category && String(updates.category).trim()) || "general";
    }
    if (updates.starterCode !== undefined) updates.starterCode = String(updates.starterCode ?? "");

    const updatedChallenge = await Challenge.findByIdAndUpdate(req.params.id, { $set: updates }, {
      new: true,
      runValidators: true,
    });
    if (!updatedChallenge) {
      return res.status(404).json({ message: "Challenge not found" });
    }
    res.status(200).json(updatedChallenge);
  } catch (error) {
    console.error("Error updating challenge:", error);
    res.status(500).json({ message: "Error updating challenge", error: error.message });
  }
};

exports.deleteChallenge = async (req, res) => {
  try {
    const deletedChallenge = await Challenge.findByIdAndDelete(req.params.id);
    if (!deletedChallenge) {
      return res.status(404).json({ message: "Challenge not found" });
    }
    await Stage.updateMany({}, { $pull: { challenges: deletedChallenge._id } });
    res.status(200).json({ message: "Challenge deleted successfully" });
  } catch (error) {
    console.error("Error deleting challenge:", error);
    res.status(500).json({ message: "Error deleting challenge", error: error.message });
  }
};
