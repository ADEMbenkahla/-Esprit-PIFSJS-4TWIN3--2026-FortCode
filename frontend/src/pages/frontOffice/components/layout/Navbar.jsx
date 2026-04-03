import React, { useState, useEffect, useRef } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
<<<<<<< HEAD
import { Shield, Castle, Map, Sword, Cpu, User, Trophy, LogOut, Settings, Menu, X, Video, Briefcase, Users } from "lucide-react";
=======
import { Shield, Castle, Map, Sword, Cpu, User, Trophy, LogOut, Settings, Menu, X, UserPlus, Code2 } from "lucide-react";
>>>>>>> da4a379f517619ed5f2890a9aff73fb6d70d1968
import { twMerge } from "tailwind-merge";
import { useSocket } from "../../../../context/SocketContext";
import { useSoundEffects } from "../../../../hooks/useSoundEffects";
import { useSettings } from "../../../../context/SettingsContext";
import Swal from "sweetalert2";
import { requestVirtualRoom, getMyVirtualRoomRequest } from "../../../../services/api";
import { ProfileModal } from "./ProfileModal";

export function Navbar() {
  const [userData, setUserData] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [virtualRoomStatus, setVirtualRoomStatus] = useState(null);
  const previousStatusRef = useRef(null);
  const navigate = useNavigate();
  const { disconnect } = useSocket();
  const { playClick } = useSoundEffects();
  const { avatar, nickname } = useSettings();

  // Fonction pour extraire le rôle du JWT token
  const extractRoleFromToken = () => {
    try {
      // Try sessionStorage first (current tab), then localStorage (fallback)
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        console.log("🎫 Rôle du token JWT:", payload.role);
        return payload.role;
      }
    } catch (error) {
      console.error("❌ Erreur extraction rôle du token:", error);
    }
    return null;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Try sessionStorage first (current tab), then localStorage (fallback)
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        if (!token) {
          console.log("ℹ️ Pas de token trouvé");
          return;
        }

        console.log("🔍 Fetching profile avec token...");
        const response = await fetch("http://localhost:5000/api/auth/profile", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log("✅ Profile reçu:", data.user);
          console.log("👤 Rôle utilisateur:", data.user?.role);
          setUserData(data.user);
<<<<<<< HEAD

          // If recruiter, also fetch latest virtual room request status
          if (data.user.role === "recruiter") {
            try {
              const vrResponse = await getMyVirtualRoomRequest();
              const request = vrResponse.data.request;
              setVirtualRoomStatus(request);
              previousStatusRef.current = request?.status;
            } catch (err) {
              // If 404, no existing request - ignore
            }
=======
          setUserRole(data.user?.role);
        } else {
          console.error("❌ Erreur réponse profile:", response.status);
          // Fallback : récupérer le rôle du token directement
          const roleFromToken = extractRoleFromToken();
          if (roleFromToken) {
            setUserRole(roleFromToken);
>>>>>>> da4a379f517619ed5f2890a9aff73fb6d70d1968
          }
        }
      } catch (error) {
        console.error("❌ Erreur fetch profile:", error);
        // Fallback : récupérer le rôle du token directement
        const roleFromToken = extractRoleFromToken();
        if (roleFromToken) {
          setUserRole(roleFromToken);
        }
      }
    };

    fetchProfile();

    // Listener pour détecter les changements de token (login/logout)
    const handleTokenChange = () => {
      console.log("🔄 Token change détecté!");
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      if (token) {
        console.log("🔄 Token trouvé, fetching profile...");
        // Token a changé → récupérer le profil mis à jour
        fetchProfile();
      } else {
        console.log("🔄 Token supprimé, réinitialisant userData");
        // Token supprimé → réinitialiser
        setUserData(null);
        setUserRole(null);
      }
    };

    // Écouter l'événement personnalisé 'tokenChanged'
    window.addEventListener('tokenChanged', handleTokenChange);

    return () => {
      window.removeEventListener('tokenChanged', handleTokenChange);
    };
  }, []);

<<<<<<< HEAD
  // Periodically refresh virtual room status for recruiters
  useEffect(() => {
    if (userData?.role === "recruiter") {
      const refreshStatus = async () => {
        try {
          const vrResponse = await getMyVirtualRoomRequest();
          const newStatus = vrResponse.data.request;
          const previousStatus = previousStatusRef.current;
          
          // If status changed to approved, show notification
          if (newStatus.status === 'approved' && previousStatus !== 'approved') {
            Swal.fire({
              icon: 'success',
              title: 'Virtual Room Approved!',
              text: 'Your virtual room request has been approved. Click the button in your profile to access it.',
              timer: 5000,
              showConfirmButton: true,
              background: '#1a1a2e',
              color: '#fff',
              confirmButtonColor: '#3b82f6'
            });
          }
          
          previousStatusRef.current = newStatus.status;
          setVirtualRoomStatus(newStatus);
        } catch (err) {
          // Ignore errors (no request or network issues)
        }
      };

      // Initial refresh
      refreshStatus();
      
      // Refresh every 30 seconds
      const interval = setInterval(refreshStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [userData?.role]);
=======
  // Debug log pour userData et userRole
  useEffect(() => {
    console.log("📊 userData mis à jour:", userData);
    console.log("📊 userRole mis à jour:", userRole);
  }, [userData, userRole]);

  // Sync role automatically after admin approval (works from any front-office page)
  useEffect(() => {
    if (!userRole || userRole === "recruiter" || userRole === "admin") {
      return;
    }

    const checkRoleUpgrade = async () => {
      try {
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        if (!token) return;

        const response = await fetch("http://localhost:5000/api/auth/refresh-token", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (!response.ok) return;

        const data = await response.json();
        if (!data?.token || !data?.role) return;

        const currentRole = extractRoleFromToken();
        if (currentRole !== data.role) {
          sessionStorage.setItem("token", data.token);
          localStorage.setItem("token", data.token);
          setUserRole(data.role);
          if (data.user) setUserData(data.user);
          window.dispatchEvent(new Event("tokenChanged"));
        }
      } catch (error) {
        console.error("❌ Error while syncing upgraded role:", error);
      }
    };

    const intervalId = setInterval(checkRoleUpgrade, 5000);
    return () => clearInterval(intervalId);
  }, [userRole]);
>>>>>>> da4a379f517619ed5f2890a9aff73fb6d70d1968

  const handleLogout = () => {
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();

    Swal.fire({
      title: 'Are you sure?',
      text: "You will be redirected to the login page.",
      icon: 'warning',
      showCancelButton: true,
      background: '#1a1a2e',
      color: '#fff',
      confirmButtonColor: accentColor || '#3b82f6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, logout!',
      cancelButtonText: 'Stay here'
    }).then((result) => {
      if (result.isConfirmed) {
        // Clear all user data including settings
        sessionStorage.clear();
        localStorage.clear();

        // Notifier les autres composants du changement de token
        window.dispatchEvent(new Event('tokenChanged'));

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

  const handleResetLevels = async () => {
    playClick();

    const result = await Swal.fire({
      title: 'Reset all progress?',
      text: "This will clear all your completed challenges and stars permanently.",
      icon: 'warning',
      showCancelButton: true,
      background: '#1a1a2e',
      color: '#fff',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#2563eb',
      confirmButtonText: 'Yes, Reset Everything',
      cancelButtonText: 'Keep Progress'
    });

    if (result.isConfirmed) {
      try {
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/api/stages/reset-progress", {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
          localStorage.removeItem("levelProgress");
          for (let i = 1; i <= 4; i += 1) {
            localStorage.removeItem(`level${i}_challenges`);
          }
          window.dispatchEvent(new Event("fortcode:progress-reset"));

          Swal.fire({
            icon: 'success',
            title: 'Progress Reset',
            text: 'Your journey starts fresh, Commander!',
            background: '#1a1a2e',
            color: '#fff',
            timer: 2000,
            showConfirmButton: false
          }).then(() => {
            navigate("/map");
          });
        }
      } catch (err) {
        console.error("Reset failed:", err);
      }
    }
  };

  const handleVirtualRoomRequest = async () => {
    playClick();

    // If request is already approved, show details
    if (virtualRoomStatus?.status === 'approved') {
      const roomLink =
        virtualRoomStatus.roomLink ||
        (virtualRoomStatus.roomSlug ? `/virtual-room/${virtualRoomStatus.roomSlug}` : '');
      const adminMessage = virtualRoomStatus.adminMessage || '';

      let htmlContent = '<div style="text-align: left; color: #fff;">';
      htmlContent += '<p style="margin-bottom: 15px; font-size: 16px;"><strong>✅ Your virtual room request has been approved!</strong></p>';
      
      if (adminMessage) {
        htmlContent += `<p style="margin-bottom: 15px; color: #94a3b8;"><strong>Admin Message:</strong><br/>${adminMessage}</p>`;
      }
      
      if (roomLink) {
        htmlContent += `<p style="margin-bottom: 15px;"><strong>Room:</strong><br/><span style="color: #94a3b8;">Join inside FortCode</span></p>`;
      } else {
        htmlContent += '<p style="margin-bottom: 15px; color: #fbbf24;">Room is being generated. Please try again in a moment.</p>';
      }
      
      htmlContent += '</div>';

      const result = await Swal.fire({
        title: 'Virtual Room Approved',
        html: htmlContent,
        icon: 'success',
        confirmButtonText: roomLink ? 'Join Room' : 'OK',
        background: '#1a1a2e',
        color: '#fff',
        confirmButtonColor: '#3b82f6'
      });

      if (result.isConfirmed && roomLink) {
        navigate(roomLink);
      }
      return;
    }

    // If request is pending, show status
    if (virtualRoomStatus?.status === 'pending') {
      Swal.fire({
        title: 'Request Pending',
        text: 'Your virtual room request is being reviewed by the admin. You will be notified once it\'s approved.',
        icon: 'info',
        background: '#1a1a2e',
        color: '#fff',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    // If request is rejected, show message
    if (virtualRoomStatus?.status === 'rejected') {
      const adminMessage = virtualRoomStatus.adminMessage || 'No reason provided.';
      Swal.fire({
        title: 'Request Rejected',
        html: `<div style="text-align: left; color: #fff;"><p><strong>Reason:</strong></p><p style="color: #94a3b8;">${adminMessage}</p></div>`,
        icon: 'error',
        background: '#1a1a2e',
        color: '#fff',
        confirmButtonColor: '#d33',
        confirmButtonText: 'Request Again',
        showCancelButton: true,
        cancelButtonText: 'Cancel'
      }).then((result) => {
        if (result.isConfirmed) {
          // Allow creating a new request after rejection
          handleNewVirtualRoomRequest();
        }
      });
      return;
    }

    // No existing request, create new one
    handleNewVirtualRoomRequest();
  };

  const handleNewVirtualRoomRequest = async () => {
    try {
      const result = await Swal.fire({
        title: 'Request Virtual Room',
        text: 'Send a request to the admin for a virtual interview room?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, request',
        cancelButtonText: 'Cancel',
        background: '#1a1a2e',
        color: '#fff'
      });

      if (!result.isConfirmed) return;

      const response = await requestVirtualRoom();
      setVirtualRoomStatus(response.data.request);

      Swal.fire({
        icon: 'success',
        title: 'Request sent',
        text: 'Your virtual room request has been sent to the admin.',
        timer: 2500,
        showConfirmButton: false,
        background: '#1a1a2e',
        color: '#fff'
      });
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        'Could not send virtual room request.';

      Swal.fire({
        icon: 'error',
        title: 'Request failed',
        text: message,
        background: '#1a1a2e',
        color: '#fff'
      });
    }
  };

  const handleMobileMenuClose = () => {
    playClick();
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6 py-3 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 shadow-2xl">
        <div className="flex items-center gap-4">
          <NavLink to="/home" className="flex items-center gap-2">
            <div className="relative w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-lg overflow-hidden">
              <img
                src="/images/logo.png"
                alt="FortCode Logo"
                className="w-full h-full object-cover scale-135"
              />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-bold text-xl tracking-wider" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                <span className="text-slate-100">FORT</span>
                <span style={{ color: 'var(--accent-color)' }}>CODE</span>
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest">Code Conqueror</span>
            </div>
          </NavLink>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-1 bg-slate-900/50 p-1 rounded-full border border-slate-800">
<<<<<<< HEAD
          {userData?.role === "recruiter" ? (
            // Recruiter Navigation
            <>
              <NavItem to="/home" icon={<Briefcase className="w-4 h-4" />} label="Dashboard" onClick={playClick} />
              <NavItem to="/map" icon={<Map className="w-4 h-4" />} label="Map" onClick={playClick} />
              <NavItem to="/settings" icon={<Settings className="w-4 h-4" />} label="Settings" onClick={playClick} />
            </>
          ) : (
            // Participant Navigation
            <>
              <NavItem to="/map" icon={<Map className="w-4 h-4" />} label="Map" onClick={playClick} />
              <NavItem to="/training" icon={<Sword className="w-4 h-4" />} label="Training" onClick={playClick} />
              <NavItem to="/arena" icon={<Cpu className="w-4 h-4" />} label="Arena" onClick={playClick} />
              <NavItem to="/dashboard" icon={<User className="w-4 h-4" />} label="Commander" onClick={playClick} />
              <NavItem to="/armory" icon={<Trophy className="w-4 h-4" />} label="Armory" onClick={playClick} />
            </>
          )}
=======
          <NavItem to="/map" icon={<Map className="w-4 h-4" />} label="Map" onClick={playClick} />
          <NavItem to="/training" icon={<Sword className="w-4 h-4" />} label="Training" onClick={playClick} />
          <NavItem to="/arena" icon={<Cpu className="w-4 h-4" />} label="Arena" onClick={playClick} />
          <NavItem to="/dashboard" icon={<User className="w-4 h-4" />} label="Commander" onClick={playClick} />
          <NavItem to="/armory" icon={<Trophy className="w-4 h-4" />} label="Armory" onClick={playClick} />
          <NavItem to="/programming-rooms" icon={<Code2 className="w-4 h-4" />} label="Rooms" onClick={playClick} />
>>>>>>> da4a379f517619ed5f2890a9aff73fb6d70d1968
        </div>

        {/* Desktop Right Section */}
        <div className="hidden lg:flex items-center gap-4">
<<<<<<< HEAD
          {userData?.role !== "recruiter" && (
            <>
              <button
                onClick={handleResetLevels}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-rose-600 text-rose-50 text-xs font-bold uppercase tracking-wide shadow-[0_0_12px_rgba(244,63,94,0.45)] hover:bg-rose-500 transition-colors"
              >
                Reset Levels
              </button>
              <Link
                to="/castle"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-slate-950 text-sm font-semibold shadow-[0_0_15px_rgba(251,191,36,0.5)] hover:bg-amber-400 transition-colors"
              >
                <Castle className="w-4 h-4" />
                Enter Castle
              </Link>
            </>
          )}
          
=======
          <button
            onClick={handleResetLevels}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-rose-600 text-rose-50 text-xs font-bold uppercase tracking-wide shadow-[0_0_12px_rgba(244,63,94,0.45)] hover:bg-rose-500 transition-colors"
          >
            Reset Levels
          </button>
          <Link
            to="/castle"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-slate-950 text-sm font-semibold shadow-[0_0_15px_rgba(251,191,36,0.5)] hover:bg-amber-400 transition-colors"
          >
            <Castle className="w-4 h-4" />
            Enter Castle
          </Link>

>>>>>>> da4a379f517619ed5f2890a9aff73fb6d70d1968
          {/* User Profile Badge */}
          <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-900/80 border border-slate-700 rounded-full">
            <span className="text-sm font-semibold text-slate-100">
              {nickname || 'Commander'}
            </span>
          </div>

          {/* Profile Dropdown - Desktop */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-10 h-10 rounded-full border-2 border-slate-700 hover:border-blue-500 transition-all overflow-hidden flex items-center justify-center bg-slate-800 shadow-lg"
            >
              <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-3 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full border border-slate-700 overflow-hidden">
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-100 font-bold truncate">{nickname || 'Commander'}</span>
                      {userData?.role === "recruiter" && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                          Recruiter
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 text-xs truncate">{userData?.email || 'commander@fortcode.com'}</span>
                  </div>
                </div>

                <div className="h-px bg-slate-800 my-2" />

                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      setProfileModalOpen(true);
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span>Update Profile</span>
                  </button>
                  <Link
                    to="/settings"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </Link>

<<<<<<< HEAD
                  {/* Recruiter virtual room request button */}
                  {userData?.role === "recruiter" && (
                    <button
                      onClick={() => {
                        handleVirtualRoomRequest();
                        setShowDropdown(false);
                      }}
                      className={`flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg transition-colors border ${
                        virtualRoomStatus?.status === 'approved'
                          ? 'text-emerald-300 hover:bg-emerald-500/10 border-emerald-500/30 bg-emerald-500/5'
                          : virtualRoomStatus?.status === 'pending'
                          ? 'text-amber-300 hover:bg-amber-500/10 border-amber-500/30 bg-amber-500/5'
                          : virtualRoomStatus?.status === 'rejected'
                          ? 'text-red-300 hover:bg-red-500/10 border-red-500/30 bg-red-500/5'
                          : 'text-emerald-300 hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/30'
                      }`}
                    >
                      <Video className="w-4 h-4" />
                      <span className="flex-1 text-left">
                        {virtualRoomStatus?.status === 'approved'
                          ? '✅ Virtual Room Approved'
                          : virtualRoomStatus?.status === 'pending'
                          ? '⏳ Virtual Room Pending'
                          : virtualRoomStatus?.status === 'rejected'
                          ? '❌ Request Rejected'
                          : 'Request Virtual Room'}
                      </span>
                    </button>
                  )}
=======
                  {userRole === 'participant' && (
                    <Link
                      to="/request-recruiter"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 w-full px-3 py-2 text-sm text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors border border-transparent hover:border-blue-500/20"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Become Recruiter</span>
                    </Link>
                  )}

                  {(userRole === 'recruiter' || userRole === 'admin') && (
                    <Link
                      to="/create-room"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 w-full px-3 py-2 text-sm text-green-400 hover:bg-green-500/10 rounded-lg transition-colors border border-transparent hover:border-green-500/20"
                    >
                      <Code2 className="w-4 h-4" />
                      <span>Create Room</span>
                    </Link>
                  )}

>>>>>>> da4a379f517619ed5f2890a9aff73fb6d70d1968
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

        {/* Mobile Right Section */}
        <div className="flex lg:hidden items-center gap-2">
          {/* Profile Avatar - Mobile */}
          <div className="w-8 h-8 rounded-full border-2 border-slate-700 overflow-hidden flex items-center justify-center bg-slate-800">
            {userData?.avatar ? (
              <img src={userData.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-slate-400" />
            )}
          </div>

          {/* Burger Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800 border border-slate-700 hover:border-blue-500 transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-slate-300" />
            ) : (
              <Menu className="w-5 h-5 text-slate-300" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed top-[73px] right-0 w-80 max-w-[85vw] h-[calc(100vh-73px)] bg-slate-950 border-l border-slate-800 z-50 lg:hidden overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="p-4">
              {/* User Info Section */}
              <div className="bg-slate-900 rounded-xl p-4 mb-4 border border-slate-800">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex flex-col overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-100 font-bold truncate">{nickname || 'Commander'}</span>
                      {userData?.role === "recruiter" && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                          Recruiter
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 text-xs truncate">{userData?.email || 'commander@fortcode.com'}</span>
                  </div>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="space-y-2 mb-4">
<<<<<<< HEAD
                {userData?.role === "recruiter" ? (
                  // Recruiter Mobile Navigation
                  <>
                    <MobileNavItem 
                      to="/home" 
                      icon={<Briefcase className="w-5 h-5" />} 
                      label="Dashboard" 
                      onClick={handleMobileMenuClose}
                    />
                    <MobileNavItem 
                      to="/map" 
                      icon={<Map className="w-5 h-5" />} 
                      label="World Map" 
                      onClick={handleMobileMenuClose}
                    />
                    <MobileNavItem 
                      to="/settings" 
                      icon={<Settings className="w-5 h-5" />} 
                      label="Settings" 
                      onClick={handleMobileMenuClose}
                    />
                  </>
                ) : (
                  // Participant Mobile Navigation
                  <>
                    <MobileNavItem 
                      to="/map" 
                      icon={<Map className="w-5 h-5" />} 
                      label="World Map" 
                      onClick={handleMobileMenuClose}
                    />
                    <MobileNavItem 
                      to="/training" 
                      icon={<Sword className="w-5 h-5" />} 
                      label="Training" 
                      onClick={handleMobileMenuClose}
                    />
                    <MobileNavItem 
                      to="/arena" 
                      icon={<Cpu className="w-5 h-5" />} 
                      label="Arena" 
                      onClick={handleMobileMenuClose}
                    />
                    <MobileNavItem 
                      to="/dashboard" 
                      icon={<User className="w-5 h-5" />} 
                      label="Commander" 
                      onClick={handleMobileMenuClose}
                    />
                    <MobileNavItem 
                      to="/armory" 
                      icon={<Trophy className="w-5 h-5" />} 
                      label="Armory" 
                      onClick={handleMobileMenuClose}
                    />
                    <MobileNavItem 
                      to="/settings" 
                      icon={<Settings className="w-5 h-5" />} 
                      label="Settings" 
                      onClick={handleMobileMenuClose}
                    />
                  </>
                )}
=======
                <MobileNavItem
                  to="/map"
                  icon={<Map className="w-5 h-5" />}
                  label="World Map"
                  onClick={handleMobileMenuClose}
                />
                <MobileNavItem
                  to="/training"
                  icon={<Sword className="w-5 h-5" />}
                  label="Training"
                  onClick={handleMobileMenuClose}
                />
                <MobileNavItem
                  to="/arena"
                  icon={<Cpu className="w-5 h-5" />}
                  label="Arena"
                  onClick={handleMobileMenuClose}
                />
                <MobileNavItem
                  to="/dashboard"
                  icon={<User className="w-5 h-5" />}
                  label="Commander"
                  onClick={handleMobileMenuClose}
                />
                <MobileNavItem
                  to="/armory"
                  icon={<Trophy className="w-5 h-5" />}
                  label="Armory"
                  onClick={handleMobileMenuClose}
                />
                <MobileNavItem
                  to="/programming-rooms"
                  icon={<Code2 className="w-5 h-5" />}
                  label="Programming Rooms"
                  onClick={handleMobileMenuClose}
                />
                <MobileNavItem
                  to="/settings"
                  icon={<Settings className="w-5 h-5" />}
                  label="Settings"
                  onClick={handleMobileMenuClose}
                />
>>>>>>> da4a379f517619ed5f2890a9aff73fb6d70d1968
              </div>

              {userData?.role !== "recruiter" && (
                <>
                  <div className="h-px bg-slate-800 my-4" />

<<<<<<< HEAD
                  {/* Action Buttons - Only for Participants */}
                  <div className="space-y-2 mb-4">
                    <Link
                      to="/castle"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-amber-500 text-slate-950 font-semibold shadow-[0_0_15px_rgba(251,191,36,0.5)] hover:bg-amber-400 transition-colors"
                    >
                      <Castle className="w-5 h-5" />
                      <span>Enter Castle</span>
                    </Link>
                    <button
                      onClick={() => {
                        handleResetLevels();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-rose-600 text-rose-50 font-semibold shadow-[0_0_12px_rgba(244,63,94,0.45)] hover:bg-rose-500 transition-colors"
                    >
                      <Shield className="w-5 h-5" />
                      <span>Reset Levels</span>
                    </button>
                  </div>
                </>
              )}
=======
              {/* Action Buttons */}
              <div className="space-y-2 mb-4">
                <Link
                  to="/castle"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-amber-500 text-slate-950 font-semibold shadow-[0_0_15px_rgba(251,191,36,0.5)] hover:bg-amber-400 transition-colors"
                >
                  <Castle className="w-5 h-5" />
                  <span>Enter Castle</span>
                </Link>

                {userRole === 'participant' && (
                  <Link
                    to="/request-recruiter"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-blue-600 text-white font-semibold shadow-[0_0_15px_rgba(37,99,235,0.5)] hover:bg-blue-500 transition-colors"
                  >
                    <UserPlus className="w-5 h-5" />
                    <span>Become Recruiter</span>
                  </Link>
                )}

                {(userRole === 'recruiter' || userRole === 'admin') && (
                  <Link
                    to="/create-room"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-green-600 text-white font-semibold shadow-[0_0_15px_rgba(34,197,94,0.5)] hover:bg-green-500 transition-colors"
                  >
                    <Code2 className="w-5 h-5" />
                    <span>Create Room</span>
                  </Link>
                )}

                <button
                  onClick={() => {
                    handleResetLevels();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-rose-600 text-rose-50 font-semibold shadow-[0_0_12px_rgba(244,63,94,0.45)] hover:bg-rose-500 transition-colors"
                >
                  <Shield className="w-5 h-5" />
                  <span>Reset Levels</span>
                </button>
              </div>
>>>>>>> da4a379f517619ed5f2890a9aff73fb6d70d1968

              <div className="h-px bg-slate-800 my-4" />

              {/* Profile Actions */}
              <div className="space-y-2">
                {/* Recruiter virtual room request button - Mobile */}
                {userData?.role === "recruiter" && (
                  <button
                    onClick={() => {
                      handleVirtualRoomRequest();
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 w-full px-4 py-3 text-sm rounded-lg transition-colors border ${
                      virtualRoomStatus?.status === 'approved'
                        ? 'text-emerald-300 hover:bg-emerald-500/10 border-emerald-500/30 bg-emerald-500/5'
                        : virtualRoomStatus?.status === 'pending'
                        ? 'text-amber-300 hover:bg-amber-500/10 border-amber-500/30 bg-amber-500/5'
                        : virtualRoomStatus?.status === 'rejected'
                        ? 'text-red-300 hover:bg-red-500/10 border-red-500/30 bg-red-500/5'
                        : 'text-emerald-300 hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/30'
                    }`}
                  >
                    <Video className="w-5 h-5" />
                    <span className="flex-1 text-left">
                      {virtualRoomStatus?.status === 'approved'
                        ? '✅ Virtual Room Approved'
                        : virtualRoomStatus?.status === 'pending'
                        ? '⏳ Virtual Room Pending'
                        : virtualRoomStatus?.status === 'rejected'
                        ? '❌ Request Rejected'
                        : 'Request Virtual Room'}
                    </span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setProfileModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
                >
                  <Settings className="w-5 h-5" />
                  <span>Update Profile</span>
                </button>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        userData={userData}
        onUpdateSuccess={(user) => {
          setUserData(user);
          setProfileModalOpen(false);
        }}
      />
    </>
  );
}

function NavItem({ to, icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
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

function MobileNavItem({ to, icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        twMerge(
          "flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all duration-300 font-medium",
          isActive
            ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]"
            : "text-slate-300 hover:text-white hover:bg-slate-800"
        )
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}
