process.env.JWT_SECRET = 'test-secret-key-2024';
process.env.NODE_ENV = 'test';
process.env.ML_SERVICE_URL = 'http://localhost:5050';

const axios = require('axios');
const { detectCodeOrigin } = require('../../src/services/mlDetectionAgent');

// Mock d'axios
jest.mock('axios');

describe('ML Detection Agent - Tests Complets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== TESTS CODE TRÈS SIMPLE ====================
  describe('Code très simple - retourne "Humain" sans appel API', () => {
    
    test('1. Code très court (< 120 caractères)', async () => {
      const shortCode = 'function add(a,b) { return a+b; }';
      const result = await detectCodeOrigin(shortCode);
      
      expect(result).toBeDefined();
      expect(result.prediction).toBe(0);
      expect(result.label).toBe('Humain');
      expect(axios.post).not.toHaveBeenCalled();
    });

    test('2. Code avec peu de complexité (complexityScore <= 1)', async () => {
      const simpleCode = 'let x = 1; let y = 2;';
      const result = await detectCodeOrigin(simpleCode);
      
      expect(result.prediction).toBe(0);
      expect(result.label).toBe('Humain');
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  // ==================== TESTS CODE COMPLEXE API RÉUSSIE ====================
  describe('Code complexe - Appel API réussi', () => {
    
    test('3. API retourne prédiction 0 (Humain)', async () => {
      const complexCode = `
        function processData(data) {
          if (!data) return [];
          const result = data.filter(item => item.active)
            .map(item => ({ ...item, processed: true }))
            .reduce((acc, curr) => {
              acc[curr.id] = curr;
              return acc;
            }, {});
          return result;
        }
      `;
      
      axios.post.mockResolvedValueOnce({
        data: { prediction: 0 }
      });
      
      const result = await detectCodeOrigin(complexCode);
      
      expect(result.prediction).toBe(0);
      expect(result.label).toBe('Humain');
      expect(axios.post).toHaveBeenCalledTimes(1);
    });

    test('4. API retourne prédiction 1 (IA - label IA)', async () => {
      const complexCode = `
        async function fetchData(apiUrl) {
          try {
            const response = await fetch(apiUrl);
            const data = await response.json();
            return data.results.map(item => item.value);
          } catch (error) {
            console.error(error);
            return [];
          }
        }
      `;
      
      axios.post.mockResolvedValueOnce({
        data: { prediction: 1 }
      });
      
      const result = await detectCodeOrigin(complexCode);
      
      expect(result.prediction).toBe(1);
      expect(result.label).toBe('IA');
    });

    test('5. API retourne prédiction 2 (Plagiat - avec complexité élevée)', async () => {
      const complexCode = `
        class DataProcessor {
          constructor(data) {
            this.data = data;
          }
          
          process() {
            return this.data
              .filter(item => item.isValid)
              .map(item => ({
                id: item.id,
                name: item.name.toUpperCase(),
                score: item.values.reduce((a,b) => a + b, 0)
              }))
              .sort((a,b) => b.score - a.score);
          }
          
          validate() {
            if (!this.data.length) throw new Error('No data');
            return this.data.every(item => item.id > 0);
          }
        }
      `;
      
      axios.post.mockResolvedValueOnce({
        data: { prediction: 2 }
      });
      
      const result = await detectCodeOrigin(complexCode);
      
      expect(result.prediction).toBe(2);
      expect(result.label).toBe('Plagiat');
    });
  });

  // ==================== TESTS ERREURS API ====================
  describe('Erreurs API - Fallback vers "Humain"', () => {
    
    test('6. API timeout', async () => {
      const complexCode = `
        function complexFunction() {
          for (let i = 0; i < 100; i++) {
            if (i % 2 === 0) {
              console.log(i);
            }
          }
          return true;
        }
      `;
      
      axios.post.mockRejectedValueOnce(new Error('Timeout'));
      
      const result = await detectCodeOrigin(complexCode);
      
      expect(result.prediction).toBe(0);
      expect(result.label).toBe('Humain');
    });

    test('7. API retourne erreur réseau', async () => {
      const complexCode = `
        function networkTest() {
          return fetch('https://api.example.com/data')
            .then(res => res.json())
            .catch(err => null);
        }
      `;
      
      axios.post.mockRejectedValueOnce(new Error('Network Error'));
      
      const result = await detectCodeOrigin(complexCode);
      
      expect(result.prediction).toBe(0);
      expect(result.label).toBe('Humain');
    });

    test('8. API retourne status 500', async () => {
      const complexCode = `
        function errorTest() {
          try {
            riskyOperation();
          } catch(e) {
            return null;
          }
        }
      `;
      
      axios.post.mockRejectedValueOnce({ response: { status: 500 } });
      
      const result = await detectCodeOrigin(complexCode);
      
      expect(result.prediction).toBe(0);
      expect(result.label).toBe('Humain');
    });
  });

  // ==================== TESTS COMPLEXITÉ MOYENNE ====================
  describe('Code avec complexité moyenne', () => {
    
    test('9. Code avec complexityScore entre 2 et 10', async () => {
      const mediumComplexCode = `
        function sortArray(arr) {
          for (let i = 0; i < arr.length; i++) {
            for (let j = i + 1; j < arr.length; j++) {
              if (arr[i] > arr[j]) {
                [arr[i], arr[j]] = [arr[j], arr[i]];
              }
            }
          }
          return arr;
        }
      `;
      
      axios.post.mockResolvedValueOnce({
        data: { prediction: 1 }
      });
      
      const result = await detectCodeOrigin(mediumComplexCode);
      
      expect(result.label).toBe('IA');
      expect(axios.post).toHaveBeenCalled();
    });
  });

  // ==================== TESTS VALEUR ML_SERVICE_URL ====================
  describe('Configuration ML_SERVICE_URL', () => {
    
    test('10. Utilise l\'URL par défaut si non définie', () => {
      const originalUrl = process.env.ML_SERVICE_URL;
      delete process.env.ML_SERVICE_URL;
      
      // Re-importer pour prendre la nouvelle valeur
      jest.resetModules();
      const { detectCodeOrigin: detect } = require('../../src/services/mlDetectionAgent');
      
      // Vérifier que l'URL par défaut est utilisée
      expect(process.env.ML_SERVICE_URL).toBeUndefined();
      
      process.env.ML_SERVICE_URL = originalUrl;
    });
  });
});