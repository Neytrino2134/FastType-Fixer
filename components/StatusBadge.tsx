

import React from 'react';
import { Loader2, Zap, Brain, CheckCircle2, PencilLine, Sparkles, Mic, Waves, PauseCircle } from 'lucide-react';
import { ProcessingStatus, Language } from '../types';
import { getTranslation } from '../utils/i18n';

interface StatusBadgeProps {
  status: ProcessingStatus;
  language: Language;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, language }) => {
  const t = getTranslation(language);

  const getStatusConfig = () => {
    switch (status) {
      case 'typing':
        return {
          icon: <PencilLine className="w-4 h-4 text-slate-400" />,
          text: t.statusTyping,
          color: 'bg-slate-800 text-slate-300 border-slate-700'
        };
      case 'thinking':
        return {
          icon: <Brain className="w-4 h-4 text-amber-400 animate-pulse" />,
          text: t.statusThinking,
          color: 'bg-amber-950/30 text-amber-200 border-amber-900/50'
        };
      case 'grammar_check': // New Badge
        return {
          icon: <Zap className="w-4 h-4 text-orange-400 animate-pulse" />, // Changed to Zap (Lightning)
          text: t.statusGrammar || "AI Error Check",
          color: 'bg-orange-950/30 text-orange-200 border-orange-900/50'
        };
      case 'correcting':
        return {
          icon: <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />,
          text: t.statusCorrecting,
          color: 'bg-blue-950/30 text-blue-200 border-blue-900/50'
        };
      case 'enhancing':
        return {
          icon: <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />,
          text: t.statusEnhancing,
          color: 'bg-purple-950/30 text-purple-200 border-purple-900/50'
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
            icon: <PauseCircle className="w-4 h-4 text-amber-400" />,
            text: t.statusPaused,
            color: 'bg-amber-950/20 text-amber-200 border-amber-900/50'
        };
      default:
        return {
          icon: <Zap className="w-4 h-4 text-slate-500" />,
          text: t.statusIdle,
          color: 'bg-slate-900 text-slate-500 border-slate-800'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all duration-300 ${config.color}`}>
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
};