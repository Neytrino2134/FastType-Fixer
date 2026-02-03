
import { useEffect, useRef } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { useTheme, THEME_KEYS } from '../contexts/ThemeContext';
import { ViewMode, RecorderConfig } from '../types';

interface UseAppHotkeysProps {
  player: any; // AudioPlayer hook return type
  config: any; // AppConfig hook return type
  focusMode: boolean;
  toggleFocusMode: (force?: boolean) => void;
  handleScheduleReload: () => void;
  stopAllSFX: () => void;
  setDevSkip: (v: boolean) => void;
  setIntroState: (v: any) => void;
  setShowTutorial: (v: boolean) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onGoHome: () => void;
  // Recording
  isRecording: boolean;
  startRecording: (config: RecorderConfig) => void;
  stopRecording: () => void;
  // System State
  introState: number;
  // Playlist Lock
  isPlaylistLocked: boolean;
  setPlaylistLocked: (v: boolean) => void;
}

// Map of Section Key (1-7) -> Sub-key (1-9) -> Module ID (to be expanded)
const COMBO_MAP: Record<string, Record<string, string>> = {
    '1': { '1': 'files', '2': 'presets', '3': 'themes', '4': 'debug' }, // System
    '2': { '1': 'bg-settings', '2': 'bg-resources', '3': 'bg-colors', '4': 'screen-share' }, // Background
    '3': { '1': 'mixer', '2': 'ambience', '3': 'sysaudio' }, // Sound
    '4': { '1': 'wave', '2': 'reactor', '3': 'sine' }, // Waves
    '5': { '1': 'marquee', '2': 'dvd', '3': 'leaks', '4': 'rain', '5': 'hologram', '6': 'gemini', '7': 'scan', '8': 'cyber', '9': 'glitch' }, // Modules
    '6': { '1': 'tron' }, // Game
    '7': { '1': 'fps', '2': 'signal', '3': 'chromatic', '4': 'vignette', '5': 'flicker' } // Post
};

const COMBO_TIMEOUT = 1000; // ms to wait for second key

export const useAppHotkeys = ({
  player,
  config,
  focusMode,
  toggleFocusMode,
  handleScheduleReload,
  stopAllSFX,
  setDevSkip,
  setIntroState,
  setShowTutorial,
  toggleLeftPanel,
  toggleRightPanel,
  viewMode,
  setViewMode,
  onGoHome,
  isRecording,
  startRecording,
  stopRecording,
  introState,
  isPlaylistLocked,
  setPlaylistLocked
}: UseAppHotkeysProps) => {
  const { addNotification } = useNotification();
  const { currentTheme, setTheme, setControlStyle } = useTheme();
  
  // Throttling ref for preset switching to prevent spam freeze
  const lastPresetSwitchTimeRef = useRef<number>(0);

  // Combo System Refs
  const lastSectionKeyRef = useRef<string | null>(null);
  const lastSectionTimeRef = useRef<number>(0);

  // Default recording config for hotkey
  const defaultRecConfig: RecorderConfig = {
      resolution: '1080p',
      fps: 60,
      videoBitrate: 8000000,
      audioBitrate: 192000
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      
      // Ctrl+Shift+R: Force System Cursor (Emergency Recovery)
      if (e.ctrlKey && e.shiftKey && (e.code === 'KeyR')) {
          e.preventDefault();
          e.stopPropagation();
          config.setCursorStyle('system');
          addNotification("DEV: SYSTEM CURSOR FORCED", "warning");
          return;
      }

      // Shift + F: Toggle Fullscreen (GLOBAL, Works during Boot)
      if (e.code === 'KeyF' && e.shiftKey) {
          e.preventDefault();
          if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(err => {
                  console.error(`Error attempting to enable full-screen mode: ${err.message}`);
              });
          } else {
              document.exitFullscreen();
          }
          return;
      }

      // SKIP INTRO (Allowed during startup)
      if (e.code === 'Backslash' && e.shiftKey || e.code === 'Insert') {
          setDevSkip(true);
          setIntroState(2);
          setShowTutorial(false);
          stopAllSFX();
          addNotification("DEV SKIP ACTIVATED", "warning");
          return;
      }

      // --- BLOCK OTHER HOTKEYS DURING STARTUP ---
      // introState < 2 means we are in the boot/login sequence
      if (introState < 2) return;

      if (e.code === 'Home') {
          onGoHome();
          return;
      }

      // F9: Toggle Recording
      if (e.code === 'F9') {
          e.preventDefault();
          if (isRecording) {
              stopRecording();
          } else {
              startRecording(defaultRecConfig);
              addNotification("RECORDING STARTED (1080p/60)", "success");
          }
          return;
      }

      // --- INPUT FIELD PROTECTION ---
      // Allow keys if modifier is held (e.g. Ctrl+C in input)
      if ((target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') && !e.ctrlKey && !e.altKey && !e.metaKey) return;

      if (e.repeat) return;

      // Shift + C: Compact Mode (Desktop Only)
      if (e.code === 'KeyC' && e.shiftKey) {
          const isElectron = typeof navigator !== 'undefined' && /Electron/.test(navigator.userAgent);
          if (isElectron) {
              setViewMode(viewMode === 'mini' ? 'default' : 'mini');
          } else {
              addNotification("COMPACT MODE: DESKTOP ONLY", "warning");
          }
          return;
      }

      // Shift + L: Toggle Playlist Lock
      if (e.code === 'KeyL' && e.shiftKey) {
          e.preventDefault();
          setPlaylistLocked(!isPlaylistLocked);
          addNotification(isPlaylistLocked ? "PLAYLIST UNLOCKED" : "PLAYLIST LOCKED", "info");
          return;
      }

      // KeyP logic
      if (e.code === 'KeyP') {
          if (e.shiftKey) {
              // Shift + P: Toggle Player Focus Mode
              setViewMode(viewMode === 'player-focus' ? 'default' : 'player-focus');
              addNotification(viewMode === 'player-focus' ? "UI RESTORED" : "PLAYER FOCUSED", "info");
          } else {
              // P: Toggle Media Player (Right Panel)
              toggleRightPanel();
          }
          return;
      }

      // Check for modifiers to avoid collisions with Ctrl+A, Ctrl+S, etc.
      const hasModifier = e.ctrlKey || e.metaKey || e.altKey;

      // --- COMBO SYSTEM FOR SECTIONS (1-7) ---
      // Check if key is digit 1-9
      if (!hasModifier && e.code.startsWith('Digit')) {
          const keyNum = e.key; // "1", "2", etc.
          const now = Date.now();
          
          // Check if we are in a combo window
          if (lastSectionKeyRef.current && (now - lastSectionTimeRef.current < COMBO_TIMEOUT)) {
              // Attempt to resolve sub-module
              const sectionMap = COMBO_MAP[lastSectionKeyRef.current];
              if (sectionMap && sectionMap[keyNum]) {
                  // Valid Combo!
                  const moduleId = sectionMap[keyNum];
                  // Dispatch custom event for SettingsPanel to catch
                  window.dispatchEvent(new CustomEvent('neon-toggle-module', { detail: moduleId }));
                  
                  // Keep the combo alive? User request says "short wait, then back".
                  // We update time so they can chain within the same section if they want?
                  // Or we can reset. Let's update time to allow 5-1... 5-2 quickly without repaying 5.
                  lastSectionTimeRef.current = now;
                  return; // Don't trigger main section toggle
              }
          }

          // If no combo executed (or timed out, or first press):
          // Check if this key corresponds to a main section (1-7)
          // Mapping: 1=sys, 2=bg, 3=sfx, 4=waves, 5=mod, 6=game, 7=post
          const sectionIds = ['sys', 'bg', 'sfx', 'waves', 'mod', 'game', 'post'];
          const num = parseInt(keyNum);
          
          if (num >= 1 && num <= 7) {
              const sectionId = sectionIds[num - 1];
              // Trigger section toggle logic via event
              window.dispatchEvent(new CustomEvent('neon-toggle-section', { detail: sectionId }));
              
              // Set state for potential combo
              lastSectionKeyRef.current = keyNum;
              lastSectionTimeRef.current = now;
              return;
          }
      }

      // Playback controls allowed even when playlist is locked
      if (e.code === 'Minus' && !hasModifier) { // Previous Track (-)
          if (isPlaylistLocked) return;
          player.prevTrack();
      } 
      else if (e.code === 'Equal' && !hasModifier) { // Next Track (=)
          if (isPlaylistLocked) return;
          player.nextTrack();
      }
      else if (e.code === 'KeyS') {
          if (e.shiftKey) {
              // Shift + S: Stop Playback
              if (isPlaylistLocked) return;
              player.stop();
              addNotification("STOPPED", "info");
          } else if (!hasModifier) {
              // S: Toggle System Panel (Left)
              toggleLeftPanel();
          }
      } 
      else if (e.code === 'PageUp') { // Theme Previous
          e.preventDefault();
          const currentIdx = THEME_KEYS.indexOf(currentTheme);
          const prevIdx = (currentIdx - 1 + THEME_KEYS.length) % THEME_KEYS.length;
          setTheme(THEME_KEYS[prevIdx]);
          addNotification(`THEME: ${THEME_KEYS[prevIdx].toUpperCase().replace('-', ' ')}`, "info");
      }
      else if (e.code === 'PageDown') { // Theme Next
          e.preventDefault();
          const currentIdx = THEME_KEYS.indexOf(currentTheme);
          const nextIdx = (currentIdx + 1) % THEME_KEYS.length;
          setTheme(THEME_KEYS[nextIdx]);
          addNotification(`THEME: ${THEME_KEYS[nextIdx].toUpperCase().replace('-', ' ')}`, "info");
      }
      else if (e.code === 'BracketLeft') { 
          const now = Date.now();
          if (now - lastPresetSwitchTimeRef.current < 500) return; 
          lastPresetSwitchTimeRef.current = now;

          if (config.savedPresets.length > 0) {
              const currentIndex = config.savedPresets.findIndex((p: any) => p.id === config.activePresetId);
              const nextIdx = currentIndex <= 0 ? config.savedPresets.length - 1 : currentIndex - 1;
              const p = config.savedPresets[nextIdx];
              config.loadPreset(p.id);
              if (p.config.theme) setTheme(p.config.theme);
              if (p.config.controlStyle) setControlStyle(p.config.controlStyle);
              addNotification(`LOADED: ${p.name}`, "success");
          }
      } else if (e.code === 'BracketRight') {
          const now = Date.now();
          if (now - lastPresetSwitchTimeRef.current < 500) return; 
          lastPresetSwitchTimeRef.current = now;

          if (config.savedPresets.length > 0) {
              const currentIndex = config.savedPresets.findIndex((p: any) => p.id === config.activePresetId);
              const nextIdx = (currentIndex + 1) % config.savedPresets.length;
              const p = config.savedPresets[nextIdx];
              config.loadPreset(p.id);
              if (p.config.theme) setTheme(p.config.theme);
              if (p.config.controlStyle) setControlStyle(p.config.controlStyle);
              addNotification(`LOADED: ${p.name}`, "success");
          }
      }
      else if (e.code === 'Space') {
        e.preventDefault();
        // If Locked: Only allow starting playback. Do NOT allow pausing.
        if (isPlaylistLocked && player.isPlaying) {
            addNotification("CONTROLS LOCKED", "warning");
            return;
        }
        player.togglePlay();
      } else if (e.code === 'Backslash') { // BG Next (\)
        config.nextBg();
      } else if (e.code === 'Quote') { // BG Prev (')
        config.prevBg();
      } else if (e.code === 'KeyF') {
        // Just 'F' is Cinema Mode
        if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
            e.preventDefault();
            toggleFocusMode();
        }
      } else if (e.code === 'Pause') {
        handleScheduleReload();
      } else if (e.code === 'Escape') {
        if (focusMode) {
            toggleFocusMode(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [player, config, focusMode, handleScheduleReload, toggleFocusMode, addNotification, stopAllSFX, currentTheme, setTheme, setControlStyle, toggleLeftPanel, toggleRightPanel, viewMode, setViewMode, onGoHome, isRecording, startRecording, stopRecording, introState, isPlaylistLocked, setPlaylistLocked]);
};
