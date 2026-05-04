const mongoose = require('mongoose');
const User = require('./src/models/User');
const Stage = require('./src/models/Stage');
const Challenge = require('./src/models/Challenge');
const UserStageProgress = require('./src/models/UserStageProgress');
require('dotenv').config({ path: '.env' });

async function debugProgress() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Simuler l'ID d'un utilisateur qui a complété le training
  const userId = '69a7e74352c9b932b2f67a19'; // ID utilisateur test
  
  console.log('=== DEBUG PROGRESSION ===');
  console.log(`UserID: ${userId}`);
  
  // 1. Récupérer tous les stages de mission
  const missionStages = await Stage.find({ category: 'mission' })
    .populate('challenges');
  
  console.log(`\n=== STAGES MISSION (${missionStages.length}) ===`);
  missionStages.forEach(stage => {
    console.log(`Stage: ${stage.title}`);
    console.log(`  Challenges: ${stage.challenges.map(c => c.title).join(', ')}`);
  });
  
  // 2. Récupérer toutes les progressions utilisateur
  const allProgress = await UserStageProgress.find({ userId })
    .populate('stageId');
  
  console.log(`\n=== TOUTES LES PROGRESSIONS (${allProgress.length}) ===`);
  allProgress.forEach(prog => {
    console.log(`Stage: ${prog.stageId.title} (category: ${prog.stageId.category})`);
    console.log(`  Status: ${prog.status}`);
    console.log(`  Completed: ${prog.completedChallenges.length}/${prog.stageId.challenges?.length || 0}`);
    console.log(`  Progress: ${prog.progressPercent}%`);
    console.log(`  StageID: ${prog.stageId._id}`);
  });
  
  // 3. Vérifier la correspondance pour les stages de mission
  console.log(`\n=== VÉRIFICATION MISSION ===`);
  for (const missionStage of missionStages) {
    const progress = allProgress.find(p => p.stageId._id.toString() === missionStage._id.toString());
    console.log(`\nStage: ${missionStage.title}`);
    console.log(`  Progress trouvé: ${progress ? 'OUI' : 'NON'}`);
    
    if (progress) {
      console.log(`  Progress status: ${progress.status}`);
      console.log(`  Completed challenges: ${progress.completedChallenges.length}`);
      console.log(`  Total challenges: ${missionStage.challenges.length}`);
      
      // Vérifier si les challenges complétés font partie de ce stage
      const completedChallengeIds = progress.completedChallenges.map(c => c.toString());
      const stageChallengeIds = missionStage.challenges.map(c => c._id.toString());
      
      console.log(`  Completed challenge IDs: [${completedChallengeIds.join(', ')}]`);
      console.log(`  Stage challenge IDs: [${stageChallengeIds.join(', ')}]`);
      
      const intersection = completedChallengeIds.filter(id => stageChallengeIds.includes(id));
      console.log(`  Intersection (challenges de ce stage complétés): ${intersection.length}`);
      
      if (intersection.length > 0) {
        console.log(`  ⚠️  PROBLÈME: Des challenges de training sont comptés comme complétés pour ce stage de mission!`);
      }
    }
  }
  
  process.exit(0);
}

debugProgress().catch(err => {
  console.error(err);
  process.exit(1);
});
