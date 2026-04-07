import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, Loader2, Play, Save, Zap, Star, RotateCcw } from 'lucide-react';
import { stagesApi } from '../../../services/api';
import './TrainingLevel.css';
import Swal from 'sweetalert2';

const SonarBadge = ({ label, rating, value, metric }) => {
  const letters = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E' };
  const letter = letters[rating] || rating || 'A';
  
  const colors = {
    A: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(52,211,153,0.1)]',
    B: 'text-lime-400 bg-lime-500/10 border-lime-500/20 shadow-[0_0_15px_rgba(163,230,53,0.1)]',
    C: 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.1)]',
    D: 'text-orange-400 bg-orange-500/10 border-orange-500/20 shadow-[0_0_15px_rgba(251,146,60,0.1)]',
    E: 'text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-[0_0_15px_rgba(248,113,113,0.1)]',
  };
  
  const colorClass = colors[letter] || colors.A;

  return (
    <div className={`flex flex-col items-center justify-center p-4 rounded-2xl border ${colorClass} transition-all duration-300 hover:scale-105 group`}>
      <span className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2 opacity-60 group-hover:opacity-100 transition-opacity whitespace-nowrap">{label}</span>
      <div className="text-3xl font-black mb-1 font-mono">{letter}</div>
      <div className="h-px w-8 bg-current opacity-20 mb-2" />
      <span className="text-[10px] font-mono font-bold opacity-80">{value ?? "0"}</span>
    </div>
  );
};

export const TrainingLevel = () => {
  const { levelId } = useParams();
  const navigate = useNavigate();
  const [stage, setStage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completed, setCompleted] = useState([]); // Array of { challengeId, code }
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [attempts, setAttempts] = useState(1);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [showReport, setShowReport] = useState(false);

  const fetchStageData = async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/stages/${levelId}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error("Failed to fetch stage data");

      const data = await response.json();
      setStage(data);
      setCompleted(data.progress?.completedChallenges || []);

      if (data.challenges && data.challenges.length > 0) {
        setSelectedChallenge(data.challenges[0]);
        const saved = (data.progress?.completedChallenges || []).find(c => c.challengeId === data.challenges[0].id);
        setCode(saved ? saved.code : (data.challenges[0].starterCode || ""));
      }
    } catch (err) {
      console.error("Error fetching stage:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStageData();
  }, [levelId]);

  const handleChallengeSelect = (challenge) => {
    setSelectedChallenge(challenge);
    setAttempts(1); // Reset attempts when switching challenges
    const saved = completed.find(c => c.challengeId === challenge.id);
    if (saved) {
      setCode(saved.code);
      setOutput("📜 Previously submitted code loaded.");
    } else {
      setCode(challenge.starterCode || "");
      setOutput("");
    }
  };

  const calculateStars = () => {
    if (attempts === 1) return 3;
    if (attempts <= 3) return 2;
    return 1;
  };

  const runCode = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setOutput(`Running tests on server...`);

    try {
      const { data } = await stagesApi.run(levelId, selectedChallenge._id, code);
      
      if (data.passed) {
        setOutput(`✅ Tests passed!\n\n${data.output || ""}`);
      } else {
        const errors = (data.testResults || [])
          .filter(r => !r.passed)
          .map(r => `❌ ${r.name}: ${r.error}`)
          .join("\n");
        setOutput(`${errors || "❌ Tests failed."}\n\n${data.output || ""}`);
        setAttempts(prev => prev + 1);
      }
    } catch (err) {
      console.error("Run error:", err);
      setOutput(`⚠️ System Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const submitSolution = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    setOutput("Initiating tactical scan...");

    try {
      const { data } = await stagesApi.submit(levelId, selectedChallenge._id, code);
      
      setCompleted(data.progress.completedChallenges);
      setSubmissionResult(data);
      setShowReport(true);

      const logLines = [
        "✅ Mission target verified.",
        data.sonar ? `📊 Quality Score: ${data.sonar.qualityScore}/100` : "",
        data.aiFeedback?.summary ? `💡 AI Insight: ${data.aiFeedback.summary}` : "",
        "\n--- Execution Output ---",
        data.output || "No console output recorded."
      ].filter(Boolean).join("\n");

      setOutput(logLines);

      Swal.fire({
        icon: 'success',
        title: data.stageCompleted ? 'Stage Conquered!' : 'Objective Cleared',
        text: `Results analyzed. Quality Score: ${data.sonar?.qualityScore || 0}/100`,
        background: '#1a1a2e',
        color: '#fff',
        timer: 3000,
        showConfirmButton: false
      });
    } catch (err) {
      console.error("Submit error:", err);
      
      // NEW: Show the report even if tests failed, if data is available
      if (err.response && err.response.data) {
        setSubmissionResult(err.response.data);
        setShowReport(true);
      }

      const msg = err.response?.data?.message || "Failed to submit.";
      setOutput(`❌ Error: ${msg}\n\n${err.response?.data?.output || ""}`);
      
      Swal.fire({
        icon: 'error',
        title: 'Mission Failed',
        text: msg,
        background: '#1a1a2e',
        color: '#fff'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetChallenge = async () => {
    if (!selectedChallenge) return;

    const result = await Swal.fire({
      title: 'Reset Current Objective?',
      text: `This will clear your solution for "${selectedChallenge.title}" only.`,
      icon: 'warning',
      showCancelButton: true,
      background: '#1a1a2e',
      color: '#fff',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#2563eb',
      confirmButtonText: 'Yes, Reset Question',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        const response = await fetch(`http://localhost:5000/api/stages/${levelId}/reset`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ challengeId: selectedChallenge.id })
        });

        if (response.ok) {
          setCompleted(prev => prev.filter(c => c.challengeId !== selectedChallenge.id));
          setCode(selectedChallenge.starterCode || "");
          setAttempts(1); // NEW: Reset stars/attempts in UI
          setOutput("✨ Current objective reset successfully.");
          Swal.fire({
            icon: 'success',
            title: 'Objective Reset',
            background: '#1a1a2e',
            color: '#fff',
            timer: 1500,
            showConfirmButton: false
          });
        }
      } catch (err) {
        console.error("Reset failed:", err);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error || !stage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-red-500 font-mono">
        MISSION_ERROR: {error || "STAGE_NOT_FOUND"}
      </div>
    );
  }

  const challenges = stage.challenges || [];
  const progressPercent = Math.round((completed.length / challenges.length) * 100);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-200">
      <header className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(window.location.pathname.startsWith('/stages') ? '/map' : '/training')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-serif font-bold text-lg text-slate-100 uppercase">{stage.title}</h1>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Level {stage.level} • {stage.difficulty}</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]" style={{ width: `${progressPercent}%` }} />
                </div>
                <span className="text-[10px] text-blue-400 font-bold font-mono">{progressPercent}%</span>
              </div>
              <button
                onClick={handleResetChallenge}
                title="Reset Current Question"
                className="ml-2 hover:text-rose-500 transition-colors flex items-center gap-1 group"
              >
                <RotateCcw className="w-3.5 h-3.5 group-hover:rotate-[-180deg] transition-transform duration-500" />
                <span className="text-[9px] font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity">Reset Question</span>
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runCode}
            disabled={isRunning}
            className="flex items-center gap-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-full text-xs font-bold uppercase transition-all disabled:opacity-50"
          >
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> : <Play className="w-4 h-4 text-green-400" />}
            Run Tests
          </button>
          <button
            onClick={submitSolution}
            disabled={isUpdating || !output.includes("✅")}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-full text-xs font-bold uppercase transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Submit Mission
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/3 border-r border-slate-800 flex flex-col bg-slate-900/20">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Tactical Objectives</h2>
            <div className="space-y-1.5">
              {challenges.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleChallengeSelect(c)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between group ${selectedChallenge?.id === c.id
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-200'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {completed.some(comp => comp.challengeId === c.id) ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-700" />
                    )}
                    <span className="text-sm font-semibold">{c.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[...Array(3)].map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < (completed.find(comp => comp.challengeId === c.id)?.stars || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-800'}`} />
                      ))}
                    </div>
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${c.language === 'python' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-400'
                      }`}>
                      {c.language === 'javascript' ? 'JS' : 'PY'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {selectedChallenge && (
              <>
                <h3 className="text-2xl font-serif font-bold text-slate-100 mb-6">{selectedChallenge.title}</h3>
                <div className="prose prose-invert prose-sm">
                  <p className="text-slate-400 leading-relaxed text-sm bg-slate-800/20 p-4 rounded-xl border border-slate-800">
                    {selectedChallenge.description}
                  </p>
                </div>

                <div className="mt-8 p-5 bg-blue-900/10 rounded-2xl border border-blue-500/20 relative overflow-hidden group">
                  <h4 className="text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-3">Combat Efficiency</h4>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex gap-1">
                      {[...Array(3)].map((_, i) => (
                        <Star key={i} className={`w-5 h-5 ${i < calculateStars() ? 'text-amber-400 fill-amber-400' : 'text-slate-800'}`} />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Est. Reward</span>
                  </div>
                  <p className="text-xs text-slate-500 italic leading-loose">
                    "Efficiency is key. Each failed execution attempt lowers your potential reward level."
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-slate-950">
          <div className="px-5 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${selectedChallenge?.language === 'python' ? 'bg-yellow-500 text-slate-950' : 'bg-blue-600 text-white'
                }`}>
                {selectedChallenge?.language}
              </span>
              <span className="text-[10px] font-mono text-slate-500">solution.src</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-slate-500 uppercase">Attempts:</span>
              <span className={`text-[10px] font-mono ${attempts > 3 ? 'text-rose-500' : attempts > 1 ? 'text-amber-500' : 'text-blue-400'}`}>{attempts}</span>
            </div>
          </div>

          <div className="flex-1 relative">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-full p-8 bg-transparent outline-none resize-none leading-relaxed text-slate-300 font-mono text-sm selection:bg-blue-500/30"
              spellCheck={false}
            />
          </div>

          <div className="h-1/3 border-t border-slate-800 flex flex-col bg-slate-900/40">
            <div className="px-5 py-2 bg-slate-900/80 border-b border-slate-800 flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase">
              <span>Kernel Log</span>
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            </div>
            <div className="flex-1 p-5 font-mono text-[11px] overflow-y-auto bg-slate-950/40">
              {output ? (
                <div className={`${output.includes("✅") ? 'text-blue-400' : 'text-rose-400'} whitespace-pre-wrap`}>
                  <span className="text-slate-600 mr-2">$</span>
                  {output}
                </div>
              ) : (
                <div className="text-slate-700 italic">Waiting for execution...</div>
              )}
            </div>
          </div>
        </div>
      </div>
      {showReport && submissionResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm">
          <div className="max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col md:flex-row max-h-[90vh]">
            {/* Left: Sonar & Summary */}
            <div className="w-full md:w-2/5 p-8 border-r border-slate-800 bg-slate-900/50 flex flex-col">
              <div className="mb-8">
                <p className="text-[10px] font-bold tracking-[0.3em] text-blue-500 uppercase mb-2">Tactical Analysis</p>
                <h2 className="text-3xl font-serif font-bold text-white uppercase italic">Mission Report</h2>
                <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${submissionResult.passed ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${submissionResult.passed ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400 animate-pulse'}`} />
                  {submissionResult.passed ? 'Objective Secured' : 'Mission Failed'}
                </div>
              </div>

              <div className="mb-10 text-center">
                <div className="relative inline-block">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
                    <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent"
                      strokeDasharray={Math.PI * 120}
                      strokeDashoffset={Math.PI * 120 * (1 - (submissionResult.sonar?.qualityScore || 0) / 100)}
                      className="text-blue-500 transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-white">{submissionResult.sonar?.qualityScore || 0}</span>
                    <span className="text-[8px] font-bold text-slate-500 uppercase">Score</span>
                  </div>
                </div>
                <p className="mt-4 text-xs font-mono text-slate-400 italic">"Code efficiency at target level."</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-8">
                <SonarBadge label="Reliability" rating={submissionResult.sonar?.metrics?.reliability_rating} value={`${submissionResult.sonar?.metrics?.bugs ?? 0} Bugs`} />
                <SonarBadge label="Security" rating={submissionResult.sonar?.metrics?.security_rating} value={`${submissionResult.sonar?.metrics?.vulnerabilities ?? 0} Vuln.`} />
                <SonarBadge label="Maintainability" rating={submissionResult.sonar?.metrics?.sqale_rating} value={`${submissionResult.sonar?.metrics?.code_smells ?? 0} Smells`} />
                <SonarBadge label="Complexity" rating="A" value="Optimized" />
              </div>

              <div className="flex-1 flex flex-col justify-end">
                <button
                  onClick={() => setShowReport(false)}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold uppercase tracking-widest text-xs transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                >
                  Confirm & Dismiss
                </button>
              </div>
            </div>

            {/* Right: Feedback & Logs */}
            <div className="flex-1 p-8 overflow-y-auto bg-slate-950/30 flex flex-col">
              <div className="mb-6">
                <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-4">AI Tactical Feedback</h3>
                <div className="space-y-3">
                  {submissionResult.aiFeedback?.bugs?.length > 0 && (
                    <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 text-rose-200 text-xs">
                      <p className="font-bold mb-1 uppercase tracking-wider text-rose-500">Detected Anomalies</p>
                      {submissionResult.aiFeedback.bugs.map((b, i) => <p key={i} className="mb-1">• {b}</p>)}
                    </div>
                  )}
                  <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-slate-300 text-xs">
                    <p className="font-bold mb-1 uppercase tracking-wider text-blue-500">Optimization Paths</p>
                    {submissionResult.aiFeedback?.suggestions?.map((s, i) => <p key={i} className="mb-1">• {s}</p>)}
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Binary Execution Log</h3>
                  {!submissionResult.passed && (
                    <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">{submissionResult.testResults?.filter(r => !r.passed).length} Failures Detected</span>
                  )}
                </div>
                <div className="flex-1 p-5 rounded-2xl bg-black/40 border border-slate-800 font-mono text-[11px] text-slate-300 whitespace-pre-wrap max-h-60 overflow-y-auto shadow-inner">
                  <span className="text-slate-700 mr-2">$ cat execution_dump.log</span>
                  <br />
                  <div className="mt-2">
                    {submissionResult.output || "No terminal output captured."}
                  </div>
                  {!submissionResult.passed && submissionResult.testResults && (
                    <div className="mt-4 pt-4 border-t border-slate-800">
                      <p className="text-rose-500 font-bold mb-2">--- FAILED TARGETS ---</p>
                      {submissionResult.testResults.filter(r => !r.passed).map((r, i) => (
                        <p key={i} className="mb-1 text-rose-300">❌ {r.name}: {r.error}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-600 uppercase">Coverage</p>
                    <p className="text-sm font-mono text-white">{submissionResult.sonar?.metrics?.coverage || "0"}%</p>
                  </div>
                  <div className="w-px h-6 bg-slate-800" />
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-600 uppercase">Gained XP</p>
                    <p className="text-sm font-mono text-emerald-400">+{submissionResult.xpGained || 0}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-600 uppercase">Execution Time</p>
                  <p className="text-sm font-mono text-blue-400">{submissionResult.executionTimeMs} ms</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
