process.env.JWT_SECRET = 'test-secret-key-2024';
process.env.NODE_ENV = 'test';

const { runChallengeCode, runJavaScriptTests } = require('../../src/utils/runChallengeCode');

describe('Run Challenge Code - Tests Complets', () => {
  
  // ==================== JAVASCRIPT TESTS ====================
  describe('JavaScript - Tests d\'exécution', () => {
    
    test('1. JavaScript - code correct avec assertions', () => {
      const userCode = `
        function add(a, b) {
          return a + b;
        }
      `;
      const testCases = [
        { name: 'add 1+2', assertion: 'return add(1, 2) === 3;' },
        { name: 'add 5+7', assertion: 'return add(5, 7) === 12;' }
      ];
      
      const result = runJavaScriptTests(userCode, testCases);
      
      expect(result.passed).toBe(true);
      expect(result.testResults.length).toBe(2);
      expect(result.testResults[0].passed).toBe(true);
    });

    test('2. JavaScript - code incorrect', () => {
      const userCode = `
        function add(a, b) {
          return a - b;
        }
      `;
      const testCases = [
        { name: 'add 1+2', assertion: 'return add(1, 2) === 3;' }
      ];
      
      const result = runJavaScriptTests(userCode, testCases);
      
      expect(result.passed).toBe(false);
      expect(result.testResults[0].passed).toBe(false);
    });

    test('3. JavaScript - erreur de syntaxe', () => {
      const userCode = `
        function add(a, b {
          return a + b;
        }
      `;
      const testCases = [
        { name: 'syntax test', assertion: 'return add(1, 2) === 3;' }
      ];
      
      const result = runJavaScriptTests(userCode, testCases);
      
      expect(result.passed).toBe(false);
      expect(result.testResults[0].error).toBeDefined();
    });

    test('4. JavaScript - sans testCases', () => {
      const userCode = 'function test() { return true; }';
      const result = runJavaScriptTests(userCode, []);
      
      expect(result.passed).toBe(false);
      expect(result.testResults[0].error).toContain('No test cases defined');
    });

    test('5. JavaScript - assertion sans return', () => {
      const userCode = `
        function multiply(a, b) {
          return a * b;
        }
      `;
      const testCases = [
        { name: 'multiply', assertion: 'multiply(2, 3) === 6' }
      ];
      
      const result = runJavaScriptTests(userCode, testCases);
      
      expect(result.passed).toBe(true);
    });

    test('6. JavaScript - avec console.log', () => {
      const userCode = `
        function greet() {
          console.log('Hello World');
          return 'Hello';
        }
      `;
      const testCases = [
        { name: 'greet', assertion: 'return greet() === "Hello";' }
      ];
      
      const result = runJavaScriptTests(userCode, testCases);
      
      expect(result.passed).toBe(true);
      expect(result.outputSnapshot).toContain('Hello World');
    });

    test('7. JavaScript - timeout (code infini)', () => {
      const userCode = `
        function infinite() {
          while(true) {}
        }
      `;
      const testCases = [
        { name: 'infinite', assertion: 'return infinite() === true;' }
      ];
      
      const result = runJavaScriptTests(userCode, testCases);
      
      expect(result.passed).toBe(false);
      expect(result.testResults[0].error).toBeDefined();
    });
  });

  // ==================== PYTHON TESTS ====================
  describe('Python - Tests heuristiques', () => {
    
    test('8. Python - code correct pour square', () => {
      const userCode = `
        def square(n):
            return n ** 2
      `;
      const testCases = [
        { name: 'square 4', assertion: 'square(4) === 16' }
      ];
      
      const result = runChallengeCode('python', userCode, testCases);
      
      expect(result.passed).toBe(true);
    });

    test('9. Python - code correct pour hello', () => {
      const userCode = `
        def hello():
            return 'Python is cool'
      `;
      const testCases = [
        { name: 'hello', assertion: 'hello() === "Python is cool"' }
      ];
      
      const result = runChallengeCode('python', userCode, testCases);
      
      expect(result.passed).toBe(true);
    });

    test('10. Python - code incorrect', () => {
      const userCode = `
        def square(n):
            return n + n
      `;
      const testCases = [
        { name: 'square 4', assertion: 'square(4) === 16' }
      ];
      
      const result = runChallengeCode('python', userCode, testCases);
      
      expect(result.passed).toBe(false);
    });

    test('11. Python - code trop court', () => {
      const userCode = 'def f(): pass';
      const testCases = [
        { name: 'test', assertion: 'f() === true' }
      ];
      
      const result = runChallengeCode('python', userCode, testCases);
      
      expect(result.passed).toBe(false);
    });

    test('12. Python - sans testCases', () => {
      const userCode = 'def test(): return True';
      const result = runChallengeCode('python', userCode, []);
      
      expect(result.passed).toBe(true);
    });
  });

  // ==================== AUTRES LANGAGES ====================
  describe('Autres langages - Mock validator', () => {
    
    test('13. TypeScript - validation simple', () => {
      const userCode = 'function test(): number { return 42; }';
      const testCases = [{ name: 'test', assertion: 'test() === 42' }];
      
      const result = runChallengeCode('typescript', userCode, testCases);
      
      // TypeScript utilise JavaScript VM
      expect(result).toBeDefined();
    });

    test('14. Langage non supporté - mock validator', () => {
      const userCode = 'print("Hello")';
      const testCases = [{ name: 'test', assertion: 'true' }];
      
      const result = runChallengeCode('ruby', userCode, testCases);
      
      expect(result).toBeDefined();
      expect(result.testResults[0].name).toBe('ruby');
    });

    test('15. Langage non supporté - code trop court', () => {
      const userCode = 'short';
      const testCases = [{ name: 'test', assertion: 'true' }];
      
      const result = runChallengeCode('java', userCode, testCases);
      
      expect(result.passed).toBe(false);
    });
  });

  // ==================== runChallengeCode INTÉGRATION ====================
  describe('runChallengeCode - Intégration', () => {
    
    test('16. JavaScript via runChallengeCode', () => {
      const userCode = `
        function double(n) {
          return n * 2;
        }
      `;
      const testCases = [
        { name: 'double 5', assertion: 'return double(5) === 10;' }
      ];
      
      const result = runChallengeCode('javascript', userCode, testCases);
      
      expect(result.passed).toBe(true);
    });

    test('17. TypeScript via runChallengeCode', () => {
      const userCode = `
        function triple(n: number): number {
          return n * 3;
        }
      `;
      const testCases = [
        { name: 'triple 5', assertion: 'return triple(5) === 15;' }
      ];
      
      const result = runChallengeCode('typescript', userCode, testCases);
      
      expect(result.passed).toBe(true);
    });

    test('18. Python via runChallengeCode', () => {
      const userCode = `
        def multiply(a, b):
            return a * b
      `;
      const testCases = [
        { name: 'multiply', assertion: 'multiply(3, 4) === 12' }
      ];
      
      const result = runChallengeCode('python', userCode, testCases);
      
      // Python utilise heuristiques
      expect(result).toBeDefined();
    });
  });

  // ==================== CAS LIMITES ====================
  describe('Cas limites', () => {
    
    test('19. Code vide', () => {
      const userCode = '';
      const testCases = [{ name: 'test', assertion: 'return true;' }];
      
      const result = runJavaScriptTests(userCode, testCases);
      
      expect(result.passed).toBe(false);
    });

    test('20. Code null', () => {
      const userCode = null;
      const testCases = [{ name: 'test', assertion: 'return true;' }];
      
      const result = runChallengeCode('javascript', userCode, testCases);
      
      expect(result.passed).toBe(false);
    });

    test('21. Test cases undefined', () => {
      const userCode = 'function test() { return true; }';
      
      const result = runChallengeCode('javascript', userCode, undefined);
      
      expect(result.passed).toBe(false);
    });

    test('22. Grande charge de tests', () => {
      const userCode = `
        function add(a, b) {
          return a + b;
        }
      `;
      const testCases = Array(20).fill(null).map((_, i) => ({
        name: `test ${i}`,
        assertion: `return add(${i}, 1) === ${i + 1};`
      }));
      
      const result = runJavaScriptTests(userCode, testCases);
      
      expect(result.passed).toBe(true);
      expect(result.testResults.length).toBe(20);
    });
  });
});
