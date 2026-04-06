import React, { useState, useEffect } from 'react';
import { Users, Code, Clock, Zap, Loader2, Plus, Play, Lock, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';

export default function ProgrammingRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Extract user role
    const extractRole = () => {
      try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUserRole(payload.role);
        }
      } catch (error) {
        console.error('Error extracting role:', error);
      }
    };

    extractRole();
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await api.get('/programming-rooms');
      console.log('Rooms fetched:', response.data);
      setRooms(response.data.rooms || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (roomId) => {
    try {
      setJoiningRoom(true);
      const response = await api.post(`/programming-rooms/${roomId}/join`);
      console.log('Joined room:', response.data);
      alert('Successfully joined the room!');
      setSelectedRoom(null);
      fetchRooms();
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Failed to join room: ' + (error.response?.data?.message || 'Unknown error'));
    } finally {
      setJoiningRoom(false);
    }
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      beginner: 'text-green-400 bg-green-500/10',
      intermediate: 'text-yellow-400 bg-yellow-500/10',
      advanced: 'text-orange-400 bg-orange-500/10',
      expert: 'text-red-400 bg-red-500/10'
    };
    return colors[difficulty] || 'text-blue-400 bg-blue-500/10';
  };

  const getDifficultyLabel = (difficulty) => {
    const labels = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      expert: 'Expert'
    };
    return labels[difficulty] || difficulty;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 md:px-8 pt-28 md:pt-32 pb-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 flex items-center gap-4">
            <Code className="w-10 h-10 text-blue-500" />
            Programming Rooms
          </h1>
          <p className="text-slate-400 text-lg">
            Join collaborative programming sessions or create your own
          </p>
        </div>

        {/* Create Room Button */}
        {(userRole === 'recruiter' || userRole === 'admin') && (
          <div className="mb-8">
            <button
              onClick={() => navigate('/create-room')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create a New Room
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <p className="text-slate-400">Loading rooms...</p>
            </div>
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex items-center justify-center py-20 bg-slate-800/30 rounded-2xl border border-slate-700">
            <div className="text-center">
              <Code className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-white text-xl font-semibold mb-2">No rooms available</h3>
              <p className="text-slate-400">
                {userRole === 'recruiter' || userRole === 'admin' 
                  ? 'Create the first programming room!'
                  : 'Wait for a recruiter to create a room...'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rooms List */}
            <div className="lg:col-span-2 space-y-4">
              {rooms.map(room => (
                <div
                  key={room._id}
                  onClick={() => setSelectedRoom(room)}
                  className={`p-6 rounded-xl border transition-all cursor-pointer ${
                    selectedRoom?._id === room._id
                      ? 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_20px_rgba(37,99,235,0.3)]'
                      : 'bg-slate-800/40 border-slate-700 hover:border-slate-600 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-white text-xl font-bold mb-1">{room.name}</h3>
                      <p className="text-slate-400 text-sm">{room.description || 'No description'}</p>
                    </div>
                    {room.isPublic ? (
                      <Globe className="w-5 h-5 text-green-400 flex-shrink-0" />
                    ) : (
                      <Lock className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 items-center text-sm">
                    <div className={`px-3 py-1 rounded-full font-semibold ${getDifficultyColor(room.difficulty)}`}>
                      {getDifficultyLabel(room.difficulty)}
                    </div>
                    <div className="flex items-center gap-1 text-slate-300">
                      <Code className="w-4 h-4" />
                      {room.language}
                    </div>
                    <div className="flex items-center gap-1 text-slate-300">
                      <Users className="w-4 h-4" />
                      {room.currentParticipants?.length || 0}/{room.maxParticipants}
                    </div>
                    <div className="flex items-center gap-1 text-slate-300">
                      <Clock className="w-4 h-4" />
                      {room.duration} min
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Room Details Panel */}
            {selectedRoom && (
              <div className="lg:col-span-1 sticky top-6">
                <div className="bg-gradient-to-b from-blue-500/10 to-slate-800/50 border border-blue-500/30 rounded-2xl p-6 space-y-6">
                  {/* Room Info */}
                  <div>
                    <h2 className="text-white text-2xl font-bold mb-2">{selectedRoom.name}</h2>
                    <p className="text-slate-300">{selectedRoom.description || 'No description provided'}</p>
                  </div>

                  {/* Stats */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Language</span>
                      <span className="text-white font-semibold capitalize">{selectedRoom.language}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Difficulty</span>
                      <span className={`font-semibold ${getDifficultyColor(selectedRoom.difficulty)}`}>
                        {getDifficultyLabel(selectedRoom.difficulty)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Participants</span>
                      <span className="text-white font-semibold">
                        {selectedRoom.currentParticipants?.length || 0}/{selectedRoom.maxParticipants}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Duration</span>
                      <span className="text-white font-semibold">{selectedRoom.duration} minutes</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Visibility</span>
                      <span className="text-white font-semibold">
                        {selectedRoom.isPublic ? 'Public' : 'Private'}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-2">
                      <span>Slots</span>
                      <span>
                        {selectedRoom.currentParticipants?.length || 0}/{selectedRoom.maxParticipants}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700/40 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all"
                        style={{
                          width: `${((selectedRoom.currentParticipants?.length || 0) / selectedRoom.maxParticipants) * 100}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3 pt-4 border-t border-slate-700">
                    <button
                      onClick={() => handleJoinRoom(selectedRoom._id)}
                      disabled={
                        joiningRoom || 
                        (selectedRoom.currentParticipants?.length || 0) >= selectedRoom.maxParticipants
                      }
                      className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                        (selectedRoom.currentParticipants?.length || 0) >= selectedRoom.maxParticipants
                          ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {joiningRoom ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Joining...
                        </>
                      ) : (selectedRoom.currentParticipants?.length || 0) >= selectedRoom.maxParticipants ? (
                        <>
                          <Lock className="w-5 h-5" />
                          Room Full
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5" />
                          Join Room
                        </>
                      )}
                    </button>

                    {selectedRoom.status === 'active' && (
                      <div className="flex items-center gap-2 text-green-400 text-sm">
                        <Zap className="w-4 h-4 animate-pulse" />
                        Live Now
                      </div>
                    )}
                  </div>

                  {/* Creator Info */}
                  <div className="pt-4 border-t border-slate-700 text-center">
                    <p className="text-xs text-slate-500 mb-2">Created by</p>
                    <p className="text-white font-semibold">
                      {selectedRoom.creatorId?.username || 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
