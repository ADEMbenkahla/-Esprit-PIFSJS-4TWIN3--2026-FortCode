process.env.JWT_SECRET = 'test-secret-key-2024';
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-openai-api-key';
process.env.OPENAI_MODEL = 'gpt-4o-mini';

const axios = require('axios');
const AiAnalysisService = require('../../src/services/aiAnalysisService');

// Mock d'axios
jest.mock('axios');

describe('AiAnalysisService - Tests Complets', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = require('../../src/services/aiAnalysisService');
  });

  // ==================== TEST 1: performFullAnalysis avec API Key ====================
  test('1. performFullAnalysis - succès avec API Key valide', async () => {
    const mockResponse = {
      data: {
        choices: [{
          message: {
            content: JSON.stringify({
              bugSummary: "Code is correct but could be optimized",
              bugs: [
                { line: 5, type: "performance", message: "Inefficient loop", explanation: "Nested loops cause O(n²)", suggestion: "// Use map instead" }
              ],
              metrics: {
                reliability_rating: 4,
                security_rating: 5,
                sqale_rating: 4,
                bugs: 0,
                vulnerabilities: 0,
                code_smells: 1,
                qualityScore: 85
              },
              explanation: {
                overview: "Solution uses recursion",
                steps: [{ step: "Base case", logic: "Returns 0 when n=0", highlight: "line 3" }],
                complexity: "O(n) time",
                keyConcepts: ["Recursion", "Memoization"]
              },
              weakAreas: ["Performance"],
              recommendations: [
                { title: "Optimization Guide", url: "https://example.com", type: "article", difficulty: "Mid", reason: "Improve efficiency" }
              ]
            })
          }
        }]
      }
    };

    axios.post.mockResolvedValueOnce(mockResponse);

    const result = await service.performFullAnalysis(
      'function sum(n) { return n === 0 ? 0 : n + sum(n-1); }',
      'javascript',
      'Calculate sum of numbers'
    );

    expect(result).toBeDefined();
    expect(result.bugSummary).toBeDefined();
    expect(result.metrics).toBeDefined();
    expect(result.metrics.qualityScore).toBe(85);
  });

  // ==================== TEST 2: performFullAnalysis sans API Key ====================
  test('2. performFullAnalysis - fallback sans API Key', async () => {
    const originalApiKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    // Recréer le service avec la nouvelle config
    jest.resetModules();
    const serviceWithoutKey = require('../../src/services/aiAnalysisService');

    const result = await serviceWithoutKey.performFullAnalysis(
      'function test() { return 1; }',
      'javascript',
      'Test'
    );

    expect(result).toBeDefined();
    expect(result.bugSummary).toBe('AI analysis currently unavailable.');
    expect(result.metrics.qualityScore).toBe(70);

    process.env.OPENAI_API_KEY = originalApiKey;
  });

  // ==================== TEST 3: performFullAnalysis - erreur API ====================
  test('3. performFullAnalysis - erreur API (fallback)', async () => {
    axios.post.mockRejectedValueOnce(new Error('API Error'));

    const result = await service.performFullAnalysis(
      'function buggy() { return x; }',
      'javascript',
      'Test'
    );

    expect(result).toBeDefined();
    expect(result.bugSummary).toBe('AI analysis currently unavailable.');
    expect(result.metrics.qualityScore).toBe(70);
  });

  // ==================== TEST 4: analyzeBugs ====================
  test('4. analyzeBugs - retourne uniquement les bugs', async () => {
    const mockResponse = {
      data: {
        choices: [{
          message: {
            content: JSON.stringify({
              bugs: [
                { line: 3, type: "logic", message: "Off-by-one error", explanation: "Loop condition wrong", suggestion: "// Use <= instead" }
              ],
              bugSummary: "Has logic error",
              metrics: { qualityScore: 60 },
              explanation: null,
              recommendations: [],
              weakAreas: []
            })
          }
        }]
      }
    };

    axios.post.mockResolvedValueOnce(mockResponse);

    const result = await service.analyzeBugs(
      'for(let i=0; i<arr.length; i++) { return arr[i]; }',
      'javascript'
    );

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  // ==================== TEST 5: explainCode ====================
  test('5. explainCode - retourne l\'explication', async () => {
    const mockResponse = {
      data: {
        choices: [{
          message: {
            content: JSON.stringify({
              explanation: {
                overview: "This is a bubble sort implementation",
                steps: [{ step: "Outer loop", logic: "Iterates n times", highlight: "line 2" }],
                complexity: "O(n²) time",
                keyConcepts: ["Sorting", "Nested loops"]
              },
              bugs: [],
              bugSummary: "",
              metrics: {},
              recommendations: [],
              weakAreas: []
            })
          }
        }]
      }
    };

    axios.post.mockResolvedValueOnce(mockResponse);

    const result = await service.explainCode(
      'function bubbleSort(arr) { for(let i=0; i<arr.length; i++) { for(let j=0; j<arr.length-1; j++) { if(arr[j] > arr[j+1]) { [arr[j], arr[j+1]] = [arr[j+1], arr[j]]; } } } return arr; }',
      'javascript',
      'beginner'
    );

    expect(result).toBeDefined();
    if (result) {
      expect(result.overview).toBeDefined();
    }
  });

  // ==================== TEST 6: recommendResources ====================
  test('6. recommendResources - retourne les recommandations', async () => {
    const mockResponse = {
      data: {
        choices: [{
          message: {
            content: JSON.stringify({
              recommendations: [
                { title: "Learn Recursion", url: "https://example.com/recursion", type: "video", difficulty: "Junior", reason: "Improve recursive thinking" }
              ],
              weakAreas: ["Recursion"],
              bugSummary: "",
              bugs: [],
              metrics: {},
              explanation: {}
            })
          }
        }]
      }
    };

    axios.post.mockResolvedValueOnce(mockResponse);

    const result = await service.recommendResources(
      'function factorial(n) { return n * factorial(n-1); }',
      'javascript',
      'Recursion exercise'
    );

    expect(result).toBeDefined();
    expect(result.recommendations).toBeDefined();
  });

  // ==================== TEST 7: getFallbackMetrics ====================
  test('7. getFallbackMetrics - retourne les métriques par défaut', () => {
    const metrics = service.getFallbackMetrics();
    
    expect(metrics).toBeDefined();
    expect(metrics.reliability_rating).toBe(3);
    expect(metrics.security_rating).toBe(4);
    expect(metrics.sqale_rating).toBe(3);
    expect(metrics.qualityScore).toBe(70);
  });

  // ==================== TEST 8: getFallbackAnalysis ====================
  test('8. getFallbackAnalysis - retourne l\'analyse par défaut', () => {
    const analysis = service.getFallbackAnalysis();
    
    expect(analysis).toBeDefined();
    expect(analysis.bugSummary).toBe('AI analysis currently unavailable.');
    expect(analysis.bugs).toEqual([]);
    expect(analysis.metrics.qualityScore).toBe(70);
  });

  // ==================== TEST 9: queryAi - format JSON invalide ====================
  test('9. queryAi - réponse JSON invalide', async () => {
    const mockResponse = {
      data: {
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      }
    };

    axios.post.mockResolvedValueOnce(mockResponse);

    await expect(service.queryAi('Test prompt')).rejects.toThrow();
  });

  // ==================== TEST 10: queryAi - erreur réseau ====================
  test('10. queryAi - erreur réseau', async () => {
    axios.post.mockRejectedValueOnce(new Error('Network Error'));

    await expect(service.queryAi('Test prompt')).rejects.toThrow('Network Error');
  });
});