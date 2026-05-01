import React from 'react';

const ExperienceBar = ({ 
  xp, 
  resultType, // 'win', 'draw', 'defeat' 
  showAnimation = true,
  compact = false 
}) => {
  if (!xp) return null;

  const currentPoints = xp.points || 0;
  const gainedXP = xp.gainedXP || 0;
  const progress = Math.max(0, Math.min(100, (currentPoints % 500) / 5));
  const oldPoints = currentPoints - gainedXP;
  const oldProgress = Math.max(0, Math.min(100, (oldPoints % 500) / 5));
  
  // Calcul du pourcentage selon le résultat
  let resultMultiplier = 1; // win = 100%
  if (resultType === 'draw') resultMultiplier = 0.5; // draw = 50%
  if (resultType === 'defeat') resultMultiplier = 0.2; // defeat = 20%
  
  const adjustedProgress = progress * resultMultiplier;
  const barId = `xp-bar-${Math.random().toString(36).substr(2, 9)}`;

  const containerClass = compact 
    ? "p-3 bg-blue-900/20 rounded-lg border border-blue-500/20"
    : "p-4 bg-blue-900/40 rounded-2xl border border-blue-500/20";

  const levelClass = compact 
    ? "text-[9px] text-blue-400 font-bold uppercase tracking-widest"
    : "text-[10px] text-blue-400 font-bold uppercase tracking-widest";

  const xpClass = compact 
    ? "text-[9px] text-emerald-400 font-bold"
    : "text-[10px] text-emerald-400 font-bold";

  const barClass = compact 
    ? "h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700"
    : "h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700";

  const fillClass = compact
    ? "h-full bg-blue-500 shadow-[0_0_6px_rgba(37,99,235,0.5)] transition-all duration-1000 ease-out"
    : "h-full bg-blue-500 shadow-[0_0_8px_rgba(37,99,235,0.5)] transition-all duration-1000 ease-out";

  const progressClass = compact
    ? "text-[8px] text-slate-500 mt-1 text-right"
    : "text-[9px] text-slate-500 mt-1 text-right";

  const levelUpClass = compact
    ? "text-[9px] text-yellow-400 font-bold mt-1 animate-bounce text-center"
    : "text-xs text-yellow-400 font-bold mt-2 animate-bounce text-center";

  return (
    <div className={containerClass}>
      <div className="flex justify-between items-center mb-2">
        <div className={levelClass}>Level {xp.level}</div>
        <div className={xpClass}>+{Math.floor(gainedXP * resultMultiplier)} XP</div>
      </div>
      <div className={barClass}>
        <div 
          id={barId}
          className={fillClass}
          style={{ width: showAnimation ? '0%' : `${adjustedProgress}%` }}
        />
      </div>
      <div className={progressClass}>
        {Math.floor(currentPoints * resultMultiplier) % 500}/500 to next level
      </div>
      {xp.levelUp && resultType === 'win' && (
        <div className={levelUpClass}>LEVEL UP! 🎊</div>
      )}
      {xp.newBadges?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 justify-center">
          {xp.newBadges.map(b => (
            <span 
              key={b._id || b.label}
              className="bg-amber-500/20 text-amber-500 text-[8px] px-2 py-0.5 rounded border border-amber-500/30"
            >
              🏆 {b.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExperienceBar;
