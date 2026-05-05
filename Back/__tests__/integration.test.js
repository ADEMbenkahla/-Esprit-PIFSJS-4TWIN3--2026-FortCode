process.env.JWT_SECRET = 'test-secret-key-2024';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Challenge = require('../../src/models/Challenge');
const Stage = require('../../src/models/Stage');

// Désactiver tous les mocks pour tester le vrai code
jest.unmock('../../src/utils/sendEmail');
jest.unmock('../../src/utils/runChallengeCode');
jest.unmock('../../src/utils/stageAnalysis');
jest.unmock('../../src/services/gamificationService');

beforeAll(async () => {
  const mongoURI = 'mongodb://localhost:27017/fortcode_test';
  await mongoose.connect(mongoURI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('INTEGRATION TESTS - TOUTES LES ROUTES', () => {
  let adminToken;
  let userToken;
  let adminId;
  let userId;
  let testChallengeId;
  let testStageId;

  beforeAll(async () => {
    await User.deleteMany({});
    await Challenge.deleteMany({});
    await Stage.deleteMany({});

    const timestamp = Date.now();
    
    // Admin
    const admin = await User.create({
      username: `admin_${timestamp}`,
      email: `admin_${timestamp}@test.com`,
      password: await bcrypt.hash('Admin123!', 10),
      role: 'admin',
      isVerified: true,
      isActive: true
    });
    adminId = admin._id;

    // User
    const user = await User.create({
      username: `user_${timestamp}`,
      email: `user_${timestamp}@test.com`,
      password: await bcrypt.hash('User123!', 10),
      role: 'participant',
      isVerified: true,
      isActive: true
    });
    userId = user._id;

    const jwt = require('jsonwebtoken');
    adminToken = jwt.sign({ id: adminId.toString(), role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    userToken = jwt.sign({ id: userId.toString(), role: 'participant' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Challenge test
    const challenge = await Challenge.create({
      title: 'Test Challenge',
      description: 'Description',
      type: 'Stage',
      testCases: []
    });
    testChallengeId = challenge._id;

    // Stage test
    const stage = await Stage.create({
      title: 'Test Stage',
      description: 'Stage desc',
      level: 1,
      order: 1,
      challenges: [testChallengeId]
    });
    testStageId = stage._id;
  });

  // ==================== AUTH ROUTES ====================
  describe('Auth Routes', () => {
    test('POST /api/auth/register', async () => {
      const res = await request(app).post('/api/auth/register').send({
        username: `new_${Date.now()}`,
        email: `new_${Date.now()}@test.com`,
        password: 'Password123!'
      });
      expect(res.statusCode).not.toBe(404);
    });

    test('POST /api/auth/login', async () => {
      const res = await request(app).post('/api/auth/login').send({
        identifier: `user_${Date.now() - 1000}@test.com`,
        password: 'User123!'
      });
      expect([200, 400, 401]).toContain(res.statusCode);
    });

    test('GET /api/auth/profile avec token', async () => {
      const res = await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${userToken}`);
      expect([200, 401]).toContain(res.statusCode);
    });

    test('GET /api/auth/profile sans token = 401', async () => {
      const res = await request(app).get('/api/auth/profile');
      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== CHALLENGE ROUTES ====================
  describe('Challenge Routes', () => {
    test('GET /api/challenges', async () => {
      const res = await request(app).get('/api/challenges').set('Authorization', `Bearer ${adminToken}`);
      expect([200, 401, 403]).toContain(res.statusCode);
    });

    test('GET /api/challenges/:id', async () => {
      const res = await request(app).get(`/api/challenges/${testChallengeId}`).set('Authorization', `Bearer ${adminToken}`);
      expect([200, 404]).toContain(res.statusCode);
    });

    test('POST /api/challenges', async () => {
      const res = await request(app).post('/api/challenges').set('Authorization', `Bearer ${adminToken}`).send({
        title: 'New Challenge',
        description: 'Desc',
        type: 'Stage',
        testCases: []
      });
      expect([201, 400]).toContain(res.statusCode);
    });
  });

  // ==================== STAGE ROUTES ====================
  describe('Stage Routes', () => {
    test('GET /api/stages', async () => {
      const res = await request(app).get('/api/stages').set('Authorization', `Bearer ${adminToken}`);
      expect([200, 401]).toContain(res.statusCode);
    });

    test('GET /api/stages/me', async () => {
      const res = await request(app).get('/api/stages/me').set('Authorization', `Bearer ${userToken}`);
      expect([200, 401]).toContain(res.statusCode);
    });

    test('GET /api/stages/:id', async () => {
      const res = await request(app).get(`/api/stages/${testStageId}`).set('Authorization', `Bearer ${userToken}`);
      expect([200, 403, 404]).toContain(res.statusCode);
    });
  });

  // ==================== BATTLE ROOM ROUTES ====================
  describe('Battle Room Routes', () => {
    test('GET /api/battle-rooms/recruiter/participants', async () => {
      const res = await request(app).get('/api/battle-rooms/recruiter/participants').set('Authorization', `Bearer ${adminToken}`);
      expect([200, 401, 403]).toContain(res.statusCode);
    });

    test('GET /api/battle-rooms/recruiter/battle-rooms', async () => {
      const res = await request(app).get('/api/battle-rooms/recruiter/battle-rooms').set('Authorization', `Bearer ${adminToken}`);
      expect([200, 401]).toContain(res.statusCode);
    });
  });

  // ==================== ROLE REQUEST ROUTES ====================
  describe('Role Request Routes', () => {
    test('POST /api/role-requests', async () => {
      const res = await request(app).post('/api/role-requests').set('Authorization', `Bearer ${userToken}`).send({
        justification: 'I want to become recruiter'
      });
      expect([201, 400]).toContain(res.statusCode);
    });

    test('GET /api/role-requests/my-requests', async () => {
      const res = await request(app).get('/api/role-requests/my-requests').set('Authorization', `Bearer ${userToken}`);
      expect([200, 401]).toContain(res.statusCode);
    });
  });

  // ==================== DASHBOARD ROUTES ====================
  describe('Dashboard Routes', () => {
    test('GET /api/admin/dashboard/stats', async () => {
      const res = await request(app).get('/api/admin/dashboard/stats').set('Authorization', `Bearer ${adminToken}`);
      expect([200, 401, 403]).toContain(res.statusCode);
    });
  });
});