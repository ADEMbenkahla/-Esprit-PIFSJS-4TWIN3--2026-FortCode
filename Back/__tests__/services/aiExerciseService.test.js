process.env.JWT_SECRET = 'test-secret-key-2024';
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-openai-api-key';
process.env.OPENAI_MODEL = 'gpt-4o-mini';
process.env.ENABLE_AI_STUB = '0';

const axios = require('axios');
const { 
  generateExercises, 
  normalizeLanguage, 
  normalizeDifficulty, 
  RUNNABLE_LANG,
  httpStatusForAiError 
} = require('../../src/services/aiExerciseService');

// Mock d'axios
jest.mock('axios');

describe('AiExerciseService - Tests Complets Améliorés', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== TESTS normalizeLanguage ====================
  describe('normalizeLanguage', () => {
    test('1. Retourne javascript par défaut', () => {
      expect(normalizeLanguage()).toBe('javascript');
      expect(normalizeLanguage('unknown')).toBe('javascript');
      expect(normalizeLanguage(null)).toBe('javascript');
      expect(normalizeLanguage('')).toBe('javascript');
      expect(normalizeLanguage(undefined)).toBe('javascript');
      expect(normalizeLanguage('python')).toBe('javascript');
    });

    test('2. Retourne javascript pour js', () => {
      expect(normalizeLanguage('javascript')).toBe('javascript');
      expect(normalizeLanguage('JS')).toBe('javascript');
      expect(normalizeLanguage('JavaScript')).toBe('javascript');
      expect(normalizeLanguage('jAvAsCrIpT')).toBe('javascript');
      expect(normalizeLanguage('js')).toBe('javascript');
    });

    test('3. Retourne typescript pour ts', () => {
      expect(normalizeLanguage('typescript')).toBe('typescript');
      expect(normalizeLanguage('TypeScript')).toBe('typescript');
      expect(normalizeLanguage('TS')).toBe('typescript');
      expect(normalizeLanguage('tYpEsCrIpT')).toBe('typescript');
      expect(normalizeLanguage('ts')).toBe('typescript');
    });
  });

  // ==================== TESTS normalizeDifficulty ====================
  describe('normalizeDifficulty', () => {
    test('4. Retourne medium par défaut', () => {
      expect(normalizeDifficulty()).toBe('medium');
      expect(normalizeDifficulty('invalid')).toBe('medium');
      expect(normalizeDifficulty(null)).toBe('medium');
      expect(normalizeDifficulty('')).toBe('medium');
      expect(normalizeDifficulty(undefined)).toBe('medium');
      expect(normalizeDifficulty('invalid_difficulty')).toBe('medium');
    });

    test('5. Retourne easy pour easy', () => {
      expect(normalizeDifficulty('easy')).toBe('easy');
      expect(normalizeDifficulty('EASY')).toBe('easy');
      expect(normalizeDifficulty('EaSy')).toBe('easy');
      expect(normalizeDifficulty('Easy')).toBe('easy');
    });

    test('6. Retourne hard pour hard', () => {
      expect(normalizeDifficulty('hard')).toBe('hard');
      expect(normalizeDifficulty('HARD')).toBe('hard');
      expect(normalizeDifficulty('HaRd')).toBe('hard');
      expect(normalizeDifficulty('Hard')).toBe('hard');
    });

    test('7. Retourne expert pour expert', () => {
      expect(normalizeDifficulty('expert')).toBe('expert');
      expect(normalizeDifficulty('EXPERT')).toBe('expert');
      expect(normalizeDifficulty('ExPeRt')).toBe('expert');
      expect(normalizeDifficulty('Expert')).toBe('expert');
    });
  });

  // ==================== TESTS RUNNABLE_LANG ====================
  describe('RUNNABLE_LANG', () => {
    test('8. Contient javascript et typescript', () => {
      expect(RUNNABLE_LANG.has('javascript')).toBe(true);
      expect(RUNNABLE_LANG.has('typescript')).toBe(true);
      expect(RUNNABLE_LANG.has('python')).toBe(false);
      expect(RUNNABLE_LANG.has('java')).toBe(false);
      expect(RUNNABLE_LANG.has('csharp')).toBe(false);
      expect(RUNNABLE_LANG.has('ruby')).toBe(false);
      expect(RUNNABLE_LANG.has('go')).toBe(false);
      expect(RUNNABLE_LANG.has('rust')).toBe(false);
      expect(RUNNABLE_LANG.has('cpp')).toBe(false);
    });
  });

  // ==================== TESTS httpStatusForAiError ====================
  describe('httpStatusForAiError', () => {
    test('9. Retourne 503 pour AI_NOT_CONFIGURED', () => {
      const err = { code: 'AI_NOT_CONFIGURED' };
      expect(httpStatusForAiError(err)).toBe(503);
    });

    test('10. Retourne 400 pour AI_BAD_REQUEST', () => {
      const err = { code: 'AI_BAD_REQUEST' };
      expect(httpStatusForAiError(err)).toBe(400);
      const err2 = { code: 'AI_UNSUPPORTED_LANGUAGE' };
      expect(httpStatusForAiError(err2)).toBe(400);
    });

    test('11. Retourne 429 pour AI_RATE_LIMIT', () => {
      const err = { code: 'AI_RATE_LIMIT' };
      expect(httpStatusForAiError(err)).toBe(429);
    });

    test('12. Retourne 401 pour AI_AUTH', () => {
      const err = { code: 'AI_AUTH' };
      expect(httpStatusForAiError(err)).toBe(401);
    });

    test('13. Retourne 403 pour AI_FORBIDDEN', () => {
      const err = { code: 'AI_FORBIDDEN' };
      expect(httpStatusForAiError(err)).toBe(403);
    });

    test('14. Retourne 502 pour erreur générique', () => {
      const err = { code: 'UNKNOWN' };
      expect(httpStatusForAiError(err)).toBe(502);
      const err2 = { code: 'SOME_ERROR' };
      expect(httpStatusForAiError(err2)).toBe(502);
      const err3 = { code: 'AI_PARSE' };
      expect(httpStatusForAiError(err3)).toBe(502);
    });

    test('15. Retourne le status existant', () => {
      const err = { status: 500 };
      expect(httpStatusForAiError(err)).toBe(500);
      const err2 = { status: 404 };
      expect(httpStatusForAiError(err2)).toBe(404);
      const err3 = { status: 503 };
      expect(httpStatusForAiError(err3)).toBe(503);
      const err4 = { status: 429 };
      expect(httpStatusForAiError(err4)).toBe(429);
    });

    test('16. Retourne 502 pour erreur sans status ni code', () => {
      const err = { message: 'Unknown error' };
      expect(httpStatusForAiError(err)).toBe(502);
      const err2 = {};
      expect(httpStatusForAiError(err2)).toBe(502);
    });
  });

  // ==================== TESTS generateExercises - Erreurs ====================
  describe('generateExercises - Erreurs', () => {
    test('17. Erreur si pas de topic', async () => {
      await expect(generateExercises({})).rejects.toThrow();
      await expect(generateExercises({ topic: '' })).rejects.toThrow();
      await expect(generateExercises({ topic: '   ' })).rejects.toThrow();
      await expect(generateExercises({ topic: null })).rejects.toThrow();
      await expect(generateExercises({ topic: undefined })).rejects.toThrow();
    });

    test('18. Erreur si language non supporté', async () => {
      await expect(generateExercises({ 
        topic: 'test', 
        language: 'python' 
      })).rejects.toThrow('AI generation supports JavaScript or TypeScript');
      
      await expect(generateExercises({ 
        topic: 'test', 
        language: 'java' 
      })).rejects.toThrow();
      
      await expect(generateExercises({ 
        topic: 'test', 
        language: 'ruby' 
      })).rejects.toThrow();
      
      await expect(generateExercises({ 
        topic: 'test', 
        language: 'c++' 
      })).rejects.toThrow();
      
      await expect(generateExercises({ 
        topic: 'test', 
        language: 'go' 
      })).rejects.toThrow();
    });

    test('19. Erreur si OPENAI_API_KEY manquante (sans stub)', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      const originalStub = process.env.ENABLE_AI_STUB;
      delete process.env.OPENAI_API_KEY;
      process.env.ENABLE_AI_STUB = '0';
      
      await expect(generateExercises({ 
        topic: 'test', 
        language: 'javascript' 
      })).rejects.toThrow('OpenAI is not configured');
      
      process.env.OPENAI_API_KEY = originalKey;
      process.env.ENABLE_AI_STUB = originalStub;
    });

    test('20. Erreur avec count négatif (forcé à positif)', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                exercises: [{
                  title: 'Test',
                  description: 'Valid description with example Input: 1 Output: 2',
                  difficulty: 'easy',
                  language: 'javascript',
                  starterCode: 'function solve() { return undefined; }',
                  testCases: [
                    { name: 'Test 1', assertion: 'solve(1) === 2' },
                    { name: 'Test 2', assertion: 'solve(2) === 3' }
                  ],
                  xpReward: 50
                }]
              })
            }
          }]
        }
      };
      
      axios.post.mockResolvedValueOnce(mockResponse);
      
      const result = await generateExercises({
        topic: 'test',
        count: -5
      });
      
      expect(result.length).toBe(1);
    });
  });

  // ==================== TESTS generateExercises - Succès ====================
  describe('generateExercises - Succès avec API', () => {
    const mockValidResponse = {
      data: {
        choices: [{
          message: {
            content: JSON.stringify({
              exercises: [
                {
                  title: 'Addition Function',
                  description: 'Write a function that adds two numbers. Example Input: 1,2 Output: 3 Example Input: 5,7 Output: 12',
                  difficulty: 'easy',
                  language: 'javascript',
                  starterCode: 'function add(a, b) {\n  // TODO: implement\n  return undefined;\n}',
                  testCases: [
                    { name: 'Test 1', assertion: 'add(1,2) === 3' },
                    { name: 'Test 2', assertion: 'add(0,0) === 0' },
                    { name: 'Test 3', assertion: 'add(-1,1) === 0' }
                  ],
                  constraints: 'O(1) time',
                  xpReward: 50
                }
              ]
            })
          }
        }]
      }
    };

    test('21. Génération exercice avec succès', async () => {
      axios.post.mockResolvedValueOnce(mockValidResponse);

      const result = await generateExercises({
        topic: 'Addition',
        difficulty: 'easy',
        language: 'javascript',
        count: 1,
        functionName: 'add'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].title).toBe('Addition Function');
    });

    test('22. Génération multiple exercices', async () => {
      const multiResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                exercises: [
                  {
                    title: 'Exercise 1',
                    description: 'First exercise with example Input: 1 Output: 2',
                    difficulty: 'easy',
                    language: 'javascript',
                    starterCode: 'function solve() { return undefined; }',
                    testCases: [
                      { name: 'Test 1', assertion: 'solve(1) === 2' },
                      { name: 'Test 2', assertion: 'solve(2) === 4' }
                    ],
                    xpReward: 50
                  },
                  {
                    title: 'Exercise 2',
                    description: 'Second exercise with example Input: 5 Output: 10',
                    difficulty: 'medium',
                    language: 'javascript',
                    starterCode: 'function solve() { return undefined; }',
                    testCases: [
                      { name: 'Test 1', assertion: 'solve(5) === 10' },
                      { name: 'Test 2', assertion: 'solve(10) === 20' }
                    ],
                    xpReward: 100
                  }
                ]
              })
            }
          }]
        }
      };

      axios.post.mockResolvedValueOnce(multiResponse);

      const result = await generateExercises({
        topic: 'Math',
        count: 2
      });

      expect(result).toBeDefined();
      expect(result.length).toBe(2);
    });

    test('23. Génération avec locale française', async () => {
      axios.post.mockResolvedValueOnce(mockValidResponse);

      const result = await generateExercises({
        topic: 'Addition',
        locale: 'fr'
      });

      expect(result).toBeDefined();
    });

    test('24. Génération avec locale anglaise', async () => {
      axios.post.mockResolvedValueOnce(mockValidResponse);

      const result = await generateExercises({
        topic: 'Addition',
        locale: 'en'
      });

      expect(result).toBeDefined();
    });

    test('25. Génération sans spécifier de fonctionName', async () => {
      axios.post.mockResolvedValueOnce(mockValidResponse);

      const result = await generateExercises({
        topic: 'Addition',
        count: 1
      });

      expect(result).toBeDefined();
    });

    test('26. Génération avec extraHints', async () => {
      axios.post.mockResolvedValueOnce(mockValidResponse);

      const result = await generateExercises({
        topic: 'Addition',
        extraHints: 'Use recursion or iteration',
        count: 1
      });

      expect(result).toBeDefined();
    });
  });

  // ==================== TESTS generateExercises - Mode Stub ====================
  describe('generateExercises - Mode Stub', () => {
    test('27. Mode stub avec ENABLE_AI_STUB=1', async () => {
      process.env.ENABLE_AI_STUB = '1';
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const result = await generateExercises({
        topic: 'Stub Topic',
        difficulty: 'easy',
        language: 'javascript',
        count: 2,
        functionName: 'solve'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0].title).toContain('[DEV STUB]');
      expect(result[0].testCases.length).toBeGreaterThan(0);

      process.env.OPENAI_API_KEY = originalKey;
      process.env.ENABLE_AI_STUB = '0';
    });
  });

  // ==================== TESTS generateExercises - Retry et validation ====================
  describe('generateExercises - Retry et validation', () => {
    test('28. Description trop courte - validation échouée', async () => {
      const invalidResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                exercises: [
                  {
                    title: 'Bad Exercise',
                    description: 'Too short',
                    difficulty: 'easy',
                    language: 'javascript',
                    starterCode: 'function solve() { return undefined; }',
                    testCases: [
                      { name: 'Test 1', assertion: 'solve(1) === 2' },
                      { name: 'Test 2', assertion: 'solve(2) === 3' }
                    ],
                    xpReward: 50
                  }
                ]
              })
            }
          }]
        }
      };

      axios.post.mockResolvedValueOnce(invalidResponse);
      
      await expect(generateExercises({
        topic: 'Test',
        language: 'javascript'
      })).rejects.toThrow();
    });

    test('29. Starter code trop complet (tests passent) - validation échouée', async () => {
      const invalidResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                exercises: [
                  {
                    title: 'Complete Exercise',
                    description: 'Write a function that adds numbers. Example Input: 1,2 Output: 3',
                    difficulty: 'easy',
                    language: 'javascript',
                    starterCode: 'function solve(n) { return n * 2; }',
                    testCases: [
                      { name: 'Test 1', assertion: 'solve(1) === 2' },
                      { name: 'Test 2', assertion: 'solve(2) === 4' }
                    ],
                    xpReward: 50
                  }
                ]
              })
            }
          }]
        }
      };

      axios.post.mockResolvedValueOnce(invalidResponse);
      
      await expect(generateExercises({
        topic: 'Test',
        language: 'javascript'
      })).rejects.toThrow();
    });

    test('30. Test cases triviaux (assertion true) - validation échouée', async () => {
      const invalidResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                exercises: [
                  {
                    title: 'Trivial Exercise',
                    description: 'Test with trivial assertions. Example Input: 1 Output: 2',
                    difficulty: 'easy',
                    language: 'javascript',
                    starterCode: 'function solve() { return undefined; }',
                    testCases: [
                      { name: 'Test 1', assertion: 'true' },
                      { name: 'Test 2', assertion: 'true' }
                    ],
                    xpReward: 50
                  }
                ]
              })
            }
          }]
        }
      };

      axios.post.mockResolvedValueOnce(invalidResponse);
      
      await expect(generateExercises({
        topic: 'Test',
        language: 'javascript'
      })).rejects.toThrow();
    });

    test('31. Nombre de test cases insuffisant (< 2)', async () => {
      const invalidResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                exercises: [
                  {
                    title: 'Bad Exercise',
                    description: 'Valid description with example Input: 1 Output: 2',
                    difficulty: 'easy',
                    language: 'javascript',
                    starterCode: 'function solve() { return undefined; }',
                    testCases: [
                      { name: 'Test 1', assertion: 'solve(1) === 2' }
                    ],
                    xpReward: 50
                  }
                ]
              })
            }
          }]
        }
      };

      axios.post.mockResolvedValueOnce(invalidResponse);
      
      await expect(generateExercises({
        topic: 'Test',
        language: 'javascript'
      })).rejects.toThrow();
    });

    test('32. Fonction non déclarée dans starterCode', async () => {
      const invalidResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                exercises: [
                  {
                    title: 'Invalid Exercise',
                    description: 'Valid description with example Input: 1 Output: 2',
                    difficulty: 'easy',
                    language: 'javascript',
                    starterCode: '// No function here',
                    testCases: [
                      { name: 'Test 1', assertion: 'solve(1) === 2' },
                      { name: 'Test 2', assertion: 'solve(2) === 3' }
                    ],
                    xpReward: 50
                  }
                ]
              })
            }
          }]
        }
      };

      axios.post.mockResolvedValueOnce(invalidResponse);
      
      await expect(generateExercises({
        topic: 'Test',
        language: 'javascript',
        functionName: 'solve'
      })).rejects.toThrow();
    });
  });

  // ==================== TESTS ERREURS RÉSEAU ====================
  describe('generateExercises - Erreurs réseau', () => {
    test('33. Erreur réseau - timeout', async () => {
      axios.post.mockRejectedValueOnce(new Error('Network timeout'));
      
      await expect(generateExercises({
        topic: 'Test',
        language: 'javascript'
      })).rejects.toThrow();
    });

    test('34. Erreur HTTP 429 - rate limit', async () => {
      const error = {
        response: { status: 429, headers: {} },
        message: 'Rate limit exceeded'
      };
      axios.post.mockRejectedValueOnce(error);
      
      await expect(generateExercises({
        topic: 'Test',
        language: 'javascript'
      })).rejects.toThrow();
    });

    test('35. Erreur HTTP 500 - server error', async () => {
      const error = {
        response: { status: 500, headers: {} },
        message: 'Internal server error'
      };
      axios.post.mockRejectedValueOnce(error);
      
      await expect(generateExercises({
        topic: 'Test',
        language: 'javascript'
      })).rejects.toThrow();
    });

    test('36. Erreur HTTP 503 - service unavailable', async () => {
      const error = {
        response: { status: 503, headers: {} },
        message: 'Service unavailable'
      };
      axios.post.mockRejectedValueOnce(error);
      
      await expect(generateExercises({
        topic: 'Test',
        language: 'javascript'
      })).rejects.toThrow();
    });
  });

  // ==================== TESTS VALEURS LIMITES ====================
  describe('generateExercises - Valeurs limites', () => {
    test('37. Count supérieur à 20 (limité à 20)', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                exercises: Array(20).fill({
                  title: 'Exercise',
                  description: 'Valid description with example Input: 1 Output: 2',
                  difficulty: 'easy',
                  language: 'javascript',
                  starterCode: 'function solve() { return undefined; }',
                  testCases: [
                    { name: 'Test 1', assertion: 'solve(1) === 2' },
                    { name: 'Test 2', assertion: 'solve(2) === 3' }
                  ],
                  xpReward: 50
                })
              })
            }
          }]
        }
      };

      axios.post.mockResolvedValueOnce(mockResponse);

      const result = await generateExercises({
        topic: 'Test',
        count: 100
      });

      expect(result.length).toBeLessThanOrEqual(20);
    });

    test('38. Count = 0 (forcé à 1)', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                exercises: [{
                  title: 'Exercise',
                  description: 'Valid description with example Input: 1 Output: 2',
                  difficulty: 'easy',
                  language: 'javascript',
                  starterCode: 'function solve() { return undefined; }',
                  testCases: [
                    { name: 'Test 1', assertion: 'solve(1) === 2' },
                    { name: 'Test 2', assertion: 'solve(2) === 3' }
                  ],
                  xpReward: 50
                }]
              })
            }
          }]
        }
      };

      axios.post.mockResolvedValueOnce(mockResponse);

      const result = await generateExercises({
        topic: 'Test',
        count: 0
      });

      expect(result.length).toBe(1);
    });

    test('39. Très grand topic (1000 caractères)', async () => {
      const longTopic = 'A'.repeat(1000);
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                exercises: [{
                  title: 'Long Topic Exercise',
                  description: 'Valid description with example Input: 1 Output: 2',
                  difficulty: 'easy',
                  language: 'javascript',
                  starterCode: 'function solve() { return undefined; }',
                  testCases: [
                    { name: 'Test 1', assertion: 'solve(1) === 2' },
                    { name: 'Test 2', assertion: 'solve(2) === 3' }
                  ],
                  xpReward: 50
                }]
              })
            }
          }]
        }
      };
      
      axios.post.mockResolvedValueOnce(mockResponse);
      
      const result = await generateExercises({
        topic: longTopic,
        count: 1
      });
      
      expect(result).toBeDefined();
    });
  });
});