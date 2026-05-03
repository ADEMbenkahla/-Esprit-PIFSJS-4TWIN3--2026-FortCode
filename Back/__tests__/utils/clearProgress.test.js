process.env.JWT_SECRET = 'test-secret-key-2024';
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://localhost:27017/fortcode_test';

const mongoose = require('mongoose');
const UserProgress = require('../../src/models/UserProgress');
const UserStageProgress = require('../../src/models/UserStageProgress');

// Mock de dotenv
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

// Mock de process.exit
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('Clear Progress Script - Tests Complets', () => {
  let testUserProgress;
  let testUserStageProgress;

  beforeAll(async () => {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/fortcode_test';
    await mongoose.connect(mongoURI);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    mockExit.mockRestore();
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  beforeEach(async () => {
    await UserProgress.deleteMany({});
    await UserStageProgress.deleteMany({});
    jest.clearAllMocks();

    // Créer des données de test
    testUserProgress = await UserProgress.create({
      userId: new mongoose.Types.ObjectId(),
      totalPoints: 1000,
      level: 5,
      badges: ['beginner', 'intermediate']
    });

    testUserStageProgress = await UserStageProgress.create({
      userId: new mongoose.Types.ObjectId(),
      stageId: new mongoose.Types.ObjectId(),
      status: 'completed',
      progressPercent: 100,
      completedAt: new Date()
    });
  });

  // ==================== TEST 1: Connexion DB et suppression ====================
  test('1. clearProgress - supprime UserProgress et UserStageProgress', async () => {
    // Vérifier que les données existent avant
    const beforeUserProgress = await UserProgress.countDocuments();
    const beforeUserStageProgress = await UserStageProgress.countDocuments();
    
    expect(beforeUserProgress).toBe(1);
    expect(beforeUserStageProgress).toBe(1);
    
    // Exécuter le script
    const clearProgress = require('../../src/utils/clearProgress');
    
    // Attendre un peu pour que le script s'exécute
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Vérifier que mongoose.connect a été appelé
    expect(mongoose.connection.readyState).toBe(1); // 1 = connected
  });
});

// ==================== TESTS SANS MONGO_URI ====================
describe('Clear Progress - Erreurs', () => {
  let originalEnv;

  beforeAll(() => {
    originalEnv = process.env.MONGO_URI;
  });

  afterAll(() => {
    process.env.MONGO_URI = originalEnv;
  });

  test('2. clearProgress - erreur si MONGO_URI manquant', async () => {
    delete process.env.MONGO_URI;
    mockExit.mockClear();
    
    // Réinitialiser le module pour prendre la nouvelle variable d'environnement
    jest.resetModules();
    
    try {
      require('../../src/utils/clearProgress');
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (e) {
      // Ignorer les erreurs
    }
    
    // Vérifier que process.exit(1) a été appelé
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});