/**
 * Provides fallback exercises when AI generation fails.
 * @param {Object} options
 * @returns {Array} List of draft challenges
 */
exports.generateFallbackStageExercises = ({ topic, difficulty, language, count }) => {
  const fallbacks = [
    {
      title: `Basics of ${topic}`,
      description: `Implement a fundamental operation related to ${topic}.`,
      difficulty: difficulty || "easy",
      language: language || "javascript",
      starterCode: language === "python" ? "def solve():\n    pass" : "function solve() {\n  \n}",
      testCases: [{ name: "Standard case", assertion: "typeof solve === 'function'", hidden: false }],
      xpReward: 50
    },
    {
      title: `${topic} Advanced`,
      description: `Solve a more complex problem using ${topic} patterns.`,
      difficulty: difficulty === "easy" ? "medium" : difficulty,
      language: language || "javascript",
      starterCode: language === "python" ? "def solve(data):\n    pass" : "function solve(data) {\n  \n}",
      testCases: [{ name: "Data handling", assertion: "true", hidden: false }],
      xpReward: 100
    }
  ];

  // Repeat or slice to match count
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(fallbacks[i % fallbacks.length]);
  }
  return result;
};
