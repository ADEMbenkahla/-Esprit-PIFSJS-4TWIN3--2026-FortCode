process.env.JWT_SECRET = 'test-secret-key-2024';
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://localhost:27017/fortcode_test';

const mongoose = require('mongoose');
const Stage = require('../../src/models/Stage');
const Challenge = require('../../src/models/Challenge');

// Mock de dotenv
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

// Mock de console.log et console.error
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

describe('Seed Stages Script - Tests Complets', () => {
  beforeAll(async () => {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/fortcode_test';
    await mongoose.connect(mongoURI);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    mockExit.mockRestore();
  });

  beforeEach(async () => {
    await Challenge.deleteMany({ type: 'Stage' });
    await Stage.deleteMany({});
    jest.clearAllMocks();
  });

  // ==================== TEST 1: Seed réussi ====================
  test('1. seedStages - insère challenges et stages avec succès', async () => {
    // Vérifier que les collections sont vides avant
    const beforeChallenges = await Challenge.countDocuments({ type: 'Stage' });
    const beforeStages = await Stage.countDocuments();
    expect(beforeChallenges).toBe(0);
    expect(beforeStages).toBe(0);
    
    // Exécuter le script
    require('../../src/utils/seedStages');
    
    // Attendre l'exécution asynchrone
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Vérifier que le script a appelé console.log avec succès
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('Seeded successfully')
    );
  });
});

// ==================== TEST 2: Erreur si MONGO_URI manquant ====================
describe('Seed Stages - Erreur MONGO_URI', () => {
  let originalEnv;

  beforeAll(() => {
    originalEnv = process.env.MONGO_URI;
    mockExit.mockClear();
  });

  afterAll(() => {
    process.env.MONGO_URI = originalEnv;
  });

  test('2. seedStages - erreur si MONGO_URI manquant', async () => {
    delete process.env.MONGO_URI;
    mockExit.mockClear();
    
    jest.resetModules();
    
    try {
      require('../../src/utils/seedStages');
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (e) {
      // Ignorer
    }
    
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
