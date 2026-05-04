const mongoose = require('mongoose');
const UserStageProgress = require('./src/models/UserStageProgress');
const Stage = require('./src/models/Stage');
require('dotenv').config({ path: '.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('=== USER PROGRESS ===');
  const progresses = await UserStageProgress.find({}).populate('stageId');
  progresses.forEach(progress => {
    console.log(`Stage: ${progress.stageId.title} (category: ${progress.stageId.category})`);
    console.log(`Status: ${progress.status}`);
    console.log(`Completed Challenges: ${progress.completedChallenges.length}`);
    console.log(`Progress: ${progress.progressPercent}%`);
    console.log('---');
  });
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
