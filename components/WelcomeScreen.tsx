
import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Keyboard, Wand2, Zap, Globe, Lock, Unlock, Shield, ChevronLeft, Info, Minus, Square, X, Languages, Check, Volume2, VolumeX, AlertTriangle, AlertOctagon, ExternalLink, Key, ClipboardPaste } from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../utils/i18n';
import { useNotification } from '../contexts/NotificationContext';
import { APP_VERSION } from '../utils/versionInfo';
import { ApiKeyGuide } from './ApiKeyGuide';
import { VisualizerCanvas } from './Editor/VisualizerCanvas';

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
  onWindowControl: (action: 'minimize' | 'maximize' | 'close') => void;
  onWipeData: () => void; // New Prop
}

type ViewState = 'welcome' | 'setup' | 'guide';

// Demo Animation Component for Step 3
const TypingDemo = ({ language }: { language: Language }) => {
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

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
    initialKey, 
    onStart, 
    language, 
    setLanguage,
    isLocked,
    hasLock,
    onUnlock,
    onSetLock,
    isExiting,
    onWindowControl,
    onWipeData
}) => {
  const [apiKey, setApiKey] = useState(initialKey);
  const [error, setError] = useState('');
  
  // Navigation State
  const [currentView, setCurrentView] = useState<ViewState>(initialKey ? 'setup' : 'welcome');
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  // Wizard State
  const [wizardStep, setWizardStep] = useState(0);
  const totalWizardSteps = 5;

  // Security State
  const [lockInput, setLockInput] = useState('');
  const [newLockInput, setNewLockInput] = useState('');
  const [lockError, setLockError] = useState('');
  const [showPinMenu, setShowPinMenu] = useState(false);
  const [showWipeModal, setShowWipeModal] = useState(false); 
  
  // Audio State
  const [isMuted, setIsMuted] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Audio System Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null); 
  const visualizerDataRef = useRef<Uint8Array>(new Uint8Array(128)); 
  const rafIdRef = useRef<number | null>(null);

  const { addNotification } = useNotification();
  const t = getTranslation(language);

  const txt = {
      next: language === 'en' ? 'Next' : 'Далее',
      back: language === 'en' ? 'Back' : 'Назад',
      tutorial: language === 'en' ? 'Tutorial' : 'Обучение'
  };

  useEffect(() => {
    setApiKey(initialKey);
  }, [initialKey]);

  useEffect(() => { setLockError(''); }, [lockInput, newLockInput]);

  // --- INITIALIZE AUDIO SYSTEM ---
  useEffect(() => {
      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      audioRef.current = audio;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = ctx.createMediaElementSource(audio);
      sourceRef.current = source;
      source.connect(analyser);
      analyser.connect(ctx.destination);

      const updateVisualizer = () => {
          if (analyserRef.current) {
              analyserRef.current.getByteFrequencyData(visualizerDataRef.current as any);
          }
          rafIdRef.current = requestAnimationFrame(updateVisualizer);
      };
      updateVisualizer();

      return () => {
          if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
          if (audioContextRef.current) audioContextRef.current.close();
          if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current = null;
          }
      };
  }, []);

  // --- AUDIO PLAYBACK CONTROL ---
  useEffect(() => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    setIsPlayingAudio(false);

    if (currentView !== 'welcome' || isMuted || wizardStep === 0) {
        return;
    }

    // Determine fallback language code for sound files since we don't have uz wavs yet
    // Using 'ru' as fallback for Uzbek for now, or 'en'
    let langCode = 'ru'; 
    if (language === 'en') langCode = 'en';
    // Ideally we would record new files for uz-latn and uz-cyrl

    let fileIndex = wizardStep; 
    if (wizardStep === 1) fileIndex = 2; 
    else if (wizardStep === 2) fileIndex = 1; 

    const soundPath = `./sounds/welcome_step_${fileIndex}_${langCode}.wav`;

    audioRef.current.src = soundPath;
    audioRef.current.volume = 0.6; 
    
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }

    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
        playPromise
            .then(() => {
                setIsPlayingAudio(true);
            })
            .catch(e => {
                console.log("Audio autoplay waiting for interaction:", e);
                setIsPlayingAudio(false);
            });
    }

    const handleEnded = () => setIsPlayingAudio(false);
    audioRef.current.addEventListener('ended', handleEnded);

    return () => {
        if (audioRef.current) {
            audioRef.current.removeEventListener('ended', handleEnded);
        }
    };
  }, [wizardStep, language, currentView, isMuted]);


  const navigate = (view: ViewState) => {
      if (currentView === 'welcome') setDirection('forward');
      else if (view === 'welcome') setDirection('backward');
      else setDirection('forward');
      
      setCurrentView(view);
  };

  const handleWizardNext = () => {
      if (wizardStep < totalWizardSteps - 1) {
          setWizardStep(prev => prev + 1);
      }
  };

  const handleWizardBack = () => {
      if (wizardStep > 0) {
          setWizardStep(prev => prev - 1);
      }
  };

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

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUnlock(lockInput)) {
        setLockInput('');
    } else {
        setLockError(t.lockError);
    }
  };

  const handlePasteKey = async () => {
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

  const getTransitionClass = (viewName: ViewState) => {
      const isActive = currentView === viewName;
      let base = "absolute inset-0 w-full h-full transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] will-change-transform flex flex-col";

      if (isActive) {
          return `${base} opacity-100 scale-100 z-10 pointer-events-auto blur-0 translate-y-0`;
      }

      if (direction === 'forward') {
          const viewsOrder = ['welcome', 'setup', 'guide'];
          const myIndex = viewsOrder.indexOf(viewName);
          const currentIndex = viewsOrder.indexOf(currentView);

          if (myIndex < currentIndex) {
             return `${base} opacity-0 scale-90 z-0 pointer-events-none blur-sm`;
          } else {
             return `${base} opacity-0 scale-110 z-20 pointer-events-none blur-sm`;
          }
      } else {
           const viewsOrder = ['welcome', 'setup', 'guide'];
           const myIndex = viewsOrder.indexOf(viewName);
           const currentIndex = viewsOrder.indexOf(currentView);

           if (myIndex < currentIndex) {
             return `${base} opacity-0 scale-90 z-0 pointer-events-none blur-sm`;
          } else {
             return `${base} opacity-0 scale-110 z-20 pointer-events-none blur-sm`;
          }
      }
  };

  const isExpanded = currentView === 'setup' || currentView === 'guide';

  const MuteButton = ({ className = "" }) => (
    <button 
        onClick={() => setIsMuted(!isMuted)}
        className={`p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors no-drag ${className}`}
        title={isMuted ? "Unmute" : "Mute"}
    >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
    </button>
  );

  // --- LOCKED VIEW ---
  if (isLocked) {
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
                        onChange={(e) => setLockInput(e.target.value)}
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
  }

  // --- MAIN LAYOUT ---
  return (
    <div className={`fixed inset-0 z-40 flex items-center justify-center bg-slate-950 text-slate-200 h-full w-full titlebar-drag-region overflow-hidden ${isExiting ? 'pointer-events-none' : ''}`}>
      
      <div className={`fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none transition-opacity duration-1000 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
         <div className={`absolute inset-0 z-0 opacity-40 transition-opacity duration-1000 ${currentView === 'welcome' && isPlayingAudio ? 'opacity-40' : 'opacity-0'}`}>
             <VisualizerCanvas 
                visualizerDataRef={visualizerDataRef}
                isRecording={true} 
                visualizerStyle="wave"
                amp={0.6}
                highCut={50}
                lowCut={2}
                gravity={1.5}
                silenceThreshold={5}
                norm={true}
                mirror={true}
                rounded={true}
             />
         </div>

         <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-indigo-900/10 blur-[120px] rounded-full animate-pulse [animation-duration:8s]"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-900/10 blur-[150px] rounded-full animate-pulse [animation-duration:10s]"></div>
      </div>

      <div 
        className={`
            no-drag relative z-10 
            transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)]
            bg-transparent md:bg-slate-900 md:shadow-2xl md:overflow-hidden

            ${isExpanded 
                ? 'w-full h-full rounded-none border-none' 
                : 'w-full h-full md:w-[600px] md:h-[650px] md:max-h-[90vh] md:rounded-2xl md:border md:border-slate-800'
            }

            ${isExiting ? 'scale-90 opacity-0 blur-lg translate-y-10' : 'scale-100 opacity-100 blur-0 translate-y-0'}
        `}
      >
        
        {/* ================= VIEW 1: WELCOME WIZARD ================= */}
        <div className={getTransitionClass('welcome')}>
             <div className="flex-1 flex flex-col relative overflow-hidden">
                <div className="shrink-0 h-14 w-full flex items-center px-4 z-50 titlebar-drag-region">
                    {wizardStep > 0 && <MuteButton />}
                </div>
                
                <div className="flex-1 relative">
                    
                    {/* STEP 0: SOUND CHECK */}
                    <div className={`absolute inset-0 flex flex-col items-center justify-center p-8 transition-all duration-500 ${wizardStep === 0 ? 'opacity-100 translate-x-0' : wizardStep < 0 ? 'opacity-0 translate-x-10 pointer-events-none' : 'opacity-0 -translate-x-10 pointer-events-none'}`}>
                         <div className="bg-indigo-600/20 p-6 rounded-full mb-8 ring-1 ring-indigo-500/50">
                             <Volume2 className="w-12 h-12 text-indigo-400" />
                         </div>
                         <h1 className="text-3xl font-bold text-white text-center mb-2">{t.wizStep0Title}</h1>
                         <p className="text-xl text-slate-400 text-center mb-10">{t.wizStep0Subtitle}</p>
                         
                         <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                             <button 
                                onClick={() => { setIsMuted(false); handleWizardNext(); }}
                                className="p-6 rounded-2xl border border-slate-700 bg-slate-800 hover:bg-emerald-900/20 hover:border-emerald-500/50 hover:text-emerald-400 transition-all duration-300 flex flex-col items-center gap-3 group"
                             >
                                 <Volume2 className="w-8 h-8 group-hover:scale-110 transition-transform" />
                                 <span className="font-bold">{t.btnSoundOn}</span>
                             </button>

                             <button 
                                onClick={() => { setIsMuted(true); handleWizardNext(); }}
                                className="p-6 rounded-2xl border border-slate-700 bg-slate-800 hover:bg-slate-700/50 hover:border-slate-600 hover:text-slate-300 transition-all duration-300 flex flex-col items-center gap-3 group"
                             >
                                 <VolumeX className="w-8 h-8 group-hover:scale-110 transition-transform" />
                                 <span className="font-bold">{t.btnSoundOff}</span>
                             </button>
                         </div>
                    </div>

                    {/* STEP 1: LANGUAGE */}
                    <div className={`absolute inset-0 flex flex-col items-center justify-center p-8 transition-all duration-500 ${wizardStep === 1 ? 'opacity-100 translate-x-0' : wizardStep < 1 ? 'opacity-0 translate-x-10 pointer-events-none' : 'opacity-0 -translate-x-10 pointer-events-none'}`}>
                         <h2 className="text-2xl font-bold text-white mb-2">{t.wizStep2Title}</h2>
                         <p className="text-slate-400 text-center mb-8">{t.wizStep2Desc}</p>
                         
                         <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-4">
                             <button 
                                onClick={() => { setLanguage('ru'); setTimeout(handleWizardNext, 300); }}
                                className={`p-4 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2 ${language === 'ru' ? 'bg-indigo-600/20 border-indigo-500' : 'bg-slate-800 border-slate-700'}`}
                             >
                                 <div className="text-2xl">🇷🇺</div>
                                 <span className="font-bold text-white text-sm">Русский</span>
                             </button>

                             <button 
                                onClick={() => { setLanguage('en'); setTimeout(handleWizardNext, 300); }}
                                className={`p-4 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2 ${language === 'en' ? 'bg-indigo-600/20 border-indigo-500' : 'bg-slate-800 border-slate-700'}`}
                             >
                                 <div className="text-2xl">🇺🇸</div>
                                 <span className="font-bold text-white text-sm">English</span>
                             </button>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                             <button 
                                onClick={() => { setLanguage('uz-latn'); setTimeout(handleWizardNext, 300); }}
                                className={`p-4 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2 ${language === 'uz-latn' ? 'bg-indigo-600/20 border-indigo-500' : 'bg-slate-800 border-slate-700'}`}
                             >
                                 <div className="text-2xl">🇺🇿</div>
                                 <span className="font-bold text-white text-sm">O'zbek</span>
                             </button>

                             <button 
                                onClick={() => { setLanguage('uz-cyrl'); setTimeout(handleWizardNext, 300); }}
                                className={`p-4 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2 ${language === 'uz-cyrl' ? 'bg-indigo-600/20 border-indigo-500' : 'bg-slate-800 border-slate-700'}`}
                             >
                                 <div className="text-2xl">🇺🇿</div>
                                 <span className="font-bold text-white text-sm">Ўзбек</span>
                             </button>
                         </div>
                    </div>

                    {/* STEP 2: INTRO */}
                    <div className={`absolute inset-0 flex flex-col items-center justify-center p-8 transition-all duration-500 ${wizardStep === 2 ? 'opacity-100 translate-x-0' : wizardStep < 2 ? 'opacity-0 translate-x-10 pointer-events-none' : 'opacity-0 -translate-x-10 pointer-events-none'}`}>
                        <div className="bg-indigo-600 p-6 rounded-3xl shadow-2xl shadow-indigo-900/50 mb-8 animate-[bounce_2s_infinite]">
                            <Sparkles className="w-12 h-12 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white text-center mb-2">{t.wizStep1Title}</h1>
                        <p className="text-xl text-indigo-400 font-medium text-center mb-6">{t.wizStep1Subtitle}</p>
                        <p className="text-slate-400 text-center max-w-sm leading-relaxed">{t.wizStep1Desc}</p>
                    </div>

                    {/* STEP 3: FEATURES + DEMO */}
                    <div className={`absolute inset-0 flex flex-col items-center justify-center p-8 transition-all duration-500 ${wizardStep === 3 ? 'opacity-100 translate-x-0' : wizardStep < 3 ? 'opacity-0 translate-x-10 pointer-events-none' : 'opacity-0 -translate-x-10 pointer-events-none'}`}>
                         <h2 className="text-2xl font-bold text-white mb-2">{t.wizStep3Title}</h2>
                         <p className="text-slate-400 text-center mb-6 max-w-sm text-sm">{t.wizStep3Desc}</p>
                         
                         <TypingDemo language={language} />

                         <div className="w-full max-w-sm space-y-3">
                             <FeatureRow icon={<Zap className="w-4 h-4 text-amber-400" />} title={t.feature1Title} desc={t.feature1Desc} />
                             <FeatureRow icon={<Wand2 className="w-4 h-4 text-purple-400" />} title={t.feature2Title} desc={t.feature2Desc} />
                         </div>
                    </div>

                    {/* STEP 4: API KEY */}
                    <div className={`absolute inset-0 flex flex-col items-center justify-center p-8 transition-all duration-500 ${wizardStep === 4 ? 'opacity-100 translate-x-0' : wizardStep < 4 ? 'opacity-0 translate-x-10 pointer-events-none' : 'opacity-0 -translate-x-10 pointer-events-none'}`}>
                         <div className="bg-emerald-500/20 p-6 rounded-full mb-6 ring-1 ring-emerald-500/50">
                             <ShieldCheck className="w-12 h-12 text-emerald-400" />
                         </div>
                         <h2 className="text-2xl font-bold text-white mb-2">{t.wizStep4Title}</h2>
                         <p className="text-slate-400 text-center mb-8 max-w-xs">{t.wizStep4Desc}</p>
                         
                         <div className="w-full max-w-sm space-y-3">
                            <button 
                                onClick={() => navigate('setup')}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group shadow-lg shadow-indigo-900/20 hover:shadow-indigo-900/40 active:scale-95"
                            >
                                <span>{t.btnHaveKey}</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                            
                            <button 
                                onClick={() => navigate('guide')}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold py-4 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 text-sm border border-slate-700 active:scale-95"
                            >
                                <span>{t.btnNoKey}</span>
                            </button>
                         </div>
                    </div>
                </div>

                {/* WIZARD CONTROLS */}
                <div className="p-6 shrink-0 flex items-center justify-between border-t border-slate-800/50 bg-slate-900/50">
                    <button 
                        onClick={handleWizardBack}
                        className={`text-slate-500 hover:text-white transition-colors text-sm font-medium ${wizardStep === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    >
                        {txt.back}
                    </button>

                    <div className="flex gap-2">
                        {[0, 1, 2, 3, 4].map(i => (
                            <div 
                                key={i} 
                                className={`h-1.5 rounded-full transition-all duration-300 ${i === wizardStep ? 'w-6 bg-indigo-500' : 'w-1.5 bg-slate-700'}`} 
                            />
                        ))}
                    </div>

                    <button 
                        onClick={handleWizardNext}
                        className={`text-indigo-400 hover:text-indigo-300 transition-colors text-sm font-bold flex items-center gap-1 ${wizardStep === totalWizardSteps - 1 || wizardStep === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    >
                        {txt.next} <ChevronLeft className="w-4 h-4 rotate-180" />
                    </button>
                </div>

             </div>
        </div>


        {/* ================= VIEW 2: SETUP SCREEN ================= */}
        <div className={getTransitionClass('setup')}>
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
                                        onClick={() => navigate('guide')}
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
                                    }}
                                    placeholder="AIzaSy..."
                                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-4 pr-10 py-3.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 placeholder:text-slate-700 transition-all font-mono text-sm shadow-inner"
                                    autoFocus={currentView === 'setup' && !showPinMenu}
                                />
                                <button
                                    type="button"
                                    onClick={handlePasteKey}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                    title="Paste"
                                >
                                    <ClipboardPaste className="w-4 h-4" />
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


        {/* ================= VIEW 3: GUIDE SCREEN ================= */}
        <div className={getTransitionClass('guide')}>
            <div className="h-14 shrink-0 flex items-center px-4 gap-1 border-b border-slate-800 bg-slate-900/50 md:bg-transparent titlebar-drag-region">
                 <MuteButton />
                 <button 
                    onClick={() => navigate('setup')}
                    className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors py-2 px-2 rounded hover:bg-slate-800 no-drag"
                >
                    <ChevronLeft className="w-5 h-5" />
                    <span className="text-sm font-medium">{txt.back}</span>
                </button>
            </div>

            <div className="flex-1 overflow-hidden relative flex flex-col">
                <ApiKeyGuide 
                    language={language}
                    onDone={() => navigate('setup')}
                    isActive={currentView === 'guide'}
                    isMuted={isMuted}
                />
            </div>
        </div>

      </div>

      {/* TOP CONTROLS */}
      <div className={`absolute top-0 right-0 z-[100] flex items-start gap-3 p-3 transition-all duration-500 pointer-events-auto no-drag ${isExiting ? 'opacity-0 -translate-y-4' : 'opacity-100'}`}>
        <div className="flex items-center gap-1 bg-slate-900/50 backdrop-blur border border-slate-800/60 rounded-lg p-0.5 pointer-events-auto no-drag">
            <button 
                onClick={() => navigate('welcome')}
                className={`p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ${currentView === 'welcome' ? 'text-indigo-400' : ''}`}
                title={txt.tutorial}
            >
                <Info className="w-3.5 h-3.5" />
            </button>
            
            <div className="w-px h-3 bg-slate-700/50 mx-0.5"></div>

            <button 
                onClick={() => setLanguage(language === 'ru' ? 'en' : language === 'en' ? 'uz-latn' : language === 'uz-latn' ? 'uz-cyrl' : 'ru')}
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors text-[10px] font-bold uppercase min-w-[28px]"
            >
                {language === 'ru' ? 'RU' : language === 'en' ? 'EN' : language === 'uz-latn' ? 'UZ' : 'УЗ'}
            </button>

            <div className="w-px h-3 bg-slate-700/50 mx-0.5"></div>

            <button onClick={() => onWindowControl('minimize')} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"><Minus className="w-3.5 h-3.5" /></button>
            <button onClick={() => onWindowControl('maximize')} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"><Square className="w-3 h-3" /></button>
            <button onClick={() => onWindowControl('close')} className="p-1.5 rounded hover:bg-red-600 text-slate-400 hover:text-white transition-colors"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>

    </div>
  );
};

// Helper for cleaner feature rows
const FeatureRow = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
    <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/10 transition-colors duration-300">
        <div className="p-2 bg-slate-800 rounded-lg shrink-0 ring-1 ring-white/10">
            {icon}
        </div>
        <div>
            <h3 className="text-sm font-bold text-slate-200">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
        </div>
    </div>
);
