process.env.JWT_SECRET = 'test-secret-key-2024';
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://localhost:27017/fortcode_test';

const mongoose = require('mongoose');
const BattleChallenge = require('../../src/models/BattleChallenge');

// Mock de dotenv
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

// Mock de console.log et console.error
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

describe('Seed Battle Challenges Script - Tests Complets', () => {
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
    await BattleChallenge.deleteMany({});
    jest.clearAllMocks();
  });

  // ==================== TEST 1: Seed des challenges ====================
  test('1. seedBattleChallenges - insère les challenges avec succès', async () => {
    // Exécuter le script
    require('../../src/utils/seedBattleChallenges');
    
    // Attendre un peu pour que le script s'exécute
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Vérifier que les challenges ont été insérés
    const challenges = await BattleChallenge.find({});
    expect(challenges.length).toBe(3);
    
    // Vérifier le premier challenge
    expect(challenges[0].title).toBe('The Fibonacci Sequence');
    expect(challenges[0].difficulty).toBe('Easy');
    expect(challenges[0].languages).toHaveProperty('javascript');
    expect(challenges[0].languages).toHaveProperty('python');
  });

  // ==================== TEST 2: Vérification du contenu ====================
  test('2. Vérification du contenu des challenges insérés', async () => {
    require('../../src/utils/seedBattleChallenges');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const challenges = await BattleChallenge.find({}).sort({ title: 1 });
    
    // Vérifier Fibonacci
    const fibonacci = challenges.find(c => c.title === 'The Fibonacci Sequence');
    expect(fibonacci).toBeDefined();
    expect(fibonacci.description).toContain('Fibonacci sequence');
    
    // Vérifier Palindrome Checker
    const palindrome = challenges.find(c => c.title === 'Palindrome Checker');
    expect(palindrome).toBeDefined();
    expect(palindrome.difficulty).toBe('Medium');
    
    // Vérifier Merge Sorted Arrays
    const merge = challenges.find(c => c.title === 'Merge Sorted Arrays');
    expect(merge).toBeDefined();
    expect(merge.difficulty).toBe('Hard');
  });

  // ==================== TEST 3: Nettoyage avant insertion ====================
  test('3. seedBattleChallenges - supprime les anciens challenges avant insertion', async () => {
    // D'abord insérer un challenge existant
    await BattleChallenge.create({
      title: 'Old Challenge',
      description: 'Should be deleted',
      difficulty: 'Easy',
      languages: { javascript: { starterCode: '// old', tests: 'true' } }
    });
    
    const beforeCount = await BattleChallenge.countDocuments();
    expect(beforeCount).toBe(1);
    
    // Exécuter le seed
    require('../../src/utils/seedBattleChallenges');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const afterCount = await BattleChallenge.countDocuments();
    expect(afterCount).toBe(3); // Les 3 nouveaux challenges
  });
});

// ==================== TESTS ERREURS ====================
describe('Seed Battle Challenges - Erreurs', () => {
  let originalEnv;

  beforeAll(() => {
    originalEnv = process.env.MONGO_URI;
    mockExit.mockClear();
  });

  afterAll(() => {
    process.env.MONGO_URI = originalEnv;
  });

  test('4. seedBattleChallenges - erreur si MONGO_URI manquant', async () => {
    delete process.env.MONGO_URI;
    mockExit.mockClear();
    
    jest.resetModules();
    
    try {
      require('../../src/utils/seedBattleChallenges');
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (e) {
      // Ignorer
    }
    
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  test('5. seedBattleChallenges - erreur de connexion MongoDB', async () => {
    const originalUri = process.env.MONGO_URI;
    process.env.MONGO_URI = 'mongodb://localhost:27017/invalid_db';
    mockExit.mockClear();
    
    jest.resetModules();
    
    try {
      require('../../src/utils/seedBattleChallenges');
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (e) {
      // Ignorer
    }
    
    process.env.MONGO_URI = originalUri;
  });
});