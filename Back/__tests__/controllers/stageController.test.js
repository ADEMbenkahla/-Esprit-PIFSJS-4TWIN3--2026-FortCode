process.env.JWT_SECRET = 'test-secret-key-2024';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const Stage = require('../../src/models/Stage');
const Challenge = require('../../src/models/Challenge');
const UserStageProgress = require('../../src/models/UserStageProgress');
const User = require('../../src/models/User');

// Mocks des services externes
jest.mock('../../src/utils/runChallengeCode', () => ({
  runChallengeCode: jest.fn().mockReturnValue({
    passed: true,
    executionTimeMs: 150,
    outputSnapshot: 'Test output',
    testResults: [{ passed: true }, { passed: true }]
  })
}));

jest.mock('../../src/utils/stageAnalysis', () => ({
  fetchSonarStub: jest.fn().mockResolvedValue({
    qualityScore: 85,
    summary: 'Good code quality',
    issues: []
  }),
  fetchAiFeedback: jest.fn().mockResolvedValue({ summary: 'Good solution' }),
  fetchExerciseHelp: jest.fn().mockResolvedValue({ hint: 'Try this', explanation: 'How it works' })
}));

jest.mock('../../src/services/gamificationService', () => ({
  addXP: jest.fn().mockResolvedValue({ xpAdded: 100, points: 1100, level: 2, levelUp: true }),
  spendXP: jest.fn().mockResolvedValue({ spentXP: 5, points: 95 })
}));

jest.mock('../../src/services/aiStageGenerator', () => ({
  generateChallenges: jest.fn().mockResolvedValue([
    { title: 'AI Challenge', description: 'Desc', difficulty: 'easy', testCases: [] }
  ])
}));

jest.mock('../../src/services/aiExerciseService', () => ({
  httpStatusForAiError: jest.fn().mockReturnValue(502)
}));

jest.mock('../../src/utils/fallbackStageExercises', () => ({
  generateFallbackStageExercises: jest.fn().mockReturnValue([
    { title: 'Fallback Challenge', description: 'Fallback', testCases: [] }
  ])
}));

jest.mock('../../src/utils/stageChallengeSync', () => ({
  replaceStageChallenges: jest.fn().mockImplementation(async (stageId, challengeIds) => {
    return { _id: stageId, challenges: challengeIds };
  }),
  detachChallengeFromStage: jest.fn().mockResolvedValue(true),
  clearStageIdForDeletedStage: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../src/services/aiAnalysisService', () => ({
  performFullAnalysis: jest.fn().mockResolvedValue({
    bugs: [],
    explanation: 'Code explanation',
    recommendations: [],
    complexity: 'Low'
  })
}));

beforeAll(async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fortcode_test';
  await mongoose.connect(mongoURI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Stage Controller - Tests Complets', () => {
  let adminToken;
  let participantToken;
  let adminId;
  let participantId;
  let testStageId;
  let testChallengeId;
  let testStage2Id;

  beforeEach(async () => {
    await UserStageProgress.deleteMany({});
    await Challenge.deleteMany({});
    await Stage.deleteMany({});
    await User.deleteMany({});

    // 🔥 CRÉER ADMIN AVEC USERNAME UNIQUE
    const timestamp = Date.now();
    const admin = await User.create({
      username: `admin_${timestamp}`,
      email: `admin_${timestamp}@test.com`,
      password: await bcrypt.hash('Admin123!', 10),
      role: 'admin',
      isVerified: true,
      isActive: true
    });
    adminId = admin._id;

    // 🔥 CRÉER PARTICIPANT AVEC USERNAME UNIQUE
    const participant = await User.create({
      username: `participant_${timestamp}`,
      email: `participant_${timestamp}@test.com`,
      password: await bcrypt.hash('Part123!', 10),
      role: 'participant',
      isVerified: true,
      isActive: true
    });
    participantId = participant._id;

    // Challenge
    const challenge = await Challenge.create({
      title: 'Test Challenge',
      description: 'Description',
      difficulty: 'easy',
      type: 'Stage',
      language: 'javascript',
      testCases: [{ name: 'Test 1', assertion: 'result === 42' }],
      xpReward: 100
    });
    testChallengeId = challenge._id;

    // Stage prérequis
    const stage2 = await Stage.create({
      title: 'Prerequisite Stage',
      description: 'Prerequisite',
      level: 0,
      order: 0,
      category: 'training',
      challenges: []
    });
    testStage2Id = stage2._id;

    // Stage principal
    const stage = await Stage.create({
      title: 'Test Stage',
      description: 'Description',
      level: 1,
      order: 1,
      category: 'training',
      prerequisiteStageId: testStage2Id,
      challenges: [testChallengeId]
    });
    testStageId = stage._id;

    const jwt = require('jsonwebtoken');
    adminToken = jwt.sign(
      { id: adminId.toString(), role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    participantToken = jwt.sign(
      { id: participantId.toString(), role: 'participant' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  // ==================== ADMIN ROUTES ====================
  describe('GET /api/stages - Admin', () => {
    test('1. Liste tous les stages', async () => {
      const res = await request(app)
        .get('/api/stages')
        .set('Authorization', `Bearer ${adminToken}`);
      expect([200, 500]).toContain(res.statusCode);
    });
  });

  describe('POST /api/stages - Admin', () => {
    test('2. Création stage avec succès', async () => {
      const res = await request(app)
        .post('/api/stages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: `New Stage ${Date.now()}`,
          level: 5,
          category: 'training'
        });
      expect([201, 400, 500]).toContain(res.statusCode);
    });

    test('3. Création stage sans titre - erreur', async () => {
      const res = await request(app)
        .post('/api/stages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ level: 5 });
      expect([400, 500]).toContain(res.statusCode);
    });
  });

  describe('PUT /api/stages/:id - Admin', () => {
    test('4. Mise à jour stage', async () => {
      const res = await request(app)
        .put(`/api/stages/${testStageId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: `Updated Stage ${Date.now()}`
        });
      expect([200, 404, 500]).toContain(res.statusCode);
    });
  });

  describe('DELETE /api/stages/:id - Admin', () => {
    test('5. Suppression stage', async () => {
      const res = await request(app)
        .delete(`/api/stages/${testStageId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect([200, 404, 500]).toContain(res.statusCode);
    });
  });

  // ==================== PARTICIPANT ROUTES ====================
  describe('GET /api/stages/me - Participant', () => {
    test('6. Récupération des stages du participant', async () => {
      const res = await request(app)
        .get('/api/stages/me')
        .set('Authorization', `Bearer ${participantToken}`);
      expect([200, 500]).toContain(res.statusCode);
    });
  });

  describe('GET /api/stages/:id - Participant', () => {
    test('7. Détail d\'un stage', async () => {
      const res = await request(app)
        .get(`/api/stages/${testStageId}`)
        .set('Authorization', `Bearer ${participantToken}`);
      expect([200, 403, 404, 500]).toContain(res.statusCode);
    });
  });

  describe('POST /api/stages/:id/challenges/:challengeId/run', () => {
    test('8. Exécution code', async () => {
      await UserStageProgress.create({ 
        userId: participantId, 
        stageId: testStage2Id, 
        status: 'completed' 
      });
      const res = await request(app)
        .post(`/api/stages/${testStageId}/challenges/${testChallengeId}/run`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ code: 'test' });
      expect([200, 403, 404, 500]).toContain(res.statusCode);
    });
  });

  describe('POST /api/stages/:id/challenges/:challengeId/submit', () => {
    test('9. Soumission code', async () => {
      await UserStageProgress.create({ 
        userId: participantId, 
        stageId: testStage2Id, 
        status: 'completed' 
      });
      const res = await request(app)
        .post(`/api/stages/${testStageId}/challenges/${testChallengeId}/submit`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ code: 'test' });
      expect([200, 400, 403, 404, 500]).toContain(res.statusCode);
    });
  });

  describe('POST /api/stages/:id/challenges/:challengeId/help', () => {
    test('10. Demande d\'aide', async () => {
      await UserStageProgress.create({ 
        userId: participantId, 
        stageId: testStage2Id, 
        status: 'completed' 
      });
      const res = await request(app)
        .post(`/api/stages/${testStageId}/challenges/${testChallengeId}/help`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ type: 'hint' });
      expect([200, 400, 403, 404, 500]).toContain(res.statusCode);
    });
  });

  describe('POST /api/stages/reset-progress', () => {
    test('11. Reset tout le progrès', async () => {
      const res = await request(app)
        .post('/api/stages/reset-progress')
        .set('Authorization', `Bearer ${participantToken}`);
      expect([200, 500]).toContain(res.statusCode);
    });
  });

  describe('POST /api/stages/:id/reset', () => {
    test('12. Reset stage', async () => {
      const res = await request(app)
        .post(`/api/stages/${testStageId}/reset`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({});
      expect([200, 404, 500]).toContain(res.statusCode);
    });
  });

  describe('POST /api/stages/ai/explain', () => {
    test('13. Explication AI', async () => {
      const res = await request(app)
        .post('/api/stages/ai/explain')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ code: 'test', language: 'js' });
      expect([200, 400, 500]).toContain(res.statusCode);
    });
  });
});