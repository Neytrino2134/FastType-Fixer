


import React, { useState } from 'react';
import { Volume2, VolumeX, ChevronLeft, Info, Minus, Square, X } from 'lucide-react';
import { Language, CorrectionSettings } from '../types';
import { ApiKeyGuide } from './ApiKeyGuide';
import { VisualizerCanvas } from './Editor/VisualizerCanvas';
import { useWelcomeAudio } from '../hooks/useWelcomeAudio';
import { LockedView } from './Welcome/LockedView';
import { WelcomeWizard } from './Welcome/WelcomeWizard';
import { SetupView } from './Welcome/SetupView';

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
  onWipeData: () => void;
  settings: CorrectionSettings;
  onUpdateSettings: (newSettings: CorrectionSettings) => void;
}

type ViewState = 'welcome' | 'setup' | 'guide';

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
    onWipeData,
    settings,
    onUpdateSettings
}) => {
  const [apiKey, setApiKey] = useState(initialKey);
  
  // Navigation State
  const [currentView, setCurrentView] = useState<ViewState>(initialKey ? 'setup' : 'welcome');
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  // Wizard State
  const [wizardStep, setWizardStep] = useState(0);
  const totalWizardSteps = 5;

  // Language Selection Confirmation State
  const [langConfirmation, setLangConfirmation] = useState(false);

  // New State: Track if user just finished the guide to trigger Step 7 logic
  const [justFinishedGuide, setJustFinishedGuide] = useState(false);

  // Use Custom Hook for Audio Logic
  const { isMuted, setIsMuted, isPlayingAudio, visualizerDataRef } = useWelcomeAudio(
      wizardStep, currentView, language, langConfirmation, justFinishedGuide
  );

  const navigate = (view: ViewState) => {
      if (currentView === 'welcome') setDirection('forward');
      else if (view === 'welcome') setDirection('backward');
      else setDirection('forward');
      
      setCurrentView(view);
      
      // If manually navigating, reset guide flag unless we specifically came from guide done
      if (view !== 'setup') {
          setJustFinishedGuide(false);
      }
  };

  const handleGuideFinish = () => {
      setJustFinishedGuide(true);
      navigate('setup');
  };

  const handleWizardNext = () => {
      setLangConfirmation(false);
      if (wizardStep < totalWizardSteps - 1) {
          setWizardStep(prev => prev + 1);
      }
  };

  const handleWizardBack = () => {
      setLangConfirmation(false);
      if (wizardStep > 0) {
          setWizardStep(prev => prev - 1);
      }
  };

  const handleLanguageSelect = (lang: Language) => {
      setLanguage(lang);
      setLangConfirmation(true);
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
          <LockedView 
            language={language}
            onUnlock={onUnlock}
            onWindowControl={onWindowControl}
            onWipeData={onWipeData}
          />
      );
  }

  // --- MAIN LAYOUT ---
  return (
    <div className={`fixed inset-0 z-40 flex items-center justify-center bg-slate-950 text-slate-200 h-full w-full titlebar-drag-region overflow-hidden ${isExiting ? 'pointer-events-none' : ''}`}>
      
      {/* Background Visualizer & Glow */}
      <div className={`fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none transition-opacity duration-1000 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
         <div className={`absolute inset-0 z-0 opacity-40 transition-opacity duration-1000 ${
             (currentView === 'welcome' && isPlayingAudio) || (currentView === 'setup' && justFinishedGuide && isPlayingAudio) 
                ? 'opacity-40' 
                : 'opacity-0'
         }`}>
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
             <WelcomeWizard 
                wizardStep={wizardStep}
                language={language}
                setLanguage={setLanguage}
                langConfirmation={langConfirmation}
                setLangConfirmation={setLangConfirmation}
                handleLanguageSelect={handleLanguageSelect}
                setIsMuted={setIsMuted}
                handleWizardNext={handleWizardNext}
                handleWizardBack={handleWizardBack}
                onNavigateSetup={() => navigate('setup')}
                onNavigateGuide={() => navigate('guide')}
                MuteButton={MuteButton}
             />
        </div>


        {/* ================= VIEW 2: SETUP SCREEN ================= */}
        <div className={getTransitionClass('setup')}>
            <SetupView 
                apiKey={apiKey}
                setApiKey={setApiKey}
                language={language}
                onStart={onStart}
                hasLock={hasLock}
                onSetLock={onSetLock}
                onNavigateGuide={() => navigate('guide')}
                justFinishedGuide={justFinishedGuide}
                setJustFinishedGuide={setJustFinishedGuide}
                MuteButton={MuteButton}
                settings={settings}
                onUpdateSettings={onUpdateSettings}
            />
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
                    <span className="text-sm font-medium">{language === 'en' ? 'Back' : 'Назад'}</span>
                </button>
            </div>

            <div className="flex-1 overflow-hidden relative flex flex-col">
                <ApiKeyGuide 
                    language={language}
                    onDone={handleGuideFinish}
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
                title={language === 'en' ? 'Tutorial' : 'Обучение'}
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