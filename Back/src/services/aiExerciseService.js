const axios = require("axios");
const { runJavaScriptTests } = require("../utils/runChallengeCode");

const RUNNABLE_LANG = new Set(["javascript", "typescript"]);

function getAiServiceUrl() {
  return process.env.AI_EXERCISE_URL || "https://esprit-pifsjs-4twin3-2026-fortcode-1.onrender.com/generate-exercise";
}

function normalizeLocale(locale) {
  const s = String(locale || "").trim().toLowerCase();
  const map = { "fr": "fr", "fr-fr": "fr", "french": "fr", "en": "en", "en-us": "en", "english": "en" };
  return map[s] || "fr";
}

function normalizeDifficulty(d) {
  const x = String(d || "medium").toLowerCase();
  return ["easy", "medium", "hard", "expert"].includes(x) ? x : "medium";
}

function normalizeLanguage(lang) {
  const l = String(lang || "javascript").toLowerCase();
  return l === "typescript" ? "typescript" : "javascript";
}

function isTrivialAssertion(assertion) {
  const t = String(assertion || "").trim();
  if (!t) return true;
  const c = t.replace(/\s+/g, " ").toLowerCase();
  if (c === "true" || c === "!!true" || c === "!false") return true;
  if (c === "assert(true)" || c === "boolean(true)") return true;
  return false;
}

/**
 * Ensures tests are meaningful and fail on the incomplete starter (student must implement logic).
 */
function validateRunnableExercise(starterCode, testCases, functionName) {
  const tests = Array.isArray(testCases) ? testCases : [];
  if (tests.length < 2) {
    const err = new Error("AI_VALIDATION: need at least 2 test cases");
    err.code = "AI_VALIDATION";
    throw err;
  }
  let nonTrivial = 0;
  for (const tc of tests) {
    if (!isTrivialAssertion(tc?.assertion)) nonTrivial += 1;
  }
  if (nonTrivial < 2) {
    const err = new Error("AI_VALIDATION: assertions must be real checks, not constant true");
    err.code = "AI_VALIDATION";
    throw err;
  }
  const code = String(starterCode || "").trim();
  const esc = functionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const declaresName =
    new RegExp(`\\bfunction\\s+${esc}\\b`).test(code) ||
    new RegExp(`\\b(?:const|let|var)\\s+${esc}\\s*=`).test(code);
  if (!code || !declaresName) {
    const err = new Error(`AI_VALIDATION: starterCode must declare ${functionName} (function or const)`);
    err.code = "AI_VALIDATION";
    throw err;
  }
  const run = runJavaScriptTests(code, tests);
  if (run.passed) {
    const err = new Error(
      "AI_VALIDATION: tests pass without a real solution — starter must stay incomplete (TODO only)"
    );
    err.code = "AI_VALIDATION";
    throw err;
  }
}

function parseJsonContent(content) {
  const raw = String(content || "").replace(/```json|```/gi, "").trim();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (_err) {
    parsed = tryExtractJson(raw, _err);
  }
  return extractExercisesArray(parsed);
}

function tryExtractJson(raw, originalError) {
  const objStart = raw.indexOf("{");
  const objEnd = raw.lastIndexOf("}");
  const arrStart = raw.indexOf("[");
  const arrEnd = raw.lastIndexOf("]");
  let candidate = "";
  if (objStart !== -1 && objEnd > objStart) {
    candidate = raw.slice(objStart, objEnd + 1);
  } else if (arrStart !== -1 && arrEnd > arrStart) {
    candidate = raw.slice(arrStart, arrEnd + 1);
  }
  if (!candidate) throw originalError;
  return JSON.parse(candidate);
}

function extractExercisesArray(parsed) {
  if (parsed.exercises && Array.isArray(parsed.exercises)) return parsed.exercises;
  if (Array.isArray(parsed)) return parsed;
  const arr = Object.values(parsed).find((v) => Array.isArray(v));
  if (arr) return arr;
  throw new Error("AI response JSON has no exercises array");
}

function validateProfessionalDescription(description, locale) {
  const text = String(description || "").trim();
  if (text.length < 80) {
    const err = new Error("AI_VALIDATION: description too short / not detailed enough");
    err.code = "AI_VALIDATION";
    throw err;
  }
  if (text.length > 4000) {
    const err = new Error("AI_VALIDATION: description too long (needs to be concise)");
    err.code = "AI_VALIDATION";
    throw err;
  }

  // Avoid markdown fences or “meta” talk.
  if (/```/.test(text) || /\b(json|yaml|markdown)\b/i.test(text)) {
    const err = new Error("AI_VALIDATION: description must be plain text (no markdown fences / meta)"); // keep short for retry prompt
    err.code = "AI_VALIDATION";
    throw err;
  }
  if (/(as an ai|i can('| no)t|je suis une ia|en tant qu'ia)/i.test(text)) {
    const err = new Error("AI_VALIDATION: description contains assistant meta text");
    err.code = "AI_VALIDATION";
    throw err;
  }

  // Require at least one concrete input/output style example.
  const lower = text.toLowerCase();
  const exampleToken = locale === "fr" ? "exemple" : "example";
  const inputToken = locale === "fr" ? "entrée" : "input";
  const outputToken = locale === "fr" ? "sortie" : "output";

  const exampleCount = (lower.match(new RegExp(`\\b${exampleToken}\\b`, "g")) || []).length;
  const hasInput = lower.includes(inputToken);
  const hasOutput = lower.includes(outputToken);

  if (exampleCount < 1 || !hasInput || !hasOutput) {
    const err = new Error("AI_VALIDATION: description must include at least 1 input/output example");
    err.code = "AI_VALIDATION";
    throw err;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapGeminiHttpError(error) {
  const status = error.response?.status;
  const apiMsg = error.response?.data?.detail || error.message;

  if (status === 429) {
    const err = new Error("Limite Gemini atteinte (429). Réessayez dans quelques instants.");
    err.code = "AI_RATE_LIMIT";
    err.status = 429;
    err.detail = apiMsg;
    return err;
  }
  if (status === 503) {
    const err = new Error(apiMsg || "Le service Gemini est temporairement indisponible.");
    err.code = "AI_UPSTREAM";
    err.status = status;
    return err;
  }
  const err = new Error(apiMsg || error.message || "Gemini request failed");
  err.code = "AI_HTTP_ERROR";
  err.status = status || 502;
  return err;
}

function mapExercise(raw, defaults) {
  const difficulty = normalizeDifficulty(raw.difficulty || defaults.difficulty);
  const language = normalizeLanguage(raw.language || defaults.language);
  const title = String(raw.title || "").trim();
  const description = String(raw.description || "").trim();
  const starterCode = String(raw.starterCode || "").trim();
  const constraints = String(raw.constraints || "").trim();
  const testCases = Array.isArray(raw.testCases)
    ? raw.testCases.map((t, i) => ({
        name: String(t?.name || `Test ${i + 1}`).slice(0, 120),
        assertion: String(t?.assertion || "").trim(),
      }))
    : [];
  let xp = Number(raw.xpReward);
  if (!Number.isFinite(xp)) {
    xp = difficulty === "easy" ? 50 : difficulty === "medium" ? 100 : difficulty === "hard" ? 150 : 200;
  }
  return {
    title: title || "Untitled",
    description,
    difficulty,
    language,
    starterCode,
    testCases,
    constraints,
    xpReward: xp,
  };
}

/**
 * Adapts the Gemini ai_service response format to the internal exercise format.
 * Gemini returns: { title, description, language, expectedFunctions, testCases, expectedOutput, xpReward }
 * Internal format needs: starterCode, constraints, difficulty
 */
function adaptGeminiExercise(geminiEx, defaults) {
  const fns = Array.isArray(geminiEx.expectedFunctions) ? geminiEx.expectedFunctions : [defaults.functionName || "solve"];
  const primaryFn = String(fns[0] || "solve").trim();
  const language = normalizeLanguage(geminiEx.language || defaults.language);

  // Build a stub starterCode if not provided
  const starterCode = geminiEx.starterCode
    ? String(geminiEx.starterCode).trim()
    : `function ${primaryFn}(...args) {\n  // TODO: implement\n  return undefined;\n}`;

  // Use expectedOutput as constraints if constraints not present
  const constraints = geminiEx.constraints
    ? String(geminiEx.constraints).trim()
    : String(geminiEx.expectedOutput || "").trim();

  return {
    title: geminiEx.title,
    description: geminiEx.description,
    language,
    starterCode,
    constraints,
    testCases: geminiEx.testCases,
    xpReward: geminiEx.xpReward,
    difficulty: geminiEx.difficulty || defaults.difficulty,
  };
}

/**
 * Calls the local Gemini FastAPI service to generate exercises.
 * The ai_service/main.py handles Gemini API calls with GEMINI_API_KEY.
 */
async function callGeminiJson({ prompt, difficulty, language, expectedFunctions, criteria, randomize }) {
  const aiUrl = getAiServiceUrl();
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const resp = await axios.post(
        aiUrl,
        {
          prompt: prompt || "",
          difficulty: difficulty || "medium",
          language: language || "javascript",
          expectedFunctions: expectedFunctions || ["solve"],
          criteria: criteria || [],
          randomize: randomize !== false,
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 120000,
          validateStatus: () => true,
        }
      );

      if (resp.status >= 200 && resp.status < 300) {
        // ai_service returns { exercise: {...}, source, provider }
        const exercise = resp.data?.exercise || resp.data;
        if (!exercise || !exercise.title) {
          const err = new Error("Réponse Gemini invalide: champ 'exercise' manquant");
          err.code = "AI_PARSE";
          throw err;
        }
        return exercise;
      }

      const lastError = mapGeminiHttpError({ response: resp });
      const retryable = resp.status === 429 || resp.status === 503 || resp.status === 502;
      if (retryable && attempt < maxAttempts - 1) {
        const delay = 3000 * (attempt + 1);
        console.warn(`[Gemini] HTTP ${resp.status}, retry in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`);
        await sleep(delay);
        continue;
      }
      throw lastError;
    } catch (error) {
      if (error.code && String(error.code).startsWith("AI_")) throw error;
      if (!error.response) {
        const err = new Error(
          `Impossible de joindre le service Gemini (${aiUrl}). Vérifiez que ai_service est bien démarré.`
        );
        err.code = "AI_NETWORK";
        throw err;
      }
      const mapped = mapGeminiHttpError(error);
      const status = error.response.status;
      const retryable = status === 429 || status === 503 || status === 502;
      if (retryable && attempt < maxAttempts - 1) {
        await sleep(3000 * (attempt + 1));
        continue;
      }
      throw mapped;
    }
  }

  const err = new Error("Service Gemini indisponible après plusieurs tentatives.");
  err.code = "AI_UPSTREAM";
  throw err;
}

function devStubExercises({ topic, difficulty, language, count, functionName }) {
  const n = Math.min(20, Math.max(1, Number(count) || 1));
  const lang = normalizeLanguage(language);
  return Array.from({ length: n }, (_, i) => ({
    title: `[DEV STUB] ${topic} — ${i + 1}`,
    description:
      `Placeholder exercise (stub mode). Démarrez ai_service avec GEMINI_API_KEY pour la vraie génération IA. Thème: ${topic}.`,
    difficulty: normalizeDifficulty(difficulty),
    language: lang,
    starterCode: `function ${functionName}(n) {\n  // TODO: implement\n  return undefined;\n}\n`,
    testCases: [
      { name: "basic", assertion: `${functionName}(1) === 1` },
      { name: "edge", assertion: `${functionName}(0) === 0` },
      { name: "another", assertion: `${functionName}(2) === 2` },
    ],
    constraints: "Development stub only.",
    xpReward: 50,
  }));
}

/**
 * Generates programming exercises via OpenAI. Only JavaScript/TypeScript produce VM-runnable tests.
 * @param {object} opts
 * @param {string} opts.topic - Theme / stage title / user prompt
 * @param {string} [opts.difficulty]
 * @param {string} [opts.language] - javascript | typescript (others rejected)
 * @param {number} [opts.count]
 * @param {string} [opts.functionName] - default solve
 * @param {string} [opts.extraHints] - optional criteria text (battle room)
 */
async function generateExercises(opts) {
  const topic = String(opts.topic || "").trim();
  if (!topic) {
    const err = new Error("Topic / prompt is required");
    err.code = "AI_BAD_REQUEST";
    throw err;
  }

  const difficulty = normalizeDifficulty(opts.difficulty);
  const language = normalizeLanguage(opts.language);
  const locale = normalizeLocale(opts.locale);
  if (!RUNNABLE_LANG.has(language)) {
    const err = new Error(
      "AI generation supports JavaScript or TypeScript only (tests run in the Node.js sandbox)."
    );
    err.code = "AI_UNSUPPORTED_LANGUAGE";
    throw err;
  }

  const count = Math.min(20, Math.max(1, Number(opts.count) || 1));
  const functionName = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(String(opts.functionName || ""))
    ? String(opts.functionName).trim()
    : "solve";
  const extraHints = String(opts.extraHints || "").trim();

  // Use ENABLE_AI_STUB=1 for offline dev (no ai_service needed)
  if (process.env.ENABLE_AI_STUB === "1") {
    return devStubExercises({ topic, difficulty, language, count, functionName });
  }

  // Build prompt for Gemini (ai_service)
  const langLine = locale === "fr" ? "en français professionnel" : "in professional English";
  const geminiPrompt = [
    `Topic: "${topic}"`,
    `Difficulty: ${difficulty}`,
    `Language: ${language}`,
    `Function name: ${functionName}`,
    `Generate ${count} distinct exercise(s) ${langLine}.`,
    extraHints ? `Additional requirements: ${extraHints}` : "",
    `Each exercise must have: title, description (with at least 2 input/output examples), starterCode (function ${functionName} with TODO body), testCases (at least 3, real assertions not trivially true), constraints, xpReward.`,
  ].filter(Boolean).join("\n");

  let lastValidationError = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await sleep(5000);

      const exercise = await callGeminiJson({
        prompt: geminiPrompt,
        difficulty,
        language,
        expectedFunctions: [functionName],
        criteria: extraHints ? [extraHints] : [],
        randomize: true,
      });

      // Gemini returns a single exercise; adapt and wrap into array for compatibility
      const rawArr = Array.isArray(exercise) ? exercise : [exercise];
      if (rawArr.length === 0) throw new Error("empty exercises array");

      const mapped = rawArr.slice(0, count).map((r) =>
        mapExercise(adaptGeminiExercise(r, { difficulty, language, functionName }), { difficulty, language })
      );

      return mapped;
    } catch (e) {
      lastValidationError = e.message || String(e);
      const passThrough = new Set([
        "AI_NOT_CONFIGURED",
        "AI_BAD_REQUEST",
        "AI_UNSUPPORTED_LANGUAGE",
        "AI_RATE_LIMIT",
        "AI_AUTH",
        "AI_FORBIDDEN",
        "AI_UPSTREAM",
        "AI_NETWORK",
        "AI_HTTP_ERROR",
        "AI_PARSE",
      ]);
      if (e.code && passThrough.has(e.code)) throw e;
      if (attempt === 2) {
        const err = new Error(`AI generation failed after retry: ${lastValidationError}`);
        err.code = "AI_GENERATION_FAILED";
        err.cause = e;
        throw err;
      }
    }
  }

  const err = new Error("AI generation failed");
  err.code = "AI_GENERATION_FAILED";
  throw err;
}

/** Map AI error codes to HTTP status for API responses */
function httpStatusForAiError(err) {
  const s = err && err.status;
  if (typeof s === "number" && s >= 400 && s < 600) return s;
  const code = err && err.code;
  if (code === "AI_NOT_CONFIGURED") return 503;
  if (code === "AI_BAD_REQUEST" || code === "AI_UNSUPPORTED_LANGUAGE") return 400;
  if (code === "AI_RATE_LIMIT") return 429;
  if (code === "AI_AUTH") return 401;
  if (code === "AI_FORBIDDEN") return 403;
  if (code === "AI_NETWORK") return 503;
  return 502;
}

module.exports = {
  generateExercises,
  normalizeLanguage,
  normalizeDifficulty,
  RUNNABLE_LANG,
  httpStatusForAiError,
};
