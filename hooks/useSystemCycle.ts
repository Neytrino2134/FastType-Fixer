
import { useState, useRef, useCallback } from 'react';
import { useNotification } from '../contexts/NotificationContext';

interface UseSystemCycleProps {
  player: any;
  setDevSkip: (v: boolean) => void;
  setIsEditorMode: (v: boolean) => void;
  stopAllSFX: () => void;
}

export const useSystemCycle = ({ player, setDevSkip, setIsEditorMode, stopAllSFX }: UseSystemCycleProps) => {
  const { addNotification } = useNotification();
  
  const [rebootPhase, setRebootPhase] = useState<'idle' | 'waiting' | 'active'>('idle');
  const [introState, setIntroState] = useState<0 | 1 | 2>(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [startupKey, setStartupKey] = useState(0); 
  const hasBootedRef = useRef(false);

  const handleScheduleReload = useCallback(() => {
    // Disable reboot if startup sequence is active (introState < 2)
    if (introState < 2) return;

    if (rebootPhase !== 'idle') {
        setRebootPhase('idle');
        addNotification("Reboot Cancelled", "info");
        return;
    }
    if (player.isPlaying && Number.isFinite(player.duration) && player.duration > player.currentTime) {
        setRebootPhase('waiting');
        addNotification("Reboot scheduled after track", "warning");
    } else {
        setRebootPhase('active');
        player.setIsPlaying(false);
    }
  }, [rebootPhase, player, addNotification, introState]);

  const handleGoHome = useCallback(() => {
      if (introState < 2 || rebootPhase === 'active') return;
      player.stop();
      setIntroState(0);
      setStartupKey(prev => prev + 1); 
      // Removed setViewMode('default') to preserve the current view state (e.g. Cinema Mode)
      setDevSkip(false); 
      setIsEditorMode(false); 
      // Reset boot flag so notifications can fire again on next start
      hasBootedRef.current = false;
  }, [introState, rebootPhase, player, setDevSkip, setIsEditorMode]);

  const handleBootComplete = useCallback(() => {
      if (!hasBootedRef.current) {
          hasBootedRef.current = true;
          
          // 1. Immediate Success Notification
          addNotification("SYSTEM INITIALIZED", "success");

          // 2. Delayed User Verification Notification
          setTimeout(() => {
              addNotification("USER VERIFICATION: CHECKING...", "info");
          }, 1200);

          // 3. Delayed Tutorial Check
          setTimeout(() => {
              const tutorialDone = localStorage.getItem('neon_tutorial_complete');
              // If tutorialDone is null, or anything other than strictly 'true', show tutorial
              if (tutorialDone !== 'true') {
                  setShowTutorial(true);
                  addNotification("LAUNCHING SYSTEM GUIDE...", "warning");
              } else {
                  addNotification("WELCOME BACK, USER", "success");
              }
          }, 3000);
      }
  }, [addNotification]);

  const handleCancelReboot = useCallback(() => {
      setRebootPhase('idle');
      stopAllSFX();
      addNotification("Reboot Cancelled", "info");
  }, [stopAllSFX, addNotification]);

  return {
    rebootPhase,
    setRebootPhase,
    introState,
    setIntroState,
    showTutorial,
    setShowTutorial,
    startupKey,
    handleScheduleReload,
    handleGoHome,
    handleBootComplete,
    handleCancelReboot
  };
};
