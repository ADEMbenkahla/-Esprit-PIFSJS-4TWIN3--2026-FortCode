import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import { acceptBattleInvitation, getBattleInvitationPreview } from "../services/api";
import { getUserRole } from "../guards/RouteGuards";

function BattleInvite() {
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const token = params.get("token") || "";

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [code, setCode] = useState("");

  const role = getUserRole();
  const isParticipant = role === "participant";

  useEffect(() => {
    if (!token) return;

    const run = async () => {
      setLoading(true);
      try {
        const { data } = await getBattleInvitationPreview(token);
        setPreview(data);
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Invitation unavailable",
          text: error?.response?.data?.message || "This invitation is invalid or expired.",
          background: "#1a1a2e",
          color: "#fff",
        });
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [token]);

  const handleAccept = async () => {
    if (!code.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Code required",
        text: "Enter the invitation code sent by email.",
        background: "#1a1a2e",
        color: "#fff",
      });
      return;
    }

    setAccepting(true);
    try {
      const { data } = await acceptBattleInvitation({ token, code: code.trim() });
      // Auto-login if token provided
      if (data?.token) {
        sessionStorage.setItem("token", data.token);
        localStorage.setItem("token", data.token);
        sessionStorage.setItem("userId", data.user?._id);
        sessionStorage.setItem("userRole", "participant");
        window.dispatchEvent(new Event('tokenChanged'));
      }
      Swal.fire({
        icon: "success",
        title: "Invitation accepted",
        text: "Access granted. Redirecting to programmer platform.",
        background: "#1a1a2e",
        color: "#fff",
      });
      window.location.href = `/programmer/${data?.room?._id}`;
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Could not accept invitation",
        text: error?.response?.data?.message || "Please verify your code and invitation link.",
        background: "#1a1a2e",
        color: "#fff",
      });
    } finally {
      setAccepting(false);
    }
  };

  const inviteEmail = preview?.invitation?.email || "";

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl">
        <p className="text-xs uppercase tracking-[0.25em] text-amber-300">FortCode Invitation</p>
        <h1 className="mt-3 text-3xl font-serif text-slate-100">Visitor Battle Access</h1>
        <p className="mt-2 text-sm text-slate-400">
          This page is a dedicated visitor portal. Enter the email invitation code to join.
        </p>

        {!token && <p className="text-red-300 mt-4">Missing invitation token.</p>}

        {loading && <p className="text-slate-400 mt-4">Loading invitation details...</p>}

        {!loading && preview && (
          <div className="mt-6 space-y-4 text-slate-200">
            <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
              <p className="text-slate-100 font-semibold">{preview.room?.title}</p>
              <p className="text-slate-400 text-sm mt-1">Challenge: {preview.room?.challenge?.title || "Coding Challenge"}</p>
              <p className="text-slate-400 text-sm">Time limit: {preview.room?.timeLimitMinutes} minutes</p>
              <p className="text-slate-500 text-xs mt-2">Recruiter: {preview.room?.recruiter?.username || preview.room?.recruiter?.nickname || "Unknown"}</p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
              <label className="block text-sm text-slate-300 mb-2">Invited email</label>
              <p className="text-slate-200 text-sm font-mono">{inviteEmail}</p>
              <p className="text-xs text-slate-500 mt-2">This is the email the invitation was sent to.</p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
              <label className="block text-sm text-slate-300 mb-2">Invitation code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter the 6-digit code from your email"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-slate-500 mt-2">
                Enter the code that was sent to {inviteEmail}.
              </p>
            </div>

            <button
              onClick={handleAccept}
              disabled={accepting || !token}
              className="w-full px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 font-medium"
            >
              {accepting ? "Accepting..." : "Accept Invitation"}
            </button>
            
            <p className="text-xs text-slate-500 text-center">
              {isParticipant ? "You are logged in." : "You will be automatically logged in after accepting."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default BattleInvite;
