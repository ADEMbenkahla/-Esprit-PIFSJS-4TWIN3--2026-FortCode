const mongoose = require("mongoose");
const UserProgress = require("../models/UserProgress");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const clearProgress = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) throw new Error("MONGO_URI not found");

        await mongoose.connect(mongoUri);
        await UserProgress.deleteMany({});
        console.log("UserProgress collection cleared to resolve schema conflicts.");
        process.exit(0);
    } catch (error) {
        console.error("Clearing failed:", error);
        process.exit(1);
    }
};

clearProgress();
