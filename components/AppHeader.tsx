
import React, { useEffect, useState, useRef } from 'react';
import { Eraser, Pause, Play, Settings, Minus, Square, X, Home, HelpCircle, RotateCcw, PenTool, Languages, Bot, PencilLine, BookOpen, Sparkles, Mic, History, Pin, PinOff, Wand2, Copy, Trash2, ClipboardPaste, Scissors, Replace, ChevronDown, Check, ListTodo, Volume2, FileAudio, Loader2, Zap, Keyboard } from 'lucide-react';
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
  showSettings: boolean;
  showHistory: boolean;
  currentTab: Tab;
  isPinned: boolean;
  setCurrentTab: (tab: Tab) => void;
  onSetLanguage: (lang: Language) => void; 
  onTogglePause: () => void;
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
  onCutText: () => void; 
  onClearAndPaste: () => void;
  onSwitchLayout: () => void; // New prop
  showClipboard: boolean;
  onToggleClipboard: () => void;
  onUpdateSettings?: (newSettings: CorrectionSettings) => void;
  onSendToChat?: () => void;
  onSendToTranslator?: () => void;
  onSpeakText?: () => void; 
  onToggleArchive?: () => void; 
  showArchive?: boolean; 
}

const FpsCounter = () => {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let lastTime = performance.now();
    let frame = 0;
    let active = true;
    const loop = (now: number) => {
      if (!active) return;
      frame++;
      if (now - lastTime >= 1000) {
        setFps(Math.round((frame * 1000) / (now - lastTime)));
        frame = 0;
        lastTime = now;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return () => { active = false; };
  }, []);
  return (
    <span className="text-[10px] font-mono text-fuchsia-400 bg-fuchsia-900/20 px-1.5 py-0.5 rounded border border-fuchsia-500/30 select-none animate-in fade-in">
        {fps} FPS
    </span>
  );
};

export const AppHeader: React.FC<AppHeaderProps> = ({
  language,
  status,
  isGrammarChecking,
  stats,
  settings,
  showSettings,
  showHistory, 
  currentTab,
  isPinned,
  setCurrentTab,
  onSetLanguage,
  onTogglePause,
  onToggleSettings,
  onToggleHistory,
  onToggleHelp,
  onTogglePin,
  onGoHome,
  onWindowControl,
  onResetProcessor,
  historyUpdateCount = 0,
  onClearText,
  onCopyText,
  onPasteText,
  onCutText,
  onClearAndPaste,
  onSwitchLayout,
  showClipboard, 
  onToggleClipboard,
  onUpdateSettings,
  onSendToChat,
  onSendToTranslator,
  onSpeakText,
  onToggleArchive,
  showArchive
}) => {
  const t = getTranslation(language);

  const [isHistoryBlinking, setIsHistoryBlinking] = useState(false);
  
  // Language Menu State
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (historyUpdateCount > 0) {
        setIsHistoryBlinking(true);
        const timer = setTimeout(() => setIsHistoryBlinking(false), 800);
        return () => clearTimeout(timer);
    }
  }, [historyUpdateCount]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    if (isLangMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLangMenuOpen]);

  const toggleSetting = (key: keyof CorrectionSettings) => {
      if (onUpdateSettings) {
          const nextValue = !settings[key];
          const updates: any = { [key]: nextValue };
          
          // HYBRID LOGIC: If enabling a specific feature, force Global Enabled = true
          // This allows users to "Wake up" specific functions even if Master Switch was off.
          if (nextValue === true) {
              updates.enabled = true;
          }
          
          onUpdateSettings({ ...settings, ...updates });
      } else {
          console.warn("onUpdateSettings not provided to AppHeader");
      }
  };

  const isTypingActive = status === 'typing';
  const isRecordingActive = status === 'recording' || status === 'transcribing';
  const isDictChecking = status === 'dict_check';
  const isAiFixingActive = status === 'ai_fixing'; 
  const isAiFinalizingActive = status === 'ai_finalizing' || status === 'enhancing';
  const isScriptFixActive = status === 'script_fix';
  const isSpeaking = status === 'speaking'; 

  const isSmartActive = settings.enabled;
  const isAiFeaturesActive = settings.fixTypos || settings.fixPunctuation;

  const toggleAiFeatures = () => {
      if (onUpdateSettings) {
          const newState = !isAiFeaturesActive;
          onUpdateSettings({
              ...settings,
              fixTypos: newState,
              fixPunctuation: newState,
              // If turning ON, ensure app is enabled. 
              // If turning OFF, leave app enabled (for raw dictation)
              enabled: newState ? true : settings.enabled
          });
      }
  };

  const tabs: { id: Tab; icon: React.ElementType; label: string; activeColor: string; shortcut: string }[] = [
    { id: 'editor', icon: PenTool, label: t.tabEditor, activeColor: 'bg-slate-800', shortcut: 'Ctrl+1' },
    { id: 'chat', icon: Bot, label: t.tabAssist, activeColor: 'bg-indigo-600', shortcut: 'Ctrl+2' },
    { id: 'translator', icon: Languages, label: t.tabTrans, activeColor: 'bg-emerald-600', shortcut: 'Ctrl+3' },
    { id: 'planner', icon: ListTodo, label: t.tabPlanner || 'Planner', activeColor: 'bg-amber-600', shortcut: 'Ctrl+4' },
  ];

  // --- SUB-COMPONENTS (PANELS) ---

  // PANEL 1: Navigation Tabs
  const TabNavigation = (
    <div className="flex p-1 bg-slate-950 rounded-lg border border-slate-800 shrink-0 gap-1 no-drag shadow-sm transition-all duration-300">
        {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        return (
            <Tooltip key={tab.id} content={isActive ? "" : `${tab.label} (${tab.shortcut})`} side="bottom">
                <button
                    onClick={() => setCurrentTab(tab.id)}
                    className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-300 touch-manipulation ease-out ${
                        isActive 
                        ? `${tab.activeColor} text-white shadow-md pr-3` 
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                    }`}
                >
                    <tab.icon className={`w-4 h-4 shrink-0 transition-transform duration-300 ${isActive ? 'scale-100' : 'scale-90'}`} />
                    <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${isActive ? 'max-w-[150px] ml-1 opacity-100' : 'max-w-0 ml-0 opacity-0'}`}>
                        {tab.label}
                    </span>
                </button>
            </Tooltip>
        );
        })}
    </div>
  );

  // PANEL 2: Status & Toggles (Microphone, Finalize, History)
  const StatusToolbar = (
    <div className="flex items-center gap-1 overflow-visible animate-in fade-in zoom-in duration-300 no-drag bg-slate-900/50 px-3 py-1 rounded-full border border-slate-800/50 shadow-sm justify-center transition-all">
        <Tooltip content={t.detailReset || "Reset Processor"} side="bottom">
            <button onClick={onResetProcessor} className="p-2 rounded-full text-slate-500 hover:text-white hover:bg-slate-800 transition-all cursor-pointer group active:scale-95 touch-manipulation">
                <RotateCcw className="w-4 h-4 group-hover:-rotate-90 transition-transform duration-300" />
            </button>
        </Tooltip>

        <Tooltip content={isSmartActive ? t.tooltipPauseAction : t.tooltipResumeAction} side="bottom">
            <button 
                onClick={onTogglePause} 
                className={`p-2 rounded-full transition-all cursor-pointer hover:bg-slate-800 active:scale-95 touch-manipulation text-slate-500 ${isSmartActive ? 'hover:text-yellow-400' : 'hover:text-emerald-400'}`}
            >
                {isSmartActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
        </Tooltip>

        <div className="w-px h-4 bg-slate-800 mx-1 md:mx-2 shrink-0" />

        <div className="flex items-center gap-2">
            <Tooltip content={isAiFeaturesActive ? t.modeSmart : t.modeTransOnly} side="bottom">
                <button onClick={toggleAiFeatures} className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-300 cursor-pointer active:scale-95 ${isRecordingActive ? 'bg-orange-950/40 border-orange-500/50 text-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.3)] animate-pulse' : isAiFeaturesActive ? 'bg-purple-900/20 border-purple-500/30 text-purple-400 hover:bg-purple-900/40' : 'bg-orange-900/20 border-orange-500/30 text-orange-400 hover:bg-orange-900/40'}`}>
                    <Mic className={`w-3.5 h-3.5 ${isRecordingActive ? 'animate-pulse' : ''}`} />
                </button>
            </Tooltip>

            <Tooltip content={t.historyTitle} side="bottom">
                <button onClick={onToggleHistory} className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-300 cursor-pointer ${isHistoryBlinking ? 'bg-slate-600 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.5)] scale-110' : showHistory ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}>
                    <History className={`w-3.5 h-3.5 ${isHistoryBlinking ? 'animate-pulse' : ''}`} />
                </button>
            </Tooltip>

            <Tooltip content={t.detailTyping} side="bottom">
                <div className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-300 ${isTypingActive ? 'bg-slate-700 border-slate-500 text-white shadow-[0_0_10px_rgba(148,163,184,0.3)]' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                    <PencilLine className={`w-3.5 h-3.5 ${isTypingActive ? 'animate-pulse' : ''}`} />
                </div>
            </Tooltip>

             <Tooltip content={settings.miniScripts ? t.detailScriptFix : t.pausedScriptFix} side="bottom">
                <button onClick={() => toggleSetting('miniScripts')} className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-300 cursor-pointer active:scale-95 ${!settings.miniScripts || !isSmartActive ? 'bg-slate-800 border-slate-700 text-slate-500 opacity-40 hover:opacity-100' : isScriptFixActive ? 'bg-blue-500/20 border-blue-400 text-blue-200 shadow-[0_0_15px_rgba(96,165,250,0.5)]' : 'bg-slate-800 border-slate-700 text-blue-500/60 hover:text-blue-400 shadow-sm'}`}>
                    {settings.miniScripts ? <Wand2 className={`w-3.5 h-3.5 ${isScriptFixActive ? 'animate-pulse' : ''}`} /> : <Pause className="w-3.5 h-3.5" />}
                </button>
            </Tooltip>

            <Tooltip content={settings.dictionaryCheck ? t.detailDictCheck : t.pausedDictCheck} side="bottom">
                <button onClick={() => toggleSetting('dictionaryCheck')} className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-300 cursor-pointer active:scale-95 ${!settings.dictionaryCheck || !isSmartActive ? 'bg-slate-800 border-slate-700 text-slate-500 opacity-40 hover:opacity-100' : isDictChecking ? 'bg-yellow-500/20 border-yellow-400 text-yellow-200 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'bg-slate-800 border-slate-700 text-yellow-600/70 hover:text-yellow-400 shadow-sm'}`}>
                    {settings.dictionaryCheck ? <BookOpen className={`w-3.5 h-3.5 ${isDictChecking ? 'animate-pulse' : ''}`} /> : <Pause className="w-3.5 h-3.5" />}
                </button>
            </Tooltip>

            <Tooltip content={settings.fixTypos ? t.detailAiFixing : t.pausedAiFixing} side="bottom">
                <button onClick={() => toggleSetting('fixTypos')} className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-300 cursor-pointer active:scale-95 ${!settings.fixTypos || !isSmartActive ? 'bg-slate-800 border-slate-700 text-slate-500 opacity-40 hover:opacity-100' : isAiFixingActive ? 'bg-purple-500/20 border-purple-400 text-purple-200 shadow-[0_0_15px_rgba(192,132,252,0.5)]' : 'bg-slate-800 border-slate-700 text-purple-500/60 hover:text-purple-400 shadow-sm'}`}>
                    {settings.fixTypos ? <Zap className={`w-3.5 h-3.5 ${isAiFixingActive ? 'animate-pulse' : ''}`} /> : <Pause className="w-3.5 h-3.5" />}
                </button>
            </Tooltip>
            
            <Tooltip content={settings.fixPunctuation ? t.detailFinalizing : t.pausedFinalizing} side="bottom">
                <button onClick={() => toggleSetting('fixPunctuation')} className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-300 cursor-pointer active:scale-95 ${!settings.fixPunctuation || !isSmartActive ? 'bg-slate-800 border-slate-700 text-slate-500 opacity-40 hover:opacity-100' : isAiFinalizingActive ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-[0_0_15px_rgba(52,211,153,0.5)]' : 'bg-slate-800 border-slate-700 text-emerald-600/70 hover:text-emerald-400 shadow-sm'}`}>
                    {settings.fixPunctuation ? <Sparkles className={`w-3.5 h-3.5 ${isAiFinalizingActive ? 'animate-spin' : ''}`} /> : <Pause className="w-3.5 h-3.5" />}
                </button>
            </Tooltip>
        </div>
    </div>
  );

  // PANEL 3: Actions (Copy, Paste, Clear, TTS)
  const ActionButtons = (
    <div className="flex items-center gap-1 bg-slate-800/30 p-1 rounded-lg border border-slate-800/50 no-drag shadow-sm transition-all duration-300">
        <Tooltip content={language === 'ru' ? 'В ассистент' : 'Send to Assistant'} side="bottom">
            <button onClick={onSendToChat} className="p-1.5 rounded-md hover:bg-indigo-900/30 text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer active:scale-95">
                <Bot className="w-4 h-4" />
            </button>
        </Tooltip>
        <Tooltip content={language === 'ru' ? 'В переводчик' : 'Send to Translator'} side="bottom">
            <button onClick={onSendToTranslator} className="p-1.5 rounded-md hover:bg-emerald-900/30 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer active:scale-95">
                <Languages className="w-4 h-4" />
            </button>
        </Tooltip>
        
        {/* TTS Group */}
        <div className="flex items-center gap-0.5 bg-purple-900/10 rounded-md border border-purple-500/20 mx-0.5">
            <Tooltip content={isSpeaking ? (language === 'ru' ? "Генерация..." : "Generating...") : (t.btnSpeak || "Speak Text")} side="bottom">
                <button 
                    onClick={onSpeakText} 
                    disabled={isSpeaking}
                    className={`p-1.5 rounded-l-md transition-all duration-300 cursor-pointer ${isSpeaking ? 'bg-purple-900/30 text-purple-300 cursor-wait opacity-50 pointer-events-none' : 'text-slate-400 hover:bg-purple-900/30 hover:text-purple-400 active:scale-95'}`}
                >
                    {isSpeaking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                </button>
            </Tooltip>
            <Tooltip content={language === 'ru' ? 'Архив озвучки' : 'Audio Archive'} side="bottom">
                <button onClick={onToggleArchive} className={`p-1.5 rounded-r-md transition-colors cursor-pointer active:scale-95 border-l border-purple-500/20 ${showArchive ? 'bg-purple-900/30 text-purple-400' : 'hover:bg-purple-900/20 text-slate-400 hover:text-purple-300'}`}>
                    <FileAudio className="w-3.5 h-3.5" />
                </button>
            </Tooltip>
        </div>

        <div className="w-px h-3 bg-slate-700/50 mx-0.5" />
        
        {/* Layout Switcher */}
        <Tooltip content={(language === 'ru' ? 'Перевод раскладки' : 'Switch Layout') + " (Alt+`)"} side="bottom">
            <button onClick={onSwitchLayout} className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-teal-400 transition-colors cursor-pointer active:scale-95">
                <Keyboard className="w-4 h-4" />
            </button>
        </Tooltip>

        <Tooltip content={(language === 'ru' ? 'Вырезать всё' : 'Cut All') + " (Alt+1)"} side="bottom">
            <button onClick={onCutText} className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-pink-400 transition-colors cursor-pointer active:scale-95">
                <Scissors className="w-4 h-4" />
            </button>
        </Tooltip>
        <Tooltip content={t.btnHeaderCopy + " (Alt+2)"} side="bottom">
            <button onClick={onCopyText} className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer active:scale-95">
                <Copy className="w-4 h-4" />
            </button>
        </Tooltip>
        <Tooltip content={t.btnHeaderPaste + " (Alt+3)"} side="bottom">
            <button onClick={onPasteText} className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer active:scale-95">
                <ClipboardPaste className="w-4 h-4" />
            </button>
        </Tooltip>
        <Tooltip content={(language === 'ru' ? 'Заменить (Вставить)' : 'Replace All') + " (Alt+4)"} side="bottom">
            <button onClick={onClearAndPaste} className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer active:scale-95">
                <Replace className="w-4 h-4" />
            </button>
        </Tooltip>
        <div className="w-px h-3 bg-slate-700/50 mx-0.5" />
        <Tooltip content={t.btnHeaderClear + " (Alt+5)"} side="bottom">
            <button onClick={onClearText} className="p-1.5 rounded-md hover:bg-red-900/30 text-slate-400 hover:text-red-400 transition-colors cursor-pointer active:scale-95">
                <Trash2 className="w-4 h-4" />
            </button>
        </Tooltip>
    </div>
  );

  const availableLanguages: { code: Language; label: string; flag: string }[] = [
      { code: 'ru', label: 'Русский', flag: '🇷🇺' },
      { code: 'en', label: 'English', flag: '🇺🇸' },
      { code: 'uz-latn', label: 'O\'zbek', flag: '🇺🇿' },
      { code: 'uz-cyrl', label: 'Ўзбек', flag: '🇺🇿' },
  ];

  return (
    <header className="titlebar-drag-region bg-slate-900 border-b border-slate-800 flex flex-col shrink-0 z-50 relative select-none supports-[padding-top:env(safe-area-inset-top)]:pt-[env(safe-area-inset-top)] transition-all duration-300">
      
      {/* --- TOP ROW: BRANDING + (OPTIONAL PANELS) + RIGHT CONTROLS --- */}
      <div className="flex items-center justify-between w-full px-3 md:px-4 py-2 min-h-[48px]">
          
          {/* LEFT: Branding + Home/Help/Settings Buttons */}
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <div className="flex items-center gap-1 bg-slate-800/30 p-1 rounded-lg border border-slate-800/50 no-drag relative z-[120]">
                <Tooltip content={t.tooltipHome} side="bottom" align="start">
                <button onClick={onGoHome} className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer active:scale-95">
                    <Home className="w-4 h-4" />
                </button>
                </Tooltip>

                <Tooltip content={t.tooltipHelp} side="bottom">
                <button onClick={onToggleHelp} className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer active:scale-95">
                    <HelpCircle className="w-4 h-4" />
                </button>
                </Tooltip>

                <Tooltip content={t.tooltipSettings} side="bottom">
                <button onClick={onToggleSettings} className={`p-1.5 rounded-md transition-colors cursor-pointer active:scale-95 ${showSettings ? 'bg-indigo-900/30 text-indigo-400' : 'hover:bg-slate-800 text-slate-400'}`}>
                    <Settings className="w-4 h-4" />
                </button>
                </Tooltip>
            </div>

            <div className="h-5 w-px bg-slate-800 mx-0.5 hidden sm:block"></div>

            <div className="flex items-center gap-3 select-none pr-2 cursor-default">
                <div className="relative group">
                    <div className="absolute inset-0 bg-indigo-500 blur opacity-20 group-hover:opacity-40 transition-opacity rounded-lg"></div>
                    <div className="relative bg-slate-800/80 border border-slate-700/50 p-1.5 rounded-lg shadow-sm group-hover:border-indigo-500/30 transition-colors">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                </div>
                <span className="font-bold text-sm text-slate-200 tracking-tight hidden sm:block whitespace-nowrap">
                    FastType <span className="text-indigo-400">AI</span>
                </span>
            </div>
          </div>

          {/* CENTER: PANELS (SINGLE LINE MODE > 1536px) */}
          <div className="hidden 2xl:flex flex-1 items-center justify-between gap-4 px-12 animate-in fade-in zoom-in duration-300 pointer-events-none">
              <div className="pointer-events-auto">
                  {TabNavigation}
              </div>
              {currentTab === 'editor' && (
                  <>
                    <div className="pointer-events-auto">
                        {StatusToolbar}
                    </div>
                    <div className="pointer-events-auto">
                        {ActionButtons}
                    </div>
                  </>
              )}
          </div>

          {/* RIGHT: Language + Stats + Window Controls */}
          <div className="flex items-center gap-2 md:gap-3 z-50 relative shrink-0 ml-auto">
            <div className={`flex items-center gap-2 no-drag relative ${isLangMenuOpen ? 'z-[200]' : 'z-50'}`} ref={langMenuRef}>
                <button onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white text-slate-300 transition-all cursor-pointer active:scale-95">
                    <span className="text-[11px] font-bold uppercase min-w-[20px] text-center tracking-wide">
                        {language === 'ru' ? 'RU' : language === 'en' ? 'EN' : language === 'uz-latn' ? 'UZ' : 'УЗ'}
                    </span>
                    <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform duration-200 ${isLangMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isLangMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-40 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[100] origin-top-right">
                        <ul className="flex flex-col py-1">
                            {availableLanguages.map((lang) => (
                                <li key={lang.code}>
                                    <button onClick={() => { onSetLanguage(lang.code); setIsLangMenuOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium transition-colors ${language === lang.code ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'}`}>
                                        <div className="flex items-center gap-3">
                                            <span className="text-base">{lang.flag}</span>
                                            <span>{lang.label}</span>
                                        </div>
                                        {language === lang.code && <Check className="w-3.5 h-3.5" />}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {currentTab === 'editor' && (
                    <Tooltip content={t.tooltipStats} side="bottom">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-md text-xs font-semibold text-slate-400 border border-slate-700 select-none">
                        <Eraser className="w-3 h-3" />
                        <span>{stats.corrections}</span>
                    </div>
                    </Tooltip>
                )}
            </div>

            <div className="flex items-center gap-3 pl-2 border-l border-slate-800 ml-1 no-drag">
                {settings.developerMode && <FpsCounter />}
                <div className="flex items-center gap-1">
                    <Tooltip content={isPinned ? t.tooltipUnpin : t.tooltipPin} side="bottom">
                        <button onClick={onTogglePin} className={`p-1.5 rounded hover:bg-slate-800 transition-colors cursor-pointer ${isPinned ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}>
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

      {/* --- RESPONSIVE CONTAINERS (BELOW 2XL) --- */}
      <div className="2xl:hidden w-full bg-slate-900 border-b border-slate-800 pb-2 transition-all duration-300">
           {currentTab !== 'editor' ? (
                /* Simple View for Non-Editor Tabs */
                <div className="flex items-center justify-start px-4 pt-1 animate-in fade-in slide-in-from-top-2">
                    {TabNavigation}
                </div>
           ) : (
                /* Complex View for Editor Tab */
                <>
                   {/* MODE 2: TWO ROWS (1024px - 1536px) */}
                   <div className="hidden lg:flex items-center justify-between px-4 pt-1 animate-in fade-in slide-in-from-top-2">
                       {TabNavigation}
                       {StatusToolbar}
                       {ActionButtons}
                   </div>

                   {/* MODE 3: THREE ROWS (640px - 1024px) */}
                   <div className="hidden sm:flex lg:hidden flex-col gap-2 px-4 pt-1 animate-in fade-in slide-in-from-top-2">
                       <div className="flex items-center justify-between w-full">
                           {TabNavigation}
                           {ActionButtons}
                       </div>
                       <div className="flex justify-start w-full">
                           {StatusToolbar}
                       </div>
                   </div>

                   {/* MODE 4: FOUR ROWS (< 640px) */}
                   <div className="flex sm:hidden flex-col items-start gap-2 pt-1 px-4 animate-in fade-in slide-in-from-top-2">
                       {TabNavigation}
                       {ActionButtons}
                       {StatusToolbar}
                   </div>
               </>
           )}
      </div>

    </header>
  );
};
