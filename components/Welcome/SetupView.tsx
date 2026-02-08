
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Key, ExternalLink, Lock, ClipboardPaste, ArrowRight, Shield, ChevronLeft, ShieldCheck, Zap, Hash, Type, X } from 'lucide-react';
import { Language, CorrectionSettings } from '../../types';
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
    settings: CorrectionSettings;
    onUpdateSettings: (newSettings: CorrectionSettings) => void;
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
    MuteButton,
    settings,
    onUpdateSettings
}) => {
    const t = getTranslation(language);
    const { addNotification } = useNotification();
    
    const [error, setError] = useState('');
    const [showPinMenu, setShowPinMenu] = useState(false);
    
    // PIN Logic
    const [pinLength, setPinLength] = useState<4 | 6>(4);
    const [pinDigits, setPinDigits] = useState<string[]>(Array(4).fill(''));
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Reset PIN state when opening menu
    useEffect(() => {
        if (showPinMenu) {
            setPinDigits(Array(pinLength).fill(''));
            setTimeout(() => {
                inputRefs.current[0]?.focus();
            }, 100);
        }
    }, [showPinMenu, pinLength]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (apiKey.trim().length < 10) {
            setError(language === 'ru' ? 'Ключ API выглядит слишком коротким.' : 'API Key looks too short.');
            return;
        }
        onStart(apiKey.trim());
        addNotification(language === 'ru' ? 'API Ключ сохранен' : 'API Key Saved', 'success');
    };

    const handlePinChange = (index: number, value: string) => {
        const newPin = [...pinDigits];
        // Take only the last char if multiple typed (handling rapid input)
        const val = value.slice(-1); 
        newPin[index] = val;
        setPinDigits(newPin);

        // Auto-advance
        if (val && index < pinLength - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const code = pinDigits.join('');
        if (code.length === pinLength) {
            onSetLock(code);
            addNotification(t.lockSaved || 'PIN saved', 'success');
            setShowPinMenu(false);
            setPinDigits(Array(pinLength).fill(''));
        }
    };

    const handlePasteKey = async () => {
        setJustFinishedGuide(false);
        let pastedText = '';

        if (window.require) {
            try {
                const { clipboard } = window.require('electron');
                pastedText = clipboard.readText();
            } catch (e) {
                console.warn("Electron paste failed, trying web fallback", e);
            }
        }

        if (!pastedText) {
            try {
                pastedText = await navigator.clipboard.readText();
            } catch (e) {
                console.error('Failed to paste from web API', e);
            }
        }

        if (pastedText) {
            setApiKey(pastedText.trim());
            setError('');
        } else {
            if (language === 'ru') {
                setError('Буфер обмена пуст или недоступен');
            } else {
                setError('Clipboard is empty or inaccessible');
            }
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

    const toggleFreeTier = () => {
        const nextState = !settings.isFreeTier;
        onUpdateSettings({ ...settings, isFreeTier: nextState });
        
        const tierName = nextState 
            ? (language === 'ru' ? 'Бесплатный (Free)' : 'Free Tier') 
            : (language === 'ru' ? 'Платный (Paid)' : 'Paid Tier');
            
        const desc = nextState
            ? (language === 'ru' ? 'Аудио/видео функции отключены' : 'Audio/Video features disabled')
            : (language === 'ru' ? 'Все функции разблокированы' : 'All features unlocked');

        addNotification(`${tierName}: ${desc}`, nextState ? 'info' : 'success', 3000);
    };

    const step7TooltipText = {
        'ru': "Нажмите сюда, чтобы вставить API ключ",
        'en': "Click here to paste API key",
        'uz-latn': "API kalitni qo'yish uchun shu yerni bosing",
        'uz-cyrl': "API калитни қўйиш учун шу ерни босинг"
    }[language] || "Click here to paste API key";

    return (
        <div className="flex flex-col h-full relative">
            <div className="h-14 shrink-0 flex items-center justify-between px-4 gap-1 border-b border-slate-800 bg-slate-900/50 md:bg-transparent titlebar-drag-region z-20">
                 <MuteButton />
            </div>

            <div className={`flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 flex flex-col justify-center items-center relative transition-opacity duration-300 ${showPinMenu ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                 
                 {/* MAIN CONTENT LAYER */}
                 <div className="w-full max-w-lg relative">

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

                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        <div>
                            {/* Labels Row */}
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
                            
                            {/* Warning Tooltip Row */}
                            <div className="relative group mb-1">
                                <div className="w-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[10px] px-3 py-2 rounded-xl flex items-center justify-center gap-2 mb-2">
                                    <Lock className="w-3 h-3 shrink-0" />
                                    <span className="text-center">{t.apiKeyTooltip}</span>
                                </div>
                            </div>

                            {/* Input + Switch Row */}
                            <div className="flex items-center gap-4">
                                <div className="relative group flex-1">
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
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-colors z-20 cursor-pointer"
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

                                {/* TOGGLE SWITCH */}
                                <div className="flex flex-col items-center gap-1.5 shrink-0">
                                    <button
                                        type="button"
                                        onClick={toggleFreeTier}
                                        className={`w-14 h-8 rounded-full p-1 flex items-center transition-all duration-300 focus:outline-none shadow-inner border ${settings.isFreeTier ? 'bg-slate-800 border-slate-700/50' : 'bg-indigo-600 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]'}`}
                                        title={settings.isFreeTier ? (language === 'ru' ? 'Переключить на платный' : 'Switch to Paid') : (language === 'ru' ? 'Переключить на бесплатный' : 'Switch to Free')}
                                    >
                                        <div className={`w-6 h-6 rounded-full bg-white shadow-lg transform transition-transform duration-300 flex items-center justify-center ${settings.isFreeTier ? 'translate-x-0' : 'translate-x-6'}`}>
                                             {settings.isFreeTier ? (
                                                 <div className="w-2 h-2 rounded-full bg-slate-400" /> 
                                             ) : (
                                                 <Zap className="w-3.5 h-3.5 text-indigo-600 fill-current" />
                                             )}
                                        </div>
                                    </button>
                                    <span className={`text-[9px] font-bold uppercase tracking-wider transition-colors ${settings.isFreeTier ? 'text-slate-500' : 'text-indigo-400'}`}>
                                        {settings.isFreeTier ? (language === 'ru' ? 'Free' : 'Free') : (language === 'ru' ? 'Pro' : 'Paid')}
                                    </span>
                                </div>
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
            </div>

            {/* BEAUTIFUL PIN CREATION OVERLAY (ABSOLUTE TO FIX SCROLLING) */}
            {showPinMenu && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="animate-in zoom-in-95 duration-300 w-full max-w-lg flex flex-col items-center">
                    
                        {/* Glassmorphic Container */}
                        <div className="w-full bg-slate-900/90 border border-slate-700 shadow-2xl rounded-2xl p-8 relative overflow-hidden ring-1 ring-white/5">
                            
                            {/* Decorative Background Glow */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-emerald-500/20 blur-[80px] rounded-full pointer-events-none"></div>

                            {/* Close Button */}
                            <button 
                                onClick={() => setShowPinMenu(false)}
                                className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white bg-transparent hover:bg-slate-800 rounded-full transition-colors z-20"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Centered Header */}
                            <div className="text-center mb-8 relative z-10">
                                <div className="inline-flex p-4 bg-emerald-500/10 rounded-full mb-4 ring-1 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)] animate-pulse">
                                    <ShieldCheck className="w-8 h-8 text-emerald-400" />
                                </div>
                                <h3 className="text-2xl font-black text-white tracking-tight mb-2">
                                    {t.lockCreateTitle}
                                </h3>
                                <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-xs mx-auto">
                                    {t.lockCreateDesc}
                                </p>
                            </div>

                            {/* Segmented Control for Length */}
                            <div className="flex justify-center mb-8 relative z-10">
                                <div className="flex bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 shadow-inner">
                                    <button 
                                        type="button"
                                        onClick={() => { setPinLength(4); setPinDigits(Array(4).fill('')); }}
                                        className={`px-6 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${pinLength === 4 ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
                                    >
                                        4 Digits
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => { setPinLength(6); setPinDigits(Array(6).fill('')); }}
                                        className={`px-6 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${pinLength === 6 ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
                                    >
                                        6 Digits
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handlePinSubmit} className="space-y-8 relative z-10">
                                {/* Inputs */}
                                <div className="flex justify-center gap-3 transition-all duration-500 ease-out">
                                    {pinDigits.map((digit, idx) => (
                                        <input
                                            key={idx}
                                            ref={(el) => { inputRefs.current[idx] = el; }}
                                            type="password"
                                            inputMode="numeric"
                                            value={digit}
                                            onChange={(e) => handlePinChange(idx, e.target.value)}
                                            onKeyDown={(e) => handlePinKeyDown(idx, e)}
                                            className={`
                                                w-14 h-20 bg-slate-950 border rounded-2xl text-center text-3xl font-bold text-emerald-400 
                                                focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 
                                                transition-all duration-200 shadow-inner
                                                ${digit ? 'border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'border-slate-800'}
                                            `}
                                            autoFocus={idx === 0}
                                            maxLength={1}
                                        />
                                    ))}
                                </div>

                                <div className="flex gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => setShowPinMenu(false)}
                                        className="flex-1 py-3.5 rounded-xl border border-slate-700 text-slate-300 font-bold hover:bg-slate-800 transition-all text-sm"
                                    >
                                        {t.btnBack}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={pinDigits.join('').length !== pinLength}
                                        className="flex-[2] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 active:scale-95 text-sm"
                                    >
                                        <span>{t.lockSetBtn}</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
