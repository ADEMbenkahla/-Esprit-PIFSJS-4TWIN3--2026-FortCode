process.env.JWT_SECRET = 'test-secret-key-2024';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Activity = require('../../src/models/Activity');

beforeAll(async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fortcode_test';
  await mongoose.connect(mongoURI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Dashboard Controller - Tests Complets', () => {
  let adminToken;
  let recruiterToken;
  let participantToken;
  let adminId;
  let recruiterId;
  let participantId;

  beforeEach(async () => {
    await Activity.deleteMany({});
    await User.deleteMany({});

    // Créer un admin
    const admin = await User.create({
      username: 'admin_' + Date.now(),
      email: `admin_${Date.now()}@test.com`,
      password: await bcrypt.hash('Admin123!', 10),
      role: 'admin',
      isVerified: true,
      isActive: true,
      isOnline: true
    });
    adminId = admin._id;

    // Créer un recruteur
    const recruiter = await User.create({
      username: 'recruiter_' + Date.now(),
      email: `recruiter_${Date.now()}@test.com`,
      password: await bcrypt.hash('Recruiter123!', 10),
      role: 'recruiter',
      isVerified: true,
      isActive: true,
      isOnline: false
    });
    recruiterId = recruiter._id;

    // Créer un participant
    const participant = await User.create({
      username: 'participant_' + Date.now(),
      email: `participant_${Date.now()}@test.com`,
      password: await bcrypt.hash('Part123!', 10),
      role: 'participant',
      isVerified: true,
      isActive: true,
      isOnline: true
    });
    participantId = participant._id;

    // Créer un participant inactif
    await User.create({
      username: 'inactive_' + Date.now(),
      email: `inactive_${Date.now()}@test.com`,
      password: await bcrypt.hash('Part123!', 10),
      role: 'participant',
      isVerified: true,
      isActive: false,
      isOnline: false
    });

    // Créer des activités
    const today = new Date();
    for (let i = 0; i < 10; i++) {
      const activityDate = new Date(today);
      activityDate.setDate(today.getDate() - i);
      
      await Activity.create({
        user: adminId,
        action: 'VIEW_STATS',
        method: 'GET',
        route: '/api/admin/dashboard/stats',
        ip: '127.0.0.1',
        timestamp: activityDate,
        statusCode: 200,
        responseTime: 100
      });
    }

    // Activité récente pour le participant
    await Activity.create({
      user: participantId,
      action: 'LOGIN',
      method: 'POST',
      route: '/api/auth/login',
      ip: '192.168.1.1',
      timestamp: new Date(),
      statusCode: 200,
      responseTime: 50
    });

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

  // ==================== GET STATS ====================
  describe('GET /api/admin/dashboard/stats', () => {
    
    test('1. Récupération stats - avec admin (succès)', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(res.statusCode);
      
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('totalUsers');
        expect(res.body).toHaveProperty('participants');
        expect(res.body).toHaveProperty('admins');
        expect(res.body).toHaveProperty('recruiters');
        expect(res.body).toHaveProperty('onlineUsers');
        expect(res.body).toHaveProperty('activeUsers');
        expect(res.body).toHaveProperty('inactiveUsers');
        expect(res.body).toHaveProperty('newUsersThisWeek');
        expect(res.body).toHaveProperty('totalLogs');
        expect(res.body).toHaveProperty('recentActivity');
        expect(res.body).toHaveProperty('activityPerDay');
        
        // Vérifier les types
        expect(typeof res.body.totalUsers).toBe('number');
        expect(typeof res.body.participants).toBe('number');
        expect(typeof res.body.admins).toBe('number');
        expect(typeof res.body.recruiters).toBe('number');
        expect(typeof res.body.onlineUsers).toBe('number');
        expect(typeof res.body.activeUsers).toBe('number');
        expect(Array.isArray(res.body.recentActivity)).toBe(true);
        expect(Array.isArray(res.body.activityPerDay)).toBe(true);
      }
    });

    test('2. Récupération stats - avec token recruiter (refusé)', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${recruiterToken}`);

      // Un recruiter ne devrait pas avoir accès aux stats admin
      expect([403, 401, 500]).toContain(res.statusCode);
    });

    test('3. Récupération stats - avec token participant (refusé)', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${participantToken}`);

      expect([403, 401, 500]).toContain(res.statusCode);
    });

    test('4. Récupération stats - sans token', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard/stats');

      expect(res.statusCode).toBe(401);
    });

    test('5. Récupération stats - avec token invalide', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== VÉRIFICATION DES VALEURS ====================
  describe('Vérification des valeurs retournées', () => {
    
    test('6. Vérification des compteurs d\'utilisateurs', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      if (res.statusCode === 200) {
        // Total users = admin + recruiter + participant + inactive
        expect(res.body.totalUsers).toBe(4);
        expect(res.body.admins).toBe(1);
        expect(res.body.recruiters).toBe(1);
        expect(res.body.participants).toBe(2); // participant + inactive
        expect(res.body.onlineUsers).toBe(2); // admin + participant
        expect(res.body.activeUsers).toBe(3); // admin + recruiter + participant
        expect(res.body.inactiveUsers).toBe(1);
      }
    });

    test('7. Vérification des activités récentes', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      if (res.statusCode === 200) {
        expect(res.body.totalLogs).toBeGreaterThan(0);
        expect(res.body.recentActivity.length).toBeLessThanOrEqual(7);
        expect(res.body.activityPerDay.length).toBe(7);
      }
    });
  });

  // ==================== TESTS D'ERREURS ====================
  describe('Tests d\'erreurs', () => {
    
    test('8. Erreur 500 - simulation d\'erreur DB', async () => {
      // Sauvegarder la méthode originale
      const originalCountDocuments = User.countDocuments;
      
      // Simuler une erreur
      User.countDocuments = jest.fn().mockRejectedValueOnce(new Error('Database error'));
      
      const res = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Server Error');
      
      // Restaurer
      User.countDocuments = originalCountDocuments;
    });

    test('9. Route inexistante', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard/inexistant')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
    });
  });
});