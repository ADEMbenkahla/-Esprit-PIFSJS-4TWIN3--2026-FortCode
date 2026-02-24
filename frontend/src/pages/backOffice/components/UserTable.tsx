import React from "react";
import { User } from "../types";

interface UserTableProps {
  users: User[];
  selectedUserId: string;
  onSelectUser: (id: string) => void;
  onEditUser?: (user: User) => void;
}

const UserTable: React.FC<UserTableProps> = ({
  users,
  selectedUserId,
  onSelectUser,
  onEditUser,
}) => {

  /* =========================
     STYLE HELPERS
  ========================== */

  const getRoleStyle = (role?: string) => {
    switch (role?.toLowerCase()) {
      case "participant":
        return "bg-purple-900/30 text-purple-300 border-purple-700/50";
      case "recruiter":
        return "bg-blue-900/30 text-blue-300 border-blue-700/50";
      case "admin":
        return "bg-red-900/30 text-red-300 border-red-700/50";
      default:
        return "bg-gray-800 text-gray-300 border-gray-700";
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]";
      case "idle":
        return "bg-yellow-500";
      case "suspended":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (!users.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-2 p-10">
        <span className="material-icons-outlined text-4xl">person_off</span>
        <p>Users not found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex-1 overflow-auto scrollbar-custom">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-surface-dark/80 border-b border-purple-900/20 sticky top-0 z-10 backdrop-blur-md">
              <th className="p-4 w-12 text-center"></th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-widest">User</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-widest">Role</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-widest">XP / Level</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-widest">Status</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-purple-900/10">
            {users.map((user) => (
              <tr
                key={user._id}
                onClick={() => onSelectUser(user._id)}
                className={`transition-colors group cursor-pointer ${selectedUserId === user._id
                  ? "bg-primary/10 border-l-4 border-primary"
                  : "hover:bg-purple-900/10 border-l-4 border-transparent"
                  }`}
              >
                <td className="p-4 text-center">
                  <input
                    type="checkbox"
                    checked={selectedUserId === user._id}
                    readOnly
                    className="rounded border-gray-700 text-primary focus:ring-primary bg-transparent"
                  />
                </td>

                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={user.avatar || "/default-avatar.png"}
                        alt={user.username}
                        className="w-9 h-9 rounded-full border border-purple-900/50"
                      />
                      {user.isOnline && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-surface-dark rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-white">
                        {user.username}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {user.email}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="p-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getRoleStyle(
                      user.role
                    )}`}
                  >
                    {user.role?.toUpperCase()}
                  </span>
                </td>

                <td className="p-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-display text-white">
                      {(user.xp || 0).toLocaleString()} XP
                    </span>
                    <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-primary to-orange-400 h-full rounded-full"
                        style={{
                          width: `${((user.xp || 0) / 100000) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-gray-500">
                      Lvl {user.level || 1}
                    </span>
                  </div>
                </td>

                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${user.isOnline ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-gray-500"}`}
                    ></span>
                    <span className="text-sm text-gray-300">
                      {user.isOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                </td>

                <td className="p-4 text-right">
                  <div
                    className={`flex items-center justify-end gap-2 transition-opacity ${selectedUserId === user._id
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100"
                      }`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onEditUser) onEditUser(user);
                      }}
                      className="text-primary hover:text-primary-hover p-1.5 rounded hover:bg-primary/10 transition-colors">
                      <span className="material-icons-outlined text-lg">
                        edit
                      </span>
                    </button>
                    <button className="text-gray-400 hover:text-white p-1.5 rounded hover:bg-gray-700 transition-colors">
                      <span className="material-icons-outlined text-lg">
                        visibility
                      </span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserTable;
