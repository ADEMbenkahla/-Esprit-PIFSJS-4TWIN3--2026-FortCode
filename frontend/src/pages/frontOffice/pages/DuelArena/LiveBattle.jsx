import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Shield, Zap, Play, RotateCcw, AlertTriangle, CheckCircle, Code, Trophy, Skull, Loader2 } from 'lucide-react';
import { io } from 'socket.io-client';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import Swal from 'sweetalert2';

const SOCKET_URL = "http://127.0.0.1:5000";

import { getDuelMatchDetails } from '../../../../services/api';

export default function LiveBattle() {
    const { matchId } = useParams();
    const [searchParams] = useSearchParams();
    const roomId = searchParams.get('room');
    const navigate = useNavigate();

    const [match, setMatch] = useState(null);
    const [socket, setSocket] = useState(null);
    const [language, setLanguage] = useState("javascript");
    const [code, setCode] = useState("");
    const [opponentCode, setOpponentCode] = useState("");
    const [health, setHealth] = useState(100);
    const [opponentHealth, setOpponentHealth] = useState(100);
    const [output, setOutput] = useState("");
    const [testResults, setTestResults] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [winner, setWinner] = useState(null);
    const [timeLeft, setTimeLeft] = useState(210); // 3:30 in seconds

    const loadMatchData = useCallback(async () => {
        try {
            const { data } = await getDuelMatchDetails(matchId);
            if (data && data.match) {
                console.log("🎮 Match data loaded via API:", data.match);
                setMatch(data.match);
                
                // Calculate initial time left
                if (data.match.startedAt) {
                    const start = new Date(data.match.startedAt);
                    const now = new Date();
                    const elapsed = Math.floor((now - start) / 1000);
                    setTimeLeft(Math.max(0, 210 - elapsed));
                }
                
                const token = sessionStorage.getItem('token') || localStorage.getItem('token');
                const userId = JSON.parse(atob(token.split('.')[1])).id;
                
                const me = data.match.players.find(p => p.user._id === userId || p.user === userId);
                const opp = data.match.players.find(p => p.user._id !== userId && p.user !== userId);
                
                if (me) setHealth(me.health);
                if (opp) setOpponentHealth(opp.health);

                if (data.match.challenge?.data?.[language]) {
                    setCode(data.match.challenge.data[language].starterCode);
                }
            }
        } catch (error) {
            console.error("Failed to load match data", error);
            Swal.fire({
                icon: "error",
                title: "Connection Error",
                text: "Could not synchronize with the battlefield. Please try again.",
                confirmButtonText: "Return to Arena"
            }).then(() => navigate('/arena'));
        }
    }, [matchId, language, navigate]);

    useEffect(() => {
        loadMatchData();

        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const userId = JSON.parse(atob(token.split('.')[1])).id;
        const newSocket = io(SOCKET_URL, { auth: { token } });

        newSocket.on("matchFound", ({ match }) => {
            setMatch(match);
        });

        newSocket.on("opponentCodeUpdate", ({ code }) => {
            setOpponentCode(code);
        });

        newSocket.on("opponentBattleEvent", ({ event, data }) => {
            if (event === "damageTaken") {
                // Update health based on who took damage
                if (data.targetId === userId) {
                    setHealth(data.newHealth);
                    setOutput(`⚠️ INCANTATION DETECTED: Opponent struck you for ${data.damage} DMG!`);
                } else {
                    setOpponentHealth(data.newHealth);
                    setOutput(`✨ SPELL SUCCESSFUL: You dealt ${data.damage} DMG!`);
                }
                
                if (data.results) {
                    setTestResults(data.results);
                }
            } else if (event === "spellFizzled") {
                setOutput(`❌ SPELL FIZZLED: Your incantation was architecturally unsound.`);
                if (data.results) {
                    setTestResults(data.results);
                }
            }
        });

        newSocket.on("matchEnded", ({ winnerId, match: endMatch }) => {
            setWinner(winnerId);
            const isMe = winnerId === userId;
            Swal.fire({
                title: isMe ? "GLORIOUS VICTORY!" : (winnerId === "draw" ? "DRAW" : "DEFEAT..."),
                text: isMe ? "You have crushed your opponent!" : (winnerId === "draw" ? "Time expired. It's a draw." : "The recursion was too strong for you."),
                icon: isMe ? "success" : (winnerId === "draw" ? "info" : "error"),
                confirmButtonText: "Return to Arena"
            }).then(() => navigate('/arena'));
        });

        newSocket.on("connect", () => {
            newSocket.emit("joinMatch", { matchId, roomId });
        });

        setSocket(newSocket);
        return () => newSocket.disconnect();
    }, [matchId, roomId, navigate, loadMatchData]);

    // Timer Interval
    useEffect(() => {
        if (!match || winner) return;
        
        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 0) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        
        return () => clearInterval(interval);
    }, [match, winner]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleRun = useCallback(() => {
        if (!socket) return;
        setIsRunning(true);
        setOutput("⚡ Channeling code magic...");

        socket.emit("executeIncantation", { 
            matchId, 
            roomId, 
            code, 
            language 
        });

        // We reset isRunning after a short delay or when we receive the event
        setTimeout(() => setIsRunning(false), 2000);
    }, [code, language, matchId, roomId, socket]);

    useEffect(() => {
        if (socket && code) {
            socket.emit("codeUpdate", { roomId, code });
        }
    }, [code, roomId, socket]);

    if (!match) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 font-mono">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            Synchronizing Battlefield...
        </div>
    );

    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    let userId = "";
    try {
        userId = JSON.parse(atob(token.split('.')[1])).id;
    } catch (e) {
        console.error("Token parsing error", e);
    }

    const me = match?.players?.find(p => p.user.toString() === userId);
    const opponent = match?.players?.find(p => p.user.toString() !== userId);

    if (!me || !opponent) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 font-mono">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            Identifying Warriors...
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col pt-16">
            {/* Dynamic Header */}
            <header className="h-20 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-8 flex items-center justify-between z-20 sticky top-16">
                {/* Me */}
                <div className="flex items-center gap-4 w-1/3">
                    <div className="text-right">
                        <div className="text-white font-bold">{me.username}</div>
                        <div className="text-[10px] text-blue-400 uppercase tracking-widest font-mono">Challenger</div>
                    </div>
                    <div className="flex-1 max-w-[150px]">
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                            <motion.div
                                animate={{ width: `${health}%` }}
                                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
                            />
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-1">{health}/100 HP</div>
                    </div>
                </div>

                {/* Center VS */}
                <div className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-full bg-red-900/10 border border-red-500/30 flex items-center justify-center relative">
                        <Swords className="w-6 h-6 text-red-500" />
                        <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 bg-red-500/5 rounded-full"
                        />
                    </div>
                    
                    {/* TIMER DISPLAY */}
                    <div className={`text-xl font-mono font-bold ${timeLeft < 30 ? 'text-red-500 animate-pulse' : 'text-slate-300'}`}>
                        {formatTime(timeLeft)}
                    </div>

                    <button
                        onClick={() => {
                            Swal.fire({
                                title: "ADMIT DEFEAT?",
                                text: "You will forfeit this match and lose rating points.",
                                icon: "warning",
                                showCancelButton: true,
                                confirmButtonColor: "#ef4444",
                                cancelButtonColor: "#334155",
                                confirmButtonText: "Yes, Forfeit",
                                background: "#0f172a",
                                color: "#fff"
                            }).then((result) => {
                                if (result.isConfirmed) {
                                    socket.emit("quitMatch", { roomId, matchId });
                                    navigate('/arena');
                                }
                            });
                        }}
                        className="px-3 py-1 text-[9px] font-bold text-red-500 border border-red-500/20 rounded-full hover:bg-red-500 hover:text-white transition-all duration-300 uppercase tracking-tighter"
                    >
                        Quit Duel
                    </button>
                </div>

                {/* Opponent */}
                <div className="flex items-center gap-4 w-1/3 justify-end">
                    <div className="flex-1 max-w-[150px] text-right">
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                            <motion.div
                                animate={{ width: `${opponentHealth}%` }}
                                className="h-full bg-gradient-to-l from-red-500 to-orange-400"
                            />
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-1">{opponentHealth}/100 HP</div>
                    </div>
                    <div>
                        <div className="text-white font-bold">{opponent.username}</div>
                        <div className="text-[10px] text-red-400 uppercase tracking-widest font-mono text-right">Enemy</div>
                    </div>
                </div>
            </header>

            {/* Battleground */}
            <div className="flex-1 grid grid-cols-12 gap-1 p-1 overflow-hidden">
                {/* Left: Code Editor */}
                <div className="col-span-8 bg-slate-950 border border-slate-800 rounded-lg flex flex-col relative group">
                    <div className="p-4 border-b border-slate-800 bg-slate-900/30">
                        <h2 className="text-xl font-bold text-white mb-2">{match.challenge.title}</h2>
                        <p className="text-slate-400 text-xs leading-relaxed">{match.challenge.description}</p>
                    </div>
                    <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-blue-400 text-sm font-mono">
                            <Code className="w-4 h-4" />
                            solution.{language === 'javascript' ? 'js' : 'py'}
                        </div>
                        <div className="flex gap-2">
                            <select
                                value={language}
                                onChange={(e) => {
                                    const newLang = e.target.value;
                                    setLanguage(newLang);
                                    if (match.challenge.data[newLang]) {
                                        setCode(match.challenge.data[newLang].starterCode);
                                    }
                                }}
                                className="bg-slate-800 border-none text-[10px] text-slate-300 rounded px-2 focus:ring-0 cursor-pointer outline-none"
                            >
                                <option value="javascript">JavaScript</option>
                                <option value="python">Python</option>
                            </select>
                            <Button
                                variant="primary"
                                size="sm"
                                className="h-8 px-4 text-xs bg-blue-600 hover:bg-blue-500"
                                onClick={handleRun}
                                disabled={isRunning}
                            >
                                {isRunning ? "Casting..." : "Cast Spell"}
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 relative font-mono text-sm">
                        <textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full h-full bg-transparent text-slate-300 p-6 resize-none focus:outline-none scrollbar-hide"
                            spellCheck={false}
                        />
                    </div>
                </div>

                {/* Right: Opponent View & Log */}
                <div className="col-span-4 flex flex-col gap-1">
                    {/* Opponent Real-time Preview (Blurred/Smaller) */}
                    <Card variant="stone" className="h-1/2 bg-slate-900/50 flex flex-col border-slate-800 overflow-hidden group">
                        <div className="p-3 border-b border-slate-800 text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                            Enemy Codex (Encrypted)
                        </div>
                        <div className="flex-1 p-4 bg-slate-950 font-mono text-[10px] text-slate-700 blur-[1px] select-none pointer-events-none">
                            {opponentCode.split('\n').map((l, i) => (
                                <div key={i} className="mb-1">{l}</div>
                            ))}
                        </div>
                    </Card>

                    {/* Battle Logs */}
                    <Card variant="stone" className="flex-1 bg-slate-950 flex flex-col border-slate-800 overflow-hidden">
                        <div className="p-3 border-b border-slate-800 text-[10px] text-slate-500 font-mono uppercase tracking-widest flex justify-between items-center">
                            <span>Battle Logs</span>
                            {testResults.length > 0 && (
                                <span className="text-[9px] text-blue-400">
                                    {testResults.filter(r => r.passed).length}/{testResults.length} Tests Passed
                                </span>
                            )}
                        </div>
                        <div className="flex-1 p-4 font-mono text-xs overflow-y-auto">
                            {output && (
                                <div className={`mb-4 pb-2 border-b border-white/5 ${output.includes('✨') ? 'text-green-400' : 'text-blue-400'}`}>
                                    {output}
                                </div>
                            )}
                            
                            {/* Detailed Test Results */}
                            <div className="space-y-2">
                                {testResults.map((res, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5">
                                        <div className="flex items-center gap-2">
                                            {res.passed ? (
                                                <CheckCircle className="w-3 h-3 text-green-500" />
                                            ) : (
                                                <AlertTriangle className="w-3 h-3 text-red-500" />
                                            )}
                                            <span className="text-slate-300 truncate max-w-[150px]">{res.name}</span>
                                        </div>
                                        {!res.passed && (
                                            <span className="text-[10px] text-red-400/50 italic">Failed</span>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {testResults.length === 0 && !output && (
                                <div className="text-slate-600 italic">Match started. Fight for your life!</div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
