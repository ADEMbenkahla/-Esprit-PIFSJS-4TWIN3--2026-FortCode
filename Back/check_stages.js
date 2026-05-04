const mongoose = require('mongoose');
const Stage = require('./src/models/Stage');
const Challenge = require('./src/models/Challenge');
require('dotenv').config({ path: '.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const stages = await Stage.find({}).populate('challenges');
  console.log('=== STAGES ===');
  stages.forEach(stage => {
    console.log(`Stage: ${stage.title} (category: ${stage.category})`);
    console.log(`Challenges: ${stage.challenges.map(c => c.title).join(', ')}`);
    console.log('---');
  });
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
