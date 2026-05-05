import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, Loader2, Play, Save, Zap, Star, Shield, Sword, Target } from 'lucide-react';
import { missionsApi } from '../../../services/api';
import Swal from 'sweetalert2';
import './TrainingLevel.css';

export const MissionLevel = () => {
    const { missionId, challengeId } = useParams();
    const navigate = useNavigate();
    const [mission, setMission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [completed, setCompleted] = useState([]);
    const [selectedChallenge, setSelectedChallenge] = useState(null);
    const [code, setCode] = useState("");
    const [output, setOutput] = useState("");
    const [isRunning, setIsRunning] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchMissionData = async () => {
        try {
            setLoading(true);
            const { data } = await missionsApi.get(missionId);
            setMission(data);
            setCompleted(data.progress?.completedChallenges || []);

            if (data.challenges && data.challenges.length > 0) {
                let initialChallenge = data.challenges[0];
                if (challengeId) {
                    const found = data.challenges.find(c => String(c?._id) === String(challengeId));
                    if (found) initialChallenge = found;
                }
                setSelectedChallenge(initialChallenge);
                setCode(initialChallenge.starterCode || "");
            }
        } catch (err) {
            console.error("Error fetching mission:", err);
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMissionData();
    }, [missionId]);

    useEffect(() => {
        if (mission?.challenges && challengeId) {
            const found = mission.challenges.find(c => String(c?._id) === String(challengeId));
            if (found && String(found._id) !== String(selectedChallenge?._id)) {
                setSelectedChallenge(found);
                setCode(found.starterCode || "");
                setOutput("");
            }
        }
    }, [challengeId, mission?.challenges]);

    const submitSolution = async () => {
        if (isUpdating) return;
        setIsUpdating(true);
        setOutput("Transmitting tactical solution...");

        try {
            const { data } = await missionsApi.submit(missionId, selectedChallenge._id, code);
            setOutput("✓ Target neutralized. Verification successful.");

            Swal.fire({
                icon: 'success',
                title: 'Objective Complete',
                text: 'Tactical solution verified and uploaded.',
                background: '#0f172a',
                color: '#fff',
                confirmButtonColor: '#3b82f6'
            }).then(() => {
                fetchMissionData();
                if (data.stageCompleted) {
                    navigate(`/map/mission/${missionId}`);
                }
            });
        } catch (err) {
            console.error("Submit error:", err);
            const msg = err.response?.data?.message || "Tactical error detected.";
            setOutput(`❌ Error: ${msg}`);
            Swal.fire({
                icon: 'error',
                title: 'Mission Compromised',
                text: 'Logic failure in tactical execution.',
                background: '#0f172a',
                color: '#fff'
            });
        } finally {
            setIsUpdating(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-blue-500"><Loader2 className="animate-spin w-12 h-12" /></div>;
    if (error || !mission) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-rose-500 font-black">MISSION_ERROR: {error || "NOT_FOUND"}</div>;

    return (
        <div className="min-h-screen flex flex-col bg-slate-950 text-slate-200">
            <header className="px-6 py-4 border-b border-blue-900/40 flex items-center justify-between bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-6">
                    <button onClick={() => navigate(`/map/mission/${missionId}`)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-500 hover:text-white border border-transparent hover:border-slate-700">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <Shield size={16} className="text-blue-500" />
                            <h1 className="font-black text-xl text-white uppercase italic tracking-tight">{mission.title}</h1>
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sector Level {mission.level}</span>
                            <div className="h-1.5 w-32 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                                <div className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" style={{ width: `${mission.progress?.progressPercent || 0}%` }} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={submitSolution}
                        disabled={isUpdating}
                        className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] disabled:opacity-50"
                    >
                        <Target size={18} />
                        Execute Solution
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <div className="w-80 border-r border-blue-900/20 flex flex-col bg-slate-900/30">
                    <div className="p-6">
                        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6">Tactical Objectives</h2>
                        <div className="space-y-2">
                            {mission.challenges?.map((c) => (
                                <div
                                    key={c._id}
                                    onClick={() => navigate(`/map/mission/${missionId}/challenge/${c._id}`)}
                                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${String(selectedChallenge?._id) === String(c._id)
                                            ? 'bg-blue-500/10 border-blue-500/40 text-blue-200'
                                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-600'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        {completed.some(comp => String(comp.challengeId || comp) === String(c._id)) ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Circle size={16} className="text-slate-700" />}
                                        <span className="text-xs font-bold">{c.title}</span>
                                    </div>
                                    <Sword size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto border-t border-blue-900/10">
                        {selectedChallenge && (
                            <>
                                <h3 className="text-xl font-black text-white uppercase italic mb-4">{selectedChallenge.title}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed mb-6 font-medium">
                                    {selectedChallenge.description}
                                </p>
                                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Difficulty Parameter</span>
                                    <span className="text-xs font-bold text-blue-400 uppercase">{selectedChallenge.difficulty}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex-1 flex flex-col bg-slate-950 relative">
                    <div className="px-6 py-3 bg-slate-900/40 border-b border-blue-900/20 flex justify-between items-center relative z-20">
                        <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black text-slate-500 tracking-widest uppercase italic">Solution.sys • {selectedChallenge?.language}</span>
                        </div>
                    </div>
                    <div className="flex-1 relative z-20">
                        <textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full h-full p-8 bg-transparent outline-none resize-none leading-relaxed text-blue-100 font-mono text-sm selection:bg-blue-500/30"
                            spellCheck={false}
                            placeholder="// Entering tactical interface..."
                        />
                    </div>
                    <div className="h-64 border-t border-blue-900/40 bg-slate-900/60 relative z-20 flex flex-col">
                        <div className="px-6 py-2 bg-slate-900 border-b border-blue-900/20 flex justify-between items-center text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Deployment Log</div>
                        <div className="flex-1 p-6 font-mono text-[11px] overflow-y-auto">
                            {output ? (
                                <div className={output.includes("✓") ? 'text-emerald-400' : 'text-rose-400'}>
                                    <pre className="whitespace-pre-wrap">{output}</pre>
                                </div>
                            ) : (
                                <div className="text-slate-700 italic">SYSTEM_READY...</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
