
import { useState, useEffect, useRef, useCallback } from 'react';
import { PlannerNote, PlannerTask, Language } from '../types';
import { useAudioRecorder } from './useAudioRecorder';
import { transcribeAudio } from '../services/geminiService';

const STORAGE_KEY_PLANNER = 'fasttype_planner_data';

interface PlannerData {
    notes: PlannerNote[];
    tasks: PlannerTask[];
}

export const usePlannerLogic = (apiKey: string, language: Language, silenceThreshold: number = 20) => {
    const [notes, setNotes] = useState<PlannerNote[]>([]);
    const [tasks, setTasks] = useState<PlannerTask[]>([]);
    
    // Audio Mode: 'note' or 'task'
    const [dictationMode, setDictationMode] = useState<'note' | 'task'>('note');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    const { isRecording, startRecording, stopRecording, autoStopCountdown, visualizerDataRef } = useAudioRecorder(silenceThreshold);
    const pendingAudioCount = useRef(0);

    // Load from LocalStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_PLANNER);
            if (saved) {
                const parsed: PlannerData = JSON.parse(saved);
                setNotes(parsed.notes || []);
                setTasks(parsed.tasks || []);
            }
        } catch (e) {
            console.error("Failed to load planner data", e);
        }
    }, []);

    // Save to LocalStorage
    useEffect(() => {
        const data: PlannerData = { notes, tasks };
        localStorage.setItem(STORAGE_KEY_PLANNER, JSON.stringify(data));
    }, [notes, tasks]);

    // --- NOTES CRUD ---
    const addNote = useCallback((text: string = '', title: string = '') => {
        // Auto-generate title if missing
        const noteTitle = title || `Note ${notes.length + 1}`;
        
        const newNote: PlannerNote = {
            id: Date.now().toString() + Math.random(),
            title: noteTitle,
            content: text,
            timestamp: Date.now(),
            color: 'yellow' // Default
        };
        setNotes(prev => [newNote, ...prev]);
    }, [notes.length]); // Updated dependency to include notes.length

    const updateNote = useCallback((id: string, content: string, title?: string) => {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, content, title: title ?? n.title } : n));
    }, []);

    const updateNoteImage = useCallback((id: string, imageData: string) => {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, imageData } : n));
    }, []);

    const deleteNote = useCallback((id: string) => {
        setNotes(prev => prev.filter(n => n.id !== id));
    }, []);

    const setNoteColor = useCallback((id: string, color: PlannerNote['color']) => {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, color } : n));
    }, []);

    // --- TASKS CRUD ---
    const addTask = useCallback((text: string) => {
        if (!text.trim()) return;
        const newTask: PlannerTask = {
            id: Date.now().toString() + Math.random(),
            text: text,
            completed: false,
            timestamp: Date.now()
        };
        setTasks(prev => [newTask, ...prev]);
    }, []);

    const toggleTask = useCallback((id: string) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    }, []);

    const deleteTask = useCallback((id: string) => {
        setTasks(prev => prev.filter(t => t.id !== id));
    }, []);

    const clearCompletedTasks = useCallback(() => {
        setTasks(prev => prev.filter(t => !t.completed));
    }, []);

    // --- VOICE HANDLING ---
    const handleAudioChunk = async (base64: string, mimeType: string) => {
        pendingAudioCount.current++;
        setIsAnalyzing(true);

        try {
            // Use the main geminiService transcription (robust prompts) instead of chat version
            const transcription = await transcribeAudio(base64, mimeType, language);
            
            if (transcription && transcription.trim()) {
                const text = transcription.trim();
                
                // Capitalize first letter
                const formatted = text.charAt(0).toUpperCase() + text.slice(1);

                if (dictationMode === 'task') {
                    addTask(formatted);
                } else {
                    addNote(formatted);
                }
            }
        } catch (e) {
            console.error("Planner Transcription failed", e);
        } finally {
            pendingAudioCount.current--;
            if (pendingAudioCount.current === 0) {
                setIsAnalyzing(false);
            }
        }
    };

    const toggleDictation = async () => {
        if (isRecording) {
            await stopRecording();
        } else {
            await startRecording(handleAudioChunk);
        }
    };

    return {
        notes,
        tasks,
        isRecording,
        isAnalyzing,
        dictationMode,
        setDictationMode,
        visualizerDataRef,
        autoStopCountdown,
        addNote,
        updateNote,
        updateNoteImage,
        deleteNote,
        setNoteColor,
        addTask,
        toggleTask,
        deleteTask,
        clearCompletedTasks,
        toggleDictation
    };
};
