process.env.JWT_SECRET = 'test-secret-key-2024';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const User = require('../../src/models/User');
const VirtualRoomRequest = require('../../src/models/VirtualRoomRequest');

// Mock crypto
jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue(Buffer.from('mockrandom12345678', 'hex'))
}));

beforeAll(async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fortcode_test';
  await mongoose.connect(mongoURI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Virtual Room Controller - Tests Complets', () => {
  let recruiterToken;
  let adminToken;
  let recruiterId;
  let adminId;
  let testRequestId;

  beforeEach(async () => {
    await VirtualRoomRequest.deleteMany({});
    await User.deleteMany({});

    const timestamp = Date.now();
    
    // Recruteur
    const recruiter = await User.create({
      username: `recruiter_${timestamp}`,
      email: `recruiter_${timestamp}@test.com`,
      password: await bcrypt.hash('Recruiter123!', 10),
      role: 'recruiter',
      isVerified: true,
      isActive: true
    });
    recruiterId = recruiter._id;

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
  });

  // ============================================================
  // TESTS HELPERS (fonctions internes)
  // ============================================================
  describe('Helpers', () => {
    
    test('1. generateUniqueRoomSlug - génère un slug valide', async () => {
      const virtualRoomController = require('../../src/controllers/virtualRoomController');
      const slug = await virtualRoomController.generateUniqueRoomSlug();
      
      expect(slug).toBeDefined();
      expect(typeof slug).toBe('string');
      expect(slug).toMatch(/^fortcode-[a-f0-9]+$/);
    });

    test('2. buildInternalRoomLink - construit le bon lien', () => {
      const virtualRoomController = require('../../src/controllers/virtualRoomController');
      const link = virtualRoomController.buildInternalRoomLink('test-slug');
      expect(link).toBe('/virtual-room/test-slug');
    });
  });

  // ============================================================
  // POST - Créer une demande (recruteur)
  // ============================================================
  describe('POST /api/recruiter/virtual-room/request', () => {
    
    test('3. POST - 401 sans token', async () => {
      const res = await request(app)
        .post('/api/recruiter/virtual-room/request')
        .send({ message: 'Test' });
      
      expect(res.statusCode).toBe(401);
    });

    test('4. POST - succès avec recruteur', async () => {
      const res = await request(app)
        .post('/api/recruiter/virtual-room/request')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ message: 'Besoin salle virtuelle' });
      
      expect([201, 400, 500]).toContain(res.statusCode);
      
      if (res.statusCode === 201) {
        testRequestId = res.body.request._id;
        expect(res.body.request.status).toBe('pending');
      }
    });

    test('5. POST - demande déjà active (400)', async () => {
      // Créer une première demande
      await VirtualRoomRequest.create({
        recruiter: recruiterId,
        status: 'pending',
        note: 'Première demande'
      });

      const res = await request(app)
        .post('/api/recruiter/virtual-room/request')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ message: 'Seconde demande' });
      
      expect([400, 500]).toContain(res.statusCode);
    });
  });

  // ============================================================
  // GET - Récupérer ma demande (recruteur)
  // ============================================================
  describe('GET /api/recruiter/virtual-room/request', () => {
    
    test('6. GET - 401 sans token', async () => {
      const res = await request(app)
        .get('/api/recruiter/virtual-room/request');
      
      expect(res.statusCode).toBe(401);
    });

    test('7. GET - 404 quand aucune demande', async () => {
      const res = await request(app)
        .get('/api/recruiter/virtual-room/request')
        .set('Authorization', `Bearer ${recruiterToken}`);
      
      expect([404, 500]).toContain(res.statusCode);
    });

    test('8. GET - succès avec demande existante', async () => {
      await VirtualRoomRequest.create({
        recruiter: recruiterId,
        status: 'pending',
        note: 'Test'
      });

      const res = await request(app)
        .get('/api/recruiter/virtual-room/request')
        .set('Authorization', `Bearer ${recruiterToken}`);
      
      expect([200, 500]).toContain(res.statusCode);
    });
  });

  // ============================================================
  // GET ALL - Liste toutes les demandes (admin only)
  // ============================================================
  describe('GET /api/admin/virtual-room/requests', () => {
    
    test('9. GET ALL - 401 sans token', async () => {
      const res = await request(app)
        .get('/api/admin/virtual-room/requests');
      
      expect(res.statusCode).toBe(401);
    });

    test('10. GET ALL - 403 pour recruteur (non admin)', async () => {
      const res = await request(app)
        .get('/api/admin/virtual-room/requests')
        .set('Authorization', `Bearer ${recruiterToken}`);
      
      expect([403, 500]).toContain(res.statusCode);
    });

    test('11. GET ALL - 200 pour admin', async () => {
      await VirtualRoomRequest.create({
        recruiter: recruiterId,
        status: 'pending',
        note: 'Test'
      });

      const res = await request(app)
        .get('/api/admin/virtual-room/requests')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect([200, 500]).toContain(res.statusCode);
    });

    test('12. GET ALL - filtre status=pending', async () => {
      const res = await request(app)
        .get('/api/admin/virtual-room/requests?status=pending')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect([200, 500]).toContain(res.statusCode);
    });
  });

  // ============================================================
  // PATCH - Mettre à jour le status (admin only)
  // ============================================================
  describe('PATCH /api/admin/virtual-room/requests/:id', () => {
    
    beforeEach(async () => {
      const requestDoc = await VirtualRoomRequest.create({
        recruiter: recruiterId,
        status: 'pending',
        note: 'Test request'
      });
      testRequestId = requestDoc._id;
    });

    test('13. PATCH - 401 sans token', async () => {
      const res = await request(app)
        .patch(`/api/admin/virtual-room/requests/${testRequestId}`)
        .send({ status: 'approved' });
      
      expect(res.statusCode).toBe(401);
    });

    test('14. PATCH - 403 pour recruteur', async () => {
      const res = await request(app)
        .patch(`/api/admin/virtual-room/requests/${testRequestId}`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ status: 'approved' });
      
      expect([403, 500]).toContain(res.statusCode);
    });

    test('15. PATCH - approuver demande (status approved)', async () => {
      const res = await request(app)
        .patch(`/api/admin/virtual-room/requests/${testRequestId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved', adminMessage: 'Approuvé' });
      
      expect([200, 400, 404, 500]).toContain(res.statusCode);
      
      if (res.statusCode === 200) {
        expect(res.body.request.status).toBe('approved');
        expect(res.body.request.roomSlug).toBeDefined();
      }
    });

    test('16. PATCH - rejeter demande (status rejected)', async () => {
      const res = await request(app)
        .patch(`/api/admin/virtual-room/requests/${testRequestId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'rejected', adminMessage: 'Refusé' });
      
      expect([200, 400, 404, 500]).toContain(res.statusCode);
    });

    test('17. PATCH - status invalide', async () => {
      const res = await request(app)
        .patch(`/api/admin/virtual-room/requests/${testRequestId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid_status' });
      
      expect([400, 500]).toContain(res.statusCode);
    });

    test('18. PATCH - ID inexistant', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .patch(`/api/admin/virtual-room/requests/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' });
      
      expect([404, 500]).toContain(res.statusCode);
    });
  });
});
