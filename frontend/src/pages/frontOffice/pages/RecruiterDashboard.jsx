import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  Video,
  CheckCircle,
  Clock,
  XCircle,
  Users,
  PlusCircle,
  ListChecks,
  Radio,
  Settings,
  AlertCircle,
  Play,
  Square,
  FileCode,
  Star,
  MessageSquare,
} from "lucide-react";
import { Card } from "../components/ui/Card";
import { ScrollButton } from "../components/ui/ScrollButton";
import {
  getMyVirtualRoomRequest,
  generateBattleExercise,
  createBattleRoom as apiCreateBattleRoom,
  getMyBattleRooms,
  getBattleRoom,
  updateBattleRoomStatus,
  updateSubmissionEvaluation,
} from "../../../services/api";
import Swal from "sweetalert2";

const getRemainingMs = (startedAt, timeLimitMinutes, now = Date.now()) => {
  if (!startedAt || !timeLimitMinutes) return null;
  const end = new Date(startedAt).getTime() + timeLimitMinutes * 60 * 1000;
  return Math.max(0, end - now);
};

const formatRemaining = (remainingMs) => {
  if (remainingMs == null) return "—";
  const mins = Math.floor(remainingMs / 60000);
  const secs = Math.floor((remainingMs % 60000) / 1000);
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

const sonarLetter = (rawRating) => {
  if (rawRating == null || rawRating === "") return "-";
  const value = Number(rawRating);
  if (!Number.isFinite(value)) return String(rawRating);
  const map = { 1: "A", 2: "B", 3: "C", 4: "D", 5: "E" };
  return map[value] || String(rawRating);
};

const hasLikelyCodeShape = (value) => {
  const text = String(value || "").trim();
  if (!text) return false;

  const codeKeywordHits = (
    text.match(/\b(function|return|const|let|var|if|else|for|while|class|import|export|def|print|public|private|static|new|try|catch|switch|case)\b/gi) || []
  ).length;
  const structureHits = (text.match(/(?:[{}();=<>]|\[|\])/g) || []).length;
  const operatorHits = (text.match(/(=>|==|===|!=|!==|\+|-|\*|\/|%)/g) || []).length;
  const lineCount = text.split(/\r?\n/).length;

  // Require at least a small amount of coding structure to avoid treating plain prose as source code.
  return codeKeywordHits >= 1 || structureHits >= 6 || operatorHits >= 3 || (lineCount >= 3 && structureHits >= 3);
};

const invalidateNonCodeSubmission = (submission) => {
  if (!submission?.code || hasLikelyCodeShape(submission.code)) return submission;

  return {
    ...submission,
    _invalidNonCodeInput: true,
    qualityGrade: "Invalid",
    qualityScore: 0,
    correctnessScore: 0,
    finalScore: 0,
    offTopic: true,
    sonarSource: "invalid-input",
    qualityGateStatus: "FAILED",
    sonarSummary: "Submission does not look like source code. Sonar result ignored and score forced to 0.",
  };
};

const TAB = { OVERVIEW: "overview", ROOMS: "rooms", CREATE: "create", SUBMISSIONS: "submissions", SUPERVISE: "supervise" };
const EXERCISE_CRITERIA_OPTIONS = [
  "loops",
  "iterations",
  "arrays",
  "strings",
  "graphs",
  "dynamic-programming",
  "data-structures",
  "performance",
];

const buildTemplateForFunction = (language, functionName) => {
  const fn = String(functionName || "solve").trim() || "solve";
  if (fn.toLowerCase() === "shortestpath") {
    return [
      {
        name: "Basic shortest path",
        assertion: `const g = { A: { B: 4, C: 2 }, B: { C: 1, D: 5 }, C: { B: 1, D: 8, E: 10 }, D: { E: 2, F: 6 }, E: { F: 2 }, F: {} }; const r = ${fn}(g, "A", "F"); return r.distance === 10 && Array.isArray(r.path) && r.path.join("->") === "A->C->B->D->E->F";`,
        hidden: false,
      },
      {
        name: "Start equals target",
        assertion: `const g = { A: { B: 1 }, B: {} }; const r = ${fn}(g, "A", "A"); return r.distance === 0 && r.path.join("->") === "A";`,
        hidden: false,
      },
      {
        name: "Unreachable target",
        assertion: `const g = { A: { B: 1 }, B: {}, C: {} }; const r = ${fn}(g, "A", "C"); return r.distance === Infinity && Array.isArray(r.path) && r.path.length === 0;`,
        hidden: true,
      },
      {
        name: "Ignore negative edges",
        assertion: `const g = { A: { B: -2, C: 3 }, B: { D: 1 }, C: { D: 2 }, D: {} }; const r = ${fn}(g, "A", "D"); return r.distance === 5 && r.path.join("->") === "A->C->D";`,
        hidden: true,
      },
    ];
  }

  const jsLike = [
    { name: "Basic", assertion: `return ${fn}(2, 3) === 5;`, hidden: false },
    { name: "Zero", assertion: `return ${fn}(0, 0) === 0;`, hidden: false },
    { name: "Negative", assertion: `return ${fn}(-1, 1) === 0;`, hidden: true },
  ];
  const python = [
    { name: "Basic", assertion: `${fn}(2, 3) == 5`, hidden: false },
    { name: "Zero", assertion: `${fn}(0, 0) == 0`, hidden: false },
    { name: "Negative", assertion: `${fn}(-1, 1) == 0`, hidden: true },
  ];

  return language === "python" ? python : jsLike;
};

const buildChallengeTestTemplate = (language, functionNames) => {
  const names = (Array.isArray(functionNames) ? functionNames : [functionNames])
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  const uniqueNames = [...new Set(names.length ? names : ["solve"])];
  return uniqueNames.flatMap((fnName, index) => {
    const tests = buildTemplateForFunction(language, fnName);
    return tests.map((test) => ({
      ...test,
      name: uniqueNames.length > 1 ? `${fnName} - ${test.name || `Test ${index + 1}`}` : test.name,
    }));
  });
};

const normalizeChallengeTestCases = (value) => {
  const tests = Array.isArray(value) ? value : [];
  return tests
    .map((test, index) => ({
      name: String(test?.name || `Test ${index + 1}`).trim(),
      assertion: String(test?.assertion || "").trim(),
      hidden: test?.hidden !== false,
    }))
    .filter((test) => test.assertion.length > 0);
};

const buildVisitorRanking = (submissions) => {
  return [...(Array.isArray(submissions) ? submissions : [])]
    .filter((sub) => sub?.status === "submitted" || sub?.status === "evaluated" || sub?.finalScore != null)
    .sort((a, b) => {
      const scoreA = Number(a?.finalScore ?? a?.score ?? 0);
      const scoreB = Number(b?.finalScore ?? b?.score ?? 0);
      if (scoreB !== scoreA) return scoreB - scoreA;

      const corrA = Number(a?.correctnessScore ?? 0);
      const corrB = Number(b?.correctnessScore ?? 0);
      if (corrB !== corrA) return corrB - corrA;

      const timeA = Number(a?.executionTimeMs ?? Number.POSITIVE_INFINITY);
      const timeB = Number(b?.executionTimeMs ?? Number.POSITIVE_INFINITY);
      if (timeA !== timeB) return timeA - timeB;

      return String(a?.participant?.username || a?.participant?.nickname || "").localeCompare(String(b?.participant?.username || b?.participant?.nickname || ""));
    })
    .map((sub, index) => ({
      rank: index + 1,
      name: sub?.participant?.username || sub?.participant?.nickname || sub?.participant?.email || "Participant",
      email: sub?.participant?.email || "",
      score: Number(sub?.finalScore ?? sub?.score ?? 0),
      correctnessScore: Number(sub?.correctnessScore ?? 0),
      qualityScore: sub?.qualityScore != null ? Number(sub.qualityScore) : null,
      executionTimeMs: sub?.executionTimeMs != null ? Number(sub.executionTimeMs) : null,
      submittedAt: sub?.submittedAt || null,
      outputSnapshot: String(sub?.outputSnapshot || "").trim(),
    }));
};

export function RecruiterDashboard() {
  const [activeTab, setActiveTab] = useState(TAB.OVERVIEW);
  const [virtualRoomStatus, setVirtualRoomStatus] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    exercisePrompt: "",
    exerciseDifficulty: "medium",
    exerciseCriteria: ["loops", "iterations"],
    randomExercise: true,
    inviteEmailsText: "",
    challengeTitle: "Coding Challenge",
    challengeDescription: "",
    challengeLanguage: "javascript",
    expectedFunctions: ["solve"],
    generatedExerciseSnapshot: null,
    challengeTestCases: [
      { name: "Basic", assertion: "return solve(2, 3) === 5;", hidden: false },
      { name: "Edge", assertion: "return solve(-1, 1) === 0;", hidden: true },
    ],
    timeLimitMinutes: 60,
    exerciseFile: null,
  });

  const fetchVirtualRoom = () => {
    getMyVirtualRoomRequest()
      .then((r) => setVirtualRoomStatus(r.data.request))
      .catch(() => setVirtualRoomStatus(null));
  };
  const fetchRooms = () => {
    getMyBattleRooms()
      .then((r) => setRooms(r.data.rooms || []))
      .catch(() => setRooms([]));
  };

  useEffect(() => {
    fetchVirtualRoom();
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (activeTab === TAB.ROOMS || activeTab === TAB.SUBMISSIONS) fetchRooms();
  }, [activeTab]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      Swal.fire({ icon: "warning", title: "Title required", text: "Enter a room title.", background: "#1a1a2e", color: "#fff" });
      return;
    }

    const inviteEmails = createForm.inviteEmailsText
      .split(/[\n,;\s]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    if (inviteEmails.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Email invitations required",
        text: "Add at least one email address for invitations.",
        background: "#1a1a2e",
        color: "#fff",
      });
      return;
    }

    if (createForm.participantIds.length === 0 && inviteEmails.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Participants required",
        text: "Select at least one participant or add invitation emails.",
        background: "#1a1a2e",
        color: "#fff",
      });
      return;
    }

    setLoading(true);
    try {
      const { data } = await apiCreateBattleRoom({
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        inviteEmails,
        challenge: {
          title: createForm.challengeTitle || "Coding Challenge",
          description: createForm.challengeDescription,
          language: createForm.challengeLanguage || "javascript",
          testCases: parsedTests,
          generatedExerciseSnapshot: createForm.generatedExerciseSnapshot,
        },
        timeLimitMinutes: createForm.timeLimitMinutes || 60,
        exerciseFile: createForm.exerciseFile,
      });
      const sent = data?.invitations?.sent || 0;
      const failed = data?.invitations?.failed || 0;
      Swal.fire({
        icon: "success",
        title: "Room created",
        text: `Battle room is ready. Invitations sent: ${sent}${failed ? `, failed: ${failed}` : ""}.`,
        background: "#1a1a2e",
        color: "#fff",
      });
      setCreateForm({
        title: "",
        description: "",
        exercisePrompt: "",
        exerciseDifficulty: "medium",
        exerciseCriteria: ["loops", "iterations"],
        randomExercise: true,
        inviteEmailsText: "",
        challengeTitle: "Coding Challenge",
        challengeDescription: "",
        challengeLanguage: "javascript",
        expectedFunctions: ["solve"],
        generatedExerciseSnapshot: null,
        challengeTestCases: [
          { name: "Basic", assertion: "return solve(2, 3) === 5;", hidden: false },
          { name: "Edge", assertion: "return solve(-1, 1) === 0;", hidden: true },
        ],
        timeLimitMinutes: 60,
        exerciseFile: null,
      });
      fetchRooms();
      setActiveTab(TAB.ROOMS);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err?.response?.data?.message || "Could not create room.", background: "#1a1a2e", color: "#fff" });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateExercise = async () => {
    setAiGenerating(true);
    try {
      const expectedFns = (createForm.expectedFunctions || [])
        .map((value) => String(value || "").trim())
        .filter(Boolean);

      const { data } = await generateBattleExercise({
        prompt: createForm.exercisePrompt,
        difficulty: createForm.exerciseDifficulty,
        language: createForm.challengeLanguage,
        expectedFunctions: expectedFns,
        criteria: createForm.exerciseCriteria,
        randomize: createForm.randomExercise,
      });

      const exercise = data?.exercise || {};
      setCreateForm((f) => ({
        ...f,
        generatedExerciseSnapshot: {
          source: data?.source || "ai",
          provider: data?.provider || "gemini",
          prompt: f.exercisePrompt,
          difficulty: f.exerciseDifficulty,
          criteria: f.exerciseCriteria,
          randomize: f.randomExercise,
          generatedAt: new Date().toISOString(),
          exercise,
        },
        challengeTitle: exercise.title || f.challengeTitle,
        challengeDescription: exercise.description || f.challengeDescription,
        challengeLanguage: exercise.language || f.challengeLanguage,
        expectedFunctions: Array.isArray(exercise.expectedFunctions) && exercise.expectedFunctions.length
          ? exercise.expectedFunctions
          : f.expectedFunctions,
        challengeTestCases: Array.isArray(exercise.testCases) && exercise.testCases.length
          ? normalizeChallengeTestCases(exercise.testCases)
          : f.challengeTestCases,
      }));

      Swal.fire({
        icon: "success",
        title: "Exercise generated",
        text: `Exercise and tests were generated by ${String(data?.provider || "AI").toUpperCase()}.`,
        background: "#1a1a2e",
        color: "#fff",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Generation failed",
        text: error?.response?.data?.message || "Could not generate exercise draft.",
        background: "#1a1a2e",
        color: "#fff",
      });
    } finally {
      setAiGenerating(false);
    }
  };

  const handleStartEnd = async (roomId, newStatus) => {
    try {
      await updateBattleRoomStatus(roomId, newStatus);
      fetchRooms();
      if (selectedRoom?._id === roomId) {
        const r = await getBattleRoom(roomId);
        setSelectedRoom(r.data.room);
      }
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err?.response?.data?.message || "Action failed.", background: "#1a1a2e", color: "#fff" });
    }
  };

  const handleSaveEvaluation = async (roomId, subId, recruiterComment, recruiterRating) => {
    try {
      await updateSubmissionEvaluation(roomId, subId, { recruiterComment, recruiterRating });
      const r = await getBattleRoom(roomId);
      setSelectedRoom(r.data.room);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err?.response?.data?.message || "Save failed.", background: "#1a1a2e", color: "#fff" });
    }
  };

  const handleConfirmSubmission = async (roomId, subId, recruiterComment, recruiterRating, recruiterConfirmed) => {
    try {
      await updateSubmissionEvaluation(roomId, subId, { recruiterComment, recruiterRating, recruiterConfirmed });
      const r = await getBattleRoom(roomId);
      setSelectedRoom(r.data.room);
      fetchRooms();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err?.response?.data?.message || "Confirmation failed.", background: "#1a1a2e", color: "#fff" });
    }
  };

  const handleShareResults = async (roomId, enabled) => {
    try {
      await updateBattleRoomStatus(roomId, { shareResults: Boolean(enabled) });
      if (selectedRoom?._id === roomId) {
        const r = await getBattleRoom(roomId);
        setSelectedRoom(r.data.room);
      }
      fetchRooms();
      Swal.fire({
        icon: "success",
        title: enabled ? "Ranking shared" : "Ranking hidden",
        text: enabled
          ? "Visitors can now see the published ranking state."
          : "Visitors are now kept waiting until ranking is shared again.",
        background: "#1a1a2e",
        color: "#fff",
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Share action failed",
        text: err?.response?.data?.message || "Could not update ranking visibility.",
        background: "#1a1a2e",
        color: "#fff",
      });
    }
  };

  const openVirtualRoomModal = () => {
    if (!virtualRoomStatus) {
      Swal.fire({ title: "Request Virtual Room", text: "Use your profile menu to request an interview room from admin.", icon: "info", background: "#1a1a2e", color: "#fff", confirmButtonColor: "#3b82f6" });
      return;
    }
    const roomLink =
      virtualRoomStatus.roomLink ||
      (virtualRoomStatus.roomSlug ? `/virtual-room/${virtualRoomStatus.roomSlug}` : "");
    const msg = virtualRoomStatus.adminMessage || "";
    let html = `<div style="text-align:left;color:#fff;">`;
    if (msg) html += `<p style="margin-bottom:12px;color:#94a3b8;"><strong>Admin message:</strong><br/>${msg}</p>`;
    if (roomLink) html += `<p style="margin-top:6px;color:#94a3b8;">Join the room inside FortCode.</p>`;
    else html += `<p style="color:#fbbf24;">Room is being generated. Please try again in a moment.</p>`;
    html += `</div>`;
    Swal.fire({
      title: "Virtual Room",
      html,
      icon: "success",
      background: "#1a1a2e",
      color: "#fff",
      confirmButtonColor: "#3b82f6",
      confirmButtonText: roomLink ? "Join room" : "OK",
    }).then((r) => {
      if (r.isConfirmed && roomLink) window.location.href = roomLink;
    });
  };

  const tabs = [
    { id: TAB.OVERVIEW, label: "Overview", icon: Briefcase },
    { id: TAB.ROOMS, label: "Battle Rooms", icon: ListChecks },
    { id: TAB.CREATE, label: "Create Room", icon: PlusCircle },
    { id: TAB.SUBMISSIONS, label: "Submissions", icon: FileCode },
    { id: TAB.SUPERVISE, label: "Supervise", icon: Radio },
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-slate-100 flex items-center gap-3">
            <span className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <Briefcase className="w-6 h-6" style={{ color: "var(--accent-color)" }} />
            </span>
            Recruiter Hub
          </h1>
          <p className="text-slate-400 mt-1">Create battle rooms, monitor submissions, and supervise coding tests.</p>
        </header>

        {/* Tabs */}
        <nav className="flex flex-wrap gap-2 mb-8 border-b border-slate-800 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedRoom(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                  ? "bg-slate-800 text-white border border-slate-600"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
                }`}
            >
              {React.createElement(tab.icon, { className: "w-4 h-4" })}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Overview */}
        {activeTab === TAB.OVERVIEW && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-5 bg-slate-900/90 border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Total rooms</p>
                    <p className="text-2xl font-bold text-slate-100">{rooms.length}</p>
                  </div>
                  <ListChecks className="w-10 h-10 text-slate-600" />
                </div>
              </Card>
              <Card className="p-5 bg-slate-900/90 border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Live battles</p>
                    <p className="text-2xl font-bold text-emerald-400">{rooms.filter((r) => r.status === "live").length}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-5 bg-slate-900/90 border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Ended</p>
                    <p className="text-2xl font-bold text-slate-300">{rooms.filter((r) => r.status === "ended").length}</p>
                  </div>
                </div>
              </Card>
            </div>
            <Card className={`p-6 border-2 ${virtualRoomStatus?.status === "approved" ? "border-emerald-500/30 bg-emerald-500/5" : virtualRoomStatus?.status === "pending" ? "border-amber-500/30 bg-amber-500/5" : "border-slate-700 bg-slate-900/50"}`}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center">
                    <Video className="w-7 h-7" style={{ color: "var(--accent-color)" }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-100">Virtual interview room</h2>
                    <p className="text-slate-400 text-sm">
                      {!virtualRoomStatus ? "Request a room from your profile menu." : virtualRoomStatus.status === "approved" ? "Approved — use the link from your profile." : virtualRoomStatus.status === "pending" ? "Pending admin approval." : "Request rejected."}
                    </p>
                  </div>
                </div>
                <button onClick={openVirtualRoomModal} className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700">
                  View details
                </button>
              </div>
            </Card>
            <Card className="p-6 bg-slate-900/50 border-slate-700">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-slate-100 font-semibold mb-2">Workflow</h3>
                  <ul className="text-slate-400 text-sm space-y-1 list-disc list-inside">
                    <li><strong className="text-slate-300">Create Battle Room</strong> — Add participant emails and set the challenge and time limit.</li>
                    <li><strong className="text-slate-300">Start battle</strong> — Room becomes visible to selected participants; they can submit code.</li>
                    <li><strong className="text-slate-300">Submissions</strong> — Review code, metrics, add comments and ratings.</li>
                    <li><strong className="text-slate-300">Supervise</strong> — Monitor in real time and confirm results before final scoring.</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Battle Rooms */}
        {activeTab === TAB.ROOMS && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-100">My battle rooms</h2>
              <button onClick={() => setActiveTab(TAB.CREATE)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium" style={{ backgroundColor: "var(--accent-color)" }}>
                <PlusCircle className="w-4 h-4" />
                Create room
              </button>
            </div>
            {rooms.length === 0 ? (
              <Card className="p-12 text-center text-slate-400">
                <ListChecks className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No battle rooms yet. Create one to run coding competitions or recruitment tests.</p>
                <button onClick={() => setActiveTab(TAB.CREATE)} className="mt-4 text-sm font-medium" style={{ color: "var(--accent-color)" }}>Create Battle Room</button>
              </Card>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400 text-left">
                      <th className="pb-3 pr-4">Title</th>
                      <th className="pb-3 pr-4">Challenge</th>
                      <th className="pb-3 pr-4">Language</th>
                      <th className="pb-3 pr-4">Time</th>
                      <th className="pb-3 pr-4">Participants</th>
                      <th className="pb-3 pr-4">Visitors</th>
                      <th className="pb-3 pr-4">Countdown</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((room) => (
                      <tr key={room._id} className="border-b border-slate-800 hover:bg-slate-800/30">
                        <td className="py-3 pr-4 font-medium text-slate-100">{room.title}</td>
                        <td className="py-3 pr-4 text-slate-400">{room.challenge?.title || "—"}</td>
                        <td className="py-3 pr-4 text-slate-400">{room.challenge?.language || "javascript"}</td>
                        <td className="py-3 pr-4 text-slate-400">{room.timeLimitMinutes} min</td>
                        <td className="py-3 pr-4 text-slate-400">{room.participants?.length || 0}</td>
                        <td className="py-3 pr-4 text-slate-400">{room.visitorAccessCount || 0}</td>
                        <td className={`py-3 pr-4 text-sm ${room.status === "live" && getRemainingMs(room.startedAt, room.timeLimitMinutes, now) != null && getRemainingMs(room.startedAt, room.timeLimitMinutes, now) <= 5 * 60 * 1000 ? "text-red-300 font-semibold" : "text-slate-400"}`}>
                          {room.status === "live"
                            ? formatRemaining(getRemainingMs(room.startedAt, room.timeLimitMinutes, now))
                            : room.status === "ended"
                              ? "Ended"
                              : "Not started"}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${room.status === "live" ? "bg-emerald-500/20 text-emerald-300" :
                              room.status === "ended" ? "bg-slate-600/30 text-slate-400" :
                                room.status === "draft" ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300"
                            }`}>
                            {room.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-right flex justify-end gap-2">
                          <button onClick={() => { setSelectedRoom(room); setActiveTab(TAB.SUBMISSIONS); }} className="px-3 py-1 rounded bg-slate-700 text-slate-200 hover:bg-slate-600 text-xs">Submissions</button>
                          {room.status === "draft" && <button onClick={() => handleStartEnd(room._id, "live")} className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-500 text-xs flex items-center gap-1"><Play className="w-3 h-3" /> Start</button>}
                          {room.status === "live" && <button onClick={() => handleStartEnd(room._id, "ended")} className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-500 text-xs flex items-center gap-1"><Square className="w-3 h-3" /> End</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Create Battle Room (User Story 4.4) */}
        {activeTab === TAB.CREATE && (
          <Card className="p-6 max-w-2xl">
            <h2 className="text-xl font-semibold text-slate-100 mb-6">Create battle room</h2>
            <p className="text-slate-400 text-sm mb-6">Set the challenge details and add participant emails. Invitees will receive a secure link and invitation code by email.</p>
            <form onSubmit={handleCreateRoom} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Room title *</label>
                <input type="text" value={createForm.title} onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Frontend Assessment" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description (optional)</label>
                <textarea value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Brief description of the battle" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Invite by email (non-registered users allowed)</label>
                <textarea
                  value={createForm.inviteEmailsText}
                  onChange={(e) => setCreateForm((f) => ({ ...f, inviteEmailsText: e.target.value }))}
                  rows={3}
                  placeholder="candidate1@email.com, candidate2@email.com"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-slate-500 mt-2">Each invitee receives a secure link and an invitation code by email.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Challenge title *</label>
                <input type="text" value={createForm.challengeTitle} onChange={(e) => setCreateForm((f) => ({ ...f, challengeTitle: e.target.value }))} placeholder="e.g. Two Sum" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500" />
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4 space-y-3">
                <p className="text-sm font-medium text-slate-200">AI Exercise Generator</p>
                <textarea
                  value={createForm.exercisePrompt}
                  onChange={(e) => setCreateForm((f) => ({ ...f, exercisePrompt: e.target.value }))}
                  rows={3}
                  placeholder="Describe the exercise you want to generate."
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Generation criteria</p>
                  <div className="flex flex-wrap gap-2">
                    {EXERCISE_CRITERIA_OPTIONS.map((criterion) => {
                      const selected = createForm.exerciseCriteria.includes(criterion);
                      return (
                        <button
                          key={criterion}
                          type="button"
                          onClick={() => setCreateForm((f) => ({
                            ...f,
                            exerciseCriteria: selected
                              ? f.exerciseCriteria.filter((item) => item !== criterion)
                              : [...f.exerciseCriteria, criterion],
                          }))}
                          className={`px-2.5 py-1 rounded-full text-xs border ${selected ? "bg-indigo-600/30 border-indigo-500 text-indigo-200" : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"}`}
                        >
                          {criterion}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={createForm.exerciseDifficulty}
                    onChange={(e) => setCreateForm((f) => ({ ...f, exerciseDifficulty: e.target.value }))}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                  <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={createForm.randomExercise}
                      onChange={(e) => setCreateForm((f) => ({ ...f, randomExercise: e.target.checked }))}
                    />
                    Random by criteria
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateExercise}
                    disabled={aiGenerating}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {aiGenerating ? "Generating..." : "Generate with AI"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Challenge description (optional)</label>
                <textarea value={createForm.challengeDescription} onChange={(e) => setCreateForm((f) => ({ ...f, challengeDescription: e.target.value }))} rows={3} placeholder="Describe the exercise or problem" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Programming language</label>
                <select
                  value={createForm.challengeLanguage}
                  onChange={(e) => setCreateForm((f) => ({ ...f, challengeLanguage: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="csharp">C#</option>
                  <option value="php">PHP</option>
                  <option value="go">Go</option>
                  <option value="ruby">Ruby</option>
                </select>
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300">Expected function names</label>
                {createForm.expectedFunctions.map((fn, idx) => (
                  <div key={`fn-${idx}`} className="flex gap-2">
                    <input
                      type="text"
                      value={fn}
                      onChange={(e) => {
                        const next = [...createForm.expectedFunctions];
                        next[idx] = e.target.value;
                        setCreateForm((f) => ({ ...f, expectedFunctions: next }));
                      }}
                      placeholder={idx === 0 ? "solve" : "anotherFunction"}
                      className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = createForm.expectedFunctions.filter((_, i) => i !== idx);
                        setCreateForm((f) => ({ ...f, expectedFunctions: next.length ? next : ["solve"] }));
                      }}
                      className="px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
                      title="Remove function"
                    >
                      -
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateForm((f) => ({ ...f, expectedFunctions: [...f.expectedFunctions, ""] }))}
                    className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700"
                  >
                    + Add function
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const template = buildChallengeTestTemplate(createForm.challengeLanguage, createForm.expectedFunctions);
                      setCreateForm((f) => ({ ...f, challengeTestCases: normalizeChallengeTestCases(template) }));
                    }}
                    className="px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-slate-100 hover:bg-slate-600"
                  >
                    Generate template
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium text-slate-300">Challenge tests</label>
                  <button
                    type="button"
                    onClick={() => setCreateForm((f) => ({
                      ...f,
                      challengeTestCases: [...(f.challengeTestCases || []), { name: `Test ${((f.challengeTestCases || []).length || 0) + 1}`, assertion: "", hidden: true }],
                    }))}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 text-sm"
                  >
                    + Add test
                  </button>
                </div>
                <div className="space-y-3">
                  {createForm.challengeTestCases.map((test, idx) => (
                    <div key={`challenge-test-${idx}`} className="rounded-lg border border-slate-700 bg-slate-900/40 p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs uppercase tracking-wide text-slate-400 mb-2">Name</label>
                          <input
                            type="text"
                            value={test.name}
                            onChange={(e) => setCreateForm((f) => ({
                              ...f,
                              challengeTestCases: f.challengeTestCases.map((item, itemIndex) => (
                                itemIndex === idx ? { ...item, name: e.target.value } : item
                              )),
                            }))}
                            placeholder="Basic"
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <label className="inline-flex items-center gap-2 text-xs text-slate-300 mb-2">
                            <input
                              type="checkbox"
                              checked={Boolean(test.hidden)}
                              onChange={(e) => setCreateForm((f) => ({
                                ...f,
                                challengeTestCases: f.challengeTestCases.map((item, itemIndex) => (
                                  itemIndex === idx ? { ...item, hidden: e.target.checked } : item
                                )),
                              }))}
                            />
                            Hidden
                          </label>
                          <button
                            type="button"
                            onClick={() => setCreateForm((f) => ({
                              ...f,
                              challengeTestCases: f.challengeTestCases.filter((_, itemIndex) => itemIndex !== idx),
                            }))}
                            className="px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wide text-slate-400 mb-2">Assertion</label>
                        <textarea
                          value={test.assertion}
                          onChange={(e) => setCreateForm((f) => ({
                            ...f,
                            challengeTestCases: f.challengeTestCases.map((item, itemIndex) => (
                              itemIndex === idx ? { ...item, assertion: e.target.value } : item
                            )),
                          }))}
                          rows={3}
                          placeholder="return solve(2, 3) === 5;"
                          className="w-full px-4 py-2.5 font-mono text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  Assertions run on server at submit time.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Exercise file (PDF or statement document)</label>
                <input
                  type="file"
                  accept=".pdf,.txt,.md,.doc,.docx,.zip"
                  onChange={(e) => setCreateForm((f) => ({ ...f, exerciseFile: e.target.files?.[0] || null }))}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 file:mr-3 file:px-3 file:py-1.5 file:rounded file:border-0 file:bg-slate-700 file:text-slate-100"
                />
                <p className="text-xs text-slate-500 mt-2">Allowed: PDF, TXT, MD, DOC, DOCX, ZIP (max 10 MB).</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Time limit (minutes) *</label>
                <input type="number" min={1} max={300} value={createForm.timeLimitMinutes} onChange={(e) => setCreateForm((f) => ({ ...f, timeLimitMinutes: Number(e.target.value) || 60 }))} className="w-32 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-lg text-white font-medium disabled:opacity-50" style={{ backgroundColor: "var(--accent-color)" }}>
                  {loading ? "Creating…" : "Create room"}
                </button>
                <button type="button" onClick={() => setActiveTab(TAB.ROOMS)} className="px-6 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700">Cancel</button>
              </div>
            </form>
          </Card>
        )}

        {/* Submissions (User Story 4.5) */}
        {activeTab === TAB.SUBMISSIONS && (
          <div className="space-y-6">
            {!selectedRoom ? (
              <>
                <h2 className="text-xl font-semibold text-slate-100">Review submissions</h2>
                <p className="text-slate-400 text-sm">Select a battle room to view and evaluate participant submissions.</p>
                <div className="grid gap-3">
                  {rooms.filter((r) => r.status === "live" || r.status === "ended").map((room) => (
                    <Card key={room._id} className="p-4 flex items-center justify-between hover:border-slate-600 cursor-pointer" onClick={() => getBattleRoom(room._id).then((r) => setSelectedRoom(r.data.room))}>
                      <div>
                        <p className="font-medium text-slate-100">{room.title}</p>
                        <p className="text-slate-500 text-sm">{room.challenge?.title} · {room.participants?.length || 0} participants</p>
                      </div>
                      <span className="text-slate-400 text-sm">{room.status}</span>
                    </Card>
                  ))}
                  {rooms.filter((r) => r.status === "live" || r.status === "ended").length === 0 && (
                    <Card className="p-8 text-center text-slate-500">No live or ended rooms. Start a battle first.</Card>
                  )}
                </div>
              </>
            ) : (
              <SubmissionView room={selectedRoom} onBack={() => setSelectedRoom(null)} onSaveEvaluation={handleSaveEvaluation} onConfirmSubmission={handleConfirmSubmission} onShareResults={handleShareResults} onRefresh={() => getBattleRoom(selectedRoom._id).then((r) => setSelectedRoom(r.data.room))} />
            )}
          </div>
        )}

        {/* Supervise (User Story 4.6) */}
        {activeTab === TAB.SUPERVISE && (
          <Card className="p-8 border-slate-700">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center">
                <Radio className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-100">Supervise battle</h2>
                <p className="text-slate-400 text-sm">Real-time monitoring and confirm results before final scoring.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <h3 className="text-slate-200 font-medium mb-2">Live monitoring</h3>
                <p className="text-slate-500 text-sm">Monitor participant code execution in real time. Select a live battle from Battle Rooms to start supervising.</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <h3 className="text-slate-200 font-medium mb-2">Alerts</h3>
                <p className="text-slate-500 text-sm">Alerts for errors or suspicious behavior will appear here when a battle is live.</p>
              </div>
            </div>
            <p className="text-slate-500 text-sm mt-4">Start a battle from the Battle Rooms tab, then return here to supervise. Results can be confirmed in Submissions.</p>
          </Card>
        )}
      </div>
      <ScrollButton />
    </div>
  );
}

function SubmissionView({ room, onBack, onSaveEvaluation, onConfirmSubmission, onShareResults, onRefresh }) {
  const submissions = (room.submissions || []).map(invalidateNonCodeSubmission);
  const generatedExercise = room?.challenge?.generatedExerciseSnapshot?.exercise || null;
  const expectedOutputText = generatedExercise?.expectedOutput
    || (generatedExercise?.testCases?.length
      ? `Derived from tests:\n${generatedExercise.testCases.slice(0, 3).map((test, index) => `- ${test.name || `Test ${index + 1}`}: ${test.assertion || ""}`).join("\n")}`
      : "No expected output stored.");
  const ranking = buildVisitorRanking(submissions);
  const nonCodeByEmail = submissions.reduce((acc, sub) => {
    const email = String(sub?.participant?.email || "").toLowerCase();
    if (sub?._invalidNonCodeInput && email) acc[email] = true;
    return acc;
  }, {});
  const visitors = (room.visitorDetails || []).map((visitor) => {
    const email = String(visitor?.email || "").toLowerCase();
    if (!email || !nonCodeByEmail[email]) return visitor;
    return {
      ...visitor,
      qualityGrade: "Invalid",
      qualityScore: 0,
      correctnessScore: 0,
      finalScore: 0,
      offTopic: true,
      sonarSummary: "Submission is not valid source code. Sonar result ignored.",
    };
  });
  const [editingSub, setEditingSub] = useState(null);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(null);

  useEffect(() => {
    if (room?.status !== "live") return undefined;
    const timer = setInterval(() => onRefresh(), 4000);
    return () => clearInterval(timer);
  }, [room?.status, onRefresh]);

  const openEdit = (sub) => {
    setEditingSub(sub._id);
    setComment(sub.recruiterComment || "");
    setRating(sub.recruiterRating ?? null);
  };

  const saveEdit = () => {
    if (!editingSub) return;
    onSaveEvaluation(room._id, editingSub, comment, rating ?? undefined);
    setEditingSub(null);
    setComment("");
    setRating(null);
  };

  const shareRanking = async () => {
    if (!ranking.length) {
      Swal.fire({
        icon: "info",
        title: "No ranking available",
        text: "No visitor submission has been ranked yet.",
        background: "#1a1a2e",
        color: "#fff",
      });
      return;
    }

    const lines = [
      `Ranking for ${room.title}`,
      `Challenge: ${room.challenge?.title || "Coding Challenge"}`,
      "",
      ...ranking.map((item) => {
        const parts = [
          `#${item.rank} ${item.name}`,
          `score ${item.score}/100`,
          `correctness ${item.correctnessScore}/100`,
        ];
        if (item.executionTimeMs != null) parts.push(`${item.executionTimeMs} ms`);
        return parts.join(" · ");
      }),
    ];

    const text = lines.join("\n");
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      Swal.fire({
        icon: "success",
        title: "Ranking ready to share",
        text: "The visitor ranking has been copied to your clipboard.",
        background: "#1a1a2e",
        color: "#fff",
      });
    } catch {
      Swal.fire({
        icon: "info",
        title: "Share ranking",
        text,
        background: "#1a1a2e",
        color: "#fff",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-200 text-sm">← Back to rooms</button>
        <button onClick={onRefresh} className="text-slate-400 hover:text-slate-200 text-sm">Refresh</button>
      </div>
      <h2 className="text-xl font-semibold text-slate-100">{room.title} — Submissions</h2>

      <Card className="p-5 bg-slate-900/90 border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <p className="text-slate-300 font-medium">Live supervision</p>
            <p className="text-slate-500 text-xs">Auto-refreshes every 4 seconds while the battle is live.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={() => onShareResults(room._id, !room?.resultsShared)}
              className={`px-3 py-1.5 rounded text-white text-xs ${room?.resultsShared ? "bg-slate-600 hover:bg-slate-500" : "bg-indigo-600 hover:bg-indigo-500"}`}
            >
              {room?.resultsShared ? "Hide ranking from visitors" : "Show ranking to visitors"}
            </button>
            <button
              onClick={shareRanking}
              className="px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-500 text-xs"
            >
              Copy visitor ranking
            </button>
            <span className={`text-xs px-2 py-1 rounded ${room.status === "live" ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-slate-300"}`}>
              {room.status}
            </span>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3 text-sm">
          <div className="p-3 rounded bg-slate-950 border border-slate-800">
            <p className="text-slate-500 text-xs">Visitors</p>
            <p className="text-slate-100 text-lg font-semibold">{visitors.length}</p>
          </div>
          <div className="p-3 rounded bg-slate-950 border border-slate-800">
            <p className="text-slate-500 text-xs">Confirmed</p>
            <p className="text-slate-100 text-lg font-semibold">{submissions.filter((s) => s.recruiterConfirmed).length}</p>
          </div>
          <div className="p-3 rounded bg-slate-950 border border-slate-800">
            <p className="text-slate-500 text-xs">Alerts</p>
            <p className="text-slate-100 text-lg font-semibold">{submissions.reduce((acc, s) => acc + (s.securityAlerts?.length || 0), 0)}</p>
          </div>
        </div>
      </Card>

      <Card className="p-5 bg-slate-900/90 border-slate-800">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <p className="text-slate-300 font-medium">Visitor ranking</p>
            <p className="text-slate-500 text-xs">Sorted by final score, correctness, then execution time.</p>
          </div>
          <span className="text-xs text-slate-400">{ranking.length} ranked visitor(s)</span>
        </div>
        {ranking.length === 0 ? (
          <p className="text-slate-500 text-sm">No submitted code yet. The ranking will appear after a visitor submits code.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-slate-400">
                  <th className="pb-2 pr-4">Rank</th>
                  <th className="pb-2 pr-4">Visitor</th>
                  <th className="pb-2 pr-4">Final score</th>
                  <th className="pb-2 pr-4">Correctness</th>
                  <th className="pb-2 pr-4">Time</th>
                  <th className="pb-2 pr-4">Output</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((item) => (
                  <tr key={`${item.email || item.name}-${item.rank}`} className="border-b border-slate-800/70">
                    <td className="py-2 pr-4 text-slate-300 font-semibold">#{item.rank}</td>
                    <td className="py-2 pr-4 text-slate-200">
                      {item.name}
                      {item.email ? <div className="text-slate-500 text-xs">{item.email}</div> : null}
                    </td>
                    <td className="py-2 pr-4 text-slate-300">{item.score}/100</td>
                    <td className="py-2 pr-4 text-slate-300">{item.correctnessScore}/100</td>
                    <td className="py-2 pr-4 text-slate-400">{item.executionTimeMs != null ? `${item.executionTimeMs} ms` : "—"}</td>
                    <td className="py-2 pr-4 text-slate-500 text-xs max-w-xs">
                      {item.outputSnapshot || "No output captured yet."}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-5 bg-slate-900/90 border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-slate-300 font-medium">Visitor access list</p>
            <p className="text-slate-500 text-xs">Accepted invitations with email and access time.</p>
          </div>
          <span className="text-xs text-slate-400">{visitors.length} visitor(s)</span>
        </div>
        {visitors.length === 0 ? (
          <p className="text-slate-500 text-sm">No visitor has accessed this room yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-slate-400">
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Accepted at</th>
                  <th className="pb-2 pr-4">Quality</th>
                  <th className="pb-2 pr-4">Alerts</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((visitor, index) => (
                  <tr key={`${visitor.email}-${index}`} className="border-b border-slate-800/70">
                    <td className="py-2 pr-4 text-slate-200">{visitor.email}</td>
                    <td className="py-2 pr-4 text-slate-400">
                      {visitor.acceptedAt ? new Date(visitor.acceptedAt).toLocaleString() : "—"}
                    </td>
                    <td className="py-2 pr-4 text-slate-300">
                      {visitor.qualityGrade || "—"}
                      {visitor.qualityScore != null ? ` (${visitor.qualityScore}/100)` : ""}
                      {visitor.correctnessScore != null ? ` · C:${visitor.correctnessScore}/100` : ""}
                      {visitor.finalScore != null ? ` · F:${visitor.finalScore}/100` : ""}
                      {visitor.offTopic ? " · Off-topic" : ""}
                    </td>
                    <td className="py-2 pr-4 text-slate-400">
                      {visitor.fraudDetected
                        ? `Fraud: ${visitor.fraudReason || "focus-lost"}`
                        : (visitor.securityAlerts?.length ? visitor.securityAlerts.join("; ") : "No alerts")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {submissions.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">No submissions yet.</Card>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <Card key={sub._id} className="p-6 bg-slate-900/90 border-slate-800">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-medium">
                    {(sub.participant?.username || sub.participant?.nickname || "P")[0]}
                  </div>
                  <div>
                    <p className="font-medium text-slate-100">{sub.participant?.username || sub.participant?.nickname || "Participant"}</p>
                    <p className="text-slate-500 text-xs">{sub.participant?.email}</p>
                    {sub.fraudDetected && (
                      <p className="text-red-300 text-xs mt-1">Fraud flagged: {sub.fraudReason || "focus-lost"}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => editingSub === sub._id && setRating(n)} className={`p-1 ${editingSub === sub._id ? "hover:opacity-80" : ""} ${(sub.recruiterRating ?? rating) >= n ? "text-amber-400" : "text-slate-600"}`}>
                      <Star className="w-5 h-5" fill={(sub.recruiterRating ?? rating) >= n ? "currentColor" : "none"} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <div>
                  <p className="text-slate-400 mb-1">Performance</p>
                  <p className="text-slate-200">Score: {sub.score} · Time: {sub.executionTimeMs != null ? `${sub.executionTimeMs} ms` : "—"}</p>
                  {sub.metrics?.passedTests != null && <p className="text-slate-400">Tests: {sub.metrics.passedTests}/{sub.metrics.totalTests}</p>}
                  {sub.correctnessScore != null && <p className="text-slate-400">Correctness: {sub.correctnessScore}/100</p>}
                  {sub.finalScore != null && <p className="text-slate-300 font-semibold">Final score: {sub.finalScore}/100</p>}
                  {sub.offTopic && <p className="text-amber-300 text-xs mt-1">Off-topic probable: low functional correctness</p>}
                </div>
                <div>
                  <p className="text-slate-400 mb-1">SonarQube results</p>
                  <p className="text-slate-100">Grade: <span className="font-semibold">{sub.qualityGrade || "—"}</span>{sub.qualityScore != null ? ` · Score: ${sub.qualityScore}/100` : ""}</p>
                  <p className="text-slate-400 text-xs mt-1">Source: {sub.sonarSource || "heuristic"}{sub.qualityGateStatus ? ` · Quality Gate: ${sub.qualityGateStatus}` : ""}</p>
                  {sub.sonarProjectKey && <p className="text-slate-500 text-xs mt-1">Project Key: {sub.sonarProjectKey}</p>}
                  <p className="text-slate-500 text-xs mt-1">{sub.sonarSummary || "No quality summary yet."}</p>
                  {sub._invalidNonCodeInput && (
                    <p className="text-red-300 text-xs mt-2">Invalid submission content: Sonar ignored, score forced to 0.</p>
                  )}
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <p className="text-slate-500">Security</p>
                      <p className="text-slate-200 font-semibold">{sonarLetter(sub.sonarMetrics?.securityRating)}{sub.sonarMetrics?.vulnerabilities != null ? ` · ${sub.sonarMetrics.vulnerabilities}` : ""}</p>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <p className="text-slate-500">Reliability</p>
                      <p className="text-slate-200 font-semibold">{sonarLetter(sub.sonarMetrics?.reliabilityRating)}{sub.sonarMetrics?.bugs != null ? ` · ${sub.sonarMetrics.bugs}` : ""}</p>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <p className="text-slate-500">Maintainability</p>
                      <p className="text-slate-200 font-semibold">{sonarLetter(sub.sonarMetrics?.maintainabilityRating)}{sub.sonarMetrics?.codeSmells != null ? ` · ${sub.sonarMetrics.codeSmells}` : ""}</p>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <p className="text-slate-500">Hotspots Reviewed</p>
                      <p className="text-slate-200 font-semibold">{sub.sonarMetrics?.securityHotspotsReviewed != null ? `${sub.sonarMetrics.securityHotspotsReviewed}%` : "-"}</p>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <p className="text-slate-500">Duplications</p>
                      <p className="text-slate-200 font-semibold">{sub.sonarMetrics?.duplications != null ? `${sub.sonarMetrics.duplications}%` : "-"}</p>
                    </div>
                  </div>
                  {sub.securityAlerts?.length > 0 && (
                    <p className="text-red-300 text-xs mt-2">Alerts: {sub.securityAlerts.join(" · ")}</p>
                  )}
                </div>
              </div>
              {sub.code && (
                <div className="mt-4">
                  <p className="text-slate-400 text-sm mb-2">Submitted code</p>
                  <pre className="p-4 bg-slate-950 rounded-lg border border-slate-700 text-slate-300 text-xs overflow-x-auto max-h-48">{sub.code}</pre>
                </div>
              )}
              <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm">
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                  <p className="text-slate-400 mb-2">Generated exercise snapshot</p>
                  {generatedExercise ? (
                    <div className="space-y-2 text-slate-300">
                      <p><span className="text-slate-500">Title:</span> {generatedExercise.title || "—"}</p>
                      <p><span className="text-slate-500">Language:</span> {generatedExercise.language || "—"}</p>
                      <p><span className="text-slate-500">Function(s):</span> {(generatedExercise.expectedFunctions || []).join(", ") || "—"}</p>
                      <p className="text-slate-500 text-xs whitespace-pre-wrap">{generatedExercise.description || "No description stored."}</p>
                      <div className="rounded border border-slate-800 bg-slate-900/60 p-2 mt-2">
                        <p className="text-slate-500 text-xs uppercase tracking-wide">Expected output</p>
                        <pre className="text-[11px] leading-5 text-slate-300 whitespace-pre-wrap break-words mt-1">{expectedOutputText}</pre>
                      </div>
                      <div className="space-y-2 pt-2">
                        {(generatedExercise.testCases || []).slice(0, 3).map((test, index) => (
                          <div key={`${test.name || "test"}-${index}`} className="rounded border border-slate-800 bg-slate-900/60 p-2">
                            <p className="text-slate-200 text-xs font-medium">{test.name || `Test ${index + 1}`}</p>
                            <p className="text-slate-500 text-[11px] mt-1 whitespace-pre-wrap">{test.assertion || "No assertion"}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-xs">No generated exercise snapshot stored for this room.</p>
                  )}
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                  <p className="text-slate-400 mb-2">Visitor output snapshot</p>
                  <pre className="text-[11px] leading-5 text-slate-300 whitespace-pre-wrap break-words bg-slate-900/60 border border-slate-800 rounded p-3 max-h-64 overflow-auto">
                    {sub.outputSnapshot || "No output captured yet. Run or submit once after this update to store execution output."}
                  </pre>
                </div>
              </div>
              {generatedExercise?.testCases?.length > 0 && (
                <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-sm">
                  <p className="text-slate-400 mb-2">Expected comparison</p>
                  <p className="text-slate-300 text-xs whitespace-pre-wrap">
                    {expectedOutputText}
                  </p>
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-slate-800">
                {editingSub === sub._id ? (
                  <div className="space-y-2">
                    <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Your comment or feedback" rows={2} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm placeholder-slate-500" />
                    <div className="flex gap-2">
                      <button onClick={saveEdit} className="px-4 py-2 rounded bg-slate-700 text-slate-200 hover:bg-slate-600 text-sm">Save</button>
                      <button onClick={() => setEditingSub(null)} className="px-4 py-2 rounded border border-slate-600 text-slate-400 hover:bg-slate-800 text-sm">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    {sub.recruiterComment ? <p className="text-slate-400 text-sm flex-1"><MessageSquare className="w-4 h-4 inline mr-1" />{sub.recruiterComment}</p> : <span className="text-slate-500 text-sm">No comment yet.</span>}
                    <button onClick={() => openEdit(sub)} className="text-xs px-3 py-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600">Add / Edit comment</button>
                    <button
                      onClick={() => onConfirmSubmission(room._id, sub._id, sub.recruiterComment || comment, sub.recruiterRating ?? rating ?? undefined, true)}
                      className="text-xs px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-500"
                    >
                      {sub.recruiterConfirmed ? "Confirmed" : "Confirm result"}
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
