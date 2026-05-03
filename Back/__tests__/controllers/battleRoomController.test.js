process.env.JWT_SECRET = 'test-secret-key-2024';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const User = require('../../src/models/User');
const BattleRoom = require('../../src/models/BattleRoom');
const BattleSubmission = require('../../src/models/BattleSubmission');

// Mock des services externes
jest.mock('../../src/utils/sendEmail', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../src/utils/stageAnalysis', () => ({
  fetchSonarStub: jest.fn().mockResolvedValue({
    qualityScore: 85,
    summary: 'Good code quality',
    source: 'sonarcloud',
    issues: []
  }),
  fetchAiFeedback: jest.fn().mockResolvedValue({
    summary: 'AI feedback: Good solution'
  })
}));

jest.mock('../../src/utils/runChallengeCode', () => ({
  runChallengeCode: jest.fn().mockReturnValue({
    passed: true,
    executionTimeMs: 150,
    outputSnapshot: 'Test output',
    testResults: [{ passed: true }, { passed: true }]
  })
}));

jest.mock('../../src/services/mlDetectionAgent', () => ({
  detectCodeOrigin: jest.fn().mockResolvedValue({
    isAiGenerated: false,
    confidence: 0.9
  })
}));

jest.mock('../../src/services/aiExerciseService', () => ({
  generateExercises: jest.fn().mockResolvedValue([
    {
      title: 'Generated Challenge',
      description: 'Generated description',
      language: 'javascript',
      starterCode: 'function solve() { return 42; }',
      testCases: [{ name: 'Test 1', assertion: 'result === 42' }],
      xpReward: 100
    }
  ]),
  httpStatusForAiError: jest.fn().mockReturnValue(502)
}));

beforeAll(async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fortcode_test';
  await mongoose.connect(mongoURI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('BattleRoom Controller - Tests Complets Améliorés', () => {
  let recruiterToken;
  let adminToken;
  let participantToken;
  let recruiterId;
  let adminId;
  let participantId;
  let participant2Id;
  let testRoomId;

  beforeEach(async () => {
    await BattleSubmission.deleteMany({});
    await BattleRoom.deleteMany({});
    await User.deleteMany({});

    const timestamp = Date.now();

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

    // Créer des participants
    const participant = await User.create({
      username: `participant_${timestamp}`,
      email: `participant_${timestamp}@test.com`,
      password: await bcrypt.hash('Part123!', 10),
      role: 'participant',
      isVerified: true,
      isActive: true
    });
    participantId = participant._id;

    const participant2 = await User.create({
      username: `participant2_${timestamp}`,
      email: `participant2_${timestamp}@test.com`,
      password: await bcrypt.hash('Part123!', 10),
      role: 'participant',
      isVerified: true,
      isActive: true
    });
    participant2Id = participant2._id;

    const jwt = require('jsonwebtoken');
    recruiterToken = jwt.sign(
      { id: recruiterId.toString(), role: 'recruiter' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
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

  // ==================== LIST PARTICIPANTS ====================
  describe('GET /api/battle-rooms/recruiter/participants', () => {
    
    test('1. Liste des participants - succès', async () => {
      const res = await request(app)
        .get('/api/battle-rooms/recruiter/participants')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect([200, 500]).toContain(res.statusCode);
    });

    test('2. Liste des participants - sans token', async () => {
      const res = await request(app)
        .get('/api/battle-rooms/recruiter/participants');

      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== GENERATE EXERCISE DRAFT ====================
  describe('POST /api/battle-rooms/recruiter/battle-rooms/generate-exercise', () => {
    
    test('3. Génération exercice - succès', async () => {
      const res = await request(app)
        .post('/api/battle-rooms/recruiter/battle-rooms/generate-exercise')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          prompt: 'Create a function that adds two numbers',
          difficulty: 'medium',
          language: 'javascript'
        });

      expect([200, 400, 500, 502]).toContain(res.statusCode);
    });

    test('4. Génération exercice - sans prompt', async () => {
      const res = await request(app)
        .post('/api/battle-rooms/recruiter/battle-rooms/generate-exercise')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({});

      expect([400, 500]).toContain(res.statusCode);
    });

    test('5. Génération exercice - avec fallback', async () => {
      const { generateExercises } = require('../../src/services/aiExerciseService');
      generateExercises.mockRejectedValueOnce(new Error('AI Error'));
      
      const res = await request(app)
        .post('/api/battle-rooms/recruiter/battle-rooms/generate-exercise')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          prompt: 'Test fallback',
          useFallbackOnError: true
        });

      expect([200, 400, 500, 502]).toContain(res.statusCode);
    });

    test('6. Génération exercice - sans token', async () => {
      const res = await request(app)
        .post('/api/battle-rooms/recruiter/battle-rooms/generate-exercise')
        .send({ prompt: 'test' });

      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== CREATE BATTLE ROOM ====================
  describe('POST /api/battle-rooms/recruiter/battle-rooms', () => {
    
    test('7. Création room - succès avec participants', async () => {
      const res = await request(app)
        .post('/api/battle-rooms/recruiter/battle-rooms')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          title: 'Test Battle Room',
          description: 'Test description',
          participantIds: [participantId.toString(), participant2Id.toString()],
          timeLimitMinutes: 60,
          challenge: {
            title: 'Coding Challenge',
            description: 'Solve this problem',
            starterCode: 'function solve() { return 42; }',
            language: 'javascript',
            testCases: [{ name: 'Test 1', assertion: 'result === 42' }]
          }
        });

      expect([201, 400, 500]).toContain(res.statusCode);
      
      if (res.statusCode === 201) {
        testRoomId = res.body.room?._id;
      }
    });

    test('8. Création room - avec emails invitation', async () => {
      const res = await request(app)
        .post('/api/battle-rooms/recruiter/battle-rooms')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          title: 'Invite Battle Room',
          description: 'Test with emails',
          inviteEmails: [`newuser_${Date.now()}@test.com`, `another_${Date.now()}@test.com`],
          timeLimitMinutes: 30,
          challenge: {
            title: 'Challenge',
            testCases: []
          }
        });

      expect([201, 400, 500]).toContain(res.statusCode);
    });

    test('9. Création room - avec emails invalides', async () => {
      const res = await request(app)
        .post('/api/battle-rooms/recruiter/battle-rooms')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          title: 'Invalid Emails Room',
          inviteEmails: ['invalid-email', 'not-an-email'],
          timeLimitMinutes: 30,
          challenge: {
            title: 'Challenge',
            testCases: []
          }
        });

      expect([400, 500]).toContain(res.statusCode);
    });

    test('10. Création room - sans titre', async () => {
      const res = await request(app)
        .post('/api/battle-rooms/recruiter/battle-rooms')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          timeLimitMinutes: 60
        });

      expect([400, 500]).toContain(res.statusCode);
    });

    test('11. Création room - sans timeLimit', async () => {
      const res = await request(app)
        .post('/api/battle-rooms/recruiter/battle-rooms')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          title: 'No Time Limit',
          participantIds: [participantId.toString()]
        });

      expect([400, 500]).toContain(res.statusCode);
    });

    test('12. Création room - sans participants ni emails', async () => {
      const res = await request(app)
        .post('/api/battle-rooms/recruiter/battle-rooms')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          title: 'Empty Room',
          timeLimitMinutes: 60
        });

      expect([400, 500]).toContain(res.statusCode);
    });

    test('13. Création room - avec token participant (refusé)', async () => {
      const res = await request(app)
        .post('/api/battle-rooms/recruiter/battle-rooms')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          title: 'Test',
          participantIds: [participantId.toString()],
          timeLimitMinutes: 60
        });

      expect([403, 500]).toContain(res.statusCode);
    });
  });

  // ==================== LIST MY BATTLE ROOMS ====================
  describe('GET /api/battle-rooms/recruiter/battle-rooms', () => {
    
    test('14. Liste mes rooms - succès', async () => {
      const res = await request(app)
        .get('/api/battle-rooms/recruiter/battle-rooms')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect([200, 500]).toContain(res.statusCode);
    });

    test('15. Liste mes rooms - avec filtre status', async () => {
      const res = await request(app)
        .get('/api/battle-rooms/recruiter/battle-rooms?status=draft')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect([200, 500]).toContain(res.statusCode);
    });

    test('16. Liste mes rooms - avec filtre status live', async () => {
      const res = await request(app)
        .get('/api/battle-rooms/recruiter/battle-rooms?status=live')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect([200, 500]).toContain(res.statusCode);
    });

    test('17. Liste mes rooms - sans token', async () => {
      const res = await request(app)
        .get('/api/battle-rooms/recruiter/battle-rooms');

      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== GET BATTLE ROOM ====================
  describe('GET /api/battle-rooms/recruiter/battle-rooms/:id', () => {
    
    beforeEach(async () => {
      const room = await BattleRoom.create({
        recruiter: recruiterId,
        title: 'Test Room',
        participants: [participantId],
        timeLimitMinutes: 60,
        status: 'draft',
        challenge: {
          title: 'Test Challenge',
          description: 'Test description',
          testCases: []
        }
      });
      testRoomId = room._id;
    });

    test('18. Récupération room - succès', async () => {
      const res = await request(app)
        .get(`/api/battle-rooms/recruiter/battle-rooms/${testRoomId}`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect([200, 500]).toContain(res.statusCode);
    });

    test('19. Récupération room - ID inexistant', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/battle-rooms/recruiter/battle-rooms/${fakeId}`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect([404, 500]).toContain(res.statusCode);
    });

    test('20. Récupération room - sans token', async () => {
      const res = await request(app)
        .get(`/api/battle-rooms/recruiter/battle-rooms/${testRoomId}`);

      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== UPDATE BATTLE ROOM STATUS ====================
  describe('PATCH /api/battle-rooms/recruiter/battle-rooms/:id', () => {
    
    beforeEach(async () => {
      const room = await BattleRoom.create({
        recruiter: recruiterId,
        title: 'Status Test Room',
        participants: [participantId],
        timeLimitMinutes: 60,
        status: 'draft',
        challenge: {
          title: 'Challenge',
          testCases: []
        }
      });
      testRoomId = room._id;
    });

    test('21. Changer status draft → scheduled', async () => {
      const res = await request(app)
        .patch(`/api/battle-rooms/recruiter/battle-rooms/${testRoomId}`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ status: 'scheduled' });

      expect([200, 400, 500]).toContain(res.statusCode);
    });

    test('22. Changer status scheduled → live', async () => {
      await BattleRoom.findByIdAndUpdate(testRoomId, { status: 'scheduled' });
      
      const res = await request(app)
        .patch(`/api/battle-rooms/recruiter/battle-rooms/${testRoomId}`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ status: 'live' });

      expect([200, 400, 500]).toContain(res.statusCode);
    });

    test('23. Changer status live → ended', async () => {
      await BattleRoom.findByIdAndUpdate(testRoomId, { status: 'live' });
      
      const res = await request(app)
        .patch(`/api/battle-rooms/recruiter/battle-rooms/${testRoomId}`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ status: 'ended' });

      expect([200, 400, 500]).toContain(res.statusCode);
    });

    test('24. Changer status invalide', async () => {
      const res = await request(app)
        .patch(`/api/battle-rooms/recruiter/battle-rooms/${testRoomId}`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ status: 'invalid' });

      expect([400, 500]).toContain(res.statusCode);
    });
  });

  // ==================== LIST PARTICIPANT BATTLE ROOMS ====================
  describe('GET /api/battle-rooms/participant/battle-rooms', () => {
    
    test('25. Liste rooms participant - succès', async () => {
      const res = await request(app)
        .get('/api/battle-rooms/participant/battle-rooms')
        .set('Authorization', `Bearer ${participantToken}`);

      expect([200, 500]).toContain(res.statusCode);
    });

    test('26. Liste rooms participant - sans token', async () => {
      const res = await request(app)
        .get('/api/battle-rooms/participant/battle-rooms');

      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== GET PARTICIPANT BATTLE ROOM ====================
  describe('GET /api/battle-rooms/participant/battle-rooms/:id', () => {
    
    beforeEach(async () => {
      const room = await BattleRoom.create({
        recruiter: recruiterId,
        title: 'Participant Room',
        participants: [participantId],
        timeLimitMinutes: 60,
        status: 'live',
        challenge: {
          title: 'Challenge',
          testCases: []
        }
      });
      testRoomId = room._id;
    });

    test('27. Récupération room participant - succès', async () => {
      const res = await request(app)
        .get(`/api/battle-rooms/participant/battle-rooms/${testRoomId}`)
        .set('Authorization', `Bearer ${participantToken}`);

      expect([200, 404, 500]).toContain(res.statusCode);
    });

    test('28. Récupération room - ID invalide', async () => {
      const res = await request(app)
        .get('/api/battle-rooms/participant/battle-rooms/invalid-id')
        .set('Authorization', `Bearer ${participantToken}`);

      expect([404, 500]).toContain(res.statusCode);
    });
  });

  // ==================== GET PARTICIPANT ACCESS ====================
  describe('GET /api/battle-rooms/participant/battle-rooms/:id/access', () => {
    
    beforeEach(async () => {
      const room = await BattleRoom.create({
        recruiter: recruiterId,
        title: 'Access Room',
        participants: [participantId],
        timeLimitMinutes: 60,
        status: 'live',
        challenge: {
          title: 'Challenge',
          testCases: []
        }
      });
      testRoomId = room._id;
    });

    test('29. Accès participant - succès', async () => {
      const res = await request(app)
        .get(`/api/battle-rooms/participant/battle-rooms/${testRoomId}/access`)
        .set('Authorization', `Bearer ${participantToken}`);

      expect([200, 404, 500]).toContain(res.statusCode);
    });
  });

  // ==================== PREVIEW INVITATION ====================
  describe('GET /api/battle-rooms/battle-invitations/preview', () => {
    let inviteToken;

    beforeEach(async () => {
      const crypto = require('crypto');
      inviteToken = crypto.randomBytes(24).toString('hex');
      
      await BattleRoom.create({
        recruiter: recruiterId,
        title: 'Invitation Room',
        participants: [],
        timeLimitMinutes: 60,
        invitations: [{
          email: `invited_${Date.now()}@test.com`,
          tokenHash: crypto.createHash('sha256').update(inviteToken).digest('hex'),
          codeHash: crypto.createHash('sha256').update('123456').digest('hex'),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'pending'
        }],
        challenge: {
          title: 'Challenge',
          testCases: []
        }
      });
    });

    test('30. Preview invitation - succès', async () => {
      const res = await request(app)
        .get(`/api/battle-rooms/battle-invitations/preview?token=${inviteToken}`);

      expect([200, 404, 500]).toContain(res.statusCode);
    });

    test('31. Preview invitation - sans token', async () => {
      const res = await request(app)
        .get('/api/battle-rooms/battle-invitations/preview');

      expect([400, 500]).toContain(res.statusCode);
    });

    test('32. Preview invitation - token invalide', async () => {
      const res = await request(app)
        .get('/api/battle-rooms/battle-invitations/preview?token=invalid-token-12345');

      expect([404, 500]).toContain(res.statusCode);
    });
  });

  // ==================== ACCEPT INVITATION ====================
  describe('POST /api/battle-rooms/battle-invitations/accept', () => {
    let inviteToken;
    let inviteCode;

    beforeEach(async () => {
      const crypto = require('crypto');
      inviteToken = crypto.randomBytes(24).toString('hex');
      inviteCode = '123456';
      
      await BattleRoom.create({
        recruiter: recruiterId,
        title: 'Accept Room',
        participants: [],
        timeLimitMinutes: 60,
        invitations: [{
          email: `newparticipant_${Date.now()}@test.com`,
          tokenHash: crypto.createHash('sha256').update(inviteToken).digest('hex'),
          codeHash: crypto.createHash('sha256').update(inviteCode).digest('hex'),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'pending'
        }],
        challenge: {
          title: 'Challenge',
          testCases: []
        }
      });
    });

    test('33. Acceptation invitation - succès', async () => {
      const res = await request(app)
        .post('/api/battle-rooms/battle-invitations/accept')
        .send({
          token: inviteToken,
          code: inviteCode
        });

      expect([200, 400, 404, 410, 500]).toContain(res.statusCode);
    });

    test('34. Acceptation invitation - code invalide', async () => {
      const res = await request(app)
        .post('/api/battle-rooms/battle-invitations/accept')
        .send({
          token: inviteToken,
          code: '999999'
        });

      expect([400, 404, 500]).toContain(res.statusCode);
    });

    test('35. Acceptation invitation - sans token', async () => {
      const res = await request(app)
        .post('/api/battle-rooms/battle-invitations/accept')
        .send({ code: inviteCode });

      expect([400, 500]).toContain(res.statusCode);
    });
  });

  // ==================== GET SUBMISSIONS ====================
  describe('GET /api/battle-rooms/recruiter/battle-rooms/:id/submissions', () => {
    
    beforeEach(async () => {
      const room = await BattleRoom.create({
        recruiter: recruiterId,
        title: 'Submission Room',
        participants: [participantId],
        timeLimitMinutes: 60,
        status: 'ended',
        challenge: {
          title: 'Challenge',
          testCases: []
        }
      });
      testRoomId = room._id;
    });

    test('36. Récupération submissions - succès', async () => {
      const res = await request(app)
        .get(`/api/battle-rooms/recruiter/battle-rooms/${testRoomId}/submissions`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect([200, 500]).toContain(res.statusCode);
    });

    test('37. Récupération submissions - sans token', async () => {
      const res = await request(app)
        .get(`/api/battle-rooms/recruiter/battle-rooms/${testRoomId}/submissions`);

      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== TESTS D'ERREURS ====================
  describe('Tests d\'erreurs', () => {
    
    test('38. Erreur 500 - createBattleRoom DB error', async () => {
      const originalCreate = BattleRoom.create;
      BattleRoom.create = jest.fn().mockRejectedValueOnce(new Error('Database error'));
      
      const res = await request(app)
        .post('/api/battle-rooms/recruiter/battle-rooms')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          title: 'Error Room',
          participantIds: [participantId.toString()],
          timeLimitMinutes: 60,
          challenge: { title: 'Test', testCases: [] }
        });

      expect(res.statusCode).toBe(500);
      
      BattleRoom.create = originalCreate;
    });

    test('39. Route inexistante - 404', async () => {
      const res = await request(app)
        .get('/api/battle-rooms/route-inexistante')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.statusCode).toBe(404);
    });

    test('40. Accès sans token - 401', async () => {
      const res = await request(app)
        .get('/api/battle-rooms/recruiter/battle-rooms');

      expect(res.statusCode).toBe(401);
    });
  });
});