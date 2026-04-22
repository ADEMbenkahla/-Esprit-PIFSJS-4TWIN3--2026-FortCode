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
     * Performs a comprehensive analysis of the submitted code.
     * @param {string} code The participant's code.
     * @param {string} language The programming language (javascript, python).
     * @param {string} challengeDescription Context for the AI.
     * @returns {Object} Full analysis result.
     */
    async performFullAnalysis(code, language, challengeDescription) {
        try {
            const [bugs, explanation, recommendations] = await Promise.all([
                this.analyzeBugs(code, language),
                this.explainCode(code, language, 'simple'),
                this.recommendResources(code, language, challengeDescription)
            ]);

            return {
                bugs: bugs.bugs || [],
                bugSummary: bugs.summary || "No specific issues identified.",
                metrics: bugs.metrics || null,
                explanation: explanation,
                recommendations: recommendations.recommendations || [],
                weakAreas: recommendations.weakAreas || []
            };
        } catch (error) {
            console.error("AI Full Analysis Error:", error);
            return {
                bugs: [],
                bugSummary: "AI analysis currently unavailable.",
                explanation: null,
                recommendations: [],
                weakAreas: []
            };
        }
    }

    async analyzeBugs(code, language) {
        const prompt = `Analyze the following ${language} code for bugs, logic errors, and quality metrics. 
        Provide feedback in JSON format: 
        { 
          "summary": "...", 
          "bugs": [ { "line": 1, "type": "syntax|logic|performance", "message": "...", "explanation": "...", "suggestion": "..." } ],
          "metrics": {
            "reliability_rating": 1-5,
            "security_rating": 1-5,
            "sqale_rating": 1-5,
            "bugs": number,
            "vulnerabilities": number,
            "code_smells": number,
            "qualityScore": 0-100
          }
        }
        
        Code:
        ${code}`;

        return this.queryAi(prompt);
    }

    async explainCode(code, language, level = 'simple') {
        const prompt = `Explain this ${language} code in natural language for a ${level} level.
        Provide feedback in JSON format: { "overview": "...", "steps": [ { "step": "...", "logic": "...", "highlight": "..." } ], "complexity": "...", "keyConcepts": ["..."] }
        
        Code:
        ${code}`;

        return this.queryAi(prompt);
    }

    async recommendResources(code, language, context) {
        const prompt = `Based on this ${language} code and the context "${context}", identify weak areas and recommend learning resources (articles, videos, exercises).
        Provide feedback in JSON format: { "weakAreas": ["..."], "recommendations": [ { "title": "...", "url": "...", "type": "video|article|exercise", "difficulty": "...", "reason": "..." } ] }
        
        Code:
        ${code}`;

        return this.queryAi(prompt);
    }

    async queryAi(prompt) {
        if (!this.apiKey) {
            console.error("OPENAI_API_KEY is not set.");
            return {};
        }

        try {
            const response = await axios.post(this.apiUrl, {
                model: this.model,
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: "json_object" }
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return JSON.parse(response.data.choices[0].message.content);
        } catch (error) {
            console.error("OpenAI API Error:", error.response?.data || error.message);
            return {};
        }
    }
}

module.exports = new AiAnalysisService();
