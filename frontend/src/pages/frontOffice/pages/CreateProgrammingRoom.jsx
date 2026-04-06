import React, { useRef, useState } from 'react';
import { Users, Plus, Calendar, Clock, Code, Lock, Loader2, CheckCircle, Upload } from 'lucide-react';
import { Card } from '../components/ui/Card';
import api from '../../../services/api';

export default function CreateProgrammingRoom() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    challengeTitle: '',
    challengeDescription: '',
    language: 'javascript',
    difficulty: 'intermediate',
    maxParticipants: 10,
    duration: 60,
    isPublic: false,
    invitedEmails: '',
    scheduledDate: '',
    scheduledTime: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [createdRoomId, setCreatedRoomId] = useState('');
  const [createdInvitations, setCreatedInvitations] = useState([]);
  const [exerciseFile, setExerciseFile] = useState(null);
  const exerciseFileInputRef = useRef(null);

  const languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'csharp', label: 'C#' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'typescript', label: 'TypeScript' }
  ];

  const difficulties = [
    { value: 'beginner', label: 'Beginner', color: 'text-green-400' },
    { value: 'intermediate', label: 'Intermediate', color: 'text-yellow-400' },
    { value: 'advanced', label: 'Advanced', color: 'text-orange-400' },
    { value: 'expert', label: 'Expert', color: 'text-red-400' }
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Room name is required' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });
    setCreatedRoomId('');
    setCreatedInvitations([]);

    try {
      // Here you would wire the model and controller for programming rooms
      // For now, we submit the room creation request directly
      const payload = new FormData();
      payload.append('name', formData.name || '');
      payload.append('description', formData.description || '');
      payload.append('challengeTitle', formData.challengeTitle || '');
      payload.append('challengeDescription', formData.challengeDescription || '');
      payload.append('language', formData.language || 'javascript');
      payload.append('difficulty', formData.difficulty || 'intermediate');
      payload.append('maxParticipants', String(formData.maxParticipants || 10));
      payload.append('duration', String(formData.duration || 60));
      payload.append('invitedEmails', formData.invitedEmails || '');

      if (formData.scheduledDate && formData.scheduledTime) {
        payload.append('scheduledAt', new Date(`${formData.scheduledDate}T${formData.scheduledTime}`).toISOString());
      }

      if (exerciseFile) {
        payload.append('exerciseFile', exerciseFile);
      }

      const response = await api.post('/programming-rooms', payload);

      setCreatedRoomId(response.data?.room?._id || '');
      setCreatedInvitations(Array.isArray(response.data?.invitations) ? response.data.invitations : []);

      setMessage({ type: 'success', text: 'Programming room created successfully!' });
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        challengeTitle: '',
        challengeDescription: '',
        language: 'javascript',
        difficulty: 'intermediate',
        maxParticipants: 10,
        duration: 60,
        isPublic: false,
        invitedEmails: '',
        scheduledDate: '',
        scheduledTime: ''
      });
      setExerciseFile(null);
      if (exerciseFileInputRef.current) {
        exerciseFileInputRef.current.value = '';
      }

    } catch (error) {
      setCreatedRoomId('');
      setCreatedInvitations([]);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Error creating room' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExerciseFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setExerciseFile(null);
      return;
    }

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setMessage({ type: 'error', text: 'Exercise file must be 10MB or less.' });
      if (exerciseFileInputRef.current) {
        exerciseFileInputRef.current.value = '';
      }
      setExerciseFile(null);
      return;
    }

    setExerciseFile(file);
  };

  const copyText = async (value) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setMessage({ type: 'success', text: 'Copied to clipboard.' });
    } catch {
      setMessage({ type: 'error', text: 'Unable to copy automatically.' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Code className="w-10 h-10 text-blue-500" />
            Create a Programming Room
          </h1>
          <p className="text-slate-400">
            Create a room to organize collaborative programming sessions
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
              <Code className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <p>{message.text}</p>
          </div>
        )}

        {createdInvitations.length > 0 && createdRoomId && (
          <Card className="mb-6 p-5 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="text-emerald-300 text-lg font-semibold mb-2">Invitation links generated</h3>
            <p className="text-sm text-slate-300 mb-4">
              Share one link per participant. Each participant must use their own invitation code.
            </p>
            <div className="space-y-3">
              {createdInvitations.map((invite) => {
                const email = invite?.email || '';
                const inviteCode = invite?.inviteCode || '';
                const invitationLink = `${window.location.origin}/room-invitation?roomId=${encodeURIComponent(createdRoomId)}&email=${encodeURIComponent(email)}`;
                return (
                  <div key={`${email}-${inviteCode}`} className="p-3 rounded-lg bg-slate-900/70 border border-slate-700">
                    <p className="text-slate-200 text-sm"><span className="text-slate-400">Email:</span> {email}</p>
                    <p className="text-slate-200 text-sm"><span className="text-slate-400">Code:</span> {inviteCode}</p>
                    <p className="text-slate-300 text-xs mt-1 break-all">{invitationLink}</p>
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => copyText(invitationLink)}
                        className="px-3 py-1.5 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Copy link
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(inviteCode)}
                        className="px-3 py-1.5 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-100"
                      >
                        Copy code
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Room name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Room Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: Team Coding Session"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the objective of this session..."
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[100px] resize-y"
                maxLength={500}
              />
              <div className="text-xs text-slate-500 mt-1 text-right">
                {formData.description.length}/500
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Challenge Title
                </label>
                <input
                  type="text"
                  name="challengeTitle"
                  value={formData.challengeTitle}
                  onChange={handleChange}
                  placeholder="Ex: Build a todo API"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  maxLength={120}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Invite emails
                </label>
                <input
                  type="text"
                  name="invitedEmails"
                  value={formData.invitedEmails}
                  onChange={handleChange}
                  placeholder="alice@mail.com, bob@mail.com"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">Separate multiple emails with commas or spaces.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Challenge Description
              </label>
              <textarea
                name="challengeDescription"
                value={formData.challengeDescription}
                onChange={handleChange}
                placeholder="Describe the programming task that the invited participant will solve..."
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[120px] resize-y"
                maxLength={2000}
              />
              <div className="text-xs text-slate-500 mt-1 text-right">
                {formData.challengeDescription.length}/2000
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <Upload className="w-4 h-4 inline mr-1" />
                Exercise File (optional)
              </label>
              <input
                ref={exerciseFileInputRef}
                type="file"
                name="exerciseFile"
                accept=".pdf,.txt,.md,.doc,.docx,.zip,.7z,.json"
                onChange={handleExerciseFileChange}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white file:mr-4 file:py-2 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
              />
              <p className="text-xs text-slate-500 mt-1">Allowed: PDF, TXT, MD, DOC, DOCX, ZIP, 7Z, JSON (max 10MB).</p>
              {exerciseFile && (
                <p className="text-xs text-emerald-400 mt-1">Selected: {exerciseFile.name}</p>
              )}
            </div>

            {/* Language and difficulty */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <Code className="w-4 h-4 inline mr-1" />
                  Programming Language
                </label>
                <select
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {languages.map(lang => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Difficulty Level
                </label>
                <select
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {difficulties.map(diff => (
                    <option key={diff.value} value={diff.value}>
                      {diff.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Participants and duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <Users className="w-4 h-4 inline mr-1" />
                  Maximum Number of Participants
                </label>
                <input
                  type="number"
                  name="maxParticipants"
                  value={formData.maxParticipants}
                  onChange={handleChange}
                  min={2}
                  max={50}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  min={15}
                  max={240}
                  step={15}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Scheduled date and time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Scheduled Date (optional)
                </label>
                <input
                  type="date"
                  name="scheduledDate"
                  value={formData.scheduledDate}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Scheduled Time (optional)
                </label>
                <input
                  type="time"
                  name="scheduledTime"
                  value={formData.scheduledTime}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Visibility is fixed by business rule */}
            <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <Lock className="w-5 h-5 text-amber-400" />
              <div className="flex-1">
                <div className="text-white font-medium">Private Room</div>
                <p className="text-sm text-slate-400 mt-1">Only invited participants can join this room.</p>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Create Room
                </>
              )}
            </button>
          </form>
        </Card>

        {/* Additional info */}
        <Card className="p-4 mt-6 bg-blue-500/10 border-blue-500/30">
          <div className="flex gap-3">
            <Code className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-blue-400 font-semibold mb-1">About Programming Rooms</h3>
              <p className="text-slate-300 text-sm">
                Programming rooms allow participants to collaborate in real-time on code challenges. 
                As a recruiter, you can organize sessions to evaluate skills and recruit new talents.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
