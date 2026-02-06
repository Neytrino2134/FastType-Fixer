import React, { useRef, useEffect, useLayoutEffect, memo } from 'react';

interface VisualizerCanvasProps {
    visualizerDataRef: React.MutableRefObject<Uint8Array | null>;
    isRecording: boolean;
    lowCut?: number;
    highCut?: number;
    amp?: number;
    visualizerStyle?: 'classic' | 'bars' | 'circular' | 'wave';
    silenceThreshold?: number;
    norm?: boolean;
    gravity?: number;
    mirror?: boolean;
    rounded?: boolean; // Enable rounded curves for wave style
}

const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;

export const VisualizerCanvas = memo<VisualizerCanvasProps>(({ 
    visualizerDataRef, 
    isRecording, 
    lowCut = 0, 
    highCut = 128, 
    amp = 0.4, 
    visualizerStyle = 'classic',
    silenceThreshold = 15,
    norm = false,
    gravity = 2.0,
    mirror = false,
    rounded = false
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    // Store config in ref to read inside animation loop without restarting it
    const configRef = useRef({ lowCut, highCut, amp, visualizerStyle, silenceThreshold, norm, gravity, mirror, rounded });
    
    // Animation state
    const animRef = useRef({
      volBass: 0,
      volMid: 0,
      volHigh: 0,
      phaseFront: 0,
      phaseMid: 0,
      phaseBack: 0,
      waveAlpha: 0
    });

    // Bars state for Gravity history
    const barsRef = useRef<number[]>([]);
    
    // Sync config refs
    useEffect(() => {
        configRef.current = { lowCut, highCut, amp, visualizerStyle, silenceThreshold, norm, gravity, mirror, rounded };
    }, [lowCut, highCut, amp, visualizerStyle, silenceThreshold, norm, gravity, mirror, rounded]);

    // OPTIMIZED RESIZE OBSERVER
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !canvas.parentElement) return;

        let rafId: number | null = null;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                 // Use requestAnimationFrame to throttle resize events
                 // This prevents thrashing the canvas buffer on every pixel change
                 if (rafId) cancelAnimationFrame(rafId);
                 
                 rafId = requestAnimationFrame(() => {
                     const { width, height } = entry.contentRect;
                     // Only resize if dimensions actually changed
                     if (canvas.width !== Math.floor(width) || canvas.height !== Math.floor(height)) {
                         canvas.width = Math.floor(width);
                         canvas.height = Math.floor(height);
                     }
                 });
            }
        });

        observer.observe(canvas.parentElement);
        return () => {
            observer.disconnect();
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, []);

    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        // Init bars array if needed
        if (barsRef.current.length === 0) {
            barsRef.current = new Array(256).fill(0);
        }

        let animationFrameId: number;

        const render = () => {
            const width = canvas.width;
            const height = canvas.height;
            const centerX = width / 2;
            const centerY = height / 2;

            ctx.clearRect(0, 0, width, height);

            const { lowCut: lc, highCut: hc, amp: am, visualizerStyle: st, norm, gravity, silenceThreshold, mirror, rounded } = configRef.current;

            // Alpha Fade Logic for recording state
            const targetAlpha = isRecording ? 1 : 0;
            animRef.current.waveAlpha = lerp(animRef.current.waveAlpha, targetAlpha, 0.1);

            if (animRef.current.waveAlpha < 0.01) {
                animationFrameId = requestAnimationFrame(render);
                return;
            }

            const dataArray = visualizerDataRef.current;
            if (!dataArray) {
                 animationFrameId = requestAnimationFrame(render);
                 return;
            }

            const globalAlpha = animRef.current.waveAlpha;
            const thresh = (silenceThreshold || 0) / 100.0;

            if (st === 'classic') {
                let rawBass = 0, rawMid = 0, rawHigh = 0;
                let countBass = 0, countMid = 0, countHigh = 0;

                for(let i = 0; i < dataArray.length; i++) {
                    if (i < lc || i > hc) continue;
                    let v = dataArray[i] / 255.0;
                    
                    // NOISE GATE
                    if (v < thresh) {
                        v = 0;
                    } else {
                        // Shift down so wave starts at 0 relative to threshold
                        v = (v - thresh) / (1 - thresh);
                    }

                    if (norm && v > 0) v = Math.pow(v, 0.6); // Normalize

                    if (v < 0.05) v = 0;

                    if (i <= 5) { rawBass += v; countBass++; } 
                    else if (i <= 30) { rawMid += v; countMid++; } 
                    else { rawHigh += v; countHigh++; }
                }
                if (countBass > 0) rawBass /= countBass;
                if (countMid > 0) rawMid /= countMid;
                if (countHigh > 0) rawHigh /= countHigh;
   
                const targetBass = Math.max(0.1, rawBass * 6);
                const targetMid  = Math.max(0.05, rawMid * 5);
                const targetHigh = Math.max(0.02, rawHigh * 3);
   
                const decaySpeed = gravity * 0.1;

                animRef.current.volBass = lerp(animRef.current.volBass, targetBass, targetBass > animRef.current.volBass ? 0.2 : decaySpeed);
                animRef.current.volMid  = lerp(animRef.current.volMid, targetMid, targetMid > animRef.current.volMid ? 0.2 : decaySpeed);
                animRef.current.volHigh = lerp(animRef.current.volHigh, targetHigh, targetHigh > animRef.current.volHigh ? 0.2 : decaySpeed);
   
                animRef.current.phaseBack  += 0.003;
                animRef.current.phaseMid   += 0.01;
                animRef.current.phaseFront += 0.03;
   
                const layers = [
                    { color: `rgba(56, 189, 248, ${0.3 * globalAlpha})`, lineWidth: 2, amplitudeMod: 0.8, freqMod: 0.8, phase: animRef.current.phaseBack, volume: animRef.current.volBass, phaseOffset: 0 },
                    { color: `rgba(168, 85, 247, ${0.5 * globalAlpha})`, lineWidth: 3, amplitudeMod: 0.9, freqMod: 1.0, phase: animRef.current.phaseMid, volume: animRef.current.volMid, phaseOffset: 2 },
                    { color: `rgba(99, 102, 241, ${0.9 * globalAlpha})`, lineWidth: 2, amplitudeMod: 1.1, freqMod: 0.8, phase: animRef.current.phaseFront, volume: animRef.current.volHigh, phaseOffset: 4 }
                ];
   
                layers.forEach((layer) => {
                    ctx.beginPath();
                    ctx.strokeStyle = layer.color;
                    ctx.lineWidth = layer.lineWidth;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    let started = false;
                    for (let x = 0; x <= width; x += 2) {
                        const normX = (x / width) * 2 - 1;
                        const envelope = Math.pow(1 - Math.abs(normX), 3);
                        const carrierY = Math.sin(x * 0.01 * layer.freqMod + layer.phase + layer.phaseOffset);
                        const compression = 1 + (layer.volume * 2);
                        const vibration = Math.sin(x * 0.1 * compression + layer.phase * 5);
                        const signal = (carrierY * 0.5 + vibration * 0.8) * (layer.volume * (height * 0.4) * layer.amplitudeMod * am);
                        const y = centerY + signal * envelope;
                        if (!started) { ctx.moveTo(x, y); started = true; } 
                        else { ctx.lineTo(x, y); }
                    }
                    ctx.stroke();
                });

            } else if (st === 'bars') {
                 const range = hc - lc;
                 // If mirror, we show fewer bars to keep width reasonable, or squeeze them
                 const barCount = mirror ? Math.floor(range / 2) : Math.floor(range / 2);
                 const totalWidth = mirror ? width / 2 : width;
                 const barWidth = totalWidth / barCount;
                 
                 const decay = gravity * 0.02;

                 for (let i = 0; i < barCount; i++) {
                    const freqIndex = lc + (i * 2); 
                    if (freqIndex >= dataArray.length) break;

                    let val = (dataArray[freqIndex] / 255);
                    
                    if (val < thresh) val = 0; else val = (val - thresh) / (1 - thresh);
                    if (norm && val > 0) val = Math.pow(val, 0.6);

                    const targetH = val * height * 0.8 * am;
                    const prevH = barsRef.current[i] || 0;
                    
                    let currentH = prevH;
                    if (targetH > prevH) currentH = targetH;
                    else currentH = lerp(prevH, targetH, decay);
                    barsRef.current[i] = currentH;

                    const hue = i * 2 + 200;
                    ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${globalAlpha})`;
                    
                    // CENTERED DRAWING
                    // We draw the bar centered vertically (centerY - H/2)
                    
                    if (mirror) {
                        const xOffset = i * barWidth;
                        // Right Side
                        ctx.fillRect(centerX + xOffset, centerY - (currentH / 2), barWidth - 1, currentH);
                        // Left Side
                        ctx.fillRect(centerX - xOffset - barWidth, centerY - (currentH / 2), barWidth - 1, currentH);
                    } else {
                        const x = i * barWidth;
                        ctx.fillRect(x, centerY - (currentH / 2), barWidth - 1, currentH);
                    }
                 }
            } else if (st === 'circular') {
                 const radius = Math.min(width, height) * 0.2;
                 const range = hc - lc;
                 
                 // Optimization: Reduce resolution for smoother look in editor
                 // Step by 2 or 3 indexes to reduce thin lines
                 const stepIdx = 2; 
                 const loopCount = Math.floor(range / stepIdx);
                 
                 const decay = gravity * 0.02;
                 
                 // Angle setup
                 const angleStep = mirror ? (Math.PI / loopCount) : (2 * Math.PI / loopCount);
                 // Rotation fix: Start at Bottom (0 degrees relative to rotated Y axis down)
                 const startAngle = 0;

                 ctx.translate(centerX, centerY);
                 
                 for (let i = 0; i < loopCount; i++) {
                    const freqIndex = lc + (i * stepIdx);
                    if (freqIndex >= dataArray.length) break;

                    let val = (dataArray[freqIndex] / 255);
                    if (val < thresh) val = 0; else val = (val - thresh) / (1 - thresh);
                    if (norm && val > 0) val = Math.pow(val, 0.6);

                    const targetH = val * (Math.min(width, height) * 0.3) * am;
                    const prevH = barsRef.current[i] || 0;
                    let currentH = prevH;
                    if (targetH > prevH) currentH = targetH;
                    else currentH = lerp(prevH, targetH, decay);
                    barsRef.current[i] = currentH;

                    const hue = i * 3 + 240;
                    ctx.fillStyle = `hsla(${hue}, 90%, 65%, ${globalAlpha})`;
                    
                    // Thicker bars because we reduced count
                    const barW = mirror ? 3 : 2; 

                    if (mirror) {
                        const offset = i * angleStep;
                        
                        // Right Side (Bottom -> Right -> Top)
                        ctx.save();
                        ctx.rotate(startAngle - offset);
                        ctx.fillRect(0, radius, barW, currentH);
                        ctx.restore();

                        // Left Side (Bottom -> Left -> Top)
                        ctx.save();
                        ctx.rotate(startAngle + offset);
                        ctx.fillRect(0, radius, barW, currentH);
                        ctx.restore();
                    } else {
                        const angle = i * angleStep;
                        ctx.save();
                        ctx.rotate(startAngle + angle);
                        ctx.fillRect(0, radius, barW, currentH);
                        ctx.restore();
                    }
                 }
                 ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
            } else if (st === 'wave') {
                 ctx.beginPath();
                 ctx.strokeStyle = `rgba(99, 102, 241, ${globalAlpha})`;
                 ctx.lineWidth = 2;
                 ctx.lineJoin = 'round';
                 ctx.lineCap = 'round';
                 
                 const range = hc - lc;
                 
                 // Helper to calculate wave point
                 const getWavePoint = (index: number, x: number, dir: number = 1) => {
                     let val = (dataArray[lc + index] / 255);
                     if (val < thresh) val = 0; else val = (val - thresh) / (1 - thresh);
                     if (norm && val > 0) val = Math.pow(val, 0.6);
                     const yOffset = val * (height * 0.4) * am;
                     // Alternate direction for "wave" effect on sample points
                     const altDir = index % 2 === 0 ? 1 : -1;
                     return {
                         x: x,
                         y: centerY + (yOffset * altDir * dir)
                     };
                 };

                 const drawPoints = (points: {x: number, y: number}[]) => {
                     if (points.length < 2) return;
                     ctx.moveTo(points[0].x, points[0].y);
                     
                     if (rounded) {
                         // Quadratic Curve Interpolation
                         for (let i = 1; i < points.length - 2; i++) {
                             const xc = (points[i].x + points[i + 1].x) / 2;
                             const yc = (points[i].y + points[i + 1].y) / 2;
                             ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
                         }
                         // Last 2 points
                         if (points.length > 2) {
                             ctx.quadraticCurveTo(
                                 points[points.length - 2].x,
                                 points[points.length - 2].y,
                                 points[points.length - 1].x,
                                 points[points.length - 1].y
                             );
                         } else {
                             ctx.lineTo(points[1].x, points[1].y);
                         }
                     } else {
                         // Linear (Triangular)
                         for (let i = 1; i < points.length; i++) {
                             ctx.lineTo(points[i].x, points[i].y);
                         }
                     }
                 };

                 if (mirror) {
                     const sliceWidth = (width / 2) / range;
                     
                     // Right Side
                     const rightPoints = [];
                     for (let i = 0; i < range; i++) {
                         rightPoints.push(getWavePoint(i, centerX + (i * sliceWidth)));
                     }
                     drawPoints(rightPoints);
                     
                     // Left Side
                     const leftPoints = [];
                     for (let i = 0; i < range; i++) {
                         leftPoints.push(getWavePoint(i, centerX - (i * sliceWidth)));
                     }
                     // Force start from center for left side to ensure connectivity visually
                     if (leftPoints.length > 0) {
                         ctx.moveTo(centerX, centerY); 
                         drawPoints(leftPoints);
                     }
                 } else {
                     const sliceWidth = width / range;
                     const points = [];
                     let x = 0;
                     for (let i = 0; i < range; i++) {
                         points.push(getWavePoint(i, x));
                         x += sliceWidth;
                     }
                     drawPoints(points);
                 }
                 ctx.stroke();
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, [isRecording, visualizerDataRef]);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-80" />;
});