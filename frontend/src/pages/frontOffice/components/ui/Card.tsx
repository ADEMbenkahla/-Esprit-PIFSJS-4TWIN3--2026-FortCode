import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'stone' | 'parchment' | 'glass' | 'neon';
  className?: string;
  children: React.ReactNode;
}

export function Card({ variant = 'stone', className, children, ...props }: CardProps) {
  const baseStyles = "rounded-lg relative border overflow-hidden transition-all duration-300";
  
  const variants = {
    stone: "bg-slate-900/90 border-slate-700 shadow-xl backdrop-blur-sm text-slate-200",
    parchment: "bg-amber-100/10 border-amber-900/30 shadow-lg text-amber-50 backdrop-blur-sm",
    glass: "bg-white/5 border-white/10 shadow-2xl backdrop-blur-md text-white",
    neon: "bg-blue-950/80 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)] text-blue-50",
  };

  return (
    <div className={twMerge(baseStyles, variants[variant], className)} {...props}>
      {children}
      {/* Decorative details */}
      {variant === 'stone' && (
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />
      )}
      {variant === 'neon' && (
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur opacity-30 animate-pulse" />
      )}
    </div>
  );
}

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={twMerge("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

export const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={twMerge(
      "text-2xl font-semibold leading-none tracking-tight text-slate-100",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={twMerge("text-sm text-slate-400", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={twMerge("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={twMerge("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"
