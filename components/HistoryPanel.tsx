
import React from 'react';
import { HistorySnapshot, Language } from '../types';
import { getTranslation } from '../utils/i18n';
import { RotateCcw, X, Clock, ChevronsRight, Mic, Sparkles, CheckCheck, Keyboard } from 'lucide-react';

interface HistoryPanelProps {
  history: HistorySnapshot[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onRestore: (index: number) => void;
  language: Language;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  currentIndex,
  isOpen,
  onClose,
  onRestore,
  language
}) => {
  const t = getTranslation(language);

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(timestamp));
  };

  const getTagBadge = (tag: string) => {
    switch(tag) {
        case 'raw':
            return (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-700/50 text-slate-300 text-[9px] border border-slate-600/50" title={t.tagRaw}>
                    <Keyboard className="w-2.5 h-2.5" />
                    <span className="hidden sm:inline">{t.tagRaw}</span>
                </span>
            );
        case 'dictated':
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
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-purple-900/30 text-purple-300 text-[9px] border border-purple-800/50" title={t.tagEnhanced}>
                    <Sparkles className="w-2.5 h-2.5" />
                    <span className="hidden sm:inline">{t.tagEnhanced}</span>
                </span>
            );
        default:
            return null;
    }
  };

  if (!isOpen) return null;

  // Clone and reverse to show newest first
  const displayHistory = [...history].map((item, idx) => ({ item, idx })).reverse();

  return (
    <div className="absolute top-0 right-0 w-80 h-full bg-slate-900 border-l border-slate-800 shadow-2xl z-40 transform transition-transform duration-300 flex flex-col no-drag animate-in slide-in-from-right">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
           <Clock className="w-4 h-4 text-indigo-400" />
           <h3 className="text-sm font-semibold text-slate-200">{t.historyTitle}</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
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
            
            return (
                <div 
                    key={item.id} 
                    onClick={() => !isCurrent && onRestore(idx)}
                    className={`
                        group relative rounded-lg p-3 transition-all border
                        ${isCurrent 
                            ? 'bg-indigo-900/20 border-indigo-500/50 cursor-default' 
                            : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 cursor-pointer'
                        }
                    `}
                >
                  <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
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

                      {isCurrent && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 bg-indigo-900/30 px-1.5 py-0.5 rounded">
                              <ChevronsRight className="w-3 h-3" />
                              <span className="hidden sm:inline">{t.historyCurrent}</span>
                          </span>
                      )}
                  </div>
                  
                  <p className="text-xs text-slate-300 line-clamp-3 font-medium break-all opacity-80 group-hover:opacity-100">
                    {item.text || <span className="text-slate-600 italic">Empty</span>}
                  </p>

                  {!isCurrent && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="p-1.5 bg-indigo-600 text-white rounded-md shadow-lg">
                             <RotateCcw className="w-3.5 h-3.5" />
                         </div>
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
