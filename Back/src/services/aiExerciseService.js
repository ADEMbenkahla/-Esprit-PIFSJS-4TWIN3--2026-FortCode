const axios = require("axios");
const { runJavaScriptTests } = require("../utils/runChallengeCode");

const RUNNABLE_LANG = new Set(["javascript", "typescript"]);

function getModel() {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
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

/** OpenAI sends e.g. "2m0.0s" or "45.2s" — time until request budget resets */
function parseOpenAiResetRequestsMs(headers) {
  if (!headers) return null;
  const raw =
    headers["x-ratelimit-reset-requests"] ||
    headers["X-RateLimit-Reset-Requests"] ||
    headers["x-ratelimit-reset-tokens"];
  if (raw == null) return null;
  const s = String(raw).trim();
  let ms = 0;
  const minPart = s.match(/(\d+)m/);
  if (minPart) ms += parseInt(minPart[1], 10) * 60_000;
  const secPart = s.match(/(\d+(?:\.\d+)?)s/);
  if (secPart) ms += Math.ceil(parseFloat(secPart[1]) * 1000);
  if (ms <= 0 || ms > 600_000) return null;
  return ms + Math.floor(Math.random() * 500);
}

/** Serialize OpenAI calls + optional gap (reduces 429 bursts when several admins generate at once) */
let openAiQueue = Promise.resolve();
let lastOpenAiRequestEnd = 0;

function enqueueOpenAiTask(task) {
  const next = openAiQueue.then(() => task());
  openAiQueue = next.catch(() => {});
  return next;
}

/** Delay before retrying OpenAI after 429 / transient errors */
function getOpenAiRetryDelayMs(error, attemptIndex) {
  const h = error.response?.headers;
  const fromReset = parseOpenAiResetRequestsMs(h);
  if (fromReset != null) return fromReset;

  const retryAfter = h && (h["retry-after"] || h["Retry-After"]);
  if (retryAfter != null) {
    const sec = parseFloat(String(retryAfter).trim());
    if (!Number.isNaN(sec) && sec >= 0) {
      return Math.min(180_000, Math.ceil(sec * 1000) + Math.floor(Math.random() * 400));
    }
  }
  const status = error.response?.status;
  const cap = status === 429 ? 180_000 : 90_000;
  const base = Math.min(cap, 2500 * 2 ** attemptIndex);
  return base + Math.floor(Math.random() * 1200);
}

function mapOpenAiHttpError(error) {
  const status = error.response?.status;
  const apiMsg = error.response?.data?.error?.message || error.message;

  if (status === 429) {
    const err = new Error(
      "Limite OpenAI atteinte (429 — trop de requêtes). Attendez 2 à 3 minutes, évitez de cliquer plusieurs fois sur « Générer », puis réessayez. Vérifiez aussi votre quota (Usage / Billing) sur OpenAI."
    );
    err.code = "AI_RATE_LIMIT";
    err.status = 429;
    err.detail = apiMsg;
    err.helpUrl = "https://platform.openai.com/account/usage";
    return err;
  }
  if (status === 401) {
    const err = new Error("Clé OpenAI invalide ou expirée (vérifiez OPENAI_API_KEY).");
    err.code = "AI_AUTH";
    err.status = 401;
    return err;
  }
  if (status === 402 || status === 403) {
    const err = new Error(apiMsg || "OpenAI a refusé la requête (facturation / permissions).");
    err.code = "AI_FORBIDDEN";
    err.status = status;
    return err;
  }
  if (status >= 500) {
    const err = new Error(apiMsg || "OpenAI est temporairement indisponible.");
    err.code = "AI_UPSTREAM";
    err.status = status;
    return err;
  }
  const err = new Error(apiMsg || error.message || "OpenAI request failed");
  err.code = "AI_HTTP_ERROR";
  err.status = status;
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

async function callOpenAiJson({ system, user, maxTokens }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const err = new Error("OPENAI_API_KEY is not set");
    err.code = "AI_NOT_CONFIGURED";
    throw err;
  }

  const maxAttempts = Math.min(12, Math.max(3, Number(process.env.OPENAI_MAX_RETRIES || 8)));
  const minGapMs = Math.min(120_000, Math.max(0, Number(process.env.OPENAI_MIN_GAP_MS || 4500)));

  return enqueueOpenAiTask(async () => {
    let lastError = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const now = Date.now();
      const gapWait = Math.max(0, lastOpenAiRequestEnd + minGapMs - now);
      if (gapWait > 0) await sleep(gapWait);

      try {
        const resp = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: getModel(),
          temperature: 0.35,
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 120000,
          validateStatus: () => true,
        }
      );

        lastOpenAiRequestEnd = Date.now();

        if (resp.status >= 200 && resp.status < 300) {
          const content = resp.data?.choices?.[0]?.message?.content || "";
          try {
            return parseJsonContent(content);
          } catch (parseErr) {
            const err = new Error(`Réponse OpenAI invalide (JSON): ${parseErr.message}`);
            err.code = "AI_PARSE";
            throw err;
          }
        }

        const pseudoErr = { response: resp };
        lastError = mapOpenAiHttpError(pseudoErr);

        const retryable = resp.status === 429 || resp.status === 503 || resp.status === 502;
        if (retryable && attempt < maxAttempts - 1) {
          const delay = getOpenAiRetryDelayMs({ response: resp }, attempt);
          console.warn(
            `[OpenAI] HTTP ${resp.status}, retry in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`
          );
          await sleep(delay);
          continue;
        }

        throw lastError;
      } catch (error) {
        lastOpenAiRequestEnd = Date.now();

        if (error.code && String(error.code).startsWith("AI_")) throw error;

        if (!error.response) {
          const err = new Error(error.message || "Network error calling OpenAI");
          err.code = "AI_NETWORK";
          throw err;
        }

        lastError = mapOpenAiHttpError(error);
        const status = error.response.status;
        const retryable = status === 429 || status === 503 || status === 502;
        if (retryable && attempt < maxAttempts - 1) {
          const delay = getOpenAiRetryDelayMs(error, attempt);
          console.warn(
            `[OpenAI] HTTP ${status}, retry in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`
          );
          await sleep(delay);
          continue;
        }
        throw lastError;
      }
    }

    throw lastError || mapOpenAiHttpError(new Error("OpenAI failed"));
  });
}

function devStubExercises({ topic, difficulty, language, count, functionName }) {
  const n = Math.min(20, Math.max(1, Number(count) || 1));
  const lang = normalizeLanguage(language);
  return Array.from({ length: n }, (_, i) => ({
    title: `[DEV STUB] ${topic} — ${i + 1}`,
    description:
      `Placeholder exercise. Set OPENAI_API_KEY for real AI generation. Topic hint: ${topic}.`,
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

  if (!process.env.OPENAI_API_KEY) {
    if (process.env.ENABLE_AI_STUB === "1") {
      return devStubExercises({ topic, difficulty, language, count, functionName });
    }
    const err = new Error(
      "OpenAI is not configured. Add OPENAI_API_KEY to the server .env (or set ENABLE_AI_STUB=1 for local dev only)."
    );
    err.code = "AI_NOT_CONFIGURED";
    throw err;
  }

  const systemLangLine =
    locale === "fr"
      ? "Write all titles, descriptions, and constraints in professional French (neutral tone)."
      : "Write all titles, descriptions, and constraints in professional English (neutral tone).";

  const system = `You write data for automated coding challenges. Output a single JSON object with key "exercises" (array).
Each element must have:
- title: string
- description: string (plain text; structured; includes EXACTLY 2 input/output examples; no markdown fences)
- difficulty: one of easy, medium, hard, expert
- language: "${language}"
- starterCode: string — a single function named exactly ${functionName}(...) with only TODO comments inside the body (no real solution; use return undefined or empty body)
- testCases: array of at least 3 objects { "name": string, "assertion": string }
- constraints: string (limits / complexity)
- xpReward: number

${systemLangLine}

Description template (plain text, no markdown):
1) Context: 1 sentence
2) Task: what to implement, inputs/outputs, edge cases
3) Signature: ${functionName}(...) and what it returns
4) Example 1: ${locale === "fr" ? "Entrée:" : "Input:"} ...  ${locale === "fr" ? "Sortie:" : "Output:"} ...
5) Example 2: ${locale === "fr" ? "Entrée:" : "Input:"} ...  ${locale === "fr" ? "Sortie:" : "Output:"} ...
6) Notes: constraints / complexity hint (one short paragraph)

CRITICAL — assertions (JavaScript, run in Node vm after user code):
- Each assertion is evaluated after starterCode is prepended; it must reference ${functionName}(...) with concrete inputs and expected outputs.
- Never use constant true, assert(true), or trivially true expressions.
- Cover normal, edge, and boundary cases.

The student's incomplete starter must NOT satisfy all tests (no cheating: starter stays broken until they code the solution).`;

  const user = `Topic: "${topic}"
Difficulty: ${difficulty}
Number of distinct exercises: ${count}
Function name to use everywhere: ${functionName}
${extraHints ? `Additional requirements: ${extraHints}` : ""}

Return JSON: { "exercises": [ ... exactly ${count} items ... ] }`;

  const maxTokens = Math.min(16000, 1200 + count * 500);
  let lastValidationError = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) {
        const gap = Number(process.env.OPENAI_VALIDATION_RETRY_GAP_MS || 10_000);
        await sleep(Math.min(120_000, Math.max(3000, gap)));
      }
      const userAttempt =
        attempt === 0
          ? user
          : `${user}\n\nIMPORTANT: Previous output failed validation (${String(
              lastValidationError
            )}). Fix: incomplete starter only, real assertions, function name ${functionName}.`;

      const arr = await callOpenAiJson({ system, user: userAttempt, maxTokens });
      if (!Array.isArray(arr) || arr.length === 0) throw new Error("empty exercises array");

      const mapped = arr.slice(0, count).map((raw) =>
        mapExercise(raw, { difficulty, language })
      );

      for (const ex of mapped) {
        validateProfessionalDescription(ex.description, locale);
        validateRunnableExercise(ex.starterCode, ex.testCases, functionName);
      }
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
      if (e.code && passThrough.has(e.code)) {
        throw e;
      }
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
