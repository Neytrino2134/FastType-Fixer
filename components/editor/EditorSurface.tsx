
import React, { useRef, useLayoutEffect, useMemo } from 'react';
import { getTranslation } from '../../utils/i18n';
import { Language, ProcessingStatus, VisualizerStatus } from '../../types';
import { splitIntoBlocks, normalizeBlock } from '../../utils/textStructure';

interface EditorSurfaceProps {
  text: string;
  committedLength: number;
  processedLength: number;
  checkedLength?: number;
  finalizedSentences: Set<string>; // New
  status: ProcessingStatus;
  visualizerStatus: VisualizerStatus;
  language: Language;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  backdropRef: React.RefObject<HTMLDivElement>;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onScroll: (e: React.UIEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onClipboard: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  visualizerDataRef: React.MutableRefObject<Uint8Array | null>;
}

// Helper: Linear Interpolation for smooth transitions
const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;

// Helper: Draw Rounded Rect
const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

export const EditorSurface: React.FC<EditorSurfaceProps> = ({
  text,
  committedLength,
  processedLength,
  checkedLength = processedLength,
  finalizedSentences,
  status,
  visualizerStatus,
  language,
  textareaRef,
  backdropRef,
  onChange,
  onScroll,
  onKeyDown,
  onClipboard,
  visualizerDataRef
}) => {
  const t = getTranslation(language);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animation State Refs (Mutable to avoid re-renders)
  const animRef = useRef({
      rotation: 0,
      pulse: 0,
      waveAlpha: 0,
      textAlpha: 0,
      currentText: ""
  });

  // Audio Visualizer Animation Loop
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    
    const getStatusText = (vs: VisualizerStatus) => {
        switch (vs) {
            case 'listening': return t.visListening;
            case 'editing': return t.visEditing;
            case 'analyzing_listening': return t.visAnalyzingListening;
            case 'analyzing': return t.visAnalyzing;
            case 'done': return t.visDone;
            default: return "";
        }
    };

    const render = () => {
        const parent = canvas.parentElement;
        if (parent) {
            if (canvas.width !== parent.offsetWidth) canvas.width = parent.offsetWidth;
            if (canvas.height !== parent.offsetHeight) canvas.height = parent.offsetHeight;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        const targetText = getStatusText(visualizerStatus);
        
        // --- ANIMATION LERP ---
        const targetWaveAlpha = (visualizerStatus !== 'idle') ? 1 : 0;
        animRef.current.waveAlpha = lerp(animRef.current.waveAlpha, targetWaveAlpha, 0.1);

        if (animRef.current.currentText !== targetText) {
             animRef.current.textAlpha = lerp(animRef.current.textAlpha, 0, 0.2);
             if (animRef.current.textAlpha < 0.05) {
                 animRef.current.currentText = targetText;
             }
        } else {
             const targetTextAlpha = (visualizerStatus !== 'idle') ? 1 : 0;
             animRef.current.textAlpha = lerp(animRef.current.textAlpha, targetTextAlpha, 0.1);
        }

        animRef.current.pulse += 0.05;
        animRef.current.rotation += 0.005;

        if (animRef.current.waveAlpha > 0.01) {
            ctx.save();
            ctx.globalAlpha = animRef.current.waveAlpha;

            if (visualizerDataRef.current && (visualizerStatus === 'listening' || visualizerStatus === 'editing' || visualizerStatus === 'analyzing_listening')) {
                const dataArray = visualizerDataRef.current;
                const bufferLength = dataArray.length;
                const baseRadius = Math.min(centerX, centerY) * 0.4;
                const sensitivity = 4.0; 

                let primaryColor = 'rgba(99, 102, 241, 0.4)';
                let secondaryColor = 'rgba(99, 102, 241, 0.1)';

                if (visualizerStatus === 'editing') {
                    primaryColor = 'rgba(251, 191, 36, 0.5)';
                    secondaryColor = 'rgba(251, 191, 36, 0.1)';
                } else if (visualizerStatus === 'analyzing_listening') {
                    primaryColor = 'rgba(56, 189, 248, 0.5)';
                    secondaryColor = 'rgba(56, 189, 248, 0.1)';
                }

                const layers = [
                    { color: primaryColor, width: 2, offset: 0 },
                    { color: secondaryColor, width: 8, offset: 5 }
                ];

                layers.forEach(layer => {
                    ctx.beginPath();
                    for (let i = 0; i < bufferLength; i++) {
                        const rawVal = dataArray[i];
                        const deviation = (rawVal - 128.0) / 128.0; 
                        const breathing = Math.sin((i / 20) + animRef.current.pulse) * 0.05; 
                        let modifier = (deviation * sensitivity) + breathing;
                        
                        if (visualizerStatus === 'analyzing_listening') modifier *= 0.5;

                        const angle = (i / bufferLength) * Math.PI * 2 + animRef.current.rotation;
                        const r = baseRadius + (modifier * 80) + layer.offset;
                        const x = centerX + r * Math.cos(angle);
                        const y = centerY + r * Math.sin(angle);
                        
                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                    ctx.lineWidth = layer.width;
                    ctx.strokeStyle = layer.color;
                    ctx.stroke();
                });
            } else if (visualizerStatus === 'analyzing' || visualizerStatus === 'done') {
                const baseRadius = Math.min(centerX, centerY) * 0.35;
                const color = visualizerStatus === 'done' ? 'rgba(16, 185, 129,' : 'rgba(56, 189, 248,'; 
                
                ctx.beginPath();
                ctx.arc(centerX, centerY, baseRadius + Math.sin(animRef.current.pulse) * 10, 0, Math.PI * 2);
                ctx.strokeStyle = `${color} 0.5)`;
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(centerX, centerY, baseRadius + Math.sin(animRef.current.pulse + 1) * 15, 0, Math.PI * 2);
                ctx.strokeStyle = `${color} 0.2)`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            if (animRef.current.textAlpha > 0.01 && animRef.current.currentText) {
                ctx.globalAlpha = animRef.current.waveAlpha * animRef.current.textAlpha;
                
                let pillColor = 'rgba(99, 102, 241, 0.2)';
                let textColor = '#c7d2fe';
                let borderColor = 'rgba(99, 102, 241, 0.4)';

                if (visualizerStatus === 'done') {
                    pillColor = 'rgba(16, 185, 129, 0.2)';
                    textColor = '#a7f3d0';
                    borderColor = 'rgba(16, 185, 129, 0.4)';
                } else if (visualizerStatus === 'editing') {
                     pillColor = 'rgba(251, 191, 36, 0.2)';
                     textColor = '#fde68a';
                     borderColor = 'rgba(251, 191, 36, 0.4)';
                } else if (visualizerStatus === 'analyzing' || visualizerStatus === 'analyzing_listening') {
                     pillColor = 'rgba(56, 189, 248, 0.2)';
                     textColor = '#bae6fd';
                     borderColor = 'rgba(56, 189, 248, 0.4)';
                }
                
                const geminiLabel = t.visGeminiLabel || "GEMINI";
                ctx.font = 'bold 12px Inter, sans-serif';
                const metrics1 = ctx.measureText(geminiLabel);
                const w1 = metrics1.width + 24;
                const h1 = 26;
                const x1 = centerX - w1/2;
                const y1 = centerY - 28;

                ctx.fillStyle = pillColor;
                ctx.shadowBlur = 0;
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = 1;
                roundRect(ctx, x1, y1, w1, h1, 13);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = textColor;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(geminiLabel, centerX, y1 + h1/2 + 1);

                const statusText = animRef.current.currentText;
                ctx.font = 'bold 14px Inter, sans-serif';
                const metrics2 = ctx.measureText(statusText);
                const w2 = metrics2.width + 32;
                const h2 = 32;
                const x2 = centerX - w2/2;
                const y2 = centerY + 8;

                ctx.fillStyle = pillColor;
                ctx.strokeStyle = borderColor;
                roundRect(ctx, x2, y2, w2, h2, 16);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = textColor;
                ctx.shadowColor = borderColor;
                ctx.shadowBlur = 10;
                ctx.fillText(statusText, centerX, y2 + h2/2 + 1);
                
                ctx.shadowBlur = 0;
            }

            ctx.restore();
        }

        animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
        cancelAnimationFrame(animationFrameId);
    };
  }, [status, visualizerStatus, visualizerDataRef, language, t]); 

  // --- HYBRID RENDER LOGIC ---
  // Instead of simple slicing, we segment the text into sentences.
  // We check if each sentence is in `finalizedSentences`.
  // If so, it gets GREEN immediately.
  // If not, it falls back to the committed/processed/checked cursor logic.

  const renderedContent = useMemo(() => {
    // Break text into blocks (sentences or separators)
    const blocks = splitIntoBlocks(text);
    
    // Bounds check
    const safeCommitted = Math.min(committedLength, text.length);
    const safeProcessed = Math.min(Math.max(committedLength, processedLength), text.length);
    const safeChecked = Math.min(Math.max(safeProcessed, checkedLength), text.length);

    return blocks.map((block, index) => {
        // 1. Is this block strictly Finalized?
        if (finalizedSentences.has(normalizeBlock(block.text))) {
            return (
                <span key={index} className="text-emerald-500 transition-colors duration-500">
                    {block.text}
                </span>
            );
        }

        // 2. Fallback: Cursor-based coloring for unknown/raw blocks
        // We need to determine the intersection of this block's range [block.start, block.end]
        // with the ranges defined by [0, comm], [comm, proc], [proc, check], [check, infinity]
        
        const renderSubSegment = (subText: string, subStart: number) => {
            const subEnd = subStart + subText.length;
            
            // Helper to get slice class
            const getClass = (s: number) => {
                if (s < safeCommitted) return "text-emerald-500 transition-colors duration-500";
                // CHANGED: text-amber-400 -> text-sky-400 (Blue/Cyan for processed)
                if (s < safeProcessed) return "text-sky-400 transition-colors duration-300";
                if (s < safeChecked) return "text-red-400 transition-colors duration-200";
                return "text-slate-300 transition-colors duration-200";
            };

            // If the block crosses a cursor boundary, we must split it further.
            // Boundaries of interest inside this block:
            const boundaries = [safeCommitted, safeProcessed, safeChecked].filter(p => p > subStart && p < subEnd);
            
            if (boundaries.length === 0) {
                return <span key={subStart} className={getClass(subStart)}>{subText}</span>;
            }

            // Split sub-text by boundaries
            const parts = [];
            let curr = subStart;
            // Sort boundaries distinct
            const sortedBounds = [...new Set(boundaries)].sort((a,b) => a-b);
            
            for (const b of sortedBounds) {
                const chunk = subText.slice(curr - subStart, b - subStart);
                parts.push(<span key={curr} className={getClass(curr)}>{chunk}</span>);
                curr = b;
            }
            // Tail
            if (curr < subEnd) {
                 const chunk = subText.slice(curr - subStart);
                 parts.push(<span key={curr} className={getClass(curr)}>{chunk}</span>);
            }
            return parts;
        };

        return <React.Fragment key={index}>{renderSubSegment(block.text, block.start)}</React.Fragment>;
    });

  }, [text, committedLength, processedLength, checkedLength, finalizedSentences]);

  return (
    <div className="relative flex-1 w-full overflow-hidden">
        
      {/* Visualizer Layer (Behind everything) */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* BACKDROP (Visuals) */}
      <div 
         ref={backdropRef}
         className="custom-scrollbar absolute inset-0 w-full h-full p-8 pb-32 text-lg leading-relaxed font-medium whitespace-pre-wrap break-words overflow-y-scroll pointer-events-none select-none z-10"
         aria-hidden="true"
      >
        {renderedContent}
        {text.endsWith('\n') && <br />}
      </div>

      {/* FOREGROUND (Input) */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={onChange}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        onCopy={onClipboard}
        onCut={onClipboard}
        placeholder={t.placeholder}
        className="custom-scrollbar absolute inset-0 w-full h-full p-8 pb-32 resize-none focus:outline-none text-lg leading-relaxed font-medium bg-transparent text-transparent caret-white placeholder:text-slate-700 z-20 overflow-y-scroll break-words"
        spellCheck={false}
      />
      
    </div>
  );
};
