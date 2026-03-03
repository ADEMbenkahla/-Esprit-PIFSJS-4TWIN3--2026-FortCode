import React, { useState, useEffect, useRef } from 'react';
import { Shield, Send, Loader2, CheckCircle, XCircle, AlertCircle, Trash2, Upload, FileText, Download, User } from 'lucide-react';
import { Card } from '../components/ui/Card';
import api from '../../../services/api';
import { refreshUserProfile } from '../../../services/userService';

export default function RequestRecruiterRole() {
  const pollIntervalRef = useRef(null);
  const [justification, setJustification] = useState('');
  const [proofDocument, setProofDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchMyRequests();
    
    // Poll every 5 seconds to check whether a request has been approved
    pollIntervalRef.current = setInterval(() => {
      fetchMyRequests();
    }, 5000);
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const fetchMyRequests = async () => {
    try {
      const response = await api.get('/role-requests/my-requests');
      setMyRequests(response.data.requests);
      
      // If a request is approved, refresh the token automatically
      const approvedRequest = response.data.requests.find(req => req.status === 'approved');
      if (approvedRequest) {
        // Stop polling as soon as a request is approved
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        
        setMessage({ 
          type: 'success', 
          text: '🎉 Congratulations! Your request has been approved! Your permissions have been updated. You can now create rooms from your profile.' 
        });
        
        // Refresh JWT token with the new role
        const result = await refreshUserProfile();
        if (result.success) {
          // Notify other components that the token has changed
          window.dispatchEvent(new Event('tokenChanged'));
        }
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (justification.trim().length < 20) {
      setMessage({ type: 'error', text: 'Justification must contain at least 20 characters' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Build FormData to send file and form data
      const formData = new FormData();
      formData.append('justification', justification);
      if (proofDocument) {
        formData.append('proofDocument', proofDocument);
      }

      await api.post('/role-requests', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setMessage({ type: 'success', text: 'Request submitted successfully!' });
      setJustification('');
      setProofDocument(null);
      fetchMyRequests();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Error while submitting the request' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (requestId) => {
    if (!window.confirm('Are you sure you want to delete this request?')) {
      return;
    }

    try {
      await api.delete(`/role-requests/${requestId}`);
      setMessage({ type: 'success', text: 'Request deleted successfully' });
      fetchMyRequests();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Error while deleting the request' 
      });
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
      <span className={`px-3 py-1 rounded-full text-sm border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const hasPendingRequest = myRequests.some(req => req.status === 'pending');

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Shield className="w-10 h-10 text-blue-500" />
            Become a Recruiter
          </h1>
          <p className="text-slate-400">
            Request the recruiter role to create programming rooms and recruit new talent
          </p>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg border flex items-start gap-3 ${
            message.type === 'success' 
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <p>{message.text}</p>
          </div>
        )}

        {/* Request form */}
        <Card className="p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">New Request</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Justification *
              </label>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Explain why you want to become a recruiter (minimum 20 characters). For example: I am a computer science teacher with 5 years of experience..."
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[120px] resize-y"
                disabled={hasPendingRequest || loading}
                maxLength={500}
              />
              <div className="mt-1 flex justify-between text-sm">
                <span className="text-slate-500">
                  Minimum 20 characters, maximum 500
                </span>
                <span className={`${
                  justification.length < 20 ? 'text-red-400' : 'text-slate-500'
                }`}>
                  {justification.length}/500
                </span>
              </div>
            </div>

            {/* Proof document upload */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
              <label className="block text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-400" />
                Proof Document (optional)
              </label>
              <div className="relative">
                <input
                  type="file"
                  id="proofDocument"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setProofDocument(e.target.files[0])}
                  disabled={hasPendingRequest || loading}
                  className="hidden"
                />
                <label
                  htmlFor="proofDocument"
                  className={`w-full px-4 py-4 bg-slate-700/50 border-2 border-dashed border-slate-600 rounded-lg flex items-center gap-3 cursor-pointer hover:border-blue-500 hover:bg-slate-700 transition-all ${
                    (hasPendingRequest || loading) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {proofDocument ? (
                    <>
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/20">
                        <FileText className="w-6 h-6 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <span className="text-white font-medium block">{proofDocument.name}</span>
                        <span className="text-slate-400 text-xs">
                          {(proofDocument.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-600">
                        <Upload className="w-5 h-5 text-slate-300" />
                      </div>
                      <div className="flex-1">
                        <span className="text-slate-200 font-medium block">Click to add a file</span>
                        <span className="text-slate-400 text-xs">Teacher ID card, professional certificate, etc.</span>
                      </div>
                    </>
                  )}
                </label>
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center gap-2">
                <AlertCircle className="w-3 h-3" />
                <span>Accepted formats: PDF, JPG, PNG, WEBP (Max 5MB)</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={hasPendingRequest || loading || justification.trim().length < 20}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : hasPendingRequest ? (
                <>
                  <AlertCircle className="w-5 h-5" />
                  You already have a pending request
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Request
                </>
              )}
            </button>
          </form>
        </Card>

        {/* My requests */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold text-white mb-4">My Requests</h2>
          
          {myRequests.length === 0 ? (
            <p className="text-slate-400 text-center py-8">
              You have not submitted any requests yet
            </p>
          ) : (
            <div className="space-y-4">
              {myRequests.map((request) => (
                <div
                  key={request._id}
                  className="bg-slate-800 border border-slate-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      {getStatusBadge(request.status)}
                    </div>
                    {(request.status === 'pending' || request.status === 'rejected') && (
                      <button
                        onClick={() => handleDelete(request._id)}
                        className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                        title="Delete request"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-slate-400">Justification:</span>
                      <p className="text-white mt-1">{request.justification}</p>
                    </div>

                    {request.proofDocument && (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mt-2">
                        <span className="text-slate-300 font-semibold text-sm block mb-2">📎 Attached Document:</span>
                        <a
                          href={`http://localhost:5000${request.proofDocument}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all hover:shadow-lg text-sm"
                        >
                          <FileText className="w-4 h-4" />
                          <span>View Document</span>
                          <Download className="w-3 h-3 ml-1" />
                        </a>
                      </div>
                    )}

                    <div className="flex gap-4 text-slate-400">
                      <span>Created on: {new Date(request.createdAt).toLocaleDateString('en-US')}</span>
                      {request.reviewedAt && (
                        <span>Reviewed on: {new Date(request.reviewedAt).toLocaleDateString('en-US')}</span>
                      )}
                    </div>

                    {request.adminComment && (
                      <div className="mt-3 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-slate-200 font-semibold text-sm">💬 Admin Comment:</span>
                          {request.reviewedBy && (
                            <div className="flex items-center gap-2 bg-purple-500/20 px-3 py-1 rounded-full">
                              <User className="w-3 h-3 text-purple-300" />
                              <span className="text-xs text-purple-200 font-medium">
                                {request.reviewedBy.username}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-slate-100 text-base leading-relaxed font-medium bg-purple-500/5 p-3 rounded border-l-4 border-purple-500">{request.adminComment}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
