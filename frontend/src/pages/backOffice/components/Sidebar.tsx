
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import logo from '../../../assets/logo.png';
import { useSidebar } from '../../../context/SidebarContext';
import { useSocket } from '../../../context/SocketContext';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSidebarOpen, closeSidebar } = useSidebar();
  const { disconnect } = useSocket();
  const [currentUser, setCurrentUser] = useState({
    name: "User",
    role: "Guest",
    avatar: ""
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        if (!token) return;

        // 1. Decode token for immediate display (optimistic UI)
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          setCurrentUser(prev => ({
            ...prev,
            name: payload.username || payload.name || prev.name,
            role: payload.role || prev.role
          }));
        } catch (e) {
          // Ignore token decode errors, proceed to fetch
        }

        // 2. Fetch fresh data from database
        const response = await fetch("http://localhost:5000/api/auth/profile", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          // Assuming the API returns the user object directly or nested in data.user
          // Adjust based on actual API response structure (commonly it's the root object or data.user)
          const user = data.user || data;

          setCurrentUser({
            name: user.username || user.name || "User",
            role: user.role || "Participant",
            avatar: user.avatar || ""
          });
        }
      } catch (error) {
        console.error("Failed to fetch user profile", error);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = () => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You will be logged out of your session.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#7c3aed',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, log out!',
      background: '#1a1a2e',
      color: '#fff'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.clear();
        sessionStorage.clear();
        disconnect();
        window.dispatchEvent(new Event('tokenChanged'));
        navigate("/");
        Swal.fire({
          title: 'Logged Out!',
          text: 'You have been safely logged out.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          background: '#1a1a2e',
          color: '#fff'
        });
      }
    });
  };

  const navItems = [
    { label: 'Dashboard', icon: 'dashboard', active: location.pathname === '/backoffice/dashboard', path: '/backoffice/dashboard' },
    { label: 'My Activity', icon: 'visibility', active: location.pathname === '/my-activity', path: '/my-activity' },
    { label: 'User Tracker', icon: 'people', active: location.pathname === '/backoffice/users', path: '/backoffice/users' },
    { label: 'Role Requests', icon: 'badge', active: location.pathname === '/backoffice/role-requests', path: '/backoffice/role-requests', adminOnly: true },
    { label: 'Activity Logs', icon: 'history', active: location.pathname.startsWith('/admin/activity'), path: '/admin/activity' },
    { label: 'Challenges', icon: 'emoji_events', active: false, path: '#' },
    { label: 'Analytics', icon: 'analytics', active: false, path: '#' },
    { label: 'Moderation', icon: 'shield', active: false, path: '#' },
  ];

  return (
    <>
      <aside className={`bg-surface-dark border-r border-purple-900/20 flex flex-col z-40 transition-all duration-300 overflow-hidden ${isSidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 lg:w-64 lg:opacity-100'
        }`}>
        <div className="h-20 min-w-[256px] flex items-center justify-between border-b border-purple-900/20 px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src={logo} alt="FortCode Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-display font-bold text-xl tracking-wider text-white uppercase italic">
              FORT<span className="text-accent-purple">CODE</span>
            </span>
          </div>

          <button
            onClick={closeSidebar}
            className="lg:hidden p-2 text-gray-400 hover:text-white"
          >
            <span className="material-icons-outlined">close</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 min-w-[256px] overflow-y-auto py-6 space-y-1 px-3">
          {navItems
            .filter(item => !item.adminOnly || currentUser.role === 'admin')
            .map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  if (item.path !== '#') {
                    navigate(item.path);
                    closeSidebar();
                  }
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${item.active
                  ? 'bg-primary/10 text-primary border-l-4 border-primary'
                  : 'text-gray-400 hover:bg-purple-900/20 hover:text-white'
                  }`}
              >
                <span className={`material-icons-outlined text-xl ${item.active ? 'text-primary' : 'group-hover:text-primary transition-colors'}`}>
                  {item.icon}
                </span>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}

          <div className="pt-8 mt-4 border-t border-purple-900/20 space-y-1">
            <p className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">System</p>
            <a
              href="#"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-purple-900/20 hover:text-white transition-all group"
            >
              <span className="material-icons-outlined text-xl group-hover:text-primary transition-colors">settings</span>
              <span className="font-medium">Settings</span>
            </a>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all group text-left"
            >
              <span className="material-icons-outlined text-xl group-hover:text-red-400 transition-colors">logout</span>
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </nav>

        {/* Current User */}
        <div className="p-4 border-t border-purple-900/20 min-w-[256px]">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10">
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-white truncate">{currentUser.name}</span>
              <span className="text-[10px] text-gray-500 capitalize">{currentUser.role}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};


export default Sidebar;
