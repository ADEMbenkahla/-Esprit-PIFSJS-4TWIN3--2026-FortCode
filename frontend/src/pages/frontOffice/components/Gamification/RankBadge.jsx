import React from 'react';
import { Shield, Target, Zap, Crown, Award, Star, Flame, Diamond, Hexagon } from 'lucide-react';
import { motion } from 'framer-motion';

export const RANK_CONFIG = {
  Iron: { icon: Shield, color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/30', glow: '' },
  Bronze: { icon: Target, color: 'text-amber-700', bg: 'bg-amber-700/10', border: 'border-amber-700/30', glow: '' },
  Silver: { icon: Award, color: 'text-slate-300', bg: 'bg-slate-300/10', border: 'border-slate-300/30', glow: 'drop-shadow-[0_0_5px_rgba(203,213,225,0.5)]' },
  Gold: { icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', glow: 'drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]' },
  Platinum: { icon: Hexagon, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/30', glow: 'drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]' },
  Diamond: { icon: Diamond, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30', glow: 'drop-shadow-[0_0_12px_rgba(192,132,252,0.7)] text-purple-400' },
  Ascendant: { icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30', glow: 'drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]' },
  Immortal: { icon: Flame, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', glow: 'drop-shadow-[0_0_20px_rgba(239,68,68,0.9)]' },
  Radiant: { icon: Crown, color: 'text-yellow-200', bg: 'bg-yellow-200/20', border: 'border-yellow-200/50', glow: 'drop-shadow-[0_0_25px_rgba(254,240,138,1)]' },
};

export function RankBadge({ rank = 'Iron', level = 1, showLabel = false, size = 'sm' }) {
  const config = RANK_CONFIG[rank] || RANK_CONFIG.Iron;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  return (
    <div className={`flex items-center gap-2`} title={`Rank: ${rank} | Level: ${level}`}>
      <motion.div 
        whileHover={{ scale: 1.1 }}
        className={`relative flex items-center justify-center rounded-full border ${config.bg} ${config.border} ${sizeClasses[size]}`}
      >
        <Icon className={`${iconSizeClasses[size]} ${config.color} ${config.glow}`} />
        
        {/* Affichage du Level en petit sur l'icon si taille >= md */}
        {size !== 'sm' && (
           <div className="absolute -bottom-1 -right-1 bg-slate-900 border border-slate-700 text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full z-10 font-mono">
             {level}
           </div>
        )}
      </motion.div>

      {showLabel && (
        <div className="flex flex-col">
          <span className={`font-bold uppercase tracking-wider text-sm ${config.color} ${config.glow}`}>
            {rank}
          </span>
          <span className="text-xs text-slate-400 font-mono">Lvl. {level}</span>
        </div>
      )}
    </div>
  );
}
