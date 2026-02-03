
import React, { useState } from 'react';
import { SmartEditor } from './components/SmartEditor';
import { WelcomeScreen } from './components/WelcomeScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { ClipboardHistory } from './components/ClipboardHistory';
import { AppHeader } from './components/AppHeader';
import { SettingsPanel } from './components/SettingsPanel';
import { NotificationSystem } from './components/NotificationSystem';
import { HelpModal } from './components/HelpModal';
import { ChatInterface } from './components/Chat/ChatInterface'; // New Import
import { useAppLogic } from './hooks/useAppLogic';
import { getTranslation } from './utils/i18n';

export default function App() {
  const { state, actions } = useAppLogic();
  const t = getTranslation(state.language);
  
  // Local state to handle exit animations
  const [isExitingApp, setIsExitingApp] = useState(false);
  const [isExitingWelcome, setIsExitingWelcome] = useState(false);

  // Handle transition from Welcome -> App
  const handleStartWithAnimation = (key: string) => {
    setIsExitingWelcome(true);
    setTimeout(() => {
      actions.handleStartApp(key);
      setIsExitingWelcome(false);
    }, 600); // Matches the CSS duration in WelcomeScreen
  };

  // Handle transition from App -> Welcome
  const handleGoHome = () => {
    setIsExitingApp(true);
    setTimeout(() => {
      actions.handleReturnToWelcome();
      setIsExitingApp(false);
    }, 500); // Matches the CSS duration below
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
          isExiting={isExitingWelcome} // Pass exit state
        />
        <NotificationSystem />
      </>
    );
  }

  // --- MAIN APP VIEW ---
  return (
    <div 
        className={`flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden relative transition-all duration-500 ease-in-out ${
            isExitingApp 
              ? 'opacity-0 translate-y-8 scale-95 blur-sm' 
              : 'opacity-100 translate-y-0 scale-100 blur-0 animate-in fade-in slide-in-from-bottom-8'
        }`}
    >
      
      <AppHeader 
        language={state.language}
        status={state.status}
        isGrammarChecking={state.isGrammarChecking} // NEW
        stats={state.stats}
        settings={state.settings}
        showClipboard={state.showClipboard}
        showSettings={state.showSettings}
        showHistory={state.showHistory}
        currentTab={state.currentTab}
        setCurrentTab={actions.setCurrentTab}
        onToggleLanguage={actions.toggleLanguage}
        onTogglePause={() => actions.setSettings(s => ({ ...s, enabled: !s.enabled }))}
        onToggleClipboard={actions.toggleClipboard}
        onToggleSettings={actions.toggleSettings}
        onToggleHistory={actions.toggleHistory}
        onToggleHelp={actions.toggleHelp}
        onGoHome={handleGoHome}
        onWindowControl={actions.handleWindowControl}
        onResetProcessor={actions.handleResetProcessor}
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
      {state.showSettings && (
        <SettingsPanel 
          settings={state.settings}
          language={state.language}
          onUpdateSettings={actions.setSettings}
          onResetKey={actions.handleResetKey}
          hasLock={state.hasLock}
          onRemoveLock={actions.handleRemoveLock}
          onClose={actions.toggleSettings}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col bg-slate-900 w-full h-full overflow-hidden">
        
        {/* VIEW: EDITOR */}
        <div className={`absolute inset-0 w-full h-full flex flex-col transition-all duration-300 ${state.currentTab === 'editor' ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'}`}>
             <SmartEditor 
                settings={state.settings} 
                onStatsUpdate={actions.incrementStats} 
                language={state.language}
                status={state.status}
                onStatusChange={actions.setStatus} 
                setIsGrammarChecking={actions.setIsGrammarChecking} // NEW
                onClipboardAction={actions.handleClipboardAction}
                resetSignal={state.resetSignal}
                showHistory={state.showHistory}
                onToggleHistory={actions.toggleHistory}
                onPauseProcessing={() => actions.setSettings(s => ({ ...s, enabled: false }))}
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

        {/* VIEW: CHAT */}
        <div className={`absolute inset-0 w-full h-full flex flex-col transition-all duration-300 ${state.currentTab === 'chat' ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}`}>
            {state.currentTab === 'chat' && (
                <ChatInterface 
                    language={state.language} 
                    apiKey={state.storedKey}
                />
            )}
        </div>

      </main>

      {/* Footer */}
      <footer className="shrink-0 py-1 text-center text-slate-700 text-[10px] bg-slate-900 border-t border-slate-800 select-none">
        &copy; {t.footer} {state.currentTab === 'chat' && '• Chat Mode'}
      </footer>
    </div>
  );
}
