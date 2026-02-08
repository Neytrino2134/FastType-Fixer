
import React, { useState, useEffect } from 'react';
import { Sparkles, Key, ExternalLink, Lock, ClipboardPaste, ArrowRight, Shield, ChevronLeft, ShieldCheck } from 'lucide-react';
import { Language } from '../../types';
import { getTranslation } from '../../utils/i18n';
import { APP_VERSION } from '../../utils/versionInfo';
import { useNotification } from '../../contexts/NotificationContext';

interface SetupViewProps {
    apiKey: string;
    setApiKey: (key: string) => void;
    language: Language;
    onStart: (key: string) => void;
    hasLock: boolean;
    onSetLock: (code: string) => void;
    onNavigateGuide: () => void;
    justFinishedGuide: boolean;
    setJustFinishedGuide: (v: boolean) => void;
    MuteButton: React.FC;
}

export const SetupView: React.FC<SetupViewProps> = ({
    apiKey,
    setApiKey,
    language,
    onStart,
    hasLock,
    onSetLock,
    onNavigateGuide,
    justFinishedGuide,
    setJustFinishedGuide,
    MuteButton
}) => {
    const t = getTranslation(language);
    const { addNotification } = useNotification();
    
    const [error, setError] = useState('');
    const [showPinMenu, setShowPinMenu] = useState(false);
    const [newLockInput, setNewLockInput] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (apiKey.trim().length < 10) {
            setError(language === 'ru' ? 'Ключ API выглядит слишком коротким.' : 'API Key looks too short.');
            return;
        }
        onStart(apiKey.trim());
        addNotification(language === 'ru' ? 'API Ключ сохранен' : 'API Key Saved', 'success');
    };

    const handlePinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newLockInput.trim().length > 0) {
            onSetLock(newLockInput.trim());
            addNotification(t.lockSaved || 'PIN saved', 'success');
            setShowPinMenu(false);
            setNewLockInput('');
        }
    };

    const handlePasteKey = async () => {
        setJustFinishedGuide(false);
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                setApiKey(text.trim());
                setError('');
            }
        } catch (e) {
            console.error('Failed to paste', e);
        }
    };

    const handleExternalLink = (url: string) => {
        if (window.require) {
            try {
                const { shell } = window.require('electron');
                shell.openExternal(url);
            } catch (e) {
                window.open(url, '_blank');
            }
        } else {
            window.open(url, '_blank');
        }
    };

    const step7TooltipText = {
        'ru': "Нажмите сюда, чтобы вставить API ключ",
        'en': "Click here to paste API key",
        'uz-latn': "API kalitni qo'yish uchun shu yerni bosing",
        'uz-cyrl': "API калитни қўйиш учун шу ерни босинг"
    }[language] || "Click here to paste API key";

    return (
        <div className="flex flex-col h-full">
            <div className="h-14 shrink-0 flex items-center justify-between px-4 gap-1 border-b border-slate-800 bg-slate-900/50 md:bg-transparent titlebar-drag-region">
                 <MuteButton />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 flex flex-col justify-center items-center">
                 <div className={`transition-all duration-300 w-full max-w-lg relative ${showPinMenu ? 'hidden' : 'block'}`}>

                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 pointer-events-none select-none">
                        <Sparkles className="w-96 h-96 text-indigo-600/10 blur-md animate-pulse duration-[3000ms]" />
                     </div>
                     
                     <div className="text-center mb-10 relative z-10">
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2 leading-tight">
                            <span className="block text-slate-200 mb-1">
                                {language === 'ru' ? 'Добро пожаловать в' : language === 'uz-latn' ? 'Fast Type AI ga' : language === 'uz-cyrl' ? 'Fast Type AI га' : 'Welcome to'}
                            </span>
                            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent drop-shadow-sm">
                                {language === 'uz-latn' || language === 'uz-cyrl' ? 'Xush kelibsiz' : 'Fast Type AI'}
                            </span>
                        </h1>
                        <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
                            <span className="text-[10px] font-mono text-slate-400 tracking-wider">v{APP_VERSION}</span>
                        </div>
                     </div>

                     <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-5 mb-4 relative z-10 shadow-xl">
                        <div className="flex items-start gap-4 mb-2">
                            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700 shrink-0">
                                <Key className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white leading-tight mb-1">{t.setupTitle}</h3>
                                <p className="text-sm text-slate-400 leading-snug">{t.setupDesc}</p>
                            </div>
                        </div>
                     </div>

                     <div className="bg-emerald-950/20 backdrop-blur-sm border border-emerald-500/20 rounded-xl p-3 mb-6 relative z-10 flex items-start gap-3 shadow-lg">
                         <div className="p-1.5 bg-emerald-500/10 rounded-lg shrink-0 mt-0.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                         </div>
                         <p className="text-[11px] text-emerald-100/70 leading-relaxed font-medium">
                             {t.securityNote}
                         </p>
                     </div>

                    <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                                    {t.apiKeyLabel}
                                </label>
                                <div className="flex items-center gap-3 text-[10px] font-medium">
                                    <button
                                        type="button"
                                        onClick={() => handleExternalLink("https://aistudio.google.com/app/apikey")}
                                        className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 group"
                                    >
                                        <span>{t.linkGetKey}</span>
                                        <ExternalLink className="w-3 h-3 group-hover:rotate-45 transition-transform" />
                                    </button>
                                    <span className="text-slate-700">|</span>
                                    <button
                                        type="button"
                                        onClick={onNavigateGuide}
                                        className="text-slate-500 hover:text-slate-300 transition-colors"
                                    >
                                        {t.linkTutorial}
                                    </button>
                                </div>
                            </div>
                            
                            <div className="relative group mb-1">
                                <div className="w-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[10px] px-3 py-2 rounded-xl flex items-center justify-center gap-2 mb-2">
                                    <Lock className="w-3 h-3 shrink-0" />
                                    <span className="text-center">{t.apiKeyTooltip}</span>
                                </div>
                            </div>

                            <div className="relative group">
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => {
                                        setApiKey(e.target.value);
                                        setError('');
                                        setJustFinishedGuide(false);
                                    }}
                                    placeholder="AIzaSy..."
                                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-4 pr-10 py-3.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 placeholder:text-slate-700 transition-all font-mono text-sm shadow-inner"
                                    autoFocus={!showPinMenu}
                                />
                                <button
                                    type="button"
                                    onClick={handlePasteKey}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                    title="Paste"
                                >
                                    <ClipboardPaste className="w-4 h-4" />
                                    
                                    {/* PASTE TOOLTIP - TRIGGERED AFTER GUIDE FINISH */}
                                    {justFinishedGuide && (
                                        <div className="absolute bottom-full right-0 mb-3 whitespace-nowrap z-50 animate-bounce">
                                            <div className="bg-indigo-600 text-white text-[10px] font-bold px-3 py-2 rounded-xl shadow-xl flex items-center gap-2 border border-indigo-400">
                                                <span>{step7TooltipText}</span>
                                                <div className="absolute -bottom-1 right-3 w-3 h-3 bg-indigo-600 rotate-45 border-r border-b border-indigo-400"></div>
                                            </div>
                                        </div>
                                    )}
                                </button>
                            </div>
                            {error && <p className="text-red-400 text-xs mt-2 ml-1 animate-pulse flex items-center gap-1"><span>•</span> {error}</p>}
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group shadow-lg shadow-indigo-900/20 hover:shadow-indigo-900/40 active:scale-95"
                        >
                            <span>{t.startBtn}</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                        
                        {!hasLock && (
                            <div className="pt-4 border-t border-slate-800/50 text-center">
                                <button
                                    type="button"
                                    onClick={() => setShowPinMenu(true)}
                                    className="inline-flex items-center gap-2 py-2 px-3 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-slate-800/50 transition-all text-xs font-medium"
                                >
                                    <Shield className="w-3.5 h-3.5" />
                                    <span>{t.btnCreatePin}</span>
                                </button>
                            </div>
                        )}
                    </form>
                 </div>

                 {/* PIN MENU OVERLAY */}
                 {showPinMenu && (
                     <div className="animate-in fade-in slide-in-from-right-4 duration-300 w-full max-w-lg relative z-20">
                         <button 
                            onClick={() => setShowPinMenu(false)}
                            className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-white mb-6 transition-colors uppercase tracking-wide"
                        >
                            <ChevronLeft className="w-3 h-3" />
                            {t.btnBack}
                        </button>

                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                <Shield className="w-6 h-6 text-emerald-400" />
                                {t.lockCreateTitle}
                            </h3>
                            <p className="text-sm text-slate-400">
                                {t.lockCreateDesc}
                            </p>
                        </div>

                        <form onSubmit={handlePinSubmit} className="space-y-6">
                            <div className="relative">
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    value={newLockInput}
                                    onChange={(e) => setNewLockInput(e.target.value)}
                                    placeholder="••••"
                                    autoFocus={showPinMenu}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 placeholder:text-slate-800 font-mono tracking-[0.5em] text-2xl text-center shadow-inner"
                                    maxLength={8}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={newLockInput.length < 3}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-95"
                            >
                                <span>{t.lockSetBtn}</span>
                                <Shield className="w-4 h-4" />
                            </button>
                        </form>
                     </div>
                 )}
            </div>
        </div>
    );
};
