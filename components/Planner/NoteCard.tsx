
import React from 'react';
import { PlannerNote } from '../../types';
import { Trash2, Palette } from 'lucide-react';

interface NoteCardProps {
    note: PlannerNote;
    onUpdate: (id: string, content: string, title?: string) => void;
    onDelete: (id: string) => void;
    onColorChange: (id: string, color: PlannerNote['color']) => void;
    placeholder: string;
}

const COLORS = {
    yellow: 'bg-yellow-900/40 text-yellow-100 border-yellow-700/50 hover:border-yellow-600',
    blue: 'bg-blue-900/40 text-blue-100 border-blue-700/50 hover:border-blue-600',
    green: 'bg-emerald-900/40 text-emerald-100 border-emerald-700/50 hover:border-emerald-600',
    purple: 'bg-purple-900/40 text-purple-100 border-purple-700/50 hover:border-purple-600',
    red: 'bg-red-900/40 text-red-100 border-red-700/50 hover:border-red-600',
};

export const NoteCard: React.FC<NoteCardProps> = ({ note, onUpdate, onDelete, onColorChange, placeholder }) => {
    return (
        <div className={`
            relative p-3 rounded-xl shadow-lg border transition-all duration-300 flex flex-col gap-2 min-h-[160px] max-h-[250px]
            backdrop-blur-sm select-none
            ${COLORS[note.color]} hover:scale-[1.02] hover:shadow-xl hover:bg-opacity-50
        `}>
            {/* Header / Actions */}
            <div className="flex items-center justify-between opacity-60 hover:opacity-100 transition-opacity">
                <input 
                    type="text" 
                    value={note.title}
                    onChange={(e) => onUpdate(note.id, note.content, e.target.value)}
                    placeholder="TITLE"
                    className="bg-transparent border-none focus:outline-none text-xs font-bold uppercase tracking-wider w-full placeholder:text-white/20"
                />
                
                <div className="flex items-center gap-1 shrink-0">
                    <button 
                        onClick={() => {
                            const keys = Object.keys(COLORS) as PlannerNote['color'][];
                            const nextIdx = (keys.indexOf(note.color) + 1) % keys.length;
                            onColorChange(note.id, keys[nextIdx]);
                        }}
                        className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                        title="Change Color"
                    >
                        <Palette className="w-3 h-3" />
                    </button>
                    <button 
                        onClick={() => onDelete(note.id)}
                        className="p-1.5 rounded-full hover:bg-red-500/20 hover:text-red-300 transition-colors"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <textarea
                value={note.content}
                onChange={(e) => onUpdate(note.id, e.target.value)}
                placeholder={placeholder}
                className="w-full h-full bg-transparent resize-none border-none focus:outline-none text-sm leading-relaxed font-medium placeholder:text-white/20 custom-scrollbar select-text cursor-text"
                spellCheck={false}
            />
            
            <div className="text-[9px] opacity-40 font-mono text-right mt-auto">
                {new Date(note.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
        </div>
    );
};
