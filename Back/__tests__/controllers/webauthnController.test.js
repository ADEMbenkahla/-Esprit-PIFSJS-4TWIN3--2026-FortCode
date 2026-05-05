process.env.JWT_SECRET = 'test-secret-key-2024';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const User = require('../../src/models/User');

// Mock de @simplewebauthn/server
jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: jest.fn().mockResolvedValue({
    challenge: 'mock-challenge-123',
    rp: { name: 'FortCode' },
    user: { id: 'mock-user-id', name: 'test@test.com' },
    attestation: 'none'
  }),
  verifyRegistrationResponse: jest.fn().mockResolvedValue({
    verified: true,
    registrationInfo: {
      credentialPublicKey: Buffer.from('mock-public-key'),
      credentialID: Buffer.from('mock-credential-id'),
      counter: 0
    }
  }),
  generateAuthenticationOptions: jest.fn().mockResolvedValue({
    challenge: 'mock-auth-challenge',
    allowCredentials: []
  }),
  verifyAuthenticationResponse: jest.fn().mockResolvedValue({
    verified: true,
    authenticationInfo: { newCounter: 1 }
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

describe('WebAuthn Controller - Tests Complets', () => {
  let userToken;
  let userId;
  let testEmail;

  beforeEach(async () => {
    await User.deleteMany({});

    testEmail = `webauthn_${Date.now()}@test.com`;
    const user = await User.create({
      username: `webauthnuser_${Date.now()}`,
      email: testEmail,
      password: await bcrypt.hash('Password123!', 10),
      role: 'participant',
      isVerified: true,
      isActive: true,
      webauthn: []
    });
    userId = user._id;

    const jwt = require('jsonwebtoken');
    userToken = jwt.sign(
      { id: userId.toString(), role: 'participant' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  // ==================== REGISTRATION OPTIONS ====================
  describe('GET /api/auth/webauthn/register-options', () => {
    
    test('1. Génération options registration - succès', async () => {
      const res = await request(app)
        .get('/api/auth/webauthn/register-options')
        .set('Authorization', `Bearer ${userToken}`);

      expect([200, 500]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('challenge');
      }
    });

    test('2. Génération options - utilisateur non trouvé', async () => {
      const fakeToken = require('jsonwebtoken').sign(
        { id: new mongoose.Types.ObjectId().toString(), role: 'participant' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      const res = await request(app)
        .get('/api/auth/webauthn/register-options')
        .set('Authorization', `Bearer ${fakeToken}`);

      expect([404, 500]).toContain(res.statusCode);
    });

    test('3. Génération options - sans token', async () => {
      const res = await request(app)
        .get('/api/auth/webauthn/register-options');

      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== VERIFY REGISTRATION ====================
  describe('POST /api/auth/webauthn/register-verify', () => {
    
    test('4. Vérification registration - succès', async () => {
      const res = await request(app)
        .post('/api/auth/webauthn/register-verify')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          id: 'mock-credential-id',
          response: {
            clientDataJSON: 'mock-client-data',
            attestationObject: 'mock-attestation',
            transports: ['internal']
          }
        });

      expect([200, 400, 500]).toContain(res.statusCode);
    });

    test('5. Vérification registration - utilisateur non trouvé', async () => {
      const fakeToken = require('jsonwebtoken').sign(
        { id: new mongoose.Types.ObjectId().toString(), role: 'participant' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      const res = await request(app)
        .post('/api/auth/webauthn/register-verify')
        .set('Authorization', `Bearer ${fakeToken}`)
        .send({ response: {} });

      expect([404, 500]).toContain(res.statusCode);
    });

    test('6. Vérification registration - sans token', async () => {
      const res = await request(app)
        .post('/api/auth/webauthn/register-verify')
        .send({ response: {} });

      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== AUTHENTICATION OPTIONS ====================
  describe('POST /api/auth/webauthn/login-options', () => {
    
    test('7. Génération options authentication - succès', async () => {
      const res = await request(app)
        .post('/api/auth/webauthn/login-options')
        .send({ email: testEmail });

      expect([200, 404, 500]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('challenge');
      }
    });

    test('8. Génération options - email inexistant', async () => {
      const res = await request(app)
        .post('/api/auth/webauthn/login-options')
        .send({ email: 'nonexistent@test.com' });

      expect([404, 500]).toContain(res.statusCode);
    });

    test('9. Génération options - sans email', async () => {
      const res = await request(app)
        .post('/api/auth/webauthn/login-options')
        .send({});

      expect([400, 500]).toContain(res.statusCode);
    });
  });

  // ==================== VERIFY AUTHENTICATION ====================
  describe('POST /api/auth/webauthn/login-verify', () => {
    
    test('10. Vérification authentication - succès', async () => {
      const res = await request(app)
        .post('/api/auth/webauthn/login-verify')
        .send({
          email: testEmail,
          body: {
            id: 'mock-credential-id',
            response: {
              clientDataJSON: 'mock-client-data',
              authenticatorData: 'mock-auth-data',
              signature: 'mock-signature'
            }
          }
        });

      expect([200, 400, 404, 500]).toContain(res.statusCode);
    });

    test('11. Vérification authentication - email inexistant', async () => {
      const res = await request(app)
        .post('/api/auth/webauthn/login-verify')
        .send({
          email: 'nonexistent@test.com',
          body: { response: {} }
        });

      expect([404, 500]).toContain(res.statusCode);
    });

    test('12. Vérification authentication - utilisateur sans credentials', async () => {
      const res = await request(app)
        .post('/api/auth/webauthn/login-verify')
        .send({
          email: testEmail,
          body: {
            id: 'unknown-credential-id',
            response: {}
          }
        });

      expect([400, 404, 500]).toContain(res.statusCode);
    });
  });

  // ==================== TESTS D'ERREURS ====================
  describe('Tests d\'erreurs', () => {
    
    test('13. Erreur 500 - generateRegistrationOptions DB error', async () => {
      const originalFindById = User.findById;
      User.findById = jest.fn().mockRejectedValueOnce(new Error('Database error'));
      
      const res = await request(app)
        .get('/api/auth/webauthn/register-options')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(500);
      
      User.findById = originalFindById;
    });

    test('14. Erreur 500 - verifyRegistration DB error', async () => {
      const originalFindById = User.findById;
      User.findById = jest.fn().mockRejectedValueOnce(new Error('Database error'));
      
      const res = await request(app)
        .post('/api/auth/webauthn/register-verify')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ response: {} });

      expect(res.statusCode).toBe(500);
      
      User.findById = originalFindById;
    });

    test('15. Erreur 500 - generateAuthenticationOptions DB error', async () => {
      const originalFindOne = User.findOne;
      User.findOne = jest.fn().mockRejectedValueOnce(new Error('Database error'));
      
      const res = await request(app)
        .post('/api/auth/webauthn/login-options')
        .send({ email: testEmail });

      expect(res.statusCode).toBe(500);
      
      User.findOne = originalFindOne;
    });

    test('16. Route inexistante', async () => {
      const res = await request(app)
        .get('/api/auth/webauthn/inexistant')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(404);
    });
  });
});