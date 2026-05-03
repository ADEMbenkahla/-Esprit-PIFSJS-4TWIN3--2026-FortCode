process.env.JWT_SECRET = 'test-secret-key-2024';
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-openai-api-key';
process.env.OPENAI_MODEL = 'gpt-4o-mini';

const { generateScoreSuggestion } = require('../../src/services/aiScoreSuggestionService');

// Mock de fetch global
global.fetch = jest.fn();

describe('AI Score Suggestion Service - Tests Complets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== TEST 1: Succès avec réponse valide ====================
  test('1. generateScoreSuggestion - succès avec réponse valide', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              recommendedScore: 85,
              confidence: "high",
              reasons: ["Good code structure", "Passes all tests"],
              detectedLanguage: "javascript",
              expectedLanguage: "javascript",
              languageMismatch: false,
              note: "Well written solution"
            })
          }
        }]
      })
    };

    global.fetch.mockResolvedValueOnce(mockResponse);

    const result = await generateScoreSuggestion({
      submission: {
        codeSnapshot: "function solve() { return 42; }",
        outputSnapshot: "Test output",
        sonarQube: {
          qualityGateStatus: "PASSED",
          issuesCount: 2,
          metrics: {
            bugs: 0,
            vulnerabilities: 0,
            code_smells: 1
          }
        }
      },
      totalPoints: 100,
      expectedLanguage: "javascript"
    });

    expect(result).toBeDefined();
    expect(result.recommendedScore).toBe(85);
    expect(result.confidence).toBe("high");
    expect(result.totalPoints).toBe(100);
    expect(result.provider).toBe("openai");
  });

  // ==================== TEST 2: Langage non correspondant ====================
  test('2. generateScoreSuggestion - langage non correspondant (score à 0)', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              recommendedScore: 90,
              confidence: "high",
              reasons: ["Good solution"],
              detectedLanguage: "python",
              expectedLanguage: "javascript",
              languageMismatch: true,
              note: "Language mismatch detected"
            })
          }
        }]
      })
    };

    global.fetch.mockResolvedValueOnce(mockResponse);

    const result = await generateScoreSuggestion({
      submission: {
        codeSnapshot: "def solve(): return 42",
        outputSnapshot: "Test output"
      },
      totalPoints: 100,
      expectedLanguage: "javascript"
    });

    // Le score doit être 0 en cas de mismatch
    expect(result.recommendedScore).toBe(0);
    expect(result.languageMismatch).toBe(true);
  });

  // ==================== TEST 3: Erreur API Key manquante ====================
  test('3. generateScoreSuggestion - erreur si OPENAI_API_KEY manquante', async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    await expect(generateScoreSuggestion({
      submission: { codeSnapshot: "test" },
      totalPoints: 100
    })).rejects.toThrow('OPENAI_API_KEY is missing');

    process.env.OPENAI_API_KEY = originalKey;
  });

  // ==================== TEST 4: Erreur HTTP de l'API ====================
  test('4. generateScoreSuggestion - erreur HTTP (status 429)', async () => {
    const mockResponse = {
      ok: false,
      status: 429,
      text: jest.fn().mockResolvedValue('Rate limit exceeded')
    };

    global.fetch.mockResolvedValueOnce(mockResponse);

    await expect(generateScoreSuggestion({
      submission: { codeSnapshot: "test" },
      totalPoints: 100
    })).rejects.toThrow('OpenAI request failed (429): Rate limit exceeded');
  });

  // ==================== TEST 5: Réponse JSON invalide ====================
  test('5. generateScoreSuggestion - réponse JSON invalide', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      })
    };

    global.fetch.mockResolvedValueOnce(mockResponse);

    await expect(generateScoreSuggestion({
      submission: { codeSnapshot: "test" },
      totalPoints: 100
    })).rejects.toThrow('Invalid AI response payload');
  });

  // ==================== TEST 6: Réponse sans choices ====================
  test('6. generateScoreSuggestion - réponse sans choices', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: []
      })
    };

    global.fetch.mockResolvedValueOnce(mockResponse);

    await expect(generateScoreSuggestion({
      submission: { codeSnapshot: "test" },
      totalPoints: 100
    })).rejects.toThrow('Invalid AI response payload');
  });

  // ==================== TEST 7: Score hors limites ====================
  test('7. generateScoreSuggestion - score hors limites (clamp)', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              recommendedScore: 250,
              confidence: "high",
              reasons: ["Excellent code"],
              detectedLanguage: "javascript",
              expectedLanguage: "javascript",
              languageMismatch: false,
              note: "Perfect"
            })
          }
        }]
      })
    };

    global.fetch.mockResolvedValueOnce(mockResponse);

    const result = await generateScoreSuggestion({
      submission: { codeSnapshot: "test" },
      totalPoints: 100,
      expectedLanguage: "javascript"
    });

    // Score doit être clampé à max 100
    expect(result.recommendedScore).toBe(100);
  });

  // ==================== TEST 8: Score négatif ====================
  test('8. generateScoreSuggestion - score négatif (clamp à 0)', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              recommendedScore: -50,
              confidence: "low",
              reasons: ["Poor quality"],
              detectedLanguage: "javascript",
              expectedLanguage: "javascript",
              languageMismatch: false,
              note: "Bad solution"
            })
          }
        }]
      })
    };

    global.fetch.mockResolvedValueOnce(mockResponse);

    const result = await generateScoreSuggestion({
      submission: { codeSnapshot: "test" },
      totalPoints: 100,
      expectedLanguage: "javascript"
    });

    expect(result.recommendedScore).toBe(0);
  });

  // ==================== TEST 9: Confiance invalide ====================
  test('9. generateScoreSuggestion - confiance invalide (fallback medium)', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              recommendedScore: 75,
              confidence: "invalid_value",
              reasons: ["Good effort"],
              detectedLanguage: "javascript",
              expectedLanguage: "javascript",
              languageMismatch: false,
              note: "Well done"
            })
          }
        }]
      })
    };

    global.fetch.mockResolvedValueOnce(mockResponse);

    const result = await generateScoreSuggestion({
      submission: { codeSnapshot: "test" },
      totalPoints: 100,
      expectedLanguage: "javascript"
    });

    expect(result.confidence).toBe("medium");
  });

  // ==================== TEST 10: Total points personnalisé ====================
  test('10. generateScoreSuggestion - total points personnalisé', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              recommendedScore: 42,
              confidence: "medium",
              reasons: ["Partial solution"],
              detectedLanguage: "javascript",
              expectedLanguage: "javascript",
              languageMismatch: false,
              note: "Incomplete"
            })
          }
        }]
      })
    };

    global.fetch.mockResolvedValueOnce(mockResponse);

    const result = await generateScoreSuggestion({
      submission: { codeSnapshot: "test" },
      totalPoints: 50,
      expectedLanguage: "javascript"
    });

    expect(result.totalPoints).toBe(50);
    expect(result.recommendedScore).toBeLessThanOrEqual(50);
  });

  // ==================== TEST 11: Sans expectedLanguage ====================
  test('11. generateScoreSuggestion - sans expectedLanguage', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              recommendedScore: 80,
              confidence: "high",
              reasons: ["Good"],
              detectedLanguage: "javascript",
              expectedLanguage: "",
              languageMismatch: false,
              note: "OK"
            })
          }
        }]
      })
    };

    global.fetch.mockResolvedValueOnce(mockResponse);

    const result = await generateScoreSuggestion({
      submission: { codeSnapshot: "test" },
      totalPoints: 100
    });

    expect(result).toBeDefined();
    expect(result.languageMismatch).toBe(false);
  });
});