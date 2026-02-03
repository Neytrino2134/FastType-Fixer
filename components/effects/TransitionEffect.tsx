
import React, { useEffect, useRef } from 'react';
import { BgTransitionType } from '../../types';

interface TransitionEffectProps {
  phase: 'idle' | 'out' | 'in';
  mode?: BgTransitionType; // New prop
}

const TransitionEffect: React.FC<TransitionEffectProps> = ({ phase, mode = 'glitch' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and exit if idle OR if mode is not 'glitch' (leaks handled elsewhere)
    if (phase === 'idle' || mode !== 'glitch') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      // --- CONFIGURATION ---
      // Reduced rectsPerFrame for 'out' phase to extend build-up duration (slower fill)
      let rectsPerFrame = 1; 
      
      // Reveal (IN) keeps higher count to ensure clean sweep, but slightly reduced for longer tail
      // Reduced from 8 to 3 to match the extended 1200ms duration
      if (phase === 'in') rectsPerFrame = 3;

      for (let i = 0; i < rectsPerFrame; i++) {
        // Random dimensions
        // Varies between large blocks (filler) and thin strips (glitchy)
        const isStrip = Math.random() > 0.7;
        
        let rw, rh;
        if (isStrip) {
             rw = Math.random() * w; // Full width strip sometimes
             rh = Math.random() * (h * 0.05) + 2; // Thin height
        } else {
             rw = Math.random() * (w * 0.2) + 20;
             rh = Math.random() * (h * 0.2) + 20;
        }

        const rx = Math.random() * w - (rw / 2);
        const ry = Math.random() * h - (rh / 2);

        if (phase === 'out') {
          // --- OUT PHASE: FILLING ---
          ctx.globalCompositeOperation = 'source-over';
          
          // Use alpha < 1.0. This allows blocks to layer up gradually.
          // It creates a "smoke" or "ink" spread effect rather than solid blocks immediately.
          ctx.globalAlpha = 0.8;

          if (Math.random() > 0.05) {
             ctx.fillStyle = '#000000';
             ctx.fillRect(rx, ry, rw, rh);
          } else {
             // Occasional glitch color
             const colors = ['#00f3ff', '#ff00ff', '#ffffff'];
             ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
             ctx.fillRect(rx, ry, rw, rh);
          }
        } else if (phase === 'in') {
          // --- IN PHASE: REVEALING ---
          ctx.globalCompositeOperation = 'destination-out';
          
          // Using solid alpha for erasure ensures we definitely punch a hole,
          // but we do it in small chunks.
          ctx.globalAlpha = 1.0;
          
          ctx.fillStyle = '#000000'; 
          ctx.fillRect(rx, ry, rw, rh);
        }
      }

      // Reset composite for next frame safety
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;

      frameRef.current = requestAnimationFrame(render);
    };

    // Initialize/Resize Canvas
    if (canvas) {
        if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        }
        
        // Clean start on Out phase for Glitch
        if (phase === 'out' && mode === 'glitch') {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    frameRef.current = requestAnimationFrame(render);

    return () => cancelAnimationFrame(frameRef.current);
  }, [phase, mode]);

  if (phase === 'idle' || mode !== 'glitch') return null;

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full z-[5] pointer-events-none"
    />
  );
};

export default TransitionEffect;
