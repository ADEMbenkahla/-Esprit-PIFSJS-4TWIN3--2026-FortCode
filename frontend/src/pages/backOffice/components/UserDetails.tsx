import React from 'react';
import { User } from '../types';
import { useNavigate } from 'react-router-dom';

interface UserDetailsProps {
  user: User;
  onClose: () => void;
  onUserUpdated?: () => void;
}

const UserDetails: React.FC<UserDetailsProps> = ({ user, onClose, onUserUpdated }) => {
  const navigate = useNavigate();
  const flags = user.flags ?? [];
  const languages = user.languages ?? [];
  const reports = user.reports ?? 0;
  const submissions = user.submissions ?? 0;

  const handleToggleStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/auth/admin/users/${user._id}/toggle`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        if (onUserUpdated) onUserUpdated();
      } else {
        alert("Failed to update user status");
      }
    } catch (error) {
      console.error("Error toggling user status:", error);
    }
  };

  const handleViewLogs = () => {
    navigate(`/admin/activity?userId=${user._id}`);
  };

  return (
    <aside className="w-96 flex-shrink-0 bg-surface-dark border-l border-purple-900/20 shadow-2xl flex flex-col z-30 transition-transform duration-300 overflow-hidden">
      {/* Header */}
      <div className="h-20 px-6 border-b border-purple-900/20 flex items-center justify-between bg-surface-dark/50">
        <h2 className="font-display font-bold text-lg text-white">User Details</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors"
        >
          <span className="material-icons-outlined">close</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
        {/* Profile Identity */}
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-primary to-accent-purple mb-4 shadow-glow relative">
            <img
              src={user.avatar || `https://i.pravatar.cc/150?u=${user._id}`}
              alt={user.name}
              className="w-full h-full rounded-full object-cover border-4 border-surface-dark"
            />
            <div
              className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-surface-dark ${user.isActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}
            ></div>
          </div>
          <h3 className="font-display font-bold text-xl text-white">{user.name}</h3>
          <p className="text-sm text-gray-500">@{user.username} • {user.role}</p>

          <div className="flex flex-col gap-2 w-full mt-5">
            <div className="flex gap-2">
              <button className="flex-1 px-4 py-2 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-primary-hover transition-all shadow-glow flex items-center justify-center gap-2">
                <span className="material-icons-outlined text-sm">mail</span> Email
              </button>
              <button
                onClick={handleToggleStatus}
                className={`flex-1 px-4 py-2 border text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${user.isActive
                  ? 'bg-transparent border-red-500/50 text-red-400 hover:bg-red-500/10'
                  : 'bg-green-500/10 border-green-500/50 text-green-400 hover:bg-green-500/20'
                  }`}
              >
                {user.isActive ? 'Suspend' : 'Activate'}
              </button>
            </div>

            <button
              onClick={handleViewLogs}
              className="w-full px-4 py-2 bg-purple-900/40 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-purple-900/60 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-icons-outlined text-sm">history</span> View Activity Logs
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Rank', value: user.rank != null ? `#${user.rank.toLocaleString()}` : '—', color: 'text-secondary' },
            { label: 'Submissions', value: submissions.toString(), color: 'text-white' },
            { label: 'Languages', value: languages.join(', '), color: 'text-white', isTags: true },
            { label: 'Reports', value: reports.toString(), color: reports > 0 ? 'text-red-500' : 'text-green-500' },
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded-xl bg-background-dark/50 border border-purple-900/20">
              <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">{stat.label}</div>
              {stat.isTags ? (
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {languages.length > 0 ? languages.map(lang => (
                    <span key={lang} className="px-1.5 py-0.5 rounded bg-purple-900/40 text-[9px] font-bold text-accent-purple border border-accent-purple/30">
                      {lang}
                    </span>
                  )) : (
                    <span className="text-xs text-gray-600 italic">—</span>
                  )}
                </div>
              ) : (
                <div className={`font-display font-bold text-lg ${stat.color}`}>{stat.value}</div>
              )}
            </div>
          ))}
        </div>

        {/* System Flags */}
        {flags.length > 0 && (
          <div className="pt-4 border-t border-purple-900/20">
            <h4 className="font-bold text-xs text-white uppercase tracking-widest mb-3">Account Flags</h4>
            <div className="bg-yellow-900/10 border border-yellow-700/30 rounded-lg p-3 flex items-start gap-3">
              <span className="material-icons-outlined text-yellow-500 text-sm">warning</span>
              <div>
                <p className="text-xs font-bold text-yellow-500">Alert Detected</p>
                <p className="text-[10px] text-yellow-500/80 mt-1 leading-relaxed">{flags[0]}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default UserDetails;
