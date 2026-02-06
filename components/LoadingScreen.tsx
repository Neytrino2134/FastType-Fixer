
import React from 'react';
import { Sparkles } from 'lucide-react';

interface LoadingScreenProps {
  isExiting?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ isExiting = false }) => {
  return (
    <div 
      className={`
        fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-950 text-slate-200 h-screen w-screen titlebar-drag-region
        transition-all duration-1000 ease-[cubic-bezier(0.2,0.8,0.2,1)]
        ${isExiting ? 'opacity-0 scale-110 blur-xl pointer-events-none' : 'opacity-100 scale-100 blur-0'}
      `}
    >
      <div className="relative mb-8">
        {/* Pulsing background effect */}
        <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 animate-pulse rounded-full"></div>
        
        {/* Logo Container */}
        <div className="relative bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-2xl shadow-indigo-900/20">
          <Sparkles className="w-12 h-12 text-indigo-400 animate-pulse" />
        </div>
      </div>

      <div className="text-center space-y-3">
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
          FastType AI
        </h1>
        <div className="flex items-center gap-2 justify-center">
          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
        </div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-widest pt-2">
          Загрузка системы...
        </p>
      </div>
    </div>
  );
};
