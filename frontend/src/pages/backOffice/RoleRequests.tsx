import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, Filter, Loader2, MessageSquare, User, FileText, Download } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import api from '../../services/api';

export default function RoleRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminComment, setAdminComment] = useState('');
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

  const handleApprove = async (requestId) => {
    setProcessing(true);
    setMessage({ type: '', text: '' });

    try {
      await api.put(`/role-requests/${requestId}/approve`, { 
        adminComment: adminComment || undefined 
      });
      setMessage({ type: 'success', text: 'Request approved successfully!' });
      setSelectedRequest(null);
      setAdminComment('');
      fetchRequests();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Error while approving request' 
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (requestId) => {
    if (!adminComment.trim()) {
      setMessage({ type: 'error', text: 'Please provide a comment for rejection' });
      return;
    }

    setProcessing(true);
    setMessage({ type: '', text: '' });

    try {
      await api.put(`/role-requests/${requestId}/reject`, { 
        adminComment 
      });
      setMessage({ type: 'success', text: 'Request rejected' });
      setSelectedRequest(null);
      setAdminComment('');
      fetchRequests();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Error while rejecting request' 
      });
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

    const labels = {
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected'
    };

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
        <div className={`mb-6 p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex items-center gap-4 bg-surface-dark/50 p-4 rounded-lg border border-purple-900/30">
        <Filter className="w-5 h-5 text-gray-500" />
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'All' },
            { value: 'pending', label: 'Pending', count: pendingCount },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' }
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === filter.value
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

              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-500 font-medium">Justification:</span>
                  <p className="text-white mt-1">{request.justification}</p>
                </div>

                {request.proofDocument && (
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                    <span className="text-sm text-gray-300 font-semibold block mb-2">📎 Attached proof document:</span>
                    <a
                      href={`http://localhost:5000${request.proofDocument}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all hover:shadow-lg hover:shadow-blue-500/30"
                    >
                      <FileText className="w-5 h-5" />
                      <span>Download/View document</span>
                      <Download className="w-4 h-4 ml-1" />
                    </a>
                  </div>
                )}

                <div className="flex gap-4 text-sm text-gray-500">
                  <span>Created on: {new Date(request.createdAt).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                  {request.reviewedAt && (
                    <span>Reviewed on: {new Date(request.reviewedAt).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  )}
                </div>

                {request.adminComment && (
                  <div className="mt-3 p-4 bg-background-dark/70 rounded-lg border border-purple-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-purple-400" />
                        <span className="text-sm text-gray-300 font-semibold">Admin Comment:</span>
                      </div>
                      {request.reviewedBy && (
                        <div className="flex items-center gap-2 bg-purple-500/20 px-3 py-1 rounded-full">
                          <User className="w-4 h-4 text-purple-300" />
                          <span className="text-sm text-purple-200 font-medium">
                            {request.reviewedBy.username}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-100 text-base leading-relaxed font-medium bg-purple-500/5 p-3 rounded border-l-4 border-purple-500">{request.adminComment}</p>
                  </div>
                )}

                {/* Pending request actions */}
                {request.status === 'pending' && (
                  <div className="mt-4 pt-4 border-t border-purple-900/30">
                    {selectedRequest === request._id ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Comment (optional for approval, required for rejection)
                          </label>
                          <textarea
                            value={adminComment}
                            onChange={(e) => setAdminComment(e.target.value)}
                            placeholder="Add a comment..."
                            className="w-full px-4 py-2 bg-background-dark border border-purple-900/30 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                            rows={3}
                            maxLength={500}
                          />
                          <div className="text-xs text-gray-600 mt-1 text-right">
                            {adminComment.length}/500
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => handleApprove(request._id)}
                            disabled={processing}
                            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-background-dark/50 disabled:text-gray-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                          >
                            {processing ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="w-5 h-5" />
                                Approve
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleReject(request._id)}
                            disabled={processing}
                            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-background-dark/50 disabled:text-gray-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                          >
                            {processing ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="w-5 h-5" />
                                Reject
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => {
                              setSelectedRequest(null);
                              setAdminComment('');
                              setMessage({ type: '', text: '' });
                            }}
                            disabled={processing}
                            className="px-4 py-2 bg-background-dark/50 hover:bg-background-dark/70 disabled:bg-background-dark border border-purple-900/30 text-white rounded-lg font-semibold transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedRequest(request._id)}
                        className="w-full px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg font-semibold transition-colors"
                      >
                        Review this request
                      </button>
                    )}
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
