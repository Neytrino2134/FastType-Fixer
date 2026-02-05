
import React, { useMemo } from 'react';
import { getTranslation } from '../../utils/i18n';
import { Language, ProcessingStatus, VisualizerStatus } from '../../types';
import { splitIntoBlocks, normalizeBlock } from '../../utils/textStructure';
import { Mic, Sparkles, Pause, Play } from 'lucide-react';
import { VisualizerCanvas } from './VisualizerCanvas';

interface EditorSurfaceProps {
  text: string;
  committedLength: number;
  correctedLength: number;
  checkedLength: number;
  finalizedSentences: Set<string>;
  aiFixedSegments: Set<string>; 
  dictatedSegments: Set<string>;
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
  visualizerDataRef: React.MutableRefObject<Uint8Array | null>;
  onInteraction: () => void;
  isPaused: boolean;
  showResumeAnimation: boolean;
  // New Settings Props
  lowCut?: number;
  highCut?: number;
  amp?: number;
  visualizerStyle?: 'classic' | 'bars' | 'circular' | 'wave';
}

export const EditorSurface: React.FC<EditorSurfaceProps> = ({
  text,
  committedLength,
  correctedLength,
  checkedLength,
  finalizedSentences,
  aiFixedSegments,
  dictatedSegments,
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
  visualizerDataRef,
  onInteraction,
  isPaused,
  showResumeAnimation,
  lowCut = 2,
  highCut = 60,
  amp = 1,
  visualizerStyle = 'classic'
}) => {
  const t = getTranslation(language);

  const renderedContent = useMemo(() => {
    const blocks = splitIntoBlocks(text);
    const safeCommitted = Math.min(committedLength, text.length);
    const safeCorrected = Math.min(Math.max(safeCommitted, correctedLength), text.length);
    const safeChecked = Math.min(Math.max(safeCorrected, checkedLength), text.length);

    return blocks.map((block, index) => {
        const normalized = normalizeBlock(block.text);

        if (finalizedSentences.has(normalized)) {
            return <span key={index} className="text-emerald-500 transition-colors duration-500">{block.text}</span>;
        }
        if (dictatedSegments.has(normalized)) {
            return <span key={index} className="text-orange-400 transition-colors duration-500">{block.text}</span>;
        }

        const renderSubSegment = (subText: string, subStart: number) => {
            const subEnd = subStart + subText.length;
            const getClass = (s: number) => {
                if (s < safeCommitted) return "text-emerald-500 transition-colors duration-500"; 
                if (s < safeCorrected) {
                    if (aiFixedSegments.has(normalized)) return "text-violet-400 font-medium transition-colors duration-300"; 
                    return "text-sky-400 transition-colors duration-300"; 
                }
                if (s < safeChecked) return "text-red-400 font-medium transition-colors duration-200"; 
                return "text-slate-200 transition-colors duration-200"; 
            };
            const boundaries = [safeCommitted, safeCorrected, safeChecked].filter(p => p > subStart && p < subEnd);
            if (boundaries.length === 0) return <span key={subStart} className={getClass(subStart)}>{subText}</span>;
            
            const parts = [];
            let curr = subStart;
            const sortedBounds = [...new Set(boundaries)].sort((a,b) => a-b);
            for (const b of sortedBounds) {
                const chunk = subText.slice(curr - subStart, b - subStart);
                parts.push(<span key={curr} className={getClass(curr)}>{chunk}</span>);
                curr = b;
            }
            if (curr < subEnd) {
                 const chunk = subText.slice(curr - subStart);
                 parts.push(<span key={curr} className={getClass(curr)}>{chunk}</span>);
            }
            return parts;
        };
        return <React.Fragment key={index}>{renderSubSegment(block.text, block.start)}</React.Fragment>;
    });
  }, [text, committedLength, correctedLength, checkedLength, finalizedSentences, aiFixedSegments, dictatedSegments]);

  return (
    <div className="relative flex-1 w-full overflow-hidden">
      
      {/* OPTIMIZED VISUALIZER COMPONENT */}
      <VisualizerCanvas 
        visualizerDataRef={visualizerDataRef}
        isRecording={isRecording}
        lowCut={lowCut}
        highCut={highCut}
        amp={amp}
        visualizerStyle={visualizerStyle}
      />

      <div className={`absolute inset-0 flex items-center justify-center z-0 pointer-events-none transition-[opacity,transform] duration-500 ease-in-out ${isPaused ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
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
        onClick={onInteraction}
        placeholder={t.placeholder}
        className="custom-scrollbar absolute inset-0 w-full h-full p-8 pb-32 resize-none focus:outline-none text-lg leading-relaxed font-medium bg-transparent text-transparent caret-white placeholder:text-slate-700 z-20 overflow-y-scroll break-words"
        spellCheck={false}
      />
    </div>
  );
};
