process.env.JWT_SECRET = 'test-secret-key-2024';
process.env.NODE_ENV = 'test';

const { generateFallbackStageExercises } = require('../../src/utils/fallbackStageExercises');

describe('Fallback Stage Exercises - Tests Complets', () => {
  
  // ==================== TESTS normalizeDifficulty (interne) ====================
  describe('normalizeDifficulty - fonction interne', () => {
    test('1. Retourne medium par défaut', () => {
      const result = generateFallbackStageExercises({ topic: 'test', count: 1 });
      expect(result[0].difficulty).toBe('medium');
    });

    test('2. Retourne easy pour easy', () => {
      const result = generateFallbackStageExercises({ 
        topic: 'test', 
        difficulty: 'easy',
        count: 1 
      });
      expect(result[0].difficulty).toBe('easy');
    });

    test('3. Retourne hard pour hard', () => {
      const result = generateFallbackStageExercises({ 
        topic: 'test', 
        difficulty: 'hard',
        count: 1 
      });
      expect(result[0].difficulty).toBe('hard');
    });

    test('4. Retourne expert pour expert', () => {
      const result = generateFallbackStageExercises({ 
        topic: 'test', 
        difficulty: 'expert',
        count: 1 
      });
      expect(result[0].difficulty).toBe('expert');
    });

    test('5. Retourne medium pour valeur invalide', () => {
      const result = generateFallbackStageExercises({ 
        topic: 'test', 
        difficulty: 'invalid',
        count: 1 
      });
      expect(result[0].difficulty).toBe('medium');
    });
  });

  // ==================== TESTS computeReward (interne) ====================
  describe('computeReward - calcul XP', () => {
    test('6. XP reward pour easy = 50', () => {
      const result = generateFallbackStageExercises({ 
        topic: 'test', 
        difficulty: 'easy',
        count: 1 
      });
      expect(result[0].xpReward).toBe(50);
    });

    test('7. XP reward pour medium = 100', () => {
      const result = generateFallbackStageExercises({ 
        topic: 'test', 
        difficulty: 'medium',
        count: 1 
      });
      expect(result[0].xpReward).toBe(100);
    });

    test('8. XP reward pour hard = 150', () => {
      const result = generateFallbackStageExercises({ 
        topic: 'test', 
        difficulty: 'hard',
        count: 1 
      });
      expect(result[0].xpReward).toBe(150);
    });

    test('9. XP reward pour expert = 200', () => {
      const result = generateFallbackStageExercises({ 
        topic: 'test', 
        difficulty: 'expert',
        count: 1 
      });
      expect(result[0].xpReward).toBe(200);
    });
  });

  // ==================== TESTS makeStarterCode (interne) ====================
  describe('makeStarterCode - génération code de départ', () => {
    test('10. Starter code pour JavaScript', () => {
      const result = generateFallbackStageExercises({ 
        topic: 'test', 
        language: 'javascript',
        count: 1 
      });
      expect(result[0].starterCode).toContain('function solve1(input)');
      expect(result[0].starterCode).not.toContain(': number');
    });

    test('11. Starter code pour TypeScript', () => {
      const result = generateFallbackStageExercises({ 
        topic: 'test', 
        language: 'typescript',
        count: 1 
      });
      expect(result[0].starterCode).toContain('function solve1(input: number): number');
    });

    test('12. Starter code avec fonction personnalisée', () => {
      // Pour plusieurs exercices, les noms de fonction changent
      const result = generateFallbackStageExercises({ 
        topic: 'test', 
        count: 3 
      });
      expect(result[0].starterCode).toContain('solve1');
      expect(result[1].starterCode).toContain('solve2');
      expect(result[2].starterCode).toContain('solve3');
    });
  });

  // ==================== TESTS makeAssertions (interne) ====================
  describe('makeAssertions - génération des tests', () => {
    test('13. Génère 3 assertions par exercice', () => {
      const result = generateFallbackStageExercises({ 
        topic: 'test', 
        count: 1 
      });
      expect(result[0].testCases.length).toBe(3);
    });

    test('14. Assertions utilisent le bon nom de fonction', () => {
      const result = generateFallbackStageExercises({ 
        topic: 'test', 
        count: 2 
      });
      expect(result[0].testCases[0].assertion).toContain('solve1');
      expect(result[1].testCases[0].assertion).toContain('solve2');
    });
  });

  // ==================== TESTS generateFallbackStageExercises ====================
  describe('generateFallbackStageExercises - fonction principale', () => {
    
    test('15. Génère le nombre correct d\'exercices', () => {
      const result = generateFallbackStageExercises({ 
        topic: 'test', 
        count: 3 
      });
      expect(result.length).toBe(3);
    });

    test('16. Valeur par défaut count = 3', () => {
      const result = generateFallbackStageExercises({ topic: 'test' });
      expect(result.length).toBe(3);
    });

    test('17. Count maximum limité à 10', () => {
      const result = generateFallbackStageExercises({ 
        topic: 'test', 
        count: 20 
      });
      expect(result.length).toBe(10);
    });

    test('18. Count minimum forcé à 1', () => {
      const result = generateFallbackStageExercises({ 
        topic: 'test', 
        count: 0 
      });
      expect(result.length).toBe(1);
    });

    test('19. Count négatif forcé à 1', () => {
      const result = generateFallbackStageExercises({ 
        topic: 'test', 
        count: -5 
      });
      expect(result.length).toBe(1);
    });

    test('20. Topic par défaut = "Core Logic"', () => {
      const result = generateFallbackStageExercises({});
      expect(result[0].title).toContain('Core Logic');
    });

    test('21. Topic personnalisé utilisé', () => {
      const result = generateFallbackStageExercises({ 
        topic: 'Array Manipulation' 
      });
      expect(result[0].title).toContain('Array Manipulation');
    });

    test('22. Langage par défaut = javascript', () => {
      const result = generateFallbackStageExercises({ topic: 'test' });
      expect(result[0].language).toBe('javascript');
    });

    test('23. Langage typescript supporté', () => {
      const result = generateFallbackStageExercises({ 
        topic: 'test', 
        language: 'typescript' 
      });
      expect(result[0].language).toBe('typescript');
    });

    test('24. Langage invalide → fallback javascript', () => {
      const result = generateFallbackStageExercises({ 
        topic: 'test', 
        language: 'python' 
      });
      expect(result[0].language).toBe('javascript');
    });

    test('25. Chaque exercice a les champs requis', () => {
      const result = generateFallbackStageExercises({ topic: 'test', count: 1 });
      const exercise = result[0];
      
      expect(exercise).toHaveProperty('title');
      expect(exercise).toHaveProperty('description');
      expect(exercise).toHaveProperty('difficulty');
      expect(exercise).toHaveProperty('language');
      expect(exercise).toHaveProperty('starterCode');
      expect(exercise).toHaveProperty('testCases');
      expect(exercise).toHaveProperty('constraints');
      expect(exercise).toHaveProperty('category');
      expect(exercise).toHaveProperty('xpReward');
    });

    test('26. Description contient des exemples', () => {
      const result = generateFallbackStageExercises({ topic: 'test', count: 1 });
      expect(result[0].description).toContain('Example input/output');
    });

    test('27. Constraints contient message de fallback', () => {
      const result = generateFallbackStageExercises({ topic: 'test', count: 1 });
      expect(result[0].constraints).toContain('Fallback draft exercise');
    });

    test('28. Category est "general"', () => {
      const result = generateFallbackStageExercises({ topic: 'test', count: 1 });
      expect(result[0].category).toBe('general');
    });
  });

  // ==================== TESTS VALEURS LIMITES ====================
  describe('Valeurs limites', () => {
    
    test('29. Topic vide → "Core Logic"', () => {
      const result = generateFallbackStageExercises({ topic: '' });
      expect(result[0].title).toContain('Core Logic');
    });

    test('30. Topic avec espaces → trim', () => {
      const result = generateFallbackStageExercises({ topic: '  Test Topic  ' });
      expect(result[0].title).toContain('Test Topic');
    });

    test('31. Count = "3" (string)', () => {
      const result = generateFallbackStageExercises({ 
        topic: 'test', 
        count: '3' 
      });
      expect(result.length).toBe(3);
    });

    test('32. Count = "invalid" → par défaut 3', () => {
      const result = generateFallbackStageExercises({ 
        topic: 'test', 
        count: 'invalid' 
      });
      expect(result.length).toBe(3);
    });
  });

  // ==================== TESTS D'INTÉGRATION ====================
  describe('Intégration', () => {
    
    test('33. Génération de plusieurs exercices avec des noms uniques', () => {
      const result = generateFallbackStageExercises({ 
        topic: 'Math', 
        count: 5 
      });
      
      const titles = result.map(r => r.title);
      const uniqueTitles = [...new Set(titles)];
      expect(uniqueTitles.length).toBe(5);
    });

    test('34. Vérification des fonctions générées', () => {
      const result = generateFallbackStageExercises({ 
        topic: 'Math', 
        count: 3 
      });
      
      expect(result[0].starterCode).toContain('solve1');
      expect(result[1].starterCode).toContain('solve2');
      expect(result[2].starterCode).toContain('solve3');
    });
  });
});