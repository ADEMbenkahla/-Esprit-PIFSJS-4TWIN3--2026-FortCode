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
    : results.map((item) => `${item.passed ? "✓" : "✗"} ${item.name}${item.error ? `: ${item.error}` : ""}`).join("\n");
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

const { spawnSync } = require("child_process");

function runPythonTests(userCode, testCases) {
  const results = [];
  const start = Date.now();

  if (!testCases || testCases.length === 0) {
    return { passed: true, testResults: [], executionTimeMs: 0, outputSnapshot: "Mock pass (no tests)" };
  }

  for (const tc of testCases) {
    const name = tc.name || "Test";
    const assertion = (tc.assertion || "").trim();

    // Construct a Python script that defines the user's function and then asserts the condition.
    // We use a try-except block to capture assertion errors.
    const script = `
import sys
import json

def run_test():
    try:
${userCode.split('\n').map(line => '        ' + line).join('\n')}
        
        # Test Assertion
        result = ${assertion.replace(/===/g, '==').replace(/!==/g, '!=')}
        if result:
            print(json.dumps({"passed": True}))
        else:
            print(json.dumps({"passed": False, "error": "Assertion failed: ${assertion}"}))
    except Exception as e:
        print(json.dumps({"passed": False, "error": str(e)}))

if __name__ == "__main__":
    run_test()
`;

    try {
      const pyProcess = spawnSync("python", ["-c", script], { encoding: "utf8", timeout: 3000 });

      if (pyProcess.error) {
        results.push({ name, passed: false, error: pyProcess.error.message });
        continue;
      }

      if (pyProcess.status !== 0) {
        // Might be a syntax error or crash
        const errMsg = pyProcess.stderr.trim() || pyProcess.stdout.trim() || "Python execution failed";
        results.push({ name, passed: false, error: errMsg });
        continue;
      }

      try {
        const output = JSON.parse(pyProcess.stdout.trim());
        results.push({ name, passed: output.passed, error: output.error || null });
      } catch (parseErr) {
        results.push({ name, passed: false, error: "Malformed output from Python runner" });
      }
    } catch (err) {
      results.push({ name, passed: false, error: err.message });
    }
  }

  const executionTimeMs = Date.now() - start;
  const passed = results.length > 0 && results.every((r) => r.passed);
  const outputSnapshot = results.every(r => r.passed)
    ? "All tests passed successfully!"
    : results.map(r => `${r.passed ? '✓' : '✗'} ${r.name}${r.error ? ': ' + r.error : ''}`).join('\n');

  return { passed, testResults: results, executionTimeMs, outputSnapshot };
}

function runChallengeCode(language, userCode, testCases) {
  const lang = String(language || "javascript").toLowerCase();
  if (lang === "javascript" || lang === "js" || lang === "typescript") {
    return runJavaScriptTests(userCode || "", Array.isArray(testCases) ? testCases : []);
  }
  if (lang === "python" || lang === "py") {
    return runPythonTests(userCode || "", Array.isArray(testCases) ? testCases : []);
  }
  return runMockValidator(language, userCode);
}

module.exports = { runChallengeCode, runJavaScriptTests };
