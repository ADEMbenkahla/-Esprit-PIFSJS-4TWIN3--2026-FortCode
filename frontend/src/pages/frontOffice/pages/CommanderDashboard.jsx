import React from 'react';
import { motion } from 'framer-motion';
import { User, Shield, Sword, Activity, Eye, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ScrollButton } from '../components/ui/ScrollButton';

const candidates = [
  { id: 1, name: 'Sir Alex the Swift', role: 'Frontend Knight', status: 'Live Battle', health: 85, mana: 90, score: 1450 },
  { id: 2, name: 'Lady Sarah of Node', role: 'Backend Sorceress', status: 'Reviewing', health: 100, mana: 40, score: 1890 },
  { id: 3, name: 'Rogue Jenkins', role: 'DevOps Rogue', status: 'Idle', health: 60, mana: 100, score: 920 },
];

export default function CommanderDashboard() {
  const accentStyle = { color: 'var(--accent-color)' };
  const accentBorderStyle = { borderColor: 'rgba(var(--accent-color-rgb), 0.5)' };
  const accentShadowStyle = { boxShadow: '0 0 50px rgba(var(--accent-color-rgb), 0.5)' };

  return (
    <div className="min-h-screen pt-20 p-8 bg-slate-950 overflow-hidden relative">
       {/* Background Grid */}
       <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
       
       <header className="flex items-center justify-between mb-8 relative z-10">
         <div>
           <h1 className="text-3xl font-serif font-bold mb-1" style={accentStyle}>Commander's Dashboard</h1>
           <p className="text-slate-400 font-mono text-sm">Oversee the recruitment battles in real-time.</p>
         </div>
         <div className="flex gap-4">
           <Button variant="gold" icon={<Eye />}>Spectate All</Button>
           <Button variant="primary" icon={<FileText />}>Export Reports</Button>
         </div>
       </header>

       <div className="grid grid-cols-12 gap-6 relative z-10">
         {/* Main Battle Map / Live Feed */}
         <div className="col-span-8 space-y-6">
           <Card variant="glass" className="h-[400px] flex items-center justify-center relative group">
             <div className="absolute top-4 left-4 flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
               <span className="text-xs font-mono text-red-400 uppercase tracking-widest">Live Feed: Arena 1</span>
             </div>
             
             {/* Simulated Holographic Map */}
             <div className="w-full h-full bg-blue-900/10 flex items-center justify-center relative overflow-hidden">
               <div
                 className="absolute inset-0 bg-[size:40px_40px] perspective-[1000px] rotate-x-12 scale-150 animate-[pan_10s_linear_infinite]"
                 style={{
                   backgroundImage: 'linear-gradient(rgba(var(--accent-color-rgb),0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(var(--accent-color-rgb),0.1) 1px, transparent 1px)'
                 }}
               />
               
               <motion.div 
                 animate={{ y: [0, -10, 0] }} 
                 transition={{ repeat: Infinity, duration: 4 }}
                 className="relative z-10"
               >
                 <div
                   className="w-32 h-32 rounded-full border-4 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm"
                   style={{ ...accentBorderStyle, ...accentShadowStyle }}
                 >
                   <Sword className="w-12 h-12" style={accentStyle} />
                 </div>
                 <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-center w-48">
                   <div className="text-sm font-bold" style={accentStyle}>Current Battle</div>
                   <div className="text-xs font-mono" style={{ color: 'rgba(var(--accent-color-rgb), 0.7)' }}>Algorithm: QuickSort</div>
                 </div>
               </motion.div>
             </div>
           </Card>

           {/* Recent Activity Log */}
           <Card variant="stone" className="p-4">
             <h3 className="text-lg font-bold text-slate-300 mb-4 flex items-center gap-2">
               <Activity className="w-5 h-5" style={accentStyle} />
               Battle Logs
             </h3>
             <div className="space-y-3 max-h-48 overflow-y-auto pr-2 font-mono text-sm">
               <div className="flex justify-between text-slate-400 hover:bg-slate-800/50 p-2 rounded">
                 <span><span className="text-blue-400">@alex_swift</span> submitted solution for <span className="text-blue-500">Binary Search</span></span>
                 <span className="text-slate-600">2m ago</span>
               </div>
               <div className="flex justify-between text-slate-400 hover:bg-slate-800/50 p-2 rounded">
                 <span><span className="text-red-400">@rogue_jenkins</span> failed test case #4 on <span className="text-blue-500">API Integration</span></span>
                 <span className="text-slate-600">5m ago</span>
               </div>
               <div className="flex justify-between text-slate-400 hover:bg-slate-800/50 p-2 rounded">
                 <span><span className="text-purple-400">@sarah_node</span> achieved <span className="text-green-400">Perfect Score</span></span>
                 <span className="text-slate-600">12m ago</span>
               </div>
             </div>
           </Card>
         </div>

         {/* Candidate List */}
         <div className="col-span-4 space-y-4">
           <h3 className="text-xl font-serif font-bold text-slate-200 mb-2">Active Candidates</h3>
           {candidates.map((candidate, i) => (
             <motion.div 
               key={candidate.id}
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: i * 0.1 }}
             >
              <Card variant="parchment" className="p-4 hover:border-blue-500/50 cursor-pointer group">
                 <div className="flex items-center gap-4 mb-3">
                  <div className="w-10 h-10 rounded-full bg-blue-900/10 border border-blue-500/30 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-500" />
                   </div>
                   <div>
                    <div className="font-bold text-slate-800 group-hover:text-blue-600">{candidate.name}</div>
                     <div className="text-xs text-slate-500 font-mono">{candidate.role}</div>
                   </div>
                   <div className={`ml-auto px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                     candidate.status === 'Live Battle' ? 'bg-red-100 text-red-700 animate-pulse' :
                     candidate.status === 'Reviewing' ? 'bg-blue-100 text-blue-700' :
                     'bg-slate-200 text-slate-600'
                   }`}>
                     {candidate.status}
                   </div>
                 </div>
                 
                 <div className="space-y-2">
                   <div className="flex justify-between text-xs text-slate-600">
                     <span>Code Quality</span>
                     <span className="font-bold">{candidate.health}%</span>
                   </div>
                   <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-green-500 h-full" style={{ width: `${candidate.health}%` }} />
                   </div>

                   <div className="flex justify-between text-xs text-slate-600">
                     <span>Speed</span>
                     <span className="font-bold">{candidate.mana}%</span>
                   </div>
                   <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full" style={{ width: `${candidate.mana}%` }} />
                   </div>
                 </div>
               </Card>
             </motion.div>
           ))}
         </div>
       </div>
       <ScrollButton />
    </div>
  );
}
