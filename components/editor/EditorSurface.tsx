

import React, { useRef, useLayoutEffect } from 'react';
import { getTranslation } from '../../utils/i18n';
import { Language, ProcessingStatus, VisualizerStatus } from '../../types';

interface EditorSurfaceProps {
  text: string;
  committedLength: number;
  processedLength: number;
  checkedLength?: number; // Optional to prevent breaking old calls if any
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
  checkedLength = processedLength, // Default to processedLength if not provided
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
      waveAlpha: 0, // Opacity of the main waveform
      textAlpha: 0, // Opacity of the text label
      currentText: ""
  });

  // Audio Visualizer Animation Loop
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    
    // Determine Target Text based on visualizerStatus
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
        // 1. Waveform Alpha: 1 if active state, 0 if idle
        const targetWaveAlpha = (visualizerStatus !== 'idle') ? 1 : 0;
        animRef.current.waveAlpha = lerp(animRef.current.waveAlpha, targetWaveAlpha, 0.1);

        // 2. Text Alpha: Fade out old text before fading in new text
        if (animRef.current.currentText !== targetText) {
             // Fade out
             animRef.current.textAlpha = lerp(animRef.current.textAlpha, 0, 0.2);
             if (animRef.current.textAlpha < 0.05) {
                 animRef.current.currentText = targetText;
             }
        } else {
             // Fade in
             const targetTextAlpha = (visualizerStatus !== 'idle') ? 1 : 0;
             animRef.current.textAlpha = lerp(animRef.current.textAlpha, targetTextAlpha, 0.1);
        }

        // Global pulse
        animRef.current.pulse += 0.05;
        animRef.current.rotation += 0.005;

        // Skip drawing if invisible
        if (animRef.current.waveAlpha > 0.01) {
            ctx.save();
            ctx.globalAlpha = animRef.current.waveAlpha;

            // --- WAVEFORM DRAWING ---
            if (visualizerDataRef.current && (visualizerStatus === 'listening' || visualizerStatus === 'editing' || visualizerStatus === 'analyzing_listening')) {
                const dataArray = visualizerDataRef.current;
                const bufferLength = dataArray.length;
                const baseRadius = Math.min(centerX, centerY) * 0.4;
                const sensitivity = 4.0; 

                // Colors based on state
                let primaryColor = 'rgba(99, 102, 241, 0.4)'; // Indigo (Listening)
                let secondaryColor = 'rgba(99, 102, 241, 0.1)';

                if (visualizerStatus === 'editing') {
                    primaryColor = 'rgba(251, 191, 36, 0.5)'; // Amber (Editing/Trimming)
                    secondaryColor = 'rgba(251, 191, 36, 0.1)';
                } else if (visualizerStatus === 'analyzing_listening') {
                    primaryColor = 'rgba(56, 189, 248, 0.5)'; // Sky (Analyzing)
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
                        
                        // Minimize movement if visualizerData is stale/empty but state is active
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
                // Circular Pulse for Analysis/Done
                const baseRadius = Math.min(centerX, centerY) * 0.35;
                const color = visualizerStatus === 'done' ? 'rgba(16, 185, 129,' : 'rgba(56, 189, 248,'; // Emerald vs Sky
                
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

            // --- TEXT PILLS DRAWING ---
            if (animRef.current.textAlpha > 0.01 && animRef.current.currentText) {
                ctx.globalAlpha = animRef.current.waveAlpha * animRef.current.textAlpha;
                
                // Color config
                let pillColor = 'rgba(99, 102, 241, 0.2)'; // Indigo
                let textColor = '#c7d2fe';
                let borderColor = 'rgba(99, 102, 241, 0.4)';

                if (visualizerStatus === 'done') {
                    pillColor = 'rgba(16, 185, 129, 0.2)'; // Emerald
                    textColor = '#a7f3d0';
                    borderColor = 'rgba(16, 185, 129, 0.4)';
                } else if (visualizerStatus === 'editing') {
                     pillColor = 'rgba(251, 191, 36, 0.2)'; // Amber
                     textColor = '#fde68a';
                     borderColor = 'rgba(251, 191, 36, 0.4)';
                } else if (visualizerStatus === 'analyzing' || visualizerStatus === 'analyzing_listening') {
                     pillColor = 'rgba(56, 189, 248, 0.2)'; // Sky
                     textColor = '#bae6fd';
                     borderColor = 'rgba(56, 189, 248, 0.4)';
                }
                
                // --- PILL 1: GEMINI Label (Top) ---
                const geminiLabel = t.visGeminiLabel || "GEMINI";
                ctx.font = 'bold 12px Inter, sans-serif';
                const metrics1 = ctx.measureText(geminiLabel);
                const w1 = metrics1.width + 24;
                const h1 = 26;
                const x1 = centerX - w1/2;
                const y1 = centerY - 28; // Shifted up

                // Draw Pill 1 Background
                ctx.fillStyle = pillColor;
                ctx.shadowBlur = 0;
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = 1;
                roundRect(ctx, x1, y1, w1, h1, 13);
                ctx.fill();
                ctx.stroke();

                // Draw Pill 1 Text
                ctx.fillStyle = textColor;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(geminiLabel, centerX, y1 + h1/2 + 1);

                // --- PILL 2: Status Text (Bottom) ---
                const statusText = animRef.current.currentText;
                ctx.font = 'bold 14px Inter, sans-serif';
                const metrics2 = ctx.measureText(statusText);
                const w2 = metrics2.width + 32;
                const h2 = 32;
                const x2 = centerX - w2/2;
                const y2 = centerY + 8; // Shifted down

                // Draw Pill 2 Background
                ctx.fillStyle = pillColor;
                ctx.strokeStyle = borderColor;
                roundRect(ctx, x2, y2, w2, h2, 16);
                ctx.fill();
                ctx.stroke();

                // Draw Pill 2 Text
                ctx.fillStyle = textColor;
                ctx.shadowColor = borderColor;
                ctx.shadowBlur = 10; // Glow on main status
                ctx.fillText(statusText, centerX, y2 + h2/2 + 1);
                
                // Reset shadow for next frame
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

  // Calculate slices safely
  // Ensure ranges are valid and logically ordered: 0 <= committed <= processed <= checked <= length
  const safeCommitted = Math.min(committedLength, text.length);
  const safeProcessed = Math.min(Math.max(committedLength, processedLength), text.length);
  const safeChecked = Math.min(Math.max(safeProcessed, checkedLength), text.length);

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
        {/* 1. FIXED: Green */}
        <span className="text-emerald-500 transition-colors duration-500">
          {text.slice(0, safeCommitted)}
        </span>
        
        {/* 2. EDITED: Orange */}
        <span className="text-amber-400 transition-colors duration-300">
          {text.slice(safeCommitted, safeProcessed)}
        </span>

        {/* 3. CHECKED/ERROR: Red (New 4th Category) */}
        <span className="text-red-400 transition-colors duration-200">
          {text.slice(safeProcessed, safeChecked)}
        </span>

        {/* 4. TYPING: Light Gray */}
        <span className="text-slate-300 transition-colors duration-200">
          {text.slice(safeChecked)}
        </span>

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