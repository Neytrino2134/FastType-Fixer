import React from 'react';
import { Language } from '../../types';
import { useTranslator } from '../../hooks/useTranslator';
import { getTranslation } from '../../utils/i18n';
import { ArrowRightLeft, Copy, Trash2, Languages, Loader2, Check } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';

interface TranslatorInterfaceProps {
    language: Language;
    apiKey: string;
}

export const TranslatorInterface: React.FC<TranslatorInterfaceProps> = ({ language, apiKey }) => {
    const {
        inputText,
        outputText,
        direction,
        isLoading,
        handleInputChange,
        toggleDirection,
        swapLanguages,
        clearAll
    } = useTranslator(apiKey);

    const t = getTranslation(language);
    const { addNotification } = useNotification();
    const [copiedInput, setCopiedInput] = React.useState(false);
    const [copiedOutput, setCopiedOutput] = React.useState(false);

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

    return (
        <div className="flex flex-col h-full w-full bg-slate-900 overflow-hidden">
            
            {/* Toolbar */}
            <div className="shrink-0 h-14 flex items-center justify-between px-4 md:px-6 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm z-10">
                <div className="flex items-center gap-2 text-indigo-400">
                    <Languages className="w-5 h-5" />
                    <span className="font-semibold text-sm tracking-wide uppercase">{t.transTitle}</span>
                </div>

                {/* Direction Switcher */}
                <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700/50">
                    <span className={`px-3 py-1 text-xs font-bold rounded transition-colors ${direction === 'en-ru' ? 'text-indigo-300' : 'text-slate-500'}`}>
                        EN
                    </span>
                    <button 
                        onClick={swapLanguages}
                        className="p-1.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        title="Swap Languages"
                    >
                        <ArrowRightLeft className="w-4 h-4" />
                    </button>
                    <span className={`px-3 py-1 text-xs font-bold rounded transition-colors ${direction === 'ru-en' ? 'text-indigo-300' : 'text-slate-500'}`}>
                        RU
                    </span>
                </div>

                <button 
                    onClick={clearAll}
                    disabled={!inputText}
                    className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                    title={t.transClear}
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Split View */}
            <div className="flex-1 flex flex-col md:flex-col overflow-hidden">
                
                {/* INPUT AREA (TOP) */}
                <div className="flex-1 relative border-b border-slate-800/50 bg-slate-900 p-4 md:p-6 group">
                    <div className="absolute top-3 left-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest pointer-events-none">
                        {direction === 'en-ru' ? 'English' : 'Russian'}
                    </div>
                    
                    <textarea
                        value={inputText}
                        onChange={(e) => handleInputChange(e.target.value)}
                        placeholder={t.transPlaceholder}
                        className="w-full h-full bg-transparent resize-none focus:outline-none text-slate-200 text-lg md:text-xl leading-relaxed placeholder:text-slate-700 pt-6 custom-scrollbar"
                        spellCheck={false}
                    />

                    {inputText && (
                        <button 
                            onClick={() => handleCopy(inputText, true)}
                            className="absolute top-4 right-6 p-2 rounded-lg bg-slate-800/0 text-slate-600 group-hover:bg-slate-800 group-hover:text-slate-300 transition-all opacity-0 group-hover:opacity-100"
                            title={t.transCopy}
                        >
                             {copiedInput ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                    )}
                </div>

                {/* OUTPUT AREA (BOTTOM) */}
                <div className="flex-1 relative bg-slate-950/30 p-4 md:p-6 group">
                     <div className="absolute top-3 left-6 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                            {direction === 'en-ru' ? 'Russian' : 'English'}
                        </span>
                        {isLoading && <Loader2 className="w-3 h-3 text-indigo-500 animate-spin" />}
                     </div>

                    <textarea
                        value={outputText}
                        readOnly
                        placeholder={isLoading ? t.waveProcessing : t.transOutput}
                        className="w-full h-full bg-transparent resize-none focus:outline-none text-indigo-100 text-lg md:text-xl leading-relaxed placeholder:text-slate-800 pt-6 custom-scrollbar font-medium"
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