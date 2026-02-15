import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, RotateCcw, Save, Shield, Swords, Zap, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export default function BattleArena() {
  const [code, setCode] = useState('// Write your champion code here\nfunction battle(enemy) {\n  return enemy.health > 0 ? "attack" : "defend";\n}');
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = () => {
    setIsRunning(true);
    setOutput('Compiling spell...');
    setTimeout(() => {
      setOutput('Spell cast successfully!\n> Enemy took 50 damage.\n> Enemy defeated.\n> VICTORY!');
      setIsRunning(false);
    }, 1500);
  };

  return (
    <div className="h-screen flex flex-col pt-16 bg-slate-950 overflow-hidden">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-900/20 border border-red-500/30 flex items-center justify-center">
            <Swords className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-lg text-slate-100">Boss Battle: The Recursion Golem</h1>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Live Combat
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Save className="w-4 h-4" />}>Save Spell</Button>
          <Button 
            variant="primary" 
            size="sm" 
            icon={isRunning ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            onClick={handleRun}
            disabled={isRunning}
          >
            {isRunning ? 'Casting...' : 'Cast Spell'}
          </Button>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-12 gap-1 p-1 overflow-hidden">
        
        {/* Left Panel: The Enemy & Instructions */}
        <div className="col-span-3 bg-slate-900/50 border-r border-slate-800 flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-slate-800">
            <h2 className="font-serif font-bold text-slate-300 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-400" />
              Enemy Stats
            </h2>
            <Card variant="stone" className="p-4 bg-slate-800/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-400">Health</span>
                <span className="text-sm font-mono text-red-400">100/100 HP</span>
              </div>
              <div className="w-full bg-slate-700 h-2 rounded-full mb-4 overflow-hidden">
                <div className="bg-red-500 h-full w-full" />
              </div>
              
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-400">Armor</span>
                <span className="text-sm font-mono text-blue-400">50 DEF</span>
              </div>
              <div className="w-full bg-slate-700 h-2 rounded-full mb-4 overflow-hidden">
                <div className="bg-blue-500 h-full w-1/2" />
              </div>

              <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="text-xs text-slate-500 italic">"The Golem is weak against recursive attacks. Use a base case to break its shield."</p>
              </div>
            </Card>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="font-bold text-slate-200 mb-2">Mission Objectives</h3>
            <ul className="space-y-2 text-sm text-slate-400 list-disc pl-4">
              <li>Defeat the Golem using recursion.</li>
              <li>Ensure your function has a base case.</li>
              <li>Do not use loops (for/while).</li>
              <li>Return "attack" to deal damage.</li>
            </ul>
          </div>
        </div>

        {/* Center Panel: Code Editor (The Codex) */}
        <div className="col-span-6 bg-slate-950 flex flex-col relative">
           {/* Editor Tabs */}
           <div className="flex border-b border-slate-800 bg-slate-900">
             <div className="px-4 py-2 bg-slate-950 border-t-2 border-blue-500 text-slate-200 text-sm font-mono border-r border-slate-800 flex items-center gap-2">
               <span className="text-blue-400">JS</span>
               champion.js
             </div>
             <div className="px-4 py-2 text-slate-500 text-sm font-mono border-r border-slate-800 hover:bg-slate-900 cursor-pointer">
               styles.css
             </div>
           </div>

           {/* Editor Area */}
           <div className="flex-1 relative">
             <div className="absolute left-0 top-0 bottom-0 w-12 bg-slate-900 border-r border-slate-800 flex flex-col items-end py-4 pr-2 text-slate-600 font-mono text-sm select-none">
               {code.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
             </div>
             <textarea
               value={code}
               onChange={(e) => setCode(e.target.value)}
               className="absolute left-12 top-0 right-0 bottom-0 bg-transparent text-slate-300 font-mono text-sm p-4 resize-none focus:outline-none leading-6 selection:bg-blue-500/30"
               spellCheck={false}
             />
           </div>
        </div>

        {/* Right Panel: Output & AI Mentor */}
        <div className="col-span-3 bg-slate-900/50 border-l border-slate-800 flex flex-col">
          {/* Output Terminal */}
          <div className="h-1/2 flex flex-col border-b border-slate-800">
            <div className="p-2 bg-slate-900 text-xs font-mono text-slate-400 border-b border-slate-800 flex justify-between">
              <span>BATTLE LOG</span>
              <span className="text-green-500">CONNECTED</span>
            </div>
            <div className="flex-1 p-4 font-mono text-sm overflow-y-auto bg-slate-950">
              {output ? (
                <div className="text-green-400 whitespace-pre-wrap animate-pulse">{output}</div>
              ) : (
                <div className="text-slate-600 italic">Waiting for spell cast...</div>
              )}
            </div>
          </div>

          {/* AI Mentor */}
          <div className="flex-1 flex flex-col bg-slate-900/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1768527858342-f76d568f1915?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMG5lb24lMjBncmlkJTIwYmx1ZXxlbnwxfHx8fDE3NzA5NzkzOTh8MA&ixlib=rb-4.1.0&q=80&w=1080')] opacity-10 bg-cover bg-center pointer-events-none" />
            
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-serif font-bold text-purple-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                AI Mentor
              </h3>
            </div>
            
            <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-purple-900/20 border-2 border-purple-500/50 mb-4 flex items-center justify-center animate-bounce">
                <Zap className="w-8 h-8 text-purple-400" />
              </div>
              <p className="text-sm text-slate-300">
                "I sense hesitation, Champion. Remember, a recursive function calls itself until a base condition is met."
              </p>
              <Button variant="ghost" size="sm" className="mt-4 text-purple-300 border-purple-500/30 hover:bg-purple-900/20">
                Ask for Hint
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
