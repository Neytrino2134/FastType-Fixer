
import React, { useEffect, useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { ProcessingStatus, CorrectionSettings, Language } from '../types';
import { useSmartEditor } from '../hooks/useSmartEditor';
import { EditorSurface } from './Editor/EditorSurface';
import { EditorToolbar } from './Editor/EditorToolbar';
import { HistoryPanel } from './HistoryPanel';
import { useNotification } from '../contexts/NotificationContext';
import { getTranslation } from '../utils/i18n';

interface SmartEditorProps {
  settings: CorrectionSettings;
  onStatsUpdate: (count: number) => void;
  language: Language;
  status: ProcessingStatus;
  onStatusChange: (status: ProcessingStatus) => void;
  setIsGrammarChecking: (isChecking: boolean) => void; 
  onClipboardAction: (text: string) => void;
  resetSignal: number;
  showHistory: boolean;
  onToggleHistory: () => void;
  onPauseProcessing: () => void;
  onToggleProcessing: () => void;
  onInteraction: () => void; // New prop for closing overlays
  onHistoryUpdate: () => void; // NEW: Notify parent of history change
}

export interface SmartEditorHandle {
    clear: () => void;
    copy: () => void;
    paste: () => Promise<void>;
    fullWipe: () => void; // NEW: Method to wipe history and text
}

export const SmartEditor = forwardRef<SmartEditorHandle, SmartEditorProps>((props, ref) => {
  const {
    text,
    committedLength,
    correctedLength,
    checkedLength,
    processedLength, 
    finalizedSentences,
    aiFixedSegments,
    dictatedSegments, // NEW
    textareaRef,
    backdropRef,
    isBusy,
    canUndo,
    canRedo,
    handleScroll,
    handleChange,
    handleKeyDown,
    handleClipboardEvent,
    handleUndo,
    handleRedo,
    handleEnhance,
    toggleRecording,
    visualizerDataRef,
    autoStopCountdown,
    visualizerStatus,
    isAnalyzing, // NEW
    isRecording, // NEW
    history,
    historyIndex,
    handleHistoryJump,
    lastHistoryUpdate, // NEW
    clearHistory, // NEW
    setFullText, // NEW
    handleAudioFile // NEW
  } = useSmartEditor(props);

  const { addNotification } = useNotification();
  const t = getTranslation(props.language);

  // Resume Animation State
  const [showResumeAnim, setShowResumeAnim] = useState(false);
  const isFirstRender = useRef(true);

  // Helper: Safe Clipboard Write (Electron + Web)
  const safeWriteClipboard = async (text: string) => {
    // 1. Try Electron (NodeIntegration)
    if (window.require) {
        try {
            const { clipboard } = window.require('electron');
            clipboard.writeText(text);
            return;
        } catch (e) {
            console.warn("Electron clipboard write error (fallback to web)", e);
        }
    }
    // 2. Fallback to Web API
    try {
        await navigator.clipboard.writeText(text);
    } catch (e) {
        console.error("Web clipboard write error", e);
        throw e;
    }
  };

  // Helper: Safe Clipboard Read (Electron + Web)
  const safeReadClipboard = async (): Promise<string> => {
    // 1. Try Electron (NodeIntegration)
    if (window.require) {
        try {
            const { clipboard } = window.require('electron');
            return clipboard.readText();
        } catch (e) {
            console.warn("Electron clipboard read error (fallback to web)", e);
        }
    }
    // 2. Fallback to Web API
    try {
        return await navigator.clipboard.readText();
    } catch (e) {
        console.error("Web clipboard read error", e);
        throw e;
    }
  };

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
      clear: () => {
          setFullText('');
      },
      copy: async () => {
          if (!text) return;
          try {
              await safeWriteClipboard(text);
              addNotification(props.language === 'ru' ? "Скопировано!" : "Copied!", 'success');
          } catch (e) {
              addNotification(props.language === 'ru' ? "Ошибка копирования" : "Copy failed", 'error');
          }
      },
      paste: async () => {
          try {
              const clipText = await safeReadClipboard();
              if (!clipText) return;
              
              const ta = textareaRef.current;
              if (ta) {
                  const start = ta.selectionStart;
                  const end = ta.selectionEnd;
                  const currentLen = text.length;

                  let newText = "";
                  let newCursorPos = 0;

                  // Logic: If text exists and cursor is at strict 0 (default state/start),
                  // AND no range is selected, we assume "Append Mode" as requested.
                  // If user purposefully wants to paste at start, they can select index 0,
                  // but this heuristic satisfies the request "if cursor not placed -> append".
                  if (currentLen > 0 && start === 0 && end === 0) {
                      newText = text + clipText;
                      newCursorPos = newText.length;
                  } else {
                      // Insert at cursor or replace selection
                      newText = text.substring(0, start) + clipText + text.substring(end);
                      newCursorPos = start + clipText.length;
                  }

                  setFullText(newText);
                  
                  // Move cursor after pasted text (needs timeout for state update)
                  setTimeout(() => {
                      if (textareaRef.current) {
                          textareaRef.current.focus();
                          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
                      }
                  }, 10);
              } else {
                  // Fallback append
                  setFullText(text + clipText);
              }
          } catch (e) {
              console.error("Paste failed", e);
              addNotification(props.language === 'ru' ? "Ошибка вставки (права доступа?)" : "Paste failed (permissions?)", 'error');
          }
      },
      fullWipe: () => {
          setFullText('');
          clearHistory();
      }
  }));

  // Monitor settings.enabled to trigger resume animation
  useEffect(() => {
    // Prevent animation on initial mount (app start)
    if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
    }

    if (props.settings.enabled) {
        setShowResumeAnim(true);
        const timer = setTimeout(() => setShowResumeAnim(false), 800);
        return () => clearTimeout(timer);
    }
  }, [props.settings.enabled]);

  // Notify parent whenever history changes to trigger blinking UI
  useEffect(() => {
    props.onHistoryUpdate();
  }, [lastHistoryUpdate]);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      
      <EditorSurface
        text={text}
        committedLength={committedLength}
        correctedLength={correctedLength}
        checkedLength={checkedLength}
        finalizedSentences={finalizedSentences}
        aiFixedSegments={aiFixedSegments}
        dictatedSegments={dictatedSegments}
        status={props.status}
        visualizerStatus={visualizerStatus}
        isAnalyzing={isAnalyzing}
        isRecording={isRecording}
        language={props.language}
        textareaRef={textareaRef}
        backdropRef={backdropRef}
        onChange={handleChange}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        onClipboard={handleClipboardEvent}
        visualizerDataRef={visualizerDataRef}
        onInteraction={props.onInteraction}
        isPaused={!props.settings.enabled}
        showResumeAnimation={showResumeAnim}
        // Pass new visualizer settings
        lowCut={props.settings.visualizerLowCut}
        highCut={props.settings.visualizerHighCut}
        amp={props.settings.visualizerAmp}
        visualizerStyle={props.settings.visualizerStyle} // Pass the style to the surface
      />

      <EditorToolbar
        textLength={text.length}
        committedLength={committedLength}
        processedLength={correctedLength}
        status={props.status}
        language={props.language}
        isBusy={isBusy}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onRecord={toggleRecording}
        onEnhance={handleEnhance}
        onFileUpload={handleAudioFile}
        autoStopCountdown={autoStopCountdown}
        onHistoryClick={props.onToggleHistory}
        isHistoryOpen={props.showHistory}
      />

      <HistoryPanel 
        history={history}
        currentIndex={historyIndex}
        isOpen={props.showHistory}
        onClose={props.onToggleHistory}
        onRestore={handleHistoryJump}
        language={props.language}
        onClear={clearHistory}
      />

    </div>
  );
});
