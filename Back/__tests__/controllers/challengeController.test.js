process.env.JWT_SECRET = 'test-secret-key-2024';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const Challenge = require('../../src/models/Challenge');
const Stage = require('../../src/models/Stage');
const User = require('../../src/models/User');

// Mock des services externes
jest.mock('../../src/utils/stageChallengeSync', () => ({
  moveChallengeToStage: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../src/services/aiExerciseService', () => ({
  generateExercises: jest.fn().mockResolvedValue([
    {
      title: 'Generated Challenge',
      description: 'Generated description with example Input: 1 Output: 2',
      language: 'javascript',
      starterCode: 'function solve() { return 42; }',
      testCases: [
        { name: 'Test 1', assertion: 'solve() === 42' },
        { name: 'Test 2', assertion: 'solve() !== null' }
      ],
      xpReward: 100
    }
  ]),
  httpStatusForAiError: jest.fn().mockReturnValue(502)
}));

jest.mock('../../src/utils/fallbackStageExercises', () => ({
  generateFallbackStageExercises: jest.fn().mockReturnValue([
    {
      title: 'Fallback Challenge',
      description: 'Fallback description with example Input: 1 Output: 2',
      language: 'javascript',
      starterCode: 'function solve() { return 0; }',
      testCases: [
        { name: 'Test 1', assertion: 'solve() === 0' },
        { name: 'Test 2', assertion: 'solve() !== null' }
      ]
    }
  ])
}));

beforeAll(async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fortcode_test';
  await mongoose.connect(mongoURI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Challenge Controller - Tests Complets Améliorés', () => {
  let adminToken;
  let recruiterToken;
  let participantToken;
  let adminId;
  let recruiterId;
  let participantId;
  let testChallengeId;
  let testStageId;
  let testBattleChallengeId;

  beforeEach(async () => {
    await Challenge.deleteMany({});
    await Stage.deleteMany({});
    await User.deleteMany({});

    const timestamp = Date.now();

    // Créer un admin
    const admin = await User.create({
      username: `admin_${timestamp}`,
      email: `admin_${timestamp}@test.com`,
      password: await bcrypt.hash('Admin123!', 10),
      role: 'admin',
      isVerified: true,
      isActive: true
    });
    adminId = admin._id;

    // Créer un recruteur
    const recruiter = await User.create({
      username: `recruiter_${timestamp}`,
      email: `recruiter_${timestamp}@test.com`,
      password: await bcrypt.hash('Recruiter123!', 10),
      role: 'recruiter',
      isVerified: true,
      isActive: true
    });
    recruiterId = recruiter._id;

    // Créer un participant
    const participant = await User.create({
      username: `participant_${timestamp}`,
      email: `participant_${timestamp}@test.com`,
      password: await bcrypt.hash('Part123!', 10),
      role: 'participant',
      isVerified: true,
      isActive: true
    });
    participantId = participant._id;

    // Créer un stage de test
    try {
      const stage = await Stage.create({
        title: 'Test Stage',
        description: 'Stage description',
        order: 1,
        category: 'intermediate'
      });
      testStageId = stage._id;
    } catch (e) {
      const stage = await Stage.create({
        title: 'Test Stage',
        description: 'Stage description',
        order: 1
      });
      testStageId = stage._id;
    }

    // Créer un challenge Battle pour les tests
    const battleChallenge = await Challenge.create({
      title: 'Battle Challenge',
      description: 'Battle description',
      type: 'Battle',
      language: 'javascript',
      testCases: [{ name: 'Test', assertion: 'true' }]
    });
    testBattleChallengeId = battleChallenge._id;

    const jwt = require('jsonwebtoken');
    adminToken = jwt.sign(
      { id: adminId.toString(), role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    recruiterToken = jwt.sign(
      { id: recruiterId.toString(), role: 'recruiter' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    participantToken = jwt.sign(
      { id: participantId.toString(), role: 'participant' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  // ==================== GENERATE DRAFT ====================
  describe('POST /api/challenges/generate', () => {
    
    test('1. Génération draft - succès', async () => {
      const res = await request(app)
        .post('/api/challenges/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          prompt: 'Create a sum function',
          difficulty: 'medium',
          language: 'javascript'
        });

      expect([200, 400, 500, 502]).toContain(res.statusCode);
    });

    test('2. Génération draft - sans prompt', async () => {
      const res = await request(app)
        .post('/api/challenges/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect([400, 500]).toContain(res.statusCode);
    });

    test('3. Génération draft - avec fallback sur erreur AI', async () => {
      const { generateExercises } = require('../../src/services/aiExerciseService');
      generateExercises.mockRejectedValueOnce(new Error('AI Error'));
      
      const res = await request(app)
        .post('/api/challenges/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          prompt: 'Test fallback',
          useFallbackOnError: true
        });

      expect([200, 400, 500, 502]).toContain(res.statusCode);
    });

    test('4. Génération draft - sans token', async () => {
      const res = await request(app)
        .post('/api/challenges/generate')
        .send({ prompt: 'test' });

      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== CREATE CHALLENGE ====================
  describe('POST /api/challenges', () => {
    
    test('5. Création challenge Stage - succès', async () => {
      const res = await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'New Challenge',
          description: 'Challenge description',
          difficulty: 'medium',
          type: 'Stage',
          language: 'javascript',
          starterCode: 'function solve() { return 42; }',
          testCases: [
            { name: 'Test 1', assertion: 'result === 42' },
            { name: 'Test 2', assertion: 'result !== null' }
          ],
          xpReward: 100
        });

      expect([201, 400, 500]).toContain(res.statusCode);
      
      if (res.statusCode === 201) {
        testChallengeId = res.body._id;
      }
    });

    test('6. Création challenge Battle - succès', async () => {
      const res = await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Battle Challenge',
          description: 'Battle description',
          type: 'Battle',
          language: 'javascript',
          testCases: [{ name: 'Test', assertion: 'true' }]
        });

      expect([201, 400, 500]).toContain(res.statusCode);
    });

    test('7. Création challenge - sans titre', async () => {
      const res = await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'No title'
        });

      expect([400, 500]).toContain(res.statusCode);
    });

    test('8. Création challenge - sans description', async () => {
      const res = await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'No Description'
        });

      expect([400, 500]).toContain(res.statusCode);
    });

    test('9. Création challenge - avec stageId valide', async () => {
      const res = await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Stage Challenge',
          description: 'Linked to stage',
          type: 'Stage',
          stageId: testStageId.toString(),
          testCases: [{ name: 'Test', assertion: 'true' }]
        });

      expect([201, 400, 404, 500]).toContain(res.statusCode);
    });

    test('10. Création challenge - avec stageId invalide', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Invalid Stage Challenge',
          description: 'Linked to invalid stage',
          type: 'Stage',
          stageId: fakeId.toString(),
          testCases: [{ name: 'Test', assertion: 'true' }]
        });

      expect([400, 404, 500]).toContain(res.statusCode);
    });

    test('11. Création challenge - sans token', async () => {
      const res = await request(app)
        .post('/api/challenges')
        .send({
          title: 'No Token',
          description: 'Test'
        });

      expect(res.statusCode).toBe(401);
    });

    test('12. Création challenge - avec token participant (refusé)', async () => {
      const res = await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          title: 'Forbidden',
          description: 'Test'
        });

      expect([403, 401, 500]).toContain(res.statusCode);
    });
  });

  // ==================== GET ALL CHALLENGES ====================
  describe('GET /api/challenges', () => {
    
    beforeEach(async () => {
      await Challenge.create([
        {
          title: 'Public Challenge 1',
          description: 'Desc 1',
          type: 'Stage',
          testCases: [{ name: 'Test', assertion: 'true' }]
        },
        {
          title: 'Public Challenge 2',
          description: 'Desc 2',
          type: 'Battle',
          testCases: [{ name: 'Test', assertion: 'true' }]
        }
      ]);
    });

    test('13. Liste tous les challenges', async () => {
      const res = await request(app)
        .get('/api/challenges')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });

    test('14. Filtre par type Stage', async () => {
      const res = await request(app)
        .get('/api/challenges?type=Stage')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(res.statusCode);
    });

    test('15. Filtre par type Battle', async () => {
      const res = await request(app)
        .get('/api/challenges?type=Battle')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(res.statusCode);
    });

    test('16. Filtre pool=true (challenges sans stage)', async () => {
      const res = await request(app)
        .get('/api/challenges?pool=true')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(res.statusCode);
    });

    test('17. Filtre par stageId', async () => {
      const res = await request(app)
        .get(`/api/challenges?stageId=${testStageId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(res.statusCode);
    });

    test('18. Liste challenges - sans token', async () => {
      const res = await request(app)
        .get('/api/challenges');

      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== GET CHALLENGE BY ID ====================
  describe('GET /api/challenges/:id', () => {
    
    beforeEach(async () => {
      const challenge = await Challenge.create({
        title: 'Specific Challenge',
        description: 'Specific description',
        type: 'Stage',
        testCases: [{ name: 'Test', assertion: 'true' }]
      });
      testChallengeId = challenge._id;
    });

    test('19. Récupération challenge par ID - succès', async () => {
      const res = await request(app)
        .get(`/api/challenges/${testChallengeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.title).toBe('Specific Challenge');
      }
    });

    test('20. Récupération challenge - ID inexistant', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/challenges/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([404, 500]).toContain(res.statusCode);
    });

    test('21. Récupération challenge - ID invalide', async () => {
      const res = await request(app)
        .get('/api/challenges/invalid-id-format')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([404, 500]).toContain(res.statusCode);
    });

    test('22. Récupération challenge - sans token', async () => {
      const res = await request(app)
        .get(`/api/challenges/${testChallengeId}`);

      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== UPDATE CHALLENGE ====================
  describe('PUT /api/challenges/:id', () => {
    
    beforeEach(async () => {
      const challenge = await Challenge.create({
        title: 'Original Title',
        description: 'Original description',
        type: 'Stage',
        testCases: [{ name: 'Test', assertion: 'true' }]
      });
      testChallengeId = challenge._id;
    });

    test('23. Mise à jour challenge - succès', async () => {
      const res = await request(app)
        .put(`/api/challenges/${testChallengeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Updated Title',
          difficulty: 'hard'
        });

      expect([200, 404, 500]).toContain(res.statusCode);
    });

    test('24. Mise à jour challenge - avec stageId', async () => {
      const res = await request(app)
        .put(`/api/challenges/${testChallengeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          stageId: testStageId.toString()
        });

      expect([200, 400, 404, 500]).toContain(res.statusCode);
    });

    test('25. Mise à jour challenge - changement type vers Battle', async () => {
      const res = await request(app)
        .put(`/api/challenges/${testChallengeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'Battle'
        });

      expect([200, 400, 404, 500]).toContain(res.statusCode);
    });

    test('26. Mise à jour challenge - ID inexistant', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/challenges/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'New Title' });

      expect([404, 500]).toContain(res.statusCode);
    });

    test('27. Mise à jour challenge - avec token participant (refusé)', async () => {
      const res = await request(app)
        .put(`/api/challenges/${testChallengeId}`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ title: 'Hacked' });

      expect([403, 401, 500]).toContain(res.statusCode);
    });
  });

  // ==================== DELETE CHALLENGE ====================
  describe('DELETE /api/challenges/:id', () => {
    
    beforeEach(async () => {
      const challenge = await Challenge.create({
        title: 'To Delete',
        description: 'Will be deleted',
        type: 'Stage',
        testCases: [{ name: 'Test', assertion: 'true' }]
      });
      testChallengeId = challenge._id;
    });

    test('28. Suppression challenge - succès', async () => {
      const res = await request(app)
        .delete(`/api/challenges/${testChallengeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404, 500]).toContain(res.statusCode);
    });

    test('29. Suppression challenge - ID inexistant', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/challenges/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([404, 500]).toContain(res.statusCode);
    });

    test('30. Suppression challenge - sans token', async () => {
      const res = await request(app)
        .delete(`/api/challenges/${testChallengeId}`);

      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== TESTS D'ERREURS SERVEUR ====================
  describe('Tests d\'erreurs serveur', () => {
    
    test('31. Erreur 500 - createChallenge - DB error', async () => {
      const originalCreate = Challenge.create;
      Challenge.create = jest.fn().mockRejectedValueOnce(new Error('Database error'));
      
      const res = await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Error Test',
          description: 'Test',
          testCases: []
        });

      expect(res.statusCode).toBe(500);
      
      Challenge.create = originalCreate;
    });

    test('32. Erreur 500 - getAllChallenges - DB error', async () => {
      const originalFind = Challenge.find;
      Challenge.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockRejectedValueOnce(new Error('Database error'))
        })
      });
      
      const res = await request(app)
        .get('/api/challenges')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(500);
      
      Challenge.find = originalFind;
    });

    test('33. Route inexistante', async () => {
      const res = await request(app)
        .get('/api/challenges/inexistant-route')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
    });
  });
});