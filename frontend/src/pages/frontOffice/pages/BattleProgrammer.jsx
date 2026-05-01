import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import Swal from "sweetalert2";
import {
  getParticipantBattleRoomAccess,
  reportParticipantBattleFraud,
  runParticipantBattleCode,
  submitParticipantBattleCode,
} from "../../../services/api";

const getRemainingMs = (startedAt, timeLimitMinutes, now = Date.now()) => {
  if (!startedAt || !timeLimitMinutes) return null;
  const end = new Date(startedAt).getTime() + timeLimitMinutes * 60 * 1000;
  return Math.max(0, end - now);
};

const formatRemaining = (remainingMs) => {
  if (remainingMs == null) return null;
  const mins = Math.floor(remainingMs / 60000);
  const secs = Math.floor((remainingMs % 60000) / 1000);
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

const normalizeMonacoLanguage = (language) => {
  const value = String(language || "javascript").toLowerCase().trim();
  const map = {
    js: "javascript",
    javascript: "javascript",
    ts: "typescript",
    typescript: "typescript",
    py: "python",
    python: "python",
    java: "java",
    cpp: "cpp",
    cplusplus: "cpp",
    csharp: "csharp",
    cs: "csharp",
    php: "php",
    go: "go",
    ruby: "ruby",
    rb: "ruby",
    html: "html",
    css: "css",
    json: "json",
  };
  return map[value] || "javascript";
};

export default function BattleProgrammer() {
  const { roomId } = useParams();
  const [room, setRoom] = useState(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningShell, setRunningShell] = useState(false);
  const [shellRun, setShellRun] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [fraudBlocked, setFraudBlocked] = useState(false);
  const [finalSubmitted, setFinalSubmitted] = useState(false);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [resultsShared, setResultsShared] = useState(false);
  const [sharedRanking, setSharedRanking] = useState([]);
  const fraudReportedRef = useRef(false);

  const isLive = room?.status === "live";
  const isEnded = room?.status === "ended";
  const waitingStart = room?.status === "draft" || room?.status === "scheduled";
  const remainingMs = useMemo(() => getRemainingMs(room?.startedAt, room?.timeLimitMinutes, now), [room?.startedAt, room?.timeLimitMinutes, now]);
  const timeExpired = isLive && remainingMs === 0;
  const hasSubmission = rankingLoading || finalSubmitted || ["submitted", "evaluated"].includes(String(room?.mySubmission?.status || ""));
  const blockedByFraud = !hasSubmission && (fraudBlocked || room?.mySubmission?.fraudDetected);
  const blockedByFinalSubmit = hasSubmission;
  const canEdit = isLive && !timeExpired && !blockedByFraud && !blockedByFinalSubmit;
  const monacoLanguage = normalizeMonacoLanguage(room?.challenge?.language);
  const shellLanguageSupported = monacoLanguage === "javascript" || monacoLanguage === "python";

  const triggerFraudBlock = async (reason = "focus-lost") => {
    if (!roomId || fraudReportedRef.current) return;
    fraudReportedRef.current = true;
    setFraudBlocked(true);

    try {
      await reportParticipantBattleFraud(roomId, reason);
    } catch {
      // Local lock stays active even if report request fails.
    }

    Swal.fire({
      icon: "error",
      title: "Fraud detected",
      text: "You left the programming window. Your session is now blocked and your submission is invalid.",
      background: "#1a1a2e",
      color: "#fff",
    });
  };

  const refreshAccess = async (silent = false, options = {}) => {
    const { suppressFraud = false } = options;
    if (!roomId) return;
    if (!silent) setLoading(true);
    try {
      const { data } = await getParticipantBattleRoomAccess(roomId);
      setRoom(data?.room || null);
      setResultsShared(Boolean(data?.room?.resultsShared));
      setSharedRanking(Array.isArray(data?.room?.sharedRanking) ? data.room.sharedRanking : []);
      if (data?.room?.mySubmission?.fraudDetected && !suppressFraud) {
        setFraudBlocked(true);
        fraudReportedRef.current = true;
      }
      if (["submitted", "evaluated"].includes(String(data?.room?.mySubmission?.status || ""))) {
        setFinalSubmitted(true);
      }
      if (!code && data?.room?.challenge?.starterCode) {
        setCode(String(data.room.challenge.starterCode));
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Room unavailable",
        text: error?.response?.data?.message || "Cannot access this battle room.",
        background: "#1a1a2e",
        color: "#fff",
      });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    refreshAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!roomId || !waitingStart) return undefined;
    const timer = setInterval(() => {
      refreshAccess(true);
    }, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, waitingStart]);

  useEffect(() => {
    if (!rankingLoading) return undefined;
    const timer = setInterval(() => {
      refreshAccess(true, { suppressFraud: true });
    }, 3000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankingLoading, roomId]);

  useEffect(() => {
    if (!isLive || isEnded || timeExpired || hasSubmission || blockedByFraud) return undefined;

    const onVisibilityChange = () => {
      if (document.hidden) {
        triggerFraudBlock("tab-hidden");
      }
    };
    const onWindowBlur = () => {
      triggerFraudBlock("window-blur");
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onWindowBlur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, isEnded, timeExpired, blockedByFraud, hasSubmission, roomId]);

  const remainingText = formatRemaining(remainingMs);

  const handleSubmit = async () => {
    if (blockedByFraud) {
      Swal.fire({
        icon: "error",
        title: "Submission blocked",
        text: "This session is marked as fraud. You cannot submit code.",
        background: "#1a1a2e",
        color: "#fff",
      });
      return;
    }
    if (blockedByFinalSubmit) {
      Swal.fire({
        icon: "info",
        title: "Final submission already sent",
        text: "Your final answer has been submitted. Editing and re-submission are disabled.",
        background: "#1a1a2e",
        color: "#fff",
      });
      return;
    }

    setSaving(true);
    try {
      const { data } = await submitParticipantBattleCode(roomId, code);
      setRankingLoading(true);
      setFinalSubmitted(true);
      setRoom((prev) => ({
        ...(prev || {}),
        mySubmission: data?.submission || prev?.mySubmission || null,
      }));
      const { xp } = data;
      const currentPoints = xp?.points || 0;
      const progress = (currentPoints % 500) / 5;

      Swal.fire({
        icon: "success",
        title: "Code submitted",
        html: `
          <div class="mb-4 text-xs opacity-80">
            Final submission recorded. Editing is now locked.
          </div>
          ${xp ? `
          <div class="mt-4 p-4 bg-blue-900/40 rounded-2xl border border-blue-500/20 text-left">
              <div class="flex justify-between items-center mb-2">
                   <div class="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Level ${xp.level}</div>
                   <div class="text-[10px] text-emerald-400 font-bold">+${xp.gainedXP} XP</div>
              </div>
              <div class="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div class="h-full bg-blue-500 shadow-[0_0_8px_rgba(37,99,235,0.5)] transition-all duration-1000" style="width: ${progress}%"></div>
              </div>
              <div class="text-[9px] text-slate-500 mt-1 text-right">${currentPoints % 500}/500 to next level</div>
              ${xp.levelUp ? `<div class="text-xs text-yellow-400 font-bold mt-2 animate-bounce text-center">LEVEL UP! 🎊</div>` : ''}
              ${xp.newBadges?.length > 0 ? `
                  <div class="mt-2 flex flex-wrap gap-1 justify-center">
                      ${xp.newBadges.map(b => `<span class="bg-amber-500/20 text-amber-500 text-[8px] px-2 py-0.5 rounded border border-amber-500/30">🏆 ${b.label}</span>`).join('')}
                  </div>
              ` : ''}
          </div>
          ` : ''}
        `,
        background: "#1a1a2e",
        color: "#fff",
      });
      await refreshAccess(true, { suppressFraud: true });
    } catch (error) {
      setRankingLoading(false);
      Swal.fire({
        icon: "error",
        title: "Submission failed",
        text: error?.response?.data?.message || "Could not submit your code.",
        background: "#1a1a2e",
        color: "#fff",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRunShell = async () => {
    if (!canEdit && !isEnded) {
      Swal.fire({
        icon: "info",
        title: "Execution unavailable",
        text: "Code execution is only available while the challenge is active and editable.",
        background: "#1a1a2e",
        color: "#fff",
      });
      return;
    }

    if (!code.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Code required",
        text: "Write your code before running the shell.",
        background: "#1a1a2e",
        color: "#fff",
      });
      return;
    }

    if (!shellLanguageSupported) {
      setShellRun({
        total: 0,
        passed: 0,
        failed: 0,
        executionTimeMs: null,
        results: [],
        error: "Shell currently accepts only JavaScript or Python.",
      });
      return;
    }

    setRunningShell(true);
    try {
      const { data } = await runParticipantBattleCode(roomId, code);
      const tests = data?.analysis?.tests || {};
      const rawResults = Array.isArray(tests.results) ? tests.results : [];
      const normalizedResults = rawResults.map((item, index) => ({
        name: String(item?.name || `Test ${index + 1}`),
        expected: true,
        actual: Boolean(item?.passed),
        passed: Boolean(item?.passed),
        error: item?.error || null,
      }));

      setShellRun({
        total: Number(tests.total ?? normalizedResults.length),
        passed: Number(tests.passed ?? normalizedResults.filter((r) => r.passed).length),
        failed: Number(tests.failed ?? normalizedResults.filter((r) => !r.passed).length),
        executionTimeMs: tests.executionTimeMs != null ? Number(tests.executionTimeMs) : null,
        results: normalizedResults,
        error: null,
      });
    } catch (error) {
      setShellRun({
        total: 0,
        passed: 0,
        failed: 0,
        executionTimeMs: null,
        results: [],
        error: error?.response?.data?.message || "Code execution failed.",
      });
    } finally {
      setRunningShell(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center">Loading programmer platform...</div>;
  }

  if (!room) {
    return <div className="min-h-screen bg-slate-950 text-red-300 flex items-center justify-center">Battle room not found.</div>;
  }

  if (rankingLoading && !resultsShared) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
        <div className="max-w-xl text-center space-y-3">
          <p className="text-xs uppercase tracking-[0.25em] text-amber-300">Ranking loading</p>
          <h1 className="text-4xl md:text-5xl font-bold mt-2">Submission received</h1>
          <p className="text-slate-300/90 mt-2 text-lg">
            Your code has been submitted successfully. The ranking is being updated right now.
          </p>
          <p className="text-slate-400 text-sm">
            Please wait while the recruiter decides whether to share the result.
          </p>
        </div>
      </div>
    );
  }

  if (rankingLoading && resultsShared) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="rounded-xl border border-emerald-700/30 bg-emerald-900/10 p-5 text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">Results shared</p>
            <h1 className="text-3xl md:text-4xl font-bold mt-2">Ranking published</h1>
            <p className="text-slate-300/90 mt-2 text-base md:text-lg">
              The recruiter shared the ranking list.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-slate-200 font-semibold">Shared visitor ranking</p>
              <span className="text-xs text-slate-400">{sharedRanking.length} ranked visitor(s)</span>
            </div>

            {sharedRanking.length === 0 ? (
              <p className="text-slate-400 text-sm">No ranked submissions yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-left text-slate-400">
                      <th className="pb-2 pr-4">Rank</th>
                      <th className="pb-2 pr-4">Visitor</th>
                      <th className="pb-2 pr-4">Final score</th>
                      <th className="pb-2 pr-4">Correctness</th>
                      <th className="pb-2 pr-4">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sharedRanking.map((item, index) => (
                      <tr
                        key={`${item.participantId || item.email || item.name || "visitor"}-${index}`}
                        className={`border-b border-slate-800/70 ${item.isCurrentUser ? "bg-emerald-900/20" : ""}`}
                      >
                        <td className="py-2 pr-4 text-slate-200 font-semibold">#{item.rank}</td>
                        <td className="py-2 pr-4 text-slate-200">
                          {item.name}
                          {item.isCurrentUser ? <span className="ml-2 text-[11px] text-emerald-300">(You)</span> : null}
                        </td>
                        <td className="py-2 pr-4 text-slate-300">{item.score}/100</td>
                        <td className="py-2 pr-4 text-slate-300">{item.correctnessScore}/100</td>
                        <td className="py-2 pr-4 text-slate-400">{item.executionTimeMs != null ? `${item.executionTimeMs} ms` : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (blockedByFraud) {
    return (
      <div className="min-h-screen bg-black text-red-400 flex items-center justify-center px-6">
        <div className="max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-red-600">Fraud Detection</p>
          <h1 className="text-4xl md:text-5xl font-bold mt-4">Session Blocked</h1>
          <p className="text-red-300/90 mt-4 text-lg">
            Fraud was detected because you left the programming window during the challenge.
          </p>
          <p className="text-red-500/90 mt-2 text-sm">
            Your submission is invalid and has been reported to the recruiter.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs uppercase tracking-widest text-amber-300">Visitor Programmer Platform</p>
          <h1 className="text-2xl font-semibold mt-1">{room.title}</h1>
          <p className="text-slate-400 text-sm mt-1">Challenge: {room.challenge?.title || "Coding Challenge"}</p>
          <p className="text-slate-500 text-xs mt-1">Language: <span className="text-slate-300">{room.challenge?.language || "javascript"}</span></p>
          <p className="text-slate-500 text-xs mt-1">Recruiter: {room.recruiter?.username || room.recruiter?.nickname || "Unknown"}</p>
          {room.challenge?.statementAttachment?.url && (
            <a
              href={`http://localhost:5000${room.challenge.statementAttachment.url}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-3 text-sm text-blue-300 hover:text-blue-200"
            >
              Download statement: {room.challenge.statementAttachment.originalName || "Attached file"}
            </a>
          )}
        </div>

        {waitingStart && (
          <div className="rounded-xl border border-amber-700/40 bg-amber-900/10 p-5">
            <h2 className="text-amber-300 font-semibold">Waiting for recruiter start</h2>
            <p className="text-slate-300 text-sm mt-1">
              The challenge has not started yet. This page refreshes automatically every 5 seconds.
            </p>
          </div>
        )}

        {isEnded && (
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
            <h2 className="text-slate-300 font-semibold">Challenge ended</h2>
            <p className="text-slate-400 text-sm mt-1">The recruiter has ended this battle room. You can still view your code below.</p>
          </div>
        )}

        {timeExpired && !isEnded && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/20 p-5">
            <h2 className="text-red-300 font-semibold">Time expired</h2>
            <p className="text-red-200/80 text-sm mt-1">The countdown reached zero. Editing is locked until the recruiter ends the room.</p>
          </div>
        )}

        {blockedByFinalSubmit && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-5">
            <h2 className="text-emerald-300 font-semibold">Final submission received</h2>
            <p className="text-emerald-200/90 text-sm mt-1">
              Your final answer was submitted successfully. Coding is now disabled for this challenge.
            </p>
          </div>
        )}

        {(isLive || isEnded) && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-4">
                <h3 className="font-medium text-slate-100">Enonce</h3>
                <p className="text-slate-400 text-sm mt-2">{room.challenge?.title || "Coding Challenge"}</p>
                <p className="text-slate-500 text-sm mt-2 whitespace-pre-wrap">
                  {room.challenge?.description || "No challenge description provided."}
                </p>

                <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Uploaded file</p>
                  {room.challenge?.statementAttachment?.url ? (
                    <div className="mt-2">
                      <p className="text-slate-200 text-sm">
                        {room.challenge.statementAttachment.originalName || "Attached file"}
                      </p>
                      <a
                        href={`http://localhost:5000${room.challenge.statementAttachment.url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block mt-2 text-sm text-blue-300 hover:text-blue-200"
                      >
                        Open uploaded statement
                      </a>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm mt-2">No file uploaded for this challenge.</p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Code</h3>
                  {isLive && (
                    <span className={`text-sm ${remainingMs != null && remainingMs <= 5 * 60 * 1000 ? "text-red-300 font-semibold" : "text-emerald-300"}`}>
                      Time remaining: {remainingText || "--:--"}
                    </span>
                  )}
                </div>
                <div className="overflow-hidden rounded-lg border border-slate-700">
                  <Editor
                    height="420px"
                    language={monacoLanguage}
                    theme="vs-dark"
                    value={code}
                    onChange={(value) => setCode(value ?? "")}
                    options={{
                      fontSize: 14,
                      minimap: { enabled: false },
                      wordWrap: "on",
                      scrollBeyondLastLine: false,
                      readOnly: isEnded || timeExpired || blockedByFraud || blockedByFinalSubmit,
                      automaticLayout: true,
                    }}
                  />
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleRunShell}
                    disabled={runningShell || (!canEdit && !isEnded) || !shellLanguageSupported}
                    className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
                  >
                    {runningShell ? "Running..." : "Run code (JS/Python)"}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!canEdit || saving}
                    className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
                  >
                    {saving ? "Submitting..." : "Submit code"}
                  </button>
                  <button
                    onClick={() => refreshAccess(true)}
                    className="px-5 py-2.5 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800"
                  >
                    Refresh status
                  </button>
                </div>

                {shellRun && (
                  <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Shell Result (comparison with backend exercise tests)</p>
                    {shellRun.error ? (
                      <p className="text-red-300 text-sm mt-2">{shellRun.error}</p>
                    ) : (
                      <>
                        <p className="text-slate-200 text-sm mt-2">
                          Passed {shellRun.passed}/{shellRun.total} tests
                          {typeof shellRun.executionTimeMs === "number" ? ` in ${shellRun.executionTimeMs} ms` : ""}
                        </p>
                        <div className="mt-2 space-y-2 max-h-44 overflow-y-auto pr-1">
                          {shellRun.results.map((item, index) => (
                            <div key={`${item.name}-${index}`} className="rounded border border-slate-700 bg-slate-950/50 p-2 text-xs">
                              <p className="text-slate-200 font-medium">{item.name}</p>
                              <p className="text-slate-400 mt-1">
                                Expected: <span className="text-slate-200">{String(item.expected)}</span>
                                {" · "}
                                Actual: <span className={item.passed ? "text-emerald-300" : "text-red-300"}>{item.actual == null ? "error" : String(item.actual)}</span>
                                {" · "}
                                Status: <span className={item.passed ? "text-emerald-300" : "text-red-300"}>{item.passed ? "PASS" : "FAIL"}</span>
                              </p>
                              {item.error && <p className="text-red-300 mt-1">{item.error}</p>}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
