const mongoose = require('mongoose');
const Stage = require('./src/models/Stage');
require('dotenv').config();

async function update() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const result = await Stage.updateMany({}, { category: 'training' });
        console.log(`Updated ${result.modifiedCount} stages to 'training' category.`);

        // Also cleanup: any stage that was migrated to Mission probably shouldn't be here
        // But for now, let's just make sure they are 'training' if they exist.

        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}
update();
