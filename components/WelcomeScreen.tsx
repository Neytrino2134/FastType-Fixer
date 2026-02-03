

import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Keyboard, Wand2, Zap, Globe, Lock, Unlock, Shield } from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../utils/i18n';
import { useNotification } from '../contexts/NotificationContext';
import { APP_VERSION } from '../utils/versionInfo';

interface WelcomeScreenProps {
  initialKey: string;
  onStart: (key: string) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  isLocked: boolean;
  hasLock: boolean;
  onUnlock: (code: string) => boolean;
  onSetLock: (code: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
    initialKey, 
    onStart, 
    language, 
    setLanguage,
    isLocked,
    hasLock,
    onUnlock,
    onSetLock
}) => {
  const [apiKey, setApiKey] = useState(initialKey);
  const [error, setError] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Security State
  const [lockInput, setLockInput] = useState('');
  const [newLockInput, setNewLockInput] = useState('');
  const [lockError, setLockError] = useState('');

  const { addNotification } = useNotification();
  const t = getTranslation(language);

  useEffect(() => {
    // Trigger entrance animation
    setIsAnimating(true);
    setApiKey(initialKey);
  }, [initialKey]);

  // Clean errors when typing
  useEffect(() => { setLockError(''); }, [lockInput, newLockInput]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim().length < 10) {
      setError(language === 'ru' ? 'Ключ API выглядит слишком коротким.' : 'API Key looks too short.');
      return;
    }

    // Set lock if provided in setup phase
    if (newLockInput.trim().length > 0) {
        onSetLock(newLockInput.trim());
        addNotification(t.lockSaved || 'PIN saved', 'success');
    }

    onStart(apiKey.trim());
    addNotification(
      language === 'ru' ? 'API Ключ сохранен' : 'API Key Saved', 
      'success'
    );
  };

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUnlock(lockInput)) {
        setLockInput('');
    } else {
        setLockError(t.lockError);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ru' ? 'en' : 'ru');
  };

  // --- LOCKED VIEW ---
  if (isLocked) {
      return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950 text-slate-200 h-screen w-screen overflow-hidden titlebar-drag-region">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-900/20 blur-[80px] rounded-full"></div>
            </div>

            <div className={`no-drag w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-8 flex flex-col items-center text-center transition-all duration-500 transform ${isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                <div className="bg-slate-800 p-4 rounded-full mb-6 ring-1 ring-indigo-500/30">
                    <Lock className="w-8 h-8 text-indigo-400" />
                </div>
                
                <h2 className="text-xl font-bold text-white mb-2">{t.lockTitle}</h2>
                <p className="text-sm text-slate-500 mb-6">{t.lockDesc}</p>

                <form onSubmit={handleUnlockSubmit} className="w-full space-y-4">
                    <div className="relative">
                        <input
                            type="password"
                            value={lockInput}
                            onChange={(e) => setLockInput(e.target.value)}
                            placeholder={t.lockPlaceholder}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-center text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 placeholder:text-slate-700 font-mono tracking-widest text-lg"
                            autoFocus
                        />
                    </div>
                    {lockError && <p className="text-red-400 text-xs animate-pulse">{lockError}</p>}
                    
                    <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
                    >
                        <Unlock className="w-4 h-4" />
                        <span>{t.lockBtn}</span>
                    </button>
                </form>
            </div>
        </div>
      );
  }

  // --- STANDARD WELCOME VIEW ---
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950 text-slate-200 h-screen w-screen overflow-hidden titlebar-drag-region">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-indigo-900/20 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-900/10 blur-[120px] rounded-full"></div>
      </div>

      {/* Language Toggle */}
      <div className="absolute top-6 right-6 z-50 no-drag">
        <button 
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 backdrop-blur border border-slate-700 rounded-full text-xs font-semibold hover:bg-slate-800 transition-colors"
        >
            <Globe className="w-3 h-3 text-indigo-400" />
            <span className={language === 'ru' ? 'text-white' : 'text-slate-500'}>RU</span>
            <span className="text-slate-600">/</span>
            <span className={language === 'en' ? 'text-white' : 'text-slate-500'}>EN</span>
        </button>
      </div>

      <div className={`no-drag w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-0 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-700 transform ${isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        
        {/* Left Side: Info & Greeting */}
        <div className="p-8 md:p-10 bg-gradient-to-br from-slate-900 to-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between relative group">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-900/40">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">FastType AI</h1>
            </div>

            <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
              {t.welcomeTitle} <br />
              <span className="text-indigo-400">{t.welcomeSubtitle}</span>
            </h2>
            
            <p className="text-slate-400 leading-relaxed mb-8 text-sm">
              {t.welcomeDesc}
            </p>

            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-800 rounded-lg shrink-0">
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">{t.feature1Title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{t.feature1Desc}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-800 rounded-lg shrink-0">
                  <Wand2 className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">{t.feature2Title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{t.feature2Desc}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-800 rounded-lg shrink-0">
                  <Keyboard className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">{t.feature3Title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{t.feature3Desc}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/50">
             <div className="flex flex-col gap-2">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">Version {APP_VERSION} &bull; Powered by Google Gemini</p>
                <div className="flex flex-col gap-0.5">
                   <span className="text-[10px] text-slate-500 font-medium">MeowMasterArt</span>
                   <a href="mailto:MeowMasterArt@gmail.com" className="text-[10px] text-slate-600 hover:text-indigo-400 transition-colors">MeowMasterArt@gmail.com</a>
                </div>
             </div>
          </div>
        </div>

        {/* Right Side: Forms */}
        <div className="p-8 md:p-10 flex flex-col justify-center bg-slate-950/50">
          <div className="max-w-xs mx-auto w-full">
            <h3 className="text-lg font-semibold text-white mb-2">{t.setupTitle}</h3>
            <p className="text-sm text-slate-400 mb-6">
              {t.setupDesc}
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* API KEY INPUT */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  {t.apiKeyLabel}
                </label>
                <div className="relative group">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setError('');
                    }}
                    placeholder="AIzaSy..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 placeholder:text-slate-700 transition-all font-mono text-sm"
                  />
                  {initialKey && apiKey === initialKey && (
                     <div className="absolute right-3 top-3.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                     </div>
                  )}
                </div>
                {error && <p className="text-red-400 text-xs mt-2 animate-pulse">{error}</p>}
              </div>

              {/* OPTIONAL PIN CREATION (Only if not set) */}
              {!hasLock && (
                  <div className="pt-2 border-t border-slate-800/50">
                     <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-3 h-3 text-slate-500" />
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                           {t.lockCreateTitle}
                        </label>
                     </div>
                     <input
                        type="password"
                        value={newLockInput}
                        onChange={(e) => setNewLockInput(e.target.value)}
                        placeholder={t.lockCreatePlaceholder}
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 placeholder:text-slate-700 transition-all font-mono text-sm"
                     />
                     <p className="text-[10px] text-slate-600 mt-1.5">{t.lockCreateDesc}</p>
                  </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group shadow-lg shadow-indigo-900/20 hover:shadow-indigo-900/40 hover:-translate-y-0.5"
              >
                <span>{t.startBtn}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            <div className="mt-8 text-center">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors border-b border-indigo-400/30 hover:border-indigo-300"
              >
                {t.getKeyLink}
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
