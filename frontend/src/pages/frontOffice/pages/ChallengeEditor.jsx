import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { ArrowLeft, Loader2, Play, Send, CheckCircle2, XCircle } from "lucide-react";
import Swal from "sweetalert2";
import { stagesApi } from "../../../services/api";

const LANGS = ["javascript", "python", "typescript", "java", "cpp", "csharp", "go", "rust"];

export default function ChallengeEditor() {
  const { stageId, challengeId } = useParams();
  const navigate = useNavigate();
  const [stage, setStage] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await stagesApi.get(stageId);
        if (cancelled) return;
        setStage(data);
        const ch = (data.challenges || []).find((x) => String(x._id) === String(challengeId));
        if (!ch) {
          setChallenge(null);
          return;
        }
        setChallenge(ch);
        setLanguage(ch.language || "javascript");
        setCode(ch.starterCode || "");
      } catch (e) {
        if (!cancelled) {
          Swal.fire({
            icon: "error",
            title: "Cannot load stage",
            text: e.response?.data?.message || e.message,
            background: "#1a1a2e",
            color: "#fff",
          }).then(() => navigate(`/training/${stageId}`));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stageId, challengeId, navigate]);

  const editorLanguage = useMemo(() => {
    if (language === "python") return "python";
    if (language === "typescript") return "typescript";
    if (language === "java") return "java";
    if (language === "cpp" || language === "csharp") return "cpp";
    return "javascript";
  }, [language]);

  const handleRun = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const { data } = await stagesApi.run(stageId, challengeId, code);
      setRunResult(data);
    } catch (e) {
      setRunResult({
        passed: false,
        testResults: [{ name: "error", passed: false, error: e.response?.data?.message || e.message }],
        executionTimeMs: 0,
      });
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const { data } = await stagesApi.submit(stageId, challengeId, code);
      setSubmitResult(data);
      Swal.fire({
        icon: "success",
        title: data.stageCompleted ? "Stage completed!" : "Challenge completed",
        text: data.nextStageUnlocked ? "Next stage is now available." : "",
        background: "#1a1a2e",
        color: "#fff",
        timer: 2500,
        showConfirmButton: true,
      });
    } catch (e) {
      const body = e.response?.data;
      setSubmitResult({
        error: true,
        message: body?.message || e.message,
        testResults: body?.testResults,
        executionTimeMs: body?.executionTimeMs,
        sonar: body?.sonar,
        aiFeedback: body?.aiFeedback,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-red-400">
        Challenge not found
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-200">
      <header className="border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-4 bg-slate-900/80 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate(`/training/${stageId}`)}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 uppercase truncate">{stage?.title}</p>
            <h1 className="font-bold text-slate-100 truncate">{challenge.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs"
          >
            {LANGS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={running}
            onClick={handleRun}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold uppercase disabled:opacity-50"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 text-emerald-400" />}
            Run
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold uppercase disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        <aside className="lg:w-80 border-b lg:border-b-0 lg:border-r border-slate-800 p-4 overflow-y-auto shrink-0">
          <h2 className="text-xs font-bold text-slate-500 uppercase mb-2">Description</h2>
          <p className="text-sm text-slate-400 leading-relaxed">{challenge.description}</p>
          {challenge.completed && (
            <p className="mt-4 text-emerald-400 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> You already completed this challenge.
            </p>
          )}
        </aside>

        <div className="flex-1 flex flex-col min-h-[50vh]">
          <div className="flex-1 min-h-[240px] border-b border-slate-800">
            <Editor
              height="100%"
              language={editorLanguage}
              theme="vs-dark"
              value={code}
              onChange={(v) => setCode(v || "")}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>

          <div className="h-64 lg:h-72 overflow-y-auto p-4 bg-slate-900/50">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Results</h3>

            {runResult && !submitResult?.error && (
              <div className="mb-4 space-y-2">
                <p className="text-xs text-slate-400">
                  Run — {runResult.executionTimeMs}ms —{" "}
                  <span className={runResult.passed ? "text-emerald-400" : "text-rose-400"}>
                    {runResult.passed ? "all passed" : "failed"}
                  </span>
                </p>
                <ul className="space-y-1">
                  {(runResult.testResults || []).map((t, i) => (
                    <li key={i} className="text-xs flex items-start gap-2">
                      {t.passed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <span>
                        <span className="font-mono text-slate-300">{t.name}</span>
                        {t.error && <span className="text-rose-400 ml-2">{t.error}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {submitResult && !submitResult.error && (
              <div className="space-y-3 text-sm">
                <p className="text-emerald-400 font-semibold">Submission saved</p>
                <p className="text-slate-400">Progress: {submitResult.progress?.progressPercent}%</p>
                {submitResult.sonar && (
                  <div className="rounded-lg border border-slate-800 p-3 bg-slate-900/60">
                    <p className="text-[10px] uppercase text-slate-500 mb-1">Sonar (quality)</p>
                    <p className="text-lg font-bold text-amber-300">{submitResult.sonar.qualityScore}</p>
                    <p className="text-xs text-slate-500">{submitResult.sonar.summary}</p>
                  </div>
                )}
                {submitResult.aiFeedback && (
                  <div className="rounded-lg border border-slate-800 p-3 bg-slate-900/60">
                    <p className="text-[10px] uppercase text-slate-500 mb-1">AI feedback</p>
                    <p className="text-xs text-slate-400">{submitResult.aiFeedback.summary}</p>
                    {(submitResult.aiFeedback.suggestions || []).map((s, i) => (
                      <p key={i} className="text-xs text-slate-500 mt-1">
                        • {s}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {submitResult?.error && (
              <div className="space-y-2">
                <p className="text-rose-400 text-sm font-semibold">{submitResult.message}</p>
                {submitResult.testResults && (
                  <ul className="space-y-1">
                    {submitResult.testResults.map((t, i) => (
                      <li key={i} className="text-xs text-slate-400">
                        {t.name}: {t.error || (t.passed ? "ok" : "fail")}
                      </li>
                    ))}
                  </ul>
                )}
                {submitResult.sonar && (
                  <p className="text-xs text-slate-500">Quality score: {submitResult.sonar.qualityScore}</p>
                )}
                {submitResult.aiFeedback?.summary && (
                  <p className="text-xs text-slate-500">{submitResult.aiFeedback.summary}</p>
                )}
              </div>
            )}

            {!runResult && !submitResult && (
              <p className="text-slate-600 text-sm italic">Run or submit to see output.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
