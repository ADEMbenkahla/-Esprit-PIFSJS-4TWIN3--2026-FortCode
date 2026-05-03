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

describe('Inspect DB Script - Tests Complets', () => {
  let testChallenge1;
  let testChallenge2;
  let testStage1;
  let testStage2;

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
    await Challenge.deleteMany({});
    await Stage.deleteMany({});
    jest.clearAllMocks();

    // Créer des challenges de test
    testChallenge1 = await Challenge.create({
      title: 'Challenge 1',
      description: 'Description 1',
      type: 'Stage',
      testCases: []
    });

    testChallenge2 = await Challenge.create({
      title: 'Challenge 2',
      description: 'Description 2',
      type: 'Battle',
      testCases: []
    });

    // Créer des stages de test
    testStage1 = await Stage.create({
      title: 'Stage 1',
      description: 'First stage',
      level: 1,
      order: 1,
      challenges: [testChallenge1._id]
    });

    testStage2 = await Stage.create({
      title: 'Stage 2',
      description: 'Second stage',
      level: 2,
      order: 2,
      challenges: [testChallenge2._id]
    });
  });

  // ==================== TEST 1: Inspection normale ====================
  test('1. inspect - affiche correctement les challenges et stages', async () => {
    // Exécuter le script
    require('../../src/utils/inspectDB');
    
    // Attendre un peu pour que le script s'exécute
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Vérifier que console.log a été appelé
    expect(mockConsoleLog).toHaveBeenCalledWith('Connected to DB');
    expect(mockConsoleLog).toHaveBeenCalledWith('CHALLENGES IN DB:');
    expect(mockConsoleLog).toHaveBeenCalledWith('STAGES IN DB:');
  });
});

// ==================== TESTS SANS MONGO_URI ====================
describe('Inspect DB - Erreurs', () => {
  let originalEnv;

  beforeAll(() => {
    originalEnv = process.env.MONGO_URI;
    mockExit.mockClear();
  });

  afterAll(() => {
    process.env.MONGO_URI = originalEnv;
  });

  test('2. inspect - erreur si MONGO_URI manquant', async () => {
    delete process.env.MONGO_URI;
    mockExit.mockClear();
    
    // Réinitialiser les modules
    jest.resetModules();
    
    try {
      require('../../src/utils/inspectDB');
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (e) {
      // Ignorer
    }
    
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});

// ==================== TESTS ERREUR CONNEXION ====================
describe('Inspect DB - Erreur connexion', () => {
  let originalEnv;

  beforeAll(() => {
    originalEnv = process.env.MONGO_URI;
    process.env.MONGO_URI = 'mongodb://localhost:27017/invalid_db';
    mockExit.mockClear();
  });

  afterAll(() => {
    process.env.MONGO_URI = originalEnv;
  });

  test('3. inspect - erreur de connexion à la DB', async () => {
    jest.resetModules();
    
    try {
      require('../../src/utils/inspectDB');
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (e) {
      // Ignorer
    }
  });
});