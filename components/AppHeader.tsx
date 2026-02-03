

import React from 'react';
import { Eraser, Pause, Play, ClipboardList, Settings, Minus, Square, X, Home, HelpCircle, RotateCcw, MessageSquare, PenTool, Zap } from 'lucide-react';
import { Language, ProcessingStatus, CorrectionSettings, Tab } from '../types';
import { StatusBadge } from './StatusBadge';
import { getTranslation } from '../utils/i18n';
import { Tooltip } from './Tooltip';
import { APP_VERSION } from '../utils/versionInfo';

interface AppHeaderProps {
  language: Language;
  status: ProcessingStatus;
  isGrammarChecking: boolean;
  stats: { corrections: number };
  settings: CorrectionSettings;
  showClipboard: boolean;
  showSettings: boolean;
  showHistory: boolean;
  currentTab: Tab;
  setCurrentTab: (tab: Tab) => void;
  onToggleLanguage: () => void;
  onTogglePause: () => void;
  onToggleClipboard: () => void;
  onToggleSettings: () => void;
  onToggleHistory: () => void;
  onToggleHelp: () => void;
  onGoHome: () => void;
  onWindowControl: (action: 'minimize' | 'maximize' | 'close') => void;
  onResetProcessor: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  language,
  status,
  isGrammarChecking,
  stats,
  settings,
  showClipboard,
  showSettings,
  currentTab,
  setCurrentTab,
  onToggleLanguage,
  onTogglePause,
  onToggleClipboard,
  onToggleSettings,
  onToggleHelp,
  onGoHome,
  onWindowControl,
  onResetProcessor
}) => {
  const t = getTranslation(language);

  return (
    <header className="titlebar-drag-region bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between shrink-0 z-50 relative select-none">
      
      {/* LEFT SIDE: Tabs & Editor Controls */}
      <div className="flex items-center gap-4">
         {/* TABS CONTROLLER */}
         <div className="no-drag flex p-1 bg-slate-950 rounded-lg border border-slate-800">
             <button
                onClick={() => setCurrentTab('editor')}
                className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    currentTab === 'editor' 
                    ? 'bg-slate-800 text-white shadow' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
             >
                 <PenTool className="w-3 h-3" />
                 <span>Editor</span>
             </button>
             <button
                onClick={() => setCurrentTab('chat')}
                className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    currentTab === 'chat' 
                    ? 'bg-indigo-600 text-white shadow' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
             >
                 <MessageSquare className="w-3 h-3" />
                 <span>Chat</span>
             </button>
         </div>

        {currentTab === 'editor' && (
            <div className="hidden md:flex no-drag items-center gap-1 animate-in fade-in slide-in-from-left-4 ml-2">
            
            {/* 1. Reset Button (Transparent) */}
            <Tooltip content={language === 'ru' ? "Сброс проверки" : "Reset checks"} side="bottom">
                <button
                    onClick={onResetProcessor}
                    className="p-2 rounded-full text-slate-500 hover:text-white hover:bg-slate-800 transition-all cursor-pointer group"
                >
                    <RotateCcw className="w-4 h-4 group-hover:-rotate-90 transition-transform duration-300" />
                </button>
            </Tooltip>

            {/* 2. Pause Button (Transparent) */}
            <Tooltip content={settings.enabled ? t.btnPause : t.btnResume} side="bottom">
                <button
                    onClick={onTogglePause}
                    className={`p-2 rounded-full transition-all cursor-pointer hover:bg-slate-800 ${
                    settings.enabled
                        ? 'text-slate-500 hover:text-white'
                        : 'text-amber-400 hover:text-amber-300'
                    }`}
                >
                    {settings.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
            </Tooltip>

            {/* Divider */}
            <div className="w-px h-4 bg-slate-800 mx-2" />

            {/* 3. Grammar/Check Icon (Left of Status Badge) */}
            <Tooltip content={t.statusGrammar || "AI Error Check"} side="bottom">
              <div 
                className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-300 mr-2 ${
                  isGrammarChecking 
                    ? 'bg-orange-950/30 border-orange-500/50 text-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.2)]' 
                    : 'bg-slate-800 border-slate-700 text-slate-600'
                }`}
              >
                 <Zap className={`w-4 h-4 ${isGrammarChecking ? 'animate-pulse' : ''}`} />
              </div>
            </Tooltip>
            
            {/* 4. Main Status Badge */}
            <StatusBadge status={status} language={language} />

            </div>
        )}
      </div>

      {/* RIGHT SIDE Controls */}
      <div className="flex items-center gap-3 no-drag z-50 relative">
         
         {/* Navigation Group */}
         <div className="flex items-center gap-1 bg-slate-800/30 p-1 rounded-lg border border-slate-800/50">
            <Tooltip content={t.tooltipHome} side="bottom">
               <button onClick={onGoHome} className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer">
                 <Home className="w-4 h-4" />
               </button>
            </Tooltip>

            <Tooltip content={t.tooltipHelp} side="bottom">
               <button onClick={onToggleHelp} className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer">
                 <HelpCircle className="w-4 h-4" />
               </button>
            </Tooltip>

            {currentTab === 'editor' && (
                <Tooltip content={t.clipboardTitle} side="bottom">
                <button onClick={onToggleClipboard} className={`p-1.5 rounded-md transition-colors cursor-pointer ${showClipboard ? 'bg-indigo-900/30 text-indigo-400' : 'hover:bg-slate-800 text-slate-400'}`}>
                    <ClipboardList className="w-4 h-4" />
                </button>
                </Tooltip>
            )}

            <Tooltip content={t.tooltipSettings} side="bottom">
              <button onClick={onToggleSettings} className={`p-1.5 rounded-md transition-colors cursor-pointer ${showSettings ? 'bg-indigo-900/30 text-indigo-400' : 'hover:bg-slate-800 text-slate-400'}`}>
                <Settings className="w-4 h-4" />
              </button>
            </Tooltip>
         </div>

         <div className="h-5 w-px bg-slate-800 mx-1"></div>

         {/* Language & Stats */}
         <div className="flex items-center gap-2">
            <Tooltip content={t.tooltipLang} side="bottom">
              <button onClick={onToggleLanguage} className="px-2 py-1 rounded bg-slate-800 text-[10px] font-bold text-slate-400 hover:text-white border border-slate-700 transition-colors uppercase cursor-pointer min-w-[32px]">
                {language}
              </button>
            </Tooltip>

            {currentTab === 'editor' && (
                <Tooltip content={t.tooltipStats} side="bottom">
                <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-md text-xs font-semibold text-slate-400 border border-slate-700 select-none">
                    <Eraser className="w-3 h-3" />
                    <span>{stats.corrections}</span>
                </div>
                </Tooltip>
            )}
         </div>

         <div className="h-5 w-px bg-slate-800 mx-1"></div>

         {/* Version & Window Controls */}
         <div className="flex items-center gap-2">
           <span className="hidden lg:block text-[10px] font-mono text-slate-700 select-none">v{APP_VERSION}</span>
           <div className="flex items-center gap-1">
             <button onClick={() => onWindowControl('minimize')} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"><Minus className="w-4 h-4" /></button>
             <button onClick={() => onWindowControl('maximize')} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"><Square className="w-3.5 h-3.5" /></button>
             <button onClick={() => onWindowControl('close')} className="p-1.5 rounded hover:bg-red-600 text-slate-400 hover:text-white transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
           </div>
         </div>

      </div>
    </header>
  );
};