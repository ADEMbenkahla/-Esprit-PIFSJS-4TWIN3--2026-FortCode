const mongoose = require('mongoose');
const Stage = require('./src/models/Stage');
const Mission = require('./src/models/Mission');
require('dotenv').config();

async function cleanup() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const missions = await Mission.find({}, { title: 1 });
        const titles = missions.map(m => m.title);

        const result = await Stage.deleteMany({ title: { $in: titles } });
        console.log(`Deleted ${result.deletedCount} duplicate stages from the Stages collection.`);

        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}
cleanup();
