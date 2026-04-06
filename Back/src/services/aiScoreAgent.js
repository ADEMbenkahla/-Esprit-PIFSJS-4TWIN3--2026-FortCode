const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const safeNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeLanguage = (value) => String(value || "").trim().toLowerCase();

const parseAiJson = (rawText) => {
  const text = String(rawText || "").trim();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const buildPrompt = ({ submission, totalPoints, expectedLanguage }) => {
  const sonar = submission?.sonarQube || {};
  const metrics = sonar?.metrics || {};

  return {
    system: [
      "You are a strict technical recruiter scoring a coding challenge.",
      "Return ONLY valid JSON.",
      "If the language does not match expected language, recommendedScore must be 0.",
      "Do not include markdown or explanations outside JSON."
    ].join(" "),
    user: JSON.stringify({
      scoringScale: {
        totalPoints,
        expectedLanguage
      },
      submission: {
        codeSnapshot: String(submission?.codeSnapshot || "").slice(0, 8000),
        outputSnapshot: String(submission?.outputSnapshot || "").slice(0, 3000)
      },
      sonar: {
        qualityGateStatus: sonar?.qualityGateStatus || "UNKNOWN",
        issuesCount: safeNumber(sonar?.issuesCount, 0),
        metrics
      },
      expectedJsonShape: {
        recommendedScore: "number",
        confidence: "low|medium|high",
        reasons: ["string"],
        detectedLanguage: "string",
        expectedLanguage: "string",
        languageMismatch: "boolean",
        note: "string"
      }
    })
  };
};

const normalizeSuggestion = (payload, totalPoints, expectedLanguage) => {
  const score = clamp(safeNumber(payload?.recommendedScore, 0), 0, totalPoints);
  const confidence = ["low", "medium", "high"].includes(payload?.confidence)
    ? payload.confidence
    : "medium";
  const reasons = Array.isArray(payload?.reasons)
    ? payload.reasons.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 8)
    : [];

  const normalizedExpected = normalizeLanguage(payload?.expectedLanguage || expectedLanguage || "unknown");
  const normalizedDetected = normalizeLanguage(payload?.detectedLanguage || "unknown");
  const mismatchByPayload = Boolean(payload?.languageMismatch);
  const mismatchByRule = normalizedExpected !== "unknown" && normalizedDetected !== "unknown" && normalizedExpected !== normalizedDetected;
  const languageMismatch = mismatchByPayload || mismatchByRule;

  return {
    recommendedScore: languageMismatch ? 0 : Math.round(score * 10) / 10,
    totalPoints,
    confidence,
    reasons,
    detectedLanguage: normalizedDetected,
    expectedLanguage: normalizedExpected,
    languageMismatch,
    note: String(payload?.note || "AI-generated suggestion. Recruiter confirmation remains required.")
  };
};

const generateScoreSuggestion = async ({ submission, totalPoints = 100, expectedLanguage = "" }) => {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  const safeTotal = clamp(safeNumber(totalPoints, 100), 1, 1000);
  const prompt = buildPrompt({ submission, totalPoints: safeTotal, expectedLanguage: normalizeLanguage(expectedLanguage) });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user }
      ]
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content || "";
  const parsed = parseAiJson(raw);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid AI response payload");
  }

  const normalized = normalizeSuggestion(parsed, safeTotal, expectedLanguage);
  return {
    ...normalized,
    model: OPENAI_MODEL,
    provider: "openai"
  };
};

module.exports = {
  generateScoreSuggestion
};
