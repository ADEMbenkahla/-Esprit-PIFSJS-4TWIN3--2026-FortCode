import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Circle, Loader2, Lock, Star } from "lucide-react";
import trainingApi from "../../../services/trainingApi";

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

export default function TrainingList() {
  const navigate = useNavigate();
  const [trainings, setTrainings] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Get stages with category training
        const { data } = await trainingApi.getAll();
        // Filter stages that have category="training" or are training stages
        const trainingStages = Array.isArray(data) ? data.filter(stage => 
          stage.category === 'training' || 
          stage.type === 'training' ||
          stage.title?.toLowerCase().includes('training')
        ) : [];
        
        if (!cancelled) setTrainings(trainingStages);
      } catch (e) {
        const msg = e.response?.data?.message || e.message;
        if (!cancelled) setError({ msg });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
        <p className="text-lg font-semibold text-center max-w-md">{error.msg}</p>
        <button
          type="button"
          onClick={() => navigate("/training")}
          className="mt-6 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700"
        >
          Back to training
        </button>
      </div>
    );
  }

  if (!trainings) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pt-20 pb-12 px-6 max-w-4xl mx-auto">
      <button
        type="button"
        onClick={() => navigate("/training")}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Training Grounds
      </button>

      <header className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Training Exercises</h1>
        <p className="text-slate-400 mb-4">Practice your coding skills with these training exercises</p>
      </header>

      <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Available Exercises</h2>
      <ul className="space-y-3">
        {trainings.map((training) => (
          <li key={training._id}>
            <Link
              to={`/training/${training._id}`}
              className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-blue-500/40 hover:bg-slate-900/60 transition-all"
            >
              <div className="flex items-center gap-3">
                {training.progress?.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-400 shrink-0" />
                )}
                <div>
                  <p className="font-semibold text-slate-100 flex items-center gap-2">
                    {training.title || training.name}
                    {training.progress?.completed && (
                      <div className="flex gap-0.5 ml-2">
                        {[...Array(3)].map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < (training.progress?.stars || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`} />
                        ))}
                      </div>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 line-clamp-1">{training.description || training.subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {diffBadge(training.difficulty)}
                <span className="text-[10px] font-mono text-slate-500">{training.language || 'javascript'}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
