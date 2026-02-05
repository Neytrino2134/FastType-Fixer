

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { transcribeAudio, enhanceFullText } from '../services/geminiService';
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
    finalizedSentences, addFinalizedSentence, 
    aiFixedSegments, addAiFixedSegment,
    dictatedSegments, addDictatedSegment,
    saveCheckpoint, saveCheckpoints, undo, redo, canUndo, canRedo,
    history, historyIndex, jumpTo, lastUpdate,
    clearHistory // NEW
  } = useEditorHistory();

  // 2. Refs for Async Access
  const textRef = useRef(text);
  const committedLengthRef = useRef(committedLength);
  const correctedLengthRef = useRef(correctedLength);
  const checkedLengthRef = useRef(checkedLength);
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const pendingTranscriptionsCount = useRef(0);

  /**
   * CORE TEXT UPDATE LOGIC
   * Used by typing (onChange) and programmatic updates (Paste/Clear)
   */
  const handleTextUpdate = useCallback((newVal: string) => {
    const oldVal = textRef.current;
    
    setText(newVal);
    // notifyActivity is called inside useTextProcessor usually, but this is the raw handler
    // We will let useTextProcessor handle the activity notification via its own hook logic
    // OR we trigger it if we had access. 
    // *Correction*: We can't access notifyActivity here before initializing useTextProcessor.
    // However, useTextProcessor watches textRef? No, it has its own logic.
    // We will manually trigger activity in the handleChange wrapper.

    // Clear existing typing timers
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (manualSaveTimeoutRef.current) clearTimeout(manualSaveTimeoutRef.current);
    
    // --- 1. HANDLE EMPTY TEXT (Clear) ---
    if (newVal.length === 0) {
        setCommittedLength(0);
        setCorrectedLength(0);
        setCheckedLength(0);
        
        onStatusChange(settings.enabled ? 'idle' : 'paused');
        
        // Save history immediately on clear so we can Undo it
        saveCheckpoint('', 0, 0, ['raw']);
        return;
    }
    
    // --- 2. DETECT PASTE / CUT (Large changes) ---
    // If length difference is significant (> 5 chars), assume paste/cut and save immediately
    if (Math.abs(newVal.length - oldVal.length) > 5) {
        const newChecked = Math.min(checkedLengthRef.current, newVal.length);
        const newCorrected = Math.min(correctedLengthRef.current, newVal.length);
        const newCommitted = Math.min(committedLengthRef.current, newVal.length);
        
        saveCheckpoint(newVal, newCommitted, newCorrected, ['raw']);
    } 
    else {
        // --- 3. DEBOUNCE SAVE FOR REGULAR TYPING ---
        // Save checkpoint 1s after user stops typing to ensure manual edits are undoable
        manualSaveTimeoutRef.current = setTimeout(() => {
             const currentT = textRef.current;
             // Only save if it's not the same as the last history item (saveCheckpoint handles dupe check)
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
            // Revert to paused if disabled, else idle
            onStatusChange(settings.enabled ? 'idle' : 'paused');
        }
    }, TYPING_TIMEOUT_MS);

    // --- 4. BACKTRACKING LOGIC ---
    let diffIndex = 0;
    while (diffIndex < oldVal.length && diffIndex < newVal.length && oldVal[diffIndex] === newVal[diffIndex]) {
      diffIndex++;
    }

    // Reset pointers to the point of edit
    if (diffIndex < checkedLengthRef.current) setCheckedLength(diffIndex);
    if (diffIndex < correctedLengthRef.current) setCorrectedLength(diffIndex);
    if (diffIndex < committedLengthRef.current) setCommittedLength(Math.max(0, diffIndex));
  }, [saveCheckpoint, onStatusChange, setCommittedLength, setCorrectedLength, setCheckedLength, setText, settings.enabled]);

  // SMART CURSOR HANDLER FOR AUTO-FORMAT
  const handleAutoFormat = useCallback((newText: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
        handleTextUpdate(newText);
        return;
    }

    const selectionStart = textarea.selectionStart;
    const currentText = textRef.current;

    // Logic: Calculate how the length changed *before* the cursor
    // We run the same mini-script logic on the text "prefix" (up to cursor)
    // The length of the processed prefix is where the cursor should be.
    const prefix = currentText.substring(0, selectionStart);
    const processedPrefix = runMiniScripts(prefix);
    const newCursorPos = processedPrefix.length;

    // Apply Update
    handleTextUpdate(newText);

    // Restore Cursor
    requestAnimationFrame(() => {
        if (textareaRef.current) {
            textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
    });
  }, [handleTextUpdate]);

  // New Text Processor (The Brain)
  const { notifyActivity, reset: resetProcessor } = useTextProcessor({
      textRef,
      committedLengthRef,
      correctedLengthRef,
      checkedLengthRef,
      settingsRef,
      statusRef,
      language,
      setText,
      setCorrectedLength,
      setCommittedLength,
      setCheckedLength,
      finalizedSentences, 
      addFinalizedSentence,
      addAiFixedSegment,
      saveCheckpoint,
      saveCheckpoints,
      onStatsUpdate,
      onStatusChange,
      onAutoFormat: handleAutoFormat, // Inject Smart Cursor Handler
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
    }
  }, [resetSignal, onStatusChange, resetProcessor]);

  // MONITOR RECORDING STATE
  useEffect(() => {
    if (!isRecording && status === 'recording') {
        if (pendingTranscriptionsCount.current > 0) {
            onStatusChange('transcribing');
        } else {
            onStatusChange('idle');
        }
        setVisualizerStatus('idle');
    }
  }, [isRecording, status, onStatusChange]);

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
              
              addAiFixedSegment(normalizeBlock(enhanced));
              
              saveCheckpoint(enhanced, len, len, ['enhanced', 'ai_corrected']);
              onStatsUpdate(1);
          } else {
              addNotification(t.nothingToImprove, 'info');
              const len = original.length;
              setCommittedLength(len);
              setCorrectedLength(len);
              setCheckedLength(len);
          }
      } catch (e) {
          console.error("Enhance failed", e);
          addNotification(language === 'ru' ? "Ошибка улучшения" : "Enhance failed", 'error');
      } finally {
          onStatusChange('idle');
      }
  };

  /**
   * EVENT HANDLER: Typing
   */
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleTextUpdate(e.target.value);
    notifyActivity(); // Notify processor that user is active
  };

  // Audio Chunk Handling
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
  }, [language, onStatsUpdate, onStatusChange, setText, saveCheckpoint, notifyActivity, addDictatedSegment, setCorrectedLength, setCheckedLength]);

  // NEW: Handle File Upload Transcription
  const handleAudioFile = useCallback((file: File) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
          if (e.target?.result) {
              const base64 = (e.target.result as string).split(',')[1];
              await handleAudioChunk(base64, file.type);
          }
      };
      reader.readAsDataURL(file);
  }, [handleAudioChunk]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
        await stopRecording();
    } else {
        // Auto-Unpause: If currently paused, re-enable the processor
        if (!settingsRef.current.enabled) {
            onToggleProcessing();
        }

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
  }, [isRecording, stopRecording, startRecording, onStatusChange, handleAudioChunk, resetProcessor, onToggleProcessing]);

  return {
      text,
      committedLength,
      correctedLength,
      checkedLength,
      processedLength: correctedLength, 
      finalizedSentences,
      aiFixedSegments,
      dictatedSegments, 
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
      handleAudioFile // Exported for EditorToolbar
  };
};