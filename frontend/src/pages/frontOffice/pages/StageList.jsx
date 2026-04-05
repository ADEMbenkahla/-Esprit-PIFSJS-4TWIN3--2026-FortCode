import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, CheckCircle2, Play, Loader2, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { stagesApi } from "../../../services/api";

const difficultyClass = (d) => {
  const x = (d || "").toLowerCase();
  if (x === "easy") return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  if (x === "medium") return "bg-amber-500/20 text-amber-300 border-amber-500/30";
  if (x === "hard") return "bg-orange-500/20 text-orange-300 border-orange-500/30";
  return "bg-rose-500/20 text-rose-300 border-rose-500/30";
};

export default function StageList({ category = "training", title, subtitle }) {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await stagesApi.me({ category });
        if (!cancelled) setStages(data);
      } catch (e) {
        if (!cancelled) {
          const d = e.response?.data;
          setError(d?.detail || d?.message || e.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [category]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 pt-24 space-y-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-serif font-bold text-slate-100 mb-2">{title}</h1>
          <p className="text-slate-400 font-mono">{subtitle}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stages.map((stage, index) => {
          const locked = stage.participantStatus === "locked";
          const completed = stage.participantStatus === "completed";
          const pct = stage.progress?.progressPercent ?? 0;
          const count = stage.challengeCount ?? stage.challenges?.length ?? 0;

          return (
            <motion.div
              key={stage._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
            >
              <div
                className={`relative h-full p-6 rounded-xl border transition-all duration-300 flex flex-col ${
                  locked
                    ? "bg-slate-900/40 border-slate-800 opacity-70"
                    : "bg-slate-900/60 border-slate-700 hover:border-blue-500/40"
                }`}
              >
                {locked && (
                  <div className="absolute top-4 right-4 text-slate-500">
                    <Lock className="w-5 h-5" />
                  </div>
                )}
                {completed && !locked && (
                  <div className="absolute top-4 right-4 text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-slate-500" />
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${difficultyClass(stage.difficulty)}`}
                  >
                    {stage.difficulty}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-slate-100 mb-2">{stage.title}</h2>
                <p className="text-sm text-slate-400 mb-4 line-clamp-3 flex-1">{stage.description}</p>

                {locked && (
                  <p className="text-xs text-amber-400/90 mb-3">
                    Complete prerequisite: <span className="font-semibold">{stage.prerequisiteTitle}</span>
                  </p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-[10px] uppercase text-slate-500 font-bold">
                    <span>Progress</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${completed ? "bg-emerald-500" : "bg-blue-600"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">{count} challenge(s)</p>
                </div>

                {locked ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2 rounded-lg bg-slate-800 text-slate-500 text-sm font-bold uppercase cursor-not-allowed"
                  >
                    Locked
                  </button>
                ) : (
                  <Link
                    to={`/training/${stage._id}`}
                    className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold uppercase transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    {completed ? "Review" : pct > 0 ? "Continue" : "Start"}
                  </Link>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
