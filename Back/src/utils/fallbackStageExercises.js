function normalizeDifficulty(value) {
  const v = String(value || "medium").toLowerCase();
  if (["easy", "medium", "hard", "expert"].includes(v)) return v;
  return "medium";
}

function computeReward(difficulty) {
  if (difficulty === "easy") return 50;
  if (difficulty === "medium") return 100;
  if (difficulty === "hard") return 150;
  return 200;
}

function makeStarterCode(language, fnName) {
  if (String(language).toLowerCase() === "typescript") {
    return `function ${fnName}(input: number): number {\n  // TODO: implement\n  return input;\n}`;
  }
  return `function ${fnName}(input) {\n  // TODO: implement\n  return input;\n}`;
}

function makeAssertions(fnName, index) {
  const offset = index + 1;
  return [
    { name: "returns a number", assertion: `typeof ${fnName}(${offset}) === "number"` },
    { name: "handles zero", assertion: `${fnName}(0) === 0 || Number.isFinite(${fnName}(0))` },
    { name: "handles positive input", assertion: `${fnName}(${offset * 2}) >= 0` },
  ];
}

function generateFallbackStageExercises({ topic, difficulty, language, count = 3 }) {
  const safeDifficulty = normalizeDifficulty(difficulty);
  const safeLanguage = String(language || "javascript").toLowerCase() === "typescript" ? "typescript" : "javascript";
  const n = Math.min(10, Math.max(1, Number(count) || 1));
  const baseTopic = String(topic || "Core Logic").trim() || "Core Logic";

  return Array.from({ length: n }, (_x, index) => {
    const fnName = `solve${index + 1}`;
    return {
      title: `${baseTopic} Drill ${index + 1}`,
      description:
        `Implement a function to process numeric input reliably for ${baseTopic}. ` +
        `Input: a number. Output: a deterministic numeric result. ` +
        `Example input/output: Input 0 -> Output 0. Input ${index + 2} -> Output a non-negative number.`,
      difficulty: safeDifficulty,
      language: safeLanguage,
      starterCode: makeStarterCode(safeLanguage, fnName),
      testCases: makeAssertions(fnName, index),
      constraints: "Fallback draft exercise generated locally. Review title/description before publishing.",
      category: "general",
      xpReward: computeReward(safeDifficulty),
    };
  });
}

module.exports = { generateFallbackStageExercises };
