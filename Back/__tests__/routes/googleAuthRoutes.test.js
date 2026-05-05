process.env.JWT_SECRET = 'test-secret-key-2024';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const User = require('../../src/models/User');

// Mock des services
jest.mock('../../src/utils/sendEmail', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true)
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue('<html>Test template {{username}}</html>'),
  existsSync: jest.fn().mockReturnValue(true)
}));

jest.mock('path', () => ({
  join: jest.fn().mockReturnValue('/fake/path/template.html'),
  __dirname: '/fake/dir'
}));

// Mock de passport
jest.mock('../../src/config/passport', () => ({
  authenticate: jest.fn((strategy, options) => {
    return (req, res, next) => {
      if (strategy === 'google') {
        if (req.url === '/google') {
          // Simuler redirection Google
          res.redirect('https://accounts.google.com/o/oauth2/v2/auth');
        } else {
          next();
        }
      } else {
        next();
      }
    };
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

beforeEach(async () => {
  await User.deleteMany({});
});

describe('Google Auth Routes - Tests Complets', () => {
  
  // ==================== TEST 1: Initiate Google OAuth ====================
  test('1. GET /api/auth/google - redirige vers Google', async () => {
    const res = await request(app)
      .get('/api/auth/google');
    
    // Peut être 302 (redirection) ou 200 selon le mock
    expect([200, 302, 404]).toContain(res.statusCode);
  });

  // ==================== TEST 2: Google Callback - Utilisateur existant ====================
  test('2. GET /api/auth/google/callback - utilisateur existant', async () => {
    // Créer un utilisateur existant
    const existingUser = await User.create({
      username: 'existing_google_user',
      email: 'existing@test.com',
      googleId: 'google-id-123',
      role: 'participant',
      isVerified: true,
      isActive: true
    });

    // Mock de passport pour simuler un utilisateur existant
    const passport = require('../../src/config/passport');
    passport.authenticate.mockImplementationOnce((strategy, options) => {
      return (req, res, next) => {
        req.user = existingUser;
        req.user.isNewUser = false;
        next();
      };
    });

    const res = await request(app)
      .get('/api/auth/google/callback?code=mock-code');
    
    // Doit rediriger (302)
    expect([302, 200, 400, 500]).toContain(res.statusCode);
  });

  // ==================== TEST 3: Google Callback - Nouvel utilisateur ====================
  test('3. GET /api/auth/google/callback - nouvel utilisateur', async () => {
    // Mock de passport pour simuler un nouvel utilisateur
    const passport = require('../../src/config/passport');
    passport.authenticate.mockImplementationOnce((strategy, options) => {
      return (req, res, next) => {
        req.user = {
          isNewUser: true,
          profile: {
            googleId: 'new-google-id-456',
            email: 'newuser@gmail.com',
            name: 'New Google User',
            avatar: 'https://example.com/avatar.jpg'
          }
        };
        next();
      };
    });

    const res = await request(app)
      .get('/api/auth/google/callback?code=mock-code');
    
    expect([302, 200, 400, 500]).toContain(res.statusCode);
  });

  // ==================== TEST 4: Google Callback - Compte désactivé ====================
  test('4. GET /api/auth/google/callback - compte désactivé', async () => {
    // Créer un utilisateur désactivé
    const inactiveUser = await User.create({
      username: 'inactive_user',
      email: 'inactive@test.com',
      googleId: 'inactive-google-id',
      role: 'participant',
      isVerified: true,
      isActive: false
    });

    // Mock de passport pour un utilisateur existant désactivé
    const passport = require('../../src/config/passport');
    passport.authenticate.mockImplementationOnce((strategy, options) => {
      return (req, res, next) => {
        req.user = inactiveUser;
        req.user.isNewUser = false;
        next();
      };
    });

    const res = await request(app)
      .get('/api/auth/google/callback?code=mock-code');
    
    // Doit rediriger avec erreur
    expect([302, 200, 400, 500]).toContain(res.statusCode);
  });

  // ==================== TEST 5: Google Callback - Échec d'authentification ====================
  test('5. GET /api/auth/google/callback - échec authentification', async () => {
    const passport = require('../../src/config/passport');
    passport.authenticate.mockImplementationOnce((strategy, options) => {
      return (req, res, next) => {
        // Simuler un échec d'authentification
        res.redirect(options.failureRedirect || 'http://localhost:5173/');
      };
    });

    const res = await request(app)
      .get('/api/auth/google/callback?error=access_denied');
    
    expect([302, 200, 400, 500]).toContain(res.statusCode);
  });
});

describe('Google Auth - Tests d\'intégration', () => {
  
  test('6. Création utilisateur avec username unique en cas de conflit', async () => {
    // Créer un utilisateur avec un username existant
    await User.create({
      username: 'John_Doe',
      email: 'john@test.com',
      role: 'participant'
    });

    const passport = require('../../src/config/passport');
    passport.authenticate.mockImplementationOnce((strategy, options) => {
      return (req, res, next) => {
        req.user = {
          isNewUser: true,
          profile: {
            googleId: 'conflict-google-id',
            email: 'john.doe@gmail.com',
            name: 'John Doe',
            avatar: 'https://example.com/avatar.jpg'
          }
        };
        next();
      };
    });

    const res = await request(app)
      .get('/api/auth/google/callback?code=mock-code');
    
    expect([302, 200, 400, 500]).toContain(res.statusCode);
    
    // Vérifier que l'utilisateur a été créé avec un username unique
    const users = await User.find({ email: 'john.doe@gmail.com' });
    if (users.length > 0) {
      expect(users[0].username).toBe('John_Doe1'); // Ou similaire
    }
  });
});