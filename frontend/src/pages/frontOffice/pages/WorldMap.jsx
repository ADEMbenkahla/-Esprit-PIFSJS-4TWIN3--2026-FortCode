import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Sword, Cpu, Trophy, ChevronRight, Lock, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ScrollButton } from '../components/ui/ScrollButton';

export default function WorldMap() {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStages = async () => {
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        const response = await fetch("http://localhost:5000/api/stages?category=mission", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Failed to fetch world map data");
        const data = await response.json();
        setStages(data);
      } catch (err) {
        console.error("Error fetching map:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStages();
  }, []);

  const getIcon = (level) => {
    switch (level) {
      case 1: return <Sword className="w-6 h-6 text-blue-400" />;
      case 2: return <Cpu className="w-6 h-6 text-red-400" />;
      case 3: return <Shield className="w-6 h-6 text-amber-700" />;
      default: return <Trophy className="w-6 h-6 text-purple-400" />;
    }
  };

  const positions = [
    { top: '70%', left: '50%' },
    { top: '50%', left: '50%' },
    { top: '35%', left: '50%' },
    { top: '15%', left: '50%' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-950 overflow-auto">
      {/* Background Map */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center opacity-60 pointer-events-none"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1734456031989-71d98f5d9807?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXJrJTIwZmFudGFzeSUyMGZvcnRyZXNzJTIwbWFwJTIwYWVyaWFsJTIwdmlld3xlbnwxfHx8fDE3NzA5NzkzNzd8MA&ixlib=rb-4.1.0&q=80&w=1080')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/50 to-slate-950/80" />
      </div>

      {/* Floating Fortress Layers */}
      <div className="relative z-10 w-full max-w-4xl mx-auto py-20 flex flex-col items-center justify-center">
        {/* Connecting Line */}
        <div className="absolute top-[20%] bottom-[10%] left-1/2 w-1 bg-gradient-to-b from-yellow-500 via-blue-500 to-slate-700 -translate-x-1/2 z-0 opacity-50" />

        {stages.map((stage, index) => {
          const isLocked = stage.status === 'locked';
          const isCompleted = stage.status === 'completed';
          const pos = positions[index] || { top: `${70 - index * 15}%`, left: '50%' };

          return (
            <motion.div
              key={stage._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative z-10 my-8 w-full flex justify-center"
            >
              <Link to={isLocked ? '#' : `/stages/${stage._id}`} className={isLocked ? 'cursor-not-allowed' : ''}>
                <motion.div
                  whileHover={!isLocked ? { scale: 1.05, y: -5 } : {}}
                  className={`relative group flex items-center gap-6 p-6 rounded-xl border backdrop-blur-md transition-all duration-300 w-[500px] ${isLocked
                    ? 'bg-slate-900/80 border-slate-800 opacity-60 grayscale'
                    : 'bg-slate-900/90 border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.2)] hover:border-blue-400 hover:shadow-[0_0_50px_rgba(59,130,246,0.4)]'
                    }`}
                >
                  {/* Icon Container */}
                  <div className={`relative w-16 h-16 rounded-full flex items-center justify-center border-2 ${isLocked ? 'bg-slate-800 border-slate-700' : 'bg-slate-800 border-blue-500/50 shadow-inner'
                    }`}>
                    {isLocked ? <Lock className="w-6 h-6 text-slate-500" /> : getIcon(stage.level)}

                    {!isLocked && (
                      <div className="absolute inset-0 rounded-full border border-blue-400 animate-ping opacity-20" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className={`text-xl font-serif font-bold tracking-wide ${isLocked ? 'text-slate-500' : 'text-slate-100 group-hover:text-blue-300'}`}>
                      Level {stage.level}
                    </h3>
                    <p className="text-sm text-slate-400 font-mono mt-1">{stage.title}</p>
                    {isCompleted && (
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                        Castle built • {stage.progress?.stars || 0} Stars
                      </div>
                    )}
                  </div>

                  {/* Action Arrow */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:translate-x-1 ${isLocked ? 'bg-slate-800 text-slate-600' : 'bg-blue-600 text-white shadow-lg'
                    }`}>
                    {isLocked ? <Lock className="w-4 h-4" /> : <ChevronRight className="w-5 h-5" />}
                  </div>

                  {/* Decorative Elements */}
                  {!isLocked && (
                    <>
                      <div className="absolute -top-1 -left-1 w-3 h-3 border-t border-l border-blue-400 opacity-50" />
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b border-r border-blue-400 opacity-50" />
                    </>
                  )}
                </motion.div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <ScrollButton />
    </div>
  );
}
