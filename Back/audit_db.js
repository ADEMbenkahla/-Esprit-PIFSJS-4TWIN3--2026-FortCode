const mongoose = require('mongoose');
const Stage = require('./src/models/Stage');
const Mission = require('./src/models/Mission');
require('dotenv').config();

async function audit() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const missionCount = await Mission.countDocuments();
        const stageCount = await Stage.countDocuments();

        console.log('--- DATABASE AUDIT ---');
        console.log(`Total Missions: ${missionCount}`);
        console.log(`Total Stages: ${stageCount}`);

        const missions = await Mission.find();
        console.log('\n--- MISSIONS (World Map) ---');
        missions.forEach(m => console.log(`- ${m.title} (${m.challenges.length} challenges)`));

        const stages = await Stage.find();
        console.log('\n--- STAGES (Training Grounds) ---');
        stages.forEach(s => console.log(`- ${s.title} (${s.category})`));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
audit();
