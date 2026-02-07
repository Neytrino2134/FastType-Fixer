
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SmartEditor, SmartEditorHandle } from './components/SmartEditor';
import { WelcomeScreen } from './components/WelcomeScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { ClipboardHistory } from './components/ClipboardHistory';
import { AudioArchive } from './components/AudioArchive'; // NEW
import { AppHeader } from './components/AppHeader';
import { SettingsPanel } from './components/SettingsPanel';
import { NotificationSystem } from './components/NotificationSystem';
import { HelpModal } from './components/HelpModal';
import { ChatInterface } from './components/Chat/ChatInterface'; 
import { TranslatorInterface } from './components/Translator/TranslatorInterface'; 
import { PlannerInterface } from './components/Planner/PlannerInterface';
import { useAppLogic } from './hooks/useAppLogic';
import { getTranslation } from './utils/i18n';
import { Tab } from './types';
import { speakText } from './services/geminiService';
import { useNotification } from './contexts/NotificationContext';

export default function App() {
  const { state, actions } = useAppLogic();
  const { addNotification } = useNotification();
  const t = getTranslation(state.language);
  
  // --- TRANSITION STATES ---
  // Loading Screen Transition
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);
  const [isExitingLoading, setIsExitingLoading] = useState(false);
  
  // Welcome/App Entry Transition (Fade in from black)
  const [isContentVisible, setIsContentVisible] = useState(false);

  // Handle Loading -> Content Transition
  useEffect(() => {
    if (state.appState !== 'loading') {
        // 1. Start fading out the loading screen
        setIsExitingLoading(true);

        // 2. Delay showing the content slightly to create "fade through black" effect
        // The loading screen fades out (revealing black body), then content fades in.
        setTimeout(() => {
            setIsContentVisible(true);
        }, 500);

        // 3. Completely remove loading screen from DOM after animation
        setTimeout(() => {
            setShowLoadingOverlay(false);
        }, 1200);
    }
  }, [state.appState]);


  // Local state to handle exit animations (App -> Welcome / Welcome -> App)
  const [isExitingApp, setIsExitingApp] = useState(false);
  const [isExitingWelcome, setIsExitingWelcome] = useState(false);
  
  // State for App Entry Animation (Smooth Fade-In)
  const [isAppVisible, setIsAppVisible] = useState(false);

  // Trigger entry animation when appState switches to 'app'
  useEffect(() => {
      if (state.appState === 'app') {
          // Double RAF ensures the browser paints the initial "hidden" state before transitioning
          requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                  setIsAppVisible(true);
              });
          });
      } else {
          setIsAppVisible(false);
      }
  }, [state.appState]);

  // State to trigger History Icon animation in Header
  const [historyUpdateCount, setHistoryUpdateCount] = useState(0);
  
  // Reference to Editor for imperative actions (Clear, Copy, Paste, Wipe)
  const editorRef = useRef<SmartEditorHandle>(null);

  // State for transferring text between tabs
  const [transferRequest, setTransferRequest] = useState<{ text: string, target: Tab, timestamp: number } | null>(null);

  // GLOBAL HOTKEYS FOR EDITOR ACTIONS (Alt + 1..5)
  useEffect(() => {
      const handleGlobalActions = (e: KeyboardEvent) => {
          if (state.appState !== 'app' || state.currentTab !== 'editor') return;
          
          if (e.altKey && !e.ctrlKey && !e.shiftKey) {
              switch(e.code) {
                  case 'Digit1': // Alt+1: Cut All
                      e.preventDefault();
                      editorRef.current?.cut();
                      break;
                  case 'Digit2': // Alt+2: Copy All
                      e.preventDefault();
                      editorRef.current?.copy();
                      break;
                  case 'Digit3': // Alt+3: Paste
                      e.preventDefault();
                      editorRef.current?.paste();
                      break;
                  case 'Digit4': // Alt+4: Paste & Replace
                      e.preventDefault();
                      editorRef.current?.clearAndPaste();
                      break;
                  case 'Digit5': // Alt+5: Clear All
                      e.preventDefault();
                      editorRef.current?.clear();
                      break;
              }
          }
      };

      window.addEventListener('keydown', handleGlobalActions);
      return () => window.removeEventListener('keydown', handleGlobalActions);
  }, [state.appState, state.currentTab]);

  const handleHistoryUpdate = useCallback(() => {
    setHistoryUpdateCount(c => c + 1);
  }, []);

  // Handle transition from Welcome -> App
  const handleStartWithAnimation = (key: string) => {
    setIsExitingWelcome(true);
    setTimeout(() => {
      actions.handleStartApp(key);
      setIsExitingWelcome(false);
    }, 600); 
  };

  // Handle transition from App -> Welcome
  const handleGoHome = () => {
    setIsExitingApp(true);
    setTimeout(() => {
      actions.handleReturnToWelcome();
      setIsExitingApp(false);
    }, 500); 
  };

  // Header Actions
  const handleHeaderClear = useCallback(() => {
    editorRef.current?.clear();
  }, []);

  const handleHeaderCopy = useCallback(() => {
    editorRef.current?.copy();
  }, []);

  const handleHeaderPaste = useCallback(() => {
    editorRef.current?.paste();
  }, []);

  const handleHeaderCut = useCallback(() => {
    editorRef.current?.cut();
  }, []);

  const handleHeaderClearAndPaste = useCallback(() => {
    editorRef.current?.clearAndPaste();
  }, []);

  // Tab Transfer Actions
  const handleSendToChat = useCallback(() => {
      const text = editorRef.current?.getText();
      if (text && text.trim()) {
          setTransferRequest({ text, target: 'chat', timestamp: Date.now() });
          actions.setCurrentTab('chat');
      }
  }, [actions]);

  const handleSendToTranslator = useCallback(() => {
      const text = editorRef.current?.getText();
      if (text && text.trim()) {
          setTransferRequest({ text, target: 'translator', timestamp: Date.now() });
          actions.setCurrentTab('translator');
      }
  }, [actions]);

  // TTS ACTION
  const handleHeaderSpeak = useCallback(async () => {
      const text = editorRef.current?.getText();
      if (!text || !text.trim()) return;
      
      actions.setStatus('speaking');
      addNotification(state.language === 'ru' ? 'Озвучивание...' : 'Generating Speech...', 'info');

      try {
          // Speak and get the binary data back
          const base64Audio = await speakText(text, state.settings.ttsVoice);
          
          if (base64Audio) {
              actions.handleAddToAudioArchive({
                  id: Date.now().toString(),
                  text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                  base64Audio,
                  voice: state.settings.ttsVoice,
                  timestamp: Date.now()
              });
          }
      } catch(e) {
          console.error("Failed to speak", e);
          addNotification(state.language === 'ru' ? 'Ошибка озвучивания' : 'Speech generation failed', 'error');
      } finally {
          actions.setStatus(state.settings.enabled ? 'idle' : 'paused');
      }
  }, [state.settings.ttsVoice, state.settings.enabled, actions, addNotification, state.language]);

  // New: FULL WIPE HANDLER (Combines App logic + Editor logic)
  const performFullWipe = useCallback(() => {
      // 1. Wipe App Logic State (Lock, Clipboard, Stats, LocalStorage keys)
      actions.handleWipeData();
      
      // 2. Wipe Editor Internal State (History, Text)
      if (editorRef.current) {
          editorRef.current.fullWipe();
      } else {
          // If editor isn't mounted/ref isn't ready, we ensure LS is cleared by handleWipeData
          // Next time editor mounts, it will read empty state.
      }
  }, [actions]);

  // Determine active index for logic (though visual transition is now absolute stacking)
  const tabs = ['editor', 'chat', 'translator', 'planner'];
  const activeIndex = tabs.indexOf(state.currentTab);

  const getTransitionClass = (index: number) => {
    const isActive = index === activeIndex;
    // Base class: Absolute positioning to stack tabs on top of each other
    // OPTIMIZATION: Removed 'transition-all' and replaced with specific properties.
    // 'width' and 'height' should NOT animate during window resize.
    const baseClass = "absolute inset-0 w-full h-full flex flex-col transition-[opacity,transform,filter] duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] will-change-transform backface-hidden";
    
    if (isActive) {
        // Active: Normal scale, fully opaque, sharp, clickable
        return `${baseClass} opacity-100 scale-100 blur-0 z-10 pointer-events-auto`;
    } else {
        // Inactive: Scaled down (in depth), transparent, blurred, unclickable
        // This creates the "darkness/depth" effect
        return `${baseClass} opacity-0 scale-90 blur-sm z-0 pointer-events-none grayscale brightness-50`;
    }
  };

  return (
    <>
        {/* 1. PERSISTENT LOADING OVERLAY (Highest Z-Index) */}
        {showLoadingOverlay && (
            <LoadingScreen isExiting={isExitingLoading} />
        )}

        {/* 2. WELCOME SCREEN LAYER */}
        {state.appState === 'welcome' && (
            <div className={`fixed inset-0 z-0 w-full h-full transition-all duration-1000 ease-out ${isContentVisible ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-lg scale-95'}`}>
                <WelcomeScreen 
                    initialKey={state.storedKey} 
                    onStart={handleStartWithAnimation} 
                    language={state.language}
                    setLanguage={actions.setLanguage}
                    isLocked={state.isLocked}
                    hasLock={state.hasLock}
                    onUnlock={actions.handleUnlock}
                    onSetLock={actions.handleSetLock}
                    isExiting={isExitingWelcome} 
                    onWindowControl={actions.handleWindowControl}
                    onWipeData={performFullWipe} 
                />
                <NotificationSystem />
            </div>
        )}

        {/* 3. MAIN APP LAYER */}
        {state.appState === 'app' && (
             <div 
                className={`fixed inset-0 w-full h-full flex flex-col bg-slate-950 text-slate-200 overflow-hidden transition-[opacity,transform,filter] duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] supports-[height:100dvh]:h-[100dvh] ${
                    // Prioritize Exit animation, then check Entry animation, but ONLY if global content is visible
                    !isContentVisible 
                        ? 'opacity-0 scale-95 blur-md brightness-50' // Initial state coming from loading
                        : isExitingApp 
                            ? 'opacity-0 scale-90 blur-xl brightness-50' // Exiting to Welcome
                            : isAppVisible 
                                ? 'opacity-100 scale-100 blur-0 brightness-100' // Normal state
                                : 'opacity-0 scale-95 blur-md brightness-50'    // Entering from Welcome
                }`}
            >
              
              <AppHeader 
                language={state.language}
                status={state.status}
                isGrammarChecking={state.isGrammarChecking}
                stats={state.stats}
                settings={state.settings}
                showClipboard={state.showClipboard}
                showSettings={state.showSettings}
                showHistory={state.showHistory}
                currentTab={state.currentTab}
                setCurrentTab={actions.setCurrentTab}
                isPinned={state.isPinned}
                onTogglePin={actions.handleTogglePin}
                onSetLanguage={actions.setLanguage} // Updated Prop
                onTogglePause={actions.handleToggleProcessing}
                onToggleClipboard={actions.toggleClipboard}
                onToggleSettings={actions.toggleSettings}
                onToggleHistory={actions.toggleHistory}
                onToggleHelp={actions.toggleHelp}
                onGoHome={handleGoHome}
                onWindowControl={actions.handleWindowControl}
                onResetProcessor={actions.handleResetProcessor}
                historyUpdateCount={historyUpdateCount}
                onClearText={handleHeaderClear}
                onCopyText={handleHeaderCopy}
                onPasteText={handleHeaderPaste}
                onCutText={handleHeaderCut}
                onClearAndPaste={handleHeaderClearAndPaste}
                onUpdateSettings={actions.setSettings}
                onSendToChat={handleSendToChat}
                onSendToTranslator={handleSendToTranslator}
                onSpeakText={handleHeaderSpeak} // Connect TTS
                onToggleArchive={actions.toggleAudioArchive} // Connect Archive
                showArchive={state.showAudioArchive}
              />

              {/* Global Notification Layer */}
              <NotificationSystem />
              
              {/* Help Modal */}
              <HelpModal 
                isOpen={state.showHelp} 
                onClose={() => actions.toggleHelp()} 
                language={state.language}
              />

              {/* Settings Dropdown Panel */}
              <div className="relative z-40 w-full h-0">
                  <div className={`absolute top-0 left-0 w-full transform transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${state.showSettings ? 'translate-y-0 opacity-100 shadow-2xl pointer-events-auto' : '-translate-y-full opacity-0 pointer-events-none'}`}>
                     <SettingsPanel 
                        settings={state.settings}
                        language={state.language}
                        onUpdateSettings={actions.setSettings}
                        onResetKey={actions.handleResetKey}
                        onUpdateApiKey={actions.handleUpdateKey} 
                        hasLock={state.hasLock}
                        onRemoveLock={actions.handleRemoveLock}
                        onSetLock={actions.handleSetLock} 
                        onClose={actions.toggleSettings}
                        isVisible={state.showSettings}
                        onVerifyPin={actions.validatePin}
                      />
                  </div>
              </div>

              {/* Main Content Area */}
              <main className="flex-1 relative bg-slate-900 w-full h-full overflow-hidden z-0">
                
                {/* GLOBAL: Clipboard History Overlay */}
                <ClipboardHistory 
                    items={state.clipboardHistory}
                    isOpen={state.showClipboard}
                    isEnabled={state.settings.clipboardEnabled}
                    onToggleEnabled={() => actions.setSettings(s => ({...s, clipboardEnabled: !s.clipboardEnabled}))}
                    onClose={actions.closeOverlays}
                    onClear={actions.handleClearClipboard}
                    language={state.language}
                />

                {/* GLOBAL: Audio Archive Overlay */}
                <AudioArchive 
                    items={state.audioArchive}
                    isOpen={state.showAudioArchive}
                    onClose={actions.closeOverlays}
                    onRemove={actions.handleRemoveFromAudioArchive}
                    onClear={actions.handleClearAudioArchive}
                    language={state.language}
                />

                {/* VIEW: EDITOR (Index 0) */}
                <div className={getTransitionClass(0)}>
                     <SmartEditor 
                        ref={editorRef}
                        settings={state.settings} 
                        onStatsUpdate={actions.incrementStats} 
                        language={state.language}
                        status={state.status}
                        onStatusChange={actions.setStatus} 
                        setIsGrammarChecking={actions.setIsGrammarChecking} 
                        onClipboardAction={actions.handleClipboardAction}
                        resetSignal={state.resetSignal}
                        showHistory={state.showHistory}
                        onToggleHistory={actions.toggleHistory}
                        onPauseProcessing={() => actions.setSettings(s => ({ ...s, enabled: false }))}
                        onToggleProcessing={actions.handleToggleProcessing}
                        onInteraction={actions.closeOverlays}
                        onHistoryUpdate={handleHistoryUpdate}
                        showClipboard={state.showClipboard}
                        onToggleClipboard={actions.toggleClipboard}
                    />
                </div>

                {/* VIEW: CHAT / ASSISTANT (Index 1) */}
                <div className={getTransitionClass(1)}>
                    <ChatInterface 
                        language={state.language} 
                        apiKey={state.storedKey}
                        settings={state.settings} 
                        transferRequest={transferRequest}
                        onToggleClipboard={actions.toggleClipboard}
                    />
                </div>

                {/* VIEW: TRANSLATOR (Index 2) */}
                <div className={getTransitionClass(2)}>
                    <TranslatorInterface
                        language={state.language} 
                        apiKey={state.storedKey}
                        transferRequest={transferRequest}
                        onToggleClipboard={actions.toggleClipboard}
                    />
                </div>

                {/* VIEW: PLANNER (Index 3) */}
                <div className={getTransitionClass(3)}>
                    <PlannerInterface
                        language={state.language} 
                        apiKey={state.storedKey}
                        onToggleClipboard={actions.toggleClipboard}
                    />
                </div>

              </main>

              {/* Footer */}
              <footer className="shrink-0 py-1 text-center text-slate-700 text-[10px] bg-slate-900 border-t border-slate-800 select-none z-50 relative">
                &copy; {t.footer} 
                {state.currentTab === 'chat' && ' • Assistant Mode'}
                {state.currentTab === 'translator' && ' • Translator'}
                {state.currentTab === 'planner' && ' • Planner'}
              </footer>
            </div>
        )}
    </>
  );
}