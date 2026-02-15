import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export function Button({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  icon, 
  children, 
  ...props 
}: ButtonProps) {
  
  const baseStyles = "relative inline-flex items-center justify-center gap-2 font-serif font-bold uppercase tracking-wider transition-all duration-300 border-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden";
  
  const variants = {
    primary: "bg-blue-900/80 border-blue-500/50 text-blue-100 hover:bg-blue-800 hover:border-blue-400 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)]",
    secondary: "bg-slate-800/80 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500",
    danger: "bg-red-900/80 border-red-500/50 text-red-100 hover:bg-red-800 hover:border-red-400 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]",
    ghost: "bg-transparent border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/50",
    gold: "bg-amber-900/80 border-amber-500/50 text-amber-100 hover:bg-amber-800 hover:border-amber-400 hover:shadow-[0_0_15px_rgba(251,191,36,0.5)] shadow-[0_0_10px_rgba(251,191,36,0.2)]",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs border-[1px]",
    md: "px-6 py-2.5 text-sm",
    lg: "px-8 py-4 text-base",
  };

  return (
    <button 
      className={twMerge(baseStyles, variants[variant], sizes[size], className)} 
      {...props}
    >
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full hover:animate-[shimmer_1.5s_infinite]" />
      
      {icon && <span className="w-4 h-4">{icon}</span>}
      <span className="relative z-10">{children}</span>
      
      {/* Corner Accents for Tech/Medieval feel */}
      <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-current opacity-50" />
      <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-current opacity-50" />
    </button>
  );
}
