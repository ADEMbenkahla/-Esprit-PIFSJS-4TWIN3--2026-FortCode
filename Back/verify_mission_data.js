const mongoose = require('mongoose');
const Mission = require('./src/models/Mission');
require('dotenv').config();

async function verify() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const missions = await Mission.find().populate('challenges');
        console.log(`Verified ${missions.length} missions.`);
        missions.forEach(m => {
            console.log(`- Mission: ${m.title} | Challenges: ${m.challenges.length}`);
            m.challenges.forEach(c => console.log(`  * Challenge: ${c.title}`));
        });
        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}
verify();
