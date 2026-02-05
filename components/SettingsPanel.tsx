
import React, { useState } from 'react';
import { Keyboard, KeyRound, Mic, Brain, Leaf, ShieldAlert, Database, Check, X, Wand2, Activity, Scissors, ChevronDown, ChevronUp, BarChart2, Circle, AudioWaveform, Shield, ChevronLeft } from 'lucide-react';
import { CorrectionSettings, Language } from '../types';
import { getTranslation } from '../utils/i18n';
import { MicTest } from './MicTest';
import { getDictionaryStats } from '../data/dictionary';

interface SettingsPanelProps {
  settings: CorrectionSettings;
  language: Language;
  onUpdateSettings: (newSettings: CorrectionSettings) => void;
  onResetKey: () => void;
  hasLock?: boolean;
  onRemoveLock?: () => void;
  onSetLock?: (code: string) => void; // Added for Change PIN
  onClose?: () => void;
  isVisible?: boolean;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  language,
  onUpdateSettings,
  onResetKey,
  hasLock,
  onRemoveLock,
  onSetLock,
  onClose,
  isVisible = true
}) => {
  const t = getTranslation(language);
  const dictStats = getDictionaryStats();
  
  // Local state for collapsing the Visualizer settings
  const [isVisExpanded, setIsVisExpanded] = useState(false);
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [newPin, setNewPin] = useState('');

  const handleSavePin = () => {
      if (newPin.trim().length > 0 && onSetLock) {
          onSetLock(newPin.trim());
          setIsChangingPin(false);
          setNewPin('');
      }
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 shadow-xl z-40 w-full shrink-0 h-[85vh] md:h-auto overflow-y-auto custom-scrollbar">
        {/* Main Content Area: Responsive Grid */}
        <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 py-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 pb-20 md:pb-6">
            
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
                        className="w-full h-4 md:h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500 touch-manipulation mb-6"
                    />
                    
                    {/* VISUALIZER SETTINGS (COLLAPSIBLE) */}
                    <div className="border-t border-slate-700/50 pt-4">
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
                        <div className={`space-y-4 overflow-hidden transition-all duration-300 ${isVisExpanded ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                            
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
                        />
                    </div>
                </div>
            </div>

            {/* COLUMN 3: Model & System */}
            <div className="flex flex-col h-full space-y-4 md:space-y-6">
                 <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Brain className="w-4 h-4 text-purple-400" />
                    {t.groupModel}
                </h3>

                {/* Audio Model Switcher */}
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                    <div className="flex gap-2">
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

                {/* Action Buttons */}
                <div className="space-y-2 mt-auto">
                    {hasLock && onRemoveLock && (
                        <div className="space-y-2">
                            {/* Toggle Change PIN */}
                            {!isChangingPin ? (
                                <button 
                                    onClick={() => setIsChangingPin(true)}
                                    className="flex items-center justify-center gap-2 p-3 md:p-2 w-full rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 text-slate-400 text-xs transition-colors touch-manipulation"
                                >
                                    <Shield className="w-4 h-4" />
                                    {t.lockChange || "Change PIN"}
                                </button>
                            ) : (
                                <div className="bg-slate-800 p-2 rounded-lg border border-slate-700 animate-in fade-in zoom-in duration-300">
                                    <div className="flex items-center gap-2 mb-2">
                                        <button onClick={() => setIsChangingPin(false)} className="text-slate-500 hover:text-white"><ChevronLeft className="w-4 h-4" /></button>
                                        <span className="text-xs font-bold text-slate-300">{t.lockChange}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <input 
                                            type="password"
                                            inputMode="numeric"
                                            value={newPin}
                                            onChange={(e) => setNewPin(e.target.value)}
                                            placeholder="****"
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center text-sm font-mono focus:border-indigo-500"
                                            maxLength={8}
                                        />
                                        <button 
                                            onClick={handleSavePin}
                                            disabled={newPin.length < 3}
                                            className="bg-indigo-600 text-white px-3 py-1 rounded text-xs font-bold disabled:opacity-50"
                                        >
                                            OK
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button 
                                onClick={onRemoveLock}
                                className="flex items-center justify-center gap-2 p-3 md:p-2 w-full rounded-lg bg-slate-800 border border-slate-700 hover:bg-red-950/30 hover:border-red-900/50 hover:text-red-400 text-slate-400 text-xs transition-colors touch-manipulation"
                            >
                                <ShieldAlert className="w-4 h-4" />
                                {t.lockRemove || "Remove PIN"}
                            </button>
                        </div>
                    )}
                </div>
            </div>

        </div>

        {/* FOOTER - Absolute positioned within the panel */}
        <div className="absolute bottom-0 left-0 w-full border-t border-slate-800 p-4 flex items-center justify-between bg-slate-900 safe-area-bottom z-50">
             {/* Left: Change API Key */}
             <button 
                onClick={onResetKey}
                className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-red-400 transition-colors text-xs font-medium touch-manipulation"
             >
                <KeyRound className="w-3.5 h-3.5" />
                {t.changeKey}
             </button>

             {/* Right: Close (Gray) */}
             <button 
                onClick={onClose}
                className="flex items-center gap-2 px-6 py-3 md:py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-all active:scale-95 text-xs touch-manipulation"
             >
                {t.tooltipClose || "Close"}
             </button>
        </div>
    </div>
  );
};
