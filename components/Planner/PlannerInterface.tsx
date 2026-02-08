

import React, { useState } from 'react';
import { Language, CorrectionSettings } from '../../types';
import { usePlannerLogic } from '../../hooks/usePlannerLogic';
import { getTranslation } from '../../utils/i18n';
import { NoteCard } from './NoteCard';
import { TaskItem } from './TaskItem';
import { VisualizerCanvas } from '../Editor/VisualizerCanvas';
import { Plus, CheckCircle2, Mic, StickyNote, ListTodo, Loader2, ClipboardList, Lock } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { Tooltip } from '../Tooltip';

interface PlannerInterfaceProps {
    language: Language;
    apiKey: string;
    onToggleClipboard?: () => void;
    settings?: CorrectionSettings;
}

export const PlannerInterface: React.FC<PlannerInterfaceProps> = ({ language, apiKey, onToggleClipboard, settings }) => {
    const tLoc = getTranslation(language);
    const { addNotification } = useNotification();
    const isFreeTier = settings?.isFreeTier ?? true;
    
    const {
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
    } = usePlannerLogic(apiKey, language);

    const [newTaskText, setNewTaskText] = useState('');

    const t = {
        title: tLoc.planTitle || "Notes & Tasks",
        newNote: tLoc.planNewNote || "New Note",
        newTask: tLoc.planNewTask || "New Task",
        dictateNote: tLoc.planDictateNote || "Dictate Note",
        dictateTask: tLoc.planDictateTask || "Dictate Task",
        clearDone: tLoc.planClearDone || "Clear Done",
        emptyTasks: tLoc.planEmptyTasks || "No tasks for today",
        emptyNotes: tLoc.planEmptyNotes || "Your notes will appear here",
        notePlace: tLoc.planNotePlaceholder || "Note content...",
        taskPlace: tLoc.planTaskPlaceholder || "Add a task...",
        listening: tLoc.visListening || "LISTENING",
        analyzing: tLoc.visAnalyzing || "ANALYZING"
    };

    const handleTaskSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTaskText.trim()) {
            addTask(newTaskText);
            setNewTaskText('');
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-slate-900 overflow-hidden relative select-none">
            
            {/* Background Visualizer */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-30">
                <VisualizerCanvas 
                    visualizerDataRef={visualizerDataRef}
                    isRecording={isRecording || isAnalyzing} 
                    visualizerStyle="bars"
                    amp={1.0}
                    lowCut={5}
                    highCut={60}
                    gravity={3}
                    mirror={true}
                />
            </div>

            {/* HEADER TOOLBAR */}
            <div className="shrink-0 h-14 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm z-20">
                <div className="flex items-center gap-2">
                    <span className="text-slate-200 font-bold tracking-wide flex items-center gap-2">
                        <ListTodo className="w-5 h-5 text-indigo-400" />
                        {t.title}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {onToggleClipboard && (
                        <Tooltip content={tLoc.clipboardTitle || "Clipboard"} side="bottom">
                            <button 
                                onClick={onToggleClipboard}
                                className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                                <ClipboardList className="w-4 h-4" />
                            </button>
                        </Tooltip>
                    )}
                    
                    <div className="w-px h-5 bg-slate-700 mx-1"></div>

                    <Tooltip content={t.clearDone} side="bottom">
                        <button onClick={clearCompletedTasks} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800">
                            <CheckCircle2 className="w-4 h-4" />
                        </button>
                    </Tooltip>
                </div>
            </div>

            {/* MAIN CONTENT SPLIT */}
            <div className="flex-1 flex overflow-hidden z-10 relative">
                
                {/* LEFT: NOTES GRID */}
                <div className="w-1/2 p-4 overflow-y-auto custom-scrollbar border-r border-slate-800/50 bg-slate-900/50">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-20">
                        {/* BIG ADD BUTTON CARD */}
                        <button 
                            onClick={() => addNote()}
                            className="
                                min-h-[180px] rounded-xl border-2 border-dashed border-slate-700 hover:border-indigo-500/50 bg-slate-800/30 hover:bg-slate-800/60
                                flex flex-col items-center justify-center gap-3 transition-all duration-300 group
                            "
                        >
                            <div className="p-3 rounded-full bg-slate-800 group-hover:bg-indigo-600 text-slate-400 group-hover:text-white transition-colors shadow-lg">
                                <Plus className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold text-slate-500 group-hover:text-indigo-300 tracking-wider uppercase">
                                {t.newNote}
                            </span>
                        </button>

                        {/* Note Cards */}
                        {notes.map(note => (
                            <NoteCard 
                                key={note.id} 
                                note={note} 
                                onUpdate={updateNote}
                                onUpdateImage={updateNoteImage}
                                onDelete={deleteNote}
                                onColorChange={setNoteColor}
                                placeholder={t.notePlace}
                            />
                        ))}
                    </div>
                </div>

                {/* RIGHT: TASK LIST */}
                <div className="w-1/2 flex flex-col bg-slate-900/30">
                    
                    {/* Add Task Input */}
                    <form onSubmit={handleTaskSubmit} className="p-4 border-b border-slate-800 bg-slate-900/50">
                        <div className="relative">
                            <input 
                                type="text"
                                value={newTaskText}
                                onChange={(e) => setNewTaskText(e.target.value)}
                                placeholder={t.taskPlace}
                                className="w-full bg-slate-800 text-slate-200 rounded-lg pl-4 pr-10 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600"
                            />
                            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-400 transition-colors">
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </form>

                    {/* List */}
                    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar pb-20">
                        {tasks.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 text-slate-400">
                                <CheckCircle2 className="w-12 h-12 mb-2" />
                                <span className="text-sm">{t.emptyTasks}</span>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {tasks.sort((a,b) => (Number(a.completed) - Number(b.completed)) || (b.timestamp - a.timestamp)).map(task => (
                                    <TaskItem 
                                        key={task.id}
                                        task={task}
                                        onToggle={toggleTask}
                                        onDelete={deleteTask}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* FOOTER CONTROLS */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3">
                
                {/* Status Badges */}
                {(isRecording || isAnalyzing) && (
                    <div className="flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in">
                        {isRecording && (
                            <div className="bg-red-950/80 text-red-400 px-3 py-1 rounded-full text-[10px] font-bold border border-red-500/50 shadow-lg flex items-center gap-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                {t.listening} {autoStopCountdown !== null && `(${autoStopCountdown})`}
                            </div>
                        )}
                        {isAnalyzing && (
                            <div className="bg-sky-950/80 text-sky-400 px-3 py-1 rounded-full text-[10px] font-bold border border-sky-500/50 shadow-lg flex items-center gap-2">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                {t.analyzing}
                            </div>
                        )}
                    </div>
                )}

                {/* Main Control Bar */}
                <div className="flex items-center p-1 bg-slate-800/90 backdrop-blur border border-slate-700 rounded-full shadow-2xl">
                    
                    {/* Mode Switcher */}
                    <div className="flex bg-slate-900 rounded-full p-1 mr-2">
                        <button
                            onClick={() => setDictationMode('note')}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${dictationMode === 'note' ? 'bg-yellow-200 text-yellow-900 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Note
                        </button>
                        <button
                            onClick={() => setDictationMode('task')}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${dictationMode === 'task' ? 'bg-indigo-200 text-indigo-900 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Task
                        </button>
                    </div>

                    {/* Mic Button */}
                    <Tooltip content={isFreeTier ? (tLoc.paidFeatureTooltip || "Paid Tier Only") : "Dictate"}>
                        <button
                            onClick={isFreeTier ? undefined : toggleDictation}
                            disabled={(isAnalyzing && !isRecording) || isFreeTier}
                            className={`
                                w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 shadow-lg border-2
                                ${isFreeTier 
                                    ? 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed opacity-70' 
                                    : isRecording 
                                        ? 'bg-red-500 border-red-400 text-white scale-110 shadow-red-500/40' 
                                        : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 hover:border-slate-500'
                                }
                            `}
                        >
                            {isFreeTier ? <Lock className="w-5 h-5" /> : isRecording ? (
                                <div className="w-4 h-4 bg-white rounded-sm animate-pulse" />
                            ) : (
                                <Mic className="w-6 h-6" />
                            )}
                        </button>
                    </Tooltip>
                </div>
            </div>

        </div>
    );
};