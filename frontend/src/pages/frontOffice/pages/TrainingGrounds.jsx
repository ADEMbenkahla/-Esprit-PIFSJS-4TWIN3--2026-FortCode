import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Star, Play, Book, Code, Sword, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ScrollButton } from '../components/ui/ScrollButton';

export default function TrainingGrounds() {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStages = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/api/stages?category=training", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error("Failed to fetch stages");

        const data = await response.json();
        setStages(data);
      } catch (err) {
        console.error("Error fetching stages:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStages();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-red-500">
        Error: {error}
      </div>
    );
  }

  const totalStars = stages.reduce((acc, stage) => acc + (stage.progress?.stars || 0), 0);
  const maxPossibleStars = stages.length * 3;

  return (
    <div className="min-h-screen p-8 pt-24 space-y-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-serif font-bold text-slate-100 mb-2">The Training Grounds</h1>
          <p className="text-slate-400 font-mono">Master the basics before entering the Keep.</p>
        </div>
        <div className="flex gap-4">
          <div className="px-4 py-2 bg-slate-900 rounded-lg border border-slate-700 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            <span className="font-bold text-amber-100">{totalStars} / {maxPossibleStars} Stars</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stages.map((stage, index) => (
          <motion.div
            key={stage._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className={`relative h-full p-6 rounded-xl border transition-all duration-300 group ${stage.status === 'locked'
              ? 'bg-slate-900/50 border-slate-800 opacity-60'
              : 'bg-slate-900 border-slate-700 hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]'
              }`}>
              {/* Card Header */}
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-lg ${stage.status === 'locked' ? 'bg-slate-800 text-slate-600' :
                  stage.type === 'boss' ? 'bg-red-900/20 text-red-400 border border-red-500/30' :
                    'bg-blue-900/20 text-blue-400 border border-blue-500/30'
                  }`}>
                  {stage.type === 'boss' ? <Sword className="w-6 h-6" /> : <Book className="w-6 h-6" />}
                </div>
                {stage.status === 'completed' && (
                  <div className="flex gap-1">
                    {[...Array(3)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < (stage.progress?.stars || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`} />
                    ))}
                  </div>
                )}
                {stage.status === 'locked' && <Lock className="w-5 h-5 text-slate-600" />}
              </div>

              {/* Content */}
              <div className="flex items-center gap-2 mb-2">
                <h3 className={`text-xl font-bold ${stage.status === 'locked' ? 'text-slate-500' : 'text-slate-100'}`}>
                  {stage.title}
                </h3>
                {stage.challenges?.length > 0 && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${stage.challenges[0].language === 'python' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}>
                    {stage.challenges[0].language === 'javascript' ? 'JS' : 'PY'}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 font-mono mb-6">{stage.description}</p>

              {/* Action Button */}
              <div className="mt-auto">
                {stage.status === 'locked' ? (
                  <Button variant="ghost" disabled className="w-full justify-center">
                    Locked
                  </Button>
                ) : (
                  <Link to={`/training/${stage._id}`}>
                    <Button
                      variant={stage.status === 'completed' ? 'secondary' : 'primary'}
                      className="w-full justify-center group-hover:scale-[1.02]"
                      icon={stage.status === 'completed' ? <Code /> : <Play />}
                    >
                      {stage.status === 'completed' ? 'Review Code' : 'Start Challenge'}
                    </Button>
                  </Link>
                )}
              </div>

              {/* Progress Bar for Current Level */}
              {stage.status === 'unlocked' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800 rounded-b-xl overflow-hidden">
                  <div className="h-full bg-blue-500 w-1/3 animate-pulse" />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      <ScrollButton />
    </div>
  );
}
