
import React from 'react';
import { Keyboard, KeyRound, Mic, Zap, Brain, Leaf, ShieldAlert, Check } from 'lucide-react';
import { CorrectionSettings, Language } from '../types';
import { getTranslation } from '../utils/i18n';
import { MicTest } from './MicTest';

interface SettingsPanelProps {
  settings: CorrectionSettings;
  language: Language;
  onUpdateSettings: (newSettings: CorrectionSettings) => void;
  onResetKey: () => void;
  hasLock?: boolean;
  onRemoveLock?: () => void;
  onClose?: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  language,
  onUpdateSettings,
  onResetKey,
  hasLock,
  onRemoveLock,
  onClose
}) => {
  const t = getTranslation(language);

  return (
    <div className="bg-slate-900 border-b border-slate-800 shadow-xl z-40 w-full shrink-0 animate-in slide-in-from-top-2 duration-200">
        {/* Main Content Area: Responsive Grid */}
        <div className="w-full max-w-[1400px] mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            
            {/* COLUMN 1: General & Behavior */}
            <div className="space-y-6">
                 <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Keyboard className="w-4 h-4 text-indigo-400" />
                    {t.settingsTitle}
                </h3>
                
                {/* Active Toggle */}
                <div className="flex items-center justify-between">
                    <label className="text-sm text-slate-400">{t.settingsActive}</label>
                    <button 
                        onClick={() => onUpdateSettings({ ...settings, enabled: !settings.enabled })}
                        className={`w-11 h-6 flex items-center rounded-full transition-colors duration-200 ${settings.enabled ? 'bg-indigo-600' : 'bg-slate-700'}`}
                    >
                        <span className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${settings.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
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
                        className={`w-11 h-6 flex items-center rounded-full transition-colors duration-200 shrink-0 ${settings.economyMode ? 'bg-emerald-600' : 'bg-slate-700'}`}
                    >
                        <span className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${settings.economyMode ? 'translate-x-6' : 'translate-x-1'}`} />
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
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>
            </div>

            {/* COLUMN 2: Audio & Sensitivity */}
            <div className="space-y-6">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Mic className="w-4 h-4 text-emerald-400" />
                    {language === 'ru' ? 'Аудио и Микрофон' : 'Audio & Microphone'}
                </h3>

                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                    <div className="flex justify-between mb-2">
                        <label className="text-sm text-slate-400 flex items-center gap-2">
                            {language === 'ru' ? 'Порог тишины' : 'Silence Threshold'}
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
                        className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    
                    {/* Mic Test Visualization */}
                    <div className="mt-2">
                        <MicTest threshold={settings.silenceThreshold} language={language} />
                    </div>
                </div>

                <div className="bg-indigo-950/20 p-3 rounded-xl border border-indigo-900/50">
                     <p className="text-[10px] text-indigo-300/80 leading-relaxed">
                        {t.howItWorksDesc}
                     </p>
                </div>
            </div>

            {/* COLUMN 3: Model & System */}
            <div className="flex flex-col h-full space-y-6">
                 <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Brain className="w-4 h-4 text-purple-400" />
                    {t.audioModelTitle} & System
                </h3>

                {/* Audio Model Switcher */}
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                    <div className="flex gap-2">
                        <button
                            onClick={() => onUpdateSettings({ ...settings, audioModel: 'gemini-2.5-flash' })}
                            className={`flex-1 flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                                settings.audioModel === 'gemini-2.5-flash'
                                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                                    : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'
                            }`}
                        >
                            <Zap className="w-4 h-4 mb-1" />
                            <span className="text-xs font-semibold">{t.modelFlash}</span>
                        </button>
                        
                        <button
                            onClick={() => onUpdateSettings({ ...settings, audioModel: 'gemini-2.5-pro' })}
                            className={`flex-1 flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                                settings.audioModel === 'gemini-2.5-pro'
                                    ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                                    : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'
                            }`}
                        >
                            <Brain className="w-4 h-4 mb-1" />
                            <span className="text-xs font-semibold">{t.modelPro}</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1"></div>

                {/* Action Buttons */}
                <div className="space-y-2 mt-auto">
                    <button 
                        onClick={onResetKey}
                        className="flex items-center justify-center gap-2 p-2 w-full rounded-lg bg-slate-800 border border-slate-700 hover:bg-red-950/30 hover:border-red-900/50 hover:text-red-400 text-slate-400 text-xs transition-colors"
                    >
                        <KeyRound className="w-3 h-3" />
                        {t.changeKey}
                    </button>
                    
                    {hasLock && onRemoveLock && (
                         <button 
                            onClick={onRemoveLock}
                            className="flex items-center justify-center gap-2 p-2 w-full rounded-lg bg-slate-800 border border-slate-700 hover:bg-red-950/30 hover:border-red-900/50 hover:text-red-400 text-slate-400 text-xs transition-colors"
                        >
                            <ShieldAlert className="w-3 h-3" />
                            {t.lockRemove || "Remove PIN"}
                        </button>
                    )}
                </div>
            </div>

        </div>

        {/* FOOTER: Apply Button */}
        <div className="border-t border-slate-800 p-4 bg-slate-950 flex justify-end">
             <button 
                onClick={onClose}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-lg shadow-indigo-900/20 transition-all active:scale-95"
             >
                <Check className="w-4 h-4" />
                {language === 'ru' ? 'Применить' : 'Apply'}
             </button>
        </div>
    </div>
  );
};
