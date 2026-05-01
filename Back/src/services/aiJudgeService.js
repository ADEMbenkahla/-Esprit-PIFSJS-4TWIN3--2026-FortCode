const axios = require('axios');

/**
 * AI Judge Service
 * Uses OpenAI to compare two pieces of code and decide which one is better.
 */
class AiJudgeService {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    }

    /**
     * Compares two submissions and returns the winner.
     * @param {Object} p1 { code, username, language }
     * @param {Object} p2 { code, username, language }
     * @param {String} challengeDescription
     * @returns {Promise<Object>} { winnerIndex (0 or 1), justification }
     */
    async judgeMatch(p1, p2, challengeDescription = "") {
        const prompt = `### ROLE: Technical Judge for Coding Competition
### TASK: Compare two solutions to a coding problem and declare a winner based on code quality, efficiency, readability, and best practices.

### CHALLENGE:
"${challengeDescription}"

### SUBMISSION 1 (Player: ${p1.username}):
Language: ${p1.language}
Code:
\`\`\`${p1.language}
${p1.code}
\`\`\`

### SUBMISSION 2 (Player: ${p2.username}):
Language: ${p2.language}
Code:
\`\`\`${p2.language}
${p2.code}
\`\`\`

### JUDGING CRITERIA:
1. Correctness: Does the code solve the problem logic?
2. Cleanliness: Naming conventions, indentation, and structure.
3. Efficiency: Time and space complexity.
4. Robustness: Handling of edge cases.

Return your decision in STRICT JSON format:
{
  "winnerIndex": 0 | 1 | null,
  "justification": "Short explanation of why this player won or if it's a perfect tie (null).",
  "scores": {
    "p1": 0-100,
    "p2": 0-100
  }
}`;

        // Fallback to Ollama if OpenAI is missing
        if (!this.apiKey) {
            console.log("AI Judge: OpenAI API Key missing. Trying Ollama fallback...");
            return this.judgeWithOllama(prompt);
        }

        try {
            const response = await axios.post(this.apiUrl, {
                model: this.model,
                messages: [
                    { role: 'system', content: "You are an expert software judge. Always return valid JSON." },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: "json_object" },
                temperature: 0.2
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = JSON.parse(response.data.choices[0].message.content);
            return {
                winnerIndex: data.winnerIndex,
                justification: data.justification || "Determined by logic comparison.",
                scores: data.scores
            };
        } catch (error) {
            console.error("AI Judge API Error (OpenAI):", error.response?.data || error.message);
            return this.judgeWithOllama(prompt);
        }
    }

    async judgeWithOllama(prompt) {
        const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.1:8b';

        try {
            const response = await axios.post(`${ollamaUrl}/api/generate`, {
                model: ollamaModel,
                prompt: prompt + "\n\nResponse MUST be valid and raw JSON only.",
                stream: false,
                format: "json"
            });

            const data = JSON.parse(response.data.response);
            return {
                winnerIndex: data.winnerIndex,
                justification: data.justification || "Determined by Ollama comparison.",
                scores: data.scores
            };
        } catch (error) {
            console.error("AI Judge API Error (Ollama):", error.message);
            return { winnerIndex: null, justification: "AI Judge (Ollama) failed." };
        }
    }
}

module.exports = new AiJudgeService();
