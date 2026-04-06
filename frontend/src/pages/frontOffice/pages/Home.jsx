import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ScrollButton } from '../components/ui/ScrollButton';
import { RecruiterDashboard } from './RecruiterDashboard';
import { getParticipantBattleRooms } from '../../../services/api';

export function Home() {
  const [userRole, setUserRole] = useState(null);
  const [battleRooms, setBattleRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        if (!token) return;

        const response = await fetch("http://localhost:5000/api/auth/profile", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUserRole(data.user?.role);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    };

    fetchUserRole();
  }, []);

  useEffect(() => {
    if (userRole !== "participant") return;

    const fetchRooms = async () => {
      setLoadingRooms(true);
      try {
        const { data } = await getParticipantBattleRooms();
        setBattleRooms(data?.rooms || []);
      } catch {
        setBattleRooms([]);
      } finally {
        setLoadingRooms(false);
      }
    };

    fetchRooms();
  }, [userRole]);

  // Show recruiter dashboard for recruiters
  if (userRole === "recruiter") {
    return <RecruiterDashboard />;
  }

  // Show regular home for participants
  return (
    <div className="min-h-[calc(100vh-5rem)] px-6 py-12 flex items-center justify-center">
      <div className="max-w-3xl w-full bg-slate-900/60 border border-slate-800 rounded-3xl p-10 shadow-[0_0_40px_rgba(15,23,42,0.6)]">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-300">FortCode Template</p>
        <h1 className="mt-4 text-4xl md:text-5xl font-serif text-slate-100">
          Command the realm, then step into the castle.
        </h1>
        <p className="mt-4 text-slate-300 text-lg">
          This is the Vite app template area. Use it for onboarding, stats, or a hub
          before launching the Unity castle experience.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            to="/castle"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-amber-500 text-slate-950 font-semibold shadow-[0_0_15px_rgba(251,191,36,0.5)] hover:bg-amber-400 transition-colors"
          >
            Enter Castle
          </Link>
          <Link
            to="/level/1"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors"
          >
            View a Challenge
          </Link>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-semibold text-slate-100">My Battle Rooms</h2>
            <span className="text-xs uppercase tracking-wide text-slate-500">Invited only</span>
          </div>

          {loadingRooms ? (
            <p className="text-slate-400 text-sm">Loading your battle rooms...</p>
          ) : battleRooms.length === 0 ? (
            <p className="text-slate-500 text-sm">No active battles for your account right now.</p>
          ) : (
            <div className="space-y-3">
              {battleRooms.map((room) => (
                <div key={room._id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-slate-100 font-medium">{room.title}</p>
                      <p className="text-slate-400 text-sm">{room.challenge?.title || "Coding Challenge"}</p>
                      <p className="text-slate-500 text-xs mt-1">Recruiter: {room.recruiter?.username || room.recruiter?.nickname || "Unknown"}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${room.status === "live" ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-slate-300"}`}>
                      {room.status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-3">Time limit: {room.timeLimitMinutes} minutes</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ScrollButton />
    </div>
  );
}
