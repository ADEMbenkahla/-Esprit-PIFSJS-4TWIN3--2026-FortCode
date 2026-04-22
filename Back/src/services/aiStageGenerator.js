const axios = require('axios');

/**
 * AI Stage Generator Service
 * Responsible for generating coding challenges and test cases using OpenAI.
 */
class AiStageGenerator {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    }

    /**
     * Generates a list of coding challenges based on a topic and difficulty.
     * @param {Object} params - { topic, difficulty, language, count }
     * @returns {Array} List of generated challenges.
     */
    async generateChallenges({ topic, difficulty, language, count }) {
        if (!this.apiKey) {
            throw new Error("OPENAI_API_KEY is missing. AI generation unavailable.");
        }

        const prompt = `Generate ${count} coding challenges for the topic "${topic}" with a difficulty of "${difficulty}" in ${language}.
        Each challenge should include:
        - title
        - description
        - starterCode
        - testCases: an array of { name, input, expected }
        - xpReward: a number (easy: 50, medium: 100, hard: 200)
        
        Provide the response in JSON format as an array of objects.`;

        try {
            const response = await axios.post(this.apiUrl, {
                model: this.model,
                messages: [
                    { role: 'system', content: 'You are an expert curriculum designer. Return ONLY a JSON array of challenges.' },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: "json_object" }
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = JSON.parse(response.data.choices[0].message.content);
            // Handle if the AI wraps the array in an object
            return Array.isArray(result) ? result : (result.challenges || result.result || []);
        } catch (error) {
            console.error("AI Generation Error:", error.response?.data || error.message);
            throw error;
        }
    }
}

module.exports = new AiStageGenerator();
