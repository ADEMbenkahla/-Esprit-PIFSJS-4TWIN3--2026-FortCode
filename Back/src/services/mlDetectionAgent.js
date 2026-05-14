const axios = require("axios");

const ML_SERVICE_URL = process.env.ML_DETECTION_URL || process.env.ML_SERVICE_URL || "https://esprit-pifsjs-4twin3-2026-fortcode.onrender.com";

/**
 * Calls the Python ML service to detect the origin of the code (Human, AI, or Plagiarism).
 * @param {string} code - The code to analyze.
 * @returns {Promise<{prediction: number, label: string}>}
 */
const detectCodeOrigin = async (code) => {
    // ENHANCED: Added 'return' and more keywords
    const complexityScore = (code.match(/for|while|if|else|class|def|function|=>|await|async|try|catch|switch|case|map|reduce|filter|return/g) || []).length;
    const isVerySimple = code.length < 120 || complexityScore <= 1;

    if (isVerySimple) {
        return { prediction: 0, label: "Humain" };
    }

    try {
        const response = await axios.post(`${ML_SERVICE_URL}/predict`, {
            code: code
        }, { timeout: 2000 });

        const prediction = response.data.prediction;
        let label = "Humain";

        if (prediction === 1) {
            // Model says AI
            label = complexityScore > 10 ? "Plagiat" : "IA";
        } else if (prediction === 2) {
            // Model says Plagiarism, but we only accept it if complexity is really high
            label = complexityScore > 8 ? "Plagiat" : "IA";
        }

        return { prediction, label };
    } catch (error) {
        return { prediction: 0, label: "Humain" };
    }
};

module.exports = {
    detectCodeOrigin
};
