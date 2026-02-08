
import React, { useState, useCallback, useRef } from 'react';
import { PlannerNote } from '../../types';
import { Trash2, Palette, Copy, ClipboardPaste, ImageIcon, Maximize2, X } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';

interface NoteCardProps {
    note: PlannerNote;
    onUpdate: (id: string, content: string, title?: string) => void;
    onUpdateImage: (id: string, imageData: string) => void;
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

export const NoteCard: React.FC<NoteCardProps> = ({ note, onUpdate, onUpdateImage, onDelete, onColorChange, placeholder }) => {
    const { addNotification } = useNotification();
    const [isDragging, setIsDragging] = useState(false);
    const [showPreview, setShowPreview] = useState(false); // State for fullscreen preview
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // --- FILE HANDLING ---
    const handleFile = (file: File) => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                if (result) {
                    onUpdateImage(note.id, result);
                    addNotification("Image added to note", "success");
                }
            };
            reader.readAsDataURL(file);
        }
    };

    // --- DRAG AND DROP ---
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    // --- PASTE (ON TEXTAREA) ---
    const handlePaste = (e: React.ClipboardEvent) => {
        // If items has image, take precedence
        if (e.clipboardData.files && e.clipboardData.files.length > 0) {
            const file = e.clipboardData.files[0];
            if (file.type.startsWith('image/')) {
                e.preventDefault();
                handleFile(file);
                return;
            }
        }
        // Normal text paste is handled by textarea default behavior (or overwritten by button below)
    };

    // --- COPY TEXT ONLY ---
    const handleCopyText = async () => {
        if (!note.content) return;
        try {
            // 1. Try Electron Native Clipboard (More reliable)
            if (window.require) {
                const { clipboard } = window.require('electron');
                clipboard.writeText(note.content);
                addNotification("Note content copied", "success");
                return;
            }

            // 2. Web Fallback
            await navigator.clipboard.writeText(note.content);
            addNotification("Note content copied", "success");
        } catch (e) {
            console.error(e);
            addNotification("Failed to copy", "error");
        }
    };

    // --- COPY IMAGE ONLY ---
    const handleCopyImage = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent opening preview
        if (!note.imageData) return;
        try {
            // 1. Try Electron Native Clipboard (Reliable for Data URLs)
            if (window.require) {
                const { clipboard, nativeImage } = window.require('electron');
                const image = nativeImage.createFromDataURL(note.imageData);
                clipboard.writeImage(image);
                addNotification("Image copied", "success");
                return;
            }

            // 2. Web Fallback
            const res = await fetch(note.imageData);
            const blob = await res.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);
            addNotification("Image copied", "success");
        } catch (e) {
            console.error(e);
            addNotification("Failed to copy image", "error");
        }
    };

    // --- REPLACE PASTE ACTION ---
    const triggerReplacePaste = async () => {
        try {
            // 1. Try Electron Native Clipboard (Bypasses permission prompts)
            if (window.require) {
                const { clipboard, nativeImage } = window.require('electron');
                
                // Check for image first
                const image = clipboard.readImage();
                if (image && !image.isEmpty()) {
                    const dataUrl = image.toDataURL();
                    onUpdateImage(note.id, dataUrl);
                    addNotification("Image pasted from clipboard", "success");
                    return;
                }

                // Fallback to text
                const text = clipboard.readText();
                if (text) {
                    onUpdate(note.id, text);
                    addNotification("Content replaced", "success");
                    return;
                }
            }

            // 2. Web Fallback
            const items = await navigator.clipboard.read();
            for (const item of items) {
                if (item.types.some(type => type.startsWith('image/'))) {
                    const blob = await item.getType(item.types.find(type => type.startsWith('image/'))!);
                    const file = new File([blob], "pasted.png", { type: blob.type });
                    handleFile(file);
                    return;
                }
            }
            // Fallback to text: REPLACE MODE
            const text = await navigator.clipboard.readText();
            if (text) {
                onUpdate(note.id, text); // COMPLETELY REPLACE CONTENT
                addNotification("Content replaced", "success");
            }
        } catch (e) {
            textareaRef.current?.focus();
            addNotification("Press Ctrl+V to paste", "info");
        }
    };

    return (
        <>
            {/* FULLSCREEN IMAGE PREVIEW */}
            {showPreview && note.imageData && (
                <div 
                    className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-200"
                    onClick={() => setShowPreview(false)}
                >
                    <button 
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                        onClick={() => setShowPreview(false)}
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <img 
                        src={note.imageData} 
                        alt="Full Preview" 
                        className="max-w-full max-h-full object-contain shadow-2xl rounded-md"
                        onClick={(e) => e.stopPropagation()} // Prevent close on image click
                    />
                </div>
            )}

            <div 
                className={`
                    relative p-3 rounded-xl shadow-lg border transition-all duration-300 flex flex-col gap-2 
                    backdrop-blur-sm select-none group
                    ${note.imageData ? 'min-h-[280px]' : 'min-h-[180px]'}
                    ${COLORS[note.color]} 
                    ${isDragging ? 'border-dashed border-white scale-105 bg-opacity-70 z-10' : 'hover:scale-[1.02] hover:shadow-xl hover:bg-opacity-50'}
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* Drag Overlay Indicator */}
                {isDragging && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 rounded-xl">
                        <ImageIcon className="w-12 h-12 text-white animate-bounce" />
                    </div>
                )}

                {/* Header / Actions */}
                <div className="flex items-center justify-between opacity-60 hover:opacity-100 transition-opacity">
                    <input 
                        type="text" 
                        value={note.title}
                        onChange={(e) => onUpdate(note.id, note.content, e.target.value)}
                        placeholder={note.imageData ? "CAPTION / TITLE" : "TITLE"}
                        className="bg-transparent border-none focus:outline-none text-xs font-bold uppercase tracking-wider w-full placeholder:text-white/30 text-white/90"
                    />
                    
                    <div className="flex items-center gap-1 shrink-0">
                        <button 
                            onClick={handleCopyText}
                            className="p-1.5 rounded-full hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                            title="Copy Content (Text)"
                        >
                            <Copy className="w-3 h-3" />
                        </button>
                        <button 
                            onClick={triggerReplacePaste}
                            className="p-1.5 rounded-full hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                            title="Paste & Replace"
                        >
                            <ClipboardPaste className="w-3 h-3" />
                        </button>
                        
                        <div className="w-px h-3 bg-white/20 mx-1"></div>

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

                {/* Image Display - FITTED & CENTERED */}
                {note.imageData && (
                    <div 
                        className="relative w-full h-40 shrink-0 rounded-lg overflow-hidden bg-black/40 border border-white/10 group-hover:border-white/20 transition-colors flex items-center justify-center cursor-zoom-in"
                        onClick={() => setShowPreview(true)}
                        title="Click to expand"
                    >
                        <img 
                            src={note.imageData} 
                            alt="Note Attachment" 
                            className="max-w-full max-h-full object-contain"
                        />
                        
                        {/* Image Actions Overlay */}
                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                             <button 
                                onClick={handleCopyImage}
                                className="p-1.5 bg-black/60 text-white rounded-full hover:bg-indigo-600 backdrop-blur-sm"
                                title="Copy Image"
                            >
                                <Copy className="w-3 h-3" />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onUpdateImage(note.id, ''); }}
                                className="p-1.5 bg-black/60 text-white rounded-full hover:bg-red-600 backdrop-blur-sm"
                                title="Remove Image"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Content Textarea */}
                <textarea
                    ref={textareaRef}
                    value={note.content}
                    onChange={(e) => onUpdate(note.id, e.target.value)}
                    onPaste={handlePaste}
                    placeholder={note.imageData ? "Add a description..." : placeholder}
                    className={`w-full bg-transparent resize-none border-none focus:outline-none leading-relaxed font-medium placeholder:text-white/20 custom-scrollbar select-text cursor-text ${note.imageData ? 'h-auto text-xs min-h-[40px] mt-1' : 'h-full text-sm'}`}
                    spellCheck={false}
                />
                
                <div className="text-[9px] opacity-40 font-mono text-right mt-auto pt-1">
                    {new Date(note.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
            </div>
        </>
    );
};
