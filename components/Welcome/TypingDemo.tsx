
import React, { useState, useEffect } from 'react';
import { Language } from '../../types';
import { getTranslation } from '../../utils/i18n';

interface TypingDemoProps {
    language: Language;
}

export const TypingDemo: React.FC<TypingDemoProps> = ({ language }) => {
    const t = getTranslation(language);
    const [text, setText] = useState(t.wizDemoInput);
    const [status, setStatus] = useState<'typing' | 'fixing' | 'done'>('typing');

    useEffect(() => {
        const cycle = () => {
            // 0s: Reset
            setText(t.wizDemoInput);
            setStatus('typing');

            // 1.5s: Start Fix
            setTimeout(() => {
                setStatus('fixing');
            }, 1500);

            // 2.5s: Done
            setTimeout(() => {
                setText(t.wizDemoOutput);
                setStatus('done');
            }, 2500);
        };

        cycle();
        const interval = setInterval(cycle, 5000);
        return () => clearInterval(interval);
    }, [language, t]);

    return (
        <div className="w-full max-w-sm bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-lg mb-6 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-2 border-b border-slate-800 pb-2">
                <div className={`w-2 h-2 rounded-full ${status === 'typing' ? 'bg-slate-500' : status === 'fixing' ? 'bg-purple-500 animate-pulse' : 'bg-emerald-500'}`} />
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                    {status === 'typing' ? 'Input' : status === 'fixing' ? 'AI Processing' : 'Fixed'}
                </span>
            </div>
            <div className={`text-lg font-medium transition-all duration-500 ${
                status === 'typing' ? 'text-slate-400' : 
                status === 'fixing' ? 'text-purple-300 blur-[1px]' : 
                'text-emerald-400 scale-105 origin-left'
            }`}>
                {text}
            </div>
            
            {/* Scanline Effect */}
            {status === 'fixing' && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent w-full h-full animate-[shimmer_1s_infinite] pointer-events-none" />
            )}
        </div>
    );
};
