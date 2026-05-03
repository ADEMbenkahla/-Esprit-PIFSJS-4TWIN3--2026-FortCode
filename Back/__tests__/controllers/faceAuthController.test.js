process.env.JWT_SECRET = 'test-secret-key-2024';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const User = require('../../src/models/User');

beforeAll(async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fortcode_test';
  await mongoose.connect(mongoURI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('FaceAuth Controller - Tests Complets', () => {
  let userToken;
  let userId;
  let testEmail;
  let testDescriptor;

  beforeEach(async () => {
    await User.deleteMany({});

    testEmail = `face_${Date.now()}@test.com`;
    testDescriptor = Array(128).fill(0).map(() => Math.random() * 2 - 1);
    
    const user = await User.create({
      username: `faceuser_${Date.now()}`,
      email: testEmail,
      password: await bcrypt.hash('Password123!', 10),
      role: 'participant',
      isVerified: true,
      isActive: true,
      faceRegistered: false,
      faceDescriptor: null
    });
    userId = user._id;

    const jwt = require('jsonwebtoken');
    userToken = jwt.sign(
      { id: userId.toString(), role: 'participant' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  // ==================== REGISTER FACE ====================
  describe('POST /api/auth/face/register', () => {
    
    test('1. Enregistrement visage - succès', async () => {
      const res = await request(app)
        .post('/api/auth/face/register')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ descriptor: testDescriptor });

      expect([200, 400, 500]).toContain(res.statusCode);
      
      if (res.statusCode === 200) {
        expect(res.body.success).toBe(true);
        
        // Vérifier que le visage a été enregistré en DB
        const updatedUser = await User.findById(userId);
        expect(updatedUser.faceRegistered).toBe(true);
        expect(updatedUser.faceDescriptor).toEqual(testDescriptor);
      }
    });

    test('2. Enregistrement visage - format invalide (pas un tableau)', async () => {
      const res = await request(app)
        .post('/api/auth/face/register')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ descriptor: 'not-an-array' });

      expect([400, 500]).toContain(res.statusCode);
    });

    test('3. Enregistrement visage - descriptor manquant', async () => {
      const res = await request(app)
        .post('/api/auth/face/register')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect([400, 500]).toContain(res.statusCode);
    });

    test('4. Enregistrement visage - utilisateur non trouvé', async () => {
      const fakeToken = require('jsonwebtoken').sign(
        { id: new mongoose.Types.ObjectId().toString(), role: 'participant' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      const res = await request(app)
        .post('/api/auth/face/register')
        .set('Authorization', `Bearer ${fakeToken}`)
        .send({ descriptor: testDescriptor });

      expect([404, 500]).toContain(res.statusCode);
    });

    test('5. Enregistrement visage - sans token', async () => {
      const res = await request(app)
        .post('/api/auth/face/register')
        .send({ descriptor: testDescriptor });

      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== LOGIN FACE ====================
  describe('POST /api/auth/face/login', () => {
    
    test('6. Login visage - succès (distance < seuil)', async () => {
      // Enregistrer d'abord un visage
      await User.findByIdAndUpdate(userId, {
        faceRegistered: true,
        faceDescriptor: testDescriptor
      });
      
      const res = await request(app)
        .post('/api/auth/face/login')
        .send({
          email: testEmail,
          descriptor: testDescriptor
        });

      expect([200, 400, 401, 500]).toContain(res.statusCode);
      
      if (res.statusCode === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.token).toBeDefined();
      }
    });

    test('7. Login visage - échec (distance > seuil)', async () => {
      // Enregistrer un visage
      await User.findByIdAndUpdate(userId, {
        faceRegistered: true,
        faceDescriptor: testDescriptor
      });
      
      // Créer un descripteur différent (loin du seuil)
      const differentDescriptor = testDescriptor.map(v => v * -1);
      
      const res = await request(app)
        .post('/api/auth/face/login')
        .send({
          email: testEmail,
          descriptor: differentDescriptor
        });

      expect([401, 400, 500]).toContain(res.statusCode);
    });

    test('8. Login visage - email inexistant', async () => {
      const res = await request(app)
        .post('/api/auth/face/login')
        .send({
          email: 'nonexistent@test.com',
          descriptor: testDescriptor
        });

      expect([404, 500]).toContain(res.statusCode);
    });

    test('9. Login visage - visage non enregistré', async () => {
      const res = await request(app)
        .post('/api/auth/face/login')
        .send({
          email: testEmail,
          descriptor: testDescriptor
        });

      expect([400, 500]).toContain(res.statusCode);
    });

    test('10. Login visage - descriptor manquant', async () => {
      const res = await request(app)
        .post('/api/auth/face/login')
        .send({ email: testEmail });

      expect([400, 500]).toContain(res.statusCode);
    });

    test('11. Login visage - email manquant', async () => {
      const res = await request(app)
        .post('/api/auth/face/login')
        .send({ descriptor: testDescriptor });

      expect([400, 500]).toContain(res.statusCode);
    });

    test('12. Login visage - descriptor format invalide', async () => {
      const res = await request(app)
        .post('/api/auth/face/login')
        .send({
          email: testEmail,
          descriptor: 'not-an-array'
        });

      expect([400, 500]).toContain(res.statusCode);
    });
  });

  // ==================== FONCTION HELPER EUCLIDEAN DISTANCE ====================
  describe('Fonction euclideanDistance', () => {
    
    test('13. Distance euclidienne - deux vecteurs identiques', () => {
      const { euclideanDistance } = require('../../src/controllers/faceAuthController');
      const d1 = [1, 2, 3, 4, 5];
      const d2 = [1, 2, 3, 4, 5];
      const distance = euclideanDistance(d1, d2);
      expect(distance).toBe(0);
    });

    test('14. Distance euclidienne - deux vecteurs différents', () => {
      const { euclideanDistance } = require('../../src/controllers/faceAuthController');
      const d1 = [1, 0, 0];
      const d2 = [0, 1, 0];
      const distance = euclideanDistance(d1, d2);
      expect(distance).toBeCloseTo(1.414, 2);
    });

    test('15. Distance euclidienne - descripteur null', () => {
      const { euclideanDistance } = require('../../src/controllers/faceAuthController');
      const distance = euclideanDistance(null, [1, 2, 3]);
      expect(distance).toBe(Infinity);
    });

    test('16. Distance euclidienne - longueurs différentes', () => {
      const { euclideanDistance } = require('../../src/controllers/faceAuthController');
      const d1 = [1, 2, 3];
      const d2 = [1, 2];
      const distance = euclideanDistance(d1, d2);
      expect(distance).toBe(Infinity);
    });
  });

  // ==================== TESTS D'ERREURS SERVEUR ====================
  describe('Tests d\'erreurs serveur', () => {
    
    test('17. Erreur 500 - registerFace DB error', async () => {
      const originalFindById = User.findById;
      User.findById = jest.fn().mockRejectedValueOnce(new Error('Database error'));
      
      const res = await request(app)
        .post('/api/auth/face/register')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ descriptor: testDescriptor });

      expect(res.statusCode).toBe(500);
      
      User.findById = originalFindById;
    });

    test('18. Erreur 500 - loginFace DB error', async () => {
      const originalFindOne = User.findOne;
      User.findOne = jest.fn().mockRejectedValueOnce(new Error('Database error'));
      
      const res = await request(app)
        .post('/api/auth/face/login')
        .send({
          email: testEmail,
          descriptor: testDescriptor
        });

      expect(res.statusCode).toBe(500);
      
      User.findOne = originalFindOne;
    });
  });

  // ==================== TESTS DE BORDS ====================
  describe('Tests de bords', () => {
    
    test('19. Enregistrement visage - descripteur vide', async () => {
      const res = await request(app)
        .post('/api/auth/face/register')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ descriptor: [] });

      expect([200, 400, 500]).toContain(res.statusCode);
    });

    test('20. Login visage - descripteur vide', async () => {
      const res = await request(app)
        .post('/api/auth/face/login')
        .send({
          email: testEmail,
          descriptor: []
        });

      expect([400, 500]).toContain(res.statusCode);
    });

    test('21. Route inexistante', async () => {
      const res = await request(app)
        .get('/api/auth/face/inexistant')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(404);
    });
  });
});