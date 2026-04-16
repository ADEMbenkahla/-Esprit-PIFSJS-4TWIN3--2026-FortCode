import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Editor from "@monaco-editor/react";
import { ArrowLeft, Loader2, Play, Send, CheckCircle2, XCircle, Lightbulb, BookOpen, HelpCircle, X } from "lucide-react";
import Swal from "sweetalert2";
import { stagesApi } from "../../../services/api";
import { LevelUpModal } from "../components/Gamification/LevelUpModal";

const LANGS = ["javascript", "python", "typescript", "java", "cpp", "csharp", "go", "rust"];

export default function ChallengeEditor() {
  const { stageId, challengeId } = useParams();
  const navigate = useNavigate();
  const [stage, setStage] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("");

  // Reset auto hint preview when code changes (edge case handling)
  useEffect(() => {
    if (autoHintPreview) {
      setAutoHintPreview(null);
    }
  }, [code]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(1);

  const [helpOpen, setHelpOpen] = useState(false);
  const [helpLoading, setHelpLoading] = useState(false);
  const [helpError, setHelpError] = useState(null);
  const [helpData, setHelpData] = useState(null);
  const [helpCooldownUntil, setHelpCooldownUntil] = useState(0);
  const [helpActiveType, setHelpActiveType] = useState(null);
  const [autoHintPreview, setAutoHintPreview] = useState(null);

  // Guard to prevent duplicate auto-hint triggers per submission response
  const autoHintTriggeredRef = useRef(false);

  // Reset guard when challengeId changes
  useEffect(() => {
    autoHintTriggeredRef.current = false;
  }, [challengeId]);

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

  const requestHelp = async (type) => {
    const now = Date.now();
    if (helpLoading) return;
    if (now < helpCooldownUntil) return;

    const COSTS = { hint: 5, explain: 10, course: 15 };
    const xpCost = COSTS[type] ?? COSTS.hint;

    const confirm = await Swal.fire({
      icon: "question",
      title: "Use help?",
      text: `This will cost ${xpCost} XP. Continue?`,
      showCancelButton: true,
      confirmButtonText: "Yes",
      cancelButtonText: "Cancel",
      background: "#1a1a2e",
      color: "#fff",
    });

    if (!confirm.isConfirmed) return;

    setHelpOpen(true);
    setHelpLoading(true);
    setHelpActiveType(type);
    setHelpError(null);
    setHelpData(null);

    const cooldownTarget = now + 10_000;
    setHelpCooldownUntil(cooldownTarget);

    try {
      const { data } = await stagesApi.help(stageId, challengeId, {
        type,
        code,
      });
      setHelpData(data?.help || null);

      if (data?.xpCost) {
        const remaining = data?.xp?.points;
        const spent = data?.xpCost;
        Swal.fire({
          icon: "success",
          title: "Help used",
          text: remaining !== undefined ? `-${spent} XP (Remaining: ${remaining} XP)` : `-${spent} XP`,
          background: "#1a1a2e",
          color: "#fff",
          timer: 2200,
          showConfirmButton: false,
        });
      }
    } catch (e) {
      const body = e.response?.data;
      if (body?.code === "INSUFFICIENT_XP") {
        Swal.fire({
          icon: "warning",
          title: "Not enough XP",
          text: `You need ${body.required} XP but you only have ${body.current} XP.`,
          background: "#1a1a2e",
          color: "#fff",
        });
        setHelpOpen(false);
      } else {
        setHelpError(body?.message || e.message);
      }
    } finally {
      setHelpLoading(false);
      setHelpActiveType(null);
      const remainingMs = Math.max(0, cooldownTarget - Date.now());
      if (remainingMs > 0) {
        setTimeout(() => {
          setHelpCooldownUntil((v) => (Date.now() >= v ? 0 : v));
        }, remainingMs);
      } else {
        setHelpCooldownUntil(0);
      }
    }
  };

  const helpDisabled = helpLoading || Date.now() < helpCooldownUntil;

  // Auto-fetch hint preview directly from API response (not via useEffect)
  const fetchAutoHint = async () => {
    console.log("fetchAutoHint called - checking guard");
    
    // Guard: only trigger once per submission response
    if (autoHintTriggeredRef.current) {
      console.log("AUTO HINT SKIPPED (already triggered for this submission)");
      return;
    }

    autoHintTriggeredRef.current = true;
    console.log("AUTO HINT TRIGGERED (once per submission) - calling API");

    try {
      const response = await stagesApi.help(stageId, challengeId, {
        type: "hint",
        code,
      });
      console.log("AUTO HINT API RESPONSE:", JSON.stringify(response.data, null, 2));
      setAutoHintPreview(response.data?.help || null);
      console.log("AUTO HINT FETCHED SUCCESSFULLY");
    } catch (e) {
      console.error("AUTO HINT FAILED:", e);
      console.error("AUTO HINT FAILED DETAILS:", JSON.stringify(e.response?.data, null, 2));
      // Silent fail for auto hint
    }
  };

  const getStuckMessage = () => {
    const fails = submitResult?.failedSubmissionsInRow || 0;
    if (fails >= 6) return "This is a tough one. Try an explanation or mini course?";
    if (fails >= 4) return "You're close! Want a hint to push you forward?";
    if (fails >= 3) return "You've tried this challenge 3 times. Need a little help?";
    return "Need help? It looks like you're stuck on this challenge.";
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const response = await stagesApi.submit(stageId, challengeId, code);
      const data = response.data;
      console.log("SUBMIT RESPONSE FULL (SUCCESS):", JSON.stringify(data, null, 2));
      console.log("STUCK LEVEL RECEIVED (SUCCESS):", data.stuckLevel, "autoHintTrigger:", data.autoHintTrigger);
      setSubmitResult(data);

      // Reset auto hint on success and reset guard
      if (autoHintPreview) {
        setAutoHintPreview(null);
      }
      autoHintTriggeredRef.current = false;

      const textMessage = data.stageCompleted
        ? `You've mastered this stage!${data.xpReward?.xpAmount ? ` You earned +${data.xpReward.xpAmount} XP!` : ''}`
        : data.nextStageUnlocked
          ? "Next stage is now available."
          : "";
      
      // 🏆 Trigger Level Up Modal
      if (data.xpReward?.levelUp) {
        console.log("✨ Level Up detected! New level:", data.xpReward.newLevel);
        setNewLevel(data.xpReward.newLevel || 1);
        setTimeout(() => setShowLevelUp(true), 1500); // Cinematic delay
      }

      Swal.fire({
        icon: "success",
        title: data.stageCompleted ? "Stage completed!" : "Challenge completed",
        text: textMessage,
        background: "#1a1a2e",
        color: "#fff",
        timer: 3500,
        showConfirmButton: true,
        confirmButtonText: data.stageCompleted ? "Return to map" : "Nice",
      }).then(() => {
        if (data.stageCompleted) {
          navigate("/map");
        }
      });
    } catch (e) {
      const body = e.response?.data;
      console.log("SUBMIT RESPONSE FULL (ERROR):", JSON.stringify(body, null, 2));

      // Support nested response structures
      const autoHintTrigger = body?.autoHintTrigger ?? body?.data?.autoHintTrigger ?? body?.result?.autoHintTrigger ?? false;
      const isStuck = body?.isStuck ?? body?.data?.isStuck ?? false;
      const failedSubmissionsInRow = body?.failedSubmissionsInRow ?? body?.data?.failedSubmissionsInRow ?? 0;
      const stuckLevel = body?.stuckLevel ?? body?.data?.stuckLevel ?? 0;

      console.log("AUTO HINT CHECK - autoHintTrigger:", autoHintTrigger, "type:", typeof autoHintTrigger);
      console.log("STUCK LEVEL RECEIVED:", stuckLevel, "isStuck:", isStuck, "fails:", failedSubmissionsInRow);

      setSubmitResult({
        error: true,
        message: body?.message || e.message,
        testResults: body?.testResults ?? body?.data?.testResults,
        executionTimeMs: body?.executionTimeMs ?? body?.data?.executionTimeMs,
        sonar: body?.sonar ?? body?.data?.sonar,
        aiFeedback: body?.aiFeedback ?? body?.data?.aiFeedback,
        isStuck,
        failedSubmissionsInRow,
        stuckLevel,
        autoHintTrigger,
        isDuplicate: body?.isDuplicate,
        isMeaningfulCode: body?.isMeaningfulCode,
      });

      // Trigger auto hint ONLY if backend says so (server-driven)
      if (autoHintTrigger === true && !helpLoading) {
        console.log("AUTO HINT TRIGGERED - calling fetchAutoHint()");
        fetchAutoHint();
      } else {
        console.log("AUTO HINT NOT TRIGGERED - autoHintTrigger:", autoHintTrigger, "helpLoading:", helpLoading);
      }
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

          <button
            type="button"
            onClick={() => requestHelp("hint")}
            disabled={helpDisabled}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-purple-700/60 hover:bg-purple-700 text-xs font-bold uppercase disabled:opacity-50 disabled:hover:bg-purple-700/60"
            title="Get a hint"
          >
            {helpLoading && helpActiveType === "hint" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Lightbulb className="w-4 h-4" />
            )}
            Hint
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
                {submitResult.xpReward && submitResult.xpReward.xpAwarded && (
                  <div className="rounded-lg border border-purple-800 p-3 bg-purple-900/30">
                    <p className="text-[10px] uppercase text-purple-400 mb-1 flex items-center gap-1">
                      <span className="material-icons-outlined text-xs">auto_awesome</span> Rewards
                    </p>
                    <p className="text-xl font-bold text-amber-400">+{submitResult.xpReward.xpAmount} XP</p>
                    <p className="text-xs text-purple-300">Total: {submitResult.xpReward.newPoints} XP (Level {submitResult.xpReward.newLevel})</p>
                  </div>
                )}
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
                    {submitResult.aiFeedback.summary && (
                      <p className="text-xs text-slate-400">{submitResult.aiFeedback.summary}</p>
                    )}

                    {Array.isArray(submitResult.aiFeedback.bugs) && submitResult.aiFeedback.bugs.length > 0 && (
                      <div className="mt-2 rounded-md border border-rose-500/20 bg-rose-500/5 p-2">
                        <p className="text-[10px] uppercase text-rose-400 font-bold mb-1">Bugs</p>
                        {submitResult.aiFeedback.bugs.map((b, i) => (
                          <p key={i} className="text-xs text-rose-200">
                            • {b}
                          </p>
                        ))}
                      </div>
                    )}

                    {Array.isArray(submitResult.aiFeedback.suggestions) && submitResult.aiFeedback.suggestions.length > 0 && (
                      <div className="mt-2 rounded-md border border-blue-500/20 bg-blue-500/5 p-2">
                        <p className="text-[10px] uppercase text-blue-400 font-bold mb-1">Suggestions</p>
                        {submitResult.aiFeedback.suggestions.map((s, i) => (
                          <p key={i} className="text-xs text-slate-300">
                            • {s}
                          </p>
                        ))}
                      </div>
                    )}

                    {Array.isArray(submitResult.aiFeedback.improvements) && submitResult.aiFeedback.improvements.length > 0 && (
                      <div className="mt-2 rounded-md border border-amber-500/20 bg-amber-500/5 p-2">
                        <p className="text-[10px] uppercase text-amber-300 font-bold mb-1">Improvements</p>
                        {submitResult.aiFeedback.improvements.map((s, i) => (
                          <p key={i} className="text-xs text-slate-300">
                            • {s}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {submitResult.isStuck && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4"
                  >
                    <p className="text-sm font-semibold text-purple-200">
                      {getStuckMessage()}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Failed submissions in a row: {submitResult.failedSubmissionsInRow || 0}
                    </p>

                    {/* Auto-fetched hint preview after 5 failures */}
                    {autoHintPreview && (
                      <div className="mt-3 rounded-md border border-purple-500/10 bg-purple-500/5 p-3">
                        <p className="text-[10px] uppercase tracking-widest text-purple-400 font-bold mb-1">Auto hint preview</p>
                        {autoHintPreview.content && (
                          <p className="text-xs text-slate-300 leading-relaxed">{autoHintPreview.content}</p>
                        )}
                        {Array.isArray(autoHintPreview.keyPoints) && autoHintPreview.keyPoints.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {autoHintPreview.keyPoints.slice(0, 3).map((k, i) => (
                              <li key={i} className="text-xs text-slate-400">
                                • {k}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => requestHelp("hint")}
                        disabled={helpDisabled}
                        className="inline-flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs font-bold text-purple-200 hover:bg-purple-500/15 disabled:opacity-50"
                      >
                        {helpLoading && helpActiveType === "hint" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Lightbulb className="w-4 h-4" />
                        )}
                        Hint (-5 XP)
                      </button>
                      <button
                        type="button"
                        onClick={() => requestHelp("explain")}
                        disabled={helpDisabled}
                        className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-200 hover:bg-blue-500/15 disabled:opacity-50"
                      >
                        {helpLoading && helpActiveType === "explain" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <BookOpen className="w-4 h-4" />
                        )}
                        Explanation (-10 XP)
                      </button>
                      <button
                        type="button"
                        onClick={() => requestHelp("course")}
                        disabled={helpDisabled}
                        className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/15 disabled:opacity-50"
                      >
                        {helpLoading && helpActiveType === "course" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <BookOpen className="w-4 h-4" />
                        )}
                        Mini Course (-15 XP)
                      </button>
                    </div>
                  </motion.div>
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
                {submitResult.aiFeedback && (
                  <div className="rounded-lg border border-slate-800 p-3 bg-slate-900/60">
                    <p className="text-[10px] uppercase text-slate-500 mb-1">AI feedback</p>
                    {submitResult.aiFeedback.summary && (
                      <p className="text-xs text-slate-400">{submitResult.aiFeedback.summary}</p>
                    )}

                    {Array.isArray(submitResult.aiFeedback.bugs) && submitResult.aiFeedback.bugs.length > 0 && (
                      <div className="mt-2 rounded-md border border-rose-500/20 bg-rose-500/5 p-2">
                        <p className="text-[10px] uppercase text-rose-400 font-bold mb-1">Bugs</p>
                        {submitResult.aiFeedback.bugs.map((b, i) => (
                          <p key={i} className="text-xs text-rose-200">
                            • {b}
                          </p>
                        ))}
                      </div>
                    )}

                    {Array.isArray(submitResult.aiFeedback.suggestions) && submitResult.aiFeedback.suggestions.length > 0 && (
                      <div className="mt-2 rounded-md border border-blue-500/20 bg-blue-500/5 p-2">
                        <p className="text-[10px] uppercase text-blue-400 font-bold mb-1">Suggestions</p>
                        {submitResult.aiFeedback.suggestions.map((s, i) => (
                          <p key={i} className="text-xs text-slate-300">
                            • {s}
                          </p>
                        ))}
                      </div>
                    )}

                    {Array.isArray(submitResult.aiFeedback.improvements) && submitResult.aiFeedback.improvements.length > 0 && (
                      <div className="mt-2 rounded-md border border-amber-500/20 bg-amber-500/5 p-2">
                        <p className="text-[10px] uppercase text-amber-300 font-bold mb-1">Improvements</p>
                        {submitResult.aiFeedback.improvements.map((s, i) => (
                          <p key={i} className="text-xs text-slate-300">
                            • {s}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!runResult && !submitResult && (
              <p className="text-slate-600 text-sm italic">Run or submit to see output.</p>
            )}
          </div>
        </div>
      </div>

      <LevelUpModal 
        isOpen={showLevelUp} 
        level={newLevel} 
        onClose={() => setShowLevelUp(false)} 
      />

      {helpOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950 text-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-purple-300" />
                <h3 className="text-sm font-bold">Need help?</h3>
              </div>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => requestHelp("hint")}
                disabled={helpDisabled}
                className="inline-flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs font-bold text-purple-200 hover:bg-purple-500/15 disabled:opacity-50 disabled:hover:bg-purple-500/10"
              >
                {helpLoading && helpActiveType === "hint" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lightbulb className="w-4 h-4" />
                )}
                Hint (-5 XP)
              </button>
              <button
                type="button"
                onClick={() => requestHelp("explain")}
                disabled={helpDisabled}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-200 hover:bg-blue-500/15 disabled:opacity-50 disabled:hover:bg-blue-500/10"
              >
                {helpLoading && helpActiveType === "explain" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <BookOpen className="w-4 h-4" />
                )}
                Explanation (-10 XP)
              </button>
              <button
                type="button"
                onClick={() => requestHelp("course")}
                disabled={helpDisabled}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/15 disabled:opacity-50 disabled:hover:bg-amber-500/10"
              >
                {helpLoading && helpActiveType === "course" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <BookOpen className="w-4 h-4" />
                )}
                Mini Course (-15 XP)
              </button>
            </div>

            <div className="p-4">
              {helpLoading && (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading help...
                </div>
              )}

              {helpError && !helpLoading && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-rose-200 text-sm">
                  {helpError}
                </div>
              )}

              {helpData && !helpLoading && (
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{helpData.title || "Help"}</p>
                    {helpData.content && <p className="mt-2 text-sm text-slate-300 leading-relaxed">{helpData.content}</p>}
                  </div>

                  {Array.isArray(helpData.keyPoints) && helpData.keyPoints.length > 0 && (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Key points</p>
                      {helpData.keyPoints.map((k, i) => (
                        <p key={i} className="text-xs text-slate-300">
                          - {k}
                        </p>
                      ))}
                    </div>
                  )}

                  {Array.isArray(helpData.resources) && helpData.resources.length > 0 && (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Resources</p>
                      {helpData.resources.map((r, i) => (
                        <p key={i} className="text-xs text-slate-400">
                          - {r}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!helpData && !helpLoading && !helpError && (
                <p className="text-slate-500 text-sm">Choose an option above to get help.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
