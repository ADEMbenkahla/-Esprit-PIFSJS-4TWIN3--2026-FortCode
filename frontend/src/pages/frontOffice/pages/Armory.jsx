import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Award, Shield, Swords, Crown, Zap } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { ScrollButton } from '../components/ui/ScrollButton';
import { useSettings } from "../../../context/SettingsContext";
import { RankBadge } from '../components/Gamification/RankBadge';

const RANK_THRESHOLDS = [
  { rank: "Radiant", xp: 100000 },
  { rank: "Immortal", xp: 50000 },
  { rank: "Ascendant", xp: 35000 },
  { rank: "Diamond", xp: 20000 },
  { rank: "Platinum", xp: 10000 },
  { rank: "Gold", xp: 5000 },
  { rank: "Silver", xp: 2500 },
  { rank: "Bronze", xp: 1000 },
  { rank: "Iron", xp: 0 }
];

export default function Armory() {
  const accentStyle = { color: 'var(--accent-color)' };
  const accentBgStyle = { backgroundColor: 'rgba(var(--accent-color-rgb), 0.12)' };
  const accentBorderStyle = { borderColor: 'var(--accent-color)' };
  const accentShadowStyle = { boxShadow: '0 0 30px rgba(var(--accent-color-rgb), 0.3)' };

  const { avatar, nickname } = useSettings();
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        if (!token) return;
        const response = await fetch("http://localhost:5000/api/auth/profile", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setUserData(data.user);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };
    fetchProfile();
  }, []);

  const rank = userData?.gamification?.rank || "Iron";
  const level = userData?.gamification?.level || 1;
  const points = userData?.gamification?.points || 0;

  const calculateProgress = (pts) => {
    let currentTierXP = 0;
    let nextRankXP = null;
    
    for (const threshold of RANK_THRESHOLDS) {
      if (pts >= threshold.xp) {
        currentTierXP = threshold.xp;
        break;
      }
    }

    for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
       if (RANK_THRESHOLDS[i].xp > pts) {
           nextRankXP = RANK_THRESHOLDS[i].xp;
           break;
       }
    }

    if (!nextRankXP) return { percent: 100, current: pts, needed: pts, totalNext: 'MAX' };

    const xpNeeded = nextRankXP - currentTierXP;
    const xpGained = pts - currentTierXP;
    const percent = Math.floor((xpGained / xpNeeded) * 100);
    return { percent, current: xpGained, needed: xpNeeded, totalNext: nextRankXP };
  };

  const progress = calculateProgress(points);

  const badges = [
    { id: 1, name: 'First Blood', description: 'Win your first battle', icon: <Swords /> },
    { id: 2, name: 'Clean Coder', description: 'Pass 10 battles with perfect syntax', icon: <Shield /> },
    { id: 3, name: 'Recursion Master', description: 'Defeat the Golem', icon: <Award /> },
  ];

  const leaders = [
    { rank: 1, name: 'Sir Alan Turing', score: 9999, faction: 'The Logic Lords' },
    { rank: 2, name: 'Ada Lovelace', score: 9850, faction: 'Binary Queens' },
    { rank: 3, name: 'Grace Hopper', score: 9500, faction: 'Compiler Chiefs' },
  ];

  return (
    <div className="min-h-screen pt-24 p-8 bg-slate-950 overflow-hidden relative">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Profile Header with Gamification */}
        <section className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12 bg-slate-900/50 p-8 rounded-2xl border border-slate-800">
          <div className="relative group">
            <div
              className="w-32 h-32 rounded-full border-4 overflow-hidden"
              style={{ ...accentBorderStyle, ...accentShadowStyle }}
            >
              <img src={avatar || "https://ui-avatars.com/api/?name=Commander&background=0f172a&color=3b82f6&size=128"} alt="Avatar" />
            </div>
            <div
              className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full border-4 border-slate-900 flex items-center justify-center text-slate-900 font-bold"
              style={accentBgStyle}
            >
              {level}
            </div>
          </div>
          
          <div className="flex-1 w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-4">
              <div>
                <h1 className="text-4xl font-serif font-bold mb-2 text-white">Commander <span style={accentStyle}>{nickname || userData?.username || "Player"}</span></h1>
                <p className="text-slate-400 font-mono flex items-center gap-2">
                  <Shield className="w-4 h-4" style={accentStyle} />
                  Member of the Royal Guard
                </p>
              </div>
              <div className="hidden md:block">
                 <RankBadge rank={rank} level={level} size="lg" showLabel={true} />
              </div>
            </div>

            {/* XP Bar */}
            <div className="mt-8">
              <div className="flex justify-between text-xs font-mono mb-2">
                <span className="text-slate-400 font-bold tracking-wider uppercase">EXP Progress</span>
                <span className="text-slate-300">
                  <span style={accentStyle}>{progress.current}</span> / {progress.needed} XP to next rank
                </span>
              </div>
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${progress.percent}%` }}
                   transition={{ duration: 1, delay: 0.5 }}
                   className="h-full rounded-full relative"
                   style={{ backgroundColor: 'var(--accent-color)' }}
                 >
                   <div className="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
                 </motion.div>
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                <span>Total points: {points}</span>
                {progress.totalNext !== 'MAX' && <span>{progress.totalNext} XP</span>}
              </div>
            </div>
            
             <div className="md:hidden mt-6 flex justify-center border-t border-slate-800 pt-6">
                 <RankBadge rank={rank} level={level} size="lg" showLabel={true} />
             </div>
          </div>
        </section>

        {/* The Armory (Badges) */}
        <section>
          <h2 className="text-2xl font-serif font-bold text-slate-200 mb-6 flex items-center gap-2">
            <Trophy className="w-6 h-6" style={accentStyle} />
            The Armory
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {badges.map((badge, i) => (
              <motion.div 
                key={badge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card variant="stone" className="p-6 flex flex-col items-center text-center group hover:border-amber-500/50 transition-colors">
                  <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                    {React.cloneElement(badge.icon, { className: "w-8 h-8", style: accentStyle })}
                  </div>
                  <h3 className="font-bold text-slate-200">{badge.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{badge.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Hall of Champions (Leaderboard) */}
        <section>
          <h2 className="text-2xl font-serif font-bold text-slate-200 mb-6 flex items-center gap-2">
            <Crown className="w-6 h-6" style={accentStyle} />
            Hall of Champions
          </h2>
          <Card variant="parchment" className="overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead
                    className="uppercase font-serif tracking-wider"
                    style={{
                      backgroundColor: 'rgba(var(--accent-color-rgb), 0.08)',
                      borderBottom: '1px solid rgba(var(--accent-color-rgb), 0.2)',
                      color: 'var(--accent-color)'
                    }}
                  >
                    <tr>
                      <th className="px-6 py-4 font-bold text-center w-20">Rank</th>
                      <th className="px-6 py-4 font-bold">Champion</th>
                      <th className="px-6 py-4 font-bold">Faction</th>
                      <th className="px-6 py-4 font-bold text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-800" style={{ borderColor: 'rgba(var(--accent-color-rgb), 0.15)' }}>
                    {leaders.map((leader) => (
                      <tr key={leader.rank} className="transition-colors" style={{ backgroundColor: 'transparent' }}>
                        <td className="px-6 py-4 text-center font-bold font-serif text-lg">
                          {leader.rank === 1 ? <span className="text-yellow-600 drop-shadow-sm">🥇</span> : 
                           leader.rank === 2 ? <span className="text-slate-400 drop-shadow-sm">🥈</span> :
                           leader.rank === 3 ? <span className="text-orange-600 drop-shadow-sm">🥉</span> : leader.rank}
                        </td>
                        <td className="px-6 py-4 font-bold">{leader.name}</td>
                        <td className="px-6 py-4 font-mono text-xs uppercase tracking-wide text-slate-600">{leader.faction}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold" style={accentStyle}>{leader.score.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </Card>
        </section>
      </div>
      <ScrollButton />
    </div>
  );
}
