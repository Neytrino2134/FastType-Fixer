

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { transcribeAudio } from '../services/geminiService';
import { ProcessingStatus, CorrectionSettings, Language, VisualizerStatus } from '../types';
import { useEditorHistory } from './useEditorHistory';
import { useAudioRecorder } from './useAudioRecorder';
import { useNotification } from '../contexts/NotificationContext';
import { useEditorHotkeys } from './useEditorHotkeys';
import { useTextProcessor } from './useTextProcessor';
import { COMMON_WORDS_RU, COMMON_WORDS_EN } from '../data/dictionary';
import { formatPunctuationOnTheFly } from '../utils/textCleaner';

interface UseSmartEditorProps {
    settings: CorrectionSettings;
    onStatsUpdate: (count: number) => void;
    language: Language;
    status: ProcessingStatus;
    onStatusChange: (status: ProcessingStatus) => void;
    setIsGrammarChecking: (isChecking: boolean) => void; // NEW
    onClipboardAction: (text: string) => void;
    resetSignal: number;
    onPauseProcessing: () => void;
}

const WATCHDOG_TIMEOUT_MS = 15000; // 15 seconds max wait time
const TYPING_TIMEOUT_MS = 1500; // Force idle after 1.5s of no typing
const AUTO_SPACE_DELAY_MS = 500; // 0.5s pause before inserting space

export const useSmartEditor = ({ 
  settings, 
  onStatsUpdate, 
  language,
  status,
  onStatusChange,
  setIsGrammarChecking,
  onClipboardAction,
  resetSignal,
  onPauseProcessing
}: UseSmartEditorProps) => {
  // 1. Core State & History
  const { 
    text, setText, 
    committedLength, setCommittedLength, 
    processedLength, setProcessedLength,
    checkedLength, setCheckedLength, // New State
    saveCheckpoint, undo, redo, canUndo, canRedo,
    history, historyIndex, jumpTo
  } = useEditorHistory();

  // 2. Refs for Async Access
  const textRef = useRef(text);
  const committedLengthRef = useRef(committedLength);
  const processedLengthRef = useRef(processedLength);
  const checkedLengthRef = useRef(checkedLength);
  const settingsRef = useRef(settings);
  const statusRef = useRef(status);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSpaceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Worker Ref
  const workerRef = useRef<Worker | null>(null);

  // Sync refs
  useEffect(() => { textRef.current = text; }, [text]);
  useEffect(() => { committedLengthRef.current = committedLength; }, [committedLength]);
  useEffect(() => { processedLengthRef.current = processedLength; }, [processedLength]);
  useEffect(() => { checkedLengthRef.current = checkedLength; }, [checkedLength]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  
  // Status Sync & Pause Logic Fix
  useEffect(() => {
    statusRef.current = status;
    if (!settings.enabled && status !== 'paused') {
        onStatusChange('paused');
    } else if (settings.enabled && status === 'paused') {
        onStatusChange('idle');
    }
  }, [settings.enabled, status, onStatusChange]);

  // 3. Sub-Hooks Initialization (Moved up to be available for Worker)
  const { isRecording, startRecording, stopRecording, visualizerDataRef, autoStopCountdown } = useAudioRecorder(settings.silenceThreshold);
  const { addNotification } = useNotification();
  const [visualizerStatus, setVisualizerStatus] = useState<VisualizerStatus>('idle');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const pendingTranscriptionsCount = useRef(0);

  // Text Processor (AI Logic)
  const {
      processPendingTypos,
      finalizeCommittedText,
      handleEnhance,
      scheduleTyposCheck,
      scheduleFinalization,
      cancelPendingTasks,
      ensureProperSpacing
  } = useTextProcessor({
      textRef,
      committedLengthRef,
      processedLengthRef,
      settingsRef,
      statusRef,
      language,
      setText,
      setProcessedLength,
      setCommittedLength,
      saveCheckpoint,
      onStatsUpdate,
      onStatusChange,
      setIsGrammarChecking 
  });

  // 4. Worker Initialization & Logic
  useEffect(() => {
      // Initialize Dictionary Worker
      workerRef.current = new Worker(new URL('../workers/dictionary.worker.ts', import.meta.url), { type: 'module' });
      
      // Inject Dictionary Data
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

      return () => {
          workerRef.current?.terminate();
      };
  }, []); // Run once on mount

  // Worker Response Handler (Updated to use scheduleFinalization)
  useEffect(() => {
    if (!workerRef.current) return;

    workerRef.current.onmessage = (e) => {
        const { type, validatedLength, checkedLength: newCheckedLength } = e.data;
        
        if (type === 'CHECK_RESULT') {
            // FEATURE 1: Update Processed/Orange Length (Valid words)
            const newProcessedLength = Math.max(validatedLength, committedLengthRef.current);
            if (newProcessedLength !== processedLengthRef.current) {
                 setProcessedLength(newProcessedLength);
            }

            // FEATURE 1.5: Update Checked/Red Length (Scanned words)
            const safeCheckedLength = Math.max(newCheckedLength, newProcessedLength);
            if (safeCheckedLength !== checkedLengthRef.current) {
                setCheckedLength(safeCheckedLength);
            }

            // FEATURE 2: Automatic Space Injection (Debounced)
            if (settingsRef.current.enabled && newProcessedLength === textRef.current.length && textRef.current.length > 0) {
                const lastChar = textRef.current.slice(-1);
                if (lastChar !== ' ' && lastChar !== '\n') {
                    if (autoSpaceTimeoutRef.current) clearTimeout(autoSpaceTimeoutRef.current);
                    autoSpaceTimeoutRef.current = setTimeout(() => {
                        if (textRef.current.length === newProcessedLength) {
                            const newText = textRef.current + ' ';
                            setText(newText);
                            // CRITICAL: Since we modified text programmatically, check if we need to finalize.
                            // The user might have finished a sentence with a period, and we just added a space.
                            // This space effectively "confirms" the sentence end.
                            scheduleFinalization(200);
                        }
                    }, AUTO_SPACE_DELAY_MS);
                }
            }
        }
    };
  }, [scheduleFinalization, setText, setProcessedLength, setCheckedLength, committedLength]); // Re-bind when dependencies change

  // Hotkeys
  const { handleUndo, handleRedo, handleKeyDown } = useEditorHotkeys({
      undo,
      redo,
      toggleRecording: () => toggleRecording(),
      onStatusChange,
      onPauseProcessing
  });

  // 5. Logic & Handlers

  // --- STUCK STATE WATCHDOG (DOUBLE CHECK) ---
  useEffect(() => {
    if (!settings.enabled) return;
    // Watchdog triggers if checked text exists (Red) but isn't being processed
    if ((status === 'idle' || status === 'done') && text.length > processedLength) {
        const stuckTimeout = setTimeout(() => {
            if (
                (statusRef.current === 'idle' || statusRef.current === 'done') && 
                textRef.current.length > processedLengthRef.current
            ) {
                // Force check on stuck text
                onStatusChange('grammar_check'); 
                scheduleTyposCheck(0); 
            }
        }, 1000); 

        return () => clearTimeout(stuckTimeout);
    }
  }, [status, text.length, processedLength, settings.enabled, scheduleTyposCheck, onStatusChange]);

  // --- ANTI-FREEZE WATCHDOG ---
  useEffect(() => {
    let watchdogTimer: ReturnType<typeof setTimeout> | null = null;
    const isBusyState = ['typing', 'thinking', 'correcting', 'grammar_check', 'enhancing', 'transcribing'].includes(status);
    
    if (isBusyState) {
        watchdogTimer = setTimeout(() => {
            console.warn("Watchdog triggered: System hung for too long. Resetting.");
            cancelPendingTasks();
            if (autoSpaceTimeoutRef.current) clearTimeout(autoSpaceTimeoutRef.current);
            onStatusChange('idle');
            setVisualizerStatus('idle');
            setIsGrammarChecking(false);
        }, WATCHDOG_TIMEOUT_MS);
    }

    return () => {
        if (watchdogTimer) clearTimeout(watchdogTimer);
    };
  }, [status, text, onStatusChange, cancelPendingTasks, setIsGrammarChecking]);


  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (backdropRef.current) {
      backdropRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleClipboardEvent = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const selectedText = target.value.substring(target.selectionStart, target.selectionEnd);
    if (selectedText) {
       onClipboardAction(selectedText);
    }
  };

  const handleHistoryJump = useCallback((index: number) => {
    if (jumpTo(index)) {
        onStatusChange('paused');
        onPauseProcessing();
    }
  }, [jumpTo, onStatusChange, onPauseProcessing]);

  // RESET SIGNAL LISTENER
  useEffect(() => {
    if (resetSignal > 0) {
      cancelPendingTasks();
      if (autoSpaceTimeoutRef.current) clearTimeout(autoSpaceTimeoutRef.current);
      onStatusChange('idle');
      setVisualizerStatus('idle');
      
      setTimeout(() => {
          if (processedLengthRef.current < textRef.current.length) {
              processPendingTypos();
          } else if (committedLengthRef.current < processedLengthRef.current) {
              finalizeCommittedText();
          }
      }, 50);
    }
  }, [resetSignal, onStatusChange, processPendingTypos, finalizeCommittedText, cancelPendingTasks]);

  /**
   * EVENT HANDLER: Typing
   */
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let newVal = e.target.value;
    
    // Feature: Auto-format punctuation spacing on the fly
    // "text , text" -> "text, text"
    newVal = formatPunctuationOnTheFly(newVal);

    const oldVal = textRef.current;
    // DETECT PASTE (length change > 1)
    const isPaste = Math.abs(newVal.length - oldVal.length) > 1;

    setText(newVal);

    if (autoSpaceTimeoutRef.current) {
        clearTimeout(autoSpaceTimeoutRef.current);
        autoSpaceTimeoutRef.current = null;
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    if (newVal.trim().length === 0) {
        setCommittedLength(0);
        setProcessedLength(0);
        setCheckedLength(0); // Reset Checked
        cancelPendingTasks();
        onStatusChange(settings.enabled ? 'idle' : 'paused');
        return;
    }
    
    if (statusRef.current !== 'recording') {
        onStatusChange('typing');
    }

    typingTimeoutRef.current = setTimeout(() => {
        if (statusRef.current === 'typing') {
            onStatusChange('idle');
        }
    }, TYPING_TIMEOUT_MS);

    // 1. BACKTRACKING & EDITING LOGIC
    let diffIndex = 0;
    while (diffIndex < oldVal.length && diffIndex < newVal.length && oldVal[diffIndex] === newVal[diffIndex]) {
      diffIndex++;
    }

    const textBeforeCursor = newVal.slice(0, diffIndex + 1);
    const lastSeparatorIndex = textBeforeCursor.search(/[\s\n\t.,!?;:()""''«»—][^\s\n\t.,!?;:()""''«»—]*$/);
    const wordStartIndex = lastSeparatorIndex === -1 ? 0 : lastSeparatorIndex + 1;

    // FEATURE 3: Revert state logic
    // Reset processedLength (Orange) if we edited inside it
    if (processedLengthRef.current > wordStartIndex) {
        setProcessedLength(wordStartIndex);
    }
    // Reset checkedLength (Red) if we edited inside it
    if (checkedLengthRef.current > wordStartIndex) {
        setCheckedLength(wordStartIndex);
    }
    // Reset committedLength (Green) if we edited inside it
    if (diffIndex < committedLengthRef.current) {
        setCommittedLength(Math.max(0, diffIndex - 1));
        setProcessedLength(diffIndex);
        setCheckedLength(diffIndex);
    }

    // 2. WORKER DICTIONARY CHECK (Async)
    if (workerRef.current) {
        workerRef.current.postMessage({ 
            type: 'CHECK_TEXT', 
            text: newVal, 
            language,
            processedLength: (wordStartIndex < processedLengthRef.current) ? wordStartIndex : processedLengthRef.current 
        });
    }

    // 3. SCHEDULE AI TASKS
    if (settings.enabled && statusRef.current !== 'recording') {
        const lastChar = newVal.slice(-1);
        const isWordBoundary = /[\s.,;!?]/.test(lastChar);
        // Default delay or fast reaction for word ends
        const checkDelay = isWordBoundary ? 50 : settings.debounceMs;
        
        // Fix: Check for punctuation at end of string or before space
        const endsWithPunctuation = /[.!?](\s|$)/.test(newVal.slice(-2));

        if (isPaste) {
            // Paste: Schedule Typos check aggressively to handle big chunks
            scheduleTyposCheck(500);
        } else if (endsWithPunctuation) {
            // Dot/Exclamation/Question: 
            // 1. If text is Red (unprocessed), scheduleTyposCheck(200) triggers the "Double Finalization" logic (Fix+Finalize).
            // 2. If text is Orange (valid words), scheduleFinalization(200) ensures we commit the sentence Green.
            // We schedule BOTH to cover all states.
            scheduleTyposCheck(200);
            scheduleFinalization(200);
        } else {
            // Normal typing
            scheduleTyposCheck(checkDelay);
        }
    }
  };

  // Audio Chunk Handling
  const handleAudioChunk = useCallback(async (base64: string, mimeType: string) => {
    pendingTranscriptionsCount.current += 1;
    if (statusRef.current !== 'recording') onStatusChange('transcribing');

    if (statusRef.current === 'recording') {
        setVisualizerStatus('analyzing_listening');
    }

    try {
        let transcription = await transcribeAudio(base64, mimeType, language, settingsRef.current.audioModel);
        
        if (transcription && transcription.trim()) {
            transcription = ensureProperSpacing(transcription);

            const currentText = textRef.current;
            const currentCommitted = committedLengthRef.current;
            
            const separator = currentText.trim().length > 0 && !currentText.endsWith(' ') ? ' ' : '';
            const newTextValue = currentText + separator + transcription;
            const newProcessedLen = newTextValue.length;

            setText(newTextValue);
            setProcessedLength(newProcessedLen); 
            setCheckedLength(newProcessedLen); // Transcribed text is assumed "scanned"
            
            onStatsUpdate(1);
            saveCheckpoint(newTextValue, currentCommitted, newProcessedLen, ['dictated']);
            scheduleFinalization(1000);
        }
    } catch (error) {
        console.error("Chunk transcription failed", error);
    } finally {
        pendingTranscriptionsCount.current -= 1;
        if (pendingTranscriptionsCount.current === 0) {
            if (statusRef.current === 'recording') {
                setVisualizerStatus('listening');
            } else {
                onStatusChange('done');
                setVisualizerStatus('done');
                setTimeout(() => {
                    if (settingsRef.current.enabled) {
                        onStatusChange('idle');
                        setVisualizerStatus('idle');
                    } else {
                        onStatusChange('paused');
                        setVisualizerStatus('idle');
                    }
                }, 1500);
            }
        }
    }
  }, [language, onStatsUpdate, onStatusChange, scheduleFinalization, setText, setProcessedLength, setCheckedLength, ensureProperSpacing, saveCheckpoint]);

  // Audio Auto-Stop Logic
  useEffect(() => {
    if (statusRef.current === 'recording' && !isRecording && pendingTranscriptionsCount.current === 0) {
        onStatusChange(settings.enabled ? 'idle' : 'paused');
        setVisualizerStatus('done');
        setTimeout(() => setVisualizerStatus('idle'), 2000);
        addNotification(language === 'ru' ? 'Запись остановлена' : 'Recording stopped', 'info');
    } else if (statusRef.current === 'recording' && !isRecording && pendingTranscriptionsCount.current > 0) {
        onStatusChange('transcribing');
        setVisualizerStatus('analyzing');
    }
  }, [isRecording, status, settings.enabled, language, addNotification, onStatusChange]);

  const handleAudioChunkRef = useRef(handleAudioChunk);
  useEffect(() => { handleAudioChunkRef.current = handleAudioChunk; }, [handleAudioChunk]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
        await stopRecording();
    } else {
        cancelPendingTasks();
        
        const success = await startRecording(
            async (b64, mime) => { await handleAudioChunkRef.current(b64, mime); },
            (newStatus) => setVisualizerStatus(newStatus)
        );
        
        if (success) {
            onStatusChange('recording');
            setVisualizerStatus('listening');
            addNotification(language === 'ru' ? 'Запись...' : 'Recording...', 'info', 1500);
        } else {
            onStatusChange('idle');
            setVisualizerStatus('idle');
        }
    }
  }, [isRecording, stopRecording, startRecording, onStatusChange, language, addNotification, cancelPendingTasks]);

  const isBusy = status !== 'idle' && status !== 'done' && status !== 'typing' && status !== 'paused';

  return {
      text,
      committedLength,
      processedLength,
      checkedLength, // Return new state
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
      history,
      historyIndex,
      handleHistoryJump
  };
};
