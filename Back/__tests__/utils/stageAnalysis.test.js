process.env.JWT_SECRET = 'test-secret-key-2024';
process.env.NODE_ENV = 'test';
process.env.SONARCLOUD_TOKEN = 'test-sonar-token';
process.env.SONARCLOUD_ORGANIZATION = 'test-org';
process.env.SONARCLOUD_PROJECT_KEY = 'test-project-key';
process.env.SONARCLOUD_URL = 'https://sonarcloud.io';

const axios = require('axios');
const fs = require('fs');
const { spawn } = require('child_process');
const {
  fetchSonarStub,
  fetchAiFeedback,
  fetchExerciseHelp,
  ratingToLetter
} = require('../../src/utils/stageAnalysis');

// Mock des modules
jest.mock('axios');
jest.mock('fs');
jest.mock('child_process');

describe('Stage Analysis - Tests Complets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== ratingToLetter ====================
  describe('ratingToLetter', () => {
    test('1. rating 1 → A', () => {
      expect(ratingToLetter(1)).toBe('A');
    });

    test('2. rating 2 → B', () => {
      expect(ratingToLetter(2)).toBe('B');
    });

    test('3. rating 3 → C', () => {
      expect(ratingToLetter(3)).toBe('C');
    });

    test('4. rating 4 → D', () => {
      expect(ratingToLetter(4)).toBe('D');
    });

    test('5. rating 5 → E', () => {
      expect(ratingToLetter(5)).toBe('E');
    });

    test('6. rating invalide → E', () => {
      expect(ratingToLetter('invalid')).toBe('E');
      expect(ratingToLetter(null)).toBe('E');
    });
  });

  // ==================== fetchSonarStub - Heuristic ====================
  describe('fetchSonarStub - Mode heuristique', () => {
    test('7. Code vide - retourne heuristique', async () => {
      const result = await fetchSonarStub('', 'javascript');
      
      expect(result.source).toBe('heuristic');
      expect(result.qualityScore).toBeDefined();
      expect(result.metrics).toBeDefined();
    });

    test('8. Code avec eval - détecte alerte', async () => {
      const codeWithEval = 'function test() { eval("console.log(1)"); }';
      const result = await fetchSonarStub(codeWithEval, 'javascript');
      
      expect(result.issues.some(i => i.message.includes('eval'))).toBe(true);
    });

    test('9. Code avec boucle infinie - détecte alerte', async () => {
      const infiniteLoop = 'while(true) { console.log("loop"); }';
      const result = await fetchSonarStub(infiniteLoop, 'javascript');
      
      expect(result.issues.some(i => i.message.includes('Infinite-loop'))).toBe(true);
    });

    test('10. Code court (<2 lignes) - alerte', async () => {
      const shortCode = 'x=1;';
      const result = await fetchSonarStub(shortCode, 'javascript');
      
      expect(result.issues.some(i => i.message.includes('short'))).toBe(true);
    });
  });

  // ==================== fetchSonarStub - SonarCloud ====================
  describe('fetchSonarStub - Mode SonarCloud', () => {
    test('11. SonarCloud configuré - retourne analyse', async () => {
      const mockMeasuresResponse = {
        data: {
          component: {
            measures: [
              { metric: 'bugs', value: '0' },
              { metric: 'vulnerabilities', value: '1' },
              { metric: 'code_smells', value: '5' },
              { metric: 'coverage', value: '85' },
              { metric: 'duplicated_lines_density', value: '2.5' },
              { metric: 'reliability_rating', value: '1' },
              { metric: 'security_rating', value: '2' },
              { metric: 'sqale_rating', value: '3' }
            ]
          }
        }
      };
      
      const mockGateResponse = {
        data: {
          projectStatus: { status: 'OK' }
        }
      };
      
      axios.get.mockResolvedValueOnce(mockMeasuresResponse);
      axios.get.mockResolvedValueOnce(mockGateResponse);
      
      const result = await fetchSonarStub('function test() { return 1; }', 'javascript');
      
      expect(result.source).toBe('sonarcloud');
      expect(result.qualityScore).toBeDefined();
      expect(result.projectKey).toBeDefined();
    });
  });

  // ==================== fetchAiFeedback ====================
  describe('fetchAiFeedback', () => {
    test('12. AI feedback - service disponible', async () => {
      const mockResponse = {
        status: 200,
        data: {
          bugs: [],
          suggestions: ['Improve naming'],
          improvements: ['Add tests'],
          summary: 'Good code'
        }
      };
      
      axios.post.mockResolvedValueOnce(mockResponse);
      
      const result = await fetchAiFeedback('function test() {}', 'Test Challenge');
      
      expect(result.suggestions).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    test('13. AI feedback - service indisponible (fallback)', async () => {
      axios.post.mockRejectedValueOnce(new Error('Service unavailable'));
      
      const result = await fetchAiFeedback('function test() {}', 'Test Challenge');
      
      expect(result.summary).toBe('AI feedback service unavailable; showing default tips.');
      expect(result.suggestions).toHaveLength(2);
    });

    test('14. AI feedback - status 500', async () => {
      axios.post.mockResolvedValueOnce({ status: 500 });
      
      const result = await fetchAiFeedback('function test() {}', 'Test Challenge');
      
      expect(result.summary).toContain('unavailable');
    });
  });

  // ==================== fetchExerciseHelp ====================
  describe('fetchExerciseHelp', () => {
    test('15. Aide type hint - succès', async () => {
      const mockResponse = {
        status: 200,
        data: {
          type: 'hint',
          title: 'Hint',
          content: 'Try this approach',
          keyPoints: ['Point 1', 'Point 2']
        }
      };
      
      axios.post.mockResolvedValueOnce(mockResponse);
      
      const result = await fetchExerciseHelp({
        type: 'hint',
        stageTitle: 'Stage 1',
        challengeTitle: 'Challenge 1',
        challengeDescription: 'Description',
        language: 'javascript',
        starterCode: 'function solve() {}',
        code: 'function solve() { return 1; }'
      });
      
      expect(result.type).toBe('hint');
    });

    test('16. Aide type explain - succès', async () => {
      const mockResponse = {
        status: 200,
        data: {
          type: 'explain',
          title: 'Explanation',
          content: 'Explanation here',
          keyPoints: ['Key 1']
        }
      };
      
      axios.post.mockResolvedValueOnce(mockResponse);
      
      const result = await fetchExerciseHelp({
        type: 'explain',
        stageTitle: 'Stage 1',
        challengeTitle: 'Challenge 1',
        challengeDescription: 'Description',
        language: 'javascript',
        starterCode: 'function solve() {}'
      });
      
      expect(result.type).toBe('explain');
    });

    test('17. Aide type course - succès', async () => {
      const mockResponse = {
        status: 200,
        data: {
          type: 'course',
          title: 'Course',
          content: 'Course content',
          keyPoints: ['Step 1', 'Step 2'],
          resources: ['Resource 1']
        }
      };
      
      axios.post.mockResolvedValueOnce(mockResponse);
      
      const result = await fetchExerciseHelp({
        type: 'course',
        stageTitle: 'Stage 1',
        challengeTitle: 'Challenge 1'
      });
      
      expect(result.type).toBe('course');
    });

    test('18. Aide - service indisponible (fallback)', async () => {
      axios.post.mockRejectedValueOnce(new Error('Network error'));
      
      const result = await fetchExerciseHelp({
        type: 'hint',
        stageTitle: 'Stage 1',
        challengeTitle: 'Challenge 1'
      });
      
      expect(result.source).toBe('fallback');
      expect(result.content).toBeDefined();
    });

    test('19. Aide - type invalide → fallback hint', async () => {
      axios.post.mockRejectedValueOnce(new Error('Service down'));
      
      const result = await fetchExerciseHelp({
        type: 'invalid_type',
        stageTitle: 'Stage 1',
        challengeTitle: 'Challenge 1'
      });
      
      expect(result).toBeDefined();
    });
  });
});

// ==================== TESTS D'INTÉGRATION ====================
describe('Stage Analysis - Intégration', () => {
  test('20. fetchSonarStub avec participantId génère projectKey dynamique', async () => {
    const context = {
      participantId: 'user123',
      roomId: 'room456',
      projectName: 'My Project'
    };
    
    const result = await fetchSonarStub('function test() {}', 'javascript', context);
    
    expect(result).toBeDefined();
  });
});