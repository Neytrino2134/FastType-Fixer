
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { transcribeAudio, enhanceFullText, recognizeTextFromImage } from '../services/geminiService';
import { ProcessingStatus, CorrectionSettings, Language, VisualizerStatus } from '../types';
import { useEditorHistory } from './useEditorHistory';
import { useAudioRecorder } from './useAudioRecorder';
import { useNotification } from '../contexts/NotificationContext';
import { useEditorHotkeys } from './useEditorHotkeys';
import { useTextProcessor } from './useTextProcessor';
import { COMMON_WORDS_RU, COMMON_WORDS_EN, COMMON_WORDS_UZ_LATN, COMMON_WORDS_UZ_CYRL } from '../data/dictionary';
import { normalizeBlock } from '../utils/textStructure';
import { getTranslation } from '../utils/i18n';
import { runMiniScripts } from '../utils/miniScripts';

interface UseSmartEditorProps {
    settings: CorrectionSettings;
    onStatsUpdate: (count: number) => void;
    language: Language;
    status: ProcessingStatus;
    onStatusChange: (status: ProcessingStatus) => void;
    setIsGrammarChecking: (isChecking: boolean) => void; 
    onClipboardAction: (text: string) => void;
    resetSignal: number;
    onPauseProcessing: () => void;
    onToggleProcessing: () => void;
    dictionariesLoaded?: boolean;
    onQuotaExceeded?: () => void;
}

const TYPING_TIMEOUT_MS = 1500; 
const MANUAL_SAVE_DEBOUNCE_MS = 1000;
const AUTO_REFRESH_IDLE_MS = 20000;

export const useSmartEditor = ({ 
  settings, 
  onStatsUpdate, 
  language,
  status,
  onStatusChange,
  setIsGrammarChecking,
  onClipboardAction,
  resetSignal,
  onPauseProcessing,
  onToggleProcessing,
  dictionariesLoaded,
  onQuotaExceeded
}: UseSmartEditorProps) => {
  // 1. Core State & History
  const { 
    text, setText, 
    committedLength, setCommittedLength, 
    correctedLength, setCorrectedLength,
    checkedLength, setCheckedLength,
    checkingLength, setCheckingLength, 
    finalizedSentences, addFinalizedSentence, 
    aiFixedSegments, addAiFixedSegment,
    dictatedSegments, addDictatedSegment,
    unknownSegments, addUnknownSegments, 
    saveCheckpoint, saveCheckpoints, undo, redo, canUndo, canRedo,
    history, historyIndex, jumpTo, lastUpdate,
    clearHistory
  } = useEditorHistory();

  // 2. Refs for Async Access
  const textRef = useRef(text);
  const committedLengthRef = useRef(committedLength);
  const correctedLengthRef = useRef(correctedLength);
  const checkedLengthRef = useRef(checkedLength);
  const checkingLengthRef = useRef(checkingLength);
  const settingsRef = useRef(settings);
  const statusRef = useRef(status);
  
  const lastInteractionTimeRef = useRef(Date.now());
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toggleLockRef = useRef(false);
  const workerRef = useRef<Worker | null>(null);

  const [contextMenu, setContextMenu] = useState<{
      x: number;
      y: number;
      suggestions: string[];
      targetWord: string;
      rangeStart: number;
      rangeEnd: number;
  } | null>(null);

  useEffect(() => { textRef.current = text; }, [text]);
  useEffect(() => { committedLengthRef.current = committedLength; }, [committedLength]);
  useEffect(() => { correctedLengthRef.current = correctedLength; }, [correctedLength]);
  useEffect(() => { checkedLengthRef.current = checkedLength; }, [checkedLength]);
  useEffect(() => { checkingLengthRef.current = checkingLength; }, [checkingLength]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
      workerRef.current = new Worker(new URL('../workers/dictionary.worker.ts', import.meta.url), { type: 'module' });
      const sendDict = () => {
          if (!workerRef.current) return;
          workerRef.current.postMessage({ type: 'SET_DICTIONARY', language: 'ru', words: Array.from(COMMON_WORDS_RU) });
          workerRef.current.postMessage({ type: 'SET_DICTIONARY', language: 'en', words: Array.from(COMMON_WORDS_EN) });
          workerRef.current.postMessage({ type: 'SET_DICTIONARY', language: 'uz-latn', words: Array.from(COMMON_WORDS_UZ_LATN) });
          workerRef.current.postMessage({ type: 'SET_DICTIONARY', language: 'uz-cyrl', words: Array.from(COMMON_WORDS_UZ_CYRL) });
      };
      sendDict();
      workerRef.current.onmessage = (e) => {
          const { type, suggestions, original } = e.data;
          if (type === 'SUGGESTIONS_RESULT') {
              setContextMenu(prev => {
                  if (prev && prev.targetWord === original) {
                      return { ...prev, suggestions };
                  }
                  return prev;
              });
          }
      };
      return () => { workerRef.current?.terminate(); };
  }, []); 

  useEffect(() => {
      if (workerRef.current && dictionariesLoaded) {
          workerRef.current.postMessage({ type: 'SET_DICTIONARY', language: 'ru', words: Array.from(COMMON_WORDS_RU) });
          workerRef.current.postMessage({ type: 'SET_DICTIONARY', language: 'en', words: Array.from(COMMON_WORDS_EN) });
          workerRef.current.postMessage({ type: 'SET_DICTIONARY', language: 'uz-latn', words: Array.from(COMMON_WORDS_UZ_LATN) });
          workerRef.current.postMessage({ type: 'SET_DICTIONARY', language: 'uz-cyrl', words: Array.from(COMMON_WORDS_UZ_CYRL) });
      }
  }, [dictionariesLoaded]); 

  const { isRecording, startRecording, stopRecording, visualizerDataRef, autoStopCountdown } = useAudioRecorder(settings.silenceThreshold);
  const { addNotification } = useNotification();
  const [visualizerStatus, setVisualizerStatus] = useState<VisualizerStatus>('idle');
  const [isAnalyzing, setIsAnalyzing] = useState(false); 
  const [isDevRecording, setIsDevRecording] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  
  const pendingTranscriptionsCount = useRef(0);

  // --- ERROR HANDLING ---
  const handleCriticalError = useCallback((msg: string, code?: string) => {
      if (code === 'QUOTA' || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
          // QUOTA EXCEEDED HANDLING
          
          // 1. Force Stop Everything
          if (isRecording) {
              stopRecording().catch(() => {});
          }
          
          // 2. Kill Status Loops (Prevent "Analyzing" blink)
          setIsAnalyzing(false); 
          pendingTranscriptionsCount.current = 0;
          onStatusChange('idle');
          setVisualizerStatus('idle');
          setIsDevRecording(false);

          // 3. Trigger Downgrade
          if (onQuotaExceeded) {
              onQuotaExceeded();
          }
      } else {
          // Standard Error
          addNotification(msg, 'error', 5000);
          onStatusChange('error');
          if (isRecording) {
              stopRecording();
              setIsDevRecording(false);
              setVisualizerStatus('idle');
          }
          onPauseProcessing();
      }
  }, [addNotification, onStatusChange, isRecording, stopRecording, onPauseProcessing, onQuotaExceeded]);

  // --- CORE TEXT UPDATE LOGIC ---
  const handleTextUpdate = useCallback((newVal: string) => {
    lastInteractionTimeRef.current = Date.now();
    const oldVal = textRef.current;
    
    setText(newVal);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (manualSaveTimeoutRef.current) clearTimeout(manualSaveTimeoutRef.current);
    
    if (newVal.length === 0) {
        setCommittedLength(0);
        setCorrectedLength(0);
        setCheckedLength(0);
        setCheckingLength(0);
        onStatusChange(settings.enabled ? 'idle' : 'paused');
        saveCheckpoint('', 0, 0, ['raw']);
        return;
    }
    
    if (Math.abs(newVal.length - oldVal.length) > 5) {
        const newChecked = Math.min(checkedLengthRef.current, newVal.length);
        const newCorrected = Math.min(correctedLengthRef.current, newVal.length);
        const newCommitted = Math.min(committedLengthRef.current, newVal.length);
        
        if (checkingLengthRef.current > newVal.length) setCheckingLength(0);

        saveCheckpoint(newVal, newCommitted, newCorrected, ['raw']);
    } 
    else {
        manualSaveTimeoutRef.current = setTimeout(() => {
             const currentT = textRef.current;
             saveCheckpoint(
                currentT, 
                committedLengthRef.current, 
                correctedLengthRef.current, 
                ['raw']
             );
        }, MANUAL_SAVE_DEBOUNCE_MS);
    }
    
    if (statusRef.current !== 'recording' && statusRef.current !== 'transcribing' && statusRef.current !== 'ai_fixing' && statusRef.current !== 'ai_finalizing' && statusRef.current !== 'error') {
        onStatusChange('typing');
    }

    typingTimeoutRef.current = setTimeout(() => {
        if (statusRef.current === 'typing') {
            onStatusChange(settings.enabled ? 'idle' : 'paused');
        }
    }, TYPING_TIMEOUT_MS);

    let diffIndex = 0;
    while (diffIndex < oldVal.length && diffIndex < newVal.length && oldVal[diffIndex] === newVal[diffIndex]) {
      diffIndex++;
    }

    if (diffIndex < checkedLengthRef.current) setCheckedLength(diffIndex);
    if (diffIndex < checkingLengthRef.current) setCheckingLength(diffIndex); 
    if (diffIndex < correctedLengthRef.current) setCorrectedLength(diffIndex);
    if (diffIndex < committedLengthRef.current) setCommittedLength(Math.max(0, diffIndex));
  }, [saveCheckpoint, onStatusChange, setCommittedLength, setCorrectedLength, setCheckedLength, setCheckingLength, setText, settings.enabled]);

  const handleRequestSuggestions = useCallback((word: string, start: number, end: number, x: number, y: number) => {
      setContextMenu({
          x,
          y,
          suggestions: [],
          targetWord: word,
          rangeStart: start,
          rangeEnd: end
      });
      if (workerRef.current) {
          workerRef.current.postMessage({ 
              type: 'GET_SUGGESTIONS', 
              text: word, 
              language: language 
          });
      }
  }, [language]);

  const handleSuggestionSelect = useCallback((newWord: string) => {
      if (!contextMenu) return;
      const { rangeStart, rangeEnd } = contextMenu;
      const currentText = textRef.current;
      const prefix = currentText.slice(0, rangeStart);
      const suffix = currentText.slice(rangeEnd);
      let replacement = newWord;
      const original = contextMenu.targetWord;
      if (original[0] === original[0].toUpperCase() && newWord[0] === newWord[0].toLowerCase()) {
          replacement = newWord.charAt(0).toUpperCase() + newWord.slice(1);
      }
      const newFullText = prefix + replacement + suffix;
      handleTextUpdate(newFullText);
      setContextMenu(null);
      onStatsUpdate(1);
      setTimeout(() => {
          if (textareaRef.current) {
              textareaRef.current.focus();
              const newPos = rangeStart + replacement.length;
              textareaRef.current.setSelectionRange(newPos, newPos);
          }
      }, 10);
  }, [contextMenu, handleTextUpdate, onStatsUpdate]);

  const handleCloseContextMenu = useCallback(() => {
      setContextMenu(null);
  }, []);

  const handleAutoFormat = useCallback((newText: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
        handleTextUpdate(newText);
        return;
    }
    const currentPos = textarea.selectionStart;
    const currentText = textRef.current;
    const prefix = currentText.substring(0, currentPos);
    const processedPrefix = runMiniScripts(prefix);
    const newCursorPos = processedPrefix.length;
    handleTextUpdate(newText);
    setTimeout(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
    }, 0);
  }, [handleTextUpdate]);

  const { notifyActivity, reset: resetProcessor, processingOverlay } = useTextProcessor({
      textRef,
      committedLengthRef,
      correctedLengthRef,
      checkedLengthRef,
      checkingLengthRef, 
      settingsRef,
      statusRef,
      language,
      setText,
      setCorrectedLength,
      setCommittedLength,
      setCheckedLength,
      setCheckingLength, 
      finalizedSentences, 
      addFinalizedSentence, 
      addAiFixedSegment,
      unknownSegments,
      addUnknownSegments, 
      saveCheckpoint,
      saveCheckpoints,
      onStatsUpdate,
      onStatusChange,
      onAutoFormat: handleAutoFormat,
      workerRef,
      onFatalError: (msg) => handleCriticalError(msg) // Delegate to main error handler
  });

  useEffect(() => {
      const maintenanceInterval = setInterval(() => {
          const now = Date.now();
          const idleTime = now - lastInteractionTimeRef.current;
          if (idleTime > AUTO_REFRESH_IDLE_MS && statusRef.current === 'idle' && pendingTranscriptionsCount.current === 0) {
              resetProcessor(); 
              setCheckingLength(0); 
              if (isRecording) stopRecording(); 
              lastInteractionTimeRef.current = Date.now(); 
          }
      }, 5000); 
      return () => clearInterval(maintenanceInterval);
  }, [resetProcessor, isRecording, stopRecording]);

  const { handleUndo, handleRedo, handleKeyDown } = useEditorHotkeys({
      undo,
      redo,
      toggleRecording: () => toggleRecording(),
      toggleProcessing: onToggleProcessing,
      onStatusChange,
      onPauseProcessing
  });

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (backdropRef.current) backdropRef.current.scrollTop = e.currentTarget.scrollTop;
    setContextMenu(null);
  };

  const handleClipboardEvent = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    lastInteractionTimeRef.current = Date.now();
    const target = e.currentTarget;
    const selectedText = target.value.substring(target.selectionStart, target.selectionEnd);
    if (selectedText) onClipboardAction(selectedText);
  };

  const handleHistoryJump = useCallback((index: number) => {
    lastInteractionTimeRef.current = Date.now();
    if (jumpTo(index)) {
        onStatusChange('paused');
        onPauseProcessing();
    }
  }, [jumpTo, onStatusChange, onPauseProcessing]);

  useEffect(() => {
    if (resetSignal > 0) {
      stopRecording(); 
      resetProcessor(); 
      onStatusChange('idle');
      setVisualizerStatus('idle');
      setIsAnalyzing(false);
      setCheckingLength(0);
      pendingTranscriptionsCount.current = 0;
      lastInteractionTimeRef.current = Date.now();
    }
  }, [resetSignal, onStatusChange, resetProcessor, setCheckingLength, stopRecording]);

  const handleEnhance = async () => {
      lastInteractionTimeRef.current = Date.now();
      const t = getTranslation(language);
      if (statusRef.current === 'recording' || statusRef.current === 'enhancing' || !textRef.current.trim()) return;
      if (committedLengthRef.current >= textRef.current.trim().length) {
          addNotification(t.nothingToImprove, 'info');
          return;
      }
      onStatusChange('enhancing');
      const original = textRef.current;
      saveCheckpoint(original, committedLengthRef.current, correctedLengthRef.current, ['pre_ai']);
      try {
          const enhanced = await enhanceFullText(original, language);
          if (enhanced && enhanced !== original) {
              setText(enhanced);
              const len = enhanced.length;
              setCommittedLength(len);
              setCorrectedLength(len);
              setCheckedLength(len);
              setCheckingLength(len);
              addAiFixedSegment(normalizeBlock(enhanced));
              saveCheckpoint(enhanced, len, len, ['enhanced', 'ai_corrected']);
              onStatsUpdate(1);
          } else {
              addNotification(t.nothingToImprove, 'info');
              const len = original.length;
              setCommittedLength(len);
              setCorrectedLength(len);
              setCheckedLength(len);
              setCheckingLength(len);
          }
      } catch (e: any) {
          console.error("Enhance failed", e);
          if (e.isFatal) handleCriticalError(e.message, e.code);
          else addNotification(language === 'ru' ? "Ошибка улучшения" : "Enhance failed", 'error');
      } finally {
          onStatusChange('idle');
      }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleTextUpdate(e.target.value);
    notifyActivity();
  };

  const handleMediaFile = useCallback((file: File) => {
      lastInteractionTimeRef.current = Date.now();
      const reader = new FileReader();
      const isAudio = file.type.startsWith('audio/');
      const isImage = file.type.startsWith('image/');
      if (!isAudio && !isImage) {
          addNotification(language === 'ru' ? "Неподдерживаемый формат файла" : "Unsupported file format", 'error');
          return;
      }
      pendingTranscriptionsCount.current += 1;
      setIsAnalyzing(true);
      onStatusChange('transcribing');
      reader.onload = async (e) => {
          if (e.target?.result) {
              const base64 = (e.target.result as string).split(',')[1];
              try {
                  let resultText = "";
                  if (isAudio) {
                      resultText = await transcribeAudio(base64, file.type, language, settingsRef.current.audioModel);
                  } else if (isImage) {
                      resultText = await recognizeTextFromImage(base64, file.type, language);
                  }
                  if (resultText && resultText.trim()) {
                      const currentText = textRef.current;
                      const separator = currentText.trim().length > 0 && !currentText.endsWith(' ') ? ' ' : '';
                      const newTextValue = currentText + separator + resultText;
                      const newLen = newTextValue.length;
                      setText(newTextValue);
                      notifyActivity();
                      addDictatedSegment(normalizeBlock(resultText));
                      onStatsUpdate(1);
                      saveCheckpoint(newTextValue, committedLengthRef.current, newLen, ['dictated', 'raw_dictation']);
                      setTimeout(() => {
                        if (textareaRef.current) {
                            textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
                            if (backdropRef.current) backdropRef.current.scrollTop = textareaRef.current.scrollHeight;
                        }
                      }, 10);
                  }
              } catch (e: any) {
                  console.error("Media processing failed", e);
                  if (e.isFatal) handleCriticalError(e.message, e.code);
                  else addNotification(language === 'ru' ? "Ошибка обработки файла" : "File processing error", 'error');
              } finally {
                  pendingTranscriptionsCount.current -= 1;
                  if (pendingTranscriptionsCount.current <= 0) {
                      pendingTranscriptionsCount.current = 0;
                      setIsAnalyzing(false);
                      onStatusChange(settings.enabled ? 'idle' : 'paused');
                  }
              }
          }
      };
      reader.readAsDataURL(file);
  }, [language, onStatsUpdate, onStatusChange, setText, saveCheckpoint, notifyActivity, addDictatedSegment, addNotification, settings.enabled, handleCriticalError]);

  const handleAudioChunk = useCallback(async (base64: string, mimeType: string) => {
    pendingTranscriptionsCount.current += 1;
    setIsAnalyzing(true);
    
    try {
        let transcription = await transcribeAudio(base64, mimeType, language, settingsRef.current.audioModel);
        
        if (transcription && transcription.trim()) {
            lastInteractionTimeRef.current = Date.now(); 
            const currentText = textRef.current;
            const separator = currentText.trim().length > 0 && !currentText.endsWith(' ') ? ' ' : '';
            const newTextValue = currentText + separator + transcription;
            const newLen = newTextValue.length;
            setText(newTextValue);
            notifyActivity();
            addDictatedSegment(normalizeBlock(transcription));
            onStatsUpdate(1);
            saveCheckpoint(newTextValue, committedLengthRef.current, newLen, ['dictated', 'raw_dictation']);
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
                    if (backdropRef.current) backdropRef.current.scrollTop = textareaRef.current.scrollHeight;
                }
            }, 10);
        }
    } catch (e: any) {
        // DETECT QUOTA ERROR HERE
        if (e.code === 'QUOTA' || (e.message && e.message.includes('429'))) {
            handleCriticalError(e.message, 'QUOTA');
        } else if (e.isFatal) {
            handleCriticalError(e.message);
        }
    } finally {
        pendingTranscriptionsCount.current -= 1;
        if (pendingTranscriptionsCount.current <= 0) {
            pendingTranscriptionsCount.current = 0; 
            setIsAnalyzing(false);
            if (!isRecordingRef.current) {
                 onStatusChange(settings.enabled ? 'idle' : 'paused'); 
            }
        }
    }
  }, [language, onStatsUpdate, setText, saveCheckpoint, notifyActivity, addDictatedSegment, settings.enabled, onStatusChange, handleCriticalError]);

  const isRecordingRef = useRef(isRecording);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  const toggleRecording = useCallback(async () => {
    if (toggleLockRef.current) return;
    toggleLockRef.current = true;
    lastInteractionTimeRef.current = Date.now();
    try {
        if (isDevRecording) {
            await stopRecording();
            setIsDevRecording(false);
            onStatusChange(settings.enabled ? 'idle' : 'paused');
            setVisualizerStatus('idle');
            return;
        }
        if (isRecordingRef.current) {
            onStatusChange(settings.enabled ? 'idle' : 'paused'); 
            setVisualizerStatus('idle');
            await stopRecording();
        } else {
            resetProcessor();
            pendingTranscriptionsCount.current = 0;
            const success = await startRecording(
                async (b64, mime) => { await handleAudioChunk(b64, mime); },
                (newStatus) => setVisualizerStatus(newStatus)
            );
            if (success) {
                onStatusChange('recording');
                setVisualizerStatus('listening');
            }
        }
    } finally {
        setTimeout(() => { toggleLockRef.current = false; }, 500);
    }
  }, [stopRecording, startRecording, onStatusChange, handleAudioChunk, resetProcessor, isDevRecording, settings.enabled]);

  const toggleDevRecording = useCallback(async () => {
     if (isRecording && !isDevRecording) {
         await stopRecording();
         return;
     }
     if (isDevRecording) {
         await stopRecording();
         setIsDevRecording(false);
         onStatusChange(settings.enabled ? 'idle' : 'paused');
     } else {
         resetProcessor();
         const success = await startRecording(
             async () => {}, 
             (newStatus) => setVisualizerStatus(newStatus)
         );
         if (success) {
             setIsDevRecording(true);
             onStatusChange('recording');
             setVisualizerStatus('listening');
         }
     }
  }, [isRecording, isDevRecording, stopRecording, startRecording, onStatusChange, resetProcessor, settings.enabled]);

  return {
      text,
      committedLength,
      correctedLength,
      checkedLength,
      checkingLength, 
      processedLength: correctedLength, 
      finalizedSentences,
      aiFixedSegments,
      dictatedSegments, 
      unknownSegments,
      textareaRef,
      backdropRef,
      isBusy: status !== 'idle' && status !== 'typing' && status !== 'paused' && status !== 'done',
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
      lastHistoryUpdate: lastUpdate, 
      clearHistory,
      setFullText: handleTextUpdate,
      handleMediaFile, 
      toggleDevRecording, 
      isDevRecording,
      processingOverlay,
      contextMenu,
      handleRequestSuggestions,
      handleSuggestionSelect,
      handleCloseContextMenu
  };
};
