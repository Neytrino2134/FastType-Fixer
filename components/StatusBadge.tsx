
import React from 'react';
import { Loader2, Zap, Brain, CheckCircle2, PencilLine, Sparkles, Mic, Waves, PauseCircle, BookOpen, AlertTriangle, ShieldCheck, Wand2, Volume2 } from 'lucide-react';
import { ProcessingStatus, Language } from '../types';
import { getTranslation } from '../utils/i18n';

interface StatusBadgeProps {
  status: ProcessingStatus;
  language: Language;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, language }) => {
  const t = getTranslation(language);

  // Определяем, какие статусы должны быть полноценными плашками (с текстом и фоном)
  // Остальные будут отображаться как отдельные иконки
  const isFullBadge = [
    'ai_fixing', 
    'ai_finalizing', 
    'enhancing', 
    'transcribing', 
    'recording', 
    'done', 
    'error',
    'script_fix',
    'dict_check',
    'speaking' // Added
  ].includes(status);

  const getStatusConfig = () => {
    switch (status) {
      case 'typing':
        return {
          icon: <PencilLine className="w-4 h-4 text-slate-500 animate-pulse" />,
          text: t.statusTyping,
          color: 'bg-transparent border-transparent text-slate-500' // Icon style
        };
      case 'dict_check':
        return {
          icon: <BookOpen className="w-4 h-4 text-yellow-400 animate-bounce" />, // Yellow
          text: t.statusDictCheck || "Dict Check",
          color: 'bg-yellow-950/30 text-yellow-200 border-yellow-900/50' // Yellow Badge
        };
      case 'ai_fixing':
        return {
          icon: <Brain className="w-4 h-4 text-purple-400 animate-pulse" />,
          text: t.statusAiFixing || "AI Fixing",
          color: 'bg-purple-950/30 text-purple-200 border-purple-900/50'
        };
      case 'ai_finalizing':
        return {
          icon: <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />,
          text: t.statusAiFinalizing || "Finalizing",
          color: 'bg-emerald-950/30 text-emerald-200 border-emerald-900/50'
        };
      case 'script_fix':
        return {
            icon: <Wand2 className="w-4 h-4 text-blue-400 animate-pulse" />,
            text: t.statusScriptFix || "Auto-Format",
            color: 'bg-blue-950/30 text-blue-200 border-blue-900/50'
        };
      case 'enhancing':
        return {
            icon: <Sparkles className="w-4 h-4 text-purple-400 animate-spin" />,
            text: t.statusEnhancing || "Enhancing...",
            color: 'bg-purple-950/30 text-purple-200 border-purple-900/50'
        };
      case 'speaking':
        return {
            icon: <Volume2 className="w-4 h-4 text-purple-400 animate-pulse" />,
            text: language === 'ru' ? "Озвучивание..." : "Generating...",
            color: 'bg-purple-950/40 text-purple-300 border-purple-800/50'
        };
      case 'recording':
        return {
          icon: <Mic className="w-4 h-4 text-red-400 animate-pulse" />,
          text: t.statusRecording,
          color: 'bg-red-950/30 text-red-200 border-red-900/50'
        };
      case 'transcribing':
        return {
          icon: <Waves className="w-4 h-4 text-sky-400 animate-bounce" />,
          text: t.statusTranscribing,
          color: 'bg-sky-950/30 text-sky-200 border-sky-900/50'
        };
      case 'done':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
          text: t.statusDone,
          color: 'bg-emerald-950/30 text-emerald-200 border-emerald-900/50'
        };
      case 'paused':
        return {
            icon: <PauseCircle className="w-4 h-4 text-slate-600" />,
            text: t.statusPaused,
            color: 'bg-transparent border-transparent text-slate-600' // Icon style
        };
      case 'error':
        return {
            icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
            text: t.statusError || "Error",
            color: 'bg-red-950/40 text-red-300 border-red-800'
        };
      default:
        // Default verification state (Idle)
        return {
          icon: <ShieldCheck className="w-4 h-4 text-slate-700" />,
          text: t.statusIdle,
          color: 'bg-transparent border-transparent text-slate-700' // Icon style
        };
    }
  };

  const config = getStatusConfig();

  return (
    <>
      <style>{`
        @keyframes slideUpFade {
          0% { transform: translateY(100%); opacity: 0; filter: blur(2px); }
          100% { transform: translateY(0); opacity: 1; filter: blur(0); }
        }
      `}</style>
      
      <div 
          title={!isFullBadge ? config.text : undefined} // Tooltip for icon-only modes
          className={`
            relative overflow-hidden flex items-center justify-center 
            h-8 rounded-full border text-sm font-medium 
            transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] 
            ${config.color}
            ${isFullBadge ? 'px-4 min-w-[140px] shadow-sm' : 'w-8 px-0 shadow-none'}
          `}
      >
        <div 
          key={status} 
          className="flex items-center gap-2 w-full justify-center absolute inset-0"
          style={{ animation: 'slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
        >
          <span className="shrink-0 flex items-center justify-center">{config.icon}</span>
          {isFullBadge && (
            <span className="truncate">{config.text}</span>
          )}
        </div>
      </div>
    </>
  );
};
