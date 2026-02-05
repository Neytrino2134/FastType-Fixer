
import React, { useState, useEffect, useRef } from 'react';
import { Volume2 } from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../utils/i18n';

interface MicTestProps {
  threshold: number;
  language: Language;
  isVisible: boolean;
  lowCut?: number;
  highCut?: number;
  amp?: number;
  style?: 'classic' | 'bars' | 'circular' | 'wave';
}

// Linear Interpolation helper
const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;

export const MicTest: React.FC<MicTestProps> = ({ 
    threshold, 
    language, 
    isVisible,
    lowCut = 0,
    highCut = 128,
    amp = 1,
    style = 'classic'
}) => {
  const [isTesting, setIsTesting] = useState(false);
  const [volume, setVolume] = useState(0); // 0 to 100 for UI bar
  const [error, setError] = useState('');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  
  // Ref for live settings
  const settingsRef = useRef({ lowCut, highCut, amp, style });

  useEffect(() => {
      settingsRef.current = { lowCut, highCut, amp, style };
  }, [lowCut, highCut, amp, style]);

  const animRef = useRef({
      volBass: 0,
      volMid: 0,
      volHigh: 0,
      phaseFront: 0,
      phaseMid: 0,
      phaseBack: 0,
  });

  const t = getTranslation(language);

  useEffect(() => {
    if (!isVisible && isTesting) {
        stopTest();
    }
  }, [isVisible]);

  useEffect(() => {
    return () => stopTest();
  }, []);

  const calculateTimeDomainRMS = (dataArray: Uint8Array) => {
    let sum = 0;
    // Time Domain: 128 is silence
    for (let i = 0; i < dataArray.length; i++) {
      const x = (dataArray[i] - 128) / 128.0; 
      sum += x * x;
    }
    return Math.sqrt(sum / dataArray.length);
  };

  const startTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.5;
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;
      
      const bufferLength = analyser.frequencyBinCount;
      const freqDataArray = new Uint8Array(bufferLength);
      const timeDataArray = new Uint8Array(bufferLength);
      
      const render = () => {
        if (!analyserRef.current || !canvasRef.current) return;

        const { lowCut: lc, highCut: hc, amp: am, style: st } = settingsRef.current;

        // 1. Get Frequency Data for Visuals
        analyserRef.current.getByteFrequencyData(freqDataArray);
        
        // 2. Get Time Data for Volume Meter (matching Recorder logic)
        analyserRef.current.getByteTimeDomainData(timeDataArray);
        const rms = calculateTimeDomainRMS(timeDataArray);
        
        // Display Logic: 
        // Max RMS in recorder logic for threshold 100 is 0.2.
        // So we map 0.0 -> 0.2 RMS to 0 -> 100% UI bar.
        const displayVol = Math.min(100, (rms / 0.2) * 100);
        setVolume(displayVol);

        // --- DRAW VISUALIZER ---
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (canvas.parentElement) {
            if (canvas.width !== canvas.parentElement.offsetWidth) canvas.width = canvas.parentElement.offsetWidth;
            if (canvas.height !== canvas.parentElement.offsetHeight) canvas.height = canvas.parentElement.offsetHeight;
        }

        if (ctx) {
            const width = canvas.width;
            const height = canvas.height;
            const centerY = height / 2;
            const centerX = width / 2;

            ctx.clearRect(0, 0, width, height);

            if (st === 'classic') {
                let rawBass = 0, rawMid = 0, rawHigh = 0;
                let countBass = 0, countMid = 0, countHigh = 0;

                for(let i = 0; i < freqDataArray.length; i++) {
                    if (i < lc || i > hc) continue;
                    let v = freqDataArray[i] / 255.0;
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

                animRef.current.volBass = lerp(animRef.current.volBass, targetBass, 0.2);
                animRef.current.volMid  = lerp(animRef.current.volMid, targetMid, 0.2);
                animRef.current.volHigh = lerp(animRef.current.volHigh, targetHigh, 0.2);

                animRef.current.phaseBack  += 0.003; 
                animRef.current.phaseMid   += 0.01;
                animRef.current.phaseFront += 0.03;

                const layers = [
                    { color: `rgba(56, 189, 248, 0.3)`, lineWidth: 2, amplitudeMod: 0.8, freqMod: 0.8, phase: animRef.current.phaseBack, volume: animRef.current.volBass, phaseOffset: 0 },
                    { color: `rgba(168, 85, 247, 0.5)`, lineWidth: 3, amplitudeMod: 0.9, freqMod: 1.0, phase: animRef.current.phaseMid, volume: animRef.current.volMid, phaseOffset: 2 },
                    { color: `rgba(99, 102, 241, 0.9)`, lineWidth: 2, amplitudeMod: 1.1, freqMod: 0.8, phase: animRef.current.phaseFront, volume: animRef.current.volHigh, phaseOffset: 4 }
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
                 const barCount = Math.floor((hc - lc) / 2);
                 const barWidth = (width / barCount);
                 let x = 0;
                 for (let i = lc; i < hc; i+=2) {
                    const percent = (freqDataArray[i] / 255);
                    const h = percent * height * 0.8 * am;
                    const hue = i * 2 + 200;
                    ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
                    ctx.fillRect(x, height - h, barWidth - 1, h);
                    x += barWidth;
                 }
            } else if (st === 'circular') {
                 const radius = Math.min(width, height) * 0.2;
                 const bars = hc - lc;
                 const angleStep = (2 * Math.PI) / bars;
                 ctx.translate(centerX, centerY);
                 for (let i = lc; i < hc; i++) {
                    const percent = (freqDataArray[i] / 255);
                    const h = percent * (Math.min(width, height) * 0.3) * am;
                    const hue = i * 3 + 240;
                    ctx.fillStyle = `hsl(${hue}, 90%, 65%)`;
                    ctx.save();
                    ctx.rotate(i * angleStep);
                    ctx.fillRect(0, radius, 2, h);
                    ctx.restore();
                 }
                 ctx.setTransform(1, 0, 0, 1, 0, 0);
            } else if (st === 'wave') {
                 ctx.beginPath();
                 ctx.strokeStyle = '#6366f1';
                 ctx.lineWidth = 2;
                 const sliceWidth = width / (hc - lc);
                 let x = 0;
                 for (let i = lc; i < hc; i++) {
                     const percent = (freqDataArray[i] / 255);
                     const yOffset = percent * (height * 0.4) * am;
                     const dir = i % 2 === 0 ? 1 : -1;
                     const y = centerY + (yOffset * dir);
                     if (i === lc) ctx.moveTo(x, y);
                     else ctx.lineTo(x, y);
                     x += sliceWidth;
                 }
                 ctx.stroke();
            }
        }

        rafRef.current = requestAnimationFrame(render);
      };
      
      render();
      setIsTesting(true);
      setError('');
    } catch (err) {
      console.error(err);
      setError(t.micAccessError || "Mic Error");
      setIsTesting(false);
    }
  };

  const stopTest = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    
    setIsTesting(false);
    setVolume(0);
    if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };
  
  const isLoudEnough = volume > threshold;

  return (
    <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
       {/* Header / Button */}
       <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
             <Volume2 className={`w-4 h-4 ${isTesting ? 'text-indigo-400' : 'text-slate-500'}`} />
             <span className="text-sm font-medium text-slate-300">
               {isTesting ? (t.noiseLevel || "Noise Level") : (t.testMic || "Test Microphone")}
             </span>
          </div>
          <button
             onClick={isTesting ? stopTest : startTest}
             className={`px-3 py-1.5 rounded text-xs font-bold transition-colors border ${
               isTesting 
                 ? 'bg-red-900/30 text-red-400 border-red-900/50 hover:bg-red-900/50'
                 : 'bg-indigo-600 text-white border-transparent hover:bg-indigo-500'
             }`}
          >
             {isTesting ? (t.stopTest || "Stop") : (t.testMic || "Start Test")}
          </button>
       </div>

       {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

       {/* Visualizer Area */}
       <div className="relative h-24 bg-slate-950 rounded-md overflow-hidden border border-slate-700 shadow-inner">
          
          {/* 1. Waveform Canvas (Standard Wave) */}
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10" />

          {/* 2. Threshold Marker (Vertical Line) */}
          <div 
             className="absolute top-0 bottom-0 w-0.5 bg-red-500/80 z-20 transition-all duration-300 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
             style={{ left: `${threshold}%` }}
          />
          
          {/* 3. Labels for Zones */}
          <div className="absolute inset-0 flex text-[9px] font-bold text-slate-500 z-30 pointer-events-none select-none">
             <div style={{ width: `${threshold}%` }} className="h-full flex items-end justify-center pb-1 border-r border-slate-700/30 bg-red-500/5">
                 <span className="opacity-50 truncate px-1">{t.silenceZone || "Silence"}</span>
             </div>
             <div className="flex-1 h-full flex items-end justify-center pb-1 bg-emerald-500/5">
                 <span className="opacity-50 truncate px-1">{t.speechZone || "Speech"}</span>
             </div>
          </div>

          {/* 4. Active Volume Fill (Background overlay for threshold logic) */}
          <div 
             className={`absolute top-0 bottom-0 left-0 transition-all duration-75 ease-out z-0 opacity-20 ${isLoudEnough ? 'bg-emerald-500' : 'bg-slate-500'}`}
             style={{ width: `${volume}%` }}
          />
       </div>
       
       <p className="text-[10px] text-slate-500 mt-2 text-right font-mono">
          Input: {Math.round(volume)}% | Trigger: {threshold}%
       </p>
    </div>
  );
}
