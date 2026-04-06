import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Code, Loader2, Play, FileText } from 'lucide-react';
import publicApi from '../../../services/publicApi';

export default function ProgrammerPlatform() {
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [code, setCode] = useState('// Start coding here');
  const [output, setOutput] = useState('');
  const [submittingResult, setSubmittingResult] = useState(false);
  const [lastRunMeta, setLastRunMeta] = useState({ status: 'success', errorMessage: '' });

  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const roomId = params.get('roomId') || '';
  const email = (params.get('email') || '').trim().toLowerCase();
  const inviteCode = (params.get('inviteCode') || '').trim().toUpperCase();

  useEffect(() => {
    const loadRoom = async () => {
      if (!roomId || !email || !inviteCode) {
        setError('Missing access parameters. Please use your invitation link again.');
        setLoading(false);
        return;
      }

      try {
        const response = await publicApi.get('/programming-rooms/invitations/programmer-room', {
          params: { roomId, email, inviteCode }
        });
        setRoom(response.data?.room || null);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load challenge room.');
      } finally {
        setLoading(false);
      }
    };

    loadRoom();
  }, [roomId, email, inviteCode]);

  const reportExecution = async ({ status, runtimeMs, errorMessage, codeSnippet, outputSnippet, action = 'run' }) => {
    try {
      await publicApi.post('/programming-rooms/invitations/monitoring/event', {
        roomId,
        email,
        inviteCode,
        action,
        status,
        runtimeMs,
        errorMessage,
        codeSnippet,
        outputSnippet
      });
    } catch (requestError) {
      console.error('Monitoring event report failed:', requestError);
    }
  };

  const runCode = async () => {
    const startedAt = performance.now();
    let computedOutput = 'Execution simulated successfully.';
    let status = 'success';
    let errorMessage = '';

    if (/throw\s+new\s+Error|syntax\s*error|reference\s*error|type\s*error/i.test(code)) {
      status = 'error';
      errorMessage = 'Simulated execution error detected in submitted code.';
      computedOutput = errorMessage;
    }

    const runtimeMs = Math.max(1, Math.round(performance.now() - startedAt));
    setLastRunMeta({ status, errorMessage });
    setOutput(computedOutput);

    await reportExecution({
      status,
      runtimeMs,
      errorMessage,
      codeSnippet: code,
      outputSnippet: computedOutput,
      action: 'run'
    });
  };

  const submitResultForReview = async () => {
    try {
      setSubmittingResult(true);
      await publicApi.post('/programming-rooms/invitations/monitoring/result', {
        roomId,
        email,
        inviteCode,
        codeSnapshot: code,
        outputSnapshot: output || (lastRunMeta.status === 'error' ? lastRunMeta.errorMessage : '')
      });

      await reportExecution({
        status: lastRunMeta.status,
        runtimeMs: 0,
        errorMessage: lastRunMeta.errorMessage,
        codeSnippet: code,
        outputSnippet: output,
        action: 'submit'
      });

      alert('Result submitted. Waiting recruiter confirmation before final scoring.');
    } catch (requestError) {
      alert(requestError.response?.data?.message || 'Unable to submit result.');
    } finally {
      setSubmittingResult(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
        <Loader2 className="w-6 h-6 mr-2 animate-spin" />
        Loading challenge...
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-12">
        <div className="mx-auto max-w-3xl rounded-xl border border-rose-500/40 bg-rose-500/10 p-6 text-rose-200">
          {error || 'Room unavailable.'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-6">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Code className="w-7 h-7 text-cyan-400" />
            {room.name}
          </h1>
          <p className="mt-2 text-slate-300">{room.challengeTitle || 'Programming challenge'}</p>
          <p className="mt-2 text-slate-400">{room.challengeDescription || 'No additional description provided.'}</p>
          <p className="mt-2 text-slate-300">Time limit: {room.timeLimit} minutes</p>
          {room.exerciseFile?.url && (
            <a
              href={`http://localhost:5000${room.exerciseFile.url}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-cyan-300 underline"
            >
              <FileText className="w-4 h-4" />
              Open statement file
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
            <textarea
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="w-full h-[420px] rounded-lg border border-slate-700 bg-slate-950 p-3 text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={runCode}
              className="mt-4 rounded-lg bg-cyan-600 px-4 py-2 text-white font-semibold hover:bg-cyan-500 inline-flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Run
            </button>
            <button
              onClick={submitResultForReview}
              disabled={submittingResult}
              className="mt-4 ml-3 rounded-lg bg-emerald-600 px-4 py-2 text-white font-semibold hover:bg-emerald-500 disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {submittingResult ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Submit For Recruiter Review
            </button>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
            <h2 className="text-white font-semibold mb-3">Output</h2>
            <pre className="min-h-[420px] rounded-lg border border-slate-700 bg-slate-950 p-3 text-slate-200 whitespace-pre-wrap">{output || 'Run your code to see output...'}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
