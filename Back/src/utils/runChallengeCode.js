const vm = require("node:vm");

/**
 * Runs user JavaScript with appended test assertions.
 * Each testCase.assertion is JS that should evaluate to true (e.g. "return fn(2) === 4;").
 * Wraps as function body: userCode + "\n" + assertions combined in one IIFE or sequential checks.
 */
function runJavaScriptTests(userCode, testCases) {
  const results = [];
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
      const ctx = vm.createContext({
        console,
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
  return { passed, testResults: results, executionTimeMs };
}

function runPythonPlaceholder() {
  return {
    passed: false,
    testResults: [
      {
        name: "python",
        passed: false,
        error: "Python execution is not available on the server sandbox yet. Use JavaScript challenges for graded runs.",
      },
    ],
    executionTimeMs: 0,
  };
}

function runChallengeCode(language, userCode, testCases) {
  if (language === "python") {
    return runPythonPlaceholder();
  }
  return runJavaScriptTests(userCode, testCases);
}

module.exports = { runChallengeCode, runJavaScriptTests };
