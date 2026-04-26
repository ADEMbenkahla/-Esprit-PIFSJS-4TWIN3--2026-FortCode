const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const Stage = require("../models/Stage");
const Challenge = require("../models/Challenge");

const inspect = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) throw new Error("MONGO_URI not found");

        await mongoose.connect(mongoUri);
        console.log("Connected to DB");

        const allChallenges = await Challenge.find({});
        console.log("CHALLENGES IN DB:");
        allChallenges.forEach(c => console.log(`- ID: ${c._id.toString()} | Title: ${c.title}`));

        const allStages = await Stage.find({});
        console.log("STAGES IN DB:");
        allStages.forEach(s => {
            const ids = (s.challenges || []).map(id => id.toString());
            console.log(`- Stage: ${s.title} | Linked IDs: ${ids.join(", ")}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

inspect();
