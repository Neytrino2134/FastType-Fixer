
import React, { useMemo, useState } from 'react';
import { getTranslation } from '../../utils/i18n';
import { Language, ProcessingStatus, VisualizerStatus } from '../../types';
import { splitIntoBlocks, normalizeBlock } from '../../utils/textStructure';
import { Mic, Sparkles, Pause, Play, FileInput } from 'lucide-react';
import { VisualizerCanvas } from './VisualizerCanvas';
import { ProcessingOverlay } from '../../hooks/useTextProcessor';

interface EditorSurfaceProps {
  text: string;
  committedLength: number;
  correctedLength: number;
  checkedLength: number;
  checkingLength: number; // NEW
  finalizedSentences: Set<string>;
  aiFixedSegments: Set<string>; 
  dictatedSegments: Set<string>;
  unknownSegments: Set<string>; // NEW
  status: ProcessingStatus;
  visualizerStatus: VisualizerStatus;
  isAnalyzing: boolean;
  isRecording: boolean;
  language: Language;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  backdropRef: React.RefObject<HTMLDivElement>;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onScroll: (e: React.UIEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onClipboard: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void; // Added onPaste
  visualizerDataRef: React.MutableRefObject<Uint8Array | null>;
  onInteraction: () => void;
  isPaused: boolean;
  showResumeAnimation: boolean;
  // New Settings Props
  lowCut?: number;
  highCut?: number;
  amp?: number;
  visualizerStyle?: 'classic' | 'bars' | 'circular' | 'wave';
  silenceThreshold: number;
  visualizerNorm?: boolean;
  visualizerGravity?: number;
  visualizerMirror?: boolean;
  onDropFile?: (file: File) => void; // Handler for Drag Drop
  processingOverlay?: ProcessingOverlay | null; // NEW: Track active AI operation
}

export const EditorSurface: React.FC<EditorSurfaceProps> = ({
  text,
  committedLength,
  correctedLength,
  checkedLength,
  checkingLength,
  finalizedSentences,
  aiFixedSegments,
  dictatedSegments,
  unknownSegments,
  status,
  visualizerStatus,
  isAnalyzing,
  isRecording,
  language,
  textareaRef,
  backdropRef,
  onChange,
  onScroll,
  onKeyDown,
  onClipboard,
  onPaste,
  visualizerDataRef,
  onInteraction,
  isPaused,
  showResumeAnimation,
  lowCut = 0,
  highCut = 128,
  amp = 0.4,
  visualizerStyle = 'classic',
  silenceThreshold,
  visualizerNorm = false,
  visualizerGravity = 2.0,
  visualizerMirror = false,
  onDropFile,
  processingOverlay
}) => {
  const t = getTranslation(language);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Ensure we only leave when leaving the container itself
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const file = e.dataTransfer.files[0];
          if (onDropFile) {
              onDropFile(file);
          }
      }
  };

  // Helper to strictly clean a word for unknown list check
  // UPDATED: Sync regex with worker to include Uzbek/Cyrillic extended chars
  const cleanWordForCheck = (w: string) => w.toLowerCase().replace(/[^a-zA-Zа-яА-ЯёЁ0-9'‘`ʻғқҳўҒҚҲЎ]/g, '').trim();

  const renderedContent = useMemo(() => {
    const blocks = splitIntoBlocks(text);
    const safeCommitted = Math.min(committedLength, text.length);
    const safeCorrected = Math.min(Math.max(safeCommitted, correctedLength), text.length);
    const safeChecked = Math.min(Math.max(safeCorrected, checkedLength), text.length);
    const safeChecking = Math.min(Math.max(safeChecked, checkingLength), text.length);

    // STRICT VISUAL SYNC: Only show blinking if status confirms active processing
    const isProcessingActive = status === 'ai_fixing' || status === 'ai_finalizing' || status === 'enhancing';
    const activeOverlay = isProcessingActive ? processingOverlay : null;

    return blocks.map((block, index) => {
        const normalized = normalizeBlock(block.text);

        // Detect if this block is currently being edited (cursor is inside it)
        // If the committed point is strictly between start and end, it means we are editing this block
        // (because committedLength usually tracks the cursor position during edits).
        const isActiveEditBlock = block.start < safeCommitted && block.end > safeCommitted;

        // PRIORITY: If currently processed by AI, pulse the text brightness
        // This overrides standard coloring logic for the duration of the API call.
        // Uses INTERSECTION logic: If the block overlaps with the overlay, animate it.
        if (activeOverlay) {
             const overlapStart = Math.max(block.start, activeOverlay.start);
             const overlapEnd = Math.min(block.end, activeOverlay.end);
             
             if (overlapEnd > overlapStart) {
                 if (activeOverlay.type === 'fixing') {
                     // Pulsing Purple (Fixing)
                     return <span key={index} className="text-fuchsia-300 animate-pulse brightness-150 transition-all duration-300">{block.text}</span>;
                 }
                 if (activeOverlay.type === 'finalizing') {
                     // Pulsing Green (Finalizing)
                     return <span key={index} className="text-emerald-300 animate-pulse brightness-150 transition-all duration-300">{block.text}</span>;
                 }
             }
        }

        // Logic Change: If we are actively editing a block, do NOT apply the Finalized (Green) or Dictated (Orange) status.
        // This effectively turns the whole block white/raw, even if it was previously green.
        if (!isActiveEditBlock) {
            if (finalizedSentences.has(normalized)) {
                return <span key={index} className="text-emerald-500 transition-colors duration-500">{block.text}</span>;
            }
            if (dictatedSegments.has(normalized)) {
                return <span key={index} className="text-orange-400 transition-colors duration-500">{block.text}</span>;
            }
        }

        const renderSubSegment = (subText: string, subStart: number) => {
            const subEnd = subStart + subText.length;
            
            // Re-check processing overlay for partial chunks (rare but possible)
            if (activeOverlay) {
                 const overlapStart = Math.max(subStart, activeOverlay.start);
                 const overlapEnd = Math.min(subEnd, activeOverlay.end);
                 
                 if (overlapEnd > overlapStart) {
                     if (activeOverlay.type === 'fixing') {
                         return <span key={subStart} className="text-fuchsia-300 animate-pulse brightness-150 transition-all duration-300">{subText}</span>;
                     }
                     if (activeOverlay.type === 'finalizing') {
                         return <span key={subStart} className="text-emerald-300 animate-pulse brightness-150 transition-all duration-300">{subText}</span>;
                     }
                 }
            }

            // Logic to determine style based on range
            if (subEnd <= safeCommitted) {
                // IMPORTANT: If we are actively editing this block, treat it as raw/dirty.
                // Do not color it green even if parts of it are before the cursor.
                if (!isActiveEditBlock) {
                    return <span key={subStart} className="text-emerald-500 transition-colors duration-500">{subText}</span>;
                }
            }

            // If processing is paused, we skip verification coloring (Blue/Red/Yellow).
            // Default raw (Grey) is returned.
            // Note: Green (Committed) and Orange (Dictated) are handled above this check.
            if (isPaused) {
                return <span key={subStart} className="text-slate-200 transition-colors duration-200">{subText}</span>;
            }

            if (subEnd <= safeCorrected) {
                if (aiFixedSegments.has(normalized)) {
                    return <span key={subStart} className="text-violet-400 font-medium transition-colors duration-300">{subText}</span>;
                }
                // AI Processed but not fixed specifically? (Blue)
                return <span key={subStart} className="text-sky-400 transition-colors duration-300">{subText}</span>;
            }
            
            // CHECKED ZONE (Between Corrected and Checked)
            // This is where we apply word-level red/blue logic
            if (subStart >= safeCorrected && subEnd <= safeChecked) {
                 // Split into words to check against unknownSegments
                 // Using updated regex to split by more separators including hyphens/slashes to match worker logic better
                 // Splitting by: space, punctuation, brackets, quotes, dashes, slashes
                 const parts = subText.split(/([^\s.,!?;:()""''«»—\-\/_+]+)/);
                 return (
                    <span key={subStart}>
                        {parts.map((part, i) => {
                            if (!part) return null;
                            
                            // 1. Is it a word?
                            // We allow Uzbek chars in the word test
                            const isWord = /[a-zA-Zа-яА-ЯёЁ'‘`ʻғқҳўҒҚҲЎ0-9]/.test(part);
                            
                            if (isWord) {
                                // Strictly clean to match how worker stores unknowns
                                const clean = cleanWordForCheck(part);
                                
                                // RULE: Ignore short words (< 4 chars) to match Worker logic
                                // If short, always valid (Blue). If long, check Dict (Red/Blue).
                                if (clean.length <= 3) {
                                    return <span key={i} className="text-sky-400 transition-colors duration-200">{part}</span>;
                                }

                                const isUnknown = unknownSegments.has(clean);
                                return (
                                    <span key={i} className={isUnknown ? "text-red-400 font-medium transition-colors duration-200" : "text-sky-400 transition-colors duration-200"}>
                                        {part}
                                    </span>
                                );
                            }
                            // Separators/Punctuation match the "valid" color usually
                            return <span key={i} className="text-sky-400 transition-colors duration-200">{part}</span>;
                        })}
                    </span>
                 );
            }

            if (subEnd <= safeChecking) {
                return <span key={subStart} className="text-yellow-400 font-medium transition-colors duration-300">{subText}</span>;
            }

            // Default (Raw Input)
            return <span key={subStart} className="text-slate-200 transition-colors duration-200">{subText}</span>;
        };
        
        // If block spans across boundaries, we must split it physically for the logic above to work cleanly
        
        const boundaries = [safeCommitted, safeCorrected, safeChecked, safeChecking].filter(p => p > block.start && p < block.end);
        
        if (boundaries.length === 0) {
            // Whole block fits in one zone
            return renderSubSegment(block.text, block.start);
        }

        const parts = [];
        let curr = block.start;
        const sortedBounds = [...new Set(boundaries)].sort((a,b) => a-b);
        
        for (const b of sortedBounds) {
            const chunk = text.slice(curr, b);
            parts.push(renderSubSegment(chunk, curr));
            curr = b;
        }
        if (curr < block.end) {
             const chunk = text.slice(curr, block.end);
             parts.push(renderSubSegment(chunk, curr));
        }

        return <React.Fragment key={index}>{parts}</React.Fragment>;
    });
  }, [text, committedLength, correctedLength, checkedLength, checkingLength, finalizedSentences, aiFixedSegments, dictatedSegments, unknownSegments, processingOverlay, isPaused, status]);

  return (
    <div 
        className="relative flex-1 w-full overflow-hidden"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
      
      {/* DRAG OVERLAY */}
      {isDragging && (
          <div className="absolute inset-4 z-50 rounded-3xl border-4 border-dashed border-indigo-500/50 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-200 pointer-events-none">
              <div className="p-6 rounded-full bg-indigo-500/20 mb-4 animate-bounce">
                  <FileInput className="w-12 h-12 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{t.dropHere || "Drop file here"}</h3>
              <p className="text-slate-400 text-sm">{t.dropHint || "Audio or Image"}</p>
          </div>
      )}

      {/* OPTIMIZED VISUALIZER COMPONENT */}
      <VisualizerCanvas 
        visualizerDataRef={visualizerDataRef}
        isRecording={isRecording}
        lowCut={lowCut}
        highCut={highCut}
        amp={amp}
        visualizerStyle={visualizerStyle}
        silenceThreshold={silenceThreshold}
        norm={visualizerNorm}
        gravity={visualizerGravity}
        mirror={visualizerMirror}
      />

      <div className={`absolute inset-0 flex items-center justify-center z-0 pointer-events-none transition-[opacity,transform] duration-500 ease-in-out ${isPaused ? 'opacity-100 scale-100' : 'opacity-0 scale-110 scale-95'}`}>
         <div className="flex flex-col items-center text-slate-700/20 select-none">
             <Pause className="w-32 h-32 md:w-48 md:h-48 fill-current" />
             <span className="text-2xl md:text-4xl font-black tracking-[0.5em] uppercase mt-4">{t.statusPaused}</span>
         </div>
      </div>

      <div className={`absolute inset-0 flex items-center justify-center z-20 pointer-events-none transition-[opacity,transform] duration-500 ease-in-out ${showResumeAnimation ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`}>
         <div className="flex flex-col items-center justify-center p-12 bg-slate-900/40 backdrop-blur-sm rounded-3xl shadow-2xl border border-emerald-500/20">
             <Play className="w-24 h-24 text-emerald-400 fill-current animate-pulse" />
         </div>
      </div>

      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex flex-col-reverse items-center gap-3 pointer-events-none">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-lg backdrop-blur-md transition-all duration-500 ease-out transform ${isRecording ? 'opacity-100 translate-y-0 scale-100 bg-orange-950/80 border-orange-500/50 text-orange-200 shadow-orange-500/20' : 'opacity-0 translate-y-8 scale-90'}`}>
              <Mic className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-bold tracking-wider">{t.visListening || "LISTENING"}</span>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-lg backdrop-blur-md transition-all duration-500 ease-out transform ${isAnalyzing ? 'opacity-100 translate-y-0 scale-100 bg-sky-950/80 border-sky-500/50 text-sky-200 shadow-sky-500/20' : 'opacity-0 translate-y-4 scale-90 h-0 py-0 border-0 overflow-hidden'}`}>
              <Sparkles className="w-4 h-4 text-sky-400 animate-spin" />
              <span className="text-xs font-bold tracking-wider">{t.visAnalyzing || "ANALYZING"}</span>
          </div>
      </div>

      <div ref={backdropRef} className="custom-scrollbar absolute inset-0 w-full h-full p-8 pb-32 text-lg leading-relaxed font-medium whitespace-pre-wrap break-words overflow-y-scroll cursor-text z-10" aria-hidden="true" onClick={onInteraction}>
        {renderedContent}
        {text.endsWith('\n') && <br />}
      </div>

      <textarea
        ref={textareaRef}
        value={text}
        onChange={onChange}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        onCopy={onClipboard}
        onCut={onClipboard}
        onPaste={onPaste} // Attached handler
        onClick={onInteraction}
        placeholder={t.placeholder}
        className="custom-scrollbar absolute inset-0 w-full h-full p-8 pb-32 resize-none focus:outline-none text-lg leading-relaxed font-medium bg-transparent text-transparent caret-white placeholder:text-slate-700 z-20 overflow-y-scroll break-words"
        spellCheck={false}
      />
    </div>
  );
};
