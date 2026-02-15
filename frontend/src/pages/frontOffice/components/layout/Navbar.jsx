import React, { useState, useEffect } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { Shield, Castle, Map, Sword, Cpu, User, Trophy, LogOut, Settings } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { useSocket } from "../../../../context/SocketContext";
import Swal from "sweetalert2";

export function Navbar() {
  const [userData, setUserData] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const { disconnect } = useSocket();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await fetch("http://localhost:5000/api/auth/profile", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUserData(data.user);
        }
      } catch (error) {
        console.error("Profile fetch error:", error);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = () => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You will be redirected to the login page.",
      icon: 'warning',
      showCancelButton: true,
      background: '#1a1a2e',
      color: '#fff',
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, logout!',
      cancelButtonText: 'Stay here'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem("token");
        disconnect();
        navigate("/");

        Swal.fire({
          icon: 'success',
          title: 'Logged Out',
          text: 'See you soon, Commander!',
          timer: 1500,
          showConfirmButton: false,
          background: '#1a1a2e',
          color: '#fff'
        });
      }
    });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 shadow-2xl">
      <div className="flex items-center gap-4">
        <NavLink to="/home" className="flex items-center gap-2 group">
          <div className="relative w-12 h-12 flex items-center justify-center rounded-lg overflow-hidden group-hover:scale-105 transition-transform">
            <img
              src="/images/logo.png"
              alt="FortCode Logo"
              className="w-full h-full object-cover scale-135"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-bold text-xl text-slate-100 tracking-wider group-hover:text-blue-400 transition-colors">FortCode</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest">Code Conqueror</span>
          </div>
        </NavLink>
      </div>

      <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-full border border-slate-800">
        <NavItem to="/map" icon={<Map className="w-4 h-4" />} label="Map" />
        <NavItem to="/training" icon={<Sword className="w-4 h-4" />} label="Training" />
        <NavItem to="/arena" icon={<Cpu className="w-4 h-4" />} label="Arena" />
        <NavItem to="/dashboard" icon={<User className="w-4 h-4" />} label="Commander" />
        <NavItem to="/armory" icon={<Trophy className="w-4 h-4" />} label="Armory" />
      </div>

      <div className="flex items-center gap-4">
        <Link
          to="/castle"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-slate-950 text-sm font-semibold shadow-[0_0_15px_rgba(251,191,36,0.5)] hover:bg-amber-400 transition-colors"
        >
          <Castle className="w-4 h-4" />
          Enter Castle
        </Link>
        <div className="flex items-center gap-2 px-3 py-1 bg-amber-900/20 border border-amber-500/30 rounded-full">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs font-mono text-amber-200">
            {userData?.role === "admin" ? "Grand Master" : "Lvl 12 Champion"}
          </span>
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-10 h-10 rounded-full border-2 border-slate-700 hover:border-blue-500 transition-all overflow-hidden flex items-center justify-center bg-slate-800 shadow-lg"
          >
            {userData?.avatar ? (
              <img src={userData.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {showDropdown && userData && (
            <div className="absolute right-0 mt-3 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full border border-slate-700 overflow-hidden">
                  <img src={userData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-slate-100 font-bold truncate">{userData.username}</span>
                  <span className="text-slate-400 text-xs truncate">{userData.email}</span>
                </div>
              </div>

              <div className="h-px bg-slate-800 my-2" />

              <div className="flex flex-col gap-1">
                <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors">
                  <Settings className="w-4 h-4" />
                  <span>Update Profile</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        twMerge(
          "flex items-center gap-2 px-4 py-1.5 rounded-full transition-all duration-300 text-sm font-medium",
          isActive
            ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
        )
      }
    >
      {icon ? icon : null}
      <span>{label}</span>
    </NavLink>
  );
}
