

import { useState, useRef, useCallback, useEffect } from 'react';
import { HistorySnapshot } from '../types';

const STORAGE_KEY = 'fasttype_editor_state_v2';

export const useEditorHistory = () => {
  // Load initial state from LocalStorage
  const loadState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          text: parsed.text || '',
          committedLength: parsed.committedLength || 0,
          correctedLength: parsed.correctedLength || parsed.processedLength || 0, // Fallback for migration
          checkedLength: parsed.checkedLength || 0,
          history: parsed.history || [],
          historyIndex: parsed.historyIndex || 0,
          finalizedSentences: parsed.finalizedSentences || [],
          aiFixedSegments: parsed.aiFixedSegments || [], // New state
          dictatedSegments: parsed.dictatedSegments || [] // New state
        };
      }
    } catch (e) {
      console.error("Failed to load editor state", e);
    }
    return null;
  };

  const savedState = loadState();

  const [text, setText] = useState(savedState?.text || '');
  const [committedLength, setCommittedLength] = useState(savedState?.committedLength || 0); // Green
  const [correctedLength, setCorrectedLength] = useState(savedState?.correctedLength || 0); // Blue/Purple Boundary
  const [checkedLength, setCheckedLength] = useState(savedState?.checkedLength || 0);       // Red Boundary
  const [lastUpdate, setLastUpdate] = useState(Date.now()); // Signal for UI blinking

  // Tracks phrases specifically fixed by AI to color them Purple
  const [aiFixedSegments, setAiFixedSegments] = useState<Set<string>>(
      new Set(savedState?.aiFixedSegments || [])
  );

  // Tracks phrases specifically dictated to color them Orange
  const [dictatedSegments, setDictatedSegments] = useState<Set<string>>(
      new Set(savedState?.dictatedSegments || [])
  );

  const [finalizedSentences, setFinalizedSentences] = useState<Set<string>>(
      new Set(savedState?.finalizedSentences || [])
  );

  // History State
  const [history, setHistory] = useState<HistorySnapshot[]>(
    (savedState && savedState.history && savedState.history.length > 0)
    ? savedState.history 
    : [{ 
      id: 'init', 
      text: '', 
      committedLength: 0, 
      correctedLength: 0,
      processedLength: 0, 
      checkedLength: 0,
      timestamp: Date.now(),
      tags: [],
      finalizedSentences: [],
      aiFixedSegments: [],
      dictatedSegments: []
    }]
  );
  
  const [historyIndex, setHistoryIndex] = useState(savedState?.historyIndex || 0);
  
  const isUndoingRef = useRef(false);

  // Persistence Effect
  useEffect(() => {
    const stateToSave = {
      text,
      committedLength,
      correctedLength,
      checkedLength,
      history,
      historyIndex,
      finalizedSentences: Array.from(finalizedSentences),
      aiFixedSegments: Array.from(aiFixedSegments),
      dictatedSegments: Array.from(dictatedSegments)
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [text, committedLength, correctedLength, checkedLength, history, historyIndex, finalizedSentences, aiFixedSegments, dictatedSegments]);

  useEffect(() => {
    setHistoryIndex((prev: number) => Math.min(prev, history.length - 1));
  }, [history.length]);

  const addFinalizedSentence = useCallback((sentence: string) => {
      const trimmed = sentence.trim();
      if (trimmed.length > 0) {
          setFinalizedSentences(prev => {
              const newSet = new Set(prev);
              newSet.add(trimmed);
              return newSet;
          });
      }
  }, []);

  const addAiFixedSegment = useCallback((segment: string) => {
      const trimmed = segment.trim();
      if (trimmed.length > 0) {
          setAiFixedSegments(prev => {
              const newSet = new Set(prev);
              newSet.add(trimmed);
              return newSet;
          });
      }
  }, []);

  const addDictatedSegment = useCallback((segment: string) => {
      const trimmed = segment.trim();
      if (trimmed.length > 0) {
          setDictatedSegments(prev => {
              const newSet = new Set(prev);
              newSet.add(trimmed);
              return newSet;
          });
      }
  }, []);

  // NEW: Save multiple snapshots atomically to prevent race conditions during complex AI updates
  const saveCheckpoints = useCallback((snapshots: { text: string, committedLength: number, correctedLength: number, checkedLength?: number, tags: string[] }[]) => {
    if (isUndoingRef.current || snapshots.length === 0) return;

    // Use current state directly to avoid stale closures in functional updates during sequential calls
    let newHistory = history.slice(0, historyIndex + 1);
    let hasChanges = false;

    for (const snap of snapshots) {
          const lastState = newHistory[newHistory.length - 1];
          const isRawDictation = snap.tags.includes('raw_dictation');

          // Dedup
          if (!isRawDictation && lastState && lastState.text === snap.text && lastState.correctedLength === snap.correctedLength && 
              (!snap.tags.length || JSON.stringify(lastState.tags) === JSON.stringify(snap.tags))) {
              continue;
          }
          
          newHistory.push({
            id: Math.random().toString(36).substring(2, 9),
            text: snap.text,
            committedLength: snap.committedLength,
            correctedLength: snap.correctedLength,
            processedLength: snap.correctedLength,
            checkedLength: snap.checkedLength ?? Math.max(snap.correctedLength, checkedLength),
            timestamp: Date.now(),
            tags: snap.tags,
            finalizedSentences: Array.from(finalizedSentences),
            aiFixedSegments: Array.from(aiFixedSegments),
            dictatedSegments: Array.from(dictatedSegments)
          });
          hasChanges = true;
    }

    if (!hasChanges) return;

    if (newHistory.length > 50) newHistory = newHistory.slice(newHistory.length - 50);

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setLastUpdate(Date.now()); // Signal UI

  }, [history, historyIndex, finalizedSentences, aiFixedSegments, dictatedSegments, checkedLength]);

  const saveCheckpoint = useCallback((newText: string, newCommitted: number, newCorrected: number, tags: string[] = []) => {
      saveCheckpoints([{ text: newText, committedLength: newCommitted, correctedLength: newCorrected, tags }]);
  }, [saveCheckpoints]);

  const performUndo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoingRef.current = true;
      const prevState = history[historyIndex - 1];

      setText(prevState.text);
      setCommittedLength(prevState.committedLength);
      setCorrectedLength(prevState.correctedLength ?? prevState.processedLength);
      setCheckedLength(prevState.checkedLength ?? prevState.correctedLength ?? prevState.processedLength);
      
      if (prevState.finalizedSentences) {
          setFinalizedSentences(new Set(prevState.finalizedSentences));
      }
      if (prevState.aiFixedSegments) {
          setAiFixedSegments(new Set(prevState.aiFixedSegments));
      }
      if (prevState.dictatedSegments) {
          setDictatedSegments(new Set(prevState.dictatedSegments));
      }
      
      setHistoryIndex(historyIndex - 1);

      setTimeout(() => { isUndoingRef.current = false; }, 50);
      return true;
    }
    return false;
  }, [history, historyIndex]);

  const performRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoingRef.current = true;
      const nextState = history[historyIndex + 1];

      setText(nextState.text);
      setCommittedLength(nextState.committedLength);
      setCorrectedLength(nextState.correctedLength ?? nextState.processedLength);
      setCheckedLength(nextState.checkedLength ?? nextState.correctedLength ?? nextState.processedLength);

      if (nextState.finalizedSentences) {
          setFinalizedSentences(new Set(nextState.finalizedSentences));
      }
      if (nextState.aiFixedSegments) {
          setAiFixedSegments(new Set(nextState.aiFixedSegments));
      }
      if (nextState.dictatedSegments) {
          setDictatedSegments(new Set(nextState.dictatedSegments));
      }

      setHistoryIndex(historyIndex + 1);

      setTimeout(() => { isUndoingRef.current = false; }, 50);
      return true;
    }
    return false;
  }, [history, historyIndex]);

  const jumpTo = useCallback((index: number) => {
    if (index >= 0 && index < history.length) {
       isUndoingRef.current = true;
       const state = history[index];
       
       setText(state.text);
       setCommittedLength(state.committedLength);
       setCorrectedLength(state.correctedLength ?? state.processedLength);
       setCheckedLength(state.checkedLength ?? state.correctedLength ?? state.processedLength);
       
       if (state.finalizedSentences) {
           setFinalizedSentences(new Set(state.finalizedSentences));
       }
       if (state.aiFixedSegments) {
           setAiFixedSegments(new Set(state.aiFixedSegments));
       }
       if (state.dictatedSegments) {
           setDictatedSegments(new Set(state.dictatedSegments));
       }

       setHistoryIndex(index);
       
       setTimeout(() => { isUndoingRef.current = false; }, 50);
       return true;
    }
    return false;
  }, [history]);

  const clearHistory = useCallback(() => {
    if (history.length === 0) return;
    
    // We snapshot the CURRENT visible text as the new start
    const currentState = history[historyIndex];
    
    const newState = {
        ...currentState,
        id: 'reset_' + Date.now(),
        tags: ['reset'] 
    };
    
    setHistory([newState]);
    setHistoryIndex(0);
    setLastUpdate(Date.now());
  }, [history, historyIndex]);

  return {
    text,
    setText,
    committedLength,
    setCommittedLength,
    correctedLength,
    setCorrectedLength,
    checkedLength,
    setCheckedLength,
    finalizedSentences,
    addFinalizedSentence,
    aiFixedSegments,
    addAiFixedSegment,
    dictatedSegments,
    addDictatedSegment,
    saveCheckpoint,
    saveCheckpoints, // EXPORTED
    undo: performUndo,
    redo: performRedo,
    jumpTo,
    clearHistory, 
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    isUndoing: isUndoingRef.current,
    history,
    historyIndex,
    lastUpdate 
  };
};