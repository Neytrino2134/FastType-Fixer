

import { useState, useRef, useCallback, useEffect } from 'react';
import { HistorySnapshot } from '../types';

const STORAGE_KEY = 'fasttype_editor_state_v1';

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
          processedLength: parsed.processedLength || 0,
          checkedLength: parsed.checkedLength || 0, // Load checkedLength
          history: parsed.history || [],
          historyIndex: parsed.historyIndex || 0
        };
      }
    } catch (e) {
      console.error("Failed to load editor state", e);
    }
    return null;
  };

  const savedState = loadState();

  const [text, setText] = useState(savedState?.text || '');
  const [committedLength, setCommittedLength] = useState(savedState?.committedLength || 0);
  const [processedLength, setProcessedLength] = useState(savedState?.processedLength || 0);
  const [checkedLength, setCheckedLength] = useState(savedState?.checkedLength || 0); // New State

  // History State
  const [history, setHistory] = useState<HistorySnapshot[]>(
    (savedState && savedState.history && savedState.history.length > 0)
    ? savedState.history 
    : [{ 
      id: 'init', 
      text: '', 
      committedLength: 0, 
      processedLength: 0, 
      timestamp: Date.now(),
      tags: [] 
    }]
  );
  
  const [historyIndex, setHistoryIndex] = useState(savedState?.historyIndex || 0);
  
  // Ref to prevent saving checkpoints during undo/redo operations
  const isUndoingRef = useRef(false);

  // Persistence Effect: Save state on every change
  useEffect(() => {
    const stateToSave = {
      text,
      committedLength,
      processedLength,
      checkedLength,
      history,
      historyIndex
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [text, committedLength, processedLength, checkedLength, history, historyIndex]);

  // Fix history index when history updates
  useEffect(() => {
    setHistoryIndex((prev: number) => Math.min(prev, history.length - 1));
  }, [history.length]);

  const saveCheckpoint = useCallback((newText: string, newCommitted: number, newProcessed: number, tags: string[] = []) => {
    if (isUndoingRef.current) return;

    setHistory(prev => {
      const currentSlice = prev.slice(0, historyIndex + 1);
      const lastState = currentSlice[currentSlice.length - 1];

      if (lastState && lastState.text === newText && lastState.committedLength === newCommitted && (!tags.length || JSON.stringify(lastState.tags) === JSON.stringify(tags))) {
        return prev;
      }

      const nextHistory = [...currentSlice, { 
        id: Math.random().toString(36).substring(2, 9),
        text: newText, 
        committedLength: newCommitted, 
        processedLength: newProcessed,
        timestamp: Date.now(),
        tags: tags
      }];
      
      if (nextHistory.length > 50) return nextHistory.slice(1);
      return nextHistory;
    });

    setHistoryIndex((prev: number) => prev + 1);
  }, [historyIndex]);

  const performUndo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoingRef.current = true;
      const prevState = history[historyIndex - 1];

      setText(prevState.text);
      setCommittedLength(prevState.committedLength);
      setProcessedLength(prevState.processedLength);
      // For legacy history items without checkedLength, fallback to processedLength
      setCheckedLength((prevState as any).checkedLength ?? prevState.processedLength);
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
      setProcessedLength(nextState.processedLength);
      setCheckedLength((nextState as any).checkedLength ?? nextState.processedLength);
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
       setProcessedLength(state.processedLength);
       setCheckedLength((state as any).checkedLength ?? state.processedLength);
       setHistoryIndex(index);
       
       setTimeout(() => { isUndoingRef.current = false; }, 50);
       return true;
    }
    return false;
  }, [history]);

  return {
    text,
    setText,
    committedLength,
    setCommittedLength,
    processedLength,
    setProcessedLength,
    checkedLength,
    setCheckedLength,
    saveCheckpoint,
    undo: performUndo,
    redo: performRedo,
    jumpTo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    isUndoing: isUndoingRef.current,
    history,
    historyIndex
  };
};