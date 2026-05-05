const mongoose = require("mongoose");

const missionSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
        },
        difficulty: {
            type: String,
            enum: ["easy", "medium", "hard", "expert"],
            default: "easy",
        },
        level: {
            type: Number,
            required: true,
            min: 1,
        },
        order: {
            type: Number,
            required: true,
            min: 1,
        },
        prerequisiteMissionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Mission",
            default: null,
        },
        challenges: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Challenge",
            },
        ],
    },
    { timestamps: true }
);

missionSchema.pre("validate", function normalizeLevelOrder() {
    if ((this.level === undefined || this.level === null) && this.order !== undefined) {
        this.level = this.order;
    }
    if ((this.order === undefined || this.order === null) && this.level !== undefined) {
        this.order = this.level;
    }
});

missionSchema.index({ order: 1 });
missionSchema.index({ level: 1 });

module.exports = mongoose.model("Mission", missionSchema);
