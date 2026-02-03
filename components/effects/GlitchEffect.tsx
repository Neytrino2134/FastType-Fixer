
import React, { useEffect, useRef } from 'react';
import { EffectsConfig } from '../../types';

interface GlitchEffectProps {
  effects: EffectsConfig;
}

// Types of glitch artifacts (V1)
type GlitchType = 'solid' | 'outline' | 'slice' | 'noise';

interface GlitchEntity {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  type: GlitchType;
  color: string;
  life: number;      // How many frames it lives
  maxLife: number;
  speedX: number;    // Drift speed
  speedY: number;
  isTeleporter: boolean; // Does this entity jump around?
  blendMode: GlobalCompositeOperation;
}

interface TextEntity {
  id: number;
  x: number;
  y: number;
  text: string;
  originalText: string;
  size: number;
  color: string;
  life: number;
  corruptionRate: number; // Chance to swap a char
}

// Types for V2
interface GlitchInstance {
  col: number;
  row: number;
  type: number;
  offsetX: number;
  color: string;
}

interface GlitchTextInstance {
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
  isSymbol: boolean;
}

const GLITCH_PHRASES_V1 = [
  "SIGNAL LOST", "FATAL ERROR", "0x000000", "SYSTEM_HALT", 
  "CORRUPTION", "BOOT FAILURE", "NULL POINTER", "STACK OVERFLOW", 
  "UNAUTHORIZED", "DISCONNECT", "404", "RETRYING..."
];

const GLITCH_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;':,./<>?";

const GLITCH_PHRASES_V2 = [
  "SIGNAL LOST", "INSERT DISK", "CONNECTION ERROR", "NO SIGNAL", "SYSTEM FAILURE", 
  "INIT...", "BUFFERING", "DATA CORRUPTION", "404", "FATAL ERROR", "RETRYING", "DISCONNECTED"
];

const GLITCH_SYMBOLS = [
  "X", "O", "+", "∆", "∇", "Ω", "><", "[]", "##", "$$$", "@", "*", "!", "?", ":::", "///"
];

const GlitchEffect: React.FC<GlitchEffectProps> = ({ effects }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Refs for V1 entity management
  const shapesRef = useRef<GlitchEntity[]>([]);
  const textsRef = useRef<TextEntity[]>([]);
  const entityIdCounter = useRef<number>(0);
  
  // Refs for V2
  const lastGlitchUpdateRef = useRef<number>(0);
  const activeGlitchesRef = useRef<GlitchInstance[]>([]);
  const activeTextGlitchesRef = useRef<GlitchTextInstance[]>([]);
  
  // Ref for config to avoid re-binding loop
  const configRef = useRef(effects.glitch);

  useEffect(() => {
    configRef.current = effects.glitch;
  }, [effects.glitch]);

  useEffect(() => {
    if (!effects.glitch.enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = (timestamp: number) => {
      // 1. Resize handling
      if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }
      const w = canvas.width;
      const h = canvas.height;

      const { speed, intensity, opacity, variant } = configRef.current;
      
      // Clear screen
      ctx.clearRect(0, 0, w, h);

      if (variant === 'v2') {
         // --- V2 LOGIC (BLOCKS) ---
          const minInterval = 50;
          const maxInterval = 1000;
          const speedFactor = Math.max(0.05, Math.min(1.0, speed));
          const GLITCH_UPDATE_INTERVAL = maxInterval - ((maxInterval - minInterval) * speedFactor);

          // Update State
          if (timestamp - lastGlitchUpdateRef.current > GLITCH_UPDATE_INTERVAL) {
              lastGlitchUpdateRef.current = timestamp;
              
              const cols = 8;
              const rows = 16;
              const glitchCount = Math.floor(intensity * 12); 
              const newGlitches: GlitchInstance[] = [];

              // Generate Colored Blocks
              for (let i = 0; i < glitchCount; i++) {
                  if (Math.random() > 0.5) continue; 
                  newGlitches.push({
                      col: Math.floor(Math.random() * cols),
                      row: Math.floor(Math.random() * rows),
                      type: Math.random(),
                      offsetX: (Math.random() - 0.5) * 40,
                      color: `rgba(${Math.floor(Math.random()*255)}, ${Math.floor(Math.random()*255)}, ${Math.floor(Math.random()*255)}, 0.5)`
                  });
              }
              activeGlitchesRef.current = newGlitches;

              // Generate Text
              const newTextGlitches: GlitchTextInstance[] = [];
              const textCount = Math.floor(intensity * 5); 

              for (let i = 0; i < textCount; i++) {
                if (Math.random() > 0.3) {
                    const isPhrase = Math.random() > 0.6;
                    const content = isPhrase 
                        ? GLITCH_PHRASES_V2[Math.floor(Math.random() * GLITCH_PHRASES_V2.length)]
                        : GLITCH_SYMBOLS[Math.floor(Math.random() * GLITCH_SYMBOLS.length)];
                    
                    const colorRoll = Math.random();
                    let color = '#fff';
                    if (colorRoll < 0.4) color = '#00f3ff'; 
                    else if (colorRoll < 0.7) color = '#ff3333'; 
                    
                    newTextGlitches.push({
                        text: content,
                        x: Math.random() * w * 0.8 + (w * 0.1),
                        y: Math.random() * h * 0.8 + (h * 0.1),
                        size: isPhrase ? 20 + Math.random() * 30 : 40 + Math.random() * 60,
                        color: color,
                        isSymbol: !isPhrase
                    });
                }
              }
              activeTextGlitchesRef.current = newTextGlitches;
          }

          // Render
          ctx.save();
          ctx.globalAlpha = opacity;

          const cols = 8;
          const rows = 16;
          const blockW = w / cols;
          const blockH = h / rows;

          // Blocks
          activeGlitchesRef.current.forEach(g => {
              const x = g.col * blockW;
              const y = g.row * blockH;

              if (g.type < 0.3) {
                  ctx.fillStyle = '#000';
                  ctx.fillRect(x, y, blockW, blockH);
              } else if (g.type < 0.6) {
                  ctx.globalCompositeOperation = 'difference';
                  ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
                  ctx.fillRect(x + g.offsetX, y, blockW, blockH);
                  ctx.globalCompositeOperation = 'source-over';
              } else if (g.type < 0.9) {
                  ctx.globalCompositeOperation = 'screen';
                  ctx.fillStyle = 'rgba(0, 243, 255, 0.6)';
                  ctx.fillRect(x - g.offsetX, y, blockW, blockH);
                  ctx.globalCompositeOperation = 'source-over';
              } else {
                  ctx.fillStyle = g.color;
                  ctx.globalCompositeOperation = 'overlay';
                  ctx.fillRect(x, y, blockW, blockH);
                  ctx.globalCompositeOperation = 'source-over';
              }
          });

          // Text
          activeTextGlitchesRef.current.forEach(t => {
              ctx.font = `bold ${t.size}px "Courier New", monospace`;
              ctx.fillStyle = t.color;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.shadowColor = t.color;
              ctx.shadowBlur = 10;
              
              const shakeX = (Math.random() - 0.5) * 4;
              const shakeY = (Math.random() - 0.5) * 4;

              ctx.fillText(t.text, t.x + shakeX, t.y + shakeY);
              ctx.shadowBlur = 0;
              
              if (Math.random() > 0.7) {
                  ctx.fillRect(t.x - (t.size*2), t.y, t.size*4, 2);
              }
          });
          ctx.restore();

      } else {
          // --- V1 LOGIC (PARTICLES) ---
          const movementScale = speed * 3.0; 

          // --- SPAWN LOGIC ---
          if (Math.random() < intensity * 0.4) {
            const typeRoll = Math.random();
            let gType: GlitchType = 'solid';
            let gw = Math.random() * (w * 0.2) + 10;
            let gh = Math.random() * (h * 0.2) + 10;
            let blend: GlobalCompositeOperation = 'source-over';
            
            if (typeRoll < 0.4) {
                gType = 'slice'; 
                gw = Math.random() * w; 
                gh = Math.random() * 4 + 1; 
                blend = 'difference';
            } else if (typeRoll < 0.7) {
                gType = 'solid'; 
                blend = Math.random() > 0.5 ? 'exclusion' : 'source-over';
            } else if (typeRoll < 0.9) {
                gType = 'outline'; 
                blend = 'screen';
            } else {
                gType = 'noise'; 
                blend = 'overlay';
            }

            const colorRoll = Math.random();
            let color = '#fff';
            if (colorRoll < 0.3) color = 'rgba(0, 243, 255, 1)'; 
            else if (colorRoll < 0.6) color = 'rgba(255, 0, 255, 1)'; 
            else if (colorRoll < 0.8) color = 'rgba(0, 255, 0, 1)'; 
            
            shapesRef.current.push({
                id: entityIdCounter.current++,
                x: Math.random() * w,
                y: Math.random() * h,
                w: gw,
                h: gh,
                type: gType,
                color: color,
                life: Math.floor(Math.random() * 20 * (1/Math.max(0.1, speed))) + 5, 
                maxLife: 30,
                speedX: (Math.random() - 0.5) * 10,
                speedY: (Math.random() - 0.5) * 10,
                isTeleporter: Math.random() > 0.7, 
                blendMode: blend
            });
          }

          if (Math.random() < intensity * 0.05) {
              const phrase = GLITCH_PHRASES_V1[Math.floor(Math.random() * GLITCH_PHRASES_V1.length)];
              textsRef.current.push({
                  id: entityIdCounter.current++,
                  x: Math.random() * (w - 100),
                  y: Math.random() * (h - 50),
                  text: phrase,
                  originalText: phrase,
                  size: 20 + Math.random() * 60,
                  color: Math.random() > 0.5 ? '#fff' : '#00f3ff',
                  life: Math.floor(Math.random() * 30) + 10,
                  corruptionRate: Math.random() * 0.5
              });
          }

          // --- RENDER SHAPES ---
          ctx.save();
          shapesRef.current = shapesRef.current.filter(s => s.life > 0);

          shapesRef.current.forEach(s => {
              s.life--;
              const jitterX = (Math.random() - 0.5) * (intensity * 30); 
              const jitterY = (Math.random() - 0.5) * (intensity * 10);
              
              s.x += s.speedX * movementScale;
              s.y += s.speedY * movementScale;

              if (s.isTeleporter && Math.random() < 0.1 * (speed * 1.5)) {
                  s.x = Math.random() * w;
                  s.y = Math.random() * h;
                  if(Math.random() > 0.5) {
                      s.w = Math.random() * 200;
                      s.h = Math.random() * 50;
                  }
              }

              const drawX = s.x + jitterX;
              const drawY = s.y + jitterY;

              const frameOpacity = (Math.random() * 0.7 + 0.3) * opacity; 
              ctx.globalAlpha = frameOpacity;
              ctx.globalCompositeOperation = s.blendMode;
              ctx.fillStyle = s.color;
              ctx.strokeStyle = s.color;

              switch(s.type) {
                  case 'solid':
                      ctx.fillRect(drawX, drawY, s.w, s.h);
                      break;
                  case 'slice':
                      ctx.fillRect(0, drawY, w, s.h); 
                      break;
                  case 'outline':
                      ctx.lineWidth = 2;
                      ctx.strokeRect(drawX, drawY, s.w, s.h);
                      if (Math.random() > 0.7) {
                          ctx.beginPath();
                          ctx.moveTo(drawX, drawY);
                          ctx.lineTo(drawX + s.w, drawY + s.h);
                          ctx.moveTo(drawX + s.w, drawY);
                          ctx.lineTo(drawX, drawY + s.h);
                          ctx.stroke();
                      }
                      break;
                  case 'noise':
                      for(let i=0; i<20; i++) {
                          ctx.fillRect(
                              drawX + Math.random() * s.w, 
                              drawY + Math.random() * s.h, 
                              Math.random() * 4, 
                              Math.random() * 4
                          );
                      }
                      break;
              }
          });
          ctx.restore();

          // --- RENDER TEXT ---
          ctx.save();
          textsRef.current = textsRef.current.filter(t => t.life > 0);
          
          textsRef.current.forEach(t => {
              t.life--;
              if (Math.random() < t.corruptionRate * (speed * 2)) {
                  const charIndex = Math.floor(Math.random() * t.text.length);
                  const newChar = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
                  t.text = t.text.substring(0, charIndex) + newChar + t.text.substring(charIndex + 1);
              }
              if (Math.random() < 0.1) t.text = t.originalText;

              ctx.font = `900 ${t.size}px "Courier New", monospace`;
              ctx.textAlign = 'left';
              ctx.textBaseline = 'top';

              const shakeX = (Math.random() - 0.5) * (intensity * 50);
              const shakeY = (Math.random() - 0.5) * (intensity * 10);
              
              const finalX = t.x + shakeX;
              const finalY = t.y + shakeY;

              ctx.globalAlpha = opacity * 0.8;
              
              ctx.globalCompositeOperation = 'screen';
              ctx.fillStyle = '#ff0000';
              ctx.fillText(t.text, finalX - 2, finalY - 2);
              
              ctx.fillStyle = '#0000ff';
              ctx.fillText(t.text, finalX + 2, finalY + 2);
              
              ctx.fillStyle = '#00ff00';
              ctx.fillText(t.text, finalX, finalY);
              
              if (Math.random() > 0.8) {
                ctx.fillStyle = '#ffffff';
                ctx.fillText(t.text, finalX, finalY);
              }
              
              if (Math.random() > 0.85) {
                  ctx.globalCompositeOperation = 'source-over';
                  ctx.fillStyle = '#000';
                  ctx.fillRect(finalX, finalY + t.size/2, t.size * (t.text.length * 0.6), 5);
              }
          });
          ctx.restore();
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [effects.glitch.enabled]);

  if (!effects.glitch.enabled) return null;

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-40 pointer-events-none mix-blend-hard-light" />;
};

export default GlitchEffect;
