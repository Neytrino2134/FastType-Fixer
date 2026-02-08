
import React, { useEffect, useRef } from 'react';
import { Language, Tab } from '../../types';
import { useTranslator } from '../../hooks/useTranslator';
import { getTranslation } from '../../utils/i18n';
import { ArrowRightLeft, Copy, Trash2, Languages, Loader2, Check, ChevronDown, Play, Pause, Send, ClipboardList } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { Tooltip } from '../Tooltip';

interface TranslatorInterfaceProps {
    language: Language;
    apiKey: string;
    transferRequest?: { text: string, target: Tab, timestamp: number } | null;
    onToggleClipboard?: () => void;
}

const SUPPORTED_LANGS = [
    { code: 'ru', label: 'Russian', flag: '🇷🇺' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'uz-latn', label: 'Uzbek (Lat)', flag: '🇺🇿' },
    { code: 'uz-cyrl', label: 'Uzbek (Cyr)', flag: '🇺🇿' },
];

export const TranslatorInterface: React.FC<TranslatorInterfaceProps> = ({ language, apiKey, transferRequest, onToggleClipboard }) => {
    const {
        inputText,
        setInputText,
        outputText,
        sourceLang,
        targetLang,
        isLoading,
        isLive,
        setIsLive,
        handleInputChange,
        triggerTranslation,
        toggleLive,
        changeSourceLang,
        changeTargetLang,
        swapLanguages,
        clearAll
    } = useTranslator(apiKey);

    const t = getTranslation(language);
    const { addNotification } = useNotification();
    const [copiedInput, setCopiedInput] = React.useState(false);
    const [copiedOutput, setCopiedOutput] = React.useState(false);
    
    // Track the last processed timestamp to prevent infinite loops on re-renders
    const lastProcessedRef = useRef<number>(0);

    // Monitor incoming transfer requests
    useEffect(() => {
        if (transferRequest && transferRequest.target === 'translator') {
            // Only process if it's a new request (newer timestamp)
            if (transferRequest.timestamp > lastProcessedRef.current) {
                lastProcessedRef.current = transferRequest.timestamp;
                
                // 1. Populate text directly (bypassing auto-translate trigger)
                setInputText(transferRequest.text);
                
                // 2. Pause Live Translation so user can select language and click button manually
                setIsLive(false);
            }
        }
    }, [transferRequest, setInputText, setIsLive]);

    const handleCopy = async (text: string, isInput: boolean) => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            if (isInput) {
                setCopiedInput(true);
                setTimeout(() => setCopiedInput(false), 2000);
            } else {
                setCopiedOutput(true);
                setTimeout(() => setCopiedOutput(false), 2000);
            }
            addNotification(t.clipboardCopy + "!", 'success');
        } catch (e) {
            addNotification("Failed to copy", 'error');
        }
    };

    const LangSelector = ({ 
        value, 
        onChange, 
        exclude 
    }: { 
        value: string, 
        onChange: (val: string) => void,
        exclude?: string
    }) => (
        <div className="relative group">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="appearance-none bg-slate-800 text-slate-200 text-xs font-bold py-2 pl-3 pr-8 rounded-lg border border-slate-700 hover:border-indigo-500 hover:bg-slate-700/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer w-[110px] sm:w-[130px]"
            >
                {SUPPORTED_LANGS.map((lang) => (
                    <option key={lang.code} value={lang.code} className="bg-slate-800 text-slate-300">
                        {lang.flag} {lang.label}
                    </option>
                ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none group-hover:text-indigo-400 transition-colors" />
        </div>
    );

    const getLangLabel = (code: string) => SUPPORTED_LANGS.find(l => l.code === code)?.label || code;

    return (
        <div className="flex flex-col h-full w-full bg-slate-900 overflow-hidden select-none">
            
            {/* Toolbar */}
            <div className="shrink-0 h-16 flex items-center justify-between px-4 md:px-6 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm z-10">
                <div className="flex items-center gap-2 text-indigo-400 mr-2 md:mr-0">
                    <Languages className="w-5 h-5 hidden sm:block" />
                    <span className="font-semibold text-xs sm:text-sm tracking-wide uppercase hidden md:inline">{t.transTitle}</span>
                </div>

                {/* Language Controls */}
                <div className="flex items-center gap-2">
                    <LangSelector 
                        value={sourceLang} 
                        onChange={changeSourceLang} 
                    />
                    
                    <button 
                        onClick={swapLanguages}
                        className="p-2 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors bg-slate-800 border border-slate-700 active:rotate-180 duration-300"
                        title="Swap Languages"
                    >
                        <ArrowRightLeft className="w-4 h-4" />
                    </button>

                    <LangSelector 
                        value={targetLang} 
                        onChange={changeTargetLang} 
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Tooltip content={isLive ? (language === 'ru' ? "Авто-перевод ВКЛ" : "Live ON") : (language === 'ru' ? "Авто-перевод ВЫКЛ (Пауза)" : "Live OFF (Paused)")}>
                        <button 
                            onClick={toggleLive}
                            className={`p-2 rounded-lg transition-colors border ${
                                isLive 
                                ? 'text-amber-400 bg-amber-950/30 border-amber-900/50 hover:bg-amber-900/50' 
                                : 'text-emerald-400 bg-emerald-950/30 border-emerald-900/50 hover:bg-emerald-900/50'
                            }`}
                        >
                            {isLive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                    </Tooltip>

                    <div className="w-px h-6 bg-slate-800 mx-1"></div>

                    {onToggleClipboard && (
                        <Tooltip content={t.clipboardTitle || "Clipboard"}>
                            <button 
                                onClick={onToggleClipboard}
                                className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                                <ClipboardList className="w-4 h-4" />
                            </button>
                        </Tooltip>
                    )}

                    <Tooltip content={t.transClear}>
                        <button 
                            onClick={clearAll}
                            disabled={!inputText}
                            className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </Tooltip>
                </div>
            </div>

            {/* Split View */}
            <div className="flex-1 flex flex-col md:flex-col overflow-hidden">
                
                {/* INPUT AREA (TOP) */}
                <div className="flex-1 relative border-b border-slate-800/50 bg-slate-900 p-4 md:p-6 group">
                    <div className="absolute top-3 left-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest pointer-events-none">
                        {getLangLabel(sourceLang)}
                    </div>
                    
                    <textarea
                        value={inputText}
                        onChange={(e) => handleInputChange(e.target.value)}
                        placeholder={t.transPlaceholder}
                        className="w-full h-full bg-transparent resize-none focus:outline-none text-slate-200 text-lg md:text-xl leading-relaxed placeholder:text-slate-700 pt-6 custom-scrollbar"
                        spellCheck={false}
                    />

                    {/* Copy Input Button */}
                    {inputText && (
                        <button 
                            onClick={() => handleCopy(inputText, true)}
                            className="absolute top-4 right-16 p-2 rounded-lg bg-slate-800/0 text-slate-600 group-hover:bg-slate-800 group-hover:text-slate-300 transition-all opacity-0 group-hover:opacity-100"
                            title={t.transCopy}
                        >
                             {copiedInput ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                    )}

                    {/* MANUAL SEND BUTTON */}
                    <div className="absolute bottom-4 right-6">
                        <button 
                            onClick={triggerTranslation}
                            disabled={isLoading || !inputText}
                            className={`
                                p-3 rounded-full shadow-lg transition-all active:scale-95 flex items-center justify-center
                                ${isLoading 
                                    ? 'bg-slate-800 cursor-not-allowed text-slate-500' 
                                    : isLive 
                                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white' 
                                        : 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse'
                                }
                            `}
                            title={language === 'ru' ? "Перевести" : "Translate"}
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* OUTPUT AREA (BOTTOM) */}
                <div className="flex-1 relative bg-slate-950/30 p-4 md:p-6 group">
                     <div className="absolute top-3 left-6 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                            {getLangLabel(targetLang)}
                        </span>
                        {isLoading && <Loader2 className="w-3 h-3 text-indigo-500 animate-spin" />}
                     </div>

                    <textarea
                        value={outputText}
                        readOnly
                        placeholder={isLoading ? t.waveProcessing : (isLive ? t.transOutput : (language === 'ru' ? "Перевод на паузе..." : "Translation paused..."))}
                        className="w-full h-full bg-transparent resize-none focus:outline-none text-indigo-100 text-lg md:text-xl leading-relaxed placeholder:text-slate-700/50 pt-6 custom-scrollbar font-medium"
                    />

                    {outputText && (
                        <button 
                            onClick={() => handleCopy(outputText, false)}
                            className="absolute top-4 right-6 p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:bg-indigo-600 hover:text-white transition-all shadow-lg"
                            title={t.transCopy}
                        >
                            {copiedOutput ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
};
