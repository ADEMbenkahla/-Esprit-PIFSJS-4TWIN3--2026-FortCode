const axios = require("axios");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

function ratingToScore(rating) {
  // Sonar ratings are 1(A) .. 5(E)
  const value = Number(rating || 5);
  return Math.max(0, Math.min(100, 100 - (value - 1) * 20));
}

function ratingToLetter(raw) {
  const value = Number(raw || 5);
  const map = { 1: "A", 2: "B", 3: "C", 4: "D", 5: "E" };
  return map[value] || "E";
}

function safeSlug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function languageToExt(language) {
  const map = {
    javascript: "js",
    js: "js",
    typescript: "ts",
    ts: "ts",
    python: "py",
    py: "py",
    java: "java",
    cpp: "cpp",
    csharp: "cs",
    php: "php",
    go: "go",
    ruby: "rb",
  };
  return map[String(language || "").toLowerCase()] || "txt";
}

function getSonarConfig() {
  const token = process.env.SONARCLOUD_TOKEN || process.env.SONARQUBE_TOKEN;
  const organization = process.env.SONARCLOUD_ORGANIZATION || process.env.SONARQUBE_ORGANIZATION;
  const branch = process.env.SONARCLOUD_BRANCH || process.env.SONARQUBE_BRANCH;
  const baseUrl = (process.env.SONARCLOUD_URL || process.env.SONARQUBE_URL || "https://sonarcloud.io").replace(/\/$/, "");
  const fallbackProjectKey = process.env.SONARCLOUD_PROJECT_KEY || process.env.SONARQUBE_PROJECT_KEY;
  return { token, organization, branch, baseUrl, fallbackProjectKey };
}

async function ensureSonarCloudProjectExists({ baseUrl, token, organization, projectKey, projectName }) {
  if (!token || !organization || !projectKey) return;
  const auth = Buffer.from(`${token}:`).toString("base64");
  try {
    await axios.post(
      `${baseUrl}/api/projects/create`,
      null,
      {
        params: {
          organization,
          project: projectKey,
          name: projectName,
        },
        headers: { Authorization: `Basic ${auth}` },
        timeout: 15000,
      }
    );
  } catch (error) {
    // If project already exists or cannot be created, continue and let scan/fetch decide.
    const msg = String(error?.response?.data?.errors?.[0]?.msg || "").toLowerCase();
    if (!msg.includes("already exists")) {
      // non-fatal
    }
  }
}

function runSonarScanner({ cwd, env }) {
  const runOne = (command, args, options = {}) =>
    new Promise((resolve) => {
      let child;
      try {
        child = spawn(command, args, { cwd, env, shell: !!options.shell });
      } catch (error) {
        resolve({ ok: false, error: error?.message || "Command not available" });
        return;
      }
      let stderr = "";
      let stdout = "";

      child.stdout.on("data", (data) => {
        stdout += String(data);
      });
      child.stderr.on("data", (data) => {
        stderr += String(data);
      });

      child.on("error", (error) => {
        resolve({ ok: false, error: error.message || "Command not available" });
      });

      child.on("close", (code) => {
        if (code === 0) resolve({ ok: true, output: stdout });
        else resolve({ ok: false, error: stderr || stdout || `${command} exited with code ${code}` });
      });
    });

  return new Promise(async (resolve) => {
    const attempts = process.platform === "win32"
      ? [
        () => runOne("cmd.exe", ["/d", "/s", "/c", "sonar-scanner"]),
        () => runOne("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "sonar-scanner"]),
      ]
      : [
        () => runOne("sonar-scanner", []),
      ];

    const errors = [];
    for (const attempt of attempts) {
      const result = await attempt();
      if (result.ok) return resolve(result);
      errors.push(result.error || "Unknown scanner error");
    }

    resolve({ ok: false, error: errors.join(" | ") || "sonar-scanner not available" });
  });
}

async function triggerSubmissionScan({ code, language, projectKey, organization, token, baseUrl }) {
  if (!token || !projectKey) {
    return { ok: false, reason: "Missing Sonar token/project key" };
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fortcode-sonar-"));
  try {
    const ext = languageToExt(language);
    const sourceFile = `submission.${ext}`;
    fs.writeFileSync(path.join(tempDir, sourceFile), code || "", "utf8");

    const props = [
      `sonar.projectKey=${projectKey}`,
      `sonar.projectName=${projectKey}`,
      `sonar.host.url=${baseUrl}`,
      `sonar.sources=.`,
      `sonar.sourceEncoding=UTF-8`,
      `sonar.token=${token}`,
      organization ? `sonar.organization=${organization}` : "",
      `sonar.exclusions=node_modules/**`,
    ].filter(Boolean).join("\n");

    fs.writeFileSync(path.join(tempDir, "sonar-project.properties"), props, "utf8");

    const scan = await runSonarScanner({ cwd: tempDir, env: process.env });
    return scan.ok ? { ok: true } : { ok: false, reason: scan.error };
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {
      // ignore cleanup errors
    }
  }
}

function normalizeIssuesFromMeasures(measures) {
  const issues = [];
  const bugs = Number(measures.bugs || 0);
  const vulnerabilities = Number(measures.vulnerabilities || 0);
  const smells = Number(measures.code_smells || 0);
  const duplication = Number(measures.duplicated_lines_density || 0);

  if (bugs > 0) issues.push({ severity: "MAJOR", message: `${bugs} bug(s) detected` });
  if (vulnerabilities > 0) issues.push({ severity: "CRITICAL", message: `${vulnerabilities} vulnerability(ies) detected` });
  if (smells > 0) issues.push({ severity: "INFO", message: `${smells} code smell(s) detected` });
  if (duplication > 10) issues.push({ severity: "MINOR", message: `High duplication: ${duplication.toFixed(1)}%` });

  return issues;
}

function computeCompositeScore(measures) {
  const reliability = ratingToScore(measures.reliability_rating);
  const security = ratingToScore(measures.security_rating);
  const maintainability = ratingToScore(measures.sqale_rating);
  const coverage = Math.max(0, Math.min(100, Number(measures.coverage || 0)));
  const duplicationPenalty = Math.max(0, Math.min(30, Number(measures.duplicated_lines_density || 0)));

  const weighted =
    reliability * 0.3 +
    security * 0.3 +
    maintainability * 0.25 +
    coverage * 0.15;

  return Math.max(0, Math.min(100, Math.round(weighted - duplicationPenalty * 0.2)));
}

async function fetchSonarCloudProjectAnalysis(projectKeyOverride) {
  const { token, branch, baseUrl: sonarBaseUrl, fallbackProjectKey } = getSonarConfig();
  const projectKey = projectKeyOverride || fallbackProjectKey;

  if (!token || !projectKey) return null;

  const auth = Buffer.from(`${token}:`).toString("base64");
  const params = branch ? { component: projectKey, metricKeys: "bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density,reliability_rating,security_rating,sqale_rating", branch } : { component: projectKey, metricKeys: "bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density,reliability_rating,security_rating,sqale_rating" };

  const [measuresRes, gateRes] = await Promise.all([
    axios.get(`${sonarBaseUrl}/api/measures/component`, {
      params,
      headers: { Authorization: `Basic ${auth}` },
      timeout: 15000,
    }),
    axios.get(`${sonarBaseUrl}/api/qualitygates/project_status`, {
      params: branch ? { projectKey, branch } : { projectKey },
      headers: { Authorization: `Basic ${auth}` },
      timeout: 15000,
    }),
  ]);

  const list = measuresRes?.data?.component?.measures || [];
  const measures = list.reduce((acc, m) => {
    acc[m.metric] = m.value;
    return acc;
  }, {});

  const qualityGateStatus = gateRes?.data?.projectStatus?.status || "UNKNOWN";
  const score = computeCompositeScore(measures);
  const issues = normalizeIssuesFromMeasures(measures);
  const summary = `SonarCloud project quality (${projectKey}) - gate: ${qualityGateStatus}, score: ${score}/100.`;

  return {
    qualityScore: score,
    issues,
    summary,
    source: "sonarcloud",
    metrics: measures,
    qualityGateStatus,
    projectKey,
  };
}

async function fetchSonarStub(code, language, context = {}) {
  const { token, organization, branch, baseUrl, fallbackProjectKey } = getSonarConfig();

  const dynamicProjectKey = context?.participantId && (context?.roomId || context?.stageId)
    ? safeSlug(`fortcode-${organization || "org"}-${context.roomId ? 'room' : 'stage'}-${context.roomId || context.stageId}-visitor-${context.participantId}`)
    : null;
  const projectKey = dynamicProjectKey || fallbackProjectKey;

  let scanFailureReason = "";

  // Real SonarCloud integration with per-submission scan when configuration is present.
  try {
    if (token && projectKey) {
      if (dynamicProjectKey) {
        await ensureSonarCloudProjectExists({
          baseUrl,
          token,
          organization,
          projectKey,
          projectName: context?.projectName || projectKey,
        });

        const scanResult = await triggerSubmissionScan({
          code,
          language,
          projectKey,
          organization,
          token,
          baseUrl,
        });

        // Analysis indexing can take some time on SonarCloud, so poll briefly.
        if (scanResult.ok) {
          for (let i = 0; i < 8; i += 1) {
            const sonarCloud = await fetchSonarCloudProjectAnalysis(projectKey);
            if (sonarCloud) {
              return {
                ...sonarCloud,
                source: "sonarcloud-submission",
              };
            }
            await new Promise((resolve) => setTimeout(resolve, 3000));
          }
          scanFailureReason = "Scan ran but SonarCloud analysis was not indexed in time";
        } else {
          scanFailureReason = scanResult.reason || "Scanner execution failed";
        }
      }

      const sonarCloud = await fetchSonarCloudProjectAnalysis(projectKey);
      if (sonarCloud) return sonarCloud;
    }
  } catch (_e) {
    // Fallback below if SonarCloud is unreachable or not configured.
  }

  // Fallback heuristic when SonarCloud scan cannot be used.
  const lines = (code || "").split("\n").filter((l) => l.trim()).length;
  const alerts = [];
  if (/\beval\s*\(/i.test(code || "")) alerts.push("Use of eval() detected");
  if (/\bFunction\s*\(/i.test(code || "")) alerts.push("Dynamic Function constructor detected");
  if (/while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)/i.test(code || "")) alerts.push("Infinite-loop pattern detected");

  const heuristicMetrics = {
    bugs: 0,
    vulnerabilities: alerts.length > 0 ? 1 : 0,
    code_smells: Math.max(0, Math.ceil(lines / 20)),
    security_rating: alerts.length > 0 ? 4 : 1, // 1 is A
    reliability_rating: /while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)/i.test(code || "") ? 4 : 1, // 1 is A
    sqale_rating: lines > 80 ? 4 : lines > 30 ? 3 : 1, // 1 is A for short clean code
    security_hotspots_reviewed: 0,
    duplicated_lines_density: 0,
    coverage: 100, // Small snippets assumed fully covered
  };
  const score = computeCompositeScore(heuristicMetrics);

  return {
    qualityScore: score,
    issues: [
      ...(lines < 2 ? [{ severity: "INFO", message: "Very short submission" }] : []),
      ...alerts.map((message) => ({ severity: "MAJOR", message })),
    ],
    summary: `Heuristic quality score (${lines} non-empty lines). ${scanFailureReason ? `Fallback reason: ${scanFailureReason}. ` : ""}Configure SONARQUBE_* and sonar-scanner for real SonarCloud analysis.`,
    source: "heuristic",
    metrics: heuristicMetrics,
    qualityGateStatus: "HEURISTIC",
    projectKey: projectKey || "",
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

module.exports = { fetchSonarStub, fetchAiFeedback, ratingToLetter };
