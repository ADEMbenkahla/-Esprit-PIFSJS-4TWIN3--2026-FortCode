import React, { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import api from "../../services/api";

interface Recruiter {
  _id: string;
  username?: string;
  email: string;
}

interface VirtualRoomRequest {
  _id: string;
  recruiter: Recruiter;
  status: "pending" | "approved" | "rejected";
  adminMessage?: string;
  roomSlug?: string;
  roomLink?: string;
  createdAt: string;
  updatedAt: string;
}

const statusColors: Record<VirtualRoomRequest["status"], string> = {
  pending: "bg-amber-500/10 text-amber-300 border-amber-500/40",
  approved: "bg-emerald-500/10 text-emerald-300 border-emerald-500/40",
  rejected: "bg-red-500/10 text-red-300 border-red-500/40"
};

const VirtualRooms: React.FC = () => {
  const [requests, setRequests] = useState<VirtualRoomRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string> = {};
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      const res = await api.get("/admin/virtual-room/requests", { params });
      setRequests(res.data.requests || []);
    } catch (err: any) {
      console.error("Failed to load virtual room requests", err);
      setError(err?.response?.data?.message || "Failed to load virtual room requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleUpdate = async (
    id: string,
    data: Partial<Pick<VirtualRoomRequest, "status" | "adminMessage">>
  ) => {
    try {
      setSavingId(id);
      setError(null);

      await api.patch(`/admin/virtual-room/requests/${id}`, data);
      await fetchRequests();
    } catch (err: any) {
      console.error("Failed to update virtual room request", err);
      setError(err?.response?.data?.message || "Failed to update virtual room request");
    } finally {
      setSavingId(null);
    }
  };

  const handleQuickUpdate = (req: VirtualRoomRequest, nextStatus: VirtualRoomRequest["status"]) => {
    handleUpdate(req._id, { status: nextStatus, adminMessage: req.adminMessage });
  };

  return (
    <div className="flex h-screen bg-background-dark font-body text-gray-200 overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 relative">
        <Header
          title="Virtual Rooms"
          subtitle="Manage recruiter virtual room requests"
        />

        <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-dark rounded-2xl border border-white/10 p-4">
            <div>
              <p className="text-sm font-semibold text-white">Filters</p>
              <p className="text-xs text-gray-500">Filter by request status</p>
            </div>
            <div className="flex gap-2">
              {["all", "pending", "approved", "rejected"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s as any)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    statusFilter === s
                      ? "bg-primary text-white border-primary"
                      : "bg-surface-dark text-gray-400 border-white/10 hover:border-primary/40 hover:text-white"
                  }`}
                >
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/40 text-red-200 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Table */}
          <div className="bg-surface-dark rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="material-icons-outlined text-primary text-lg">video_camera_front</span>
                Virtual Room Requests
              </h3>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                {loading ? "Loading..." : `${requests.length} request(s)`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Recruiter
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Room
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Admin note
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {!loading && requests.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">
                        No virtual room requests found.
                      </td>
                    </tr>
                  )}

                  {requests.map((req) => (
                    <tr key={req._id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col">
                          <span className="font-semibold text-white">
                            {req.recruiter?.username || "Unknown"}
                          </span>
                          <span className="text-xs text-gray-500">
                            {req.recruiter?.email}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusColors[req.status]}`}
                        >
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </span>
                      </td>

                      <td className="px-4 py-3 align-top">
                        {req.status === "approved" ? (
                          req.roomLink ? (
                            <a
                              href={req.roomLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary underline break-all"
                              title={req.roomLink}
                            >
                              {req.roomLink}
                            </a>
                          ) : (
                            <span className="text-xs text-gray-500">Generating…</span>
                          )
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 align-top">
                        <textarea
                          className="w-full bg-transparent border border-white/10 rounded-lg px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-primary resize-none"
                          rows={2}
                          placeholder="Optional note to recruiter..."
                          value={req.adminMessage || ""}
                          onChange={(e) =>
                            setRequests((prev) =>
                              prev.map((r) =>
                                r._id === req._id ? { ...r, adminMessage: e.target.value } : r
                              )
                            )
                          }
                        />
                      </td>

                      <td className="px-4 py-3 align-top text-xs text-gray-500 whitespace-nowrap">
                        {new Date(req.createdAt).toLocaleString()}
                      </td>

                      <td className="px-4 py-3 align-top text-right">
                        <div className="flex flex-col gap-1 items-end">
                          <button
                            disabled={savingId === req._id}
                            onClick={() => handleQuickUpdate(req, "approved")}
                            className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            Approve
                          </button>
                          <button
                            disabled={savingId === req._id}
                            onClick={() => handleQuickUpdate(req, "rejected")}
                            className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-300 border border-red-500/40 hover:bg-red-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            Reject
                          </button>
                          <button
                            disabled={savingId === req._id}
                            onClick={() =>
                              handleUpdate(req._id, {
                                status: req.status,
                                adminMessage: req.adminMessage
                              })
                            }
                            className="px-3 py-1 rounded-full text-xs font-semibold bg-white/5 text-gray-200 border border-white/20 hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            Save changes
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VirtualRooms;

