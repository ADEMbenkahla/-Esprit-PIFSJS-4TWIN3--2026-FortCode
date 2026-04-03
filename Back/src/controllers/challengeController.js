const Challenge = require("../models/Challenge");

// Create a new challenge
exports.createChallenge = async (req, res) => {
    try {
        const { title, description, difficulty, category, type, constraints } = req.body;
        const newChallenge = new Challenge({
            title,
            description,
            difficulty,
            category,
            type,
            constraints
        });
        const savedChallenge = await newChallenge.save();
        res.status(201).json(savedChallenge);
    } catch (error) {
        console.error("Error creating challenge:", error);
        res.status(500).json({ message: "Error creating challenge", error: error.message });
    }
};

// Get all challenges
exports.getAllChallenges = async (req, res) => {
    try {
        const challenges = await Challenge.find().sort({ createdAt: -1 });
        res.status(200).json(challenges);
    } catch (error) {
        console.error("Error fetching challenges:", error);
        res.status(500).json({ message: "Error fetching challenges", error: error.message });
    }
};

// Get a single challenge by ID
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

// Update a challenge
exports.updateChallenge = async (req, res) => {
    try {
        const { title, description, difficulty, category, type, constraints } = req.body;
        const updatedChallenge = await Challenge.findByIdAndUpdate(
            req.params.id,
            { title, description, difficulty, category, type, constraints },
            { new: true, runValidators: true }
        );
        if (!updatedChallenge) {
            return res.status(404).json({ message: "Challenge not found" });
        }
        res.status(200).json(updatedChallenge);
    } catch (error) {
        console.error("Error updating challenge:", error);
        res.status(500).json({ message: "Error updating challenge", error: error.message });
    }
};

// Delete a challenge
exports.deleteChallenge = async (req, res) => {
    try {
        const deletedChallenge = await Challenge.findByIdAndDelete(req.params.id);
        if (!deletedChallenge) {
            return res.status(404).json({ message: "Challenge not found" });
        }
        res.status(200).json({ message: "Challenge deleted successfully" });
    } catch (error) {
        console.error("Error deleting challenge:", error);
        res.status(500).json({ message: "Error deleting challenge", error: error.message });
    }
};
