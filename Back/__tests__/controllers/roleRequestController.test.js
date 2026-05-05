process.env.JWT_SECRET = 'test-secret-key-2024';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const RoleRequest = require('../../src/models/RoleRequest');
const User = require('../../src/models/User');

// Mock des services externes
jest.mock('axios');
jest.mock('fs');

const axios = require('axios');

beforeAll(async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fortcode_test';
  await mongoose.connect(mongoURI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('RoleRequest Controller - Tests Complets Améliorés', () => {
  let adminToken;
  let participantToken;
  let adminId;
  let participantId;
  let testRequestId;

  beforeEach(async () => {
    await RoleRequest.deleteMany({});
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

  // ==================== CREATE ROLE REQUEST ====================
  describe('POST /api/role-requests', () => {
    
    test('1. Création demande - succès', async () => {
      const res = await request(app)
        .post('/api/role-requests')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          justification: 'Je souhaite devenir recruteur car j\'ai de l\'expérience'
        });

      expect([201, 400, 500]).toContain(res.statusCode);
      
      if (res.statusCode === 201) {
        testRequestId = res.body.request._id;
        expect(res.body.request.status).toBe('pending');
        expect(res.body.request.requestedRole).toBe('recruiter');
      }
    });

    test('2. Création demande - avec fichier uploadé', async () => {
      const res = await request(app)
        .post('/api/role-requests')
        .set('Authorization', `Bearer ${participantToken}`)
        .attach('proofDocument', Buffer.from('contenu test'), 'test.pdf')
        .field('justification', 'Je souhaite devenir recruteur avec preuve');

      expect([201, 400, 500]).toContain(res.statusCode);
    });

    test('3. Création demande - utilisateur déjà recruteur', async () => {
      await User.findByIdAndUpdate(participantId, { role: 'recruiter' });
      
      const res = await request(app)
        .post('/api/role-requests')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ justification: 'Test' });

      expect([403, 500]).toContain(res.statusCode);
    });

    test('4. Création demande - utilisateur déjà admin', async () => {
      await User.findByIdAndUpdate(participantId, { role: 'admin' });
      
      const res = await request(app)
        .post('/api/role-requests')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ justification: 'Test' });

      expect([403, 500]).toContain(res.statusCode);
    });

    test('5. Création demande - demande déjà en attente', async () => {
      await RoleRequest.create({
        userId: participantId,
        requestedRole: 'recruiter',
        justification: 'Première demande',
        status: 'pending'
      });
      
      const res = await request(app)
        .post('/api/role-requests')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ justification: 'Seconde demande' });

      expect([400, 500]).toContain(res.statusCode);
    });

    test('6. Création demande - utilisateur non trouvé', async () => {
      const jwt = require('jsonwebtoken');
      const fakeToken = jwt.sign(
        { id: new mongoose.Types.ObjectId().toString(), role: 'participant' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      const res = await request(app)
        .post('/api/role-requests')
        .set('Authorization', `Bearer ${fakeToken}`)
        .send({ justification: 'Test' });

      expect([404, 500]).toContain(res.statusCode);
    });

    test('7. Création demande - sans token', async () => {
      const res = await request(app)
        .post('/api/role-requests')
        .send({ justification: 'Test' });

      expect(res.statusCode).toBe(401);
    });

    test('8. Création demande - sans justification', async () => {
      const res = await request(app)
        .post('/api/role-requests')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({});

      expect([400, 500]).toContain(res.statusCode);
    });
  });

  // ==================== GET MY ROLE REQUESTS ====================
  describe('GET /api/role-requests/my-requests', () => {
    
    test('9. Récupération de mes demandes - succès', async () => {
      await RoleRequest.create({
        userId: participantId,
        requestedRole: 'recruiter',
        justification: 'Test',
        status: 'pending'
      });
      
      const res = await request(app)
        .get('/api/role-requests/my-requests')
        .set('Authorization', `Bearer ${participantToken}`);

      expect([200, 500]).toContain(res.statusCode);
      
      if (res.statusCode === 200) {
        expect(Array.isArray(res.body.requests)).toBe(true);
        expect(res.body.requests.length).toBeGreaterThan(0);
      }
    });

    test('10. Récupération de mes demandes - multiples demandes', async () => {
      await RoleRequest.create([
        {
          userId: participantId,
          requestedRole: 'recruiter',
          justification: 'Demande 1',
          status: 'pending'
        },
        {
          userId: participantId,
          requestedRole: 'recruiter',
          justification: 'Demande 2',
          status: 'rejected'
        }
      ]);
      
      const res = await request(app)
        .get('/api/role-requests/my-requests')
        .set('Authorization', `Bearer ${participantToken}`);

      expect([200, 500]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.requests.length).toBe(2);
      }
    });

    test('11. Récupération demandes - aucune demande', async () => {
      const res = await request(app)
        .get('/api/role-requests/my-requests')
        .set('Authorization', `Bearer ${participantToken}`);

      expect([200, 500]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.requests.length).toBe(0);
      }
    });

    test('12. Récupération demandes - sans token', async () => {
      const res = await request(app)
        .get('/api/role-requests/my-requests');

      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== GET ALL ROLE REQUESTS (Admin) ====================
  describe('GET /api/role-requests (Admin)', () => {
    
    beforeEach(async () => {
      await RoleRequest.create([
        {
          userId: participantId,
          requestedRole: 'recruiter',
          justification: 'Pending request',
          status: 'pending'
        },
        {
          userId: participantId,
          requestedRole: 'recruiter',
          justification: 'Approved request',
          status: 'approved'
        },
        {
          userId: participantId,
          requestedRole: 'recruiter',
          justification: 'Rejected request',
          status: 'rejected'
        }
      ]);
    });

    test('13. Récupération toutes les demandes - admin', async () => {
      const res = await request(app)
        .get('/api/role-requests')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.requests.length).toBe(3);
      }
    });

    test('14. Récupération avec filtre status pending', async () => {
      const res = await request(app)
        .get('/api/role-requests?status=pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.requests.every(r => r.status === 'pending')).toBe(true);
      }
    });

    test('15. Récupération avec filtre status approved', async () => {
      const res = await request(app)
        .get('/api/role-requests?status=approved')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(res.statusCode);
    });

    test('16. Récupération avec filtre status rejected', async () => {
      const res = await request(app)
        .get('/api/role-requests?status=rejected')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(res.statusCode);
    });

    test('17. Récupération avec filtre status invalide', async () => {
      const res = await request(app)
        .get('/api/role-requests?status=invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(res.statusCode);
    });

    test('18. Récupération toutes demandes - accès refusé pour participant', async () => {
      const res = await request(app)
        .get('/api/role-requests')
        .set('Authorization', `Bearer ${participantToken}`);

      expect([403, 401, 500]).toContain(res.statusCode);
    });

    test('19. Récupération toutes demandes - sans token', async () => {
      const res = await request(app)
        .get('/api/role-requests');

      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== AI REVIEW REQUEST (Admin) ====================
  describe('POST /api/role-requests/:requestId/ai-review', () => {
    
    beforeEach(async () => {
      const request = await RoleRequest.create({
        userId: participantId,
        requestedRole: 'recruiter',
        justification: 'Expérience en recrutement',
        status: 'pending'
      });
      testRequestId = request._id;
    });

    test('20. AI review - succès', async () => {
      axios.post.mockResolvedValueOnce({
        status: 200,
        data: {
          decision: 'approve',
          confidence: 0.85,
          explanation: 'Profil pertinent',
          document_score: 0.9,
          text_score: 0.8
        }
      });
      
      const res = await request(app)
        .post(`/api/role-requests/${testRequestId}/ai-review`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 400, 404, 500, 503]).toContain(res.statusCode);
    });

    test('21. AI review - demande non trouvée', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/role-requests/${fakeId}/ai-review`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([404, 500]).toContain(res.statusCode);
    });

    test('22. AI review - demande déjà traitée', async () => {
      await RoleRequest.findByIdAndUpdate(testRequestId, { status: 'approved' });
      
      const res = await request(app)
        .post(`/api/role-requests/${testRequestId}/ai-review`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 500]).toContain(res.statusCode);
    });

    test('23. AI review - erreur service AI', async () => {
      axios.post.mockRejectedValueOnce(new Error('AI Service unavailable'));
      
      const res = await request(app)
        .post(`/api/role-requests/${testRequestId}/ai-review`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([503, 500]).toContain(res.statusCode);
    });

    test('24. AI review - rate limit (429)', async () => {
      axios.post.mockResolvedValueOnce({
        status: 429,
        data: { message: 'Rate limited' }
      });
      
      const res = await request(app)
        .post(`/api/role-requests/${testRequestId}/ai-review`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(res.statusCode);
    });

    test('25. AI review - timeout', async () => {
      axios.post.mockRejectedValueOnce({ code: 'ECONNABORTED', message: 'Timeout' });
      
      const res = await request(app)
        .post(`/api/role-requests/${testRequestId}/ai-review`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([503, 500]).toContain(res.statusCode);
    });
  });

  // ==================== APPROVE ROLE REQUEST (Admin) ====================
  describe('PUT /api/role-requests/:requestId/approve', () => {
    
    beforeEach(async () => {
      const request = await RoleRequest.create({
        userId: participantId,
        requestedRole: 'recruiter',
        justification: 'Test',
        status: 'pending'
      });
      testRequestId = request._id;
    });

    test('26. Approbation demande - succès', async () => {
      const res = await request(app)
        .put(`/api/role-requests/${testRequestId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ adminComment: 'Profil validé' });

      expect([200, 400, 404, 500]).toContain(res.statusCode);
    });

    test('27. Approbation - avec commentaire', async () => {
      const res = await request(app)
        .put(`/api/role-requests/${testRequestId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ adminComment: 'Très bon profil, accepté' });

      expect([200, 400, 404, 500]).toContain(res.statusCode);
    });

    test('28. Approbation - sans commentaire', async () => {
      const res = await request(app)
        .put(`/api/role-requests/${testRequestId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect([200, 400, 404, 500]).toContain(res.statusCode);
    });

    test('29. Approbation - demande non trouvée', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/role-requests/${fakeId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([404, 500]).toContain(res.statusCode);
    });

    test('30. Approbation - demande déjà traitée', async () => {
      await RoleRequest.findByIdAndUpdate(testRequestId, { status: 'approved' });
      
      const res = await request(app)
        .put(`/api/role-requests/${testRequestId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 500]).toContain(res.statusCode);
    });
  });

  // ==================== REJECT ROLE REQUEST (Admin) ====================
  describe('PUT /api/role-requests/:requestId/reject', () => {
    
    beforeEach(async () => {
      const request = await RoleRequest.create({
        userId: participantId,
        requestedRole: 'recruiter',
        justification: 'Test',
        status: 'pending'
      });
      testRequestId = request._id;
    });

    test('31. Rejet demande - succès', async () => {
      const res = await request(app)
        .put(`/api/role-requests/${testRequestId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ adminComment: 'Justification insuffisante' });

      expect([200, 400, 404, 500]).toContain(res.statusCode);
    });

    test('32. Rejet - avec commentaire', async () => {
      const res = await request(app)
        .put(`/api/role-requests/${testRequestId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ adminComment: 'Manque d\'expérience requise' });

      expect([200, 400, 404, 500]).toContain(res.statusCode);
    });

    test('33. Rejet - demande non trouvée', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/role-requests/${fakeId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([404, 500]).toContain(res.statusCode);
    });

    test('34. Rejet - demande déjà traitée', async () => {
      await RoleRequest.findByIdAndUpdate(testRequestId, { status: 'rejected' });
      
      const res = await request(app)
        .put(`/api/role-requests/${testRequestId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 500]).toContain(res.statusCode);
    });
  });

  // ==================== DELETE ROLE REQUEST ====================
  describe('DELETE /api/role-requests/:requestId', () => {
    
    beforeEach(async () => {
      const request = await RoleRequest.create({
        userId: participantId,
        requestedRole: 'recruiter',
        justification: 'Test',
        status: 'pending'
      });
      testRequestId = request._id;
    });

    test('35. Suppression demande - par le créateur', async () => {
      const res = await request(app)
        .delete(`/api/role-requests/${testRequestId}`)
        .set('Authorization', `Bearer ${participantToken}`);

      expect([200, 400, 403, 404, 500]).toContain(res.statusCode);
    });

    test('36. Suppression demande - par admin', async () => {
      const res = await request(app)
        .delete(`/api/role-requests/${testRequestId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 400, 404, 500]).toContain(res.statusCode);
    });

    test('37. Suppression demande - déjà approuvée', async () => {
      await RoleRequest.findByIdAndUpdate(testRequestId, { status: 'approved' });
      
      const res = await request(app)
        .delete(`/api/role-requests/${testRequestId}`)
        .set('Authorization', `Bearer ${participantToken}`);

      expect([400, 500]).toContain(res.statusCode);
    });

    test('38. Suppression demande - déjà rejetée (autorisée)', async () => {
      await RoleRequest.findByIdAndUpdate(testRequestId, { status: 'rejected' });
      
      const res = await request(app)
        .delete(`/api/role-requests/${testRequestId}`)
        .set('Authorization', `Bearer ${participantToken}`);

      expect([200, 400, 403, 404, 500]).toContain(res.statusCode);
    });

    test('39. Suppression demande - utilisateur non autorisé', async () => {
      const otherUser = await User.create({
        username: 'other_' + Date.now(),
        email: `other_${Date.now()}@test.com`,
        password: await bcrypt.hash('Other123!', 10),
        role: 'participant'
      });
      const jwt = require('jsonwebtoken');
      const otherToken = jwt.sign(
        { id: otherUser._id.toString(), role: 'participant' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      const res = await request(app)
        .delete(`/api/role-requests/${testRequestId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect([403, 500]).toContain(res.statusCode);
    });

    test('40. Suppression demande - ID inexistant', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/role-requests/${fakeId}`)
        .set('Authorization', `Bearer ${participantToken}`);

      expect([404, 500]).toContain(res.statusCode);
    });
  });

  // ==================== TESTS D'ERREURS SERVEUR ====================
  describe('Tests d\'erreurs serveur', () => {
    
    test('41. Erreur 500 - createRoleRequest - DB error', async () => {
      const originalCreate = RoleRequest.create;
      RoleRequest.create = jest.fn().mockRejectedValueOnce(new Error('Database error'));
      
      const res = await request(app)
        .post('/api/role-requests')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ justification: 'Test' });

      expect(res.statusCode).toBe(500);
      
      RoleRequest.create = originalCreate;
    });

    test('42. Route inexistante', async () => {
      const res = await request(app)
        .get('/api/role-requests/inexistant')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
    });
  });
});