import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import UserTable from "./components/UserTable";
import UserDetails from "./components/UserDetails";
import AddUserModal from "./components/AddUserModal";
import EditUserModal from "./components/EditUserModal";
import { User } from "./types";
import { useSocket } from "../../context/SocketContext";

const UserTracker: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("All Users");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState<boolean>(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState<boolean>(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const pageSize = 10;

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/auth/admin/users?t=${Date.now()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        console.log("DEBUG: fetchUsers received", data.users.length, "users.");
        if (selectedUserId) {
          const found = data.users.find((u: any) => u._id === selectedUserId);
          console.log("DEBUG: Selected user in list after fetch:", found?.username, "Avatar:", found?.avatar);
        }
        setUsers(data.users);
      }
      else if (Array.isArray(data.users)) {
        setUsers(data.users);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    }
  };

  /* ================= FETCH USERS & SOCKET ================= */
  const { socket } = useSocket();

  useEffect(() => {
    fetchUsers();

    if (socket) {
      socket.on("userStatusChanged", ({ userId, isOnline }) => {
        setUsers(prevUsers =>
          prevUsers.map(user =>
            user._id === userId ? { ...user, isOnline } : user
          )
        );
      });
    }

    return () => {
      if (socket) socket.off("userStatusChanged");
    };
  }, [socket]);

  /* ================= FILTER ================= */
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const searchStr = searchQuery.toLowerCase();
      const username = (user.username || "").toLowerCase();
      const email = (user.email || "").toLowerCase();

      const matchesSearch =
        username.includes(searchStr) ||
        email.includes(searchStr);

      if (activeFilter === "All Users") return matchesSearch;
      if (activeFilter === "Admins")
        return matchesSearch && user.role === "admin";
      if (activeFilter === "Participants")
        return matchesSearch && user.role === "participant";
      if (activeFilter === "Recruiters")
        return matchesSearch && user.role === "recruiter";

      return matchesSearch;
    }).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [users, activeFilter, searchQuery]);

  /* ================= PAGINATION ================= */
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery, users.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const selectedUser = users.find((u) => u._id === selectedUserId);

  const handleEditUser = (user: User) => {
    setUserToEdit(user);
    setIsEditUserModalOpen(true);
  };

  /* ================= FILTER BUTTONS ================= */
  const filters = ["All Users", "Admins", "Participants", "Recruiters"];

  return (
    <div className="flex h-screen bg-background-dark font-body text-gray-200 overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 relative">
        <Header
          title="User Tracker"
          subtitle="Manage and monitor platform participants"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Find user by name or email..."
        />

        <div className="flex-1 overflow-auto p-6 flex gap-6">
          {/* LEFT — Table column */}
          <div className="flex-1 flex flex-col gap-5 min-w-0">
            {/* Filter Toolbar */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Tabs */}
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${activeFilter === f
                    ? "bg-primary text-white shadow-glow"
                    : "bg-surface-dark border border-purple-900/30 text-gray-400 hover:text-white hover:border-purple-700/50"
                    }`}
                >
                  {f}
                </button>
              ))}

              {/* Add User */}
              <button
                onClick={() => setIsAddUserModalOpen(true)}
                className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-primary-hover transition-all shadow-glow">
                <span className="material-icons-outlined text-lg">add</span>
                Add User
              </button>
            </div>

            {/* Table */}
            <UserTable
              users={paginatedUsers}
              selectedUserId={selectedUserId}
              onSelectUser={setSelectedUserId}
              onEditUser={handleEditUser}
            />

            {/* Pagination */}
            <div className="flex items-center justify-between text-xs text-gray-500 px-1">
              <span>
                Showing{" "}
                <span className="text-white font-medium">
                  {Math.min((currentPage - 1) * pageSize + 1, filteredUsers.length)}
                </span>{" "}
                to{" "}
                <span className="text-white font-medium">
                  {Math.min(currentPage * pageSize, filteredUsers.length)}
                </span>{" "}
                of{" "}
                <span className="text-white font-medium">
                  {filteredUsers.length}
                </span>{" "}
                results
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-purple-900/20 disabled:opacity-30 transition-colors"
                >
                  <span className="material-icons-outlined text-sm">chevron_left</span>
                </button>

                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${currentPage === page
                        ? "bg-primary text-white shadow-glow"
                        : "text-gray-400 hover:text-white hover:bg-purple-900/20"
                        }`}
                    >
                      {page}
                    </button>
                  )
                )}

                {totalPages > 5 && (
                  <span className="text-gray-600 px-1">…</span>
                )}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-purple-900/20 disabled:opacity-30 transition-colors"
                >
                  <span className="material-icons-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT — User Details panel */}
          {selectedUser && (
            <UserDetails
              user={selectedUser}
              onClose={() => setSelectedUserId("")}
              onUserUpdated={fetchUsers}
            />
          )}
        </div>
      </main>

      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <AddUserModal
          isOpen={isAddUserModalOpen}
          onClose={() => setIsAddUserModalOpen(false)}
          onUserCreated={fetchUsers}
        />
      )}

      {/* Edit User Modal */}
      {isEditUserModalOpen && userToEdit && (
        <EditUserModal
          isOpen={isEditUserModalOpen}
          onClose={() => setIsEditUserModalOpen(false)}
          onUserUpdated={fetchUsers}
          user={userToEdit}
        />
      )}
    </div>
  );
};

export default UserTracker;
