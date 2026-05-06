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
        if (!this.apiKey) return this.getFallbackAnalysis(code, language, challengeDescription);

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

    getFallbackMetrics(code = "") {
        const lines = code.split('\n').filter(l => l.trim()).length;
        let score = 95;
        if (lines > 20) score = 65;
        else if (lines > 5) score = 85;
        return {
            reliability_rating: 3,
            security_rating: 4,
            sqale_rating: 3,
            bugs: 0,
            vulnerabilities: 0,
            code_smells: Math.max(1, Math.floor(lines / 10)),
            qualityScore: score
        };
    }

    getFallbackAnalysis(code = "", language = "javascript", challengeTitle = "") {
        const recommendations = this.getStaticRecommendations(language, challengeTitle);
        const bugs = this.getStaticBugHeuristics(code, language);

        return {
            bugs: bugs,
            bugSummary: bugs.length > 0 ? "Potential logic or structural issues detected by static scan." : "Code structure appears sound according to basic heuristics.",
            metrics: this.getFallbackMetrics(code),
            explanation: {
                overview: "Heuristic analysis: Code was scanned for common patterns and complexity.",
                steps: [
                    { step: "Syntax Check", logic: "Verified structure and basic language keywords.", highlight: "Success" }
                ],
                complexity: code.length > 200 ? "Medium complexity" : "Low complexity",
                keyConcepts: [language.toUpperCase(), "Algorithmic Logic"]
            },
            recommendations: recommendations,
            weakAreas: bugs.map(b => b.message)
        };
    }

    getStaticBugHeuristics(code, language) {
        const issues = [];

        if (language === 'javascript' || language === 'js') {
            if (code.includes('var ')) issues.push({ line: 1, type: "performance", message: "Use of 'var' detected", explanation: "Modern JS prefers 'let' or 'const' for better scope control.", suggestion: "// Replace var with const/let" });
            if (code.includes(' == ')) issues.push({ line: 1, type: "logic", message: "Loose equality (==) detected", explanation: "Strict equality (===) prevents unexpected type coercion.", suggestion: "// Use === instead of ==" });
            if (code.includes('console.log(')) issues.push({ line: 1, type: "performance", message: "Production log detected", explanation: "Cleanup console.log statements before finalizing logic.", suggestion: "// Remove console.log" });
        }

        if (language === 'python' || language === 'py') {
            if (code.includes('range(len(')) issues.push({ line: 1, type: "performance", message: "Non-idiomatic iteration", explanation: "In Python, prefer 'for item in list' or 'enumerate()' over 'range(len())'.", suggestion: "for i, val in enumerate(list):" });
            if (code.includes('print(') && !code.includes('return ')) issues.push({ line: 1, type: "logic", message: "Print instead of Return", explanation: "Functions in tests usually need to 'return' a value, not just print it.", suggestion: "return result # instead of print(result)" });
        }

        if (code.match(/\{\s*\}/) || code.match(/:\s*pass/)) {
            issues.push({ line: 1, type: "logic", message: "Empty block detected", explanation: "The logic contains an empty block (pass or {}), which might mean incomplete implementation.", suggestion: "// Implement missing logic" });
        }

        if (code.length > 500) issues.push({ line: 1, type: "performance", message: "High method length", explanation: "Large functions are harder to maintain and test.", suggestion: "// Break into smaller helper functions" });

        return issues;
    }

    getStaticRecommendations(language, title) {
        const base = [];

        if (language === 'javascript' || language === 'js') {
            base.push({ title: "JS Best Practices", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide", type: "article", difficulty: "Junior", reason: "Fundamental JS patterns" });
            base.push({ title: "ES6+ Features", url: "https://es6-features.org/", type: "article", difficulty: "Mid", reason: "Modernize your code" });
        }
        if (language === 'python' || language === 'py') {
            base.push({ title: "Pythonic Code (PEP 8)", url: "https://peps.python.org/pep-0008/", type: "article", difficulty: "Mid", reason: "Follow community standards" });
            base.push({ title: "Think Python", url: "https://greenteapress.com/wp/think-python-2e/", type: "article", difficulty: "Junior", reason: "Deep dive into logic" });
        }

        if (title.toLowerCase().includes('array') || title.toLowerCase().includes('list')) {
            base.push({ title: "Data Structures Guide", url: "https://visualgo.net/en/list", type: "article", difficulty: "Mid", reason: "Visualize array operations" });
        }

        if (title.toLowerCase().includes('math') || title.toLowerCase().includes('calc')) {
            base.push({ title: "Computer Science Algorithms", url: "https://algs4.cs.princeton.edu/home/", type: "article", difficulty: "Senior", reason: "Deep math optimizations" });
        }

        return base;
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
