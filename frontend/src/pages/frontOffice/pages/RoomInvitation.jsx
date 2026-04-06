import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, KeyRound, Loader2, MailWarning, Timer } from 'lucide-react';
import publicApi from '../../../services/publicApi';

export default function RoomInvitation() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [codeInput, setCodeInput] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [waitingStart, setWaitingStart] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const pollRef = useRef(null);

  const token = useMemo(() => sessionStorage.getItem('token') || localStorage.getItem('token'), []);
  const userRole = useMemo(() => {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role || null;
    } catch {
      return null;
    }
  }, [token]);

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const roomId = params.get('roomId') || '';
  const email = (params.get('email') || '').toLowerCase().trim();

  useEffect(() => {
    const loadInvitation = async () => {
      if (!roomId || !email) {
        setMessage({ type: 'error', text: 'Invitation link is invalid.' });
        setLoading(false);
        return;
      }

      try {
        const response = await publicApi.get('/programming-rooms/invitations/lookup', {
          params: { roomId, email }
        });
        setInvitation(response.data?.invitation || null);
      } catch (error) {
        setMessage({
          type: 'error',
          text: error.response?.data?.message || 'Invitation not found.'
        });
      } finally {
        setLoading(false);
      }
    };

    loadInvitation();

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [roomId, email]);

  const goProgrammer = (inviteCode) => {
    const query = new URLSearchParams({ roomId, email, inviteCode });
    navigate(`/programmer?${query.toString()}`);
  };

  const probeAccess = async (inviteCode, silent = false) => {
    try {
      const response = await publicApi.post('/programming-rooms/invitations/access', {
        roomId,
        email,
        inviteCode
      });

      const status = response.data?.access?.status;

      if (status === 'active') {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        goProgrammer(inviteCode);
        return 'active';
      }

      if (status === 'waiting') {
        setWaitingStart(true);
        if (!silent) {
          setMessage({
            type: 'info',
            text: 'You are invited. Waiting for recruiter to start the challenge.'
          });
        }
        return 'waiting';
      }

      setMessage({ type: 'error', text: 'The challenge is finished or unavailable.' });
      return status || 'unknown';
    } catch (error) {
      if (!silent) {
        setMessage({
          type: 'error',
          text: error.response?.data?.message || 'Invalid invitation code.'
        });
      }
      return 'error';
    }
  };

  const handleSubmitCode = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) {
      setMessage({ type: 'error', text: 'Please enter the invitation code from email.' });
      return;
    }

    setSubmitting(true);
    setMessage({ type: '', text: '' });
    const accessStatus = await probeAccess(code);
    setSubmitting(false);

    if (!pollRef.current && accessStatus === 'waiting') {
      pollRef.current = setInterval(() => {
        probeAccess(code, true);
      }, 8000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-12 md:px-8 md:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6 md:p-8">
          <h1 className="mb-2 text-3xl font-bold text-white">Challenge Invitation</h1>
          <p className="mb-6 text-slate-400">Enter the code from your email to access the participant workspace.</p>

          {loading ? (
            <div className="flex items-center gap-3 text-slate-300">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading invitation...
            </div>
          ) : invitation ? (
            <div className="space-y-6">
              <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                <p className="text-slate-300">Room: <span className="font-semibold text-white">{invitation.roomName}</span></p>
                <p className="text-slate-300">Challenge: <span className="font-semibold text-white">{invitation.challengeTitle || 'Coding challenge'}</span></p>
                <p className="text-slate-300">Time limit: <span className="font-semibold text-white">{invitation.timeLimit} min</span></p>
                {invitation.exerciseFile?.url && (
                  <a
                    href={`http://localhost:5000${invitation.exerciseFile.url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-300 underline"
                  >
                    Open statement file
                  </a>
                )}
              </div>

              {(userRole === 'recruiter' || userRole === 'admin') && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-200">
                  This invitation link is for participants. Recruiter space remains separate.
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  <KeyRound className="mr-2 inline h-4 w-4" />
                  Invitation code from email
                </label>
                <input
                  type="text"
                  value={codeInput}
                  onChange={(event) => setCodeInput(event.target.value.toUpperCase())}
                  placeholder="Enter your code"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <button
                onClick={handleSubmitCode}
                disabled={submitting || !codeInput.trim()}
                className="w-full rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                {submitting ? 'Checking...' : 'Access participant platform'}
              </button>

              {waitingStart && (
                <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-4 text-blue-200">
                  <Timer className="mr-2 inline h-4 w-4" />
                  Waiting: recruiter has not started the challenge yet. This page checks automatically.
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-200">
              <MailWarning className="mr-2 inline h-4 w-4" />
              {message.text || 'Invitation not found.'}
            </div>
          )}

          {message.text && invitation && (
            <div className={`mt-6 rounded-xl border p-4 ${
              message.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                : message.type === 'info'
                  ? 'border-blue-500/40 bg-blue-500/10 text-blue-200'
                  : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
            }`}>
              {message.type === 'success' && <CheckCircle className="mr-2 inline h-4 w-4" />}
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
