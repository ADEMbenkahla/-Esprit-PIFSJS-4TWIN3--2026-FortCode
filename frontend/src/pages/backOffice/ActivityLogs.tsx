import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { ActivityLog } from './types';
import api from '../../services/api';
import { format } from 'date-fns';
import { ScrollButton } from '../frontOffice/components/ui/ScrollButton';

const ActivityLogs: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [userId, setUserId] = useState(searchParams.get('userId') || '');
    const [route, setRoute] = useState('');
    const [ip, setIp] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totallogs, setTotalLogs] = useState(0);

    // Update userId if query param changes
    useEffect(() => {
        const queryUserId = searchParams.get('userId');
        if (queryUserId) {
            setUserId(queryUserId);
        }
    }, [searchParams]);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            setError('');
            try {
                const params = {
                    page,
                    limit,
                    userId: userId || undefined,
                    route: route || undefined,
                    ip: ip || undefined,
                    dateFrom: dateFrom || undefined,
                    dateTo: dateTo || undefined,
                };

                // If backend endpoint is different, adjust here. 
                // Assuming standard /admin/activity based on request description
                const response = await api.get('/admin/activity', { params });

                if (response.data && response.data.logs) {
                    setLogs(response.data.logs);
                    setTotalPages(response.data.totalPages || 1);
                    setTotalLogs(response.data.total || 0);
                } else if (Array.isArray(response.data)) {
                    // Fallback if backend returns generic array
                    setLogs(response.data);
                    setTotalPages(1);
                }
            } catch (err) {
                console.error("Failed to fetch activity logs", err);
                setError("Failed to load activity logs. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        // Debounce search slightly
        const timeoutId = setTimeout(() => {
            fetchLogs();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [page, limit, userId, route, ip, dateFrom, dateTo]);

    const handleClearFilters = () => {
        setUserId('');
        setRoute('');
        setIp('');
        setDateFrom('');
        setDateTo('');
        setPage(1);
    };

    return (
        <div className="flex h-screen bg-background-dark font-body text-gray-200 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 relative">
                <Header
                    title="Activity Logs"
                    subtitle="Monitor user actions and system events"
                    searchQuery={userId}
                    onSearchChange={setUserId}
                    searchPlaceholder="Search by User ID or Name..."
                />

                <div className="flex-1 overflow-auto p-4 md:p-6 flex flex-col gap-6 transition-all duration-300">
                    {/* Header / Actions */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white font-display">Activity Logs</h2>
                            <p className="text-sm text-gray-500">Monitor user actions and system events</p>
                        </div>
                        <button
                            onClick={handleClearFilters}
                            className="px-4 py-2 bg-purple-900/30 text-purple-200 text-xs font-bold uppercase rounded-lg hover:bg-purple-900/50 transition-colors"
                        >
                            Clear Filters
                        </button>
                    </div>

                    {/* Filters Toolbar */}
                    <div className="bg-surface-dark p-4 rounded-xl border border-purple-900/20 grid grid-cols-1 md:grid-cols-4 gap-3">
                        <input
                            type="text"
                            placeholder="Route (e.g. /api/auth)"
                            value={route}
                            onChange={(e) => setRoute(e.target.value)}
                            className="bg-background-dark border border-purple-900/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                        />
                        <input
                            type="text"
                            placeholder="IP Address"
                            value={ip}
                            onChange={(e) => setIp(e.target.value)}
                            className="bg-background-dark border border-purple-900/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                        />
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="bg-background-dark border border-purple-900/30 rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-primary transition-colors"
                        />
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="bg-background-dark border border-purple-900/30 rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-primary transition-colors"
                        />
                    </div>

                    {/* Table or Empty State */}
                    <div className="flex-1 bg-surface-dark border border-purple-900/20 rounded-xl overflow-hidden flex flex-col">
                        {error && (
                            <div className="p-4 bg-red-500/10 text-red-400 text-sm text-center border-b border-red-500/20">
                                {error}
                            </div>
                        )}

                        {loading ? (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-2">
                                <span className="material-icons-outlined text-4xl">history_toggle_off</span>
                                <p>No activity logs found matching your filters.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-background-dark/50 text-xs uppercase text-gray-500 font-bold tracking-wider">
                                        <tr>
                                            <th className="p-4 border-b border-purple-900/20">Date/Time</th>
                                            <th className="p-4 border-b border-purple-900/20">User</th>
                                            <th className="p-4 border-b border-purple-900/20">Action</th>
                                            <th className="p-4 border-b border-purple-900/20">Browser/OS</th>
                                            <th className="p-4 border-b border-purple-900/20">IP</th>
                                            <th className="p-4 border-b border-purple-900/20 text-right">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-purple-900/10">
                                        {logs.map((log) => (
                                            <tr key={log._id} className="hover:bg-white/5 transition-colors group">
                                                <td className="p-4 text-sm text-gray-300 whitespace-nowrap">
                                                    {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        {log.user ? (
                                                            <div className="text-sm">
                                                                <div className="font-bold text-white">{log.user.name || log.user.username || 'System'}</div>
                                                                <div className="text-xs text-gray-500">{log.user.email}</div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-500 italic text-sm">Guest / Unknown</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border 
                                                    ${log.method === 'GET' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                                log.method === 'POST' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                                    log.method === 'DELETE' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                                        'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
                                                            {log.method}
                                                        </span>
                                                        <span className="text-sm text-gray-400 font-mono truncate max-w-[150px]" title={log.route}>
                                                            {log.route}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm text-gray-400">
                                                    <div className="flex flex-col">
                                                        <span>{log.browser}</span>
                                                        <span className="text-xs text-gray-600">{log.os} • {log.device}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm text-purple-300 font-mono">
                                                    {log.ip}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button
                                                        onClick={() => navigate(`/admin/activity/${log._id}`)}
                                                        className="p-2 hover:bg-primary/20 text-gray-400 hover:text-primary rounded-lg transition-all"
                                                        title="View Details"
                                                    >
                                                        <span className="material-icons-outlined">visibility</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination Footer */}
                        <div className="p-4 border-t border-purple-900/20 flex items-center justify-between bg-background-dark/30">
                            <span className="text-xs text-gray-500">
                                Page <span className="text-white font-bold">{page}</span> of <span className="text-white font-bold">{totalPages}</span>
                                <span className="mx-2">•</span>
                                Total: {totallogs} logs
                            </span>
                            <div className="flex gap-2">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    className="px-3 py-1 bg-surface-dark border border-purple-900/30 rounded text-xs text-gray-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Previous
                                </button>
                                <button
                                    disabled={page === totalPages}
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    className="px-3 py-1 bg-surface-dark border border-purple-900/30 rounded text-xs text-gray-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <ScrollButton />
        </div>
    );
};

export default ActivityLogs;
