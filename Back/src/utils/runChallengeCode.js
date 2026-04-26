const vm = require("node:vm");

/**
 * Runs user JavaScript with appended test assertions.
 * Each testCase.assertion is JS that should evaluate to true (e.g. "return fn(2) === 4;").
 * Wraps as function body: userCode + "\n" + assertions combined in one IIFE or sequential checks.
 */
function runJavaScriptTests(userCode, testCases) {
  const results = [];
  const outputLines = [];
  const start = Date.now();

  if (!testCases || testCases.length === 0) {
    return {
      passed: false,
      testResults: [{ name: "default", passed: false, error: "No test cases defined for this challenge" }],
      executionTimeMs: Date.now() - start,
    };
  }

  for (const tc of testCases) {
    const name = tc.name || "Test";
    const assertion = (tc.assertion || "").trim();
    try {
      const body = assertion.includes("return")
        ? `"use strict";\n${userCode}\n;(function(){\n${assertion}\n})();`
        : `"use strict";\n${userCode}\n;(function(){ return Boolean(${assertion}); })();`;
      const script = new vm.Script(body, { filename: "user-challenge.js" });
      const capture = (level) => (...args) => {
        const line = args.map((item) => {
          if (typeof item === "string") return item;
          try {
            return JSON.stringify(item);
          } catch (_error) {
            return String(item);
          }
        }).join(" ");
        outputLines.push(level ? `[${level}] ${line}` : line);
      };
      const ctx = vm.createContext({
        console: {
          log: capture("log"),
          info: capture("info"),
          warn: capture("warn"),
          error: capture("error"),
        },
        Math,
        JSON,
        String,
        Number,
        Array,
        Object,
        Boolean,
        Date,
        parseInt,
        parseFloat,
        RegExp,
        Error,
        Map,
        Set,
      });
      const passed = Boolean(script.runInContext(ctx, { timeout: 3000 }));
      results.push({ name, passed, error: passed ? null : "Assertion failed" });
    } catch (err) {
      results.push({ name, passed: false, error: err.message || String(err) });
    }
  }

  const executionTimeMs = Date.now() - start;
  const passed = results.length > 0 && results.every((r) => r.passed);
  const outputSnapshot = outputLines.length
    ? outputLines.join("\n")
    : results.map((item) => `${item.passed ? "PASS" : "FAIL"} - ${item.name}${item.error ? `: ${item.error}` : ""}`).join("\n");
  return { passed, testResults: results, executionTimeMs, outputSnapshot };
}

function runMockValidator(language, userCode) {
  const isNotEmpty = userCode && userCode.trim().length > 10;
  return {
    passed: isNotEmpty,
    testResults: [
      {
        name: language,
        passed: isNotEmpty,
        error: isNotEmpty ? null : "Code is too short or empty",
      },
    ],
    executionTimeMs: 10,
    outputSnapshot: isNotEmpty ? `Validation for ${language} passed successfully (Mock Mode).` : "Empty code submission.",
  };
}

function runChallengeCode(language, userCode, testCases) {
  const lang = String(language || "javascript").toLowerCase();
  if (lang === "javascript" || lang === "typescript") {
    return runJavaScriptTests(userCode || "", Array.isArray(testCases) ? testCases : []);
  }
  return runMockValidator(language, userCode);
}

module.exports = { runChallengeCode, runJavaScriptTests };
