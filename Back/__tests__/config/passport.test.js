process.env.JWT_SECRET = 'test-secret-key-2024';
process.env.NODE_ENV = 'test';

// Configurer les variables d'environnement pour Google OAuth
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.GOOGLE_CALLBACK_URL = 'http://localhost:5000/api/auth/google/callback';

const mongoose = require('mongoose');
const User = require('../../src/models/User');
const passport = require('../../src/config/passport');

// Mock de passport-google-oauth20
jest.mock('passport-google-oauth20', () => ({
  Strategy: jest.fn().mockImplementation((config, verify) => {
    return { name: 'google', verify };
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

describe('Passport Google OAuth Configuration', () => {
  let verifyCallback;

  beforeEach(async () => {
    await User.deleteMany({});
    
    // Récupérer le callback de vérification du strategy
    const GoogleStrategy = require('passport-google-oauth20').Strategy;
    const strategyCall = GoogleStrategy.mock.calls[0];
    if (strategyCall && strategyCall[1]) {
      verifyCallback = strategyCall[1];
    }
  });

  describe('Google Strategy Verification', () => {
    
    test('1. Utilisateur existant avec email - mise à jour googleId', async () => {
      // Créer un utilisateur existant
      const existingUser = await User.create({
        username: 'existinguser',
        email: 'existing@test.com',
        password: null,
        role: 'participant',
        isVerified: true
      });

      const profile = {
        id: 'google-123456',
        emails: [{ value: 'existing@test.com' }],
        displayName: 'Existing User',
        photos: [{ value: 'https://example.com/photo.jpg' }]
      };

      let resultUser = null;
      let resultError = null;

      await verifyCallback('access-token', 'refresh-token', profile, (err, user) => {
        resultError = err;
        resultUser = user;
      });

      expect(resultError).toBeNull();
      expect(resultUser._id.toString()).toBe(existingUser._id.toString());
      
      // Vérifier que googleId a été mis à jour
      const updatedUser = await User.findById(existingUser._id);
      expect(updatedUser.googleId).toBe('google-123456');
    });

    test('2. Utilisateur existant avec googleId déjà présent', async () => {
      const existingUser = await User.create({
        username: 'googleuser',
        email: 'google@test.com',
        googleId: 'google-789',
        password: null,
        role: 'participant',
        isVerified: true
      });

      const profile = {
        id: 'google-789',
        emails: [{ value: 'google@test.com' }],
        displayName: 'Google User',
        photos: [{ value: 'https://example.com/photo.jpg' }]
      };

      let resultUser = null;
      let resultError = null;

      await verifyCallback('access-token', 'refresh-token', profile, (err, user) => {
        resultError = err;
        resultUser = user;
      });

      expect(resultError).toBeNull();
      expect(resultUser._id.toString()).toBe(existingUser._id.toString());
    });

    test('3. Nouvel utilisateur - retourne isNewUser avec profil', async () => {
      const profile = {
        id: 'google-new-123',
        emails: [{ value: 'newuser@test.com' }],
        displayName: 'New User',
        photos: [{ value: 'https://example.com/photo.jpg' }]
      };

      let resultUser = null;
      let resultError = null;

      await verifyCallback('access-token', 'refresh-token', profile, (err, user) => {
        resultError = err;
        resultUser = user;
      });

      expect(resultError).toBeNull();
      expect(resultUser.isNewUser).toBe(true);
      expect(resultUser.profile).toBeDefined();
      expect(resultUser.profile.googleId).toBe('google-new-123');
      expect(resultUser.profile.email).toBe('newuser@test.com');
      expect(resultUser.profile.name).toBe('New User');
      expect(resultUser.profile.avatar).toBe('https://example.com/photo.jpg');
    });

    test('4. Nouvel utilisateur sans photo - utilise avatar par défaut', async () => {
      const profile = {
        id: 'google-no-photo',
        emails: [{ value: 'nophoto@test.com' }],
        displayName: 'No Photo User',
        photos: []  // Pas de photo
      };

      let resultUser = null;
      let resultError = null;

      await verifyCallback('access-token', 'refresh-token', profile, (err, user) => {
        resultError = err;
        resultUser = user;
      });

      expect(resultError).toBeNull();
      expect(resultUser.isNewUser).toBe(true);
      expect(resultUser.profile.avatar).toContain('dicebear.com');
    });

    test('5. Erreur lors de la recherche utilisateur', async () => {
      // Simuler une erreur DB
      const originalFindOne = User.findOne;
      User.findOne = jest.fn().mockRejectedValueOnce(new Error('Database error'));

      const profile = {
        id: 'google-error',
        emails: [{ value: 'error@test.com' }],
        displayName: 'Error User'
      };

      let resultError = null;

      await verifyCallback('access-token', 'refresh-token', profile, (err, user) => {
        resultError = err;
      });

      expect(resultError).toBeDefined();
      expect(resultError.message).toBe('Database error');

      User.findOne = originalFindOne;
    });
  });

  describe('Passport Serialization', () => {
    
    test('6. serializeUser - sauvegarde l\'utilisateur', () => {
      const user = { id: '123', username: 'testuser' };
      let serialized = null;
      
      passport.serializeUser((user, done) => {
        done(null, user);
      });
      
      // Appeler manuellement la fonction de sérialisation
      const serializeFn = passport._serializers[0];
      serializeFn(user, (err, result) => {
        serialized = result;
      });
      
      expect(serialized).toEqual(user);
    });

    test('7. deserializeUser - restaure l\'utilisateur', () => {
      const user = { id: '123', username: 'testuser' };
      let deserialized = null;
      
      passport.deserializeUser((user, done) => {
        done(null, user);
      });
      
      const deserializeFn = passport._deserializers[0];
      deserializeFn(user, (err, result) => {
        deserialized = result;
      });
      
      expect(deserialized).toEqual(user);
    });
  });

  describe('Configuration sans credentials Google', () => {
    
    test('8. Affiche un avertissement si credentials manquants', () => {
      // Sauvegarder les variables originales
      const originalClientId = process.env.GOOGLE_CLIENT_ID;
      const originalClientSecret = process.env.GOOGLE_CLIENT_SECRET;
      
      // Supprimer les credentials
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      
      // Espionner console.warn
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Recharger le module (simuler)
      jest.isolateModules(() => {
        require('../../src/config/passport');
      });
      
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('WARNING: Google OAuth credentials missing')
      );
      
      warnSpy.mockRestore();
      
      // Restaurer les variables
      process.env.GOOGLE_CLIENT_ID = originalClientId;
      process.env.GOOGLE_CLIENT_SECRET = originalClientSecret;
    });
  });
});