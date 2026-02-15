import React from "react";
import { Link } from "react-router-dom";

export function Home() {
  return (
    <div className="min-h-[calc(100vh-5rem)] px-6 py-12 flex items-center justify-center">
      <div className="max-w-3xl w-full bg-slate-900/60 border border-slate-800 rounded-3xl p-10 shadow-[0_0_40px_rgba(15,23,42,0.6)]">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-300">FortCode Template</p>
        <h1 className="mt-4 text-4xl md:text-5xl font-serif text-slate-100">
          Command the realm, then step into the castle.
        </h1>
        <p className="mt-4 text-slate-300 text-lg">
          This is the Vite app template area. Use it for onboarding, stats, or a hub
          before launching the Unity castle experience.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            to="/castle"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-amber-500 text-slate-950 font-semibold shadow-[0_0_15px_rgba(251,191,36,0.5)] hover:bg-amber-400 transition-colors"
          >
            Enter Castle
          </Link>
          <Link
            to="/level/1"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors"
          >
            View a Challenge
          </Link>
        </div>
      </div>
    </div>
  );
}
