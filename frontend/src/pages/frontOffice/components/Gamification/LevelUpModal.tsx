import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { useSoundEffects } from '../../../../hooks/useSoundEffects';

interface LevelUpModalProps {
  level: number;
  isOpen: boolean;
  onClose: () => void;
}

// SVG d'une épée verticale inspirée de l'image (pointe en haut, garde au milieu, poignée et pommeau en bas)
const SwordSVG = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 40 100"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    style={{ filter: 'drop-shadow(0 0 10px rgba(59,130,246,0.5)) drop-shadow(0 0 20px rgba(37,99,235,0.4))' }}
  >
    <defs>
      <linearGradient id="swordGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="50%" stopColor="#93c5fd" />
        <stop offset="100%" stopColor="#2563eb" />
      </linearGradient>
      <linearGradient id="hiltGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#1e3a8a" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
    </defs>

    {/* Lame (Blade) */}
    <polygon points="20,0 10,15 10,70 30,70 30,15" fill="url(#swordGrad)" />
    {/* Reflet central sur la lame */}
    <line x1="20" y1="5" x2="20" y2="70" stroke="#eff6ff" strokeWidth="1" opacity="0.6" />

    {/* Garde (Crossguard) */}
    <rect x="0" y="70" width="40" height="8" rx="3" fill="url(#hiltGrad)" stroke="#60a5fa" strokeWidth="1" />
    
    {/* Poignée (Grip) */}
    <rect x="14" y="78" width="12" height="15" fill="#0f172a" stroke="#1e3a8a" strokeWidth="1" />
    <line x1="14" y1="81" x2="26" y2="81" stroke="#1e40af" strokeWidth="1" opacity="0.6" />
    <line x1="14" y1="85" x2="26" y2="85" stroke="#1e40af" strokeWidth="1" opacity="0.6" />
    <line x1="14" y1="89" x2="26" y2="89" stroke="#1e40af" strokeWidth="1" opacity="0.6" />

    {/* Pommeau (Pommel) */}
    <rect x="10" y="93" width="20" height="7" rx="2" fill="url(#hiltGrad)" stroke="#60a5fa" strokeWidth="1" />
  </svg>
);

export const LevelUpModal: React.FC<LevelUpModalProps> = ({ level, isOpen, onClose }) => {
  const { playLevelUp } = useSoundEffects();

  useEffect(() => {
    if (isOpen) {
      playLevelUp();
    }
  }, [isOpen, playLevelUp]);

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/95 backdrop-blur-xl overflow-hidden"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          {/* Background Cinematic Atmosphere */}
          <div className="absolute inset-0 bg-radial-gradient pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_50%_font-bold)] from-blue-600/10 to-transparent blur-3xl" />
          </div>

          <div className="relative flex flex-col items-center gap-6">

            {/* === Épées qui se croisent en X === */}
            <div className="relative w-64 h-64 flex items-center justify-center mb-4">

              {/* Sword 1 — Vient d'en bas à gauche, tourne vers la droite */}
              <motion.div
                initial={{ x: -200, y: 200, rotate: 0, opacity: 0 }}
                animate={{ x: 0, y: 0, rotate: 45, opacity: 1 }}
                transition={{
                  type: 'spring',
                  damping: 18,
                  stiffness: 130,
                  delay: 0.1,
                }}
                className="absolute"
                style={{ transformOrigin: 'center' }}
              >
                <SwordSVG className="w-auto h-40" />
              </motion.div>

              {/* Sword 2 — Vient d'en bas à droite, tourne vers la gauche */}
              <motion.div
                initial={{ x: 200, y: 200, rotate: 0, opacity: 0 }}
                animate={{ x: 0, y: 0, rotate: -45, opacity: 1 }}
                transition={{
                  type: 'spring',
                  damping: 18,
                  stiffness: 130,
                  delay: 0.1,
                }}
                className="absolute"
                style={{ transformOrigin: 'center' }}
              >
                {/* ScaleX(-1) sur Sword 2 n'est plus nécessaire car l'épée verticale est symétrique */}
                <SwordSVG className="w-auto h-40" />
              </motion.div>

              {/* Flash d'impact au croisement */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 2.5, 0], opacity: [0, 0.9, 0] }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="absolute w-32 h-32 bg-white rounded-full blur-[40px] z-0"
              />

              {/* Scintillement persistant au centre */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.5, 0] }}
                transition={{ duration: 2, delay: 0.7, repeat: Infinity }}
                className="absolute w-24 h-24 bg-blue-500 rounded-full blur-[30px] z-[-1]"
              />
            </div>

            {/* Level Up Text & Card */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', delay: 0.8, damping: 15 }}
              className="flex flex-col items-center gap-8"
            >
              <motion.h2
                animate={{ scale: [1, 1.05, 1], textShadow: ["0 0 10px rgba(59,130,246,0.5)", "0 0 30px rgba(59,130,246,0.8)", "0 0 10px rgba(59,130,246,0.5)"] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="text-7xl font-black text-white uppercase italic tracking-tighter relative"
                style={{ fontFamily: "'Orbitron', sans-serif" }}
              >
                Level Up!
              </motion.h2>

              {/* Restored Level Card */}
              <div className="relative group">
                <motion.div 
                  className="absolute -inset-2 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 rounded-3xl blur-xl opacity-30"
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />
                <div className="relative flex items-center gap-8 bg-slate-900/90 border border-blue-500/30 px-12 py-6 rounded-3xl backdrop-blur-2xl">
                  <div className="bg-amber-400/20 p-4 rounded-2xl border border-amber-400/40 shadow-[0_0_20px_rgba(251,191,36,0.2)]">
                    <Trophy className="w-12 h-12 text-amber-400 filter drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-blue-400 text-sm font-bold uppercase tracking-[0.3em] mb-1">New Milestone</span>
                    <span className="text-6xl font-black text-white tracking-tight flex items-baseline gap-2">
                      LVL <span className="text-blue-500">{level}</span>
                    </span>
                  </div>
                </div>
              </div>

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2 }}
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(59,130,246,0.15)' }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="mt-6 px-10 py-4 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 rounded-full text-blue-400 font-bold tracking-[0.2em] uppercase text-sm transition-all cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:shadow-[0_0_25px_rgba(59,130,246,0.4)]"
              >
                Continue Adventure
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

