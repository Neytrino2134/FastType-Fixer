
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { transcribeAudio, enhanceFullText, recognizeTextFromImage } from '../services/geminiService';
import { ProcessingStatus, CorrectionSettings, Language, VisualizerStatus } from '../types';
import { useEditorHistory } from './useEditorHistory';
import { useAudioRecorder } from './useAudioRecorder';
import { useNotification } from '../contexts/NotificationContext';
import { useEditorHotkeys } from './useEditorHotkeys';
import { useTextProcessor } from './useTextProcessor';
import { COMMON_WORDS_RU, COMMON_WORDS_EN } from '../data/dictionary';
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
}

const TYPING_TIMEOUT_MS = 1500; 
const MANUAL_SAVE_DEBOUNCE_MS = 1000;

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
  onToggleProcessing
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
    unknownSegments, addUnknownSegments, // NEW
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
  
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Worker Ref
  const workerRef = useRef<Worker | null>(null);

  // Sync refs
  useEffect(() => { textRef.current = text; }, [text]);
  useEffect(() => { committedLengthRef.current = committedLength; }, [committedLength]);
  useEffect(() => { correctedLengthRef.current = correctedLength; }, [correctedLength]);
  useEffect(() => { checkedLengthRef.current = checkedLength; }, [checkedLength]);
  useEffect(() => { checkingLengthRef.current = checkingLength; }, [checkingLength]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  
  // Status Sync
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // 3. Worker Initialization
  useEffect(() => {
      workerRef.current = new Worker(new URL('../workers/dictionary.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current.postMessage({ 
          type: 'SET_DICTIONARY', 
          language: 'ru', 
          words: Array.from(COMMON_WORDS_RU) 
      });
      workerRef.current.postMessage({ 
          type: 'SET_DICTIONARY', 
          language: 'en', 
          words: Array.from(COMMON_WORDS_EN) 
      });
      return () => { workerRef.current?.terminate(); };
  }, []);

  // 4. Sub-Hooks
  const { isRecording, startRecording, stopRecording, visualizerDataRef, autoStopCountdown } = useAudioRecorder(settings.silenceThreshold);
  const { addNotification } = useNotification();
  const [visualizerStatus, setVisualizerStatus] = useState<VisualizerStatus>('idle');
  const [isAnalyzing, setIsAnalyzing] = useState(false); // New State for UI stacking
  const [isDevRecording, setIsDevRecording] = useState(false); // New State for Dev Mode

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const pendingTranscriptionsCount = useRef(0);

  /**
   * CORE TEXT UPDATE LOGIC
   */
  const handleTextUpdate = useCallback((newVal: string) => {
    const oldVal = textRef.current;
    
    setText(newVal);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (manualSaveTimeoutRef.current) clearTimeout(manualSaveTimeoutRef.current);
    
    // --- 1. HANDLE EMPTY TEXT (Clear) ---
    if (newVal.length === 0) {
        setCommittedLength(0);
        setCorrectedLength(0);
        setCheckedLength(0);
        setCheckingLength(0);
        
        onStatusChange(settings.enabled ? 'idle' : 'paused');
        
        saveCheckpoint('', 0, 0, ['raw']);
        return;
    }
    
    // --- 2. DETECT PASTE / CUT (Large changes) ---
    if (Math.abs(newVal.length - oldVal.length) > 5) {
        const newChecked = Math.min(checkedLengthRef.current, newVal.length);
        const newCorrected = Math.min(correctedLengthRef.current, newVal.length);
        const newCommitted = Math.min(committedLengthRef.current, newVal.length);
        
        if (checkingLengthRef.current > newVal.length) setCheckingLength(0);

        saveCheckpoint(newVal, newCommitted, newCorrected, ['raw']);
    } 
    else {
        // --- 3. DEBOUNCE SAVE ---
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
    
    if (statusRef.current !== 'recording' && statusRef.current !== 'ai_fixing' && statusRef.current !== 'ai_finalizing') {
        onStatusChange('typing');
    }

    typingTimeoutRef.current = setTimeout(() => {
        if (statusRef.current === 'typing') {
            onStatusChange(settings.enabled ? 'idle' : 'paused');
        }
    }, TYPING_TIMEOUT_MS);

    // --- 4. BACKTRACKING LOGIC ---
    let diffIndex = 0;
    while (diffIndex < oldVal.length && diffIndex < newVal.length && oldVal[diffIndex] === newVal[diffIndex]) {
      diffIndex++;
    }

    if (diffIndex < checkedLengthRef.current) setCheckedLength(diffIndex);
    if (diffIndex < checkingLengthRef.current) setCheckingLength(diffIndex); 
    if (diffIndex < correctedLengthRef.current) setCorrectedLength(diffIndex);
    if (diffIndex < committedLengthRef.current) setCommittedLength(Math.max(0, diffIndex));
  }, [saveCheckpoint, onStatusChange, setCommittedLength, setCorrectedLength, setCheckedLength, setCheckingLength, setText, settings.enabled]);

  // SMART CURSOR HANDLER FOR AUTO-FORMAT
  const handleAutoFormat = useCallback((newText: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
        handleTextUpdate(newText);
        return;
    }

    const selectionStart = textarea.selectionStart;
    const currentText = textRef.current;
    const prefix = currentText.substring(0, selectionStart);
    const processedPrefix = runMiniScripts(prefix);
    const newCursorPos = processedPrefix.length;

    handleTextUpdate(newText);

    requestAnimationFrame(() => {
        if (textareaRef.current) {
            textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
    });
  }, [handleTextUpdate]);

  // New Text Processor (The Brain)
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
      addUnknownSegments, // Pass to processor
      saveCheckpoint,
      saveCheckpoints,
      onStatsUpdate,
      onStatusChange,
      onAutoFormat: handleAutoFormat,
      workerRef
  });

  // Hotkeys
  const { handleUndo, handleRedo, handleKeyDown } = useEditorHotkeys({
      undo,
      redo,
      toggleRecording: () => toggleRecording(),
      toggleProcessing: onToggleProcessing,
      onStatusChange,
      onPauseProcessing
  });

  // 5. Handlers

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (backdropRef.current) {
      backdropRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleClipboardEvent = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const selectedText = target.value.substring(target.selectionStart, target.selectionEnd);
    if (selectedText) onClipboardAction(selectedText);
  };

  const handleHistoryJump = useCallback((index: number) => {
    if (jumpTo(index)) {
        onStatusChange('paused');
        onPauseProcessing();
    }
  }, [jumpTo, onStatusChange, onPauseProcessing]);

  // RESET SIGNAL
  useEffect(() => {
    if (resetSignal > 0) {
      resetProcessor();
      onStatusChange('idle');
      setVisualizerStatus('idle');
      setIsAnalyzing(false);
      setCheckingLength(0);
    }
  }, [resetSignal, onStatusChange, resetProcessor, setCheckingLength]);

  // MONITOR RECORDING STATE
  useEffect(() => {
    if (!isRecording && status === 'recording') {
        // If we were in dev mode, just go back to idle
        if (isDevRecording) {
            setIsDevRecording(false);
            onStatusChange(settings.enabled ? 'idle' : 'paused');
            setVisualizerStatus('idle');
            return;
        }

        if (pendingTranscriptionsCount.current > 0) {
            onStatusChange('transcribing');
        } else {
            onStatusChange('idle');
        }
        setVisualizerStatus('idle');
    }
  }, [isRecording, status, onStatusChange, isDevRecording, settings.enabled]);

  const handleEnhance = async () => {
      const t = getTranslation(language);
      
      if (statusRef.current === 'recording' || statusRef.current === 'enhancing' || !textRef.current.trim()) return;
      
      if (committedLengthRef.current >= textRef.current.trim().length) {
          addNotification(t.nothingToImprove, 'info');
          return;
      }

      onStatusChange('enhancing');
      
      const original = textRef.current;
      // SAVE CHECKPOINT
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
      } catch (e) {
          console.error("Enhance failed", e);
          addNotification(language === 'ru' ? "Ошибка улучшения" : "Enhance failed", 'error');
      } finally {
          onStatusChange('idle');
      }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleTextUpdate(e.target.value);
    notifyActivity();
  };

  // Generic Media Handler (Audio & Image)
  const handleMediaFile = useCallback((file: File) => {
      const reader = new FileReader();
      
      const isAudio = file.type.startsWith('audio/');
      const isImage = file.type.startsWith('image/');

      if (!isAudio && !isImage) {
          addNotification(language === 'ru' ? "Неподдерживаемый формат файла" : "Unsupported file format", 'error');
          return;
      }

      pendingTranscriptionsCount.current += 1;
      setIsAnalyzing(true);
      if (statusRef.current !== 'recording') {
          onStatusChange('transcribing');
      }

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

                      setCorrectedLength(newLen);
                      setCheckedLength(newLen);
                      setCheckingLength(newLen);

                      onStatsUpdate(1);
                      saveCheckpoint(newTextValue, committedLengthRef.current, newLen, ['dictated', 'raw_dictation']);
                      
                      setTimeout(() => {
                        if (textareaRef.current) {
                            textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
                            if (backdropRef.current) {
                                 backdropRef.current.scrollTop = textareaRef.current.scrollHeight;
                            }
                        }
                      }, 10);
                  }
              } catch (e) {
                  console.error("Media processing failed", e);
                  addNotification(language === 'ru' ? "Ошибка обработки файла" : "File processing error", 'error');
              } finally {
                  pendingTranscriptionsCount.current -= 1;
                  if (pendingTranscriptionsCount.current === 0) {
                      setIsAnalyzing(false);
                      if (statusRef.current === 'transcribing') {
                          onStatusChange(settings.enabled ? 'idle' : 'paused');
                      }
                  }
              }
          }
      };
      reader.readAsDataURL(file);
  }, [language, onStatsUpdate, onStatusChange, setText, saveCheckpoint, notifyActivity, addDictatedSegment, setCorrectedLength, setCheckedLength, setCheckingLength, addNotification]);

  // Audio Chunk Handling (Live Recording)
  const handleAudioChunk = useCallback(async (base64: string, mimeType: string) => {
    pendingTranscriptionsCount.current += 1;
    setIsAnalyzing(true);
    
    if (statusRef.current !== 'recording') {
        onStatusChange('transcribing');
    }

    try {
        let transcription = await transcribeAudio(base64, mimeType, language, settingsRef.current.audioModel);
        
        if (transcription && transcription.trim()) {
            const currentText = textRef.current;
            const separator = currentText.trim().length > 0 && !currentText.endsWith(' ') ? ' ' : '';
            const newTextValue = currentText + separator + transcription;
            const newLen = newTextValue.length;

            setText(newTextValue);
            notifyActivity();

            addDictatedSegment(normalizeBlock(transcription));

            setCorrectedLength(newLen);
            setCheckedLength(newLen);
            setCheckingLength(newLen);

            onStatsUpdate(1);
            
            saveCheckpoint(newTextValue, committedLengthRef.current, newLen, ['dictated', 'raw_dictation']);

            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
                    if (backdropRef.current) {
                         backdropRef.current.scrollTop = textareaRef.current.scrollHeight;
                    }
                }
            }, 10);
        }
    } catch (e) {
        console.error("Chunk transcription failed", e);
    } finally {
        pendingTranscriptionsCount.current -= 1;
        if (pendingTranscriptionsCount.current === 0) {
            setIsAnalyzing(false);
            if (statusRef.current === 'transcribing') {
                onStatusChange(settings.enabled ? 'idle' : 'paused');
            }
        }
    }
  }, [language, onStatsUpdate, onStatusChange, setText, saveCheckpoint, notifyActivity, addDictatedSegment, setCorrectedLength, setCheckedLength, setCheckingLength]);

  const toggleRecording = useCallback(async () => {
    // If we were doing a DEV recording, stop it and ensure clean state
    if (isDevRecording) {
        await stopRecording();
        setIsDevRecording(false);
        onStatusChange(settings.enabled ? 'idle' : 'paused');
        return;
    }

    if (isRecording) {
        await stopRecording();
    } else {
        resetProcessor();

        const success = await startRecording(
            async (b64, mime) => { await handleAudioChunk(b64, mime); },
            (newStatus) => setVisualizerStatus(newStatus)
        );
        if (success) {
            onStatusChange('recording');
            setVisualizerStatus('listening');
        }
    }
  }, [isRecording, stopRecording, startRecording, onStatusChange, handleAudioChunk, resetProcessor, isDevRecording, settings.enabled]);

  // New: Developer Mode Toggle (Visual Only)
  const toggleDevRecording = useCallback(async () => {
     // If normal recording is active, stop it
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
         // Pass empty callback for chunks so no data is sent/processed
         const success = await startRecording(
             async () => {}, // NO-OP
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
      unknownSegments, // EXPORT
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
      processingOverlay // Pass to UI
  };
};
