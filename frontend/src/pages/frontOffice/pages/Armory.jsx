import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Award, Shield, Swords, Crown, Medal } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { ScrollButton } from '../components/ui/ScrollButton';

export default function Armory() {
  const accentStyle = { color: 'var(--accent-color)' };
  const accentBgStyle = { backgroundColor: 'rgba(var(--accent-color-rgb), 0.12)' };
  const accentBorderStyle = { borderColor: 'var(--accent-color)' };
  const accentShadowStyle = { boxShadow: '0 0 30px rgba(var(--accent-color-rgb), 0.3)' };

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
        {/* Profile Header */}
        <section className="flex items-center gap-8 mb-12">
          <div className="relative group">
            <div
              className="w-32 h-32 rounded-full border-4 overflow-hidden"
              style={{ ...accentBorderStyle, ...accentShadowStyle }}
            >
              <img src="https://ui-avatars.com/api/?name=Champion&background=0f172a&color=3b82f6&size=128" alt="Champion Avatar" />
            </div>
            <div
              className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full border-4 border-slate-900 flex items-center justify-center text-slate-900 font-bold"
              style={accentBgStyle}
            >
              12
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-serif font-bold mb-2" style={accentStyle}>Champion "The Coder"</h1>
            <p className="text-slate-400 font-mono flex items-center gap-2">
              <Shield className="w-4 h-4" style={accentStyle} />
              Member of the Royal Guard
            </p>
            <div className="flex gap-4 mt-4">
              <div className="px-4 py-2 bg-slate-900 rounded border border-slate-700">
                <div className="text-xs text-slate-500 uppercase">Honor</div>
                <div className="text-xl font-bold" style={accentStyle}>1,250</div>
              </div>
              <div className="px-4 py-2 bg-slate-900 rounded border border-slate-700">
                <div className="text-xs text-slate-500 uppercase">Battles</div>
                <div className="text-xl font-bold" style={accentStyle}>42</div>
              </div>
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
