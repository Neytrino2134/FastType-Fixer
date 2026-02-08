
import React, { useEffect, useRef } from 'react';
import { Wand2, Copy, X, Scissors, ClipboardPaste, Keyboard, Replace } from 'lucide-react';

interface ContextMenuProps {
    x: number;
    y: number;
    suggestions: string[];
    onSelect: (word: string) => void;
    onClose: () => void;
    originalWord: string;
    onCopy: () => void;
    onCut: () => void;
    onPaste: () => void;
    onSwitchLayout: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ 
    x, y, 
    suggestions, 
    onSelect, 
    onClose, 
    originalWord,
    onCopy,
    onCut,
    onPaste,
    onSwitchLayout
}) => {
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    // Adjust position to keep in viewport
    const style: React.CSSProperties = {
        top: y,
        left: x,
    };

    return (
        <div 
            ref={menuRef}
            className="fixed z-[9999] min-w-[180px] bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col"
            style={style}
        >
            <div className="px-3 py-2 border-b border-slate-700/50 bg-slate-950/30 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate max-w-[120px]">
                    {originalWord || "Actions"}
                </span>
                <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                    <X className="w-3 h-3" />
                </button>
            </div>

            {/* Suggestions Section - Only show if word exists */}
            {originalWord && (
                <>
                    <div className="p-1">
                        {suggestions.length > 0 ? (
                            suggestions.map((word) => (
                                <button
                                    key={word}
                                    onClick={() => onSelect(word)}
                                    className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-indigo-600 hover:text-white rounded-md transition-colors flex items-center gap-2 group"
                                >
                                    <Wand2 className="w-3 h-3 text-indigo-400 group-hover:text-white" />
                                    {word}
                                </button>
                            ))
                        ) : (
                            <div className="px-3 py-2 text-xs text-slate-500 italic text-center opacity-60">
                                No suggestions
                            </div>
                        )}
                    </div>
                    {/* Actions Divider */}
                    <div className="h-px bg-slate-700/50 my-0.5 mx-1"></div>
                </>
            )}

            {/* Standard Actions Section */}
            <div className="p-1 space-y-0.5">
                 <button
                    onClick={onCut}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-md transition-colors flex items-center gap-2"
                >
                    <Scissors className="w-3.5 h-3.5 opacity-70" />
                    Cut
                </button>
                <button
                    onClick={onCopy}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-md transition-colors flex items-center gap-2"
                >
                    <Copy className="w-3.5 h-3.5 opacity-70" />
                    Copy
                </button>
                <button
                    onClick={onPaste}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-md transition-colors flex items-center gap-2"
                >
                    <Replace className="w-3.5 h-3.5 opacity-70" />
                    Clear & Paste
                </button>
                <button
                    onClick={onSwitchLayout}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-md transition-colors flex items-center gap-2"
                >
                    <Keyboard className="w-3.5 h-3.5 opacity-70" />
                    Switch Layout
                </button>
            </div>
        </div>
    );
};
