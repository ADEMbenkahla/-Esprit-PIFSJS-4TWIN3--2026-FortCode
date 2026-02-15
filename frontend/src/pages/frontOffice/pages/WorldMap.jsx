import React from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { Shield, Sword, Cpu, Trophy, MapPin, ChevronRight, Lock, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';

export default function WorldMap() {
  const layers = [
    {
      id: 'training',
      name: 'Outer Ward',
      description: 'The Training Grounds',
      icon: <Sword className="w-6 h-6 text-amber-400" />,
      status: 'unlocked',
      path: '/training',
      position: { top: '70%', left: '50%' },
    },
    {
      id: 'bastion',
      name: 'Inner Bastion',
      description: 'Bot Battles',
      icon: <Cpu className="w-6 h-6 text-blue-400" />,
      status: 'locked',
      path: '/arena',
      position: { top: '50%', left: '50%' },
    },
    {
      id: 'keep',
      name: 'The Keep',
      description: 'PvP Combat',
      icon: <Shield className="w-6 h-6 text-purple-400" />,
      status: 'locked',
      path: '/arena',
      position: { top: '35%', left: '50%' },
    },
    {
      id: 'commander',
      name: 'Commander\'s Tower',
      description: 'Recruiter Assessment',
      icon: <Trophy className="w-6 h-6 text-yellow-400" />,
      status: 'locked',
      path: '/dashboard',
      position: { top: '15%', left: '50%' },
    },
  ];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950 flex items-center justify-center">
      {/* Background Map */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center opacity-60 pointer-events-none"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1734456031989-71d98f5d9807?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXJrJTIwZmFudGFzeSUyMGZvcnRyZXNzJTIwbWFwJTIwYWVyaWFsJTIwdmlld3xlbnwxfHx8fDE3NzA5NzkzNzd8MA&ixlib=rb-4.1.0&q=80&w=1080')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/50 to-slate-950/80" />
      </div>

      {/* Floating Fortress Layers */}
      <div className="relative z-10 w-full max-w-4xl h-full flex flex-col items-center justify-center">
        {/* Connecting Line */}
        <div className="absolute top-[20%] bottom-[25%] left-1/2 w-1 bg-gradient-to-b from-yellow-500 via-blue-500 to-slate-700 -translate-x-1/2 z-0 opacity-50" />

        {layers.map((layer, index) => (
          <motion.div
            key={layer.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.2 }}
            className="relative z-10 my-8 w-full flex justify-center"
          >
            <Link to={layer.status === 'locked' ? '#' : layer.path} className={layer.status === 'locked' ? 'cursor-not-allowed' : ''}>
              <motion.div
                whileHover={layer.status !== 'locked' ? { scale: 1.05, y: -5 } : {}}
                className={`relative group flex items-center gap-6 p-6 rounded-xl border backdrop-blur-md transition-all duration-300 w-[500px] ${
                  layer.status === 'locked' 
                    ? 'bg-slate-900/80 border-slate-800 opacity-60 grayscale' 
                    : 'bg-slate-900/90 border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.2)] hover:border-blue-400 hover:shadow-[0_0_50px_rgba(59,130,246,0.4)]'
                }`}
              >
                {/* Icon Container */}
                <div className={`relative w-16 h-16 rounded-full flex items-center justify-center border-2 ${
                  layer.status === 'locked' ? 'bg-slate-800 border-slate-700' : 'bg-slate-800 border-blue-500/50 shadow-inner'
                }`}>
                  {layer.status === 'locked' ? <Lock className="w-6 h-6 text-slate-500" /> : layer.icon}
                  
                  {/* Pulse Effect for Unlocked */}
                  {layer.status !== 'locked' && (
                    <div className="absolute inset-0 rounded-full border border-blue-400 animate-ping opacity-20" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className={`text-xl font-serif font-bold tracking-wide ${layer.status === 'locked' ? 'text-slate-500' : 'text-slate-100 group-hover:text-blue-300'}`}>
                    {layer.name}
                  </h3>
                  <p className="text-sm text-slate-400 font-mono mt-1">{layer.description}</p>
                </div>

                {/* Action Arrow */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:translate-x-1 ${
                  layer.status === 'locked' ? 'bg-slate-800 text-slate-600' : 'bg-blue-600 text-white shadow-lg'
                }`}>
                  {layer.status === 'locked' ? <Lock className="w-4 h-4" /> : <ChevronRight className="w-5 h-5" />}
                </div>

                {/* Decorative Elements */}
                {layer.status !== 'locked' && (
                  <>
                    <div className="absolute -top-1 -left-1 w-3 h-3 border-t border-l border-blue-400 opacity-50" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b border-r border-blue-400 opacity-50" />
                  </>
                )}
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Floating Particles (Simulated) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400 rounded-full blur-sm animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-3 h-3 bg-amber-400 rounded-full blur-sm animate-bounce" />
      </div>
    </div>
  );
}
