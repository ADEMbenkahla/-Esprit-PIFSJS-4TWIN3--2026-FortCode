const axios = require('axios');

/**
 * AI Analysis Service
 * Interfaces with OpenAI to provide code analysis, explanations, and resource recommendations.
 */
class AiAnalysisService {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    }

    /**
     * Performs a comprehensive, advanced analysis of the code using a unified prompt.
     * Uses a Senior Architect persona and Chain-of-Thought reasoning for deeper insights.
     */
    async performFullAnalysis(code, language, challengeDescription) {
        if (!this.apiKey) return this.getFallbackAnalysis();

        const prompt = `### ROLE: Senior Software Architect & Pedagogical Mentor
        ### TASK: Perform a deep technical audit of the following code.
        ### LANGUAGE: ${language}
        ### CONTEXT: The developer is solving this exercise: "${challengeDescription}".

        Analyze the code for:
        1. LOGICAL BUGS: Focus on algorithmic correctness, edge cases (empty inputs, large values), and structural flaws.
        2. EXPLANATION: Clearly explain the "WHY" behind the logic used, not just the "WHAT".
        3. METRICS: Quantifiable ratings (1-5) and metrics (Reliability, Security, Maintainability).
        4. GROWTH MAP: Map specific code weaknesses to high-quality learning resources.

        Return results in STRICT JSON format:
        {
          "bugSummary": "A sophisticated summary of the code's health and architectural choices.",
          "bugs": [
            { "line": number, "type": "logic|syntax|performance", "message": "Concise issue", "explanation": "Deep-dive reason why this is an issue", "suggestion": "// Refactored suggestion\n..." }
          ],
          "metrics": {
            "reliability_rating": 1-5,
            "security_rating": 1-5,
            "sqale_rating": 1-5,
            "bugs": number,
            "vulnerabilities": number,
            "code_smells": number,
            "qualityScore": 0-100
          },
          "explanation": {
            "overview": "Deep technical analysis of the programmer's strategy.",
            "steps": [ { "step": "Phase Name", "logic": "Technical implementation detail", "highlight": "Key line or pattern" } ],
            "complexity": "e.g., O(n log n) time | O(1) space",
            "keyConcepts": ["Advanced Concept Name", "Underlying Pattern"]
          },
          "weakAreas": ["Concept X", "Technique Y"],
          "recommendations": [
            { "title": "...", "url": "Actual high-quality link or specific topic path", "type": "video|article|exercise", "difficulty": "Junior|Mid|Senior", "reason": "Strategic benefit for current weakness" }
          ]
        }

        CODE TO AUDIT:
        \`\`\`${language}
        ${code}
        \`\`\``;

        try {
            const data = await this.queryAi(prompt);
            return {
                bugs: data.bugs || [],
                bugSummary: data.bugSummary || "Advanced audit complete.",
                metrics: data.metrics || this.getFallbackMetrics(),
                explanation: data.explanation || null,
                recommendations: data.recommendations || [],
                weakAreas: data.weakAreas || []
            };
        } catch (error) {
            console.error("AI Advanced Analysis Error:", error);
            return this.getFallbackAnalysis();
        }
    }

    getFallbackMetrics() {
        return { reliability_rating: 3, security_rating: 4, sqale_rating: 3, bugs: 0, vulnerabilities: 0, code_smells: 1, qualityScore: 70 };
    }

    getFallbackAnalysis() {
        return { bugs: [], bugSummary: "AI analysis currently unavailable.", metrics: this.getFallbackMetrics(), explanation: null, recommendations: [], weakAreas: [] };
    }

    async queryAi(prompt) {
        try {
            const response = await axios.post(this.apiUrl, {
                model: this.model,
                messages: [
                    { role: 'system', content: "You are a world-class software engineer. You provide actionable, truthful, and deep technical insights. Always return valid JSON." },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: "json_object" },
                temperature: 0.1
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return JSON.parse(response.data.choices[0].message.content);
        } catch (error) {
            console.error("OpenAI API Error:", error.response?.data || error.message);
            throw error;
        }
    }

    // Individual methods using the unified engine for consistency
    async analyzeBugs(code, language) { return (await this.performFullAnalysis(code, language, "")).bugs; }
    async explainCode(code, language, level) { return (await this.performFullAnalysis(code, language, "")).explanation; }
    async recommendResources(code, language, context) { return (await this.performFullAnalysis(code, language, context)); }
}

module.exports = new AiAnalysisService();
