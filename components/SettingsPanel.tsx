
import React, { useState, useEffect } from 'react';
import { Keyboard, KeyRound, Mic, Brain, Leaf, ShieldAlert, Database, Check, X, Wand2, Activity, Scissors, ChevronDown, ChevronUp, BarChart2, Circle, AudioWaveform, Shield, ChevronLeft, Lock, Bug, TestTube, ArrowDownToLine, MoveVertical, Split, ExternalLink, LogOut, Save, Volume2 } from 'lucide-react';
import { CorrectionSettings, Language } from '../types';
import { getTranslation } from '../utils/i18n';
import { MicTest } from './MicTest';
import { getDictionaryStats } from '../data/dictionary';
import { useNotification } from '../contexts/NotificationContext';

interface SettingsPanelProps {
  settings: CorrectionSettings;
  language: Language;
  onUpdateSettings: (newSettings: CorrectionSettings) => void;
  onResetKey: () => void;
  onUpdateApiKey?: (newKey: string) => void;
  hasLock?: boolean;
  onRemoveLock?: () => void;
  onSetLock?: (code: string) => void;
  onClose?: () => void;
  isVisible?: boolean;
  onVerifyPin?: (code: string) => boolean; 
}

type PinFlow = 'none' | 'create' | 'verify_change' | 'verify_remove' | 'set_new';

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  language,
  onUpdateSettings,
  onResetKey,
  onUpdateApiKey,
  hasLock,
  onRemoveLock,
  onSetLock,
  onClose,
  isVisible = true,
  onVerifyPin
}) => {
  const t = getTranslation(language);
  const dictStats = getDictionaryStats();
  const { addNotification } = useNotification();
  
  // Local state for collapsing the Visualizer settings
  const [isVisExpanded, setIsVisExpanded] = useState(false);
  
  // PIN Management State
  const [pinFlow, setPinFlow] = useState<PinFlow>('none');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // API Key Change Modal State
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyInput, setNewKeyInput] = useState('');

  // Reset PIN state when closing/opening or changing flow
  useEffect(() => {
      setPinInput('');
      setPinError('');
      if (!isVisible) {
          setShowKeyModal(false);
      }
  }, [pinFlow, isVisible]);

  // Handlers for PIN Logic
  const handlePinSubmit = () => {
      setPinError('');
      
      if (pinFlow === 'create') {
          // Setting new PIN for the first time
          if (pinInput.length >= 3 && onSetLock) {
              onSetLock(pinInput);
              setPinFlow('none');
          }
      } 
      else if (pinFlow === 'verify_change' || pinFlow === 'verify_remove') {
          // Verifying existing PIN
          if (onVerifyPin && onVerifyPin(pinInput)) {
              if (pinFlow === 'verify_remove' && onRemoveLock) {
                  onRemoveLock();
                  setPinFlow('none');
              } else {
                  // Verify succeeded, move to setting new PIN
                  setPinFlow('set_new');
                  setPinInput('');
              }
          } else {
              setPinError(t.lockError);
          }
      }
      else if (pinFlow === 'set_new') {
          // Setting new PIN after verification
          if (pinInput.length >= 3 && onSetLock) {
              onSetLock(pinInput);
              setPinFlow('none');
          }
      }
  };

  const handleSaveNewKey = () => {
      if (newKeyInput.trim().length < 10) {
          addNotification(language === 'ru' ? "Ключ слишком короткий" : "Key too short", 'error');
          return;
      }
      if (onUpdateApiKey) {
          onUpdateApiKey(newKeyInput.trim());
          addNotification(language === 'ru' ? "Ключ обновлен" : "Key updated", 'success');
          setShowKeyModal(false);
          setNewKeyInput('');
      }
  };

  const getPinTitle = () => {
      switch (pinFlow) {
          case 'create': return t.lockCreateTitle;
          case 'verify_change': return t.lockVerifyOld || "Verify PIN";
          case 'verify_remove': return t.lockVerifyOld || "Verify PIN";
          case 'set_new': return t.lockNew || "New PIN";
          default: return "";
      }
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 shadow-xl z-40 w-full shrink-0 h-[85vh] md:max-h-[85vh] md:h-auto overflow-y-auto custom-scrollbar flex flex-col relative select-none">
        
        {/* OVERLAY: CHANGE API KEY MODAL */}
        {showKeyModal && (
            <div className="absolute inset-0 z-[60] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200 select-none">
                <div className="w-full max-w-sm bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-2xl relative">
                    <button 
                        onClick={() => setShowKeyModal(false)}
                        className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-12 h-12 bg-indigo-900/30 rounded-full flex items-center justify-center mb-3 text-indigo-400 border border-indigo-500/20">
                            <KeyRound className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">{t.changeKey}</h3>
                        <p className="text-xs text-slate-400">
                            {language === 'ru' ? "Введите новый ключ API ниже" : "Enter your new API key below"}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <input 
                            type="password"
                            value={newKeyInput}
                            onChange={(e) => setNewKeyInput(e.target.value)}
                            placeholder="AIzaSy..."
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-sm"
                            autoFocus
                        />
                        
                        <div className="flex gap-2">
                            <button 
                                onClick={handleSaveNewKey}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                {language === 'ru' ? "Сохранить" : "Save"}
                            </button>
                        </div>

                        <div className="pt-4 border-t border-slate-700/50 flex flex-col gap-2">
                             <a 
                                href="https://aistudio.google.com/app/apikey" 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-1"
                             >
                                 <ExternalLink className="w-3 h-3" />
                                 {t.linkGetKey}
                             </a>
                             
                             <button 
                                onClick={() => {
                                    onResetKey();
                                    setShowKeyModal(false);
                                }}
                                className="text-xs text-red-400 hover:text-red-300 flex items-center justify-center gap-1 mt-1 opacity-70 hover:opacity-100"
                             >
                                 <LogOut className="w-3 h-3" />
                                 {language === 'ru' ? "Удалить ключ и выйти" : "Remove Key & Logout"}
                             </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* TOP HEADER: API Key & Close Button */}
        <div className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-6 py-4 bg-slate-900/95 backdrop-blur border-b border-slate-800 shrink-0">
             {/* Left: Change API Key */}
             <button 
                onClick={() => setShowKeyModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all active:scale-95 text-xs font-bold uppercase tracking-wider touch-manipulation"
             >
                <KeyRound className="w-3.5 h-3.5" />
                {t.changeKey}
             </button>

             {/* Right: Collapse/Close Icon */}
             <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700 rounded-full transition-all active:scale-95"
                title={t.tooltipClose || "Close"}
             >
                <ChevronUp className="w-5 h-5" />
             </button>
        </div>

        {/* Main Content Area: Responsive Grid */}
        <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 py-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 pb-10">
            
            {/* COLUMN 1: Active Correction Group */}
            <div className="space-y-4 md:space-y-6">
                 <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Keyboard className="w-4 h-4 text-indigo-400" />
                    {t.groupActive}
                </h3>
                
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 space-y-5">
                    {/* Active Toggle */}
                    <div className="flex items-center justify-between">
                        <label className="text-sm text-slate-400">{t.settingsActive}</label>
                        <button 
                            onClick={() => onUpdateSettings({ ...settings, enabled: !settings.enabled })}
                            className={`w-12 h-7 md:w-11 md:h-6 flex items-center rounded-full transition-colors duration-200 touch-manipulation ${settings.enabled ? 'bg-indigo-600' : 'bg-slate-700'}`}
                        >
                            <span className={`w-5 h-5 md:w-4 md:h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${settings.enabled ? 'translate-x-6 md:translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                     {/* Mini Scripts Toggle */}
                     <div className="flex items-start justify-between">
                        <div className="mr-2">
                            <label className="text-sm text-slate-400 flex items-center gap-2">
                                <Wand2 className="w-3.5 h-3.5 text-sky-400" />
                                {t.settingsMiniScripts || "Mini-Scripts"}
                            </label>
                            <p className="text-[10px] text-slate-600 leading-tight mt-1">
                                {t.settingsMiniScriptsDesc || "Instant fixes for spacing and case (No AI)"}
                            </p>
                        </div>
                        <button 
                            onClick={() => onUpdateSettings({ ...settings, miniScripts: !settings.miniScripts })}
                            className={`w-12 h-7 md:w-11 md:h-6 flex items-center rounded-full transition-colors duration-200 shrink-0 touch-manipulation ${settings.miniScripts ? 'bg-sky-600' : 'bg-slate-700'}`}
                        >
                            <span className={`w-5 h-5 md:w-4 md:h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${settings.miniScripts ? 'translate-x-6 md:translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {/* Developer Mode Toggle */}
                    <div className="flex items-start justify-between">
                        <div className="mr-2">
                            <label className="text-sm text-slate-400 flex items-center gap-2">
                                <Bug className="w-3.5 h-3.5 text-fuchsia-400" />
                                {t.settingsDevMode || "Developer Mode"}
                            </label>
                            <p className="text-[10px] text-slate-600 leading-tight mt-1">
                                {t.settingsDevModeDesc || "Enable test buttons"}
                            </p>
                        </div>
                        <button 
                            onClick={() => onUpdateSettings({ ...settings, developerMode: !settings.developerMode })}
                            className={`w-12 h-7 md:w-11 md:h-6 flex items-center rounded-full transition-colors duration-200 shrink-0 touch-manipulation ${settings.developerMode ? 'bg-fuchsia-600' : 'bg-slate-700'}`}
                        >
                            <span className={`w-5 h-5 md:w-4 md:h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${settings.developerMode ? 'translate-x-6 md:translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {/* Economy Mode Toggle */}
                    <div className="flex items-start justify-between">
                        <div className="mr-2">
                            <label className="text-sm text-slate-400 flex items-center gap-2">
                                <Leaf className="w-3.5 h-3.5 text-emerald-500" />
                                {t.settingsEconomy}
                            </label>
                            <p className="text-[10px] text-slate-600 leading-tight mt-1">
                                {t.settingsEconomyDesc}
                            </p>
                        </div>
                        <button 
                            onClick={() => onUpdateSettings({ ...settings, economyMode: !settings.economyMode })}
                            className={`w-12 h-7 md:w-11 md:h-6 flex items-center rounded-full transition-colors duration-200 shrink-0 touch-manipulation ${settings.economyMode ? 'bg-emerald-600' : 'bg-slate-700'}`}
                        >
                            <span className={`w-5 h-5 md:w-4 md:h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${settings.economyMode ? 'translate-x-6 md:translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {/* Pause Delay Slider */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm text-slate-400">{t.settingsDelay}</label>
                            <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-400 border border-slate-700">{settings.debounceMs}ms</span>
                        </div>
                        <input 
                            type="range" 
                            min="300" 
                            max="2000" 
                            step="100"
                            value={settings.debounceMs}
                            onChange={(e) => onUpdateSettings({ ...settings, debounceMs: parseInt(e.target.value) })}
                            className="w-full h-4 md:h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500 touch-manipulation"
                        />
                    </div>

                    {/* Finalization Timer Slider */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm text-slate-400">{t.settingsFinalization}</label>
                            <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-400 border border-slate-700">
                                {settings.finalizationTimeout / 1000}s
                            </span>
                        </div>
                        <input 
                            type="range" 
                            min="5000" 
                            max="20000" 
                            step="1000"
                            value={settings.finalizationTimeout}
                            onChange={(e) => onUpdateSettings({ ...settings, finalizationTimeout: parseInt(e.target.value) })}
                            className="w-full h-4 md:h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500 touch-manipulation"
                        />
                    </div>
                </div>
            </div>

            {/* COLUMN 2: Audio & Sensitivity & VISUALIZER */}
            <div className="space-y-4 md:space-y-6">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Mic className="w-4 h-4 text-emerald-400" />
                    {t.groupSilence}
                </h3>

                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                    
                    {/* VISUALIZER SETTINGS (COLLAPSIBLE) */}
                    <div className="mb-4">
                        <button 
                            onClick={() => setIsVisExpanded(!isVisExpanded)}
                            className="w-full flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider hover:text-indigo-400 transition-colors mb-2"
                        >
                            <div className="flex items-center gap-2">
                                <Activity className="w-3.5 h-3.5" />
                                Visualizer Waves
                            </div>
                            {isVisExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {/* Collapsible Area */}
                        <div className={`space-y-4 overflow-hidden transition-all duration-300 ${isVisExpanded ? 'max-h-[700px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                            
                            {/* Visualizer Style Selector */}
                            <div className="grid grid-cols-4 gap-2 mb-4">
                                <button
                                    onClick={() => onUpdateSettings({ ...settings, visualizerStyle: 'classic' })}
                                    className={`flex flex-col items-center justify-center p-2 rounded border transition-all ${settings.visualizerStyle === 'classic' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'}`}
                                    title="Classic"
                                >
                                    <AudioWaveform className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => onUpdateSettings({ ...settings, visualizerStyle: 'bars' })}
                                    className={`flex flex-col items-center justify-center p-2 rounded border transition-all ${settings.visualizerStyle === 'bars' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'}`}
                                    title="Bars"
                                >
                                    <BarChart2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => onUpdateSettings({ ...settings, visualizerStyle: 'circular' })}
                                    className={`flex flex-col items-center justify-center p-2 rounded border transition-all ${settings.visualizerStyle === 'circular' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'}`}
                                    title="Circular"
                                >
                                    <Circle className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => onUpdateSettings({ ...settings, visualizerStyle: 'wave' })}
                                    className={`flex flex-col items-center justify-center p-2 rounded border transition-all ${settings.visualizerStyle === 'wave' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'}`}
                                    title="Wave"
                                >
                                    <Activity className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Normalization Toggle */}
                            <div className="flex items-center justify-between">
                                <label className="text-xs text-slate-400 flex items-center gap-1">
                                    <MoveVertical className="w-3 h-3" />
                                    Normalize (Auto-Level)
                                </label>
                                <button 
                                    onClick={() => onUpdateSettings({ ...settings, visualizerNorm: !settings.visualizerNorm })}
                                    className={`w-8 h-4 flex items-center rounded-full transition-colors duration-200 ${settings.visualizerNorm ? 'bg-emerald-600' : 'bg-slate-700'}`}
                                >
                                    <span className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform duration-200 ${settings.visualizerNorm ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                </button>
                            </div>

                            {/* Mirror Toggle */}
                            <div className="flex items-center justify-between">
                                <label className="text-xs text-slate-400 flex items-center gap-1">
                                    <Split className="w-3 h-3" />
                                    Mirror (Center/Bass)
                                </label>
                                <button 
                                    onClick={() => onUpdateSettings({ ...settings, visualizerMirror: !settings.visualizerMirror })}
                                    className={`w-8 h-4 flex items-center rounded-full transition-colors duration-200 ${settings.visualizerMirror ? 'bg-blue-600' : 'bg-slate-700'}`}
                                >
                                    <span className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform duration-200 ${settings.visualizerMirror ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                </button>
                            </div>

                            {/* Gravity */}
                            <div>
                                <div className="flex justify-between mb-1">
                                    <label className="text-xs text-slate-400 flex items-center gap-1">
                                        <ArrowDownToLine className="w-3 h-3" />
                                        Gravity (Decay)
                                    </label>
                                    <span className="text-[10px] font-mono text-slate-500">{settings.visualizerGravity || 2.0}</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0.5" 
                                    max="10.0" 
                                    step="0.5"
                                    value={settings.visualizerGravity || 2.0}
                                    onChange={(e) => onUpdateSettings({ ...settings, visualizerGravity: parseFloat(e.target.value) })}
                                    className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                            </div>

                            {/* Low Cut */}
                            <div>
                                <div className="flex justify-between mb-1">
                                    <label className="text-xs text-slate-400 flex items-center gap-1">
                                        <Scissors className="w-3 h-3 rotate-90" />
                                        Low Cut (Bass)
                                    </label>
                                    <span className="text-[10px] font-mono text-slate-500">{settings.visualizerLowCut || 0}</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="20" 
                                    step="1"
                                    value={settings.visualizerLowCut || 0}
                                    onChange={(e) => onUpdateSettings({ ...settings, visualizerLowCut: parseInt(e.target.value) })}
                                    className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-sky-500"
                                />
                            </div>

                            {/* High Cut */}
                            <div>
                                <div className="flex justify-between mb-1">
                                    <label className="text-xs text-slate-400 flex items-center gap-1">
                                        <Scissors className="w-3 h-3 -rotate-90" />
                                        High Cut (Freq)
                                    </label>
                                    <span className="text-[10px] font-mono text-slate-500">{settings.visualizerHighCut || 128}</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="30" 
                                    max="128" 
                                    step="1"
                                    value={settings.visualizerHighCut || 128}
                                    onChange={(e) => onUpdateSettings({ ...settings, visualizerHighCut: parseInt(e.target.value) })}
                                    className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                            </div>

                            {/* Amplitude */}
                            <div>
                                <div className="flex justify-between mb-1">
                                    <label className="text-xs text-slate-400 flex items-center gap-1">
                                        <Activity className="w-3 h-3" />
                                        Amplitude (Gain)
                                    </label>
                                    <span className="text-[10px] font-mono text-slate-500">x{settings.visualizerAmp || 1}</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0.1" 
                                    max="3.0" 
                                    step="0.1"
                                    value={settings.visualizerAmp || 1}
                                    onChange={(e) => onUpdateSettings({ ...settings, visualizerAmp: parseFloat(e.target.value) })}
                                    className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Silence Threshold Slider - MOVED DOWN */}
                    <div className="border-t border-slate-700/50 pt-4 mb-2">
                        <div className="flex justify-between mb-2">
                            <label className="text-sm text-slate-400 flex items-center gap-2">
                                {language === 'ru' ? 'Порог тишины' : 'Sensitivity'}
                            </label>
                            <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-400 border border-slate-700">{settings.silenceThreshold}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="1" 
                            max="100" 
                            step="1"
                            value={settings.silenceThreshold}
                            onChange={(e) => onUpdateSettings({ ...settings, silenceThreshold: parseInt(e.target.value) })}
                            className="w-full h-4 md:h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500 touch-manipulation"
                        />
                    </div>

                    {/* Mic Test Visualization */}
                    <div className="mt-4">
                        <MicTest 
                            threshold={settings.silenceThreshold} 
                            language={language} 
                            isVisible={isVisible}
                            lowCut={settings.visualizerLowCut || 0}
                            highCut={settings.visualizerHighCut || 128}
                            amp={settings.visualizerAmp || 1}
                            style={settings.visualizerStyle}
                            norm={settings.visualizerNorm}
                            gravity={settings.visualizerGravity}
                            mirror={settings.visualizerMirror}
                        />
                    </div>
                </div>
            </div>

            {/* COLUMN 3: Model & System & PIN */}
            <div className="flex flex-col h-full space-y-4 md:space-y-6">
                 <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Brain className="w-4 h-4 text-purple-400" />
                    {t.groupModel}
                </h3>

                {/* Audio Model Switcher */}
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">{t.audioModelTitle || "Dictation Model"}</label>
                    <div className="flex gap-2 mb-4">
                        <button
                            onClick={() => onUpdateSettings({ ...settings, audioModel: 'gemini-2.5-flash' })}
                            className={`flex-1 flex flex-col items-center justify-center p-3 rounded-lg border transition-all touch-manipulation ${
                                settings.audioModel === 'gemini-2.5-flash'
                                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                                    : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'
                            }`}
                        >
                            <Keyboard className="w-5 h-5 md:w-4 md:h-4 mb-1" />
                            <span className="text-xs font-semibold">{t.modelFlash}</span>
                        </button>
                        
                        <button
                            onClick={() => onUpdateSettings({ ...settings, audioModel: 'gemini-2.5-pro' })}
                            className={`flex-1 flex flex-col items-center justify-center p-3 rounded-lg border transition-all touch-manipulation ${
                                settings.audioModel === 'gemini-2.5-pro'
                                    ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                                    : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'
                            }`}
                        >
                            <Brain className="w-5 h-5 md:w-4 md:h-4 mb-1" />
                            <span className="text-xs font-semibold">{t.modelPro}</span>
                        </button>
                    </div>

                    {/* TTS Voice Selector */}
                    <div className="pt-4 border-t border-slate-700/50">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
                            <Volume2 className="w-3.5 h-3.5" />
                            {t.ttsVoiceTitle || "TTS Voice"}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].map((voice) => (
                                <button
                                    key={voice}
                                    onClick={() => onUpdateSettings({ ...settings, ttsVoice: voice as any })}
                                    className={`py-2 px-3 rounded text-xs font-medium border transition-colors ${
                                        settings.ttsVoice === voice
                                            ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                                    }`}
                                >
                                    {voice}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Dictionary Status Check */}
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-3 border-b border-slate-700/50 pb-2">
                        <Database className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{t.dictStatus}</span>
                    </div>
                    
                    {/* RU Check */}
                    <div className="flex items-center justify-between mb-3 last:mb-0">
                        <div className="flex flex-col">
                            <span className="text-sm text-slate-300 font-medium">{t.dictRu}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{dictStats.ruCount} {t.dictWords}</span>
                        </div>
                        {dictStats.ruLoaded ? (
                            <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-900/50">
                                <Check className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold">OK</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-red-400 bg-red-950/30 px-2 py-1 rounded border border-red-900/50">
                                <X className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold uppercase">{t.dictMissing}</span>
                            </div>
                        )}
                    </div>

                    {/* EN Check */}
                    <div className="flex items-center justify-between">
                         <div className="flex flex-col">
                            <span className="text-sm text-slate-300 font-medium">{t.dictEn}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{dictStats.enCount} {t.dictWords}</span>
                        </div>
                        {dictStats.enLoaded ? (
                            <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-900/50">
                                <Check className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold">OK</span>
                            </div>
                        ) : (
                             <div className="flex items-center gap-1.5 text-red-400 bg-red-950/30 px-2 py-1 rounded border border-red-900/50">
                                <X className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold uppercase">{t.dictMissing}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1"></div>

                {/* PIN Management Section */}
                <div className="space-y-2 mt-auto">
                    
                    {/* If Active Flow: Show PIN Input */}
                    {pinFlow !== 'none' ? (
                        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 animate-in fade-in zoom-in duration-300">
                             <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-300">{getPinTitle()}</span>
                                <button onClick={() => setPinFlow('none')} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
                             </div>
                             
                             <div className="flex gap-2">
                                <input 
                                    type="password"
                                    inputMode="numeric"
                                    value={pinInput}
                                    onChange={(e) => {
                                        setPinInput(e.target.value);
                                        setPinError('');
                                    }}
                                    placeholder="****"
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-center text-sm font-mono focus:border-indigo-500 focus:outline-none"
                                    maxLength={8}
                                    autoFocus
                                />
                                <button 
                                    onClick={handlePinSubmit}
                                    disabled={pinInput.length < 3}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded text-xs font-bold disabled:opacity-50 transition-colors"
                                >
                                    OK
                                </button>
                             </div>
                             {pinError && <p className="text-xs text-red-400 mt-1">{pinError}</p>}
                        </div>
                    ) : (
                        // If No Active Flow: Show Buttons
                        <div className="space-y-2">
                             
                             {/* Condition: Create vs Change */}
                             {!hasLock ? (
                                <button 
                                    onClick={() => setPinFlow('create')}
                                    className="flex items-center justify-center gap-2 p-3 md:p-2 w-full rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 text-slate-400 hover:text-white text-xs transition-colors touch-manipulation"
                                >
                                    <Shield className="w-4 h-4" />
                                    {t.btnCreatePin}
                                </button>
                             ) : (
                                <>
                                    <button 
                                        onClick={() => setPinFlow('verify_change')}
                                        className="flex items-center justify-center gap-2 p-3 md:p-2 w-full rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 text-slate-400 hover:text-white text-xs transition-colors touch-manipulation"
                                    >
                                        <Lock className="w-4 h-4" />
                                        {t.lockChange}
                                    </button>

                                    <button 
                                        onClick={() => setPinFlow('verify_remove')}
                                        className="flex items-center justify-center gap-2 p-3 md:p-2 w-full rounded-lg bg-slate-800 border border-slate-700 hover:bg-red-950/30 hover:border-red-900/50 hover:text-red-400 text-slate-400 text-xs transition-colors touch-manipulation"
                                    >
                                        <ShieldAlert className="w-4 h-4" />
                                        {t.lockRemove}
                                    </button>
                                </>
                             )}
                        </div>
                    )}

                </div>
            </div>

        </div>
    </div>
  );
};