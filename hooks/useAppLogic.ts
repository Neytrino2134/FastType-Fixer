
import { useState, useEffect, useCallback } from 'react';
import { AppState, CorrectionSettings, Language, ProcessingStatus, ClipboardItem, Tab } from '../types';
import { setGeminiApiKey } from '../services/geminiService';
import { loadDictionaries } from '../data/dictionary';

const STORAGE_KEY_SETTINGS = 'fasttype_settings_v1';

const DEFAULT_SETTINGS: CorrectionSettings = {
  enabled: true,
  debounceMs: 700,
  finalizationTimeout: 5000,
  miniScripts: true, 
  fixTypos: true,
  fixPunctuation: true,
  clipboardEnabled: true,
  silenceThreshold: 15,
  audioModel: 'gemini-2.5-flash',
  economyMode: true,
  dictionaryCheck: true, // Default enabled
  // Visualizer Defaults
  visualizerLowCut: 0,
  visualizerHighCut: 128,
  visualizerAmp: 0.4,
  visualizerStyle: 'wave', // Default changed to 'wave'
  visualizerNorm: false,
  visualizerGravity: 2.0,
  visualizerMirror: true, // Default changed to true
  developerMode: false
};

export const useAppLogic = () => {
  // App Flow State
  const [appState, setAppState] = useState<AppState>('loading');
  const [storedKey, setStoredKey] = useState('');
  
  // Security State
  const [lockCode, setLockCode] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  // Logic State
  const [currentTab, setCurrentTab] = useState<Tab>('editor'); 
  const [language, setLanguage] = useState<Language>('ru');
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [isGrammarChecking, setIsGrammarChecking] = useState(false); 
  const [stats, setStats] = useState({ corrections: 0 });
  const [resetSignal, setResetSignal] = useState(0); 
  const [isPinned, setIsPinned] = useState(false); 
  
  // Configuration State (With Persistence)
  const [settings, setSettings] = useState<CorrectionSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        // Merge saved settings with defaults to ensure all keys exist (if new settings added in future)
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn("Failed to load settings", e);
    }
    return DEFAULT_SETTINGS;
  });

  // Save Settings Persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [showClipboard, setShowClipboard] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  // Persistent Clipboard History
  const [clipboardHistory, setClipboardHistory] = useState<ClipboardItem[]>(() => {
    try {
      const saved = localStorage.getItem('fasttype_clipboard');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Save Clipboard to LocalStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('fasttype_clipboard', JSON.stringify(clipboardHistory));
  }, [clipboardHistory]);

  // Electron IPC
  const [ipcRenderer, setIpcRenderer] = useState<any>(null);

  // 1. Initialize Electron IPC
  useEffect(() => {
    if (window.require) {
      try {
        const electron = window.require('electron');
        setIpcRenderer(electron.ipcRenderer);
      } catch (e) {
        console.log('Electron not found (likely in browser mode)');
      }
    }
  }, []);

  // 2. Startup Logic
  useEffect(() => {
    const initApp = async () => {
      const dictPromise = loadDictionaries();
      const minLoadTime = new Promise(resolve => setTimeout(resolve, 2000));
      
      const envKey = process.env.API_KEY || '';
      const localKey = localStorage.getItem('gemini_api_key') || '';
      const initialKey = envKey || localKey;

      setStoredKey(initialKey);
      
      const savedLock = localStorage.getItem('fasttype_lock_code');
      if (savedLock) {
        setLockCode(savedLock);
        setIsLocked(true);
      }

      await Promise.all([minLoadTime, dictPromise]);
      setAppState('welcome');
    };

    initApp();
  }, []);

  // 3. Actions
  const handleStartApp = useCallback((key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setGeminiApiKey(key);
    // FIX: Force reset tab to editor to prevent "sliding" effect if user left on another tab
    setCurrentTab('editor'); 
    setStatus('idle'); // Ensure status is clean
    setAppState('app');
  }, []);

  // New: Update Key without full reset
  const handleUpdateKey = useCallback((key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setGeminiApiKey(key);
    setStoredKey(key);
  }, []);

  const handleReturnToWelcome = useCallback(() => {
    if (lockCode) {
        setIsLocked(true);
    }
    setAppState('welcome');
    setShowSettings(false);
    setShowClipboard(false);
    setShowHelp(false);
    setShowHistory(false);
    setCurrentTab('editor'); // Reset to editor
  }, [lockCode]);

  const handleSetLock = useCallback((code: string) => {
    localStorage.setItem('fasttype_lock_code', code);
    setLockCode(code);
    setIsLocked(false);
  }, []);

  const handleRemoveLock = useCallback(() => {
    localStorage.removeItem('fasttype_lock_code');
    setLockCode('');
    setIsLocked(false);
  }, []);

  // NEW: Validate PIN for Settings changes (Change/Remove)
  const validatePin = useCallback((input: string) => {
      return input === lockCode;
  }, [lockCode]);

  // NEW: Handle Full Data Wipe
  const handleWipeData = useCallback(() => {
    // 1. Remove Lock
    localStorage.removeItem('fasttype_lock_code');
    setLockCode('');
    setIsLocked(false);

    // 2. Clear Clipboard
    localStorage.removeItem('fasttype_clipboard');
    setClipboardHistory([]);

    // 3. Clear Stats
    setStats({ corrections: 0 });

    // 4. Force Unlock logic
    setIsLocked(false);
    
    // Note: Editor history wipe happens in App.tsx via Ref, but we clear LS key here just in case
    localStorage.removeItem('fasttype_editor_state_v2');
    
    // Also reset settings to default
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(STORAGE_KEY_SETTINGS);

    return true;
  }, []);

  const handleUnlock = useCallback((input: string) => {
     if (input === lockCode) {
         setIsLocked(false);
         return true;
     }
     return false;
  }, [lockCode]);

  const handleResetKey = useCallback(() => {
    localStorage.removeItem('gemini_api_key');
    setStoredKey('');
    setShowSettings(false);
    setAppState('welcome');
  }, []);

  const incrementStats = useCallback(() => {
    setStats(prev => ({ corrections: prev.corrections + 1 }));
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => (prev === 'ru' ? 'en' : 'ru'));
  }, []);

  const toggleSettings = useCallback(() => {
    setShowSettings(prev => !prev);
    setShowClipboard(false);
    setShowHelp(false);
    setShowHistory(false);
  }, []);

  const toggleClipboard = useCallback(() => {
    setShowClipboard(prev => !prev);
    setShowSettings(false);
    setShowHelp(false);
    setShowHistory(false);
  }, []);

  const toggleHistory = useCallback(() => {
    setShowHistory(prev => !prev);
    setShowClipboard(false);
    setShowSettings(false);
    setShowHelp(false);
  }, []);

  const toggleHelp = useCallback(() => {
    setShowHelp(prev => !prev);
    setShowSettings(false);
    setShowClipboard(false);
    setShowHistory(false);
  }, []);
  
  const closeOverlays = useCallback(() => {
    setShowClipboard(false);
    setShowSettings(false);
    setShowHelp(false);
    setShowHistory(false);
  }, []);

  const handleClipboardAction = useCallback((text: string) => {
    if (!settings.clipboardEnabled || !text) return;
    
    setClipboardHistory(prev => {
       const newItem: ClipboardItem = {
         id: Math.random().toString(36).substring(7),
         text,
         timestamp: Date.now()
       };
       return [newItem, ...prev].slice(0, 50);
    });
  }, [settings.clipboardEnabled]);

  const handleClearClipboard = useCallback((text?: string) => {
    setClipboardHistory([]);
  }, []);

  const handleResetProcessor = useCallback(() => {
    setResetSignal(prev => prev + 1);
    // Force resume and enable all checks to ensure a clean working state
    setSettings(prev => ({
        ...prev,
        enabled: true,
        miniScripts: true,
        fixTypos: true,
        fixPunctuation: true,
        dictionaryCheck: true
    }));
    setStatus('idle');
  }, []);

  const handleToggleProcessing = useCallback(() => {
    setSettings(prev => {
        const nextState = !prev.enabled;
        setStatus(nextState ? 'idle' : 'paused'); 
        
        // If enabling, also enable all sub-features for "Global Resume"
        if (nextState) {
            return { 
                ...prev, 
                enabled: true, 
                miniScripts: true, 
                fixTypos: true, 
                fixPunctuation: true, 
                dictionaryCheck: true 
            };
        }
        
        return { ...prev, enabled: nextState };
    });
  }, []);

  const handleTogglePin = useCallback(() => {
    const nextState = !isPinned;
    setIsPinned(nextState);
    if (ipcRenderer) {
        ipcRenderer.send('window-toggle-always-on-top', nextState);
    }
  }, [isPinned, ipcRenderer]);

  const handleWindowControl = useCallback((action: 'minimize' | 'maximize' | 'close') => {
    if (ipcRenderer) {
      ipcRenderer.send(`window-${action}`);
    }
  }, [ipcRenderer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'F1') {
        e.preventDefault();
        toggleHelp();
        return;
      }

      if (e.code === 'Home') {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable;
        
        if (!isInput) {
            e.preventDefault();
            handleReturnToWelcome();
            return;
        }
      }

      if (e.altKey) {
        switch (e.code) {
          case 'KeyS':
            e.preventDefault();
            toggleSettings();
            break;
          case 'KeyW': // Changed from KeyV to KeyW
            e.preventDefault();
            toggleClipboard();
            break;
          case 'KeyH': 
            e.preventDefault();
            toggleHistory();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSettings, toggleClipboard, toggleHelp, toggleHistory, handleReturnToWelcome]);

  return {
    state: {
      appState,
      storedKey,
      language,
      status,
      isGrammarChecking,
      stats,
      settings,
      showSettings,
      showClipboard,
      showHistory,
      showHelp,
      clipboardHistory,
      resetSignal,
      isLocked,
      hasLock: !!lockCode,
      currentTab,
      isPinned 
    },
    actions: {
      setLanguage,
      setStatus,
      setIsGrammarChecking,
      setSettings,
      setAppState,
      handleStartApp,
      handleReturnToWelcome,
      handleResetKey,
      handleUpdateKey, // Exported
      incrementStats,
      toggleLanguage,
      toggleSettings,
      toggleClipboard,
      toggleHistory,
      toggleHelp,
      closeOverlays,
      handleClipboardAction,
      handleClearClipboard,
      handleWindowControl,
      handleResetProcessor,
      handleSetLock,
      handleRemoveLock,
      handleUnlock,
      validatePin, // New Action
      setCurrentTab,
      handleToggleProcessing,
      handleTogglePin,
      handleWipeData
    }
  };
};
