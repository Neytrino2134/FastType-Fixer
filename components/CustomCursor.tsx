
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CursorStyle } from '../types';
import { useTheme } from '../contexts/ThemeContext';

// Restricted palette: Blue, Purple, White
const GLITCH_COLORS = [
  '#00f3ff', // Neon Blue
  '#bc13fe', // Neon Purple
  '#ffffff', // White
];

// Tech/Glitch symbols
const SYMBOLS = ['0', '1', 'X', '+', '<', '>', '_', '█', '▓', '▒', 'ERR', 'NaN', '0x'];

// Music Symbols
const MUSIC_SYMBOLS = ['♪', '♫', '♩', '♬', '♭', '♯', '𝄞'];

// SVG PATHS DEFINITIONS
// New Hand Cursor Path (Finger)
const HAND_PATH_D = "M10 11V8.99c0-.88.59-1.64 1.44-1.86h.05A1.99 1.99 0 0 1 14 9.05V12v-2c0-.88.6-1.65 1.46-1.87h.05A1.98 1.98 0 0 1 18 10.06V13v-1.94a2 2 0 0 1 1.51-1.94h0A2 2 0 0 1 22 11.06V14c0 .6-.08 1.27-.21 1.97a7.96 7.96 0 0 1-7.55 6.48 54.98 54.98 0 0 1-4.48 0 7.96 7.96 0 0 1-7.55-6.48C2.08 15.27 2 14.59 2 14v-1.49c0-1.11.9-2.01 2.01-2.01h0a2 2 0 0 1 2.01 2.03l-.01.97v-10c0-1.1.9-2 2-2h0a2 2 0 0 1 2 2V11Z";

// New Grab Cursor Path (Move/Arrows)
const GRAB_PATH_D = "m2 12 3.5-3.5v7L2 12Zm20 0-3.5 3.5v-7L22 12Zm-3.5 0h-13M12 2l3.5 3.5h-7L12 2Zm0 20-3.5-3.5h7L12 22Zm0-3.5v-13";

// New Rounded Cursor Path
const ROUNDED_PATH_D = "M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z";

// Thicker version for visibility (Resize Horizontal)
const RESIZE_H_BOLD_D = "M 2 12 L 7 7 L 7 10 L 17 10 L 17 7 L 22 12 L 17 17 L 17 14 L 7 14 L 7 17 Z";

// NEW: Resize Vertical (Up-Down Arrow)
const RESIZE_V_BOLD_D = "M 12 2 L 17 7 L 14 7 L 14 17 L 17 17 L 12 22 L 7 17 L 10 17 L 10 7 L 7 7 Z";

// --- GLOBAL MOUSE TRACKING STATE ---
const mouseState = {
    x: -100,
    y: -100,
    isClicked: false,
    forceSystemCursor: false,
    isHovering: false,
    isScreenHover: false,
    hideCrosshair: false,
    isOut: false,
    isPanelHover: false,
    isResizerHover: false
};

let listenersAttached = false;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;      
  decay: number;     
  color: string;
  char: string;
  size: number;
  isBlock: boolean;
  updateTimer: number;
  // Extra props for smooth music flow
  rotation?: number; 
  rotationSpeed?: number;
}

interface CustomCursorProps {
  style?: CursorStyle;
  retroScreenStyle?: CursorStyle; // New Prop
  analyser?: AnalyserNode | null; // Added analyser prop
}

const CustomCursor: React.FC<CustomCursorProps> = ({ style = 'default', retroScreenStyle = 'crosshair', analyser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const dosCursorRef = useRef<HTMLDivElement>(null);
  
  // Refs for SVG Cursors
  const arrowRef = useRef<SVGSVGElement>(null);
  const handRef = useRef<SVGSVGElement>(null);
  const grabRef = useRef<SVGSVGElement>(null); 
  const crosshairRef = useRef<SVGSVGElement>(null);
  const roundedRef = useRef<SVGSVGElement>(null);
  const resizeHRef = useRef<SVGSVGElement>(null); // NEW
  const resizeVRef = useRef<SVGSVGElement>(null); // NEW
  
  const { colors } = useTheme();
  
  // Refs for Canvas particle state
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef(0);
  const lastMousePos = useRef({ x: 0, y: 0 });
  
  // Audio Data Ref
  const dataArrayRef = useRef<Uint8Array | null>(null);

  // --- 1. GLOBAL INPUT TRACKER ---
  useEffect(() => {
      if (listenersAttached) return;
      listenersAttached = true;

      const handleMove = (e: PointerEvent) => {
          mouseState.x = e.clientX;
          mouseState.y = e.clientY;
          mouseState.isOut = false; 

          const target = e.target as HTMLElement;
          let forceSystem = false;

          if (target.closest && target.closest('.system-cursor')) {
              forceSystem = true;
          } 

          mouseState.forceSystemCursor = forceSystem;

          if (forceSystem) {
              document.body.classList.add('show-system-cursor');
          } else {
              document.body.classList.remove('show-system-cursor');
          }
      };

      const handleDown = () => { mouseState.isClicked = true; };
      const handleUp = () => { mouseState.isClicked = false; };
      const handleOut = () => { mouseState.isOut = true; };
      const handleIn = () => { mouseState.isOut = false; };

      const handleMouseOver = (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          const isInteractive = 
            target.tagName === 'BUTTON' || 
            target.tagName === 'A' || 
            target.tagName === 'INPUT' || 
            target.tagName === 'SELECT' || 
            target.classList.contains('cursor-pointer') ||
            target.closest('button') || 
            target.closest('a') ||
            target.closest('.cursor-pointer'); 
          
          mouseState.isHovering = !!isInteractive;
          
          const hideZone = target.closest('.cursor-hide-center');
          mouseState.hideCrosshair = !!hideZone;
          
          const isScreen = target.closest('.cursor-target-screen');
          mouseState.isScreenHover = !!isScreen;

          // Detect panels for special cursor logic
          const isPanel = target.closest('.bg-theme-panel') || target.closest('.player-chassis') || target.closest('.bg-black\\/90');
          mouseState.isPanelHover = !!isPanel;

          // Detect Resizers
          const isResizer = target.closest('.custom-resizer');
          mouseState.isResizerHover = !!isResizer;
      };

      window.addEventListener('pointermove', handleMove, { passive: true });
      window.addEventListener('pointerdown', handleDown);
      window.addEventListener('pointerup', handleUp);
      document.addEventListener('mouseover', handleMouseOver);
      document.addEventListener('mouseleave', handleOut); 
      document.addEventListener('mouseenter', handleIn);

      return () => {
          window.removeEventListener('pointermove', handleMove);
          window.removeEventListener('pointerdown', handleDown);
          window.removeEventListener('pointerup', handleUp);
          document.removeEventListener('mouseover', handleMouseOver);
          document.removeEventListener('mouseleave', handleOut);
          document.removeEventListener('mouseenter', handleIn);
          listenersAttached = false;
      };
  }, []);

  // --- 2. SYSTEM CURSOR CLASS SYNC ---
  useEffect(() => {
    if (style === 'system') {
      document.body.classList.add('force-system-cursor');
    } else {
      document.body.classList.remove('force-system-cursor');
    }
    return () => document.body.classList.remove('force-system-cursor');
  }, [style]);

  // --- 3. CANVAS RESIZE ---
  useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const resize = () => {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
      };
      window.addEventListener('resize', resize);
      resize();
      return () => window.removeEventListener('resize', resize);
  }, []);

  // --- 4. RENDER LOOP ---
  useEffect(() => {
      let rAF = 0;
      const canvas = canvasRef.current;
      const ctx = canvas ? canvas.getContext('2d') : null;

      // Init audio array
      if (analyser && !dataArrayRef.current) {
          dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      }

      const loop = () => {
          const { x, y, forceSystemCursor, isOut, isHovering, isClicked, isScreenHover, isPanelHover, isResizerHover } = mouseState;
          
          // Check for custom resize classes on body OR hover on resizer
          const isResizingH = document.body.classList.contains('custom-cursor-col-resize') || isResizerHover;
          const isResizingV = document.body.classList.contains('custom-cursor-row-resize');
          const isAppDragging = document.body.classList.contains('app-dragging');
          const isDosForced = document.body.classList.contains('force-dos-cursor');
          
          // Don't hide if resizing
          const shouldHide = (forceSystemCursor || isOut) && !isResizingH && !isResizingV;

          // CALCULATE AUDIO LEVEL
          let audioLevel = 0;
          if (analyser && dataArrayRef.current) {
              // Cast to any to fix TS Uint8Array mismatch between dom/web-audio types
              analyser.getByteFrequencyData(dataArrayRef.current as any);
              
              // Sample a portion for performance
              let sum = 0;
              const step = 4;
              const len = dataArrayRef.current.length;
              for(let i = 0; i < len; i += step) {
                  sum += dataArrayRef.current[i];
              }
              // Normalize (0.0 to 1.0)
              audioLevel = (sum / (len / step)) / 255;
          }

          let activeStyle = (isScreenHover) ? retroScreenStyle : style;
          if (style === 'music-flow') activeStyle = 'music-flow';
          if (isDosForced) activeStyle = 'dos-terminal';

          if (activeStyle === 'system') {
              if (canvas) ctx?.clearRect(0, 0, canvas.width, canvas.height);
              if (cursorRef.current) cursorRef.current.style.opacity = '0';
              if (dosCursorRef.current) dosCursorRef.current.style.opacity = '0';
              rAF = requestAnimationFrame(loop);
              return;
          }

          // --- MUSIC FLOW MODE ---
          if (activeStyle === 'music-flow' && ctx && canvas) {
              if (dosCursorRef.current) dosCursorRef.current.style.opacity = '0';
              if (cursorRef.current) {
                  const scale = isClicked ? 0.9 : 1;
                  cursorRef.current.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
                  cursorRef.current.style.opacity = shouldHide ? '0' : '1';
                  
                  let showArrow = !shouldHide;
                  // Default to showing crosshair in Music Flow
                  let showCrosshair = !shouldHide; 
                  let showHand = isHovering && !shouldHide;
                  let showResizeH = isResizingH;
                  let showResizeV = isResizingV;

                  // Overrides for Music Flow: Hide arrow if over panel
                  if (isPanelHover || isHovering) {
                      showArrow = false;
                      showHand = false; // Hide hand too, keep only crosshair as requested
                  }

                  if (isScreenHover) {
                      showArrow = false;
                      showHand = false;
                  } 

                  if (isAppDragging || isResizingH || isResizingV) {
                      showArrow = false;
                      showHand = false;
                      showCrosshair = false;
                  }

                  if (arrowRef.current) arrowRef.current.style.opacity = showArrow ? '1' : '0';
                  if (handRef.current) handRef.current.style.opacity = showHand ? '1' : '0';
                  
                  // Forced Small White Crosshair
                  if (crosshairRef.current) {
                      crosshairRef.current.style.opacity = showCrosshair ? '0.8' : '0'; 
                      // Fixed small scale for music mode
                      crosshairRef.current.style.transform = `translate(-12px, -12px) scale(0.5)`; 
                  }

                  if (grabRef.current) grabRef.current.style.opacity = isAppDragging ? '1' : '0';
                  if (resizeHRef.current) resizeHRef.current.style.opacity = showResizeH ? '1' : '0';
                  if (resizeVRef.current) resizeVRef.current.style.opacity = showResizeV ? '1' : '0';
                  if (roundedRef.current) roundedRef.current.style.opacity = '0';
              }

              const particles = particlesRef.current;
              frameRef.current++;
              ctx.clearRect(0, 0, canvas.width, canvas.height);

              if (!shouldHide && x > 0 && !isResizingH && !isResizingV) {
                  const dx = x - lastMousePos.current.x;
                  const dy = y - lastMousePos.current.y;
                  const dist = Math.sqrt(dx*dx + dy*dy);
                  lastMousePos.current = { x, y };

                  const spawnChance = isClicked ? 0.9 : (dist > 2 ? 0.6 : 0.05);
                  
                  if (Math.random() < spawnChance) {
                      // Reduced Count: 1 minimum, add more based on audio volume
                      const count = isClicked ? 1 + Math.floor(audioLevel * 2) : 1;
                      
                      // Audio-reactive velocity multiplier
                      const velocityMult = 1.0 + (audioLevel * 3.0);

                      for(let i=0; i<count; i++) {
                          const char = MUSIC_SYMBOLS[Math.floor(Math.random() * MUSIC_SYMBOLS.length)];
                          const colorChoice = Math.random();
                          let color = '#fff';
                          if (colorChoice < 0.4) color = colorMapRef.current.global.primary;
                          else if (colorChoice < 0.7) color = colorMapRef.current.global.secondary;

                          particles.push({
                              x: x + (Math.random() - 0.5) * 10,
                              y: y + (Math.random() - 0.5) * 10,
                              // Reduced initial speed: Factor 0.5 instead of 1.5
                              vx: ((Math.random() - 0.5) * 0.5 * velocityMult) - (dx * 0.05),
                              vy: ((Math.random() - 0.5) * 0.5 * velocityMult) - 0.5,
                              life: 1.0,
                              decay: Math.random() * 0.02 + 0.02, 
                              color: color,
                              char: char,
                              // Increased size: 20-35px
                              size: Math.floor(Math.random() * 15) + 20,
                              isBlock: false,
                              updateTimer: 0,
                              rotation: Math.random() * Math.PI * 2,
                              rotationSpeed: (Math.random() - 0.5) * 0.1
                          });
                      }
                  }
              }

              for (let i = particles.length - 1; i >= 0; i--) {
                  const p = particles[i];
                  p.x += p.vx;
                  p.y += p.vy;
                  p.life -= p.decay;
                  if (p.rotation !== undefined && p.rotationSpeed !== undefined) {
                      p.rotation += p.rotationSpeed;
                  }

                  if (p.life <= 0) { particles.splice(i, 1); continue; }

                  ctx.save();
                  ctx.globalAlpha = p.life;
                  ctx.fillStyle = p.color;
                  ctx.translate(p.x, p.y);
                  if (p.rotation !== undefined) ctx.rotate(p.rotation);
                  ctx.font = `${p.size}px "Courier New", monospace`;
                  ctx.fillText(p.char, -p.size/2, p.size/2);
                  ctx.restore();
              }
          }

          // --- CANVAS (DEFAULT / GLITCH) MODE ---
          else if (activeStyle === 'default' && ctx && canvas) {
              if (cursorRef.current) cursorRef.current.style.opacity = '0';
              if (dosCursorRef.current) dosCursorRef.current.style.opacity = '0';

              const { hideCrosshair } = mouseState;
              const particles = particlesRef.current;
              frameRef.current++;

              ctx.clearRect(0, 0, canvas.width, canvas.height);

              // Standard particle logic... (Only if not resizing)
              if (!shouldHide && x > 0 && !isResizingH && !isResizingV) {
                  const chance = isClicked ? 1.0 : 0.4;
                  const count = isClicked ? 3 : 1; // Slightly reduced
                  if (Math.random() < chance) {
                      for(let i = 0; i < count; i++) {
                          const angle = Math.floor(Math.random() * 4) * (Math.PI / 2); 
                          const speed = isClicked ? Math.random() * 8 + 2 : Math.random() * 4; 
                          const isBlock = Math.random() > 0.7;
                          const char = isBlock ? '' : SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
                          const offsetX = (Math.random() - 0.5) * (isClicked ? 10 : 30);
                          const offsetY = (Math.random() - 0.5) * (isClicked ? 10 : 30);

                          particles.push({
                              x: x + offsetX,
                              y: y + offsetY,
                              vx: Math.cos(angle) * speed,
                              vy: Math.sin(angle) * speed,
                              life: 1.0,
                              decay: Math.random() * 0.05 + 0.02, 
                              color: GLITCH_COLORS[Math.floor(Math.random() * GLITCH_COLORS.length)],
                              char: char,
                              size: Math.floor(Math.random() * 10) + 8,
                              isBlock: isBlock,
                              updateTimer: Math.floor(Math.random() * 10)
                          });
                      }
                  }
              }

              for (let i = particles.length - 1; i >= 0; i--) {
                  const p = particles[i];
                  p.updateTimer--;
                  if (p.updateTimer <= 0) {
                      const glitchType = Math.random();
                      if (glitchType < 0.3) {
                          p.x += (Math.random() - 0.5) * 20;
                          p.y += (Math.random() - 0.5) * 20;
                      } else if (glitchType < 0.6) {
                          const angle = Math.floor(Math.random() * 4) * (Math.PI / 2);
                          const speed = Math.random() * 5 + 1;
                          p.vx = Math.cos(angle) * speed;
                          p.vy = Math.sin(angle) * speed;
                      } else {
                          p.vx = 0; p.vy = 0;
                      }
                      p.updateTimer = Math.floor(Math.random() * 10) + 2;
                  }
                  p.x += p.vx; p.y += p.vy;
                  p.life -= p.decay;
                  if (p.life <= 0) { particles.splice(i, 1); continue; }
                  ctx.globalAlpha = p.life;
                  ctx.fillStyle = p.color;
                  if (p.isBlock) {
                      const w = p.size;
                      const h = Math.random() > 0.5 ? p.size : p.size / 4; 
                      ctx.fillRect(p.x, p.y, w, h);
                  } else {
                      ctx.font = `bold ${p.size}px "Courier New", monospace`;
                      ctx.fillText(p.char, p.x, p.y);
                  }
              }

              // Draw Crosshair (Only if not resizing)
              if (!shouldHide && x > 0 && !hideCrosshair && !isResizingH && !isResizingV) {
                  ctx.globalAlpha = 0.8;
                  ctx.strokeStyle = isClicked ? '#bc13fe' : '#00f3ff'; 
                  ctx.lineWidth = 2;
                  const gap = isHovering ? 15 : 5;
                  const len = isHovering ? 15 : 10;
                  ctx.beginPath(); ctx.moveTo(x - gap - len, y); ctx.lineTo(x - gap, y); ctx.stroke();
                  ctx.beginPath(); ctx.moveTo(x + gap, y); ctx.lineTo(x + gap + len, y); ctx.stroke();
                  ctx.beginPath(); ctx.moveTo(x, y - gap - len); ctx.lineTo(x, y - gap); ctx.stroke();
                  ctx.beginPath(); ctx.moveTo(x, y + gap); ctx.lineTo(x, y + gap + len); ctx.stroke();
                  if (!isHovering && !isClicked) {
                      ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 1, 2, 2);
                  }
              }

              // If Resizing in Default mode, show the SVG cursor instead of canvas drawing
              if (isResizingH || isResizingV) {
                  // Ensure SVG container is visible even if main mode is default
                  if (cursorRef.current) {
                      cursorRef.current.style.display = 'block';
                      cursorRef.current.style.opacity = '1';
                      cursorRef.current.style.transform = `translate(${x}px, ${y}px)`;
                      
                      // Hide all but resize
                      if (arrowRef.current) arrowRef.current.style.opacity = '0';
                      if (handRef.current) handRef.current.style.opacity = '0';
                      if (grabRef.current) grabRef.current.style.opacity = '0';
                      if (crosshairRef.current) crosshairRef.current.style.opacity = '0';
                      if (roundedRef.current) roundedRef.current.style.opacity = '0';
                      
                      if (resizeHRef.current) resizeHRef.current.style.opacity = isResizingH ? '1' : '0';
                      if (resizeVRef.current) resizeVRef.current.style.opacity = isResizingV ? '1' : '0';
                  }
              }
          }
          
          else if (activeStyle === 'dos-terminal' && dosCursorRef.current) {
              if (canvas) ctx?.clearRect(0, 0, canvas.width, canvas.height);
              if (cursorRef.current) cursorRef.current.style.opacity = '0';
              
              // Handle resize override even for DOS mode
              if (isResizingH || isResizingV) {
                  dosCursorRef.current.style.opacity = '0';
                  if (cursorRef.current) {
                      cursorRef.current.style.opacity = '1';
                      cursorRef.current.style.transform = `translate(${x}px, ${y}px)`;
                      if (resizeHRef.current) resizeHRef.current.style.opacity = isResizingH ? '1' : '0';
                      if (resizeVRef.current) resizeVRef.current.style.opacity = isResizingV ? '1' : '0';
                  }
              } else {
                  dosCursorRef.current.style.transform = `translate(${x}px, ${y}px)`;
                  dosCursorRef.current.style.opacity = shouldHide ? '0' : '1';
              }
          }

          else if (cursorRef.current) {
              if (canvas) ctx?.clearRect(0, 0, canvas.width, canvas.height);
              if (dosCursorRef.current) dosCursorRef.current.style.opacity = '0';

              const scale = isClicked ? 0.9 : 1;
              cursorRef.current.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
              cursorRef.current.style.opacity = shouldHide ? '0' : '1';
              
              if (x > 0 && cursorRef.current.style.display === 'none') {
                  cursorRef.current.style.display = 'block';
              }

              let showArrow = false;
              let showHand = false;
              let showGrab = false;
              let showCrosshair = false;
              let showRounded = false;
              let showResizeH = isResizingH;
              let showResizeV = isResizingV;

              if (showResizeH || showResizeV) {
                  // If resizing, ignore others
              } else if (isAppDragging) {
                  showGrab = true;
              } else if (isHovering) {
                  showHand = true;
              } else if (activeStyle === 'crosshair') {
                  showCrosshair = true;
              } else if (activeStyle === 'rounded') {
                  showRounded = true;
              } else {
                  showArrow = true;
              }

              if (crosshairRef.current) {
                  crosshairRef.current.style.transform = `translate(-12px, -12px) scale(1)`; 
              }

              if (arrowRef.current) arrowRef.current.style.opacity = showArrow ? '1' : '0';
              if (handRef.current) handRef.current.style.opacity = showHand ? '1' : '0';
              if (grabRef.current) grabRef.current.style.opacity = showGrab ? '1' : '0';
              if (crosshairRef.current) crosshairRef.current.style.opacity = showCrosshair ? '1' : '0';
              if (roundedRef.current) roundedRef.current.style.opacity = showRounded ? '1' : '0';
              
              if (resizeHRef.current) resizeHRef.current.style.opacity = showResizeH ? '1' : '0';
              if (resizeVRef.current) resizeVRef.current.style.opacity = showResizeV ? '1' : '0';
          }

          rAF = requestAnimationFrame(loop);
      };
      
      loop();
      return () => { cancelAnimationFrame(rAF); };
  }, [style, retroScreenStyle, analyser]); 

  // --- Determine Colors ---
  const getColorsForStyle = (s: string) => {
      if (s === 'theme-sync' || s === 'music-flow') return { primary: colors.primary, secondary: colors.secondary };
      if (s === 'classic-blue') return { primary: '#00f3ff', secondary: '#4d79ff' };
      if (s === 'classic-warm') return { primary: '#ffd700', secondary: '#ff8c00' };
      if (s === 'classic-ocean') return { primary: '#70C6D6', secondary: '#4B8CA8' };
      if (s === 'crosshair') return { primary: colors.primary, secondary: colors.secondary }; 
      if (s === 'rounded') return { primary: colors.primary, secondary: colors.secondary }; 
      return { primary: '#ffffff', secondary: '#808080' }; 
  };

  const globalColors = getColorsForStyle(style);
  const retroColors = getColorsForStyle(retroScreenStyle);

  const colorMapRef = useRef({ global: globalColors, retro: retroColors });
  useEffect(() => {
      colorMapRef.current = { global: getColorsForStyle(style), retro: getColorsForStyle(retroScreenStyle) };
  }, [style, retroScreenStyle, colors]);

  // Update loop to apply colors
  useEffect(() => {
      const loop = () => {
          const { isScreenHover } = mouseState;
          const activeStyle = isScreenHover ? retroScreenStyle : style;
          
          if (activeStyle !== 'default' && activeStyle !== 'dos-terminal' && activeStyle !== 'system' && cursorRef.current) {
              
              if (activeStyle === 'music-flow') {
                  // Special override for music flow crosshair to remain white
                  if (crosshairRef.current) crosshairRef.current.style.color = '#ffffff';
              } else {
                  const pal = isScreenHover ? colorMapRef.current.retro : colorMapRef.current.global;
                  const targets = [arrowRef.current, handRef.current, grabRef.current, crosshairRef.current, roundedRef.current, resizeHRef.current, resizeVRef.current];
                  targets.forEach(svg => {
                      if (svg) {
                          svg.style.color = pal.primary;
                      }
                  });
              }
          }
          requestAnimationFrame(loop);
      };
      const id = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(id);
  }, [style, retroScreenStyle]); 

  return createPortal(
    <>
        {/* CANVAS */}
        <canvas 
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[999999] mix-blend-screen"
        />

        {/* DOS */}
        <div 
            ref={dosCursorRef}
            className="fixed top-0 left-0 pointer-events-none z-[999999] will-change-transform mix-blend-difference"
            style={{ marginTop: '-10px', marginLeft: '-6px', opacity: 0 }} 
        >
            <div className="w-3 h-5 bg-white animate-[pulse_1s_steps(2)_infinite]"></div>
        </div>

        {/* SVG CONTAINER */}
        <div 
            ref={cursorRef}
            className="fixed top-0 left-0 pointer-events-none z-[999999] will-change-transform"
            style={{ marginTop: '-2px', marginLeft: '-2px', opacity: 0 }}
        >
            <svg ref={arrowRef} width="24" height="24" viewBox="0 0 24 24" className="absolute top-0 left-0 transition-opacity duration-200" style={{ overflow: 'visible' }}>
                <path d="M2 2 L14 14 L9 14 L12 20 L9 21 L6 15 L2 19 Z" fill="black" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>

            <svg ref={handRef} width="24" height="24" viewBox="0 0 24 24" className="absolute top-0 left-0 transition-opacity duration-200 opacity-0" style={{ transform: 'translate(-2px, -1px)', overflow: 'visible' }}>
                <path d={HAND_PATH_D} fill="#030712" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>

            <svg ref={grabRef} width="32" height="32" viewBox="0 0 24 24" className="absolute top-0 left-0 transition-opacity duration-200 opacity-0" style={{ transform: 'translate(-12px, -12px)', overflow: 'visible' }}>
                <path d={GRAB_PATH_D} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="#030712" />
            </svg>

            <svg ref={crosshairRef} width="24" height="24" viewBox="0 0 24 24" className="absolute top-0 left-0 transition-opacity duration-200 opacity-0" style={{ transform: 'translate(-12px, -12px)', overflow: 'visible' }}>
                {/* Standard Crosshair without Circle */}
                <line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" strokeWidth="2" />
                <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            </svg>

            <svg ref={roundedRef} width="24" height="24" viewBox="0 0 24 24" className="absolute top-0 left-0 transition-opacity duration-200 opacity-0" style={{ overflow: 'visible' }}>
                <path d={ROUNDED_PATH_D} fill="#030712" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>

            {/* NEW RESIZE HORIZONTAL */}
            <svg ref={resizeHRef} width="24" height="24" viewBox="0 0 24 24" className="absolute top-0 left-0 transition-opacity duration-200 opacity-0" style={{ transform: 'translate(-12px, -12px)', overflow: 'visible' }}>
                <path d={RESIZE_H_BOLD_D} fill="#030712" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>

            {/* NEW RESIZE VERTICAL */}
            <svg ref={resizeVRef} width="24" height="24" viewBox="0 0 24 24" className="absolute top-0 left-0 transition-opacity duration-200 opacity-0" style={{ transform: 'translate(-12px, -12px)', overflow: 'visible' }}>
                <path d={RESIZE_V_BOLD_D} fill="#030712" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
        </div>
    </>,
    document.body
  );
};

export default CustomCursor;
