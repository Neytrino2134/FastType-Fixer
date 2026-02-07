
import React from 'react';
import { PlannerTask } from '../../types';
import { Trash2, Square, CheckSquare } from 'lucide-react';

interface TaskItemProps {
    task: PlannerTask;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onDelete }) => {
    return (
        <div className={`
            group flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 select-none
            ${task.completed 
                ? 'bg-slate-800/30 border-slate-800 text-slate-500' 
                : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:border-indigo-500/30'
            }
        `}>
            <button 
                onClick={() => onToggle(task.id)}
                className={`shrink-0 transition-colors ${task.completed ? 'text-emerald-500' : 'text-slate-400 hover:text-white'}`}
            >
                {task.completed ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
            </button>

            <span className={`flex-1 text-sm font-medium break-all ${task.completed ? 'line-through decoration-slate-600' : ''}`}>
                {task.text}
            </span>

            <button 
                onClick={() => onDelete(task.id)}
                className="shrink-0 p-1.5 rounded text-slate-600 hover:text-red-400 hover:bg-slate-700/50 opacity-0 group-hover:opacity-100 transition-all"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
};
