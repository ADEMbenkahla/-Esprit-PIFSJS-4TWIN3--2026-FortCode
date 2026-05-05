import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Circle, Loader2, Lock, Star, Shield, Sword, Trophy } from "lucide-react";
import { missionsApi } from "../../../services/api";

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

export default function MissionDetail() {
    const { missionId } = useParams();
    const navigate = useNavigate();
    const [mission, setMission] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data } = await missionsApi.get(missionId);
                if (!cancelled) setMission(data);
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
    }, [missionId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-200 p-8 text-center">
                {error.code === "MISSION_LOCKED" && <Lock className="w-12 h-12 text-amber-500 mb-4" />}
                <p className="text-xl font-bold mb-2">Target Inaccessible</p>
                <p className="text-slate-400 max-w-md mb-6">{error.msg}</p>
                {error.prerequisiteTitle && (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl mb-6">
                        <p className="text-xs text-amber-500 uppercase font-black tracking-widest mb-1">Intelligence Report</p>
                        <p className="text-sm text-slate-300">Requires completion of: <span className="text-white font-bold">{error.prerequisiteTitle}</span></p>
                    </div>
                )}
                <button
                    type="button"
                    onClick={() => navigate("/map")}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold transition-all"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Abort and Return to Map
                </button>
            </div>
        );
    }

    if (!mission) return null;

    const challenges = mission.challenges || [];
    const pct = mission.progress?.progressPercent ?? 0;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 pt-24 pb-12 px-6">
            <div className="max-w-4xl mx-auto">
                <button
                    type="button"
                    onClick={() => navigate("/map")}
                    className="flex items-center gap-2 text-slate-500 hover:text-white mb-8 transition-colors uppercase text-[10px] font-black tracking-[0.2em]"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Strategic Map
                </button>

                <header className="mb-12 relative">
                    <div className="absolute -left-12 top-0 text-blue-500/20 select-none hidden lg:block">
                        <Shield size={120} />
                    </div>
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h1 className="text-4xl font-black text-white italic tracking-tight mb-2 uppercase">
                                Mission: {mission.title}
                            </h1>
                            <p className="text-slate-400 text-lg leading-relaxed max-w-2xl">{mission.description}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 text-right">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Difficulty</span>
                            {diffBadge(mission.difficulty)}
                        </div>
                    </div>

                    <div className="flex items-center gap-6 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
                        <div className="flex-1">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Objective Completion</span>
                                <span className="text-sm font-mono font-bold text-blue-400">{pct}%</span>
                            </div>
                            <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                                <div
                                    className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-700"
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col items-center px-6 border-l border-slate-800">
                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Stars</span>
                            <div className="flex items-center gap-1">
                                <Star size={16} className="text-amber-400 fill-amber-400" />
                                <span className="text-xl font-black text-white">{mission.progress?.totalStars || 0}</span>
                            </div>
                        </div>
                    </div>
                </header>

                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <Sword size={18} className="text-slate-500" />
                        <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em]">Tactical Objectives</h2>
                    </div>

                    <div className="grid gap-4">
                        {challenges.map((c, i) => (
                            <Link
                                key={c._id}
                                to={`/map/mission/${missionId}/challenge/${c._id}`}
                                className="group flex items-center justify-between p-5 rounded-2xl border border-slate-800 bg-slate-900/30 hover:border-blue-500/40 hover:bg-slate-900/60 transition-all duration-300 transform hover:-translate-y-1"
                            >
                                <div className="flex items-center gap-5">
                                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-colors ${c.completed
                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                            : 'bg-slate-800/50 border-slate-700 text-slate-500 group-hover:border-blue-500/30 group-hover:text-blue-400'
                                        }`}>
                                        {c.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-slate-100 flex items-center gap-3 mb-1">
                                            {c.title}
                                            {c.completed && (
                                                <div className="flex gap-0.5">
                                                    {[...Array(3)].map((_, i) => (
                                                        <Star key={i} className={`w-3 h-3 ${i < (c.stars || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-800'}`} />
                                                    ))}
                                                </div>
                                            )}
                                        </h3>
                                        <p className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors uppercase tracking-widest font-bold">
                                            Objective {i + 1} • {c.language}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {diffBadge(c.difficulty)}
                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                        <Sword size={16} />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                {pct === 100 && (
                    <div className="mt-12 p-8 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-center animate-in zoom-in duration-500">
                        <Trophy size={48} className="text-amber-400 mx-auto mb-4 animate-bounce" />
                        <h3 className="text-2xl font-black text-white italic uppercase mb-2">Area Secured</h3>
                        <p className="text-slate-400 mb-6">Mission objectives completely neutralized. Tactical supremacy achieved.</p>
                        <button
                            onClick={() => navigate("/map")}
                            className="px-8 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs tracking-widest transition-all"
                        >
                            Return to Strategic Map
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
