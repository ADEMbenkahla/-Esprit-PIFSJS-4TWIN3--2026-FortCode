const mongoose = require('mongoose');
const Stage = require('./src/models/Stage');
const Mission = require('./src/models/Mission');
const Challenge = require('./src/models/Challenge');
require('dotenv').config();

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // Find all stages that were missions (they might still have the category if not strictly validated yet)
        const missionStages = await Stage.find({ category: 'mission' });
        console.log(`Found ${missionStages.length} mission stages to migrate.`);

        for (const s of missionStages) {
            const exists = await Mission.findOne({ title: s.title });
            if (exists) {
                console.log(`Mission "${s.title}" already exists in Missions collection. Skipping.`);
                continue;
            }

            const newMission = new Mission({
                title: s.title,
                description: s.description,
                level: s.level,
                difficulty: s.difficulty,
                category: 'mission',
                challenges: s.challenges,
                order: s.order,
                icon: s.icon,
                // prerequisiteStageId might need mapping to prerequisiteMissionId if relevant
            });

            await newMission.save();
            console.log(`Migrated: ${s.title}`);
        }

        console.log('Migration complete.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
