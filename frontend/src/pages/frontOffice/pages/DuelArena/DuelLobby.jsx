import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Trophy, Zap, Shield, Loader2, X, Users, Star } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const SOCKET_URL = "http://127.0.0.1:5000";

export default function DuelLobby() {
    const [searching, setSearching] = useState(false);
    const [searchType, setSearchType] = useState(null); // 'training' or 'ranked'
    const [onlineCount, setOnlineCount] = useState(0);
    const [socket, setSocket] = useState(null);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        const newSocket = io(SOCKET_URL, {
            auth: { token }
        });

        newSocket.on("connect", () => {
            console.log("Connected to Arena Socket");
        });

        newSocket.on("statsUpdate", ({ onlineCount }) => {
            setOnlineCount(onlineCount);
        });

        newSocket.on("matchFound", ({ matchId, roomId }) => {
            setSearching(false);
            navigate(`/arena/battle/${matchId}?room=${roomId}`);
        });

        setSocket(newSocket);

        // Get user info from token
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUser(payload);
        } catch (e) { }

        return () => newSocket.disconnect();
    }, [navigate]);

    const handleStartSearch = (type) => {
        setSearching(true);
        setSearchType(type);
        socket.emit("findMatch", { type });
    };

    const handleCancelSearch = () => {
        setSearching(false);
        socket.emit("cancelSearch");
    };

    return (
        <div className="min-h-screen bg-slate-950 pt-24 pb-12 px-6">
            <div className="max-w-4xl mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12"
                >
                    <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Swords className="w-10 h-10 text-blue-400" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4">
                        Duel Arena <span className="text-blue-500">1v1</span>
                    </h1>
                    <p className="text-slate-400 text-lg">
                        Prove your coding mastery. Challenge others in real-time battles.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Training Mode */}
                    <Card variant="glass" className="p-8 group hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Shield className="w-24 h-24 text-blue-400" />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                                <Shield className="w-6 h-6 text-blue-400" />
                                Training Dual
                            </h3>
                            <p className="text-slate-400 text-sm mb-6">
                                Unranked combat. Perfect for practicing your speed and tactics without pressure.
                            </p>
                            <ul className="text-xs text-slate-500 space-y-2 mb-8 text-left">
                                <li className="flex items-center gap-2"><Star className="w-3 h-3 text-blue-500" /> No rating penalty</li>
                                <li className="flex items-center gap-2"><Star className="w-3 h-3 text-blue-500" /> Instant rematch</li>
                                <li className="flex items-center gap-2"><Star className="w-3 h-3 text-blue-500" /> Standard AI Hint access</li>
                            </ul>
                            <Button
                                variant="secondary"
                                className="w-full py-6 text-lg"
                                onClick={() => handleStartSearch('training')}
                                disabled={searching}
                            >
                                Enter Training
                            </Button>
                        </div>
                    </Card>

                    {/* Ranked Mode */}
                    <Card variant="glass" className="p-8 group border-purple-500/20 hover:border-purple-500/50 transition-all cursor-pointer overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Trophy className="w-24 h-24 text-purple-400" />
                        </div>
                        <div className="relative z-10">
                            <div className="inline-flex px-2 py-1 rounded bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase tracking-widest mb-4">
                                Competitive
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                                <Trophy className="w-6 h-6 text-purple-400" />
                                Ranked Duel
                            </h3>
                            <p className="text-slate-400 text-sm mb-6">
                                Earn Elo and climb the leaderboards. Fight for glory and exclusive badges.
                            </p>
                            <ul className="text-xs text-slate-500 space-y-2 mb-8 text-left">
                                <li className="flex items-center gap-2"><Zap className="w-3 h-3 text-purple-500" /> Gain rating points</li>
                                <li className="flex items-center gap-2"><Zap className="w-3 h-3 text-purple-500" /> Skill-based matchmaking</li>
                                <li className="flex items-center gap-2"><Zap className="w-3 h-3 text-purple-500" /> Limited AI assistance</li>
                            </ul>
                            <Button
                                variant="primary"
                                className="w-full py-6 text-lg bg-gradient-to-r from-blue-600 to-purple-600 border-none"
                                onClick={() => handleStartSearch('ranked')}
                                disabled={searching}
                            >
                                Find Ranked Match
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* Global Statistics */}
                <div className="mt-16 flex justify-center gap-12">
                    <div className="text-center">
                        <div className="text-2xl font-mono font-bold text-white mb-1">1,248</div>
                        <div className="text-xs text-slate-500 uppercase tracking-widest">Global Battles Today</div>
                    </div>
                    <div className="border-r border-slate-800" />
                    <div className="text-center">
                        <div className="text-2xl font-mono font-bold text-green-400 mb-1">{onlineCount}</div>
                        <div className="text-xs text-slate-500 uppercase tracking-widest">Warriors Online</div>
                    </div>
                    <div className="border-r border-slate-800" />
                    <div className="text-center">
                        <div className="text-2xl font-mono font-bold text-purple-400 mb-1">Champion</div>
                        <div className="text-xs text-slate-500 uppercase tracking-widest">Top Rank Tier</div>
                    </div>
                </div>
            </div>

            {/* Matchmaking Overlay */}
            <AnimatePresence>
                {searching && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6"
                    >
                        <div className="max-w-sm w-full text-center">
                            <div className="relative mb-8">
                                <div className="w-24 h-24 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin mx-auto" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 text-blue-400 animate-pulse" />
                                </div>
                            </div>

                            <h2 className="text-2xl font-bold text-white mb-2">Finding Opponent...</h2>
                            <p className="text-slate-400 text-sm mb-8">
                                Searching for a worthy {searchType} adversary for you, <span className="text-blue-400">{user?.username}</span>.
                            </p>

                            <Button
                                variant="ghost"
                                icon={<X className="w-4 h-4" />}
                                onClick={handleCancelSearch}
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            >
                                Cancel Search
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
