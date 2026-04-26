import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, Loader2, Play, Save, Zap, Star, RotateCcw } from 'lucide-react';
import { stagesApi } from '../../../services/api';
import './TrainingLevel.css';
import Swal from 'sweetalert2';

const SonarBadge = ({ label, rating, value }) => {
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
  const { stageId, challengeId } = useParams();
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
  const [activeReportTab, setActiveReportTab] = useState("overview"); // overview, bugs, explanation, resources
  const [explanationLevel, setExplanationLevel] = useState("simple");
  const [isExplaining, setIsExplaining] = useState(false);

  const fetchStageData = async () => {
    try {
      setLoading(true);
      const { data } = await stagesApi.get(stageId);
      setStage(data);
      setCompleted(data.progress?.completedChallenges || []);

      if (data.challenges && data.challenges.length > 0) {
        let initialChallenge = data.challenges[0];
        if (challengeId) {
          const found = data.challenges.find(c => String(c?._id) === String(challengeId));
          if (found) initialChallenge = found;
        }

        setSelectedChallenge(initialChallenge);
        const saved = (data.progress?.completedChallenges || []).find(c => String(c.challengeId || c) === String(initialChallenge._id));
        setCode(saved?.code || initialChallenge.starterCode || "");
      }
    } catch (err) {
      console.error("Error fetching stage:", err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStageData();
  }, [stageId]);

  // Handle URL changes for challengeId
  useEffect(() => {
    if (stage?.challenges && challengeId) {
      const found = stage.challenges.find(c => String(c?._id) === String(challengeId));
      if (found && String(found._id) !== String(selectedChallenge?._id)) {
        setSelectedChallenge(found);
        const saved = completed.find(c => String(c.challengeId || c) === String(found._id));
        // Priority: Saved submission code > local progress code > starter code
        setCode(found.savedReport?.code || saved?.code || found.starterCode || "");
        if (found.savedReport) {
          setSubmissionResult(found.savedReport);
          setOutput(`✅ Solution verified successfully!\n\n${found.savedReport.output || ""}`);
        } else {
          setSubmissionResult(null);
          setOutput("");
        }
      }
    }
  }, [challengeId, stage?.challenges]);

  const handleChallengeSelect = (challenge) => {
    navigate(`/training/${stageId}/challenge/${challenge._id}`);
  };

  const calculateStars = (challenge) => {
    // This is now purely for display matching the backend logic
    // We'll trust the backend stars more, but if we need to predict:
    return challenge?.stars || 0;
  };

  const runCode = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setOutput(`Running tests on server...`);

    try {
      const { data } = await stagesApi.run(stageId, selectedChallenge._id, code);

      if (data.passed) {
        setOutput("⚡ Analyzing execution...\n\n" + data.outputSnapshot);
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

  const handleGetHelp = async () => {
    if (isUpdating || isRunning) return;
    setIsUpdating(true);
    setOutput("⚡ Generating AI Explanation for current error...");
    try {
      const { data } = await stagesApi.explain(code, selectedChallenge.language, 'simple', selectedChallenge._id);
      setSubmissionResult({
        passed: false,
        fullAiAnalysis: {
          explanation: data.explanation,
          bugs: data.bugs || [],
          recommendations: data.recommendations || [],
          weakAreas: data.weakAreas || [],
          metrics: data.metrics || null,
        },
        sonar: data.metrics ? {
          qualityScore: data.metrics.qualityScore,
          metrics: data.metrics
        } : null
      });
      setShowReport(true);
      setOutput(prev => prev + "\n\n💡 Analysis complete. Open the Performance Report to see the logic breakdown and bug details.");
    } catch (err) {
      console.error("Help error:", err);
      setOutput(prev => prev + "\n\n❌ Failed to generate AI analysis.");
    } finally {
      setIsUpdating(false);
    }
  };

  const submitSolution = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    setOutput("Initiating code analysis...");

    try {
      const { data } = await stagesApi.submit(stageId, selectedChallenge._id, code);

      setCompleted(data.progress.completedChallenges);
      setSubmissionResult(data);
      setShowReport(true);

      // Refresh to update sidebar stars and progress
      fetchStageData();

      const logLines = [
        "✓ All tests passed successfully.",
        data.sonar ? `📊 Quality Score: ${data.sonar.qualityScore}/100` : "",
        data.aiFeedback?.summary ? `💡 AI Insight: ${data.aiFeedback.summary}` : "",
        "\n--- Execution Output ---",
        data.outputSnapshot || "No console output recorded."
      ].filter(Boolean).join("\n");

      setOutput(logLines);

      Swal.fire({
        icon: 'success',
        title: data.stageCompleted ? 'Stage Mastered!' : 'Exercise Completed',
        text: data.stageCompleted
          ? "You've successfully finished all exercises in this stage!"
          : `Results analyzed. Quality Score: ${data.sonar?.qualityScore || 0}/100`,
        background: '#1a1a2e',
        color: '#fff',
        timer: data.stageCompleted ? undefined : 3000,
        showConfirmButton: data.stageCompleted,
        confirmButtonText: 'View Dashboard',
      }).then((result) => {
        if (data.stageCompleted && result.isConfirmed) {
          navigate(`/training/${stageId}`);
        }
      });
    } catch (err) {
      console.error("Submit error:", err);

      if (err.response && err.response.data) {
        setSubmissionResult(err.response.data);
        setShowReport(true);
      }

      const msg = err.response?.data?.message || "Failed to submit.";
      setOutput(`❌ Error: ${msg}\n\n${err.response?.data?.output || ""}`);

      Swal.fire({
        icon: 'error',
        title: 'Tests Incomplete',
        text: msg,
        background: '#1a1a2e',
        color: '#fff'
      });
    } finally {
      setIsUpdating(false);
      setActiveReportTab("overview");
    }
  };

  const handleExplanationLevelChange = async (newLevel) => {
    if (isExplaining) return;
    setExplanationLevel(newLevel);
    setIsExplaining(true);
    try {
      const { data } = await stagesApi.explain(code, selectedChallenge.language, newLevel);
      setSubmissionResult(prev => ({
        ...prev,
        fullAiAnalysis: {
          ...prev.fullAiAnalysis,
          explanation: data
        }
      }));
    } catch (err) {
      console.error("Explanation error:", err);
    } finally {
      setIsExplaining(false);
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
        const { data } = await stagesApi.reset(stageId, selectedChallenge._id);

        setCompleted(prev => prev.filter(c => c.challengeId !== selectedChallenge._id));
        setCode(selectedChallenge.starterCode || "");
        setAttempts(1);
        setOutput("✨ Current objective reset successfully.");
        Swal.fire({
          icon: 'success',
          title: 'Objective Reset',
          background: '#1a1a2e',
          color: '#fff',
          timer: 1500,
          showConfirmButton: false
        });
      } catch (err) {
        console.error("Reset failed:", err);
        Swal.fire({
          icon: 'error',
          title: 'Reset Failed',
          text: err.response?.data?.message || err.message,
          background: '#1a1a2e',
          color: '#fff'
        });
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
        SYSTEM_ERROR: {error || "STAGE_NOT_FOUND"}
      </div>
    );
  }

  const challenges = stage.challenges || [];
  const progressPercent = Math.round((completed.length / challenges.length) * 100);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-200">
      <header className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(`/training/${stageId}`)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
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
          {(submissionResult || selectedChallenge?.savedReport) && (
            <button
              onClick={() => setShowReport(true)}
              className="flex items-center gap-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-full text-xs font-bold uppercase transition-all"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              View Last Report
            </button>
          )}
          <button
            onClick={submitSolution}
            disabled={isUpdating || !output.includes("✓")}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-full text-xs font-bold uppercase transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Submit Solution
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/3 border-r border-slate-800 flex flex-col bg-slate-900/20">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Exercise Objectives</h2>
            <div className="space-y-1.5">
              {challenges.map((c) => (
                <div
                  key={c._id}
                  onClick={() => handleChallengeSelect(c)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between group ${String(selectedChallenge?._id) === String(c._id)
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-200'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {completed.some(comp => String(comp.challengeId || comp) === String(c._id)) ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-700" />
                    )}
                    <span className="text-sm font-semibold">{c.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[...Array(3)].map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < (c.stars || 0) ? 'text-amber-400 fill-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]' : 'text-slate-800'}`} />
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
                  <h4 className="text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-3">Ranking Efficiency</h4>
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
                <div className={`${output.includes("✓") ? 'text-emerald-400' : 'text-rose-400'} whitespace-pre-wrap`}>
                  <div className="flex items-center justify-between mb-2 border-b border-white/5 pb-2">
                    <span className="text-slate-600">$ Kernel Execution Output</span>
                    {output.includes("❌") && (
                      <button
                        onClick={handleGetHelp}
                        className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[8px] uppercase tracking-widest transition-all animate-pulse"
                      >
                        <Zap className="w-2.5 h-2.5" />
                        Get AI Help
                      </button>
                    )}
                  </div>
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
            <div className="w-full md:w-1/3 p-8 border-r border-slate-800 bg-slate-900/50 flex flex-col">
              <div className="mb-6">
                <p className="text-[10px] font-bold tracking-[0.3em] text-blue-500 uppercase mb-2">Code Analysis</p>
                <h2 className="text-3xl font-serif font-bold text-white uppercase italic">Performance Report</h2>
              </div>

              <div className="flex flex-col gap-2 mb-8">
                {["overview", "bugs", "resources"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveReportTab(tab)}
                    className={`px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest text-left transition-all border ${activeReportTab === tab
                      ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                  >
                    {tab === 'bugs' && submissionResult.fullAiAnalysis?.bugs?.length > 0 && (
                      <span className="float-right bg-rose-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] animate-pulse">
                        {submissionResult.fullAiAnalysis.bugs.length}
                      </span>
                    )}
                    {tab === 'overview' ? 'Analysis' : tab}
                  </button>
                ))}
              </div>

              <div className="flex-1 flex flex-col justify-end">
                <button
                  onClick={() => setShowReport(false)}
                  className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold uppercase tracking-widest text-xs transition-all border border-slate-700"
                >
                  Dismiss Report
                </button>
              </div>
            </div>

            <div className="flex-1 p-8 overflow-y-auto bg-slate-950/30 flex flex-col">
              {activeReportTab === "overview" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Status</h3>
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${submissionResult.passed ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                        {submissionResult.passed ? 'Result: Optimal' : 'Result: Logic Error'}
                      </div>
                    </div>
                    <div className="text-right">
                      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">XP Reward</h3>
                      <p className="text-xl font-black text-emerald-400">+{submissionResult.xpAwarded ?? 0}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-2 flex flex-col items-center justify-center p-6 bg-slate-900/50 rounded-3xl border border-slate-800">
                      <div className="relative mb-2">
                        <svg className="w-24 h-24 transform -rotate-90">
                          <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-800" />
                          <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="6" fill="transparent"
                            strokeDasharray={Math.PI * 88}
                            strokeDashoffset={Math.PI * 88 * (1 - (submissionResult.sonar?.qualityScore || 0) / 100)}
                            className="text-blue-500 transition-all duration-1000 ease-out"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-black text-white">{submissionResult.sonar?.qualityScore || 0}</span>
                          <span className="text-[7px] font-bold text-slate-500 uppercase">Score</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <p className="text-[9px] font-bold text-slate-500 uppercase mb-2">Quality Index</p>
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-mono text-blue-400">
                          <Zap className="w-3 h-3" />
                          <span>{submissionResult.executionTimeMs || 0}ms</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 grid grid-cols-2 gap-2">
                      <SonarBadge label="Reliability" rating={submissionResult.sonar?.metrics?.reliability_rating} value={`${submissionResult.sonar?.metrics?.bugs ?? 0} Bugs`} />
                      <SonarBadge label="Security" rating={submissionResult.sonar?.metrics?.security_rating} value={`${submissionResult.sonar?.metrics?.vulnerabilities ?? 0} Vuln.`} />
                      <SonarBadge label="Maintainability" rating={submissionResult.sonar?.metrics?.sqale_rating} value={`${submissionResult.sonar?.metrics?.code_smells ?? 0} Smells`} />
                      <SonarBadge label="Coverage" rating="A" value={`${submissionResult.sonar?.metrics?.coverage || 0}%`} />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Quick Insights</h3>
                    <p className="text-sm text-slate-300 italic p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                      "{submissionResult.fullAiAnalysis?.bugSummary || submissionResult.aiFeedback?.summary || "No specific summary available."}"
                    </p>
                  </div>
                </div>
              )}

              {activeReportTab === "bugs" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Logic & Syntax Anomalies</h3>
                  {submissionResult.fullAiAnalysis?.bugs?.length > 0 ? (
                    <div className="space-y-4">
                      {submissionResult.fullAiAnalysis.bugs.map((bug, i) => (
                        <div key={i} className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20 group hover:bg-rose-500/10 transition-all">
                          <div className="flex items-center justify-between mb-2">
                            <span className="px-2 py-0.5 rounded bg-rose-500 text-white text-[9px] font-bold uppercase">Line {bug.line}</span>
                            <span className="text-[9px] font-bold text-rose-500 uppercase">{bug.type}</span>
                          </div>
                          <p className="text-sm font-bold text-rose-200 mb-2">{bug.message}</p>
                          <div className="pl-4 border-l border-rose-500/30 space-y-4">
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-rose-500/60 uppercase tracking-widest">Architectural Analysis</p>
                              <p className="text-xs text-slate-300 leading-relaxed">{bug.explanation}</p>
                            </div>
                            {bug.suggestion && (
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest">Actionable Remediation</p>
                                <pre className="p-3 bg-slate-900 rounded-lg text-[10px] font-mono text-emerald-400 overflow-x-auto border border-emerald-500/20">
                                  {bug.suggestion}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl">
                      <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4 opacity-20" />
                      <p className="text-sm font-bold text-emerald-500 uppercase tracking-widest">No anomalies detected</p>
                      <p className="text-xs text-slate-500 mt-2 italic">"Current code patterns are within mission parameters."</p>
                    </div>
                  )}
                  {submissionResult.fullAiAnalysis?.explanation && (
                    <div className="pt-8 border-t border-slate-800">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Logic Breakdown</h3>
                        <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                          {["simple", "advanced"].map((lvl) => (
                            <button
                              key={lvl}
                              onClick={() => handleExplanationLevelChange(lvl)}
                              disabled={isExplaining}
                              className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${explanationLevel === lvl
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                            >
                              {lvl}
                            </button>
                          ))}
                        </div>
                      </div>

                      {isExplaining ? (
                        <div className="flex flex-col items-center justify-center p-12 text-slate-600">
                          <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                          <p className="text-[10px] font-bold uppercase tracking-widest animate-pulse">Running AI Synthesizer...</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="p-6 bg-blue-900/10 border border-blue-500/20 rounded-3xl">
                            <p className="text-sm text-slate-200 leading-relaxed italic">
                              {submissionResult.fullAiAnalysis.explanation.overview}
                            </p>
                          </div>

                          <div className="space-y-4">
                            {submissionResult.fullAiAnalysis.explanation.steps?.map((step, i) => (
                              <div key={i} className="flex gap-4 group">
                                <div className="flex flex-col items-center">
                                  <div className="w-6 h-6 rounded-full border-2 border-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500 group-hover:border-blue-500 group-hover:text-blue-400 transition-colors bg-slate-950">
                                    {i + 1}
                                  </div>
                                  {i < submissionResult.fullAiAnalysis.explanation.steps.length - 1 && (
                                    <div className="w-0.5 flex-1 bg-slate-800 group-hover:bg-blue-500/30 transition-colors my-1" />
                                  )}
                                </div>
                                <div className="pb-6">
                                  <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider mb-1">{step.step}</h4>
                                  <p className="text-xs text-slate-400 mb-2 leading-relaxed">{step.logic}</p>
                                  <code className="text-[10px] font-mono bg-black/40 px-2 py-1 rounded text-blue-400 border border-blue-500/10">
                                    {step.highlight}
                                  </code>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                            <div>
                              <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Complexity</h4>
                              <span className="text-xs font-mono text-amber-500">{submissionResult.fullAiAnalysis.explanation.complexity}</span>
                            </div>
                            <div>
                              <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Key Concepts</h4>
                              <div className="flex flex-wrap gap-2">
                                {submissionResult.fullAiAnalysis.explanation.keyConcepts?.map((c, i) => (
                                  <span key={i} className="text-[9px] px-2 py-0.5 bg-slate-800 rounded-full text-slate-400">{c}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeReportTab === "resources" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recommended Intel</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {submissionResult.fullAiAnalysis?.recommendations?.length > 0 ? (
                      submissionResult.fullAiAnalysis.recommendations.map((res, i) => (
                        <a
                          key={i}
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group p-5 bg-slate-900/50 rounded-3xl border border-slate-800 hover:border-blue-500/40 transition-all hover:shadow-[0_0_20px_rgba(37,99,235,0.1)] relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-100 transition-opacity">
                            <Zap className="w-5 h-5 text-blue-500" />
                          </div>
                          <div className="flex items-center gap-3 mb-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${res.type === 'video' ? 'bg-rose-500/20 text-rose-500' : res.type === 'exercise' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500'
                              }`}>
                              {res.type}
                            </span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{res.difficulty}</span>
                          </div>
                          <h4 className="text-sm font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{res.title}</h4>
                          <div className="mt-2 pt-2 border-t border-slate-800/50">
                            <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Strategic Benefit</p>
                            <p className="text-[11px] text-slate-400 leading-relaxed italic">"{res.reason}"</p>
                          </div>
                        </a>
                      ))
                    ) : (
                      <div className="text-center p-12 text-slate-500 italic text-xs col-span-2">
                        Intel cache empty. Complete challenges or request help to receive recommendations.
                      </div>
                    )}
                  </div>

                  {submissionResult.fullAiAnalysis?.weakAreas?.length > 0 && (
                    <div className="p-6 bg-slate-900/50 rounded-3xl border border-slate-800 mt-8">
                      <h4 className="text-xs font-bold text-white mb-4">Strategic Learning Map</h4>
                      <p className="text-xs text-slate-500 mb-6">Based on your recent performance, we recommend focusing on these areas to advance your rank.</p>
                      <div className="space-y-4">
                        {submissionResult.fullAiAnalysis.weakAreas.map((skill, i) => (
                          <div key={i} className="space-y-2">
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                              <span className="text-slate-400">{skill}</span>
                              <span className="text-blue-400">{85 - i * 12}%</span>
                            </div>
                            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500/50" style={{ width: `${85 - i * 12}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
