


import React, { useEffect, useState, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import { ProcessingStatus, CorrectionSettings, Language } from '../types';
import { useSmartEditor } from '../hooks/useSmartEditor';
import { EditorSurface } from './Editor/EditorSurface';
import { EditorToolbar, EditorToolbarHandle } from './Editor/EditorToolbar';
import { HistoryPanel } from './HistoryPanel';
import { useNotification } from '../contexts/NotificationContext';
import { getTranslation } from '../utils/i18n';
import { switchKeyboardLayout } from '../utils/textCleaner';

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
  onInteraction: () => void; 
  onHistoryUpdate: () => void; 
  showClipboard: boolean;
  onToggleClipboard: () => void;
}

export interface SmartEditorHandle {
    clear: () => void;
    copy: () => void;
    paste: () => Promise<void>;
    cut: () => Promise<void>; 
    clearAndPaste: () => Promise<void>; 
    fullWipe: () => void;
    getText: () => string;
    switchLayout: () => void; // New method
}

export const SmartEditor = forwardRef<SmartEditorHandle, SmartEditorProps>((props, ref) => {
  const {
    text,
    committedLength,
    correctedLength,
    checkedLength,
    checkingLength, 
    processedLength, 
    finalizedSentences,
    aiFixedSegments,
    dictatedSegments,
    unknownSegments, 
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
    isAnalyzing,
    isRecording,
    history,
    historyIndex,
    handleHistoryJump,
    lastHistoryUpdate,
    clearHistory,
    setFullText,
    handleMediaFile, 
    toggleDevRecording,
    isDevRecording,
    processingOverlay // Received from hook
  } = useSmartEditor(props);

  const { addNotification } = useNotification();
  const t = getTranslation(props.language);

  // Resume Animation State
  const [showResumeAnim, setShowResumeAnim] = useState(false);
  const isFirstRender = useRef(true);
  
  // Reference to EditorToolbar to control file staging
  const toolbarRef = useRef<EditorToolbarHandle>(null);

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

  // Helper: Handle textarea paste event (Ctrl+V) for images
  const handleTextareaPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      // Check for files in the paste event
      if (e.clipboardData && e.clipboardData.files.length > 0) {
          const file = e.clipboardData.files[0];
          // If it's an image, intercept standard paste
          if (file.type.startsWith('image/')) {
              e.preventDefault(); 
              if (toolbarRef.current) {
                  toolbarRef.current.setFile(file);
                  addNotification(props.language === 'ru' ? "Изображение вставлено" : "Image pasted", 'success');
              }
              return;
          }
      }
      // If it's not an image, proceed with default behavior (text paste handled by textarea)
  }, [props.language, addNotification]);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
      getText: () => text,
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
      cut: async () => {
          if (!text) return;
          try {
              await safeWriteClipboard(text);
              setFullText('');
              addNotification(props.language === 'ru' ? "Вырезано!" : "Cut!", 'success');
          } catch (e) {
              addNotification(props.language === 'ru' ? "Ошибка" : "Error", 'error');
          }
      },
      paste: async () => {
          try {
              // 1. Check for Images First (Modern Web API)
              try {
                  const clipboardItems = await navigator.clipboard.read();
                  for (const item of clipboardItems) {
                      const imageType = item.types.find(type => type.startsWith('image/'));
                      if (imageType) {
                          const blob = await item.getType(imageType);
                          const file = new File([blob], `pasted_image_${Date.now()}.png`, { type: imageType });
                          
                          // Stage the file in the Toolbar
                          if (toolbarRef.current) {
                              toolbarRef.current.setFile(file);
                              addNotification(props.language === 'ru' ? "Изображение вставлено" : "Image pasted", 'success');
                          }
                          return; // Stop here, do not paste text if image found
                      }
                  }
              } catch (clipErr) {
                  // Fallback: If clipboard read fail (permissions, or empty), proceed to text
              }

              // 2. Text Paste Logic
              const clipText = await safeReadClipboard();
              if (!clipText) return;
              
              const ta = textareaRef.current;
              if (ta) {
                  const start = ta.selectionStart;
                  const end = ta.selectionEnd;
                  const currentLen = text.length;

                  let newText = "";
                  let newCursorPos = 0;

                  if (currentLen > 0 && start === 0 && end === 0) {
                      newText = text + clipText;
                      newCursorPos = newText.length;
                  } else {
                      newText = text.substring(0, start) + clipText + text.substring(end);
                      newCursorPos = start + clipText.length;
                  }

                  setFullText(newText);
                  
                  setTimeout(() => {
                      if (textareaRef.current) {
                          textareaRef.current.focus();
                          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
                      }
                  }, 10);
              } else {
                  setFullText(text + clipText);
              }
          } catch (e) {
              console.error("Paste failed", e);
              addNotification(props.language === 'ru' ? "Ошибка вставки" : "Paste failed", 'error');
          }
      },
      clearAndPaste: async () => {
          try {
              // 1. Check for Images
              try {
                  const clipboardItems = await navigator.clipboard.read();
                  for (const item of clipboardItems) {
                      const imageType = item.types.find(type => type.startsWith('image/'));
                      if (imageType) {
                          const blob = await item.getType(imageType);
                          const file = new File([blob], `pasted_image_${Date.now()}.png`, { type: imageType });
                          
                          setFullText(''); // CLEAR EDITOR TEXT
                          
                          if (toolbarRef.current) {
                              toolbarRef.current.setFile(file);
                              addNotification(props.language === 'ru' ? "Изображение вставлено" : "Image pasted", 'success');
                          }
                          return;
                      }
                  }
              } catch (clipErr) { }

              // 2. Text Paste
              const clipText = await safeReadClipboard();
              setFullText(clipText || '');
              setTimeout(() => {
                  if (textareaRef.current && clipText) {
                      textareaRef.current.focus();
                      textareaRef.current.setSelectionRange(clipText.length, clipText.length);
                  }
              }, 10);
          } catch (e) {
              console.error("Replace failed", e);
              addNotification(props.language === 'ru' ? "Ошибка вставки" : "Paste Error", 'error');
          }
      },
      fullWipe: () => {
          setFullText('');
          clearHistory();
      },
      switchLayout: () => {
          const ta = textareaRef.current;
          if (!ta || !text) return;

          const start = ta.selectionStart;
          const end = ta.selectionEnd;
          
          let newText = "";
          let newCursorPos = start;
          let convertedSegment = "";

          // If selection exists, convert selection. If not, convert ALL text.
          if (start !== end) {
              const selectedText = text.substring(start, end);
              convertedSegment = switchKeyboardLayout(selectedText);
              newText = text.substring(0, start) + convertedSegment + text.substring(end);
              newCursorPos = start + convertedSegment.length;
          } else {
              convertedSegment = switchKeyboardLayout(text);
              newText = convertedSegment;
              newCursorPos = text.length;
          }

          setFullText(newText);
          addNotification(props.language === 'ru' ? "Раскладка изменена" : "Layout switched", 'success');

          setTimeout(() => {
              if (textareaRef.current) {
                  textareaRef.current.focus();
                  if (start !== end) {
                      textareaRef.current.setSelectionRange(start, newCursorPos);
                  } else {
                      textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
                  }
              }
          }, 10);
      }
  }));

  // Monitor settings.enabled to trigger resume animation
  useEffect(() => {
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
        checkingLength={checkingLength}
        finalizedSentences={finalizedSentences}
        aiFixedSegments={aiFixedSegments}
        dictatedSegments={dictatedSegments}
        unknownSegments={unknownSegments} 
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
        onPaste={handleTextareaPaste}
        visualizerDataRef={visualizerDataRef}
        onInteraction={props.onInteraction}
        isPaused={!props.settings.enabled}
        showResumeAnimation={showResumeAnim}
        lowCut={props.settings.visualizerLowCut}
        highCut={props.settings.visualizerHighCut}
        amp={props.settings.visualizerAmp}
        visualizerStyle={props.settings.visualizerStyle} 
        silenceThreshold={props.settings.silenceThreshold}
        visualizerNorm={props.settings.visualizerNorm}
        visualizerGravity={props.settings.visualizerGravity}
        visualizerMirror={props.settings.visualizerMirror}
        onDropFile={handleMediaFile} 
        processingOverlay={processingOverlay} 
      />

      <EditorToolbar
        ref={toolbarRef}
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
        onFileUpload={handleMediaFile}
        autoStopCountdown={autoStopCountdown}
        onHistoryClick={props.onToggleHistory}
        isHistoryOpen={props.showHistory}
        developerMode={props.settings.developerMode}
        onDevRecord={toggleDevRecording}
        isDevRecording={isDevRecording}
        showClipboard={props.showClipboard}
        onToggleClipboard={props.onToggleClipboard}
        isRecording={isRecording} 
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