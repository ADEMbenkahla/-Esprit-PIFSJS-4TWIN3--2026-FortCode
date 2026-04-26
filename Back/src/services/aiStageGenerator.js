const axios = require("axios");

/**
 * Interface with the FastAPI AI Service to generate challenges for a stage.
 * @param {Object} options
 * @param {string} options.topic
 * @param {string} options.difficulty
 * @param {string} options.language
 * @param {number} options.count
 * @returns {Promise<Array>} List of generated challenges
 */
exports.generateChallenges = async ({ topic, difficulty, language, count = 3 }) => {
  const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
  const challenges = [];

  for (let i = 0; i < count; i++) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/generate-exercise`, {
        prompt: topic,
        difficulty,
        language,
        expectedFunctions: ["solve"],
        criteria: [],
        randomize: true
      });

      if (response.data && response.data.exercise) {
        challenges.push(response.data.exercise);
      }
    } catch (error) {
      console.error(`AI exercise generation failed for item ${i + 1}:`, error.message);
      // If one fails, we can continue or throw if all fail.
    }
  }

  if (challenges.length === 0) {
    throw new Error("AI Service failed to generate any challenges.");
  }

  return challenges;
};
