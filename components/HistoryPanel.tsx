
import React, { useState, useEffect } from 'react';
import { HistorySnapshot, Language } from '../types';
import { getTranslation } from '../utils/i18n';
import { RotateCcw, X, Clock, ChevronsRight, Mic, Sparkles, CheckCheck, Keyboard, Brain, Wand2, History, Trash2 } from 'lucide-react';

interface HistoryPanelProps {
  history: HistorySnapshot[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onRestore: (index: number) => void;
  onClear: () => void; // NEW
  language: Language;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  currentIndex,
  isOpen,
  onClose,
  onRestore,
  onClear,
  language
}) => {
  const t = getTranslation(language);
  const [isReady, setIsReady] = useState(false); // To prevent slide-out animation on mount

  // Prevent transition on initial mount
  useEffect(() => {
     const timer = setTimeout(() => setIsReady(true), 100);
     return () => clearTimeout(timer);
  }, []);

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(timestamp));
  };

  const getTagBadge = (tag: string) => {
    switch(tag) {
        case 'raw_dictation':
            return (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-orange-900/40 text-orange-300 text-[10px] font-semibold border border-orange-700/50 shadow-sm" title={t.tagRawDictation || "Raw Dictation"}>
                    <Mic className="w-3 h-3" />
                    <span className="hidden sm:inline">{t.tagRawDictation || "Raw Dictation"}</span>
                </span>
            );
        case 'pre_ai':
             return (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-700 text-slate-200 text-[10px] font-semibold border border-slate-600 shadow-sm" title="Snapshot before AI processing">
                    <History className="w-3 h-3" />
                    <span className="hidden sm:inline">Before AI</span>
                </span>
            );
        case 'ai_corrected':
            return (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-purple-900/40 text-purple-300 text-[10px] font-semibold border border-purple-700/50 shadow-sm" title={t.tagAiCorrected || "AI Corrected"}>
                    <Wand2 className="w-3 h-3" />
                    <span className="hidden sm:inline">{t.tagAiCorrected || "AI Corrected"}</span>
                </span>
            );
        case 'raw':
            return (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-700/50 text-slate-300 text-[9px] border border-slate-600/50" title={t.tagRaw}>
                    <Keyboard className="w-2.5 h-2.5" />
                    <span className="hidden sm:inline">{t.tagRaw}</span>
                </span>
            );
        case 'dictated':
            // Only show if raw_dictation isn't present to avoid duplicates if legacy data exists
            return (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-red-900/30 text-red-300 text-[9px] border border-red-800/50" title={t.tagDictated}>
                    <Mic className="w-2.5 h-2.5" />
                    <span className="hidden sm:inline">{t.tagDictated}</span>
                </span>
            );
        case 'processed':
            return (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-900/30 text-amber-300 text-[9px] border border-amber-800/50" title={t.tagProcessed}>
                    <Sparkles className="w-2.5 h-2.5" />
                    <span className="hidden sm:inline">{t.tagProcessed}</span>
                </span>
            );
        case 'finalized':
             return (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-900/30 text-emerald-300 text-[9px] border border-emerald-800/50" title={t.tagFinalized}>
                    <CheckCheck className="w-2.5 h-2.5" />
                    <span className="hidden sm:inline">{t.tagFinalized}</span>
                </span>
            );
        case 'enhanced':
             return (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-pink-900/30 text-pink-300 text-[9px] border border-pink-800/50" title={t.tagEnhanced}>
                    <Sparkles className="w-2.5 h-2.5" />
                    <span className="hidden sm:inline">{t.tagEnhanced}</span>
                </span>
            );
        case 'reset':
             return (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[9px] border border-slate-700 font-mono">
                    <Trash2 className="w-2.5 h-2.5" />
                    <span className="hidden sm:inline">Reset</span>
                </span>
            );
        default:
            return null;
    }
  };

  // Clone and reverse to show newest first
  const displayHistory = [...history].map((item, idx) => ({ item, idx })).reverse();

  return (
    <div 
        className={`
            absolute top-0 right-0 w-80 h-full bg-slate-900 border-l border-slate-800 shadow-2xl z-40 
            flex flex-col no-drag
            ${isReady ? 'transition-transform duration-300 ease-in-out' : ''} 
            ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
    >
      
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
           <Clock className="w-4 h-4 text-indigo-400" />
           <h3 className="text-sm font-semibold text-slate-200">{t.historyTitle}</h3>
        </div>
        
        <div className="flex items-center gap-1">
             <button onClick={onClear} className="p-1.5 hover:bg-slate-800 rounded text-slate-500 hover:text-red-400 transition-colors" title={t.clipboardClear || "Clear History"}>
                <Trash2 className="w-4 h-4" />
             </button>
             <div className="w-px h-4 bg-slate-800 mx-1"></div>
             <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
             </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        {history.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-48 text-slate-600 space-y-2">
             <Clock className="w-8 h-8 opacity-50" />
             <p className="text-xs">{t.historyEmpty}</p>
           </div>
        ) : (
          displayHistory.map(({ item, idx }) => {
            const isCurrent = idx === currentIndex;
            // Differentiate background based on main tag if available
            const isRawDictation = item.tags?.includes('raw_dictation');
            const isAiCorrected = item.tags?.includes('ai_corrected');
            const isPreAi = item.tags?.includes('pre_ai');

            let borderColor = 'border-slate-700/50';
            if (isRawDictation) borderColor = 'border-orange-900/50';
            if (isAiCorrected) borderColor = 'border-purple-900/50';
            if (isPreAi) borderColor = 'border-slate-600/80';
            if (isCurrent) borderColor = 'border-indigo-500/50';

            return (
                <div 
                    key={item.id} 
                    onClick={() => !isCurrent && onRestore(idx)}
                    className={`
                        group relative rounded-lg p-3 transition-all border
                        ${borderColor}
                        ${isCurrent 
                            ? 'bg-indigo-900/20 cursor-default' 
                            : 'bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600 cursor-pointer'
                        }
                    `}
                >
                  <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] text-slate-500 font-mono">{formatDate(item.timestamp)}</span>
                          {/* Tags Display */}
                          {item.tags && item.tags.length > 0 && (
                             <div className="flex gap-1 flex-wrap">
                                {item.tags.map(tag => (
                                    <React.Fragment key={tag}>
                                        {getTagBadge(tag)}
                                    </React.Fragment>
                                ))}
                             </div>
                          )}
                      </div>
                  </div>
                  
                  <p className={`text-xs line-clamp-3 font-medium break-all opacity-90 group-hover:opacity-100 ${
                      isRawDictation ? 'text-orange-200' : 
                      isAiCorrected ? 'text-purple-200' : 'text-slate-300'
                  }`}>
                    {item.text || <span className="text-slate-600 italic">Empty</span>}
                  </p>

                  {!isCurrent && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="p-1.5 bg-indigo-600 text-white rounded-md shadow-lg">
                             <RotateCcw className="w-3.5 h-3.5" />
                         </div>
                      </div>
                  )}

                  {isCurrent && (
                      <div className="absolute top-2 right-2">
                          <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 bg-indigo-900/30 px-1.5 py-0.5 rounded">
                              <ChevronsRight className="w-3 h-3" />
                              <span className="hidden sm:inline">{t.historyCurrent}</span>
                          </span>
                      </div>
                  )}
                </div>
            );
          })
        )}
      </div>
    </div>
  );
};
