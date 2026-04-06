import React from 'react';
import { ActivityLog } from '../types';
import { format } from 'date-fns';

interface ActivityTableProps {
    logs: ActivityLog[];
    onViewDetails?: (id: string) => void;
}

const ActivityTable: React.FC<ActivityTableProps> = ({ logs, onViewDetails }) => {
    if (!logs.length) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-2 p-10">
                <span className="material-icons-outlined text-4xl">history_toggle_off</span>
                <p>No activity logs found.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-auto scrollbar-custom">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-surface-dark/80 border-b border-purple-900/20 sticky top-0 z-10 backdrop-blur-md">
                            <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-widest">Date/Time</th>
                            <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-widest">User</th>
                            <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-widest">Action</th>
                            <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-widest">Browser/OS</th>
                            <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-widest">IP</th>
                            <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-widest text-right">Details</th>
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
                                        onClick={() => onViewDetails?.(log._id)}
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
        </div>
    );
};

export default ActivityTable;
