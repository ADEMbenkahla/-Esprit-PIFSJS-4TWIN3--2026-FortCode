const mongoose = require("mongoose");

const challengeSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true,
        trim: true
    },
    description: { 
        type: String, 
        required: true 
    },
    difficulty: { 
        type: String, 
        enum: ["easy", "medium", "hard"],
        default: "medium"
    },
    category: { 
        type: String,
        required: true
    },
    type: { 
        type: String, 
        enum: ["Stage", "Battle"],
        required: true
    },
    constraints: { 
        type: String 
    }
}, { timestamps: true });

module.exports = mongoose.model("Challenge", challengeSchema);
