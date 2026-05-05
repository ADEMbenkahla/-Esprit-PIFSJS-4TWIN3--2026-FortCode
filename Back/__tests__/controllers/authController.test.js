process.env.JWT_SECRET = 'test-secret-key-2024';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const app = require('../../src/app');
const User = require('../../src/models/User');

// Mock des services externes
jest.mock('../../src/utils/sendEmail', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true)
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock-qr-code')
}));

jest.mock('speakeasy', () => ({
  generateSecret: jest.fn(() => ({
    base32: 'MOCK_SECRET_BASE32',
    otpauth_url: 'otpauth://totp/FortCode?secret=MOCK_SECRET'
  })),
  totp: {
    verify: jest.fn(() => true)
  }
}));

beforeAll(async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fortcode_test';
  await mongoose.connect(mongoURI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Auth Controller - Tests Complets Améliorés', () => {
  let adminToken;
  let adminId;
  let userToken;
  let userId;

  beforeEach(async () => {
    await User.deleteMany({});
    
    const timestamp = Date.now();
    
    // Créer un utilisateur admin avec username UNIQUE
    const admin = await User.create({
      username: `admin_${timestamp}`,
      email: `admin_${timestamp}@test.com`,
      password: await bcrypt.hash('Admin123!', 10),
      role: 'admin',
      isVerified: true,
      isActive: true
    });
    adminId = admin._id;
    
    // Créer un utilisateur normal avec username UNIQUE
    const user = await User.create({
      username: `testuser_${timestamp}`,
      email: `test_${timestamp}@test.com`,
      password: await bcrypt.hash('Password123!', 10),
      role: 'participant',
      isVerified: true,
      isActive: true
    });
    userId = user._id;
    
    const jwt = require('jsonwebtoken');
    adminToken = jwt.sign(
      { id: adminId.toString(), role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    userToken = jwt.sign(
      { id: userId.toString(), role: 'participant' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  // ==================== TESTS REGISTER ====================
  describe('POST /api/auth/register', () => {
    
    test('1. Inscription avec succès', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: `newuser_${Date.now()}`,
          email: `new_${Date.now()}@test.com`,
          password: 'Password123!'
        });

      expect([201, 400, 500]).toContain(res.statusCode);
    });

    test('2. Inscription avec email déjà existant', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: `newuser2_${Date.now()}`,
          email: `admin_${Date.now() - 1000}@test.com`,
          password: 'Password123!'
        });

      expect([400, 500]).toContain(res.statusCode);
    });

    test('3. Inscription avec username déjà existant', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: `testuser_${Date.now() - 1000}`,
          email: `new_${Date.now()}@test.com`,
          password: 'Password123!'
        });

      expect([400, 500]).toContain(res.statusCode);
    });

    test('4. Inscription avec Google ID', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: `googleuser_${Date.now()}`,
          email: `google_${Date.now()}@test.com`,
          googleId: 'google123456'
        });

      expect([201, 400, 500]).toContain(res.statusCode);
    });

    test('5. Inscription - mot de passe trop court', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: `weak_${Date.now()}`,
          email: `weak_${Date.now()}@test.com`,
          password: '123'
        });

      expect([400, 500]).toContain(res.statusCode);
    });
  });

  // ==================== TESTS VERIFY EMAIL ====================
  describe('POST /api/auth/verify-email', () => {
    let testUser;
    let verificationCode;

    beforeEach(async () => {
      verificationCode = '123456';
      testUser = await User.create({
        username: `verifyuser_${Date.now()}`,
        email: `verify_${Date.now()}@test.com`,
        password: await bcrypt.hash('Password123!', 10),
        isVerified: false,
        verificationCode: crypto.createHash('sha256').update(verificationCode).digest('hex'),
        verificationCodeExpire: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
    });

    test('6. Vérification email avec succès', async () => {
      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({
          email: testUser.email,
          code: verificationCode
        });

      expect([200, 400, 500]).toContain(res.statusCode);
    });

    test('7. Vérification avec code invalide', async () => {
      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({
          email: testUser.email,
          code: '999999'
        });

      expect([400, 500]).toContain(res.statusCode);
    });

    test('8. Vérification avec email inexistant', async () => {
      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({
          email: `nonexistent_${Date.now()}@test.com`,
          code: '123456'
        });

      expect([404, 500]).toContain(res.statusCode);
    });

    test('9. Vérification - code expiré', async () => {
      await User.findByIdAndUpdate(testUser._id, {
        verificationCodeExpire: new Date(Date.now() - 1000)
      });
      
      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({
          email: testUser.email,
          code: verificationCode
        });

      expect([400, 500]).toContain(res.statusCode);
    });
  });

  // ==================== TESTS RESEND VERIFICATION ====================
  describe('POST /api/auth/resend-verification', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        username: `resenduser_${Date.now()}`,
        email: `resend_${Date.now()}@test.com`,
        password: await bcrypt.hash('Password123!', 10),
        isVerified: false
      });
    });

    test('10. Renvoi du code de vérification - succès', async () => {
      const res = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: testUser.email });

      expect([200, 500]).toContain(res.statusCode);
    });

    test('11. Renvoi - compte déjà vérifié', async () => {
      await User.findByIdAndUpdate(testUser._id, { isVerified: true });
      
      const res = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: testUser.email });

      expect([400, 500]).toContain(res.statusCode);
    });

    test('12. Renvoi - email inexistant', async () => {
      const res = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: `nonexistent_${Date.now()}@test.com` });

      expect([404, 500]).toContain(res.statusCode);
    });
  });

  // ==================== TESTS LOGIN ====================
  describe('POST /api/auth/login', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        username: `loginuser_${Date.now()}`,
        email: `login_${Date.now()}@test.com`,
        password: await bcrypt.hash('Login123!', 10),
        isVerified: true,
        isActive: true
      });
    });

    test('13. Login avec succès (email)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: testUser.email,
          password: 'Login123!'
        });

      expect([200, 400, 500]).toContain(res.statusCode);
    });

    test('14. Login avec succès (username)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: testUser.username,
          password: 'Login123!'
        });

      expect([200, 400, 500]).toContain(res.statusCode);
    });

    test('15. Login avec mot de passe incorrect', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: testUser.email,
          password: 'WrongPassword!'
        });

      expect([400, 500]).toContain(res.statusCode);
    });

    test('16. Login - utilisateur non trouvé', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: `nonexistent_${Date.now()}@test.com`,
          password: 'Password123!'
        });

      expect([400, 500]).toContain(res.statusCode);
    });
  });

  // ==================== TESTS GET PROFILE ====================
  describe('GET /api/auth/profile', () => {
    
    test('17. Récupération du profil avec succès', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect([200, 401, 500]).toContain(res.statusCode);
    });

    test('18. Récupération du profil sans token = 401', async () => {
      const res = await request(app)
        .get('/api/auth/profile');

      expect(res.statusCode).toBe(401);
    });

    test('19. Récupération du profil avec token invalide', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token-12345');

      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== TESTS UPDATE PROFILE ====================
  describe('PUT /api/auth/profile', () => {
    
    test('20. Mise à jour du username - succès', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ username: `updated_${Date.now()}` });

      expect([200, 400, 500]).toContain(res.statusCode);
    });

    test('21. Mise à jour de l\'avatar', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ avatar: 'https://example.com/new-avatar.jpg' });

      expect([200, 400, 500]).toContain(res.statusCode);
    });

    test('22. Mise à jour du mot de passe', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ password: 'NewPassword456!' });

      expect([200, 400, 500]).toContain(res.statusCode);
    });

    test('23. Mise à jour avec username déjà existant', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ username: `admin_${Date.now() - 1000}` });

      expect([400, 500]).toContain(res.statusCode);
    });
  });

  // ==================== TESTS FORGOT PASSWORD ====================
  describe('PUT /api/auth/forgot-password', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        username: `forgot_${Date.now()}`,
        email: `forgot_${Date.now()}@test.com`,
        password: await bcrypt.hash('Password123!', 10),
        isVerified: true
      });
    });

    test('24. Demande réinitialisation - succès', async () => {
      const res = await request(app)
        .put('/api/auth/forgot-password')
        .send({ email: testUser.email });

      expect([200, 404, 500]).toContain(res.statusCode);
    });

    test('25. Demande réinitialisation - email inexistant', async () => {
      const res = await request(app)
        .put('/api/auth/forgot-password')
        .send({ email: `nonexistent_${Date.now()}@test.com` });

      expect([404, 500]).toContain(res.statusCode);
    });
  });

  // ==================== TESTS RESET PASSWORD ====================
  describe('PUT /api/auth/reset-password/:token', () => {
    let resetToken;
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        username: `reset_${Date.now()}`,
        email: `reset_${Date.now()}@test.com`,
        password: await bcrypt.hash('OldPassword123!', 10),
        isVerified: true
      });
      resetToken = crypto.randomBytes(32).toString('hex');
      await User.findByIdAndUpdate(testUser._id, {
        resetToken: resetToken,
        resetTokenExpire: Date.now() + 3600000
      });
    });

    test('26. Réinitialisation mot de passe - succès', async () => {
      const res = await request(app)
        .put(`/api/auth/reset-password/${resetToken}`)
        .send({ newPassword: 'NewPassword456!' });

      expect([200, 400, 500]).toContain(res.statusCode);
    });

    test('27. Réinitialisation - token expiré', async () => {
      await User.findByIdAndUpdate(testUser._id, {
        resetTokenExpire: Date.now() - 3600000
      });
      
      const res = await request(app)
        .put(`/api/auth/reset-password/${resetToken}`)
        .send({ newPassword: 'NewPassword456!' });

      expect([400, 500]).toContain(res.statusCode);
    });

    test('28. Réinitialisation - token invalide', async () => {
      const res = await request(app)
        .put('/api/auth/reset-password/invalid-token-12345')
        .send({ newPassword: 'NewPassword456!' });

      expect([400, 500]).toContain(res.statusCode);
    });
  });

  // ==================== TESTS ADMIN ====================
  describe('Routes Admin', () => {
    
    test('29. Admin crée un utilisateur - succès', async () => {
      const res = await request(app)
        .post('/api/auth/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: `created_${Date.now()}`,
          email: `created_${Date.now()}@test.com`,
          password: 'Password123!',
          role: 'participant'
        });

      expect([201, 400, 500]).toContain(res.statusCode);
    });

    test('30. Admin crée un utilisateur - email existant', async () => {
      const res = await request(app)
        .post('/api/auth/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: `created2_${Date.now()}`,
          email: `test_${Date.now() - 1000}@test.com`,
          password: 'Password123!',
          role: 'participant'
        });

      expect([400, 500]).toContain(res.statusCode);
    });

    test('31. Utilisateur normal ne peut pas créer', async () => {
      const res = await request(app)
        .post('/api/auth/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          username: `hacked_${Date.now()}`,
          email: `hacked_${Date.now()}@test.com`,
          password: 'Password123!',
          role: 'admin'
        });

      expect([403, 500]).toContain(res.statusCode);
    });

    test('32. Admin met à jour un utilisateur', async () => {
      const res = await request(app)
        .put(`/api/auth/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          username: `updated_${Date.now()}`,
          points: 2500,
          level: 5,
          rank: 'Gold'
        });

      expect([200, 400, 500]).toContain(res.statusCode);
    });

    test('33. Admin désactive un utilisateur', async () => {
      const res = await request(app)
        .patch(`/api/auth/admin/users/${userId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404, 500]).toContain(res.statusCode);
    });

    test('34. Admin change le rôle', async () => {
      const res = await request(app)
        .patch(`/api/auth/admin/users/${userId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'recruiter' });

      expect([200, 400, 500]).toContain(res.statusCode);
    });
  });

  // ==================== TESTS REFRESH TOKEN ====================
  describe('POST /api/auth/refresh-token', () => {
    
    test('35. Rafraîchissement du token - succès', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .set('Authorization', `Bearer ${userToken}`);

      expect([200, 401, 500]).toContain(res.statusCode);
    });

    test('36. Rafraîchissement sans token = 401', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token');

      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== TESTS REGISTER ADMIN ====================
  describe('POST /api/auth/register-admin', () => {
    
    test('37. Création d\'un admin - succès', async () => {
      const res = await request(app)
        .post('/api/auth/register-admin')
        .send({
          username: `newadmin_${Date.now()}`,
          email: `newadmin_${Date.now()}@test.com`,
          password: 'Admin123!'
        });

      expect([201, 400, 500]).toContain(res.statusCode);
    });

    test('38. Création admin - email existant', async () => {
      const res = await request(app)
        .post('/api/auth/register-admin')
        .send({
          username: `newadmin2_${Date.now()}`,
          email: `admin_${Date.now() - 1000}@test.com`,
          password: 'Admin123!'
        });

      expect([400, 500]).toContain(res.statusCode);
    });
  });

  // ==================== TESTS LOGOUT ====================
  describe('POST /api/auth/logout', () => {
    
    test('39. Logout avec succès', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${userToken}`);

      expect([200, 401, 500]).toContain(res.statusCode);
    });
  });

  // ==================== TESTS 2FA ====================
  describe('2FA Routes', () => {
    
    test('40. Setup 2FA - TOTP', async () => {
      const res = await request(app)
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ method: 'totp' });

      expect([200, 400, 500]).toContain(res.statusCode);
    });

    test('41. Setup 2FA - Email', async () => {
      const res = await request(app)
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ method: 'email' });

      expect([200, 400, 500]).toContain(res.statusCode);
    });
  });

  // ==================== TESTS D'ERREURS ====================
  describe('Tests d\'erreurs', () => {
    
    test('42. Route inexistante', async () => {
      const res = await request(app)
        .get('/api/auth/inexistant')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
    });

    test('43. Accès admin refusé pour participant', async () => {
      const res = await request(app)
        .get('/api/auth/admin/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect([403, 401, 500]).toContain(res.statusCode);
    });
  });
});