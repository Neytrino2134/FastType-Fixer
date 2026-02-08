
import { useState, useEffect, useCallback } from 'react';
import { AppState, CorrectionSettings, Language, ProcessingStatus, ClipboardItem, Tab, AudioArchiveItem } from '../types';
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
  ttsVoice: 'Puck', 
  economyMode: true,
  dictionaryCheck: true, 
  visualizerLowCut: 0,
  visualizerHighCut: 128,
  visualizerAmp: 0.4,
  visualizerStyle: 'wave', 
  visualizerNorm: false,
  visualizerGravity: 2.0,
  visualizerMirror: true, 
  developerMode: false,
  monochromeMode: false,
  voiceControlEnabled: false, 
  wakeWord: 'start recording',
  isFreeTier: true // Default to Free Tier (Safest option)
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
  const [dictionariesLoaded, setDictionariesLoaded] = useState(false);
  
  // Configuration State (With Persistence)
  const [settings, setSettings] = useState<CorrectionSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        // Merge with default to ensure new keys (like isFreeTier) exist
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
  const [showAudioArchive, setShowAudioArchive] = useState(false);
  
  // Persistent Clipboard History
  const [clipboardHistory, setClipboardHistory] = useState<ClipboardItem[]>(() => {
    try {
      const saved = localStorage.getItem('fasttype_clipboard');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Audio Archive State
  const [audioArchive, setAudioArchive] = useState<AudioArchiveItem[]>([]);

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
      setDictionariesLoaded(true); 
      setAppState('welcome');
    };

    initApp();
  }, []);

  // 3. Actions
  const handleStartApp = useCallback((key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setGeminiApiKey(key);
    setCurrentTab('editor'); 
    setStatus('idle'); 
    setAppState('app');
  }, []);

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
    setShowAudioArchive(false);
    setCurrentTab('editor');
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

  const validatePin = useCallback((input: string) => {
      return input === lockCode;
  }, [lockCode]);

  const handleWipeData = useCallback(() => {
    localStorage.removeItem('fasttype_lock_code');
    setLockCode('');
    setIsLocked(false);
    localStorage.removeItem('fasttype_clipboard');
    setClipboardHistory([]);
    setStats({ corrections: 0 });
    setIsLocked(false);
    localStorage.removeItem('fasttype_editor_state_v2');
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(STORAGE_KEY_SETTINGS);
    setAudioArchive([]); 
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
    setLanguage(prev => {
        if (prev === 'ru') return 'uz-latn';
        if (prev === 'uz-latn') return 'uz-cyrl';
        if (prev === 'uz-cyrl') return 'en';
        return 'ru';
    });
  }, []);

  const toggleSettings = useCallback(() => {
    setShowSettings(prev => !prev);
    setShowClipboard(false);
    setShowHelp(false);
    setShowHistory(false);
    setShowAudioArchive(false);
  }, []);

  const toggleClipboard = useCallback(() => {
    setShowClipboard(prev => !prev);
    setShowSettings(false);
    setShowHelp(false);
    setShowHistory(false);
    setShowAudioArchive(false);
  }, []);

  const toggleHistory = useCallback(() => {
    setShowHistory(prev => !prev);
    setShowClipboard(false);
    setShowSettings(false);
    setShowHelp(false);
    setShowAudioArchive(false);
  }, []);

  const toggleHelp = useCallback(() => {
    setShowHelp(prev => !prev);
    setShowSettings(false);
    setShowClipboard(false);
    setShowHistory(false);
    setShowAudioArchive(false);
  }, []);

  const toggleAudioArchive = useCallback(() => {
    setShowAudioArchive(prev => !prev);
    setShowSettings(false);
    setShowClipboard(false);
    setShowHistory(false);
    setShowHelp(false);
  }, []);
  
  const closeOverlays = useCallback(() => {
    setShowClipboard(false);
    setShowSettings(false);
    setShowHelp(false);
    setShowHistory(false);
    setShowAudioArchive(false);
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

  const handleAddToAudioArchive = useCallback((item: AudioArchiveItem) => {
      setAudioArchive(prev => [item, ...prev].slice(0, 20)); 
  }, []);

  const handleRemoveFromAudioArchive = useCallback((id: string) => {
      setAudioArchive(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleClearAudioArchive = useCallback(() => {
      setAudioArchive([]);
  }, []);

  const handleResetProcessor = useCallback(() => {
    setResetSignal(prev => prev + 1);
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
        if (prev.enabled) {
            setStatus('paused');
            return {
                ...prev,
                enabled: false 
            };
        } else {
            setStatus('idle');
            return {
                ...prev,
                enabled: true
            };
        }
    });
  }, []);

  // NEW: Force Free Tier (Used when quota is exceeded)
  const handleForceFreeTier = useCallback(() => {
      setSettings(prev => ({ 
          ...prev, 
          isFreeTier: true,
          // Ensure processing remains enabled for text, but tier is locked
          enabled: true 
      }));
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

      if (e.ctrlKey || e.metaKey) {
          switch (e.code) {
              case 'Digit1':
                  e.preventDefault();
                  setCurrentTab('editor');
                  break;
              case 'Digit2':
                  e.preventDefault();
                  setCurrentTab('chat');
                  break;
              case 'Digit3':
                  e.preventDefault();
                  setCurrentTab('translator');
                  break;
              case 'Digit4':
                  e.preventDefault();
                  setCurrentTab('planner');
                  break;
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
      showAudioArchive,
      clipboardHistory,
      audioArchive,
      resetSignal,
      isLocked,
      hasLock: !!lockCode,
      currentTab,
      isPinned,
      dictionariesLoaded
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
      handleUpdateKey,
      incrementStats,
      toggleLanguage,
      toggleSettings,
      toggleClipboard,
      toggleHistory,
      toggleHelp,
      toggleAudioArchive,
      closeOverlays,
      handleClipboardAction,
      handleClearClipboard,
      handleAddToAudioArchive,
      handleRemoveFromAudioArchive,
      handleClearAudioArchive,
      handleWindowControl,
      handleResetProcessor,
      handleSetLock,
      handleRemoveLock,
      handleUnlock,
      validatePin,
      setCurrentTab,
      handleToggleProcessing,
      handleTogglePin,
      handleWipeData,
      handleForceFreeTier // Export new action
    }
  };
};
