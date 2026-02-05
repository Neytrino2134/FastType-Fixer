
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SmartEditor, SmartEditorHandle } from './components/SmartEditor';
import { WelcomeScreen } from './components/WelcomeScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { ClipboardHistory } from './components/ClipboardHistory';
import { AppHeader } from './components/AppHeader';
import { SettingsPanel } from './components/SettingsPanel';
import { NotificationSystem } from './components/NotificationSystem';
import { HelpModal } from './components/HelpModal';
import { ChatInterface } from './components/Chat/ChatInterface'; 
import { TranslatorInterface } from './components/Translator/TranslatorInterface'; 
import { useAppLogic } from './hooks/useAppLogic';
import { getTranslation } from './utils/i18n';

export default function App() {
  const { state, actions } = useAppLogic();
  const t = getTranslation(state.language);
  
  // Local state to handle exit animations
  const [isExitingApp, setIsExitingApp] = useState(false);
  const [isExitingWelcome, setIsExitingWelcome] = useState(false);
  
  // State for entry animation (Smooth Fade-In)
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
  const tabs = ['editor', 'chat', 'translator'];
  const activeIndex = tabs.indexOf(state.currentTab);

  const getTransitionClass = (index: number) => {
    const isActive = index === activeIndex;
    // Base class: Absolute positioning to stack tabs on top of each other
    // Transition: Scale and Opacity for "Zoom from darkness" effect
    const baseClass = "absolute inset-0 w-full h-full flex flex-col transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] will-change-transform backface-hidden";
    
    if (isActive) {
        // Active: Normal scale, fully opaque, sharp, clickable
        return `${baseClass} opacity-100 scale-100 blur-0 z-10 pointer-events-auto`;
    } else {
        // Inactive: Scaled down (in depth), transparent, blurred, unclickable
        // This creates the "darkness/depth" effect
        return `${baseClass} opacity-0 scale-90 blur-sm z-0 pointer-events-none grayscale brightness-50`;
    }
  };

  // --- RENDER VIEWS ---

  if (state.appState === 'loading') {
    return <LoadingScreen />;
  }

  if (state.appState === 'welcome') {
    return (
      <>
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
          onWipeData={performFullWipe} // Pass Wipe Handler
        />
        <NotificationSystem />
      </>
    );
  }

  // --- MAIN APP VIEW ---
  return (
    <div 
        className={`fixed inset-0 w-full h-full flex flex-col bg-slate-950 text-slate-200 overflow-hidden transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] supports-[height:100dvh]:h-[100dvh] ${
            isExitingApp 
              ? 'opacity-0 scale-90 blur-xl brightness-50' // Exit: Zoom out into darkness
              : isAppVisible 
                ? 'opacity-100 scale-100 blur-0 brightness-100' // Enter: Final state (Visible)
                : 'opacity-0 scale-95 blur-md brightness-50'    // Enter: Initial state (Hidden)
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
        onToggleLanguage={actions.toggleLanguage}
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
      />

      {/* Global Notification Layer */}
      <NotificationSystem />
      
      {/* Help Modal */}
      <HelpModal 
        isOpen={state.showHelp} 
        onClose={() => actions.toggleHelp()} 
        language={state.language}
      />

      {/* Settings Dropdown Panel - Animated Slide Drawer */}
      <div className="relative z-40 w-full h-0">
          <div className={`absolute top-0 left-0 w-full transform transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${state.showSettings ? 'translate-y-0 opacity-100 shadow-2xl pointer-events-auto' : '-translate-y-full opacity-0 pointer-events-none'}`}>
             <SettingsPanel 
                settings={state.settings}
                language={state.language}
                onUpdateSettings={actions.setSettings}
                onResetKey={actions.handleResetKey}
                hasLock={state.hasLock}
                onRemoveLock={actions.handleRemoveLock}
                onSetLock={actions.handleSetLock} // Pass Set Lock for "Change PIN"
                onClose={actions.toggleSettings}
                isVisible={state.showSettings}
              />
          </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 relative bg-slate-900 w-full h-full overflow-hidden z-0">
        
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
            />
            
            <ClipboardHistory 
                items={state.clipboardHistory}
                isOpen={state.showClipboard}
                isEnabled={state.settings.clipboardEnabled}
                onToggleEnabled={() => actions.setSettings(s => ({...s, clipboardEnabled: !s.clipboardEnabled}))}
                onClose={actions.closeOverlays}
                onClear={actions.handleClearClipboard}
                language={state.language}
            />
        </div>

        {/* VIEW: CHAT / ASSISTANT (Index 1) */}
        <div className={getTransitionClass(1)}>
            <ChatInterface 
                language={state.language} 
                apiKey={state.storedKey}
            />
        </div>

        {/* VIEW: TRANSLATOR (Index 2) */}
        <div className={getTransitionClass(2)}>
            <TranslatorInterface
                language={state.language} 
                apiKey={state.storedKey}
            />
        </div>

      </main>

      {/* Footer */}
      <footer className="shrink-0 py-1 text-center text-slate-700 text-[10px] bg-slate-900 border-t border-slate-800 select-none z-50 relative">
        &copy; {t.footer} 
        {state.currentTab === 'chat' && ' • Assistant Mode'}
        {state.currentTab === 'translator' && ' • Translator'}
      </footer>
    </div>
  );
}
