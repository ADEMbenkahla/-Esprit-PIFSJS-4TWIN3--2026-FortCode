const { generateExercises } = require("./aiExerciseService");

/**
 * @deprecated Prefer generateExercises from aiExerciseService; kept for existing imports.
 */
async function generateChallenges({ topic = "general", difficulty = "easy", language = "javascript", count = 3 }) {
  return generateExercises({
    topic,
    difficulty,
    language,
    count,
    functionName: "solve",
  });
}

module.exports = { generateChallenges, generateExercises };
