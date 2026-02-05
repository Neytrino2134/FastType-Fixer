import React, { useEffect, useState } from 'react';
import { Eraser, Pause, Play, ClipboardList, Settings, Minus, Square, X, Home, HelpCircle, RotateCcw, PenTool, Zap, Languages, Bot, PencilLine, BookOpen, Sparkles, Mic, History, Pin, PinOff, Wand2, Copy, Trash2, ClipboardPaste } from 'lucide-react';
import { Language, ProcessingStatus, CorrectionSettings, Tab } from '../types';
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
  isPinned: boolean;
  setCurrentTab: (tab: Tab) => void;
  onToggleLanguage: () => void;
  onTogglePause: () => void;
  onToggleClipboard: () => void;
  onToggleSettings: () => void;
  onToggleHistory: () => void;
  onToggleHelp: () => void;
  onTogglePin: () => void;
  onGoHome: () => void;
  onWindowControl: (action: 'minimize' | 'maximize' | 'close') => void;
  onResetProcessor: () => void;
  historyUpdateCount?: number;
  onClearText: () => void;
  onCopyText: () => void;
  onPasteText: () => void;
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
  isPinned,
  setCurrentTab,
  onToggleLanguage,
  onTogglePause,
  onToggleClipboard,
  onToggleSettings,
  onToggleHelp,
  onTogglePin,
  onGoHome,
  onWindowControl,
  onResetProcessor,
  historyUpdateCount = 0,
  onClearText,
  onCopyText,
  onPasteText
}) => {
  const t = getTranslation(language);

  const [isHistoryBlinking, setIsHistoryBlinking] = useState(false);

  useEffect(() => {
    if (historyUpdateCount > 0) {
        setIsHistoryBlinking(true);
        const timer = setTimeout(() => setIsHistoryBlinking(false), 800);
        return () => clearTimeout(timer);
    }
  }, [historyUpdateCount]);

  const tabs: { id: Tab; icon: React.ElementType; label: string; activeColor: string }[] = [
    { id: 'editor', icon: PenTool, label: t.tabEditor, activeColor: 'bg-slate-800' },
    { id: 'chat', icon: Bot, label: t.tabAssist, activeColor: 'bg-indigo-600' },
    { id: 'translator', icon: Languages, label: t.tabTrans, activeColor: 'bg-emerald-600' },
  ];

  // Logic for the status icons
  const isTypingActive = status === 'typing';
  const isRecordingActive = status === 'recording' || status === 'transcribing'; // Active dictation
  const isDictActive = status === 'dict_check';
  // Split AI Status: Fixing vs Finalizing/Enhancing
  const isAiFixingActive = status === 'ai_fixing'; 
  const isAiFinalizingActive = status === 'ai_finalizing' || status === 'enhancing';
  const isScriptFixActive = status === 'script_fix';

  // --- COMPONENT: BRANDING (Draggable) ---
  const Branding = (
    // Removed 'no-drag' to allow dragging from this area
    <div className="flex items-center gap-3 select-none pr-2 cursor-default">
         <div className="relative group">
              <div className="absolute inset-0 bg-indigo-500 blur opacity-20 group-hover:opacity-40 transition-opacity rounded-lg"></div>
              <div className="relative bg-slate-800/80 border border-slate-700/50 p-1.5 rounded-lg shadow-sm group-hover:border-indigo-500/30 transition-colors">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              </div>
         </div>
         <span className="font-bold text-sm text-slate-200 tracking-tight hidden sm:block">
             FastType <span className="text-indigo-400">AI</span>
         </span>
    </div>
  );

  // --- COMPONENT: ACTION BUTTONS (Copy, Paste, Clear) ---
  const ActionButtons = (
    <div className="flex items-center gap-1 bg-slate-800/30 p-1 rounded-lg border border-slate-800/50 no-drag">
        <Tooltip content={t.btnHeaderCopy} side="bottom">
            <button onClick={onCopyText} className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer active:scale-95">
                <Copy className="w-4 h-4" />
            </button>
        </Tooltip>

        <Tooltip content={t.btnHeaderPaste} side="bottom">
            <button onClick={onPasteText} className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer active:scale-95">
                <ClipboardPaste className="w-4 h-4" />
            </button>
        </Tooltip>

        <div className="w-px h-3 bg-slate-700/50 mx-0.5" />

        <Tooltip content={t.btnHeaderClear} side="bottom">
            <button onClick={onClearText} className="p-1.5 rounded-md hover:bg-red-900/30 text-slate-400 hover:text-red-400 transition-colors cursor-pointer active:scale-95">
                <Trash2 className="w-4 h-4" />
            </button>
        </Tooltip>
    </div>
  );

  // --- COMPONENT: TABS NAVIGATION ---
  const TabNavigation = (
    <div className="no-drag flex p-1 bg-slate-950 rounded-lg border border-slate-800 shrink-0 gap-1">
        {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        return (
            <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] touch-manipulation overflow-hidden ${
                    isActive 
                    ? `${tab.activeColor} text-white shadow-md` 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                }`}
            >
                <tab.icon className={`w-3.5 h-3.5 shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`} />
                <span 
                    className={`overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap ${
                    isActive ? 'max-w-[150px] opacity-100 ml-0.5' : 'max-w-0 opacity-0 hidden sm:inline-block'
                    }`}
                >
                    {tab.label}
                </span>
            </button>
        );
        })}
    </div>
  );

  // --- COMPONENT: STATUS TOOLBAR ---
  const StatusToolbar = (
    <div className="flex items-center gap-1 overflow-visible animate-in fade-in slide-in-from-left-4 duration-300 no-drag">
        
        {/* 1. Reset Button */}
        <Tooltip content={t.detailReset || "Reset Processor"} side="bottom">
            <button
                onClick={onResetProcessor}
                className="p-2 rounded-full text-slate-500 hover:text-white hover:bg-slate-800 transition-all cursor-pointer group active:scale-95 touch-manipulation"
            >
                <RotateCcw className="w-4 h-4 group-hover:-rotate-90 transition-transform duration-300" />
            </button>
        </Tooltip>

        {/* 2. Pause Button */}
        <Tooltip content={settings.enabled ? t.tooltipPauseAction : t.tooltipResumeAction} side="bottom">
            <button
                onClick={onTogglePause}
                className={`p-2 rounded-full transition-all cursor-pointer hover:bg-slate-800 active:scale-95 touch-manipulation ${
                settings.enabled
                    ? 'text-slate-500 hover:text-white'
                    : 'text-amber-400 hover:text-amber-300'
                }`}
            >
                {settings.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
        </Tooltip>

        {/* Divider */}
        <div className="w-px h-4 bg-slate-800 mx-1 md:mx-2 shrink-0" />

        {/* 6 FIXED STATUS ICONS (Parallel Processing) */}
        <div className="flex items-center gap-2">
            
            {/* 0. DICTATION (NEW) - ORANGE */}
            <Tooltip content={t.detailDictation} side="bottom">
                <div 
                className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-300 ${
                    isRecordingActive
                    ? 'bg-orange-950/40 border-orange-500/50 text-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.3)]' 
                    : 'bg-slate-800 border-slate-700 text-slate-600'
                }`}
                >
                    <Mic className={`w-3.5 h-3.5 ${isRecordingActive ? 'animate-pulse' : ''}`} />
                </div>
            </Tooltip>

            {/* A. TEXT / TYPING */}
            <Tooltip content={t.detailTyping} side="bottom">
                <div 
                className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-300 ${
                    isTypingActive
                    ? 'bg-slate-700 border-slate-500 text-white shadow-[0_0_10px_rgba(148,163,184,0.3)]' 
                    : 'bg-slate-800 border-slate-700 text-slate-600'
                }`}
                >
                    <PencilLine className={`w-3.5 h-3.5 ${isTypingActive ? 'animate-pulse' : ''}`} />
                </div>
            </Tooltip>

            {/* B. DICTIONARY CHECK - BLUE/SKY */}
            <Tooltip content={t.detailDictCheck} side="bottom">
                <div 
                className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-300 ${
                    isDictActive
                    ? 'bg-sky-950/40 border-sky-500/50 text-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.2)]' 
                    : 'bg-slate-800 border-slate-700 text-slate-600'
                }`}
                >
                    <BookOpen className={`w-3.5 h-3.5 ${isDictActive ? 'animate-bounce' : ''}`} />
                </div>
            </Tooltip>

            {/* C. AI FIXING (Zap) - PURPLE */}
            <Tooltip content={t.detailAiFixing} side="bottom">
                <div 
                className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-300 ${
                    isAiFixingActive
                    ? 'bg-purple-950/40 border-purple-500/50 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)]' 
                    : 'bg-slate-800 border-slate-700 text-slate-600'
                }`}
                >
                    <Zap className={`w-3.5 h-3.5 ${isAiFixingActive ? 'animate-pulse' : ''}`} />
                </div>
            </Tooltip>
            
            {/* MINI SCRIPT FIXING (Wand) - BLUE/INDIGO */}
             <Tooltip content={t.detailScriptFix || "Auto-Format"} side="bottom">
                <div 
                className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-300 ${
                    isScriptFixActive
                    ? 'bg-blue-950/40 border-blue-500/50 text-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.3)]' 
                    : 'bg-slate-800 border-slate-700 text-slate-600'
                }`}
                >
                    <Wand2 className={`w-3.5 h-3.5 ${isScriptFixActive ? 'animate-pulse' : ''}`} />
                </div>
            </Tooltip>

            {/* D. AI FINALIZING (Sparkles) - GREEN */}
            <Tooltip content={t.detailFinalizing} side="bottom">
                <div 
                className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-300 ${
                    isAiFinalizingActive
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                    : 'bg-slate-800 border-slate-700 text-slate-600'
                }`}
                >
                    <Sparkles className={`w-3.5 h-3.5 ${isAiFinalizingActive ? 'animate-spin' : ''}`} />
                </div>
            </Tooltip>

                {/* E. HISTORY STATUS (New) - TEAL BLINK */}
                <Tooltip content={t.historyTitle} side="bottom">
                <div 
                className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-300 ${
                    isHistoryBlinking
                    ? 'bg-teal-950/60 border-teal-400 text-teal-300 shadow-[0_0_15px_rgba(20,184,166,0.5)] scale-110' 
                    : 'bg-slate-800 border-slate-700 text-slate-600'
                }`}
                >
                    <History className={`w-3.5 h-3.5 ${isHistoryBlinking ? 'animate-pulse' : ''}`} />
                </div>
            </Tooltip>
        </div>
    </div>
  );

  return (
    <header className="titlebar-drag-region bg-slate-900 border-b border-slate-800 px-3 md:px-4 py-2 md:py-3 flex flex-col shrink-0 z-50 relative select-none supports-[padding-top:env(safe-area-inset-top)]:pt-[env(safe-area-inset-top)] transition-[height] duration-300">
      
      {/* ROW 1: TOP CONTROLS */}
      <div className="flex items-center justify-between w-full">
          
          {/* LEFT SIDE (Desktop: Tabs & Status, Mobile: Empty/Spacer) */}
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
            {Branding}

            {/* Desktop Only: Tabs & Status - Hidden below 1360px */}
            <div className="hidden min-[1360px]:flex items-center gap-4 pl-4 border-l border-slate-800/50">
                {TabNavigation}
                {currentTab === 'editor' && StatusToolbar}
            </div>
          </div>

          {/* RIGHT SIDE: Navigation & Window Controls (Always Visible) */}
          <div className="flex items-center gap-2 md:gap-3 no-drag z-50 relative shrink-0">
            
            {/* ACTIONS GROUP (Copy, Paste, Clear) - Desktop Only (> 1360px) */}
            {currentTab === 'editor' && (
                <div className="hidden min-[1360px]:block">
                   {ActionButtons}
                </div>
            )}
            
            {/* Navigation Group */}
            <div className="flex items-center gap-1 bg-slate-800/30 p-1 rounded-lg border border-slate-800/50">
                <Tooltip content={t.tooltipHome} side="bottom">
                <button onClick={onGoHome} className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer active:scale-95">
                    <Home className="w-4 h-4" />
                </button>
                </Tooltip>

                <Tooltip content={t.tooltipHelp} side="bottom">
                <button onClick={onToggleHelp} className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer active:scale-95">
                    <HelpCircle className="w-4 h-4" />
                </button>
                </Tooltip>

                {currentTab === 'editor' && (
                    <Tooltip content={t.clipboardTitle} side="bottom">
                    <button onClick={onToggleClipboard} className={`p-1.5 rounded-md transition-colors cursor-pointer active:scale-95 ${showClipboard ? 'bg-indigo-900/30 text-indigo-400' : 'hover:bg-slate-800 text-slate-400'}`}>
                        <ClipboardList className="w-4 h-4" />
                    </button>
                    </Tooltip>
                )}

                <Tooltip content={t.tooltipSettings} side="bottom">
                <button onClick={onToggleSettings} className={`p-1.5 rounded-md transition-colors cursor-pointer active:scale-95 ${showSettings ? 'bg-indigo-900/30 text-indigo-400' : 'hover:bg-slate-800 text-slate-400'}`}>
                    <Settings className="w-4 h-4" />
                </button>
                </Tooltip>
            </div>

            <div className="h-5 w-px bg-slate-800 mx-0.5 hidden md:block"></div>

            {/* Language */}
            <div className="flex items-center gap-2">
                <Tooltip content={t.tooltipLang} side="bottom">
                <button onClick={onToggleLanguage} className="px-2 py-1.5 rounded bg-slate-800 text-[10px] font-bold text-slate-400 hover:text-white border border-slate-700 transition-colors uppercase cursor-pointer min-w-[32px] active:scale-95">
                    {language}
                </button>
                </Tooltip>

                {/* Desktop Stats - Always Visible if enabled */}
                {currentTab === 'editor' && (
                    <Tooltip content={t.tooltipStats} side="bottom">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-md text-xs font-semibold text-slate-400 border border-slate-700 select-none">
                        <Eraser className="w-3 h-3" />
                        <span>{stats.corrections}</span>
                    </div>
                    </Tooltip>
                )}
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-3 pl-2 border-l border-slate-800 ml-1">
            <span className="text-[10px] font-mono text-slate-700 select-none whitespace-nowrap">v{APP_VERSION}</span>
            
            <div className="flex items-center gap-1">
                <Tooltip content={isPinned ? t.tooltipUnpin : t.tooltipPin} side="bottom">
                    <button 
                    onClick={onTogglePin} 
                    className={`p-1.5 rounded hover:bg-slate-800 transition-colors cursor-pointer ${isPinned ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
                    >
                        {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                    </button>
                </Tooltip>
                
                <div className="w-px h-3 bg-slate-800 mx-0.5"></div>

                <button onClick={() => onWindowControl('minimize')} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"><Minus className="w-4 h-4" /></button>
                <button onClick={() => onWindowControl('maximize')} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"><Square className="w-3.5 h-3.5" /></button>
                <button onClick={() => onWindowControl('close')} className="p-1.5 rounded hover:bg-red-600 text-slate-400 hover:text-white transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            </div>

        </div>
      </div>

      {/* ROW 2: SMALLER SCREENS (< 1360px) (TABS + STATUS + ACTIONS) */}
      <div className="flex min-[1360px]:hidden items-center justify-between gap-2 w-full mt-2 pt-2 border-t border-slate-800 no-drag animate-in slide-in-from-top-1 fade-in duration-300">
           {/* Left: Tabs + Status */}
           <div className="flex items-center gap-4">
                {TabNavigation}
                {currentTab === 'editor' && StatusToolbar}
           </div>

           {/* Right: Actions */}
           {currentTab === 'editor' && ActionButtons}
      </div>

    </header>
  );
};