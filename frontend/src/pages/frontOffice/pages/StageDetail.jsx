import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Circle, Loader2, Lock } from "lucide-react";
import { stagesApi } from "../../../services/api";

const diffBadge = (d) => {
  const x = (d || "").toLowerCase();
  const cls =
    x === "easy"
      ? "bg-emerald-500/15 text-emerald-300"
      : x === "medium"
        ? "bg-amber-500/15 text-amber-300"
        : x === "hard"
          ? "bg-orange-500/15 text-orange-300"
          : "bg-rose-500/15 text-rose-300";
  return <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${cls}`}>{d}</span>;
};

export default function StageDetail() {
  const { stageId } = useParams();
  const navigate = useNavigate();
  const [stage, setStage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await stagesApi.get(stageId);
        if (!cancelled) setStage(data);
      } catch (e) {
        const msg = e.response?.data?.message || e.message;
        const code = e.response?.data?.code;
        if (!cancelled) setError({ msg, code, prerequisiteTitle: e.response?.data?.prerequisiteTitle });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stageId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-200 p-8">
        {error.code === "STAGE_LOCKED" && <Lock className="w-12 h-12 text-amber-500 mb-4" />}
        <p className="text-lg font-semibold text-center max-w-md">{error.msg}</p>
        {error.prerequisiteTitle && (
          <p className="text-slate-400 mt-2 text-sm">Prerequisite: {error.prerequisiteTitle}</p>
        )}
        <button
          type="button"
          onClick={() => navigate("/training")}
          className="mt-6 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700"
        >
          Back to stages
        </button>
      </div>
    );
  }

  if (!stage) return null;

  const challenges = stage.challenges || [];
  const pct = stage.progress?.progressPercent ?? 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pt-20 pb-12 px-6 max-w-4xl mx-auto">
      <button
        type="button"
        onClick={() => navigate("/training")}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Learning path
      </button>

      <header className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">{stage.title}</h1>
        <p className="text-slate-400 mb-4">{stage.description}</p>
        <div className="flex items-center gap-4">
          {diffBadge(stage.difficulty)}
          <div className="flex-1 max-w-xs">
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <span className="text-xs font-mono text-blue-400">{pct}%</span>
        </div>
      </header>

      <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Challenges</h2>
      <ul className="space-y-3">
        {challenges.map((c) => (
          <li key={c._id}>
            <Link
              to={`/training/${stageId}/challenge/${c._id}`}
              className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-blue-500/40 hover:bg-slate-900/60 transition-all"
            >
              <div className="flex items-center gap-3">
                {c.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-600 shrink-0" />
                )}
                <div>
                  <p className="font-semibold text-slate-100">{c.title}</p>
                  <p className="text-xs text-slate-500 line-clamp-1">{c.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {diffBadge(c.difficulty)}
                <span className="text-[10px] font-mono text-slate-500">{c.language}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
