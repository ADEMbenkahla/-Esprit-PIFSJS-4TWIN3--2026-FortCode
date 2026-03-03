import React, { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import { format } from "date-fns";
import { ScrollButton } from "../frontOffice/components/ui/ScrollButton";

interface ActivityLog {
    _id: string;
    user: { username?: string; name?: string; email: string; avatar?: string } | null;
    method: string;
    route: string;
    ip: string;
    timestamp: string;
}

interface DashboardStats {
    totalUsers: number;
    participants: number;
    admins: number;
    recruiters: number;
    onlineUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    newUsersThisWeek: number;
    totalLogs: number;
    recentActivity: ActivityLog[];
    activityPerDay: { date: string; count: number }[];
}

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = sessionStorage.getItem("token") || localStorage.getItem("token");
                const res = await fetch("http://localhost:5000/api/admin/dashboard/stats", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (res.ok) setStats(data);
            } catch (err) {
                console.error("Failed to fetch dashboard stats", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const methodColor = (m: string) => {
        if (m === "GET") return "text-blue-400 bg-blue-500/10 border-blue-500/20";
        if (m === "POST") return "text-green-400 bg-green-500/10 border-green-500/20";
        if (m === "DELETE") return "text-red-400 bg-red-500/10 border-red-500/20";
        return "text-purple-400 bg-purple-500/10 border-purple-500/20";
    };

    const maxActivity = stats ? Math.max(...stats.activityPerDay.map((d) => d.count), 1) : 1;

    return (
        <div className="flex h-screen bg-background-dark font-body text-gray-200 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 relative">
                <Header
                    title="Dashboard"
                    subtitle="Platform overview and analytics"
                />

                <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                        </div>
                    ) : stats ? (
                        <>
                            {/* === STAT CARDS === */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                {[
                                    { label: "Total Users", value: stats.totalUsers, icon: "groups", gradient: "from-violet-600 to-purple-700" },
                                    { label: "Online Now", value: stats.onlineUsers, icon: "wifi", gradient: "from-emerald-500 to-green-600" },
                                    { label: "Participants", value: stats.participants, icon: "school", gradient: "from-blue-500 to-indigo-600" },
                                    { label: "Admins", value: stats.admins, icon: "admin_panel_settings", gradient: "from-rose-500 to-red-600" },
                                    { label: "Recruiters", value: stats.recruiters, icon: "business_center", gradient: "from-amber-500 to-orange-600" },

                                ].map((card) => (
                                    <div
                                        key={card.label}
                                        className="group relative overflow-hidden rounded-2xl bg-surface-dark border border-white/10 p-5 hover:border-white/20 transition-all duration-300 hover:scale-[1.02]"
                                    >
                                        <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full bg-gradient-to-br ${card.gradient} opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-500`} />
                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-3 shadow-lg`}>
                                            <span className="material-icons-outlined text-white text-xl">{card.icon}</span>
                                        </div>
                                        <p className="text-3xl font-black text-white tracking-tight">{card.value}</p>
                                        <p className="text-xs text-gray-500 font-medium mt-1 uppercase tracking-wider">{card.label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* === MIDDLE ROW: Role Distribution + Activity Chart === */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                {/* Role Distribution */}
                                <div className="bg-surface-dark rounded-2xl border border-white/10 p-6">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
                                        <span className="material-icons-outlined text-primary text-lg">pie_chart</span>
                                        Role Distribution
                                    </h3>
                                    <div className="space-y-4">
                                        {[
                                            { label: "Participants", count: stats.participants, color: "bg-blue-500", pct: stats.totalUsers ? Math.round((stats.participants / stats.totalUsers) * 100) : 0 },
                                            { label: "Admins", count: stats.admins, color: "bg-rose-500", pct: stats.totalUsers ? Math.round((stats.admins / stats.totalUsers) * 100) : 0 },
                                            { label: "Recruiters", count: stats.recruiters, color: "bg-amber-500", pct: stats.totalUsers ? Math.round((stats.recruiters / stats.totalUsers) * 100) : 0 },
                                        ].map((role) => (
                                            <div key={role.label}>
                                                <div className="flex justify-between text-sm mb-1.5">
                                                    <span className="text-gray-400 font-medium">{role.label}</span>
                                                    <span className="text-white font-bold">{role.count} <span className="text-gray-600 font-normal">({role.pct}%)</span></span>
                                                </div>
                                                <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${role.color} rounded-full transition-all duration-1000 ease-out`}
                                                        style={{ width: `${role.pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Status summary */}
                                    <div className="mt-6 pt-5 border-t border-white/5 grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                                            <div>
                                                <p className="text-white font-bold text-lg">{stats.activeUsers}</p>
                                                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Active</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full bg-red-400" />
                                            <div>
                                                <p className="text-white font-bold text-lg">{stats.inactiveUsers}</p>
                                                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Inactive</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Activity Chart (last 7 days) */}
                                <div className="bg-surface-dark rounded-2xl border border-white/10 p-6">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
                                        <span className="material-icons-outlined text-primary text-lg">bar_chart</span>
                                        Activity (Last 7 Days)
                                    </h3>
                                    <div className="flex items-end gap-2 h-40">
                                        {stats.activityPerDay.map((day) => {
                                            const heightPct = (day.count / maxActivity) * 100;
                                            const dayLabel = format(new Date(day.date), "EEE");
                                            return (
                                                <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                                                    <span className="text-xs font-bold text-white">{day.count}</span>
                                                    <div className="w-full relative rounded-t-lg overflow-hidden bg-white/5" style={{ height: "100px" }}>
                                                        <div
                                                            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary to-purple-500 rounded-t-lg transition-all duration-700 ease-out"
                                                            style={{ height: `${Math.max(heightPct, 4)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-gray-500 uppercase font-bold">{dayLabel}</span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                                        <div>
                                            <p className="text-2xl font-black text-white">{stats.totalLogs.toLocaleString()}</p>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Total Logs</p>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20">
                                            <span className="material-icons-outlined text-primary text-sm">speed</span>
                                            <span className="text-xs text-primary font-bold">
                                                {stats.activityPerDay.length > 0 ? Math.round(stats.activityPerDay.reduce((s, d) => s + d.count, 0) / stats.activityPerDay.length) : 0}/day avg
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* === RECENT ACTIVITY FEED === */}
                            <div className="bg-surface-dark rounded-2xl border border-white/10 overflow-hidden">
                                <div className="p-5 border-b border-white/5 flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                        <span className="material-icons-outlined text-primary text-lg">timeline</span>
                                        Recent Activity
                                    </h3>
                                    <span className="text-[10px] text-gray-600 uppercase tracking-widest">Live Feed</span>
                                </div>
                                <div className="divide-y divide-white/5">
                                    {stats.recentActivity.map((log) => (
                                        <div key={log._id} className="px-5 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                                            {/* Avatar */}
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-accent-purple p-[2px] flex-shrink-0">
                                                <div className="w-full h-full rounded-full bg-surface-dark flex items-center justify-center overflow-hidden">
                                                    <img
                                                        src={log.user?.avatar || `https://ui-avatars.com/api/?name=${log.user?.username || "U"}&background=random&size=36`}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-white truncate">
                                                        {log.user?.username || log.user?.name || "System"}
                                                    </span>
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border ${methodColor(log.method)}`}>
                                                        {log.method}
                                                    </span>
                                                    <span className="text-xs text-gray-500 font-mono truncate">{log.route}</span>
                                                </div>
                                                <p className="text-[11px] text-gray-600 mt-0.5">{log.ip}</p>
                                            </div>

                                            {/* Time */}
                                            <span className="text-xs text-gray-600 whitespace-nowrap flex-shrink-0">
                                                {format(new Date(log.timestamp), "HH:mm:ss")}
                                            </span>
                                        </div>
                                    ))}

                                    {stats.recentActivity.length === 0 && (
                                        <div className="p-8 text-center text-gray-600 text-sm">
                                            No recent activity recorded.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                            <p>Failed to load dashboard data.</p>
                        </div>
                    )}
                </div>
            </main>
            <ScrollButton />
        </div>
    );
};

export default Dashboard;
