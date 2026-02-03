
import { useState, useEffect, useCallback } from 'react';
import { AppState, CorrectionSettings, Language, ProcessingStatus, ClipboardItem, Tab } from '../types';
import { setGeminiApiKey } from '../services/geminiService';
import { loadDictionaries } from '../data/dictionary';

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
  const [isGrammarChecking, setIsGrammarChecking] = useState(false); // NEW: Separate grammar status
  const [stats, setStats] = useState({ corrections: 0 });
  const [resetSignal, setResetSignal] = useState(0); 
  
  // Configuration State
  const [settings, setSettings] = useState<CorrectionSettings>({
    enabled: true,
    debounceMs: 700,
    fixTypos: true,
    fixPunctuation: true,
    clipboardEnabled: true,
    silenceThreshold: 15,
    audioModel: 'gemini-2.5-flash',
    economyMode: true
  });

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
    setAppState('app');
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

  const handleClearClipboard = useCallback(() => {
    setClipboardHistory([]);
  }, []);

  const handleResetProcessor = useCallback(() => {
    setResetSignal(prev => prev + 1);
  }, []);

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
          case 'KeyV':
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
      currentTab 
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
      setCurrentTab
    }
  };
};
