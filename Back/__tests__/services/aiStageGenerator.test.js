process.env.JWT_SECRET = 'test-secret-key-2024';
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-openai-api-key';
process.env.OPENAI_MODEL = 'gpt-4o-mini';

const { generateChallenges, generateExercises } = require('../../src/services/aiStageGenerator');

// Mock du service aiExerciseService
jest.mock('../../src/services/aiExerciseService', () => ({
  generateExercises: jest.fn().mockResolvedValue([
    {
      title: 'Generated Challenge',
      description: 'Generated description with example: Input: 1,2 Output: 3',
      difficulty: 'easy',
      language: 'javascript',
      starterCode: 'function solve() {\n  // TODO: implement\n  return undefined;\n}',
      testCases: [
        { name: 'Test 1', assertion: 'solve(1,2) === 3' },
        { name: 'Test 2', assertion: 'solve(0,0) === 0' },
        { name: 'Test 3', assertion: 'solve(-1,1) === 0' }
      ],
      constraints: 'O(1) time complexity',
      xpReward: 50
    }
  ])
}));

describe('AI Stage Generator - Tests Complets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== TESTS generateChallenges ====================
  describe('generateChallenges', () => {
    
    test('1. generateChallenges - avec paramètres par défaut', async () => {
      const result = await generateChallenges({});
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].title).toBe('Generated Challenge');
    });

    test('2. generateChallenges - avec topic personnalisé', async () => {
      const result = await generateChallenges({
        topic: 'Array Manipulation',
        difficulty: 'medium',
        language: 'javascript',
        count: 1
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test('3. generateChallenges - fonctionName fixe "solve"', async () => {
      const { generateExercises: mockGenerateExercises } = require('../../src/services/aiExerciseService');
      mockGenerateExercises.mockClear();
      
      await generateChallenges({
        topic: 'Sum Function',
        count: 2
      });
      
      expect(mockGenerateExercises).toHaveBeenCalledWith(expect.objectContaining({
        functionName: 'solve'
      }));
    });

    test('4. generateChallenges - transmission correcte des paramètres', async () => {
      const { generateExercises: mockGenerateExercises } = require('../../src/services/aiExerciseService');
      mockGenerateExercises.mockClear();
      
      await generateChallenges({
        topic: 'Recursion',
        difficulty: 'hard',
        language: 'javascript',
        count: 3
      });
      
      expect(mockGenerateExercises).toHaveBeenCalledWith({
        topic: 'Recursion',
        difficulty: 'hard',
        language: 'javascript',
        count: 3,
        functionName: 'solve'
      });
    });
  });

  // ==================== TESTS generateExercises (exporté) ====================
  describe('generateExercises - export', () => {
    
    test('5. generateExercises - exporte correctement la fonction', async () => {
      expect(typeof generateExercises).toBe('function');
    });

    test('6. generateExercises - appelle le service sous-jacent', async () => {
      const { generateExercises: mockGenerateExercises } = require('../../src/services/aiExerciseService');
      mockGenerateExercises.mockClear();
      
      await generateExercises({
        topic: 'Test Topic',
        difficulty: 'easy',
        language: 'javascript',
        count: 2,
        functionName: 'customSolve'
      });
      
      expect(mockGenerateExercises).toHaveBeenCalled();
    });
  });

  // ==================== TESTS VALEURS PAR DÉFAUT ====================
  describe('Valeurs par défaut', () => {
    
    test('7. Valeurs par défaut - topic = "general"', async () => {
      const { generateExercises: mockGenerateExercises } = require('../../src/services/aiExerciseService');
      mockGenerateExercises.mockClear();
      
      await generateChallenges({});
      
      expect(mockGenerateExercises).toHaveBeenCalledWith(expect.objectContaining({
        topic: 'general'
      }));
    });

    test('8. Valeurs par défaut - difficulty = "easy"', async () => {
      const { generateExercises: mockGenerateExercises } = require('../../src/services/aiExerciseService');
      mockGenerateExercises.mockClear();
      
      await generateChallenges({});
      
      expect(mockGenerateExercises).toHaveBeenCalledWith(expect.objectContaining({
        difficulty: 'easy'
      }));
    });

    test('9. Valeurs par défaut - language = "javascript"', async () => {
      const { generateExercises: mockGenerateExercises } = require('../../src/services/aiExerciseService');
      mockGenerateExercises.mockClear();
      
      await generateChallenges({});
      
      expect(mockGenerateExercises).toHaveBeenCalledWith(expect.objectContaining({
        language: 'javascript'
      }));
    });

    test('10. Valeurs par défaut - count = 3', async () => {
      const { generateExercises: mockGenerateExercises } = require('../../src/services/aiExerciseService');
      mockGenerateExercises.mockClear();
      
      await generateChallenges({});
      
      expect(mockGenerateExercises).toHaveBeenCalledWith(expect.objectContaining({
        count: 3
      }));
    });
  });

  // ==================== TESTS ERREURS ====================
  describe('Gestion des erreurs', () => {
    
    test('11. Propage les erreurs du service sous-jacent', async () => {
      const { generateExercises: mockGenerateExercises } = require('../../src/services/aiExerciseService');
      mockGenerateExercises.mockRejectedValueOnce(new Error('AI service error'));
      
      await expect(generateChallenges({
        topic: 'Error Test'
      })).rejects.toThrow('AI service error');
    });
  });
});