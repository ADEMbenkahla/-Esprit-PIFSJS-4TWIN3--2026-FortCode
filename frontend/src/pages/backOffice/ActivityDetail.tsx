import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { ActivityLog } from './types';
import api from '../../services/api';
import { format } from 'date-fns';

const ActivityDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [log, setLog] = useState<ActivityLog | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchLog = async () => {
            setLoading(true);
            try {
                const response = await api.get(`/admin/activity/${id}`);
                setLog(response.data);
            } catch (err) {
                console.error("Failed to fetch log details", err);
                setError("Failed to load log details.");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchLog();
        }
    }, [id]);

    if (loading) {
        return (
            <div className="flex h-screen bg-background-dark font-body text-gray-200 items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !log) {
        return (
            <div className="flex h-screen bg-background-dark font-body text-gray-200 items-center justify-center flex-col gap-4">
                <span className="text-red-400">{error || "Log not found"}</span>
                <button onClick={() => navigate('/admin/activity')} className="text-primary hover:underline">
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-background-dark font-body text-gray-200 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 relative">
                <Header />

                <div className="flex-1 overflow-auto p-6 max-w-5xl mx-auto w-full">
                    <button
                        onClick={() => navigate('/admin/activity')}
                        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
                    >
                        <span className="material-icons-outlined text-sm">arrow_back</span>
                        Back to Activity Logs
                    </button>

                    <div className="bg-surface-dark border border-purple-900/20 rounded-2xl p-8 shadow-2xl">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-white mb-2">Activity Details</h1>
                                <p className="text-gray-500 font-mono text-xs">{log._id}</p>
                            </div>
                            <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-mono text-gray-400 border border-white/10">
                                {format(new Date(log.timestamp), 'PPP pp')}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* User Info */}
                            <div className="space-y-6">
                                <section>
                                    <h3 className="text-xs uppercase font-bold text-gray-500 tracking-widest mb-4">User Information</h3>
                                    <div className="bg-background-dark/50 p-4 rounded-xl border border-purple-900/10 flex items-center gap-4">
                                        {log.user ? (
                                            <>
                                                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">
                                                    {log.user.name?.[0] || log.user.username?.[0] || 'U'}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white text-lg">{log.user.name || log.user.username}</div>
                                                    <div className="text-sm text-gray-500">{log.user.email}</div>
                                                    <div className="text-xs text-gray-600 font-mono mt-1">ID: {log.user._id}</div>
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-gray-500 italic">Unauthenticated User / Guest</span>
                                        )}
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-xs uppercase font-bold text-gray-500 tracking-widest mb-4">Request Details</h3>
                                    <div className="bg-background-dark/50 p-4 rounded-xl border border-purple-900/10 space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400 text-sm">Method</span>
                                            <span className="font-bold text-white">{log.method}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400 text-sm">Route</span>
                                            <span className="font-mono text-primary text-sm">{log.route}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400 text-sm">IP Address</span>
                                            <span className="font-mono text-purple-300 text-sm">{log.ip}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400 text-sm">Referrer</span>
                                            <span className="text-gray-300 text-sm truncate max-w-[200px]" title={log.referrer}>{log.referrer || '-'}</span>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Device Info */}
                            <div className="space-y-6">
                                <section>
                                    <h3 className="text-xs uppercase font-bold text-gray-500 tracking-widest mb-4">Device & Environment</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-background-dark/50 p-4 rounded-xl border border-purple-900/10 text-center">
                                            <div className="text-gray-500 text-xs mb-1">Browser</div>
                                            <div className="font-bold text-white">{log.browser}</div>
                                        </div>
                                        <div className="bg-background-dark/50 p-4 rounded-xl border border-purple-900/10 text-center">
                                            <div className="text-gray-500 text-xs mb-1">Operating System</div>
                                            <div className="font-bold text-white">{log.os}</div>
                                        </div>
                                        <div className="bg-background-dark/50 p-4 rounded-xl border border-purple-900/10 text-center col-span-2">
                                            <div className="text-gray-500 text-xs mb-1">Device Type</div>
                                            <div className="font-bold text-white capitalize">{log.device}</div>
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-xs uppercase font-bold text-gray-500 tracking-widest mb-4">Raw User Agent</h3>
                                    <div className="bg-background-dark/50 p-4 rounded-xl border border-purple-900/10">
                                        <code className="text-[10px] text-gray-400 font-mono break-all leading-relaxed">
                                            {log.userAgent}
                                        </code>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ActivityDetail;
