import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import Sidebar from "./components/Sidebar";
import { adminStagesApi, adminChallengesApi } from "../../services/api";

const emptyForm = () => ({
  title: "",
  description: "",
  difficulty: "easy",
  order: 1,
  category: "training",
  prerequisiteStageId: "",
  selectedChallengeIds: [],
});

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-dark border border-purple-900/20 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-6 border-b border-purple-900/20 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
            <span className="material-icons-outlined">close</span>
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

export default function AdminStages() {
  const [stages, setStages] = useState([]);
  const [allChallenges, setAllChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");

  const load = async () => {
    try {
      const [sRes, cRes] = await Promise.all([adminStagesApi.list(), adminChallengesApi.list()]);
      setStages(sRes.data);
      setAllChallenges(cRes.data.filter((c) => c.type === "Stage"));
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm(), order: (stages.length || 0) + 1 });
    setModalOpen(true);
  };

  const openEdit = (st) => {
    setEditingId(st._id);
    setForm({
      title: st.title,
      description: st.description || "",
      difficulty: st.difficulty,
      order: st.order,
      category: st.category,
      prerequisiteStageId: st.prerequisiteStageId?._id || st.prerequisiteStageId || "",
      selectedChallengeIds: (st.challenges || []).map((c) => c._id || c),
    });
    setModalOpen(true);
  };

  const toggleChallenge = (id) => {
    const sid = String(id);
    setForm((f) => {
      const set = new Set(f.selectedChallengeIds.map(String));
      if (set.has(sid)) set.delete(sid);
      else set.add(sid);
      return { ...f, selectedChallengeIds: [...set] };
    });
  };

  const removeChip = (id) => {
    const sid = String(id);
    setForm((f) => ({
      ...f,
      selectedChallengeIds: f.selectedChallengeIds.filter((x) => String(x) !== sid),
    }));
  };

  const saveStage = async (e) => {
    e.preventDefault();
    const body = {
      title: form.title,
      description: form.description,
      difficulty: form.difficulty,
      order: Number(form.order),
      category: form.category,
      prerequisiteStageId: form.prerequisiteStageId || null,
      challenges: form.selectedChallengeIds,
    };
    try {
      if (editingId) {
        await adminStagesApi.update(editingId, {
          title: body.title,
          description: body.description,
          difficulty: body.difficulty,
          order: body.order,
          category: body.category,
          prerequisiteStageId: body.prerequisiteStageId,
        });
        await adminStagesApi.assignChallenges(editingId, form.selectedChallengeIds);
      } else {
        const { data } = await adminStagesApi.create(body);
        if (form.selectedChallengeIds.length) {
          await adminStagesApi.assignChallenges(data._id, form.selectedChallengeIds);
        }
      }
      Swal.fire({ title: "Saved", icon: "success", background: "#1a1a2e", color: "#fff", timer: 1500, showConfirmButton: false });
      setModalOpen(false);
      load();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || err.message, "error");
    }
  };

  const deleteStage = async (id) => {
    const r = await Swal.fire({
      title: "Delete stage?",
      icon: "warning",
      showCancelButton: true,
      background: "#1a1a2e",
      color: "#fff",
    });
    if (!r.isConfirmed) return;
    try {
      await adminStagesApi.remove(id);
      load();
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || e.message, "error");
    }
  };

  const filteredPick = allChallenges.filter(
    (c) =>
      !pickerQuery ||
      c.title.toLowerCase().includes(pickerQuery.toLowerCase())
  );

  const prerequisiteOptions = stages.filter((s) => !editingId || String(s._id) !== String(editingId));

  return (
    <div className="flex h-screen bg-background-dark font-body text-gray-200 overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-auto p-4 md:p-6 space-y-6">
        <div className="flex justify-between items-center bg-surface-dark border border-purple-900/20 p-6 rounded-xl">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Training stages</h1>
            <p className="text-gray-400">Manage learning path, prerequisites, and challenge assignment.</p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg font-medium"
          >
            <span className="material-icons-outlined">add</span>
            Add stage
          </button>
        </div>

        <div className="bg-surface-dark border border-purple-900/20 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-purple-900/20 border-b border-purple-900/20">
                    <th className="p-4 text-sm font-semibold text-gray-400">Title</th>
                    <th className="p-4 text-sm font-semibold text-gray-400">Difficulty</th>
                    <th className="p-4 text-sm font-semibold text-gray-400">Challenges</th>
                    <th className="p-4 text-sm font-semibold text-gray-400">Order</th>
                    <th className="p-4 text-sm text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-900/20">
                  {stages.map((st) => (
                    <tr key={st._id} className="hover:bg-white/5">
                      <td className="p-4">
                        <p className="font-medium text-white">{st.title}</p>
                        <p className="text-xs text-gray-500">{st.category}</p>
                      </td>
                      <td className="p-4 capitalize text-gray-300">{st.difficulty}</td>
                      <td className="p-4 text-gray-300">{st.challenges?.length ?? 0}</td>
                      <td className="p-4 text-gray-300">{st.order}</td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => openEdit(st)}
                          className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg"
                        >
                          <span className="material-icons-outlined text-sm">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteStage(st._id)}
                          className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg"
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit stage" : "New stage"}>
        <form onSubmit={saveStage} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm text-gray-300">Title</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-background-dark border border-purple-900/30 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm text-gray-300">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full bg-background-dark border border-purple-900/30 rounded-lg px-3 py-2 text-white resize-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Difficulty</label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                className="w-full bg-background-dark border border-purple-900/30 rounded-lg px-3 py-2 text-white"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="expert">Expert</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Order</label>
              <input
                type="number"
                required
                min={1}
                value={form.order}
                onChange={(e) => setForm({ ...form, order: e.target.value })}
                className="w-full bg-background-dark border border-purple-900/30 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-background-dark border border-purple-900/30 rounded-lg px-3 py-2 text-white"
              >
                <option value="training">training</option>
                <option value="mission">mission</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Prerequisite stage</label>
              <select
                value={form.prerequisiteStageId}
                onChange={(e) => setForm({ ...form, prerequisiteStageId: e.target.value })}
                className="w-full bg-background-dark border border-purple-900/30 rounded-lg px-3 py-2 text-white"
              >
                <option value="">None</option>
                {prerequisiteOptions.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.title} (order {s.order})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">Challenges</label>
            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 rounded-lg bg-background-dark border border-purple-900/30">
              {form.selectedChallengeIds.map((id) => {
                const ch = allChallenges.find((c) => String(c._id) === String(id));
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs"
                  >
                    {ch?.title || id}
                    <button type="button" className="hover:text-white" onClick={() => removeChip(id)}>
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setPickerOpen(!pickerOpen)}
              className="text-sm text-primary hover:underline"
            >
              {pickerOpen ? "Close picker" : "Add challenges…"}
            </button>
            {pickerOpen && (
              <div className="border border-purple-900/30 rounded-lg p-2 bg-background-dark max-h-48 overflow-y-auto">
                <input
                  placeholder="Search…"
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  className="w-full mb-2 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-sm"
                />
                {filteredPick.map((c) => {
                  const on = form.selectedChallengeIds.some((x) => String(x) === String(c._id));
                  return (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => toggleChallenge(c._id)}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm mb-1 ${on ? "bg-blue-600/30" : "hover:bg-white/5"}`}
                    >
                      {c.title} <span className="text-gray-500 text-xs">({c.language})</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-purple-900/20">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-400">
              Cancel
            </button>
            <button type="submit" className="px-6 py-2 bg-primary rounded-lg font-medium text-white">
              Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
