import React, { useState } from 'react';
import { Users, Plus, Calendar, Clock, Code, Globe, Lock, Loader2, CheckCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import api from '../../../services/api';

export default function CreateProgrammingRoom() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    language: 'javascript',
    difficulty: 'intermediate',
    maxParticipants: 10,
    duration: 60,
    isPublic: true,
    scheduledDate: '',
    scheduledTime: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

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

    try {
      // Here you would wire the model and controller for programming rooms
      // For now, we submit the room creation request directly
      await api.post('/programming-rooms', {
        ...formData,
        scheduledAt: formData.scheduledDate && formData.scheduledTime 
          ? new Date(`${formData.scheduledDate}T${formData.scheduledTime}`)
          : null
      });

      setMessage({ type: 'success', text: 'Programming room created successfully!' });
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        language: 'javascript',
        difficulty: 'intermediate',
        maxParticipants: 10,
        duration: 60,
        isPublic: true,
        scheduledDate: '',
        scheduledTime: ''
      });

    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Error creating room' 
      });
    } finally {
      setLoading(false);
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

            {/* Visibility */}
            <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <input
                type="checkbox"
                name="isPublic"
                id="isPublic"
                checked={formData.isPublic}
                onChange={handleChange}
                className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
              />
              <label htmlFor="isPublic" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 text-white font-medium">
                  {formData.isPublic ? (
                    <Globe className="w-5 h-5 text-green-400" />
                  ) : (
                    <Lock className="w-5 h-5 text-amber-400" />
                  )}
                  {formData.isPublic ? 'Public' : 'Private'} Room
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  {formData.isPublic 
                    ? 'All participants can join this room'
                    : 'Only invited participants can join'
                  }
                </p>
              </label>
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
