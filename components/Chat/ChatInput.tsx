import React, { useState, useRef, useCallback } from 'react';
import { Send, Mic, Square, Paperclip, X, Image as ImageIcon, FileText } from 'lucide-react';
import { Attachment } from '../../types';

interface ChatInputProps {
  onSend: (text: string, attachment?: Attachment) => void;
  onRecordToggle: () => void;
  isRecording: boolean;
  isLoading: boolean;
  placeholder: string;
  value: string; // Controlled value
  onChange: (text: string) => void; // Controlled change handler
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
    onSend, 
    onRecordToggle, 
    isRecording, 
    isLoading,
    placeholder,
    value,
    onChange
}) => {
  const [attachment, setAttachment] = useState<Attachment | undefined>(undefined);
  const [isDragging, setIsDragging] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
      if ((!value.trim() && !attachment) || isLoading) return;
      onSend(value, attachment);
      setAttachment(undefined);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSubmit();
      }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      // Auto-resize
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  // --- File Handling Helpers ---

  const processFile = useCallback((file: File) => {
    // If text file, read content and append to text input
    if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.js') || file.name.endsWith('.ts')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            onChange(value + (value ? '\n' : '') + content);
            if (textareaRef.current) {
                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.style.height = 'auto';
                        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
                    }
                }, 10);
            }
        };
        reader.readAsText(file);
        return;
    }

    // If image, create attachment
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Raw = e.target?.result as string;
            // Remove data:image/xxx;base64, prefix
            const base64Data = base64Raw.split(',')[1];
            
            setAttachment({
                type: 'image',
                mimeType: file.type,
                data: base64Data,
                name: file.name
            });
        };
        reader.readAsDataURL(file);
        return;
    }
  }, [value, onChange]);

  // --- Handlers ---

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        processFile(e.target.files[0]);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
        e.preventDefault();
        processFile(e.clipboardData.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFile(e.dataTransfer.files[0]);
    }
  };

  const removeAttachment = () => {
    setAttachment(undefined);
  };

  return (
    <div className="p-3 md:p-4 bg-slate-900 border-t border-slate-800 shrink-0 relative safe-area-bottom">
      
      {/* Drag Overlay */}
      {isDragging && (
          <div className="absolute inset-0 z-50 bg-indigo-900/90 border-2 border-dashed border-indigo-400 m-2 rounded-xl flex flex-col items-center justify-center text-indigo-200 animate-in fade-in duration-200 pointer-events-none">
              <FileText className="w-10 h-10 mb-2" />
              <p className="font-semibold">Drop file to attach</p>
          </div>
      )}

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        accept="image/*,.txt,.md,.json,.js,.ts" 
        className="hidden" 
      />

      <div 
        className={`relative bg-slate-950 p-2 rounded-xl border transition-all ${isDragging ? 'border-indigo-500' : 'border-slate-800 focus-within:border-indigo-500/50'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        
        {/* Attachment Preview */}
        {attachment && (
            <div className="flex items-center gap-3 p-2 mb-2 bg-slate-900 rounded-lg border border-slate-800 animate-in slide-in-from-bottom-2">
                <div className="w-10 h-10 rounded overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
                    <img 
                        src={`data:${attachment.mimeType};base64,${attachment.data}`} 
                        alt="preview" 
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{attachment.name || 'Image'}</p>
                    <p className="text-[10px] text-slate-500 uppercase">{attachment.mimeType.split('/')[1]}</p>
                </div>
                <button 
                    onClick={removeAttachment}
                    className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-red-400 transition-colors touch-manipulation"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        )}

        <div className="flex items-end gap-2">
            {/* Attach Button */}
            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isRecording}
                className="shrink-0 p-2.5 md:p-2 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-slate-900 transition-colors touch-manipulation"
                title="Attach image or text file"
            >
                <Paperclip className="w-5 h-5" />
            </button>

            {/* Text Input */}
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={placeholder}
                rows={1}
                disabled={isRecording}
                className="w-full bg-transparent border-none focus:ring-0 resize-none text-slate-200 placeholder:text-slate-600 max-h-[120px] py-2.5 px-0 custom-scrollbar disabled:opacity-50 text-base md:text-sm"
            />

            {/* Recording Indicator (INSIDE THE BOX) */}
            {isRecording && (
                <div className="flex items-center gap-2 mb-2.5 mr-1 text-red-400 animate-pulse select-none shrink-0 bg-red-950/30 px-2 py-1 rounded-full border border-red-900/50">
                    <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                    <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block">Recording</span>
                </div>
            )}

            {/* Mic Button */}
            <button
                onClick={onRecordToggle}
                className={`shrink-0 p-2.5 md:p-2 rounded-lg transition-all touch-manipulation ${
                    isRecording 
                        ? 'bg-red-500/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                        : 'text-slate-500 hover:text-indigo-400 hover:bg-slate-900'
                }`}
            >
                {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Send Button */}
            <button
                onClick={handleSubmit}
                disabled={(!value.trim() && !attachment) || isLoading}
                className={`shrink-0 p-2.5 md:p-2 rounded-lg transition-all touch-manipulation ${
                    (value.trim() || attachment) && !isLoading
                        ? 'bg-indigo-600 text-white shadow-lg' 
                        : 'bg-slate-900 text-slate-600 cursor-not-allowed'
                }`}
            >
                <Send className="w-4 h-4" />
            </button>
        </div>
      </div>
    </div>
  );
};