const mongoose = require("mongoose");

const stageSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ["training", "mission"],
        default: "training"
    },
    level: {
        type: Number,
        required: true
    },
    difficulty: {
        type: String,
        enum: ["beginner", "intermediate", "advanced", "expert"],
        default: "beginner"
    },
    type: {
        type: String,
        enum: ["training", "battle", "boss"],
        default: "training"
    },
    stars: {
        type: Number,
        default: 3
    },
    prerequisites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Stage"
    }],
    challenges: [{
        id: { type: Number, required: true },
        title: { type: String, required: true },
        description: { type: String, required: true },
        starterCode: { type: String, default: "" },
        tests: { type: String, default: "" },
        language: { type: String, enum: ["javascript", "python"], default: "javascript" }
    }]
}, { timestamps: true });

module.exports = mongoose.model("Stage", stageSchema);
