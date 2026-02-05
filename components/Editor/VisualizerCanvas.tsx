
import React, { useRef, useEffect, useLayoutEffect, memo } from 'react';

interface VisualizerCanvasProps {
    visualizerDataRef: React.MutableRefObject<Uint8Array | null>;
    isRecording: boolean;
    lowCut?: number;
    highCut?: number;
    amp?: number;
    visualizerStyle?: 'classic' | 'bars' | 'circular' | 'wave';
}

const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;

export const VisualizerCanvas = memo<VisualizerCanvasProps>(({ 
    visualizerDataRef, 
    isRecording, 
    lowCut = 2, 
    highCut = 60, 
    amp = 1, 
    visualizerStyle = 'classic' 
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    // Store config in ref to read inside animation loop without restarting it
    const configRef = useRef({ lowCut, highCut, amp, visualizerStyle });
    
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
    
    const recordingStartRef = useRef(0);

    // Sync config refs
    useEffect(() => {
        configRef.current = { lowCut, highCut, amp, visualizerStyle };
    }, [lowCut, highCut, amp, visualizerStyle]);

    // Track recording start time for warm-up animation
    useEffect(() => {
        if (isRecording) {
            recordingStartRef.current = Date.now();
        }
    }, [isRecording]);

    // OPTIMIZATION: Use ResizeObserver instead of checking offsetWidth in the loop.
    // This prevents layout thrashing (forced reflow) on every frame.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !canvas.parentElement) return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                 const { width, height } = entry.contentRect;
                 canvas.width = width;
                 canvas.height = height;
            }
        });

        observer.observe(canvas.parentElement);
        return () => observer.disconnect();
    }, []);

    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const render = () => {
            const width = canvas.width;
            const height = canvas.height;
            const centerX = width / 2;
            const centerY = height / 2;

            ctx.clearRect(0, 0, width, height);

            // Read latest config
            const { lowCut: lc, highCut: hc, amp: am, visualizerStyle: st } = configRef.current;

            let warmUpFactor = 1;
            if (isRecording) {
                const elapsed = Date.now() - recordingStartRef.current;
                const warmUpDuration = 500; 
                if (elapsed < warmUpDuration) {
                    const progress = elapsed / warmUpDuration;
                    warmUpFactor = progress * progress * (3 - 2 * progress);
                }
            } else {
                warmUpFactor = 0;
            }

            // Alpha Fade Logic
            const targetAlpha = isRecording ? 1 : 0;
            animRef.current.waveAlpha = lerp(animRef.current.waveAlpha, targetAlpha, 0.08);

            // Optimization: Stop drawing if invisible
            if (animRef.current.waveAlpha < 0.01) {
                animationFrameId = requestAnimationFrame(render);
                return;
            }

            const dataArray = visualizerDataRef.current;
            const globalAlpha = animRef.current.waveAlpha;
            const globalVol = (animRef.current.volBass + animRef.current.volMid + animRef.current.volHigh) / 3;

            if (st === 'classic') {
                let rawBass = 0, rawMid = 0, rawHigh = 0;
                if (dataArray && dataArray.length > 0) {
                   let countBass = 0, countMid = 0, countHigh = 0;
                   for(let i = 0; i < dataArray.length; i++) {
                       if (i < lc || i > hc) continue;
                       let val = dataArray[i] / 255.0;
                       if (val < 0.05) val = 0; 
                       if (i <= 5) { rawBass += val; countBass++; } 
                       else if (i <= 30) { rawMid += val; countMid++; } 
                       else { rawHigh += val; countHigh++; }
                   }
                   if (countBass > 0) rawBass /= countBass;
                   if (countMid > 0) rawMid /= countMid;
                   if (countHigh > 0) rawHigh /= countHigh;
               }
   
               const smoothFactorAttack = 0.2;
               const smoothFactorDecay = 0.05;
   
               const targetBass = isRecording ? Math.max(0.1, rawBass * 6 * warmUpFactor) : 0;
               const targetMid  = isRecording ? Math.max(0.05, rawMid * 5 * warmUpFactor) : 0;
               const targetHigh = isRecording ? Math.max(0.02, rawHigh * 3 * warmUpFactor) : 0;
   
               animRef.current.volBass = lerp(animRef.current.volBass, targetBass, targetBass > animRef.current.volBass ? smoothFactorAttack : smoothFactorDecay);
               animRef.current.volMid  = lerp(animRef.current.volMid, targetMid, targetMid > animRef.current.volMid ? smoothFactorAttack : smoothFactorDecay);
               animRef.current.volHigh = lerp(animRef.current.volHigh, targetHigh, targetHigh > animRef.current.volHigh ? smoothFactorAttack : smoothFactorDecay);
   
               animRef.current.phaseBack  += 0.0015;
               animRef.current.phaseMid   += 0.005;
               animRef.current.phaseFront += 0.015;
   
               const layers = [
                   { color: `rgba(56, 189, 248, ${0.2 * globalAlpha})`, lineWidth: 3, amplitudeMod: 0.8, freqMod: 0.8, phase: animRef.current.phaseBack, volume: animRef.current.volBass, phaseOffset: 0 },
                   { color: `rgba(168, 85, 247, ${0.4 * globalAlpha})`, lineWidth: 4, amplitudeMod: 0.9, freqMod: 1.0, phase: animRef.current.phaseMid, volume: animRef.current.volMid, phaseOffset: 2 },
                   { color: `rgba(99, 102, 241, ${0.8 * globalAlpha})`, lineWidth: 3, amplitudeMod: 1.1, freqMod: 0.8, phase: animRef.current.phaseFront, volume: animRef.current.volHigh, phaseOffset: 4 }
               ];
   
               layers.forEach((layer) => {
                   ctx.beginPath();
                   ctx.strokeStyle = layer.color;
                   ctx.lineWidth = layer.lineWidth;
                   ctx.lineCap = 'round';
                   ctx.lineJoin = 'round';
                   let started = false;
                   for (let x = 0; x <= width; x += 3) {
                       const normX = (x / width) * 2 - 1;
                       const envelope = Math.pow(1 - Math.abs(normX), 4);
                       const carrierY = Math.sin(x * 0.003 * layer.freqMod + layer.phase + layer.phaseOffset);
                       const compression = 1 + (layer.volume * 2);
                       const vibration = Math.sin(x * 0.05 * compression + layer.phase * 5);
                       const signal = (carrierY * 0.5 + vibration * 0.8) * (layer.volume * 400 * layer.amplitudeMod * am);
                       const y = centerY + signal * envelope;
                       if (!started) { ctx.moveTo(x, y); started = true; } 
                       else { ctx.lineTo(x, y); }
                   }
                   ctx.stroke();
               });
   
               if (globalAlpha > 0.1) {
                   const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, width / 2);
                   gradient.addColorStop(0, `rgba(99, 102, 241, ${0.1 * globalVol * globalAlpha})`);
                   gradient.addColorStop(1, 'rgba(0,0,0,0)');
                   ctx.fillStyle = gradient;
                   ctx.fillRect(0, 0, width, height);
               }

            } else if (st === 'bars') {
                 if (dataArray && dataArray.length > 0) {
                    const barCount = hc - lc;
                    if (barCount > 0) {
                        const barWidth = (width / barCount) * 1.5;
                        let x = 0;
                        for (let i = lc; i < hc; i++) {
                            let value = dataArray[i];
                            if (value < 10) value = 0;
                            const percent = value / 255;
                            const heightPx = (percent * height * 0.6 * am) * warmUpFactor;
                            const hue = i * 2 + 200;
                            ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${animRef.current.waveAlpha * 0.8})`;
                            const y = centerY - heightPx / 2;
                            ctx.fillRect(x, y, barWidth - 1, heightPx);
                            x += width / barCount;
                        }
                    }
                }
            } else if (st === 'circular') {
                 if (dataArray && dataArray.length > 0) {
                    const radius = Math.min(width, height) * 0.25;
                    const totalBars = hc - lc;
                    const angleStep = (2 * Math.PI) / totalBars;
                    ctx.translate(centerX, centerY);
                    ctx.rotate(Date.now() * 0.0005);
                    for (let i = lc; i < hc; i++) {
                        let value = dataArray[i];
                        if (value < 10) value = 0;
                        const percent = value / 255;
                        const barHeight = (percent * (Math.min(width, height) * 0.3) * am) * warmUpFactor;
                        const hue = i * 3 + 240; 
                        ctx.fillStyle = `hsla(${hue}, 90%, 65%, ${animRef.current.waveAlpha * 0.7})`;
                        ctx.save();
                        ctx.rotate(i * angleStep);
                        ctx.beginPath();
                        ctx.roundRect(0, radius, Math.max(2, (width / totalBars) * 0.5), barHeight, 2);
                        ctx.fill();
                        ctx.restore();
                    }
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                }
            } else if (st === 'wave') {
                 if (dataArray && dataArray.length > 0) {
                    ctx.beginPath();
                    ctx.lineWidth = 3;
                    ctx.strokeStyle = `rgba(99, 102, 241, ${animRef.current.waveAlpha})`;
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = `rgba(99, 102, 241, ${animRef.current.waveAlpha * 0.5})`;
                    const sliceWidth = width / (hc - lc);
                    let x = 0;
                    for (let i = lc; i < hc; i++) {
                        let value = dataArray[i];
                        if (value < 10) value = 0;
                        const percent = value / 255;
                        const yOffset = (percent * (height * 0.4) * am) * warmUpFactor;
                        const direction = i % 2 === 0 ? 1 : -1;
                        const y = centerY + (yOffset * direction);
                        if (i === lc) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                        x += sliceWidth;
                    }
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                 }
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, [isRecording, visualizerDataRef]);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-80" />;
});
