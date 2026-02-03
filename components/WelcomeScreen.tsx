
import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Keyboard, Wand2, Zap, Globe, Lock, Unlock, Shield, ChevronLeft } from 'lucide-react';
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
  isExiting: boolean;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
    initialKey, 
    onStart, 
    language, 
    setLanguage,
    isLocked,
    hasLock,
    onUnlock,
    onSetLock,
    isExiting
}) => {
  const [apiKey, setApiKey] = useState(initialKey);
  const [error, setError] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Security State
  const [lockInput, setLockInput] = useState('');
  const [newLockInput, setNewLockInput] = useState('');
  const [lockError, setLockError] = useState('');
  const [showPinMenu, setShowPinMenu] = useState(false);

  const { addNotification } = useNotification();
  const t = getTranslation(language);

  useEffect(() => {
    // Trigger entrance animation on mount
    const timer = setTimeout(() => setIsAnimating(true), 50);
    setApiKey(initialKey);
    return () => clearTimeout(timer);
  }, [initialKey]);

  // Clean errors when typing
  useEffect(() => { setLockError(''); }, [lockInput, newLockInput]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim().length < 10) {
      setError(language === 'ru' ? 'Ключ API выглядит слишком коротким.' : 'API Key looks too short.');
      return;
    }

    onStart(apiKey.trim());
    addNotification(
      language === 'ru' ? 'API Ключ сохранен' : 'API Key Saved', 
      'success'
    );
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

  const getAnimationClass = () => {
    if (isExiting) {
        return 'opacity-0 scale-95 -translate-y-8 blur-sm';
    }
    return isAnimating ? 'opacity-100 scale-100 translate-y-0 blur-0' : 'opacity-0 scale-95 translate-y-4 blur-sm';
  };

  const commonTransition = "transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]";

  // --- LOCKED VIEW (LOGIN) ---
  if (isLocked) {
      return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950 text-slate-200 h-full w-full overflow-hidden titlebar-drag-region p-4">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-900/20 blur-[80px] rounded-full transition-all duration-1000 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}></div>
            </div>

            <div className={`no-drag w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 md:p-8 flex flex-col items-center text-center transform ${commonTransition} ${getAnimationClass()}`}>
                <div className="bg-slate-800 p-4 rounded-full mb-6 ring-1 ring-indigo-500/30">
                    <Lock className="w-8 h-8 text-indigo-400" />
                </div>
                
                <h2 className="text-xl font-bold text-white mb-2">{t.lockTitle}</h2>
                <p className="text-sm text-slate-500 mb-6">{t.lockDesc}</p>

                <form onSubmit={handleUnlockSubmit} className="w-full space-y-4">
                    <div className="relative">
                        <input
                            type="password"
                            inputMode="numeric"
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
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 active:scale-95"
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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950 text-slate-200 h-full w-full overflow-hidden titlebar-drag-region overflow-y-auto md:overflow-hidden supports-[height:100dvh]:h-[100dvh]">
      
      {/* Background Ambience */}
      <div className={`fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none transition-opacity duration-1000 ${isAnimating && !isExiting ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-indigo-900/20 blur-[100px] rounded-full animate-pulse [animation-duration:4s]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-900/10 blur-[120px] rounded-full animate-pulse [animation-duration:6s]"></div>
      </div>

      {/* Language Toggle */}
      <div className={`absolute top-6 right-6 z-50 no-drag transition-all duration-500 ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <button 
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3 py-2 md:py-1.5 bg-slate-900/80 backdrop-blur border border-slate-700 rounded-full text-xs font-semibold hover:bg-slate-800 transition-colors shadow-lg"
        >
            <Globe className="w-3 h-3 text-indigo-400" />
            <span className={language === 'ru' ? 'text-white' : 'text-slate-500'}>RU</span>
            <span className="text-slate-600">/</span>
            <span className={language === 'en' ? 'text-white' : 'text-slate-500'}>EN</span>
        </button>
      </div>

      <div className={`no-drag w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-0 bg-slate-900 md:border border-slate-800 md:rounded-2xl md:shadow-2xl overflow-hidden transform h-full md:h-auto ${commonTransition} ${getAnimationClass()}`}>
        
        {/* Left Side: Info & Greeting */}
        <div className="p-6 md:p-10 bg-gradient-to-br from-slate-900 to-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-center md:justify-between relative group order-last md:order-first pb-20 md:pb-10">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-900/40">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">FastType AI</h1>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
              {t.welcomeTitle} <br />
              <span className="text-indigo-400">{t.welcomeSubtitle}</span>
            </h2>
            
            <p className="text-slate-400 leading-relaxed mb-8 text-sm">
              {t.welcomeDesc}
            </p>

            <div className="space-y-4 md:space-y-5">
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

          <div className="mt-8 pt-6 border-t border-slate-800/50 hidden md:block">
             <div className="flex flex-col gap-2">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">Version {APP_VERSION} &bull; Powered by Google Gemini</p>
                <div className="flex flex-col gap-0.5">
                   <span className="text-[10px] text-slate-500 font-medium">MeowMasterArt</span>
                   <a href="mailto:MeowMasterArt@gmail.com" className="text-[10px] text-slate-600 hover:text-indigo-400 transition-colors">MeowMasterArt@gmail.com</a>
                </div>
             </div>
          </div>
        </div>

        {/* Right Side: Logic Switch */}
        <div className="p-6 md:p-10 flex flex-col justify-center bg-slate-950/50 relative overflow-hidden min-h-[50vh] md:min-h-0 order-first md:order-last">
          
          {/* VIEW: MAIN API KEY SETUP */}
          <div className={`transition-all duration-300 ${showPinMenu ? 'opacity-0 translate-x-8 pointer-events-none absolute' : 'opacity-100 translate-x-0 relative'}`}>
              <div className="max-w-xs mx-auto w-full">
                <h3 className="text-lg font-semibold text-white mb-2">{t.setupTitle}</h3>
                <p className="text-sm text-slate-400 mb-6">
                  {t.setupDesc}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
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
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 md:py-3 py-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 placeholder:text-slate-700 transition-all font-mono text-base md:text-sm"
                      />
                      {initialKey && apiKey === initialKey && (
                        <div className="absolute right-3 top-4 md:top-3.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        </div>
                      )}
                    </div>
                    {error && <p className="text-red-400 text-xs mt-2 animate-pulse">{error}</p>}
                  </div>

                  {/* SUBMIT BUTTON MOVED UP */}
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 md:py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group shadow-lg shadow-indigo-900/20 hover:shadow-indigo-900/40 hover:-translate-y-0.5 active:scale-95"
                  >
                    <span>{t.startBtn}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <div className="text-center pt-2 pb-6 border-b border-slate-800/50">
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors border-b border-indigo-400/30 hover:border-indigo-300 py-1 inline-block"
                    >
                      {t.getKeyLink}
                    </a>
                  </div>
                  
                  {/* Separate PIN Button */}
                  {!hasLock && (
                      <button
                        type="button"
                        onClick={() => setShowPinMenu(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-all text-sm group active:scale-95"
                      >
                         <Shield className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                         <span>{t.btnCreatePin}</span>
                      </button>
                  )}
                </form>
              </div>
          </div>

          {/* VIEW: CREATE PIN MENU */}
          <div className={`transition-all duration-300 max-w-xs mx-auto w-full ${showPinMenu ? 'opacity-100 translate-x-0 relative' : 'opacity-0 -translate-x-8 pointer-events-none absolute'}`}>
             
             <button 
               onClick={() => setShowPinMenu(false)}
               className="flex items-center gap-1 text-xs text-slate-500 hover:text-white mb-4 transition-colors p-2 -ml-2"
             >
                <ChevronLeft className="w-3 h-3" />
                {t.btnBack}
             </button>

             <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                 <Shield className="w-5 h-5 text-indigo-400" />
                 {t.lockCreateTitle}
             </h3>
             <p className="text-sm text-slate-400 mb-6">
                 {t.lockCreateDesc}
             </p>

             <form onSubmit={handlePinSubmit} className="space-y-4">
                  <div className="relative">
                      <input
                          type="password"
                          inputMode="numeric"
                          value={newLockInput}
                          onChange={(e) => setNewLockInput(e.target.value)}
                          placeholder={t.lockCreatePlaceholder}
                          autoFocus={showPinMenu}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-4 md:py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 placeholder:text-slate-700 font-mono tracking-widest text-lg text-center"
                      />
                  </div>

                  <button
                      type="submit"
                      disabled={newLockInput.length < 3}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 md:py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-95"
                  >
                      <span>{t.lockSetBtn}</span>
                  </button>
             </form>

          </div>

        </div>

      </div>
    </div>
  );
};
