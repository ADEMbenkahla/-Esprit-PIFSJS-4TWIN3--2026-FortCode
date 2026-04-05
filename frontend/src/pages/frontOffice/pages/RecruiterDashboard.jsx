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
  getParticipants,
  generateBattleExercise,
  createBattleRoom as apiCreateBattleRoom,
  getMyBattleRooms,
  getBattleRoom,
  updateBattleRoomStatus,
  updateSubmissionEvaluation,
} from "../../../services/api";
import Swal from "sweetalert2";

const TAB = { OVERVIEW: "overview", ROOMS: "rooms", CREATE: "create", SUBMISSIONS: "submissions", SUPERVISE: "supervise" };

export function RecruiterDashboard() {
  const [activeTab, setActiveTab] = useState(TAB.OVERVIEW);
  const [virtualRoomStatus, setVirtualRoomStatus] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generatingExercise, setGeneratingExercise] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    participantIds: [],
    challengeTitle: "Coding Challenge",
    challengeDescription: "",
    expectedFunctionName: "solve",
    starterCode: "",
    language: "javascript",
    testCasesJson: "[]",
    exerciseFile: null,
    timeLimitMinutes: 60,
  });

  const fetchVirtualRoom = () => {
    getMyVirtualRoomRequest()
      .then((r) => setVirtualRoomStatus(r.data.request))
      .catch(() => setVirtualRoomStatus(null));
  };
  const fetchParticipants = () => {
    getParticipants()
      .then((r) => setParticipants(r.data.participants || []))
      .catch(() => setParticipants([]));
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
    if (activeTab === TAB.CREATE) fetchParticipants();
    if (activeTab === TAB.ROOMS || activeTab === TAB.SUBMISSIONS) fetchRooms();
  }, [activeTab]);

  const handleGenerateExercise = async () => {
    const prompt = createForm.challengeDescription?.trim() || createForm.title?.trim();
    if (!prompt) {
      Swal.fire({ icon: "warning", title: "Prompt required", text: "Enter challenge description (or room title) before generating.", background: "#1a1a2e", color: "#fff" });
      return;
    }

    setGeneratingExercise(true);
    try {
      const expectedFunctionName = (createForm.expectedFunctionName || "solve").trim();
      const { data } = await generateBattleExercise({
        prompt,
        difficulty: "medium",
        language: createForm.language || "javascript",
        expectedFunctionName,
        randomize: true,
      });

      const exercise = data?.exercise || {};
      const generatedTests = Array.isArray(exercise.testCases) ? exercise.testCases : [];
      setCreateForm((f) => ({
        ...f,
        challengeTitle: exercise.title || f.challengeTitle,
        challengeDescription: exercise.description || f.challengeDescription,
        starterCode: exercise.starterCode || f.starterCode,
        language: exercise.language || "javascript",
        expectedFunctionName: (exercise.expectedFunctions && exercise.expectedFunctions[0]) || expectedFunctionName,
        testCasesJson: JSON.stringify(generatedTests, null, 2),
      }));

      Swal.fire({
        icon: "success",
        title: "Exercise generated",
        text: `Generated ${generatedTests.length} test cases.`,
        background: "#1a1a2e",
        color: "#fff",
      });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Generation failed", text: err?.response?.data?.message || "Could not generate exercise.", background: "#1a1a2e", color: "#fff" });
    } finally {
      setGeneratingExercise(false);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      Swal.fire({ icon: "warning", title: "Title required", text: "Enter a room title.", background: "#1a1a2e", color: "#fff" });
      return;
    }

    let parsedTestCases = [];
    try {
      const parsed = JSON.parse(createForm.testCasesJson || "[]");
      parsedTestCases = Array.isArray(parsed) ? parsed : [];
    } catch {
      Swal.fire({
        icon: "warning",
        title: "Invalid tests JSON",
        text: "Challenge tests must be a valid JSON array.",
        background: "#1a1a2e",
        color: "#fff",
      });
      return;
    }

    setLoading(true);
    try {
      await apiCreateBattleRoom({
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        participantIds: createForm.participantIds,
        challenge: {
          title: createForm.challengeTitle || "Coding Challenge",
          description: createForm.challengeDescription,
          starterCode: createForm.starterCode,
          language: createForm.language || "javascript",
          expectedFunctionName: (createForm.expectedFunctionName || "solve").trim(),
          expectedFunctions: [(createForm.expectedFunctionName || "solve").trim()].filter(Boolean),
          testCases: parsedTestCases,
        },
        exerciseFile: createForm.exerciseFile,
        timeLimitMinutes: createForm.timeLimitMinutes || 60,
      });
      Swal.fire({ icon: "success", title: "Room created", text: "Battle room is ready. You can start it when participants are ready.", background: "#1a1a2e", color: "#fff" });
      setCreateForm({
        title: "",
        description: "",
        participantIds: [],
        challengeTitle: "Coding Challenge",
        challengeDescription: "",
        expectedFunctionName: "solve",
        starterCode: "",
        language: "javascript",
        testCasesJson: "[]",
        exerciseFile: null,
        timeLimitMinutes: 60,
      });
      fetchRooms();
      setActiveTab(TAB.ROOMS);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err?.response?.data?.message || "Could not create room.", background: "#1a1a2e", color: "#fff" });
    } finally {
      setLoading(false);
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
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setSelectedRoom(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === id
                  ? "bg-slate-800 text-white border border-slate-600"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
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
                    <li><strong className="text-slate-300">Create Battle Room</strong> — Select participants, set challenge and time limit.</li>
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
                      <th className="pb-3 pr-4">Time</th>
                      <th className="pb-3 pr-4">Participants</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((room) => (
                      <tr key={room._id} className="border-b border-slate-800 hover:bg-slate-800/30">
                        <td className="py-3 pr-4 font-medium text-slate-100">{room.title}</td>
                        <td className="py-3 pr-4 text-slate-400">{room.challenge?.title || "—"}</td>
                        <td className="py-3 pr-4 text-slate-400">{room.timeLimitMinutes} min</td>
                        <td className="py-3 pr-4 text-slate-400">{room.participants?.length || 0}</td>
                        <td className="py-3 pr-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            room.status === "live" ? "bg-emerald-500/20 text-emerald-300" :
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
            <p className="text-slate-400 text-sm mb-6">Select participants, set the challenge and time limit. The room will be visible only to selected participants.</p>
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
                <label className="block text-sm font-medium text-slate-300 mb-2">Participants</label>
                <div className="max-h-48 overflow-y-auto border border-slate-700 rounded-lg p-3 bg-slate-800/50 space-y-2">
                  {participants.length === 0 ? <p className="text-slate-500 text-sm">No participants in the system yet.</p> : participants.map((p) => (
                    <label key={p._id} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={createForm.participantIds.includes(p._id)} onChange={(e) => setCreateForm((f) => ({ ...f, participantIds: e.target.checked ? [...f.participantIds, p._id] : f.participantIds.filter((id) => id !== p._id) }))} className="rounded border-slate-600 text-blue-500" />
                      <span className="text-slate-200">{p.username || p.nickname}</span>
                      <span className="text-slate-500 text-xs">{p.email}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Challenge title *</label>
                <input type="text" value={createForm.challengeTitle} onChange={(e) => setCreateForm((f) => ({ ...f, challengeTitle: e.target.value }))} placeholder="e.g. Two Sum" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Challenge description (optional)</label>
                <textarea value={createForm.challengeDescription} onChange={(e) => setCreateForm((f) => ({ ...f, challengeDescription: e.target.value }))} rows={3} placeholder="Describe the exercise or problem" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Programming language *</label>
                <select
                  value={createForm.language}
                  onChange={(e) => setCreateForm((f) => ({ ...f, language: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Expected function name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={createForm.expectedFunctionName}
                    onChange={(e) => setCreateForm((f) => ({ ...f, expectedFunctionName: e.target.value }))}
                    placeholder="e.g. calculPair"
                    className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateExercise}
                    disabled={generatingExercise}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 whitespace-nowrap"
                  >
                    {generatingExercise ? "Generating..." : "Generate template"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Challenge tests (JSON)</label>
                <textarea
                  value={createForm.testCasesJson}
                  onChange={(e) => setCreateForm((f) => ({ ...f, testCasesJson: e.target.value }))}
                  rows={8}
                  placeholder='[{"name":"sum basic","assertion":"sum(2,3) === 5","hidden":false}]'
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-2">Assertions run on server at submit time. Example assertion: return solve(2, 3) === 5;</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Starter code (auto-filled)</label>
                <textarea
                  value={createForm.starterCode}
                  onChange={(e) => setCreateForm((f) => ({ ...f, starterCode: e.target.value }))}
                  rows={8}
                  placeholder="Generated starter code will appear here"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Exercise file (PDF or statement document)</label>
                <input
                  type="file"
                  accept=".pdf,.txt,.md,.doc,.docx,.zip"
                  onChange={(e) => setCreateForm((f) => ({ ...f, exerciseFile: e.target.files?.[0] || null }))}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 file:mr-3 file:px-3 file:py-1.5 file:rounded file:border-0 file:bg-slate-700 file:text-slate-200"
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
              <SubmissionView room={selectedRoom} onBack={() => setSelectedRoom(null)} onSaveEvaluation={handleSaveEvaluation} onRefresh={() => getBattleRoom(selectedRoom._id).then((r) => setSelectedRoom(r.data.room))} />
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

function SubmissionView({ room, onBack, onSaveEvaluation, onRefresh }) {
  const submissions = room.submissions || [];
  const [editingSub, setEditingSub] = useState(null);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(null);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-200 text-sm">← Back to rooms</button>
        <button onClick={onRefresh} className="text-slate-400 hover:text-slate-200 text-sm">Refresh</button>
      </div>
      <h2 className="text-xl font-semibold text-slate-100">{room.title} — Submissions</h2>
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
                </div>
                <div>
                  <p className="text-slate-400 mb-1">Analysis (placeholder)</p>
                  <p className="text-slate-500 text-xs">SonarQube & AI feedback integration coming soon.</p>
                </div>
              </div>
              {sub.code && (
                <div className="mt-4">
                  <p className="text-slate-400 text-sm mb-2">Submitted code</p>
                  <pre className="p-4 bg-slate-950 rounded-lg border border-slate-700 text-slate-300 text-xs overflow-x-auto max-h-48">{sub.code}</pre>
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
                  <div className="flex items-center gap-2">
                    {sub.recruiterComment ? <p className="text-slate-400 text-sm flex-1"><MessageSquare className="w-4 h-4 inline mr-1" />{sub.recruiterComment}</p> : <span className="text-slate-500 text-sm">No comment yet.</span>}
                    <button onClick={() => openEdit(sub)} className="text-xs px-3 py-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600">Add / Edit comment</button>
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
