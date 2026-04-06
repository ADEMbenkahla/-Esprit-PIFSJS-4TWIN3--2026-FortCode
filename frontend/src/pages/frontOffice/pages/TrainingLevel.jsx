import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, Loader2, Play, Save, Zap, Star, RotateCcw } from 'lucide-react';
import './TrainingLevel.css';
import Swal from 'sweetalert2';

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
    setIsRunning(true);
    setOutput(`Running ${selectedChallenge.language} tests...`);

    setTimeout(() => {
      try {
        let passed = false;
        if (selectedChallenge.language === "javascript") {
          const userFunction = new Function(code + "\n" + (selectedChallenge.tests || ""));
          passed = userFunction() === true;
        } else if (selectedChallenge.language === "python") {
          passed = selectedChallenge.title.includes("Hello Python") ? /return ["']Python is cool["']/.test(code) :
            selectedChallenge.title.includes("Square Number") ? /return.*n\s*(\*|\*\*)\s*(n|2)/.test(code) :
              selectedChallenge.title.includes("List Length") ? /return.*len\(.*\)/.test(code) :
                selectedChallenge.title.includes("Multiply") ? /return.*a\s*\*|multiply.*b/.test(code) :
                  selectedChallenge.title.includes("First Element") ? /return.*arr\[0\]/.test(code) : false;
        }

        if (passed) {
          setOutput(`✅ ${selectedChallenge.language === 'javascript' ? 'JS' : 'Python'} tests passed! Est. Stars: ${calculateStars()}`);
        } else {
          setOutput("❌ Tests failed. Attempt recorded.");
          setAttempts(prev => prev + 1);
        }
      } catch (err) {
        setOutput(`⚠️ Error: ${err.message}`);
        setAttempts(prev => prev + 1);
      } finally {
        setIsRunning(false);
      }
    }, 1200);
  };

  const submitSolution = async () => {
    if (isUpdating) return;

    const finalStars = calculateStars();
    setIsUpdating(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/stages/${levelId}/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          challengeId: selectedChallenge.id,
          stars: finalStars,
          code
        })
      });

      if (!response.ok) throw new Error("Failed to update progress");

      const data = await response.json();
      setCompleted(data.progress.completedChallenges);

      Swal.fire({
        icon: 'success',
        title: finalStars === 3 ? 'Perfect Performance!' : finalStars === 2 ? 'Mission Success' : 'Challenge Cleared',
        text: `You earned ${finalStars} stars for this component.`,
        background: '#1a1a2e',
        color: '#fff',
        timer: 2000,
        showConfirmButton: false
      });

      if (data.progress.isCompleted) {
        Swal.fire({
          icon: 'success',
          title: 'Stage Conquered!',
          text: `You have mastered the ${stage.title} trials!`,
          background: '#1a1a2e',
          color: '#fff',
          confirmButtonColor: '#2563eb'
        });
      }
    } catch (err) {
      console.error("Error updating progress:", err);
      Swal.fire({
        icon: 'error',
        title: 'Sync Error',
        text: 'Failed to save solution to cloud.',
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
    </div>
  );
};
