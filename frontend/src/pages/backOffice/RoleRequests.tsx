import React, { useState, useEffect } from 'react';
import { Shield, Filter, Loader2, MessageSquare, FileText, Download } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import api from '../../services/api';

export default function RoleRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await api.get('/role-requests', { params });
      setRequests(response.data.requests);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setMessage({ type: 'error', text: 'Error loading requests' });
    } finally {
      setLoading(false);
    }
  };

  const handleAIReview = async (requestId) => {
    setProcessing(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.post(`/role-requests/${requestId}/ai-review`);
      setMessage({ type: 'success', text: response.data.message });
      fetchRequests();
    } catch (error) {
      const errMsg = error.response?.data?.message || 'AI service error';
      const debugMsg = error.response?.data?.debug ? ` - ${error.response.data.debug}` : '';
      setMessage({ type: 'error', text: errMsg + debugMsg });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      approved: 'bg-green-500/20 text-green-400 border-green-500/30',
      rejected: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    const labels = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };
    return (
      <span className={`px-3 py-1 rounded-full text-sm border font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="flex h-screen bg-background-dark font-body text-gray-200 overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 relative">
        <Header
          title="Recruiter Role Requests"
          subtitle="Manage recruiter role requests from participants"
        />

        <div className="flex-1 overflow-auto p-4 md:p-6">

          {/* Message */}
          {message.text && (
            <div className={`mb-6 p-4 rounded-lg border ${message.type === 'success'
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
              {message.text}
            </div>
          )}

          {/* Filters */}
          <div className="mb-6 flex items-center gap-4 bg-surface-dark/50 p-4 rounded-lg border border-purple-900/30 flex-wrap overflow-x-hidden">
            <Filter className="w-5 h-5 text-gray-500" />
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'all', label: 'All' },
                { value: 'pending', label: 'Pending', count: pendingCount },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' }
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${statusFilter === filter.value
                      ? 'bg-primary text-white'
                      : 'bg-background-dark/50 text-gray-400 hover:bg-background-dark/70 border border-purple-900/20'
                    }`}
                >
                  {filter.label}
                  {filter.count !== undefined && filter.count > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full">
                      {filter.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Request List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 bg-background-dark/50 rounded-lg border border-purple-900/30">
              <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500">No requests found</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {requests.map((request) => (
                <div
                  key={request._id}
                  className="bg-background-dark/50 border border-purple-900/30 rounded-lg p-6 hover:border-purple-900/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={request.userId?.avatar || 'https://api.dicebear.com/9.x/avataaars/svg?seed=default'}
                        alt={request.userId?.username}
                        className="w-12 h-12 rounded-full border-2 border-purple-900/50"
                      />
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {request.userId?.nickname || request.userId?.username || 'Unknown user'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          @{request.userId?.username} • {request.userId?.email}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Justification:</span>
                      <p className="text-gray-200 mt-1 leading-relaxed break-words">{request.justification}</p>
                    </div>

                    {request.proofDocument && (
                      <div className="flex items-center gap-3 p-3 bg-purple-900/10 border border-purple-900/30 rounded-lg">
                        <FileText className="w-5 h-5 text-blue-400" />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-300">Proof Document</span>
                        </div>
                        <a
                          href={`http://localhost:5000${request.proofDocument}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-purple-900/30 rounded-lg transition-colors text-blue-400"
                          title="Download Proof"
                        >
                          <Download className="w-5 h-5" />
                        </a>
                      </div>
                    )}

                    {/* AI Scores Summary */}
                    {request.aiDecision && request.aiDecision !== 'NONE' && (
                      <div className="grid grid-cols-2 gap-4 p-4 bg-surface-dark/30 rounded-lg border border-purple-900/20">
                        <div className="space-y-1">
                          <span className="text-xs text-gray-500 uppercase font-bold">Document Score</span>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-background-dark rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${request.documentScore >= 0.7 ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{ width: `${(request.documentScore || 0) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-mono font-bold text-gray-300">
                              {Math.round((request.documentScore || 0) * 100)}%
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-gray-500 uppercase font-bold">Text Score</span>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-background-dark rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${request.textScore >= 0.6 ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{ width: `${(request.textScore || 0) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-mono font-bold text-gray-300">
                              {Math.round((request.textScore || 0) * 100)}%
                            </span>
                          </div>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-purple-900/10">
                          <div className="flex items-start gap-2">
                            <div className={`p-1 rounded flex-shrink-0 ${request.aiDecision === 'ACCEPT' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              <Shield className="w-4 h-4" />
                            </div>
                            <p className="text-sm text-gray-400 italic break-words overflow-hidden">
                              AI Explanation: <span className="text-gray-200 not-italic">{request.aiExplanation}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-4 text-xs text-gray-600">
                      <span>Created: {new Date(request.createdAt).toLocaleString()}</span>
                      {request.reviewedAt && (
                        <span>Analyzed: {new Date(request.reviewedAt).toLocaleString()}</span>
                      )}
                    </div>

                    {/* AI Review Action for PENDING */}
                    {request.status === 'pending' && (
                      <div className="mt-4 pt-4 border-t border-purple-900/30">
                        <button
                          onClick={() => handleAIReview(request._id)}
                          disabled={processing}
                          className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 text-white rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-purple-900/20 active:scale-95"
                        >
                          {processing ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                          ) : (
                            <>
                              <Loader2 className="w-6 h-6" />
                              <span>🤖 Launch AI Auto-Analysis</span>
                            </>
                          )}
                        </button>
                        <p className="text-center text-xs text-gray-500 mt-2">
                          AI will analyze the document and justification to auto-decide.
                        </p>
                      </div>
                    )}

                    {/* Decision Log */}
                    {request.status !== 'pending' && request.adminComment && (
                      <div className="mt-2 p-3 bg-background-dark/40 rounded-lg border-l-4 border-primary/50">
                        <div className="flex items-center gap-2 mb-1">
                          <MessageSquare className="w-4 h-4 text-primary" />
                          <span className="text-xs font-bold text-gray-400 uppercase">Decision Log:</span>
                        </div>
                        <p className="text-sm text-gray-300 italic break-words overflow-hidden">{request.adminComment}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
