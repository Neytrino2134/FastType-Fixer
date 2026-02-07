
import React, { useEffect, useCallback } from 'react';

interface UseEditorHotkeysProps {
  undo: () => boolean;
  redo: () => boolean;
  toggleRecording: () => void;
  toggleProcessing: () => void;
  onStatusChange: (status: any) => void;
  onPauseProcessing: () => void;
}

export const useEditorHotkeys = ({
  undo,
  redo,
  toggleRecording,
  toggleProcessing,
  onStatusChange,
  onPauseProcessing
}: UseEditorHotkeysProps) => {

  const handleUndo = useCallback(() => {
    if (undo()) {
        onStatusChange('paused');
        onPauseProcessing(); // Immediately disable smart editing
    }
  }, [undo, onStatusChange, onPauseProcessing]);

  const handleRedo = useCallback(() => {
    if (redo()) {
        onStatusChange('paused');
        onPauseProcessing(); // Immediately disable smart editing
    }
  }, [redo, onStatusChange, onPauseProcessing]);

  // Handle local shortcuts (passed to textarea onKeyDown)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) handleRedo();
          else handleUndo();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
          e.preventDefault();
          handleRedo();
      }
  }, [handleUndo, handleRedo]);

  // Global Hotkey for Recording (Alt+R) and Pause (Alt+A)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
        // Prevent repeat events (holding key down)
        if (e.repeat) return;

        // Alt+R
        if (e.altKey && e.code === 'KeyR') {
            e.preventDefault();
            toggleRecording();
        }
        // Alt+A
        if (e.altKey && e.code === 'KeyA') {
            e.preventDefault();
            toggleProcessing();
        }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [toggleRecording, toggleProcessing]);

  return {
    handleUndo,
    handleRedo,
    handleKeyDown
  };
};
