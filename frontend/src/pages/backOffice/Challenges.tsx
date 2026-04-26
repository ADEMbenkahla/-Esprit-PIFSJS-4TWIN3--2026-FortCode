import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import Sidebar from "./components/Sidebar";
import { adminChallengesApi, adminStagesApi } from "../../services/api";

const inputClass =
  "w-full bg-background-dark border border-purple-900/30 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-primary transition-colors";

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-dark border border-purple-900/20 rounded-xl w-full max-w-5xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-purple-900/20 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <span className="material-icons-outlined">close</span>
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

const emptyForm = () => ({
  title: "",
  description: "",
  difficulty: "medium",
  category: "general",
  type: "Stage",
  constraints: "",
  language: "javascript",
  starterCode: "",
  testCasesJson: "[]",
  xpReward: 100,
  stageId: "",
});

export default function Challenges() {
  const [challenges, setChallenges] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [formData, setFormData] = useState(emptyForm());

  const [aiOpen, setAiOpen] = useState(true);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    try {
      const [challengeRes, stageRes] = await Promise.all([adminChallengesApi.list(), adminStagesApi.list()]);
      setChallenges(Array.isArray(challengeRes.data) ? challengeRes.data : []);
      setStages(Array.isArray(stageRes.data) ? stageRes.data : []);
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return challenges;
    return challenges.filter((c) => {
      const text = `${c.title || ""} ${c.description || ""} ${c.category || ""} ${c.type || ""}`.toLowerCase();
      return text.includes(q);
    });
  }, [challenges, search]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name === "type" && value === "Battle") {
        return { ...prev, type: "Battle", stageId: "" };
      }
      if (name === "stageId" && value) {
        return { ...prev, stageId: value, type: "Stage" };
      }
      return { ...prev, [name]: value };
    });
  };

  const openAddModal = () => {
    setEditingChallenge(null);
    setFormData(emptyForm());
    setAiPrompt("");
    setAiDifficulty("medium");
    setAiOpen(true);
    setIsModalOpen(true);
  };

  const openEditModal = (challenge) => {
    setEditingChallenge(challenge);
    setFormData({
      title: challenge.title || "",
      description: challenge.description || "",
      difficulty: challenge.difficulty || "medium",
      category: challenge.category || "general",
      type: challenge.type || "Stage",
      constraints: challenge.constraints || "",
      language: challenge.language || "javascript",
      starterCode: challenge.starterCode || "",
      testCasesJson: JSON.stringify(challenge.testCases?.length ? challenge.testCases : [], null, 2),
      xpReward: challenge.xpReward || 100,
      stageId: challenge.stageId?._id || challenge.stageId || "",
    });
    setAiOpen(false);
    setIsModalOpen(true);
  };

  const handleGenerateDraft = async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    try {
      const { data } = await adminChallengesApi.generateDraft({
        prompt: aiPrompt,
        difficulty: aiDifficulty,
        language: formData.language || "javascript",
        functionName: "solve",
        count: 1,
        useFallbackOnError: true,
      });
      const ex = data?.exercise || {};
      setFormData((prev) => ({
        ...prev,
        title: ex.title || prev.title,
        description: ex.description || prev.description,
        difficulty: ex.difficulty || prev.difficulty,
        language: ex.language || prev.language,
        starterCode: typeof ex.starterCode === "string" ? ex.starterCode : prev.starterCode,
        constraints: typeof ex.constraints === "string" ? ex.constraints : prev.constraints,
        xpReward: ex.xpReward ?? prev.xpReward,
        testCasesJson: Array.isArray(ex.testCases) && ex.testCases.length
          ? JSON.stringify(ex.testCases, null, 2)
          : prev.testCasesJson,
        type: "Stage",
      }));
      Swal.fire({
        title: data?.source === "fallback" ? "Fallback draft generated" : "Draft generated",
        text:
          data?.source === "fallback"
            ? "AI failed, so a fallback draft was generated. Review before saving."
            : "AI draft has been inserted into the form.",
        icon: data?.source === "fallback" ? "warning" : "success",
        timer: 1700,
        showConfirmButton: false,
        background: "#1a1a2e",
        color: "#fff",
      });
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || error.message, "error");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let testCases = [];
    try {
      const parsed = JSON.parse(formData.testCasesJson || "[]");
      testCases = Array.isArray(parsed) ? parsed : [];
    } catch {
      Swal.fire("Error", "Invalid tests JSON.", "error");
      return;
    }

    const payload = {
      title: formData.title,
      description: formData.description,
      difficulty: formData.difficulty,
      category: (formData.category && formData.category.trim()) || "general",
      type: formData.type,
      constraints: formData.constraints,
      language: formData.language,
      starterCode: formData.starterCode ?? "",
      testCases,
      xpReward: Number(formData.xpReward) || 100,
      stageId: formData.type === "Stage" ? formData.stageId || null : null,
    };

    try {
      if (editingChallenge) {
        await adminChallengesApi.update(editingChallenge._id, payload);
      } else {
        await adminChallengesApi.create(payload);
      }
      Swal.fire({
        title: "Saved",
        text: `Challenge ${editingChallenge ? "updated" : "created"} successfully.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
        background: "#1a1a2e",
        color: "#fff",
      });
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || error.message, "error");
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Delete challenge?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      background: "#1a1a2e",
      color: "#fff",
    });
    if (!result.isConfirmed) return;
    try {
      await adminChallengesApi.remove(id);
      fetchData();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || error.message, "error");
    }
  };

  return (
    <div className="flex h-screen bg-background-dark font-body text-gray-200 overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-surface-dark border border-purple-900/20 p-6 rounded-xl">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Challenges</h1>
            <p className="text-gray-400">Manage coding challenges and generate AI drafts in English.</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg font-medium"
          >
            <span className="material-icons-outlined">add</span>
            New Challenge
          </button>
        </div>

        <div className="bg-surface-dark border border-purple-900/20 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-purple-900/20">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search challenges..."
              className={inputClass}
            />
          </div>
          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading challenges...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No challenges found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-purple-900/20 border-b border-purple-900/20">
                    <th className="p-4 text-sm font-semibold text-gray-400">Title</th>
                    <th className="p-4 text-sm font-semibold text-gray-400">Category</th>
                    <th className="p-4 text-sm font-semibold text-gray-400">Type</th>
                    <th className="p-4 text-sm font-semibold text-gray-400">Stage</th>
                    <th className="p-4 text-sm font-semibold text-gray-400">Difficulty</th>
                    <th className="p-4 text-sm font-semibold text-gray-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-900/20">
                  {filtered.map((challenge) => (
                    <tr key={challenge._id} className="hover:bg-white/5">
                      <td className="p-4">
                        <p className="font-medium text-white">{challenge.title}</p>
                        <p className="text-sm text-gray-400 truncate max-w-xs mt-1">{challenge.description || "No challenge description available."}</p>
                      </td>
                      <td className="p-4 text-gray-300">
                        <span className="inline-flex items-center rounded-full bg-slate-800/80 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-200">
                          {challenge.category || "General"}
                        </span>
                      </td>
                      <td className="p-4 text-gray-300">
                        <span className="inline-flex items-center rounded-full bg-slate-800/80 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-200">
                          {challenge.type || "Stage"}
                        </span>
                      </td>
                      <td className="p-4 text-green-300 text-sm font-semibold">{challenge.type === "Battle" ? "Battle" : challenge.stageId?.title || challenge.stageId || "Pool"}</td>
                      <td className="p-4 text-slate-300">
                        <span className="inline-flex items-center rounded-full bg-slate-800/80 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-200">
                          {challenge.difficulty || "medium"}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(challenge)}
                          className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg"
                          title="Edit"
                        >
                          <span className="material-icons-outlined text-sm">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(challenge._id)}
                          className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg"
                          title="Delete"
                        >
                          <span className="material-icons-outlined text-sm">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingChallenge ? "Edit Challenge" : "New Challenge"}>
        {!editingChallenge ? (
          <div className="rounded-xl border border-purple-900/30 bg-background-dark/40 p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-white">AI Draft Generator</p>
              <button type="button" onClick={() => setAiOpen((v) => !v)} className="text-xs text-indigo-300">
                {aiOpen ? "Hide" : "Show"}
              </button>
            </div>
            {aiOpen ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-400">Prompt</label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={2}
                    className={`${inputClass} resize-none`}
                    placeholder="Describe the exercise to generate..."
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Difficulty</label>
                  <select value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value)} className={inputClass}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="expert">Expert</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleGenerateDraft}
                    disabled={aiGenerating || !aiPrompt.trim()}
                    className="mt-2 w-full px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold"
                  >
                    {aiGenerating ? "Generating..." : "Generate Draft"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm text-gray-300">Title</label>
              <input name="title" value={formData.title} onChange={handleInputChange} required className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-gray-300">Description</label>
              <textarea name="description" value={formData.description} onChange={handleInputChange} rows={3} required className={`${inputClass} resize-none`} />
            </div>
            <div>
              <label className="text-sm text-gray-300">Category</label>
              <input name="category" value={formData.category} onChange={handleInputChange} className={inputClass} />
            </div>
            <div>
              <label className="text-sm text-gray-300">XP Reward</label>
              <input type="number" name="xpReward" value={formData.xpReward} onChange={handleInputChange} className={inputClass} />
            </div>
            <div>
              <label className="text-sm text-gray-300">Difficulty</label>
              <select name="difficulty" value={formData.difficulty} onChange={handleInputChange} className={inputClass}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="expert">Expert</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-300">Language</label>
              <select name="language" value={formData.language} onChange={handleInputChange} className={inputClass}>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="csharp">C#</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-300">Type</label>
              <select name="type" value={formData.type} onChange={handleInputChange} className={inputClass}>
                <option value="Stage">Stage</option>
                <option value="Battle">Battle</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-300">Training Stage</label>
              <select name="stageId" value={formData.stageId} onChange={handleInputChange} disabled={formData.type === "Battle"} className={`${inputClass} disabled:opacity-50`}>
                <option value="">Pool (unassigned)</option>
                {stages.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.title} (level {s.level ?? s.order ?? "?"})
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-gray-300">Starter Code</label>
              <textarea name="starterCode" value={formData.starterCode} onChange={handleInputChange} rows={4} className={`${inputClass} resize-none font-mono text-sm`} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-gray-300">Tests (JSON)</label>
              <textarea name="testCasesJson" value={formData.testCasesJson} onChange={handleInputChange} rows={6} className={`${inputClass} resize-none font-mono text-xs`} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-gray-300">Constraints (Optional)</label>
              <textarea name="constraints" value={formData.constraints} onChange={handleInputChange} rows={2} className={`${inputClass} resize-none`} />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-purple-900/20">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white">
              Cancel
            </button>
            <button type="submit" className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium">
              {editingChallenge ? "Update Challenge" : "Create Challenge"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
