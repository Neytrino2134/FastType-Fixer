
import React, { useEffect, useRef } from 'react';
import { EffectsConfig } from '../../types';

interface LightLeaksEffectProps {
  config: EffectsConfig['lightLeaks'];
}

interface Leak {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  hue: number;
  saturation: number;
  lightness: number;
  opacity: number;
  phase: number;
  phaseSpeed: number;
}

const LightLeaksEffect: React.FC<LightLeaksEffectProps> = ({ config }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const leaksRef = useRef<Leak[]>([]);
  const animationRef = useRef<number>(0);
  
  // Noise pattern for dithering
  const noisePatternRef = useRef<CanvasPattern | null>(null);
  
  // Master opacity for smooth transitions (0 to 1)
  // Initialize to 1.0 if enabled to prevent fade-in flicker on remounts (e.g. Cinema Mode transition)
  const fadeLevelRef = useRef<number>(config.enabled ? 1.0 : 0.0);
  
  // Time tracking for delta
  const lastTimeRef = useRef<number>(0);
  
  // Store config in ref to allow access inside render loop
  const configRef = useRef(config);

  useEffect(() => {
      configRef.current = config;
  }, [config]);

  // Cinematic Color Palette (H, S, L)
  const PALETTE = [
      { h: 30, s: 100, l: 60 }, // Amber/Gold
      { h: 330, s: 90, l: 65 }, // Rose/Pink
      { h: 200, s: 90, l: 60 }, // Cyan/Blue
      { h: 260, s: 80, l: 70 }, // Purple
      { h: 40, s: 100, l: 80 }, // Warm White
  ];

  const initLeaks = (width: number, height: number, count: number) => {
      const leaks: Leak[] = [];
      for (let i = 0; i < count; i++) {
          const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
          leaks.push({
              x: Math.random() * width,
              y: Math.random() * height,
              radius: Math.random() * (Math.min(width, height) * 0.4) + (Math.min(width, height) * 0.2),
              vx: (Math.random() - 0.5) * 0.5,
              vy: (Math.random() - 0.5) * 0.5,
              hue: color.h + (Math.random() * 20 - 10),
              saturation: color.s,
              lightness: color.l,
              opacity: Math.random() * 0.5 + 0.2,
              phase: Math.random() * Math.PI * 2,
              phaseSpeed: (Math.random() * 0.02) + 0.005
          });
      }
      return leaks;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Force High Quality Smoothing for gradients
    const ctx = canvas.getContext('2d', { alpha: true }); 
    if (!ctx) return;
    
    // Explicitly enable smoothing (usually default, but good to ensure)
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // --- GENERATE NOISE PATTERN FOR DITHERING ---
    // We create a small offscreen canvas with noise to tile over the gradients.
    // This breaks up 8-bit color banding.
    const noiseSize = 256;
    const noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = noiseSize;
    noiseCanvas.height = noiseSize;
    const nCtx = noiseCanvas.getContext('2d');
    if (nCtx) {
        const idata = nCtx.createImageData(noiseSize, noiseSize);
        const buffer32 = new Uint32Array(idata.data.buffer);
        for(let i=0; i<buffer32.length; i++) {
            // Random gray value with alpha
            const val = Math.floor(Math.random() * 255);
            // 0xAARRGGBB - Low alpha (approx 5-8%) is enough to dither without being dirty
            buffer32[i] = (0x10000000 | (val << 16) | (val << 8) | val); 
        }
        nCtx.putImageData(idata, 0, 0);
        noisePatternRef.current = ctx.createPattern(noiseCanvas, 'repeat');
    }

    let w = canvas.width = canvas.offsetWidth;
    let h = canvas.height = canvas.offsetHeight;

    const render = (time: number) => {
        // Calculate Delta Time in Seconds
        if (!lastTimeRef.current) lastTimeRef.current = time;
        const dt = (time - lastTimeRef.current) / 1000;
        lastTimeRef.current = time;

        const safeDt = Math.min(dt, 0.1); 

        // Handle Resize
        if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
             w = canvas.width = canvas.offsetWidth;
             h = canvas.height = canvas.offsetHeight;
             // Re-apply quality settings after resize reset
             ctx.imageSmoothingEnabled = true;
             ctx.imageSmoothingQuality = 'high';
        }

        const cfg = configRef.current;
        const targetFade = cfg.enabled ? 1.0 : 0.0;
        
        // Time-based smooth damp
        const smoothSpeed = 3.0; 
        const t = 1.0 - Math.exp(-smoothSpeed * safeDt);
        
        fadeLevelRef.current += (targetFade - fadeLevelRef.current) * t;

        if (Math.abs(targetFade - fadeLevelRef.current) < 0.005) {
            fadeLevelRef.current = targetFade;
        }

        // Optimization: If completely faded out and disabled, stop drawing
        if (fadeLevelRef.current < 0.005 && !cfg.enabled) {
             ctx.clearRect(0, 0, w, h);
             leaksRef.current = [];
             animationRef.current = requestAnimationFrame(render);
             return;
        }

        // --- SMART ARRAY MANAGEMENT ---
        const currentLen = leaksRef.current.length;
        const targetLen = cfg.number;

        if (currentLen < targetLen) {
             const toAdd = targetLen - currentLen;
             leaksRef.current.push(...initLeaks(w, h, toAdd));
        } else if (currentLen > targetLen) {
             leaksRef.current.splice(targetLen);
        }

        ctx.clearRect(0, 0, w, h);
        
        // Use 'screen' blending for nice light addition
        ctx.globalCompositeOperation = 'screen'; 
        // FIX: Explicitly reset alpha to 1.0 every frame to prevent noise pass pollution
        ctx.globalAlpha = 1.0;

        const speedMultiplier = cfg.speed * 120 * safeDt;

        leaksRef.current.forEach((leak) => {
            // Physics Update
            leak.x += leak.vx * speedMultiplier;
            leak.y += leak.vy * speedMultiplier;
            leak.phase += leak.phaseSpeed * speedMultiplier * 0.5;

            const hoverX = Math.sin(leak.phase) * 0.5 * speedMultiplier;
            const hoverY = Math.cos(leak.phase) * 0.5 * speedMultiplier;
            leak.x += hoverX;
            leak.y += hoverY;

            // Bounce / Wrap Logic
            if (leak.x < -leak.radius) leak.x = w + leak.radius;
            if (leak.x > w + leak.radius) leak.x = -leak.radius;
            if (leak.y < -leak.radius) leak.y = h + leak.radius;
            if (leak.y > h + leak.radius) leak.y = -leak.radius;

            // Draw
            const osc = Math.sin(leak.phase * 0.5) * 0.1;
            const currentOpacity = (leak.opacity + osc) * cfg.intensity * fadeLevelRef.current;
            
            if (currentOpacity > 0) {
                const gradient = ctx.createRadialGradient(leak.x, leak.y, 0, leak.x, leak.y, leak.radius);
                
                gradient.addColorStop(0, `hsla(${leak.hue}, ${leak.saturation}%, ${leak.lightness}%, ${currentOpacity})`);
                gradient.addColorStop(0.5, `hsla(${leak.hue}, ${leak.saturation}%, ${leak.lightness}%, ${currentOpacity * 0.5})`);
                // Smooth falloff to zero helps prevent hard edges
                gradient.addColorStop(1, `hsla(${leak.hue}, ${leak.saturation}%, ${leak.lightness}%, 0)`);

                ctx.fillStyle = gradient;
                
                ctx.beginPath();
                ctx.arc(leak.x, leak.y, leak.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        
        // --- DITHERING PASS (Fix Banding) ---
        // Apply noise pattern over the lights to smooth 8-bit gradients
        if (noisePatternRef.current && fadeLevelRef.current > 0.1) {
            ctx.globalCompositeOperation = 'overlay';
            ctx.globalAlpha = 0.08 * fadeLevelRef.current; // Subtle strength
            ctx.fillStyle = noisePatternRef.current;
            // Shift pattern slightly each frame to simulate film grain
            ctx.save();
            ctx.translate(Math.random() * 100, Math.random() * 100); 
            ctx.fillRect(-100, -100, w + 100, h + 100);
            ctx.restore();
        }
        
        ctx.globalCompositeOperation = 'source-over';

        animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
    />
  );
};

export default LightLeaksEffect;
