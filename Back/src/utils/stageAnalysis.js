const axios = require("axios");

async function fetchSonarStub(code, language) {
  const lines = (code || "").split("\n").filter((l) => l.trim()).length;
  const score = Math.min(100, 60 + Math.min(40, lines));
  return {
    qualityScore: score,
    issues: lines < 2 ? [{ severity: "INFO", message: "Very short submission" }] : [],
    summary: `Heuristic quality score (${lines} non-empty lines). Connect SonarQube for full analysis.`,
  };
}

async function fetchAiFeedback(code, challengeTitle) {
  const url = process.env.AI_FEEDBACK_URL || "http://localhost:8000/code-feedback";
  try {
    const res = await axios.post(
      url,
      { code, challengeTitle },
      { timeout: 15000, validateStatus: () => true }
    );
    if (res.status >= 200 && res.status < 300 && res.data) {
      return res.data;
    }
  } catch (_) {
    /* optional service */
  }
  return {
    bugs: [],
    suggestions: ["Add edge-case tests.", "Consider naming clarity for maintainability."],
    improvements: ["Extract reusable helpers if logic grows."],
    summary: "AI feedback service unavailable; showing default tips.",
  };
}

module.exports = { fetchSonarStub, fetchAiFeedback };
