
import React from 'react';
import { Lock, CheckCheck, Undo2, Redo2, Square, Mic, Wand2, Timer, Loader2, Clock } from 'lucide-react';
import { getTranslation } from '../../utils/i18n';
import { Language, ProcessingStatus } from '../../types';
import { Tooltip } from '../Tooltip';

interface EditorToolbarProps {
  textLength: number;
  committedLength: number;
  processedLength: number;
  status: ProcessingStatus;
  language: Language;
  isBusy: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onRecord: () => void;
  onEnhance: () => void;
  autoStopCountdown?: number | null;
  onHistoryClick: () => void;
  isHistoryOpen: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  textLength,
  committedLength,
  processedLength,
  status,
  language,
  isBusy,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onRecord,
  onEnhance,
  autoStopCountdown,
  onHistoryClick,
  isHistoryOpen
}) => {
  const t = getTranslation(language);

  const isEnhancing = status === 'enhancing';

  return (
    <div className="absolute bottom-0 md:bottom-6 left-0 md:left-auto md:right-6 w-full md:w-auto flex md:inline-flex items-center justify-between md:justify-start gap-3 md:gap-4 z-30 pointer-events-auto select-none bg-slate-900/90 md:bg-transparent backdrop-blur-lg md:backdrop-blur-none border-t md:border-none border-slate-800 p-3 md:p-0 safe-area-bottom">
      
      {/* LEFT GROUP ON MOBILE (Stats) */}
      <div className="flex items-center gap-3">
          {/* Auto-Stop Countdown Badge */}
          {status === 'recording' && autoStopCountdown !== null && autoStopCountdown !== undefined && autoStopCountdown <= 5 && (
            <div className="animate-in fade-in zoom-in duration-200 flex items-center gap-2 px-3 py-2 bg-emerald-950/80 border border-emerald-500/50 rounded-lg shadow-xl shadow-emerald-900/20 backdrop-blur-md">
                <Timer className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="text-sm font-bold text-emerald-200 tabular-nums">
                    {autoStopCountdown}s
                </span>
            </div>
          )}

          {/* Status Indicators (Hidden on small mobile) */}
          <div className="hidden sm:flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-950/30 rounded border border-emerald-900/50">
                  <Lock className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] text-emerald-400 font-mono">
                      {Math.round((committedLength / (textLength || 1)) * 100)}%
                  </span>
              </div>
              
              {processedLength > committedLength && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-sky-950/30 rounded border border-sky-900/50 animate-in fade-in zoom-in duration-300">
                      <CheckCheck className="w-3 h-3 text-sky-400" />
                      <span className="text-[10px] text-sky-400 font-mono">
                          {processedLength - committedLength}
                      </span>
                  </div>
              )}
          </div>

          <span className="text-xs text-slate-600 font-mono md:hidden">
            {textLength} {t.chars}
          </span>
      </div>

      <div className="hidden md:block text-xs text-slate-600 font-mono">
        {textLength} {t.chars}
      </div>

      {/* RIGHT GROUP (Controls) */}
      <div className="flex items-center gap-3">
        {/* HISTORY / UNDO / REDO CONTROLS */}
        <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700 shadow-lg">
            <Tooltip content={t.btnUndo} side="top">
                <button
                    onClick={onUndo}
                    disabled={!canUndo || isBusy}
                    className="p-2 md:p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors touch-manipulation"
                >
                    <Undo2 className="w-5 h-5 md:w-4 md:h-4" />
                </button>
            </Tooltip>
            
            <div className="w-px h-5 md:h-4 bg-slate-700 mx-1" />
            
            <Tooltip content={t.btnRedo} side="top">
                <button
                    onClick={onRedo}
                    disabled={!canRedo || isBusy}
                    className="p-2 md:p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors touch-manipulation"
                >
                    <Redo2 className="w-5 h-5 md:w-4 md:h-4" />
                </button>
            </Tooltip>

            <div className="w-px h-5 md:h-4 bg-slate-700 mx-1" />

            <Tooltip content={t.historyTitle} side="top">
                <button
                    onClick={onHistoryClick}
                    className={`p-2 md:p-1.5 rounded transition-colors touch-manipulation ${isHistoryOpen ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                >
                    <Clock className="w-5 h-5 md:w-4 md:h-4" />
                </button>
            </Tooltip>
        </div>

        <Tooltip content={status === 'recording' ? t.btnStop : t.btnRecord} side="top">
            <button
            onClick={onRecord}
            disabled={isBusy && status !== 'recording'}
            className={`flex items-center gap-2 px-4 md:px-4 py-2.5 md:py-2 rounded-lg text-sm font-medium shadow-lg transition-all active:scale-95 group border touch-manipulation ${
                status === 'recording' 
                ? 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30 animate-pulse' 
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            >
            {status === 'recording' ? (
                <>
                <Square className="w-5 h-5 md:w-4 md:h-4 fill-current" />
                <span className="hidden sm:inline">{t.btnStop}</span>
                </>
            ) : (
                <>
                <Mic className="w-5 h-5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">{t.btnRecord}</span>
                </>
            )}
            </button>
        </Tooltip>

        <Tooltip content={t.btnEnhance} side="left">
            <button
            onClick={onEnhance}
            disabled={isBusy}
            className={`flex items-center gap-2 px-4 md:px-4 py-2.5 md:py-2 rounded-lg text-sm font-medium shadow-lg transition-all active:scale-95 group touch-manipulation
                ${isEnhancing 
                    ? 'bg-indigo-600 text-white cursor-wait opacity-80' 
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-purple-600 hover:text-white hover:border-purple-500 hover:shadow-purple-900/30'
                }
            `}
            >
            {isEnhancing ? (
                <Loader2 className="w-5 h-5 md:w-4 md:h-4 animate-spin" />
            ) : (
                <Wand2 className="w-5 h-5 md:w-4 md:h-4 group-hover:rotate-12 transition-transform" />
            )}
            <span className="hidden sm:inline">{t.btnEnhance}</span>
            </button>
        </Tooltip>
      </div>
    </div>
  );
};
