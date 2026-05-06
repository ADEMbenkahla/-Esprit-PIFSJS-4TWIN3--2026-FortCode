const Match = require("../models/Match");

exports.getMatchById = async (req, res) => {
    try {
        const { id } = req.params;
        const match = await Match.findById(id).populate("players.user", "username avatar");

        if (!match) {
            return res.status(404).json({ message: "Match not found" });
        }

        res.status(200).json({ match });
    } catch (error) {
        console.error("Error fetching match:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

exports.getCurrentMatch = async (req, res) => {
    try {
        const userId = req.user.id;

        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const match = await Match.findOne({
            "players.user": userId,
            status: { $in: ["waiting", "live"] },
            createdAt: { $gte: tenMinutesAgo }
        }).sort({ createdAt: -1 });

        res.status(200).json({ match });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
