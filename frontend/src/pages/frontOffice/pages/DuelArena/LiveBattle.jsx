import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Shield, Zap, Play, RotateCcw, AlertTriangle, CheckCircle, Code, Trophy, Skull, Loader2 } from 'lucide-react';
import { io } from 'socket.io-client';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import Swal from 'sweetalert2';

const SOCKET_URL = "http://127.0.0.1:5000";

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
    const [isRunning, setIsRunning] = useState(false);
    const [winner, setWinner] = useState(null);

    useEffect(() => {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const newSocket = io(SOCKET_URL, { auth: { token } });

        // Register listeners FIRST
        newSocket.on("matchFound", ({ match }) => {
            console.log("🎮 Match data received:", match);
            setMatch(match);
            if (match.challenge?.data?.[language]) {
                setCode(match.challenge.data[language].starterCode);
            }
        });

        newSocket.on("opponentCodeUpdate", ({ code }) => {
            setOpponentCode(code);
        });

        newSocket.on("opponentBattleEvent", ({ event, data }) => {
            if (event === "damageTaken") {
                setHealth(data.health);
                setOutput(`⚠️ INCANTATION DETECTED: Opponent dealt damage!`);
            }
        });

        newSocket.on("matchEnded", ({ winnerId, match: endMatch }) => {
            setWinner(winnerId);
            const isMe = winnerId === JSON.parse(atob(token.split('.')[1])).id;
            Swal.fire({
                title: isMe ? "GLORIOUS VICTORY!" : "DEFEAT...",
                text: isMe ? "You have crushed your opponent!" : "The recursion was too strong for you.",
                icon: isMe ? "success" : "error",
                confirmButtonText: "Return to Arena"
            }).then(() => navigate('/arena'));
        });

        // Then handle connection
        newSocket.on("connect", () => {
            console.log("🔌 Connected to socket, joining match...");
            newSocket.emit("joinMatch", { matchId, roomId });
        });

        setSocket(newSocket);
        return () => newSocket.disconnect();
    }, [matchId, roomId, navigate]);

    const handleRun = useCallback(() => {
        setIsRunning(true);
        setOutput("⚡ Casting spell...");

        // Simple mock execution
        setTimeout(() => {
            const fakeSuccess = Math.random() > 0.3; // 70% chance of success for demo
            if (fakeSuccess) {
                const newOppHealth = Math.max(0, opponentHealth - 25);
                setOpponentHealth(newOppHealth);
                setOutput("✅ SPELL SUCCESSFUL!\n> Opponent took 25 damage.");
                socket.emit("battleEvent", { roomId, event: "damageTaken", data: { health: newOppHealth } });

                if (newOppHealth <= 0) {
                    // I win
                    const userId = JSON.parse(atob((sessionStorage.getItem('token') || localStorage.getItem('token')).split('.')[1])).id;
                    socket.emit("matchResult", { roomId, matchId, winnerId: userId });
                }
            } else {
                setOutput("❌ SPELL FIZZLED.\n> Syntax error in your incantation.");
            }
            setIsRunning(false);
        }, 1500);
    }, [opponentHealth, matchId, roomId, socket]);

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
                        <div className="p-3 border-b border-slate-800 text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                            Battle Logs
                        </div>
                        <div className="flex-1 p-4 font-mono text-xs overflow-y-auto">
                            {output && <div className="text-blue-400 mb-2">{output}</div>}
                            <div className="text-slate-600 italic">Match started. Fight for your life!</div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
