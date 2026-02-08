
import React, { useState } from 'react';
import { Lock, Unlock, Minus, Square, X, AlertOctagon } from 'lucide-react';
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
    const [lockInput, setLockInput] = useState('');
    const [lockError, setLockError] = useState('');
    const [showWipeModal, setShowWipeModal] = useState(false);

    const handleUnlockSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (onUnlock(lockInput)) {
            setLockInput('');
            setLockError('');
        } else {
            setLockError(t.lockError);
        }
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

            <div className={`no-drag w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-8 flex flex-col items-center text-center animate-in zoom-in duration-300 ${showWipeModal ? 'blur-sm scale-95 opacity-50 pointer-events-none' : ''}`}>
                <div className="bg-slate-800 p-4 rounded-full mb-4 ring-1 ring-indigo-500/30">
                    <Lock className="w-8 h-8 text-indigo-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-1">{t.lockTitle}</h2>
                <div className="text-[10px] font-mono text-slate-600 mb-6">v{APP_VERSION}</div>
                <form onSubmit={handleUnlockSubmit} className="w-full space-y-4">
                    <input
                        type="password"
                        inputMode="numeric"
                        value={lockInput}
                        onChange={(e) => {
                            setLockInput(e.target.value);
                            setLockError('');
                        }}
                        placeholder={t.lockPlaceholder}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-center text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono tracking-widest text-lg"
                        autoFocus
                    />
                    {lockError && <p className="text-red-400 text-xs animate-pulse">{lockError}</p>}
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2">
                        <Unlock className="w-4 h-4" />
                        <span>{t.lockBtn}</span>
                    </button>
                </form>

                <button 
                    onClick={() => setShowWipeModal(true)}
                    className="mt-6 text-[10px] text-slate-500 hover:text-red-400 transition-colors uppercase tracking-wider font-semibold"
                >
                    {t.lockForgot}
                </button>
            </div>
        </div>
    );
};
