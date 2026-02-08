import React, { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, Minus, Square, X, AlertOctagon, RotateCcw } from 'lucide-react';
import { getTranslation } from '../../utils/i18n';
import { Language } from '../../types';
import { APP_VERSION } from '../../utils/versionInfo';

interface LockedViewProps {
    language: Language;
    onUnlock: (code: string) => boolean;
    onWindowControl: (action: 'minimize' | 'maximize' | 'close') => void;
    onWipeData: () => void;
}

export const LockedView: React.FC<LockedViewProps> = ({
    language,
    onUnlock,
    onWindowControl,
    onWipeData
}) => {
    const t = getTranslation(language);
    const [lockError, setLockError] = useState('');
    const [showWipeModal, setShowWipeModal] = useState(false);
    
    // Split Input State
    const [pinLength, setPinLength] = useState(4);
    const [pinDigits, setPinDigits] = useState<string[]>([]);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Determine PIN Length on Mount
    useEffect(() => {
        const storedCode = localStorage.getItem('fasttype_lock_code') || '';
        const len = storedCode.length > 0 ? storedCode.length : 4;
        setPinLength(len);
        setPinDigits(Array(len).fill(''));
        
        // Focus first input
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }, []);

    const handlePinChange = (index: number, value: string) => {
        setLockError(''); // Clear error on typing
        const newPin = [...pinDigits];
        // Take only last char
        const val = value.slice(-1);
        newPin[index] = val;
        setPinDigits(newPin);

        // Auto-advance
        if (val && index < pinLength - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-Submit Check
        const fullCode = newPin.join('');
        if (fullCode.length === pinLength && val !== '') {
            // Slight delay for visual feedback
            setTimeout(() => {
                attemptUnlock(fullCode);
            }, 50);
        }
    };

    const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const attemptUnlock = (code: string) => {
        if (onUnlock(code)) {
            // Success handled by parent unmounting this view
        } else {
            setLockError(t.lockError);
            setPinDigits(Array(pinLength).fill(''));
            inputRefs.current[0]?.focus();
        }
    };

    const handleUnlockSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        attemptUnlock(pinDigits.join(''));
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 text-slate-200 h-full w-full overflow-hidden titlebar-drag-region p-4">
            
            <div className="absolute top-0 right-0 p-3 flex gap-2 no-drag z-50">
                <button onClick={() => onWindowControl('minimize')} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"><Minus className="w-4 h-4" /></button>
                <button onClick={() => onWindowControl('maximize')} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"><Square className="w-3.5 h-3.5" /></button>
                <button onClick={() => onWindowControl('close')} className="p-1.5 rounded hover:bg-red-600 text-slate-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
            </div>

            {showWipeModal && (
                <div className="absolute inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-red-950/20 border border-red-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl ring-1 ring-red-900/50">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="p-4 bg-red-900/30 rounded-full text-red-500">
                                <AlertOctagon className="w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-bold text-red-400">{t.wipeTitle}</h3>
                            <p className="text-sm text-red-200/70 whitespace-pre-line leading-relaxed">
                                {t.wipeDesc}
                            </p>
                            <div className="flex flex-col w-full gap-3 pt-2">
                                <button 
                                    onClick={onWipeData}
                                    className="w-full py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-lg shadow-red-900/40"
                                >
                                    {t.wipeConfirm}
                                </button>
                                <button 
                                    onClick={() => setShowWipeModal(false)}
                                    className="w-full py-2.5 rounded-lg border border-red-900/50 text-red-300 hover:bg-red-900/20 transition-all text-sm"
                                >
                                    {t.wipeCancel}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className={`no-drag w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-8 flex flex-col items-center text-center animate-in zoom-in duration-300 ${showWipeModal ? 'blur-sm scale-95 opacity-50 pointer-events-none' : ''}`}>
                <div className="bg-slate-800 p-4 rounded-full mb-4 ring-1 ring-indigo-500/30">
                    <Lock className="w-8 h-8 text-indigo-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-1">{t.lockTitle}</h2>
                <div className="text-[10px] font-mono text-slate-600 mb-8">v{APP_VERSION}</div>
                
                <form onSubmit={handleUnlockSubmit} className="w-full space-y-6">
                    {/* Split Inputs */}
                    <div className="flex justify-center gap-3">
                        {pinDigits.map((digit, idx) => (
                            <input
                                key={idx}
                                ref={(el) => { inputRefs.current[idx] = el; }}
                                type="password"
                                inputMode="text"
                                value={digit}
                                onChange={(e) => handlePinChange(idx, e.target.value)}
                                onKeyDown={(e) => handlePinKeyDown(idx, e)}
                                className={`
                                    bg-slate-950 border rounded-xl text-center text-xl font-bold text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner
                                    ${pinLength === 6 ? 'w-10 h-12' : 'w-14 h-16'}
                                    ${lockError ? 'border-red-500 text-red-400' : digit ? 'border-indigo-500/50' : 'border-slate-700'}
                                `}
                                autoFocus={idx === 0}
                                maxLength={1}
                            />
                        ))}
                    </div>

                    {lockError && <p className="text-red-400 text-xs font-bold animate-pulse tracking-wide uppercase">{lockError}</p>}
                    
                    {/* Hidden Submit for Enter Key support on last field if auto doesn't catch */}
                    <button type="submit" className="hidden" />
                </form>

                <div className="mt-8 flex gap-4 w-full justify-center">
                    <button 
                        onClick={() => { setPinDigits(Array(pinLength).fill('')); inputRefs.current[0]?.focus(); }}
                        className="text-slate-500 hover:text-white transition-colors p-2 rounded-full hover:bg-slate-800"
                        title="Reset"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setShowWipeModal(true)}
                        className="text-[10px] text-slate-500 hover:text-red-400 transition-colors uppercase tracking-wider font-bold py-2"
                    >
                        {t.lockForgot}
                    </button>
                </div>
            </div>
        </div>
    );
};