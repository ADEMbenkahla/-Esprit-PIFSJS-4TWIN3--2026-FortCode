const mongoose = require("mongoose");

const battleChallengeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], default: "Medium" },
    languages: {
        javascript: {
            starterCode: { type: String, required: true },
            tests: { type: String, required: true }
        },
        python: {
            starterCode: { type: String, required: true },
            tests: { type: String, required: true }
        }
    }
}, { timestamps: true });

module.exports = mongoose.model("BattleChallenge", battleChallengeSchema);
