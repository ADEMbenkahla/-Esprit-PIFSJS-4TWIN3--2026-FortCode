const axios = require('axios');

// Configuration des deux services
const ML_DETECTION_URL = process.env.ML_DETECTION_URL || 'http://localhost:5050';
const COMPLEXITY_SERVICE_URL = process.env.COMPLEXITY_SERVICE_URL || 'http://localhost:5002';

// Complexity scoring basé sur les exigences
const COMPLEXITY_SCORES = {
  'O(1)': 6,
  'O(log n)': 5,
  'O(n)': 4,
  'O(n log n)': 3,
  'O(n²)': 2,
  'O(2^n)': 1
};

/**
 * Prédire la complexité temporelle du code JavaScript
 * @param {string} code - Le code JavaScript à analyser
 * @returns {Promise<Object>} - Résultat de prédiction avec complexité, confiance et score
 */
async function predictComplexity(code) {
  try {
    const response = await axios.post(`${COMPLEXITY_SERVICE_URL}/predict`, {
      code: code
    }, {
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = response.data;
    
    if (result.error) {
      throw new Error(result.error);
    }

    // Ajouter le score basé sur la complexité
    const score = COMPLEXITY_SCORES[result.complexity] || 0;
    
    return {
      complexity: result.complexity,
      confidence: result.confidence || 0,
      score: score,
      probabilities: result.probabilities || {},
      predictionCode: result.prediction_code,
      success: true,
      service: 'complexity-prediction'
    };

  } catch (error) {
    console.error('Complexity prediction failed:', error.message);
    
    // Retourner le résultat de fallback
    return {
      complexity: 'Unknown',
      confidence: 0,
      score: 0,
      probabilities: {},
      predictionCode: null,
      success: false,
      error: error.message,
      service: 'complexity-prediction'
    };
  }
}

/**
 * Détecter l'origine du code (AI/Humain/Plagiat)
 * @param {string} code - Le code à analyser
 * @returns {Promise<Object>} - Résultat de détection ML
 */
async function detectCodeOrigin(code) {
  try {
    const response = await axios.post(`${ML_DETECTION_URL}/predict`, {
      code: code
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = response.data;
    
    if (result.error) {
      throw new Error(result.error);
    }

    return {
      prediction: result.prediction,
      label: result.label || 'Unknown',
      confidence: result.confidence || 0,
      success: true,
      service: 'ml-detection'
    };

  } catch (error) {
    console.error('ML detection failed:', error.message);
    
    return {
      prediction: null,
      label: 'Unknown',
      confidence: 0,
      success: false,
      error: error.message,
      service: 'ml-detection'
    };
  }
}

/**
 * Obtenir le score de complexité à partir du label de complexité
 * @param {string} complexity - Label de complexité (ex: "O(n)")
 * @returns {number} - Score (6 pour O(1), 5 pour O(log n), etc.)
 */
function getComplexityScore(complexity) {
  return COMPLEXITY_SCORES[complexity] || 0;
}

/**
 * Comparer deux soumissions basées sur les scores de complexité avec tie-breakers
 * LOGIQUE: AI/Plagiat = défaite automatique, sinon comparer complexité
 * @param {Object} submission1 - Première soumission
 * @param {Object} submission2 - Deuxième soumission
 * @returns {number} - -1 si premier gagne, 1 si deuxième gagne, 0 si égalité
 */
function compareSubmissions(submission1, submission2) {
  // Règle 1: AI/Plagiat perd automatiquement
  const isAi1 = submission1.mlDetection?.label === "IA" || submission1.mlDetection?.label === "Plagiat";
  const isAi2 = submission2.mlDetection?.label === "IA" || submission2.mlDetection?.label === "Plagiat";

  if (isAi1 && !isAi2) return 1;  // submission2 gagne
  if (!isAi1 && isAi2) return -1; // submission1 gagne
  if (isAi1 && isAi2) return 0;    // les deux IA, égalité

  // Règle 2: Les deux sont humains, comparer les scores de complexité
  const complexityScore1 = submission1.complexityAnalysis?.score || 0;
  const complexityScore2 = submission2.complexityAnalysis?.score || 0;
  
  if (complexityScore1 !== complexityScore2) {
    return complexityScore2 - complexityScore1; // score plus élevé gagne
  }

  // Règle 3: Égalité de complexité - temps de soumission
  const time1 = submission1.submittedAt ? new Date(submission1.submittedAt).getTime() : Infinity;
  const time2 = submission2.submittedAt ? new Date(submission2.submittedAt).getTime() : Infinity;
  
  if (time1 !== time2) {
    return time1 - time2; // soumission plus rapide gagne
  }

  // Règle 4: Égalité complète - confiance AI
  const confidence1 = submission1.complexityAnalysis?.confidence || 0;
  const confidence2 = submission2.complexityAnalysis?.confidence || 0;
  
  if (confidence1 !== confidence2) {
    return confidence2 - confidence1; // confiance plus élevée gagne
  }

  return 0; // égalité complète
}

/**
 * Vérifier si le service de complexité est disponible
 * @returns {Promise<boolean>} - True si service est healthy
 */
async function checkComplexityServiceHealth() {
  try {
    const response = await axios.get(`${COMPLEXITY_SERVICE_URL}/health`, {
      timeout: 5000
    });
    return response.data?.status === 'healthy' && response.data?.model_loaded;
  } catch (error) {
    console.error('Complexity service health check failed:', error.message);
    return false;
  }
}

/**
 * Vérifier si le service de détection ML est disponible
 * @returns {Promise<boolean>} - True si service est healthy
 */
async function checkMLDetectionServiceHealth() {
  try {
    const response = await axios.get(`${ML_DETECTION_URL}/health`, {
      timeout: 5000
    });
    return response.data?.status === 'healthy';
  } catch (error) {
    console.error('ML detection service health check failed:', error.message);
    return false;
  }
}

/**
 * Analyser le code avec les deux services (ML Detection + Complexité)
 * @param {string} code - Le code à analyser
 * @returns {Promise<Object>} - Résultats combinés des deux analyses
 */
async function analyzeCodeWithBothModels(code) {
  try {
    // Exécuter les deux analyses en parallèle
    const [mlDetection, complexityAnalysis] = await Promise.allSettled([
      detectCodeOrigin(code),
      predictComplexity(code)
    ]);

    const mlResult = mlDetection.status === 'fulfilled' ? mlDetection.value : { success: false, error: mlDetection.reason?.message };
    const complexityResult = complexityAnalysis.status === 'fulfilled' ? complexityAnalysis.value : { success: false, error: complexityAnalysis.reason?.message };

    return {
      mlDetection: mlResult,
      complexityAnalysis: complexityResult,
      overallSuccess: mlResult.success && complexityResult.success
    };

  } catch (error) {
    console.error('Combined analysis failed:', error);
    return {
      mlDetection: { success: false, error: error.message },
      complexityAnalysis: { success: false, error: error.message },
      overallSuccess: false
    };
  }
}

module.exports = {
  predictComplexity,
  detectCodeOrigin,
  getComplexityScore,
  compareSubmissions,
  checkComplexityServiceHealth,
  checkMLDetectionServiceHealth,
  analyzeCodeWithBothModels,
  COMPLEXITY_SCORES
};
