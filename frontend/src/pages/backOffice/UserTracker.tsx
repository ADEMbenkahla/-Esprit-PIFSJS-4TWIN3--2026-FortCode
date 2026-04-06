import React, { useEffect, useMemo, useState, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import UserTable from "./components/UserTable";
import UserDetails from "./components/UserDetails";
import AddUserModal from "./components/AddUserModal";
import EditUserModal from "./components/EditUserModal";
import { User } from "./types";
import { useSocket } from "../../context/SocketContext";
import { ScrollButton } from "../frontOffice/components/ui/ScrollButton";

const UserTracker: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("All Users");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState<boolean>(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState<boolean>(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const pageSize = 7;

  const fetchUsers = useCallback(async () => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const url = new URL("http://localhost:5000/api/auth/admin/users");
      url.searchParams.append("page", currentPage.toString());
      url.searchParams.append("limit", pageSize.toString());
      if (searchQuery) url.searchParams.append("search", searchQuery);
      if (activeFilter !== "All Users") url.searchParams.append("role", activeFilter);
      url.searchParams.append("t", Date.now().toString());

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setUsers(data.users || []);
        setTotalPages(data.totalPages || 1);
        setTotalUsers(data.totalUsers || 0);
      } else {
        setUsers([]);
        setTotalPages(1);
        setTotalUsers(0);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    }
  }, [currentPage, searchQuery, activeFilter]);

  /* ================= FETCH USERS & SOCKET ================= */
  const { socket } = useSocket();

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, currentPage, activeFilter]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      // Only reset to page 1 if the searchQuery actually changed and we are not on page 1
      if (searchQuery && currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchUsers();
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery, fetchUsers]); // Removed currentPage from dependencies

  useEffect(() => {
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
  // Client-side filtering removed as it's now handled by the backend
  const filteredUsers = users;

  /* ================= PAGINATION ================= */
  // totalPages and totalUsers are now fetched from the backend
  // paginatedUsers is no longer needed as 'users' state already holds paginated data

  useEffect(() => {
    // When filter or search changes, reset to page 1
    setCurrentPage(1);
  }, [activeFilter]); // searchQuery handled by its own debounce useEffect

  useEffect(() => {
    // If current page exceeds new total pages (e.g., after filter/search reduces results)
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    } else if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [totalPages]);


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

        <div className="flex-1 overflow-hidden p-4 md:p-6 flex flex-col lg:flex-row gap-6 transition-all duration-300">
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

            {/* Table Area - Focused Body */}
            <div className="flex-1 min-h-0 bg-surface-dark/30 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
              <UserTable
                users={users}
                selectedUserId={selectedUserId}
                onSelectUser={setSelectedUserId}
                onEditUser={handleEditUser}
              />
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-xs text-gray-500 px-1 mt-auto">
              <span>
                Showing{" "}
                <span className="text-white font-medium">
                  {totalUsers === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="text-white font-medium">
                  {Math.min(currentPage * pageSize, totalUsers)}
                </span>{" "}
                of{" "}
                <span className="text-white font-medium">
                  {totalUsers}
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

                {(() => {
                  const pages = [];
                  const showMax = 5;
                  let start = Math.max(1, currentPage - 2);
                  let end = Math.min(totalPages, start + showMax - 1);

                  if (end - start < showMax - 1) {
                    start = Math.max(1, end - showMax + 1);
                  }

                  if (start > 1) {
                    pages.push(
                      <button
                        key={1}
                        onClick={() => setCurrentPage(1)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${currentPage === 1
                          ? "bg-primary text-white shadow-glow"
                          : "text-gray-400 hover:text-white hover:bg-purple-900/20"
                          }`}
                      >
                        1
                      </button>
                    );
                    if (start > 2) pages.push(<span key="start-dots" className="text-gray-600 px-1">…</span>);
                  }

                  for (let i = start; i <= end; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${currentPage === i
                          ? "bg-primary text-white shadow-glow"
                          : "text-gray-400 hover:text-white hover:bg-purple-900/20"
                          }`}
                      >
                        {i}
                      </button>
                    );
                  }

                  if (end < totalPages) {
                    if (end < totalPages - 1) pages.push(<span key="end-dots" className="text-gray-600 px-1">…</span>);
                    pages.push(
                      <button
                        key={totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${currentPage === totalPages
                          ? "bg-primary text-white shadow-glow"
                          : "text-gray-400 hover:text-white hover:bg-purple-900/20"
                          }`}
                      >
                        {totalPages}
                      </button>
                    );
                  }

                  return pages;
                })()}

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
      <ScrollButton />
    </div>
  );
};

export default UserTracker;
