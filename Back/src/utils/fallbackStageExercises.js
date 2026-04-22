/**
 * Fallback Stage Exercises Utility
 * Provides default challenges when AI generation fails.
 */

/**
 * Returns a list of default challenges based on topic and difficulty.
 * @param {Object} params - { topic, difficulty, language, count }
 */
function generateFallbackStageExercises({ topic, difficulty, language, count }) {
    const fallbacks = [];

    for (let i = 1; i <= count; i++) {
        fallbacks.push({
            title: `${topic} Challenge #${i}`,
            description: `Complete this ${difficulty} task related to ${topic} using ${language}.`,
            starterCode: language === 'javascript' ? '// Write your code here' : '# Write your code here',
            difficulty: difficulty,
            language: language,
            testCases: [
                { name: "Default Test", input: "1", expected: "1" }
            ],
            xpReward: difficulty === 'easy' ? 50 : difficulty === 'medium' ? 100 : 200,
            category: "General"
        });
    }

    return fallbacks;
}

module.exports = {
    generateFallbackStageExercises
};
