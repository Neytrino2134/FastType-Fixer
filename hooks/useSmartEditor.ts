
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
}

const TYPING_TIMEOUT_MS = 1500; 
const MANUAL_SAVE_DEBOUNCE_MS = 1000;
const AUTO_REFRESH_IDLE_MS = 20000; // 20 seconds for auto-cleanup

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
  
  // Track last interaction for auto-refresh
  const lastInteractionTimeRef = useRef(Date.now());
  
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lock for toggleRecording to prevent double-clicks
  const toggleLockRef = useRef(false);

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
      
      const sendDict = (lang: string, set: Set<string>) => {
          workerRef.current?.postMessage({ 
              type: 'SET_DICTIONARY', 
              language: lang, 
              words: Array.from(set) 
          });
      };

      sendDict('ru', COMMON_WORDS_RU);
      sendDict('en', COMMON_WORDS_EN);
      sendDict('uz-latn', COMMON_WORDS_UZ_LATN);
      sendDict('uz-cyrl', COMMON_WORDS_UZ_CYRL);

      return () => { workerRef.current?.terminate(); };
  }, []);

  // 4. Sub-Hooks
  const { isRecording, startRecording, stopRecording, visualizerDataRef, autoStopCountdown } = useAudioRecorder(settings.silenceThreshold);
  const { addNotification } = useNotification();
  const [visualizerStatus, setVisualizerStatus] = useState<VisualizerStatus>('idle');
  const [isAnalyzing, setIsAnalyzing] = useState(false); 
  const [isDevRecording, setIsDevRecording] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const pendingTranscriptionsCount = useRef(0);

  // --- CORE TEXT UPDATE LOGIC ---
  const handleTextUpdate = useCallback((newVal: string) => {
    lastInteractionTimeRef.current = Date.now(); // Reset idle timer
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
    
    if (statusRef.current !== 'recording' && statusRef.current !== 'ai_fixing' && statusRef.current !== 'ai_finalizing' && statusRef.current !== 'transcribing') {
        onStatusChange('typing');
    }

    typingTimeoutRef.current = setTimeout(() => {
        if (statusRef.current === 'typing') {
            onStatusChange(settings.enabled ? 'idle' : 'paused');
        }
    }, TYPING_TIMEOUT_MS);

    // Sync pointers
    let diffIndex = 0;
    while (diffIndex < oldVal.length && diffIndex < newVal.length && oldVal[diffIndex] === newVal[diffIndex]) {
      diffIndex++;
    }

    if (diffIndex < checkedLengthRef.current) setCheckedLength(diffIndex);
    if (diffIndex < checkingLengthRef.current) setCheckingLength(diffIndex); 
    if (diffIndex < correctedLengthRef.current) setCorrectedLength(diffIndex);
    if (diffIndex < committedLengthRef.current) setCommittedLength(Math.max(0, diffIndex));
  }, [saveCheckpoint, onStatusChange, setCommittedLength, setCorrectedLength, setCheckedLength, setCheckingLength, setText, settings.enabled]);

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
      unknownSegments, // Pass Set for read access
      addUnknownSegments, 
      saveCheckpoint,
      saveCheckpoints,
      onStatsUpdate,
      onStatusChange,
      onAutoFormat: handleAutoFormat,
      workerRef
  });

  // --- AUTO REFRESH / IDLE CLEANUP ---
  useEffect(() => {
      const maintenanceInterval = setInterval(() => {
          const now = Date.now();
          const idleTime = now - lastInteractionTimeRef.current;
          
          if (idleTime > AUTO_REFRESH_IDLE_MS && statusRef.current === 'idle' && !pendingTranscriptionsCount.current) {
              // Soft reset: Clear transient flags
              resetProcessor(); 
              setCheckingLength(0); 
              
              if (isRecording) {
                  stopRecording(); 
              }
              
              lastInteractionTimeRef.current = Date.now(); 
          }
      }, 5000); 

      return () => clearInterval(maintenanceInterval);
  }, [resetProcessor, isRecording, stopRecording]);


  // --- HANDLERS ---

  const { handleUndo, handleRedo, handleKeyDown } = useEditorHotkeys({
      undo,
      redo,
      toggleRecording: () => toggleRecording(),
      toggleProcessing: onToggleProcessing,
      onStatusChange,
      onPauseProcessing
  });

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (backdropRef.current) {
      backdropRef.current.scrollTop = e.currentTarget.scrollTop;
    }
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
      // Force Reset triggered by UI button
      stopRecording(); // Hard stop audio
      resetProcessor(); // Hard reset processor
      onStatusChange('idle');
      setVisualizerStatus('idle');
      setIsAnalyzing(false);
      setCheckingLength(0);
      pendingTranscriptionsCount.current = 0;
      lastInteractionTimeRef.current = Date.now();
    }
  }, [resetSignal, onStatusChange, resetProcessor, setCheckingLength, stopRecording]);

  useEffect(() => {
    if (!isRecording && status === 'recording') {
        if (isDevRecording) {
            setIsDevRecording(false);
            onStatusChange(settings.enabled ? 'idle' : 'paused');
            setVisualizerStatus('idle');
            return;
        }

        if (pendingTranscriptionsCount.current > 0) {
            onStatusChange('transcribing');
        } else {
            // Only force idle if we aren't analyzing. 
            // If analyzing, the analyzing logic will eventually set it to idle.
            if (!isAnalyzing) {
                onStatusChange(settings.enabled ? 'idle' : 'paused');
            }
        }
        setVisualizerStatus('idle');
    }
  }, [isRecording, status, onStatusChange, isDevRecording, settings.enabled, isAnalyzing]);

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

  const handleAudioChunk = useCallback(async (base64: string, mimeType: string) => {
    // FIX: Always increment pending count to indicate active work
    pendingTranscriptionsCount.current += 1;
    setIsAnalyzing(true);
    
    // Ensure UI shows processing state if it wasn't already (e.g. Stop was clicked)
    if (statusRef.current !== 'recording') {
        onStatusChange('transcribing');
    }
    
    try {
        let transcription = await transcribeAudio(base64, mimeType, language, settingsRef.current.audioModel);
        
        if (transcription && transcription.trim()) {
            lastInteractionTimeRef.current = Date.now(); // Valid input, reset idle timer
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
        // Release analyzing state only when ALL chunks are done
        if (pendingTranscriptionsCount.current <= 0) {
            pendingTranscriptionsCount.current = 0; // Safety clamp
            setIsAnalyzing(false);
            // Revert to idle only if we are not currently recording another chunk
            if (!isRecordingRef.current) {
                 onStatusChange(settings.enabled ? 'idle' : 'paused');
            }
        }
    }
  }, [language, onStatsUpdate, onStatusChange, setText, saveCheckpoint, notifyActivity, addDictatedSegment, setCorrectedLength, setCheckedLength, setCheckingLength, settings.enabled]);

  // We need a ref to access isRecording inside callbacks without dependency loops
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
            return;
        }

        if (isRecordingRef.current) {
            // STOPPING
            await stopRecording();
            setVisualizerStatus('idle');
            
            // FORCE ANALYZING STATE IMMEDIATELY to lock UI
            // This gives immediate visual feedback while the final chunk processes
            onStatusChange('transcribing');
            setIsAnalyzing(true);
            
            // Safety timeout: If no chunks arrive within 2 seconds (e.g. silence), reset to idle
            setTimeout(() => {
                if (pendingTranscriptionsCount.current === 0) {
                    setIsAnalyzing(false);
                    if (statusRef.current === 'transcribing') {
                        onStatusChange(settings.enabled ? 'idle' : 'paused');
                    }
                }
            }, 2000);

        } else {
            // STARTING
            // Reset state
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
      processingOverlay
  };
};
