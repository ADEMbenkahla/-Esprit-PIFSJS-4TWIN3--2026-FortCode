const mongoose = require('mongoose');
const User = require('./src/models/User');
const Stage = require('./src/models/Stage');
const Challenge = require('./src/models/Challenge');
const UserStageProgress = require('./src/models/UserStageProgress');
require('dotenv').config({ path: '.env' });

// Simuler la logique de getMyStages
async function testGetMyStages() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Récupérer un utilisateur test
  const user = await User.findOne();
  if (!user) {
    console.log('Aucun utilisateur trouvé');
    return;
  }
  
  const userId = user._id;
  const category = "mission";
  const query = {};
  if (category) query.category = category;

  console.log(`=== Test getMyStages pour userId: ${userId}, category: ${category} ===`);
  
  const stages = await Stage.find(query)
    .sort({ level: 1, order: 1 })
    .populate("prerequisiteStageId", "title order")
    .populate("challenges", "title difficulty language");

  console.log(`Found ${stages.length} stages with category: ${category}`);
  
  const progresses = await UserStageProgress.find({ userId });
  console.log(`Found ${progresses.length} progress entries for user`);
  
  const byStage = new Map(progresses.map((p) => [p.stageId.toString(), p]));

  const enriched = [];
  for (const stage of stages) {
    const prog = byStage.get(stage._id.toString());
    const total = stage.challenges?.length || 0;
    const done = prog?.completedChallenges?.length || 0;

    let participantStatus = "available";
    let progressPercent = total ? Math.round((done / total) * 100) : 0;
    let completedChallenges = prog?.completedChallenges || [];
    let completedAt = prog?.completedAt || null;

    if (prog) {
      participantStatus =
        prog.status === "completed"
          ? "completed"
          : done > 0
            ? "in-progress"
            : "available";
    }

    console.log(`\nStage: ${stage.title}`);
    console.log(`  Category: ${stage.category}`);
    console.log(`  Progress found: ${prog ? 'YES' : 'NO'}`);
    console.log(`  Completed challenges: ${done}/${total}`);
    console.log(`  Status: ${participantStatus}`);
    console.log(`  Progress: ${progressPercent}%`);
    
    if (prog) {
      console.log(`  Progress stage ID: ${prog.stageId}`);
      console.log(`  Current stage ID: ${stage._id}`);
      console.log(`  IDs match: ${prog.stageId.toString() === stage._id.toString()}`);
    }
  }
  
  process.exit(0);
}

testGetMyStages().catch(err => {
  console.error(err);
  process.exit(1);
});
