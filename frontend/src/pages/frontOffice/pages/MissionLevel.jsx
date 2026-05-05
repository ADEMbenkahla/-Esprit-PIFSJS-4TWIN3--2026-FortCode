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
    const [submissionResult, setSubmissionResult] = useState(null);
    const [showReport, setShowReport] = useState(false);
    const [activeReportTab, setActiveReportTab] = useState("overview");
    const [canSubmit, setCanSubmit] = useState(false);

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
                setCode(found.savedReport?.code || found.starterCode || "");
                if (found.savedReport) {
                    setSubmissionResult(found.savedReport);
                } else {
                    setSubmissionResult(null);
                }
                setOutput("");
                setCanSubmit(false);
            }
        }
    }, [challengeId, mission?.challenges]);

    useEffect(() => {
        setCanSubmit(false);
    }, [code, selectedChallenge?._id]);

    const runCode = async () => {
        if (isRunning || !selectedChallenge?._id) return;
        setIsRunning(true);
        setOutput("Running mission tests on server...");
        setCanSubmit(false);

        try {
            const { data } = await missionsApi.run(missionId, selectedChallenge._id, code);
            if (data.passed) {
                setOutput(`✓ All tests passed successfully!\n\n${data.outputSnapshot || ""}`);
                setCanSubmit(true);
            } else {
                const errors = (data.testResults || [])
                    .filter((r) => !r.passed)
                    .map((r) => `❌ ${r.name}: ${r.error}`)
                    .join("\n");
                setOutput(`${errors || "❌ Tests failed."}\n\n${data.outputSnapshot || ""}`);
                setCanSubmit(false);
            }
        } catch (err) {
            console.error("Run mission tests error:", err);
            const msg = err.response?.data?.message || err.message;
            setOutput(`⚠️ System Error: ${msg}`);
            setCanSubmit(false);
        } finally {
            setIsRunning(false);
        }
    };

    const submitSolution = async () => {
        if (isUpdating) return;
        setIsUpdating(true);
        setOutput("Transmitting tactical solution...");

        try {
            const { data } = await missionsApi.submit(missionId, selectedChallenge._id, code);
            // Success (200): tests passed
            setOutput("✓ Target neutralized. Verification successful.");
            setCompleted(data.progress?.completedChallenges || []);
            setSubmissionResult(data.report);
            setShowReport(true);
            setCanSubmit(false);
            fetchMissionData();

            const xp = data?.xpResult || null;
            const fallbackGainedXP = Number(data?.report?.xpAwarded || 0);
            await Swal.fire({
                icon: 'success',
                title: data.stageCompleted ? 'Mission Completed!' : 'Challenge Completed',
                html: `
                  <div class="mb-4 text-xs opacity-80">
                    ${data.stageCompleted
                        ? "Mission complete. The next stage is now available on the map."
                        : "Challenge validated successfully."
                    }
                  </div>
                  <div id="mission-xp-container"></div>
                `,
                background: '#1a1a2e',
                color: '#fff',
                timer: data.stageCompleted ? undefined : 3500,
                showConfirmButton: !!data.stageCompleted,
                confirmButtonText: data.stageCompleted ? 'Back to Map' : undefined,
                didOpen: () => {
                    setTimeout(() => {
                        const container = document.getElementById('mission-xp-container');
                        if (!container) return;
                        const points = Number(xp?.points || 0);
                        const gainedXP = Number(xp?.gainedXP || fallbackGainedXP || 0);
                        const level = Number(xp?.level || 1);
                        const progress = xp?.points
                            ? Math.max(0, Math.min(100, (points % 500) / 5))
                            : Math.max(5, Math.min(100, gainedXP));
                        container.innerHTML = `
                          <div class="mt-4 p-4 bg-blue-900/40 rounded-2xl border border-blue-500/20">
                            <div class="flex justify-between items-center mb-2">
                              <div class="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Level ${level}</div>
                              <div class="text-[10px] text-emerald-400 font-bold">+${gainedXP} XP</div>
                            </div>
                            <div class="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                              <div id="mission-xp-bar" class="h-full bg-blue-500 shadow-[0_0_8px_rgba(37,99,235,0.5)] transition-all duration-1000 ease-out" style="width: 0%"></div>
                            </div>
                            <div class="text-[9px] text-slate-500 mt-1 text-right">${xp?.points ? `${points % 500}/500 to next level` : "XP updated"}</div>
                            ${xp?.levelUp ? `<div class="text-xs text-yellow-400 font-bold mt-2 animate-bounce">LEVEL UP! 🎊</div>` : ''}
                          </div>
                        `;
                        setTimeout(() => {
                            const bar = document.getElementById('mission-xp-bar');
                            if (bar) bar.style.width = `${progress}%`;
                        }, 100);
                    }, 80);
                }
            });

            if (data.stageCompleted) {
                setShowReport(false);
                navigate('/map');
            }
        } catch (err) {
            console.error("Submit error:", err);
            const responseData = err.response?.data;

            // The backend now returns 400 when tests fail (with report inside)
            if (responseData?.report) {
                setSubmissionResult(responseData.report);
                setShowReport(true);
            }

            // Update completed list even on failure (progress might have changed)
            if (responseData?.progress?.completedChallenges) {
                setCompleted(responseData.progress.completedChallenges);
            }

            if (responseData?.passed === false) {
                setOutput("❌ Tests did not pass. Check the Mission Report for details.");
            } else {
                const msg = responseData?.message || "Tactical error detected.";
                setOutput(`❌ Error: ${msg}`);
            }
            setCanSubmit(false);
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
                    {(submissionResult || selectedChallenge?.savedReport) && (
                        <button
                            onClick={() => setShowReport(true)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-slate-700"
                        >
                            <Zap size={18} className="text-amber-400" />
                            View Intelligence
                        </button>
                    )}
                    <button
                        onClick={runCode}
                        disabled={isRunning || isUpdating}
                        className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-slate-700 disabled:opacity-50"
                    >
                        {isRunning ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
                        Run Tests
                    </button>
                    <button
                        onClick={submitSolution}
                        disabled={isUpdating || isRunning || !canSubmit}
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
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-3">
                                            {completed.some(comp => String(comp.challengeId || comp) === String(c._id)) ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Circle size={16} className="text-slate-700" />}
                                            <span className="text-xs font-bold">{c.title}</span>
                                        </div>
                                        {completed.some(comp => String(comp.challengeId || comp) === String(c._id)) && (
                                            <div className="flex gap-0.5 ml-7">
                                                {[...Array(3)].map((_, i) => (
                                                    <Star key={i} size={10} className={`${i < (c.stars || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-800'}`} />
                                                ))}
                                            </div>
                                        )}
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

            {showReport && submissionResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
                    <div className="max-w-4xl w-full bg-slate-900 border border-blue-900/40 rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(37,99,235,0.2)] flex flex-col md:flex-row max-h-[90vh]">
                        <div className="w-full md:w-1/3 p-8 border-r border-blue-500/10 bg-slate-900/50 flex flex-col">
                            <div className="mb-8">
                                <p className="text-[10px] font-black tracking-[0.4em] text-blue-500 uppercase mb-3 italic">Combat Analysis</p>
                                <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">Mission Report</h2>
                            </div>

                            <div className="flex flex-col gap-2 mb-8">
                                {["overview", "bugs", "resources"].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveReportTab(tab)}
                                        className={`px-5 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-left transition-all border ${activeReportTab === tab
                                            ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_30px_rgba(37,99,235,0.4)] translate-x-2'
                                            : 'bg-slate-800/80 border-slate-700 text-slate-500 hover:text-slate-300'
                                            }`}
                                    >
                                        {tab === 'bugs' && (submissionResult.fullAiAnalysis?.bugs?.length > 0) && (
                                            <span className="float-right bg-rose-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] animate-pulse">
                                                {submissionResult.fullAiAnalysis.bugs.length}
                                            </span>
                                        )}
                                        {tab === 'overview' ? 'SITREP' : tab}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 flex flex-col justify-end">
                                <button
                                    onClick={() => setShowReport(false)}
                                    className="w-full py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border border-slate-700"
                                >
                                    Acknowledge
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 p-10 overflow-y-auto bg-slate-950/40 flex flex-col">
                            {activeReportTab === "overview" && (
                                <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-2">
                                            <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Tactical Status</h3>
                                            <div className={`inline-flex items-center gap-3 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${(submissionResult.passed || completed.some(c => String(c.challengeId || c) === String(selectedChallenge?._id))) ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                                                <div className={`w-2 h-2 rounded-full ${(submissionResult.passed || completed.some(c => String(c.challengeId || c) === String(selectedChallenge?._id))) ? 'bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'}`} />
                                                {(submissionResult.passed || completed.some(c => String(c.challengeId || c) === String(selectedChallenge?._id))) ? 'Optimal Execution' : 'Logic Compromised'}
                                            </div>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Merit Points</h3>
                                            <p className="text-4xl font-black text-blue-400 italic">+{submissionResult.xpAwarded || selectedChallenge?.xpReward || 0}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="flex flex-col items-center justify-center p-8 bg-slate-900/80 rounded-3xl border border-blue-900/20 shadow-inner">
                                            <div className="relative mb-6">
                                                <svg className="w-32 h-32 transform -rotate-90">
                                                    <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
                                                    <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent"
                                                        strokeDasharray={Math.PI * 120}
                                                        strokeDashoffset={Math.PI * 120 * (1 - (submissionResult.sonar?.qualityScore || 0) / 100)}
                                                        className="text-blue-500 transition-all duration-1000 ease-out"
                                                    />
                                                </svg>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className="text-4xl font-black text-white italic">{submissionResult.sonar?.qualityScore || 0}</span>
                                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Combat Index</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 px-5 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[10px] font-black text-blue-400 tracking-widest">
                                                <Play size={12} fill="currentColor" />
                                                {submissionResult.executionTimeMs || 0}MS RESPONSE
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3">
                                            <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800 flex justify-between items-center group hover:border-blue-500/20 transition-all">
                                                <span className="text-[10px] font-black text-slate-500 uppercase">Latency</span>
                                                <span className="text-sm font-black text-white italic">{submissionResult.executionTimeMs || 0}ms</span>
                                            </div>
                                            <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800 flex justify-between items-center group hover:border-emerald-500/20 transition-all">
                                                <span className="text-[10px] font-black text-slate-500 uppercase">Reliability</span>
                                                <span className="text-sm font-black text-emerald-400 italic">GRADE A</span>
                                            </div>
                                            <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800 flex justify-between items-center group hover:border-blue-500/20 transition-all">
                                                <span className="text-[10px] font-black text-slate-500 uppercase">Complexity</span>
                                                <span className="text-sm font-black text-blue-400 italic">NOMINAL</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Tactical Briefing</h3>
                                        <div className="p-6 bg-blue-500/5 border-l-4 border-blue-500 rounded-r-2xl text-sm text-slate-300 italic leading-relaxed font-medium">
                                            "{submissionResult.fullAiAnalysis?.bugSummary || "Heuristic scan complete. Tactical performance meets mission parameters."}"
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeReportTab === "bugs" && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                                    <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Vulnerability Assessment</h3>
                                    {submissionResult.fullAiAnalysis?.bugs?.length > 0 ? (
                                        <div className="space-y-4">
                                            {submissionResult.fullAiAnalysis.bugs.map((bug, i) => (
                                                <div key={i} className="p-6 rounded-2xl bg-rose-500/5 border border-rose-500/20 group hover:bg-rose-500/10 transition-all">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className="px-3 py-1 rounded bg-rose-500 text-white text-[9px] font-black uppercase">SECTOR {bug.line}</span>
                                                            <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">{bug.type}</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-base font-black text-rose-100 mb-3 uppercase italic tracking-tight">{bug.message}</p>
                                                    <div className="pl-6 border-l-2 border-rose-500/30 space-y-5">
                                                        <div className="space-y-2">
                                                            <p className="text-[9px] font-black text-rose-500/60 uppercase tracking-widest italic">Intelligence Breakdown</p>
                                                            <p className="text-xs text-slate-400 leading-relaxed font-medium">{bug.explanation}</p>
                                                        </div>
                                                        {bug.suggestion && (
                                                            <div className="space-y-2">
                                                                <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest italic">Tactical Solution</p>
                                                                <pre className="p-4 bg-slate-900 rounded-xl text-[11px] font-mono text-emerald-400 overflow-x-auto border border-emerald-500/10 shadow-inner">
                                                                    {bug.suggestion}
                                                                </pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-20 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl">
                                            <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-6 opacity-20" />
                                            <p className="text-xs font-black text-emerald-500 uppercase tracking-widest">Tactical Purity Maintained</p>
                                            <p className="text-[10px] text-slate-600 mt-2 italic">"No logic anomalies detected in current execution pass."</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeReportTab === "resources" && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                                    <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Strategic Intelligence</h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        {submissionResult.fullAiAnalysis?.recommendations?.length > 0 ? (
                                            submissionResult.fullAiAnalysis.recommendations.map((res, i) => (
                                                <a
                                                    key={i}
                                                    href={res.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="group p-6 bg-slate-900/50 rounded-3xl border border-blue-900/20 hover:border-blue-500/40 transition-all hover:bg-slate-900 relative overflow-hidden"
                                                >
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`px-3 py-1 rounded text-[9px] font-black uppercase ${res.type === 'video' ? 'bg-rose-500/20 text-rose-500' : 'bg-blue-500/20 text-blue-400'}`}>
                                                                {res.type}
                                                            </span>
                                                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{res.difficulty} LEVEL</span>
                                                        </div>
                                                        <Play size={16} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0" />
                                                    </div>
                                                    <h4 className="text-lg font-black text-white mb-3 group-hover:text-blue-400 transition-colors uppercase italic italic tracking-tight">{res.title}</h4>
                                                    <div className="pt-4 border-t border-slate-800/50">
                                                        <p className="text-[9px] font-black text-slate-600 uppercase mb-2 tracking-widest">Tactical Advantage</p>
                                                        <p className="text-xs text-slate-400 leading-relaxed italic">"{res.reason}"</p>
                                                    </div>
                                                </a>
                                            ))
                                        ) : (
                                            <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-3xl text-[10px] font-black text-slate-600 uppercase tracking-widest italic">
                                                Intel channel inactive. Awaiting next tactical success.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
