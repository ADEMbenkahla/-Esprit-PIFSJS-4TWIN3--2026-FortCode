import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import Swal from "sweetalert2";
import {
  getParticipantBattleRoomAccess,
  reportParticipantBattleFraud,
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
  const [now, setNow] = useState(Date.now());
  const [fraudBlocked, setFraudBlocked] = useState(false);
  const [finalSubmitted, setFinalSubmitted] = useState(false);
  const fraudReportedRef = useRef(false);

  const isLive = room?.status === "live";
  const isEnded = room?.status === "ended";
  const waitingStart = room?.status === "draft" || room?.status === "scheduled";
  const remainingMs = useMemo(() => getRemainingMs(room?.startedAt, room?.timeLimitMinutes, now), [room?.startedAt, room?.timeLimitMinutes, now]);
  const timeExpired = isLive && remainingMs === 0;
  const blockedByFraud = fraudBlocked || room?.mySubmission?.fraudDetected;
  const blockedByFinalSubmit = finalSubmitted || ["submitted", "evaluated"].includes(String(room?.mySubmission?.status || ""));
  const canEdit = isLive && !timeExpired && !blockedByFraud && !blockedByFinalSubmit;
  const monacoLanguage = normalizeMonacoLanguage(room?.challenge?.language);

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

  const refreshAccess = async (silent = false) => {
    if (!roomId) return;
    if (!silent) setLoading(true);
    try {
      const { data } = await getParticipantBattleRoomAccess(roomId);
      setRoom(data?.room || null);
      if (data?.room?.mySubmission?.fraudDetected) {
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
    if (!isLive || isEnded || timeExpired || blockedByFraud) return undefined;

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
  }, [isLive, isEnded, timeExpired, blockedByFraud, roomId]);

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
      setFinalSubmitted(true);
      setRoom((prev) => ({
        ...(prev || {}),
        mySubmission: data?.submission || prev?.mySubmission || null,
      }));
      Swal.fire({
        icon: "success",
        title: "Code submitted",
        text: "Final submission recorded. Editing is now locked.",
        background: "#1a1a2e",
        color: "#fff",
      });
    } catch (error) {
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

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center">Loading programmer platform...</div>;
  }

  if (!room) {
    return <div className="min-h-screen bg-slate-950 text-red-300 flex items-center justify-center">Battle room not found.</div>;
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
