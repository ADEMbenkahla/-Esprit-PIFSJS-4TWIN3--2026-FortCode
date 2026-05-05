process.env.JWT_SECRET = 'test-secret-key-2024';
process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const Stage = require('../../src/models/Stage');
const Challenge = require('../../src/models/Challenge');
const {
  attachChallengeToStage,
  detachChallengeFromStage,
  moveChallengeToStage,
  replaceStageChallenges,
  clearStageIdForDeletedStage
} = require('../../src/utils/stageChallengeSync');

beforeAll(async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fortcode_test';
  await mongoose.connect(mongoURI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Stage Challenge Sync - Tests Complets', () => {
  let stage1;
  let stage2;
  let stageChallenge;
  let battleChallenge;
  let anotherChallenge;

  beforeEach(async () => {
    await Challenge.deleteMany({});
    await Stage.deleteMany({});

    // Créer des stages
    stage1 = await Stage.create({
      title: 'Stage 1',
      description: 'First stage',
      level: 1,
      order: 1,
      challenges: []
    });

    stage2 = await Stage.create({
      title: 'Stage 2',
      description: 'Second stage',
      level: 2,
      order: 2,
      challenges: []
    });

    // Créer des challenges Stage
    stageChallenge = await Challenge.create({
      title: 'Stage Challenge',
      description: 'For stage',
      type: 'Stage',
      language: 'javascript',
      testCases: []
    });

    anotherChallenge = await Challenge.create({
      title: 'Another Stage Challenge',
      description: 'Another for stage',
      type: 'Stage',
      language: 'javascript',
      testCases: []
    });

    // Créer un challenge Battle
    battleChallenge = await Challenge.create({
      title: 'Battle Challenge',
      description: 'For battle',
      type: 'Battle',
      language: 'javascript',
      testCases: []
    });
  });

  // ==================== attachChallengeToStage ====================
  describe('attachChallengeToStage', () => {
    
    test('1. Attacher challenge Stage à un stage - succès', async () => {
      const result = await attachChallengeToStage(stage1._id, stageChallenge._id);
      
      expect(result).toBeDefined();
      expect(result.stageId.toString()).toBe(stage1._id.toString());
      
      const updatedStage = await Stage.findById(stage1._id);
      expect(updatedStage.challenges).toContainEqual(stageChallenge._id);
    });

    test('2. Attacher challenge Battle à un stage - erreur', async () => {
      await expect(attachChallengeToStage(stage1._id, battleChallenge._id))
        .rejects.toThrow('Battle challenges cannot belong to a training stage');
    });

    test('3. Attacher challenge inexistant - erreur', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(attachChallengeToStage(stage1._id, fakeId))
        .rejects.toThrow('Challenge not found');
    });

    test('4. Attacher challenge déjà dans un autre stage - le retire de l\'ancien', async () => {
      // D'abord attacher au stage1
      await attachChallengeToStage(stage1._id, stageChallenge._id);
      
      // Puis attacher au stage2
      await attachChallengeToStage(stage2._id, stageChallenge._id);
      
      const updatedStage1 = await Stage.findById(stage1._id);
      const updatedStage2 = await Stage.findById(stage2._id);
      
      expect(updatedStage1.challenges).not.toContainEqual(stageChallenge._id);
      expect(updatedStage2.challenges).toContainEqual(stageChallenge._id);
    });
  });

  // ==================== detachChallengeFromStage ====================
  describe('detachChallengeFromStage', () => {
    
    test('5. Détacher challenge d\'un stage - succès', async () => {
      // D'abord attacher
      await attachChallengeToStage(stage1._id, stageChallenge._id);
      
      // Puis détacher
      await detachChallengeFromStage(stage1._id, stageChallenge._id);
      
      const updatedChallenge = await Challenge.findById(stageChallenge._id);
      expect(updatedChallenge.stageId).toBeNull();
    });

    test('6. Détacher challenge non attaché - ne fait rien', async () => {
      await detachChallengeFromStage(stage1._id, stageChallenge._id);
      
      const updatedChallenge = await Challenge.findById(stageChallenge._id);
      expect(updatedChallenge.stageId).toBeNull();
    });
  });

  // ==================== moveChallengeToStage ====================
  describe('moveChallengeToStage', () => {
    
    test('7. Déplacer challenge vers un stage - succès', async () => {
      const result = await moveChallengeToStage(stageChallenge._id, stage1._id);
      
      expect(result.stageId.toString()).toBe(stage1._id.toString());
      
      const updatedStage = await Stage.findById(stage1._id);
      expect(updatedStage.challenges).toContainEqual(stageChallenge._id);
    });

    test('8. Déplacer challenge vers le pool (null) - succès', async () => {
      // D'abord attacher à un stage
      await attachChallengeToStage(stage1._id, stageChallenge._id);
      
      // Puis déplacer vers null
      const result = await moveChallengeToStage(stageChallenge._id, null);
      
      expect(result.stageId).toBeNull();
      
      const updatedStage = await Stage.findById(stage1._id);
      expect(updatedStage.challenges).not.toContainEqual(stageChallenge._id);
    });

    test('9. Déplacer challenge Battle vers un stage - erreur', async () => {
      await expect(moveChallengeToStage(battleChallenge._id, stage1._id))
        .rejects.toThrow('Battle challenges cannot be attached to a stage');
    });

    test('10. Déplacer challenge inexistant - erreur', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(moveChallengeToStage(fakeId, stage1._id))
        .rejects.toThrow('Challenge not found');
    });

    test('11. Déplacer challenge vers stage inexistant - erreur', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(moveChallengeToStage(stageChallenge._id, fakeId))
        .rejects.toThrow('Stage not found');
    });

    test('12. Déplacer challenge d\'un stage à un autre', async () => {
      // Attacher au stage1
      await attachChallengeToStage(stage1._id, stageChallenge._id);
      
      // Déplacer vers stage2
      await moveChallengeToStage(stageChallenge._id, stage2._id);
      
      const updatedStage1 = await Stage.findById(stage1._id);
      const updatedStage2 = await Stage.findById(stage2._id);
      
      expect(updatedStage1.challenges).not.toContainEqual(stageChallenge._id);
      expect(updatedStage2.challenges).toContainEqual(stageChallenge._id);
    });
  });

  // ==================== replaceStageChallenges ====================
  describe('replaceStageChallenges', () => {
    
    test('13. Remplacer la liste des challenges - succès', async () => {
      const result = await replaceStageChallenges(stage1._id, [
        stageChallenge._id,
        anotherChallenge._id
      ]);
      
      expect(result.challenges.length).toBe(2);
      expect(result.challenges).toContainEqual(stageChallenge._id);
      expect(result.challenges).toContainEqual(anotherChallenge._id);
    });

    test('14. Remplacer avec des IDs en double - erreur', async () => {
      await expect(replaceStageChallenges(stage1._id, [
        stageChallenge._id,
        stageChallenge._id
      ])).rejects.toThrow('Duplicate challenge IDs in list');
    });

    test('15. Remplacer avec un ID invalide - erreur', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(replaceStageChallenges(stage1._id, [
        stageChallenge._id,
        fakeId
      ])).rejects.toThrow('One or more challenge IDs are invalid');
    });

    test('16. Remplacer avec un challenge Battle - erreur', async () => {
      await expect(replaceStageChallenges(stage1._id, [
        stageChallenge._id,
        battleChallenge._id
      ])).rejects.toThrow('Cannot assign Battle-type challenges');
    });

    test('17. Remplacer dans stage inexistant - erreur', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(replaceStageChallenges(fakeId, [stageChallenge._id]))
        .rejects.toThrow('Stage not found');
    });

    test('18. Remplacer - retire les challenges qui ne sont plus dans la liste', async () => {
      // D'abord ajouter deux challenges
      await replaceStageChallenges(stage1._id, [stageChallenge._id, anotherChallenge._id]);
      
      // Puis remplacer par un seul
      await replaceStageChallenges(stage1._id, [stageChallenge._id]);
      
      const updatedStage = await Stage.findById(stage1._id);
      expect(updatedStage.challenges.length).toBe(1);
      expect(updatedStage.challenges).toContainEqual(stageChallenge._id);
      expect(updatedStage.challenges).not.toContainEqual(anotherChallenge._id);
    });
  });

  // ==================== clearStageIdForDeletedStage ====================
  describe('clearStageIdForDeletedStage', () => {
    
    test('19. Nettoyer stageId pour stage supprimé - succès', async () => {
      // Attacher des challenges au stage
      await attachChallengeToStage(stage1._id, stageChallenge._id);
      await attachChallengeToStage(stage1._id, anotherChallenge._id);
      
      await clearStageIdForDeletedStage(stage1._id);
      
      const updatedChallenge1 = await Challenge.findById(stageChallenge._id);
      const updatedChallenge2 = await Challenge.findById(anotherChallenge._id);
      
      expect(updatedChallenge1.stageId).toBeNull();
      expect(updatedChallenge2.stageId).toBeNull();
    });

    test('20. Nettoyer stageId - aucun challenge attaché', async () => {
      await clearStageIdForDeletedStage(stage1._id);
      
      // Ne devrait pas planter
      expect(true).toBe(true);
    });
  });
});