
import React, { useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Lock, CheckCheck, Undo2, Redo2, Square, Mic, Wand2, Loader2, Clock, Upload, Send, FileAudio, X, TestTube, Image as ImageIcon, File, ClipboardList } from 'lucide-react';
import { getTranslation } from '../../utils/i18n';
import { Language, ProcessingStatus } from '../../types';
import { Tooltip } from '../Tooltip';

interface EditorToolbarProps {
  textLength: number;
  committedLength: number;
  processedLength: number;
  status: ProcessingStatus;
  language: Language;
  isBusy: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onRecord: () => void;
  onEnhance: () => void;
  onFileUpload: (file: File) => void;
  autoStopCountdown?: number | null;
  onHistoryClick: () => void;
  isHistoryOpen: boolean;
  developerMode?: boolean;
  onDevRecord?: () => void;
  isDevRecording?: boolean;
  showClipboard: boolean;
  onToggleClipboard: () => void;
}

export interface EditorToolbarHandle {
    setFile: (file: File) => void;
}

export const EditorToolbar = forwardRef<EditorToolbarHandle, EditorToolbarProps>(({
  textLength,
  committedLength,
  processedLength,
  status,
  language,
  isBusy,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onRecord,
  onEnhance,
  onFileUpload,
  autoStopCountdown,
  onHistoryClick,
  isHistoryOpen,
  developerMode = false,
  onDevRecord,
  isDevRecording = false,
  showClipboard,
  onToggleClipboard
}, ref) => {
  const t = getTranslation(language);
  
  // Explicit State Definitions
  const isRecording = status === 'recording';
  const isAnalyzing = status === 'transcribing'; // This is the specific "Wait" state
  const isEnhancing = status === 'enhancing';

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Expose setFile to parent via ref
  useImperativeHandle(ref, () => ({
      setFile: (file: File) => {
          setSelectedFile(file);
      }
  }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setSelectedFile(e.target.files[0]);
    }
  };

  const handleSendFile = () => {
    if (selectedFile) {
        onFileUpload(selectedFile);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Helper to determine Main Button Appearance
  const getMainButtonConfig = () => {
      // PRIORITY 1: ANALYZING STATE
      // Must come first to override recording state during the transition period
      if (isAnalyzing) {
          return {
              text: language === 'ru' ? 'Анализ...' : 'Analyzing...',
              icon: <Loader2 className="w-5 h-5 md:w-4 md:h-4 animate-spin" />,
              className: 'bg-sky-500/20 text-sky-400 border-sky-500/50 cursor-wait',
              disabled: true,
              tooltip: t.statusTranscribing || "Processing Audio..."
          };
      } 
      // PRIORITY 2: RECORDING STATE
      else if (isRecording && !isDevRecording) {
          return {
              text: t.btnStop,
              icon: <Square className="w-5 h-5 md:w-4 md:h-4 fill-current animate-pulse" />,
              className: 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30',
              disabled: false,
              tooltip: t.btnStop
          };
      } 
      // PRIORITY 3: IDLE STATE
      else {
          return {
              text: t.btnRecord,
              icon: <Mic className="w-5 h-5 md:w-4 md:h-4" />,
              className: isDevRecording 
                ? 'opacity-50 cursor-not-allowed bg-slate-800 border-slate-700' 
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700',
              disabled: isDevRecording, // Disable standard mic if Dev Mic is active
              tooltip: t.btnRecord
          };
      }
  };

  const mainBtn = getMainButtonConfig();

  return (
    <div className="absolute bottom-0 md:bottom-6 left-0 md:left-auto md:right-6 w-full md:w-auto flex md:inline-flex items-center justify-between md:justify-start gap-3 md:gap-4 z-30 pointer-events-auto select-none bg-slate-900/90 md:bg-transparent backdrop-blur-lg md:backdrop-blur-none border-t md:border-none border-slate-800 p-3 md:p-0 safe-area-bottom">
      
      {/* LEFT GROUP ON MOBILE (Stats) */}
      <div className="flex items-center gap-3">
          {/* Status Indicators (Hidden on small mobile) */}
          <div className="hidden sm:flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-950/30 rounded border border-emerald-900/50">
                  <Lock className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] text-emerald-400 font-mono">
                      {Math.round((committedLength / (textLength || 1)) * 100)}%
                  </span>
              </div>
              
              {processedLength > committedLength && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-sky-950/30 rounded border border-sky-900/50 animate-in fade-in zoom-in duration-300">
                      <CheckCheck className="w-3 h-3 text-sky-400" />
                      <span className="text-[10px] text-sky-400 font-mono">
                          {processedLength - committedLength}
                      </span>
                  </div>
              )}
          </div>

          <span className="text-xs text-slate-600 font-mono md:hidden">
            {textLength} {t.chars}
          </span>
      </div>

      <div className="hidden md:block text-xs text-slate-600 font-mono">
        {textLength} {t.chars}
      </div>

      {/* RIGHT GROUP (Controls) */}
      <div className="flex items-center gap-3">
        {/* HISTORY / UNDO / REDO CONTROLS */}
        <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700 shadow-lg">
            <Tooltip content={t.btnUndo} side="top">
                <button
                    onClick={onUndo}
                    disabled={!canUndo || isBusy}
                    className="p-2 md:p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors touch-manipulation"
                >
                    <Undo2 className="w-5 h-5 md:w-4 md:h-4" />
                </button>
            </Tooltip>
            
            <div className="w-px h-5 md:h-4 bg-slate-700 mx-1" />
            
            <Tooltip content={t.btnRedo} side="top">
                <button
                    onClick={onRedo}
                    disabled={!canRedo || isBusy}
                    className="p-2 md:p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors touch-manipulation"
                >
                    <Redo2 className="w-5 h-5 md:w-4 md:h-4" />
                </button>
            </Tooltip>

            <div className="w-px h-5 md:h-4 bg-slate-700 mx-1" />

            <Tooltip content={t.historyTitle} side="top">
                <button
                    onClick={onHistoryClick}
                    className={`p-2 md:p-1.5 rounded transition-colors touch-manipulation ${isHistoryOpen ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                >
                    <Clock className="w-5 h-5 md:w-4 md:h-4" />
                </button>
            </Tooltip>
        </div>

        {/* CLIPBOARD GROUP */}
        <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700 shadow-lg">
            <Tooltip content={t.clipboardTitle} side="top">
                <button
                    onClick={onToggleClipboard}
                    className={`p-2 md:p-1.5 rounded transition-colors touch-manipulation ${showClipboard ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                >
                    <ClipboardList className="w-5 h-5 md:w-4 md:h-4" />
                </button>
            </Tooltip>
        </div>
        
        {/* DEV RECORDING BUTTON (Conditional) */}
        {developerMode && onDevRecord && (
            <Tooltip content={t.btnDevRecord || "Dictate (DEV)"} side="top">
                <button
                    onClick={onDevRecord}
                    className={`flex items-center justify-center p-2.5 md:p-2 rounded-lg text-sm font-medium shadow-lg transition-all active:scale-95 group border touch-manipulation ${
                        isDevRecording 
                        ? 'bg-fuchsia-900/50 text-fuchsia-400 border-fuchsia-500/50 hover:bg-fuchsia-900/70 animate-pulse' 
                        : 'bg-slate-800 text-fuchsia-500 border-slate-700 hover:bg-slate-700'
                    }`}
                >
                    {isDevRecording ? <Square className="w-5 h-5 md:w-4 md:h-4 fill-current" /> : <TestTube className="w-5 h-5 md:w-4 md:h-4" />}
                </button>
            </Tooltip>
        )}

        {/* MAIN RECORD BUTTON */}
        <Tooltip content={mainBtn.tooltip} side="top">
            <button
                onClick={onRecord}
                disabled={mainBtn.disabled}
                className={`flex items-center justify-center gap-2 px-4 md:px-4 py-2.5 md:py-2 rounded-lg text-sm font-medium shadow-lg transition-all active:scale-95 group border touch-manipulation ${mainBtn.className}`}
            >
                <div className="flex items-center gap-2">
                    {mainBtn.icon}
                    <span className="hidden sm:inline font-semibold">{mainBtn.text}</span>
                </div>
                
                {/* Countdown (Only visible when actively recording) */}
                {isRecording && !isDevRecording && !isAnalyzing && (
                    <>
                        <div className="mx-2 h-4 w-px bg-red-400/40"></div>
                        <div className="w-4 flex justify-center text-xs font-mono font-bold tabular-nums">
                            {typeof autoStopCountdown === 'number' ? autoStopCountdown : ''}
                        </div>
                    </>
                )}
            </button>
        </Tooltip>

        {/* File Upload Group (Audio / Image) */}
        <div className="flex items-center gap-1">
             <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="audio/*,image/*" 
                onChange={handleFileChange}
             />
             
             {!selectedFile ? (
                <Tooltip content={t.uploadMedia || "Upload Audio/Image"} side="top">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isBusy}
                        className="p-2.5 md:p-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                        <Upload className="w-5 h-5 md:w-4 md:h-4" />
                    </button>
                </Tooltip>
             ) : (
                <div className="flex items-center gap-1 bg-slate-800 rounded-lg border border-slate-700 p-1 pr-2 animate-in fade-in slide-in-from-bottom-2">
                    <button onClick={clearFile} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400">
                        <X className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-slate-300 max-w-[80px] truncate flex items-center gap-1">
                        {selectedFile.type.startsWith('image/') ? <ImageIcon className="w-3 h-3 shrink-0" /> : <FileAudio className="w-3 h-3 shrink-0" />}
                        {selectedFile.name}
                    </span>
                    <button 
                        onClick={handleSendFile}
                        className="ml-1 p-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded shadow-sm"
                        title={language === 'ru' ? "Отправить" : "Process"}
                    >
                        <Send className="w-3.5 h-3.5" />
                    </button>
                </div>
             )}
        </div>

        <Tooltip content={t.btnEnhance} side="top">
            <button
            onClick={onEnhance}
            disabled={isBusy || isEnhancing}
            className={`flex items-center gap-2 px-4 md:px-4 py-2.5 md:py-2 rounded-lg text-sm font-medium shadow-lg transition-all active:scale-95 group touch-manipulation
                ${isEnhancing 
                    ? 'bg-indigo-600 text-white cursor-wait opacity-80 border border-indigo-500 shadow-indigo-900/50' 
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-purple-600 hover:text-white hover:border-purple-500 hover:shadow-purple-900/30'
                }
            `}
            >
            {isEnhancing ? (
                <Loader2 className="w-5 h-5 md:w-4 md:h-4 animate-spin" />
            ) : (
                <Wand2 className="w-5 h-5 md:w-4 md:h-4 group-hover:rotate-12 transition-transform" />
            )}
            <span className="hidden sm:inline">{t.btnEnhance}</span>
            </button>
        </Tooltip>
      </div>
    </div>
  );
});
