import React from 'react';

export const LogoIcon = React.memo(({ className = "w-8 h-8" }: { className?: string }) => (
  <svg 
    viewBox="0 0 100 100" 
    className={`${className} text-blue-500 fill-none stroke-current stroke-[6]`}
    style={{ filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))' }}
  >
    <path d="M20 30 L80 30 L90 70 L10 70 Z" strokeLinejoin="round" />
    <path d="M40 30 L40 70 M60 30 L60 70" strokeOpacity="0.3" />
  </svg>
));

export const OrionLogo = React.memo(({ className = "w-6 h-6" }: { className?: string }) => (
  <div className={`flex items-center gap-1.5 ${className}`}>
    <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(200,167,78,0.6)]" />
    <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(200,167,78,0.6)]" />
    <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(200,167,78,0.6)]" />
  </div>
));

export const SectionDivider = React.memo(() => (
  <div className="flex items-center justify-center py-12 opacity-20">
    <div className="h-[1px] flex-1 bg-border" />
    <div className="flex gap-2 mx-6">
      <div className="w-1 h-1 rounded-full bg-accent" />
      <div className="w-1 h-1 rounded-full bg-accent" />
      <div className="w-1 h-1 rounded-full bg-accent" />
    </div>
    <div className="h-[1px] flex-1 bg-border" />
  </div>
));
