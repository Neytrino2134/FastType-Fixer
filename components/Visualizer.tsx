
import React, { useEffect, useRef } from 'react';
import { NEON_COLORS, VisualizerConfig } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  config: VisualizerConfig;
  fps: number;
  volume: number; // NEW PROP
}

const Visualizer: React.FC<VisualizerProps> = ({ analyser, isPlaying, config, fps, volume }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastDrawTimeRef = useRef<number>(0);
  const { colors } = useTheme();
  
  // Храним предыдущие значения высоты столбцов для реализации плавного падения ("гравитации")
  const prevBarsRef = useRef<Float32Array | null>(null);
  // Храним высоту "верхушек" (tips)
  const tipBarsRef = useRef<Float32Array | null>(null);
  
  // Persistent data array to avoid reallocation
  const dataArrayRef = useRef<Uint8Array | null>(null);

  // SMOOTHING REFS FOR CONFIG TRANSITIONS
  const smoothVolRef = useRef<number>(1);
  const smoothNormRef = useRef({ bass: 1, mid: 1, treb: 1 });

  // --- STABLE REFS FOR PROPS ---
  // Store dynamic props in refs so the render loop can access latest values 
  // without triggering a useEffect restart.
  const configRef = useRef(config);
  const isPlayingRef = useRef(isPlaying);
  const volumeRef = useRef(volume);
  const colorsRef = useRef(colors);

  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { colorsRef.current = colors; }, [colors]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // alpha: true для прозрачного фона
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    lastDrawTimeRef.current = 0;

    const render = (timestamp: number) => {
      animationRef.current = requestAnimationFrame(render);

      // Access latest props via refs
      const cfg = configRef.current;
      const playing = isPlayingRef.current;
      const vol = volumeRef.current;
      const themeColors = colorsRef.current;

      // FPS Throttling
      const interval = 1000 / fps;
      const elapsed = timestamp - lastDrawTimeRef.current;
      if (elapsed < interval) return;
      lastDrawTimeRef.current = timestamp - (elapsed % interval);

      if (!canvas) return;
      
      // Update dimensions
      if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }

      const WIDTH = canvas.width;
      const HEIGHT = canvas.height;

      // CLEAR SCREEN
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // Инициализация массивов при первом запуске или изменении количества баров
      if (!prevBarsRef.current || prevBarsRef.current.length !== cfg.barCount) {
         prevBarsRef.current = new Float32Array(cfg.barCount).fill(0);
         tipBarsRef.current = new Float32Array(cfg.barCount).fill(0);
      }
      const prevBars = prevBarsRef.current;
      const tipBars = tipBarsRef.current!;

      // 1. DATA ACQUISITION
      // Мы инициализируем и обновляем данные всегда, если есть анализатор.
      if (analyser) {
         try {
             if (analyser.fftSize !== 4096) analyser.fftSize = 4096;
         } catch (e) { console.warn(e); }

         const bufferLength = analyser.frequencyBinCount;
         if (!dataArrayRef.current || dataArrayRef.current.length !== bufferLength) {
             dataArrayRef.current = new Uint8Array(bufferLength);
         }

         if (playing) {
            // Если играет музыка - берем данные с частот
            // Cast to any to avoid TS lib mismatch for Uint8Array types
            analyser.getByteFrequencyData(dataArrayRef.current as any);
         } else {
            // Если пауза - заполняем нулями
            if (dataArrayRef.current) dataArrayRef.current.fill(0);
         }
      }

      const dataArray = dataArrayRef.current;

      // Переменная для отслеживания, есть ли еще "энергия" в визуализации (не упали ли столбики)
      let maxActivity = 0;

      // 2. PHYSICS & DRAWING LOOP
      // Запускаем цикл, если есть массив данных (даже если он пустой/нулевой)
      if (analyser && dataArray) {
        const bufferLength = dataArray.length;
        const sampleRate = analyser.context.sampleRate;
        const binSize = sampleRate / 2 / bufferLength;
        
        // --- PHYSICS NORMALIZATION ---
        const fpsRatio = 60 / fps; 
        
        // --- МЯГКАЯ НОРМАЛИЗАЦИЯ (Soft Auto-Gain) ---
        let maxBass = 0;
        let maxMid = 0;
        let maxTreb = 0;

        const bassEnd = Math.floor(250 / binSize);   
        const midEnd = Math.floor(2000 / binSize);   

        // Вычисляем максимумы только если играет музыка, иначе скейлинг не важен (вход 0)
        if (playing) {
            for (let i = 0; i < bufferLength; i++) {
                const val = dataArray[i];
                if (i < bassEnd) maxBass = Math.max(maxBass, val);
                else if (i < midEnd) maxMid = Math.max(maxMid, val);
                else maxTreb = Math.max(maxTreb, val);
            }
        } else {
            // Чтобы при паузе скейлинг не прыгал, ставим дефолтные значения
            maxBass = 150; maxMid = 100; maxTreb = 80;
        }

        // --- SMOOTH CONFIG TRANSITIONS ---
        
        // 1. VOLUME SMOOTHING
        // Target is 1.0 if ignoring volume, else actual volume
        const targetVolFactor = cfg.preventVolumeScaling ? 1.0 : vol;
        smoothVolRef.current += (targetVolFactor - smoothVolRef.current) * 0.1; // 10% per frame

        // 2. NORMALIZE SMOOTHING
        let targetBassScale = 1;
        let targetMidScale = 1;
        let targetTrebScale = 1;

        if (cfg.normalize) {
            targetBassScale = 255 / Math.max(150, maxBass); 
            targetMidScale = 255 / Math.max(100, maxMid);    
            targetTrebScale = 255 / Math.max(80, maxTreb);
        }

        const normLerp = 0.05; // 5% per frame (slower for normalization stability)
        smoothNormRef.current.bass += (targetBassScale - smoothNormRef.current.bass) * normLerp;
        smoothNormRef.current.mid += (targetMidScale - smoothNormRef.current.mid) * normLerp;
        smoothNormRef.current.treb += (targetTrebScale - smoothNormRef.current.treb) * normLerp;


        const barCount = cfg.barCount;
        
        // --- FREQUENCY MAPPING ---
        const minHz = 20 + (cfg.minFrequency * 40); 
        const maxHz = minHz + 500 + (cfg.maxFrequency * 180);

        const logMin = Math.log10(minHz);
        const logMax = Math.log10(maxHz);

        for (let i = 0; i < barCount; i++) {
            // --- MAPPING LOGIC ---
            const t = i / (barCount - 1);
            const adjustedT = Math.pow(t, 0.6);
            const freq = Math.pow(10, logMin + (adjustedT * (logMax - logMin)));
            const rawIndex = freq / binSize;
            let index = Math.floor(rawIndex);
            index = Math.max(0, Math.min(bufferLength - 1, index));

            // Получение значения
            let rawValue = dataArray[index];
            
            // Сглаживание пиков (Peak Sampling)
            if (index > bassEnd) {
                const nextT = Math.pow((i + 1) / (barCount - 1), 0.6);
                const nextFreq = Math.pow(10, logMin + (nextT * (logMax - logMin)));
                const nextIndex = Math.floor(nextFreq / binSize);
                const range = nextIndex - index;
                if (range > 1) {
                    let maxInRange = 0;
                    // Берем среднее значение для сглаживания "дерганья", или макс для резкости
                    // Для динамики лучше Max
                    for (let k = 0; k < range && (index + k) < bufferLength; k++) {
                        maxInRange = Math.max(maxInRange, dataArray[index + k]);
                    }
                    rawValue = maxInRange;
                }
            }

            // --- APPLY VOLUME SCALING (SMOOTHED) ---
            rawValue *= smoothVolRef.current;

            // --- APPLY NORMALIZATION (SMOOTHED) ---
            let scaledValue = rawValue;
            if (index < bassEnd) scaledValue *= smoothNormRef.current.bass;
            else if (index < midEnd) scaledValue *= smoothNormRef.current.mid;
            else scaledValue *= smoothNormRef.current.treb;
            
            // --- DYNAMIC RANGE EXPANSION (FIX FOR "COMPRESSED" LOOK) ---
            // 1. Нормализуем значение от 0 до 1
            let ratio = scaledValue / 255;

            // 2. Применяем экспоненциальную кривую. 
            // Это "прижимает" тихие звуки (шум) к низу, а громкие оставляет наверху.
            // Power 2.5: Вход 0.5 (середина) -> Выход 0.17 (низ). Вход 1.0 -> Выход 1.0.
            const powerCurve = 2.5; 
            ratio = Math.pow(ratio, powerCurve);

            // 3. Восстанавливаем амплитуду и применяем Sensitivity
            // Так как мы "прижали" сигнал, нужно немного компенсировать общую высоту (x1.2)
            ratio *= (cfg.sensitivity * 1.2);

            // 4. Легкий буст высоких частот, чтобы правая часть не проваливалась совсем,
            // но гораздо меньше чем раньше (0.8 -> 0.3), чтобы не было "стены".
            ratio *= (1 + (i / barCount) * 0.3);

            // 5. Вычисляем финальную высоту с мягким клиппингом (tanh)
            // tanh позволяет сигналу "насыщаться" у верха экрана, не обрезаясь жестко
            // If CIRCLE, max height should be limited to radius/screen size
            const maxDrawHeight = cfg.position === 'circle' ? (Math.min(WIDTH, HEIGHT) / 3) : HEIGHT;
            
            let barHeight = maxDrawHeight * Math.tanh(ratio);
            
            if (barHeight < 2 && cfg.strokeEnabled && scaledValue > 5) barHeight = 2; // Min height for visibility
            if (scaledValue < 5) barHeight = 0; // Noise gate

            // 4. ФИЗИКА БАРА (Attack / Decay)
            // Dynamic Decay based on barGravity config (0-10)
            // Default (5) -> 0.73. High Gravity (10) -> 0.48 (Fast). Low Gravity (0) -> 0.98 (Slow).
            const gravityInput = cfg.barGravity ?? 5;
            const baseDecay = Math.max(0.1, 0.98 - (gravityInput * 0.05));
            
            const decay = Math.pow(baseDecay, fpsRatio);

            let finalValue = prevBars[i] * decay; 
            if (barHeight > finalValue) {
                finalValue = barHeight;
            }
            prevBars[i] = finalValue;
            
            // Используем сглаженное значение для отрисовки
            barHeight = finalValue;

            // --- ФИЗИКА ВЕРХУШКИ ---
            if (cfg.showTips) {
                let tipH = tipBars[i];
                if (barHeight > tipH) {
                    tipH = barHeight;
                } else {
                    const gravityBase = (cfg.tipSpeed || 15) / 1000;
                    const gravity = (HEIGHT * gravityBase) * fpsRatio; 
                    tipH -= gravity;
                }
                if (tipH < 0) tipH = 0;
                tipBars[i] = tipH;
                
                maxActivity = Math.max(maxActivity, tipH);
            }
            
            maxActivity = Math.max(maxActivity, barHeight);

            // Если высота 0, не рисуем этот бар
            if (barHeight < 0.5 && (!cfg.showTips || tipBars[i] < 0.5)) continue;

            // --- DRAWING POSITION ---
            let barWidth = 0;
            let startX = 0;

            if (cfg.mirror && cfg.position !== 'circle') {
                barWidth = (WIDTH / 2) / cfg.barCount;
                startX = WIDTH / 2;
            } else if (cfg.position === 'circle') {
                // Circle specific width calc done inside drawing loop below if needed, 
                // but generally circle bars are drawn with fixed width or angular width.
                // We use standard width logic, but drawn radially.
                // Circumference = 2 * PI * Radius.
                const radius = Math.min(WIDTH, HEIGHT) / 4;
                const circumference = 2 * Math.PI * radius;
                barWidth = circumference / cfg.barCount; 
            } else {
                barWidth = WIDTH / cfg.barCount;
                startX = 0;
            }

            let y = 0;
            const getY = (h: number) => {
                switch (cfg.position) {
                    case 'top': return 0;
                    case 'bottom': return HEIGHT - h;
                    case 'center': return (HEIGHT / 2) - (h / 2);
                    default: return HEIGHT - h;
                }
            };
            y = getY(barHeight);

             // Color Logic
            let color: string | CanvasGradient = '#fff';
            switch (cfg.style) {
              case 'blue': color = '#00f3ff'; break;
              case 'pink': color = '#ff00ff'; break;
              case 'warm': color = '#fbbf24'; break; // Amber
              case 'gray': color = '#d4d4d4'; break; // Neutral Gray
              case 'ocean': color = '#4B8CA8'; break; // Ocean Teal
              case 'theme-blue': color = '#3b82f6'; break; // Royal Blue
              case 'theme-sync': color = themeColors.primary; break; // NEW: Theme Sync
              case 'neon-gradient':
                 // Per-bar gradient relative to height
                 if (cfg.position === 'center') {
                     // Blue (Top) -> Pink (Center) -> Blue (Bottom)
                     const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
                     gradient.addColorStop(0, '#00f3ff');
                     gradient.addColorStop(0.5, '#ff00ff');
                     gradient.addColorStop(1, '#00f3ff');
                     color = gradient;
                 } else if (cfg.position === 'top') {
                     // Pink (Base/Top) -> Blue (Tip/Bottom)
                     const gradient = ctx.createLinearGradient(0, 0, 0, barHeight);
                     gradient.addColorStop(0, '#ff00ff');
                     gradient.addColorStop(1, '#00f3ff');
                     color = gradient;
                 } else if (cfg.position === 'circle') {
                     // Gradient from center out
                     // We create generic vertical gradient that gets rotated
                     const radius = Math.min(WIDTH, HEIGHT) / 4;
                     const gradient = ctx.createLinearGradient(0, radius, 0, radius + barHeight);
                     gradient.addColorStop(0, '#ff00ff');
                     gradient.addColorStop(1, '#00f3ff');
                     color = gradient;
                 } else {
                     // Bottom (Default)
                     // Pink (Base/Bottom) -> Blue (Tip/Top)
                     const gradient = ctx.createLinearGradient(0, HEIGHT, 0, HEIGHT - barHeight);
                     gradient.addColorStop(0, '#ff00ff');
                     gradient.addColorStop(1, '#00f3ff');
                     color = gradient;
                 }
                 break;
              case 'matrix':
                 // Dynamic green brightness
                 const intensity = Math.min(255, (barHeight / HEIGHT) * 255 + 50);
                 color = `rgb(0, ${intensity}, 0)`;
                 break;
              case 'inferno':
                 const hue = (barHeight / HEIGHT) * 60; 
                 color = `hsl(${hue}, 100%, 50%)`;
                 break;
              case 'retro':
              default:
                const colorIndex = i % NEON_COLORS.length;
                color = NEON_COLORS[colorIndex];
                break;
            }

            const gap = cfg.barGap;
            const drawWidth = Math.max(0.5, barWidth - gap);

            // --- DRAW BAR HELPER ---
            const drawBar = (bx: number, by: number, bw: number, bh: number) => {
                 if (bh <= 0) return;
                 ctx.fillStyle = color;
                 
                 if (cfg.segmented) {
                     const segHeight = cfg.segmentHeight || 4; 
                     const segGap = cfg.segmentGap || 2;       
                     const unit = segHeight + segGap;
                     const segments = Math.floor(bh / unit);
                     
                     if (segments === 0) return;

                     const drawSegment = (sy: number, isLast: boolean) => {
                        // Apply Highlighting logic for last brick
                        if (isLast && cfg.highlightLastBrick) {
                            ctx.fillStyle = '#ffffff'; // White for highlight
                            ctx.globalAlpha = 1.0;
                            ctx.shadowBlur = 5;
                            // shadowColor needs a string, if gradient used, fallback to white or primary
                            if (typeof color === 'string') {
                                ctx.shadowColor = color;
                            } else {
                                ctx.shadowColor = '#ffffff';
                            }
                        } else {
                            ctx.fillStyle = color;
                            ctx.globalAlpha = cfg.fillOpacity;
                            ctx.shadowBlur = 0;
                        }

                        ctx.fillRect(bx, sy, bw, segHeight);
                        
                        if (cfg.strokeEnabled && (!isLast || !cfg.highlightLastBrick)) {
                            ctx.strokeStyle = color;
                            ctx.lineWidth = 1;
                            ctx.globalAlpha = cfg.strokeOpacity;
                            ctx.strokeRect(bx, sy, bw, segHeight);
                        }
                     };

                     if (cfg.position === 'bottom') {
                         for (let s = 0; s < segments; s++) {
                             const sy = HEIGHT - segHeight - (s * unit);
                             const isLast = s === segments - 1;
                             drawSegment(sy, isLast);
                         }
                     } else if (cfg.position === 'center') {
                         const mid = HEIGHT / 2;
                         const halfSegments = Math.ceil(segments / 2);
                         for (let s = 0; s < halfSegments; s++) {
                             const sy = mid - (segGap / 2) - segHeight - (s * unit);
                             const isLast = s === halfSegments - 1;
                             drawSegment(sy, isLast);
                         }
                         for (let s = 0; s < halfSegments; s++) {
                             const sy = mid + (segGap / 2) + (s * unit);
                             const isLast = s === halfSegments - 1;
                             drawSegment(sy, isLast);
                         }
                     } else if (cfg.position === 'circle') {
                         // CIRCLE SEGMENTS
                         // We are already rotated, so 'by' is start Y (radius)
                         // We draw outwards
                         for (let s = 0; s < segments; s++) {
                             const sy = by + (s * unit);
                             const isLast = s === segments - 1;
                             drawSegment(sy, isLast);
                         }
                     } else {
                         // TOP
                         for (let s = 0; s < segments; s++) {
                             const isLast = s === segments - 1;
                             drawSegment(by + (s * unit), isLast);
                         }
                     }
                 } else {
                     // NORMAL BAR
                     ctx.fillStyle = color;
                     ctx.globalAlpha = cfg.fillOpacity;
                     ctx.fillRect(bx, by, bw, bh);
                     if (cfg.strokeEnabled) {
                        ctx.strokeStyle = color;
                        ctx.lineWidth = 1;
                        ctx.globalAlpha = cfg.strokeOpacity;
                        ctx.strokeRect(bx, by, bw, bh);
                     }
                 }
            };

            // --- RENDER BARS ---
            if (cfg.position === 'circle') {
                const centerX = WIDTH / 2;
                const centerY = HEIGHT / 2;
                const radius = Math.min(WIDTH, HEIGHT) / 4;
                const angle = (i / barCount) * (Math.PI * 2) - (Math.PI / 2); // Start top (-90deg)

                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.rotate(angle);
                
                // Draw bar radiating out from radius
                drawBar(-drawWidth / 2, radius, drawWidth, barHeight);

                // --- RENDER TIPS (CIRCLE) ---
                if (cfg.showTips) {
                    const tipH = tipBars[i];
                    if (tipH > 2) {
                        const tipThickness = cfg.tipHeight || 2; 
                        const tipColorMap: Record<string, string> = {
                            white: '#ffffff', blue: '#00f3ff', pink: '#ff00ff',
                            green: '#00ff00', purple: '#bc13fe', yellow: '#f9f871', red: '#ff3333'
                        };
                        const selectedColor = tipColorMap[cfg.tipColor || 'white'] || '#ffffff';
                        
                        ctx.fillStyle = selectedColor; 
                        ctx.globalAlpha = Math.min(1, cfg.fillOpacity + 0.4);
                        if (cfg.tipGlow) {
                            ctx.shadowBlur = 10;
                            ctx.shadowColor = selectedColor;
                        } else {
                            ctx.shadowBlur = 0;
                        }

                        const tipY = radius + tipH + 2; 
                        ctx.fillRect(-drawWidth / 2, tipY, drawWidth, tipThickness);
                        ctx.shadowBlur = 0;
                    }
                }
                ctx.restore();

            } else if (cfg.mirror) {
                const xRight = startX + (i * barWidth) + (gap / 2);
                drawBar(xRight, y, drawWidth, barHeight);
                const xLeft = startX - ((i + 1) * barWidth) + (gap / 2);
                drawBar(xLeft, y, drawWidth, barHeight);
            } else {
                const x = (i * barWidth) + (gap / 2);
                drawBar(x, y, drawWidth, barHeight);
            }

            // --- RENDER TIPS (LINEAR) ---
            if (cfg.showTips && cfg.position !== 'circle') {
                const tipH = tipBars[i];
                if (tipH > 2) {
                    const tipThickness = cfg.tipHeight || 2; 
                    
                    // TIP COLOR & GLOW LOGIC
                    const tipColorMap: Record<string, string> = {
                        white: '#ffffff',
                        blue: '#00f3ff',
                        pink: '#ff00ff',
                        green: '#00ff00',
                        purple: '#bc13fe',
                        yellow: '#f9f871',
                        red: '#ff3333'
                    };
                    const selectedColor = tipColorMap[cfg.tipColor || 'white'] || '#ffffff';
                    
                    ctx.fillStyle = selectedColor; 
                    ctx.globalAlpha = Math.min(1, cfg.fillOpacity + 0.4);

                    if (cfg.tipGlow) {
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = selectedColor;
                    } else {
                        ctx.shadowBlur = 0;
                    }

                    // Tip Position Calculation
                    let tipY = 0;
                    if (cfg.position === 'bottom') tipY = HEIGHT - tipH - tipThickness - 1; 
                    else if (cfg.position === 'top') tipY = tipH + 1;
                    else if (cfg.position === 'center') {
                         const center = HEIGHT / 2;
                         const topTipY = center - (tipH / 2) - tipThickness - 1;
                         const bottomTipY = center + (tipH / 2) + 1;
                         
                         if (cfg.mirror) {
                            const xRight = startX + (i * barWidth) + (gap / 2);
                            const xLeft = startX - ((i + 1) * barWidth) + (gap / 2);
                            ctx.fillRect(xRight, topTipY, drawWidth, tipThickness);
                            ctx.fillRect(xRight, bottomTipY, drawWidth, tipThickness);
                            ctx.fillRect(xLeft, topTipY, drawWidth, tipThickness);
                            ctx.fillRect(xLeft, bottomTipY, drawWidth, tipThickness);
                        } else {
                            const x = (i * barWidth) + (gap / 2);
                            ctx.fillRect(x, topTipY, drawWidth, tipThickness);
                            ctx.fillRect(x, bottomTipY, drawWidth, tipThickness);
                        }
                        ctx.shadowBlur = 0; // Reset shadow for next loop
                        continue;
                    }

                    if (cfg.mirror) {
                        const xRight = startX + (i * barWidth) + (gap / 2);
                        const xLeft = startX - ((i + 1) * barWidth) + (gap / 2);
                        ctx.fillRect(xRight, tipY, drawWidth, tipThickness);
                        ctx.fillRect(xLeft, tipY, drawWidth, tipThickness);
                    } else {
                         const x = (i * barWidth) + (gap / 2);
                         ctx.fillRect(x, tipY, drawWidth, tipThickness);
                    }
                    
                    ctx.shadowBlur = 0; // Reset shadow
                }
            }
        }
      }

      // 3. IDLE LINE
      if (!playing && maxActivity < 2) {
        ctx.beginPath();
        if (cfg.position === 'circle') {
            const centerX = WIDTH / 2;
            const centerY = HEIGHT / 2;
            const radius = Math.min(WIDTH, HEIGHT) / 4;
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        } else {
            let yLine = HEIGHT / 2;
            if (cfg.position === 'top') yLine = 10;
            if (cfg.position === 'bottom') yLine = HEIGHT - 10;
            ctx.moveTo(0, yLine);
            ctx.lineTo(WIDTH, yLine);
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        if (maxActivity < 0.1) {
             if (prevBarsRef.current) prevBarsRef.current.fill(0);
             if (tipBarsRef.current) tipBarsRef.current.fill(0);
        }
      }
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, fps]); // Depend ONLY on analyzer (ref) and fps (static)

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full z-10 pointer-events-none"
    />
  );
};

export default Visualizer;
