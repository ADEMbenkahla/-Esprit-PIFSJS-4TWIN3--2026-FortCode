import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Star, Play, Book, Code, Sword } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

const levels = [
  { id: 1, title: 'The Basics', description: 'Variables & Types', status: 'completed', stars: 3, type: 'training' },
  { id: 2, title: 'Control Flow', description: 'If/Else & Loops', status: 'completed', stars: 2, type: 'training' },
  { id: 3, title: 'Functions', description: 'Parameters & Returns', status: 'unlocked', stars: 0, type: 'battle' },
  { id: 4, title: 'Arrays', description: 'Lists & Iteration', status: 'locked', stars: 0, type: 'training' },
  { id: 5, title: 'Objects', description: 'Properties & Methods', status: 'locked', stars: 0, type: 'training' },
  { id: 6, title: 'DOM Manipulation', description: 'Selecting Elements', status: 'locked', stars: 0, type: 'boss' },
];

export default function TrainingGrounds() {
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
            <span className="font-bold text-amber-100">5 / 18 Stars</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {levels.map((level, index) => (
          <motion.div
            key={level.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className={`relative h-full p-6 rounded-xl border transition-all duration-300 group ${
              level.status === 'locked' 
                ? 'bg-slate-900/50 border-slate-800 opacity-60' 
                : 'bg-slate-900 border-slate-700 hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]'
            }`}>
              {/* Card Header */}
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-lg ${
                  level.status === 'locked' ? 'bg-slate-800 text-slate-600' : 
                  level.type === 'boss' ? 'bg-red-900/20 text-red-400 border border-red-500/30' :
                  'bg-blue-900/20 text-blue-400 border border-blue-500/30'
                }`}>
                  {level.type === 'boss' ? <Sword className="w-6 h-6" /> : <Book className="w-6 h-6" />}
                </div>
                {level.status === 'completed' && (
                  <div className="flex gap-1">
                    {[...Array(3)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < level.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`} />
                    ))}
                  </div>
                )}
                {level.status === 'locked' && <Lock className="w-5 h-5 text-slate-600" />}
              </div>

              {/* Content */}
              <h3 className={`text-xl font-bold mb-2 ${level.status === 'locked' ? 'text-slate-500' : 'text-slate-100'}`}>
                {level.title}
              </h3>
              <p className="text-sm text-slate-400 font-mono mb-6">{level.description}</p>

              {/* Action Button */}
              <div className="mt-auto">
                {level.status === 'locked' ? (
                  <Button variant="ghost" disabled className="w-full justify-center">
                    Locked
                  </Button>
                ) : (
                  <Link to={`/arena`}>
                    <Button 
                      variant={level.status === 'completed' ? 'secondary' : 'primary'} 
                      className="w-full justify-center group-hover:scale-[1.02]"
                      icon={level.status === 'completed' ? <Code /> : <Play />}
                    >
                      {level.status === 'completed' ? 'Review Code' : 'Start Challenge'}
                    </Button>
                  </Link>
                )}
              </div>
              
              {/* Progress Bar for Current Level */}
              {level.status === 'unlocked' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800 rounded-b-xl overflow-hidden">
                  <div className="h-full bg-blue-500 w-1/3 animate-pulse" />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
