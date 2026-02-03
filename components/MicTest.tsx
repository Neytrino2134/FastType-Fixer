import React, { useState, useEffect, useRef } from 'react';
import { Volume2 } from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../utils/i18n';

interface MicTestProps {
  threshold: number;
  language: Language;
}

export const MicTest: React.FC<MicTestProps> = ({ threshold, language }) => {
  const [isTesting, setIsTesting] = useState(false);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState('');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  
  const t = getTranslation(language);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopTest();
  }, []);

  const startTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5; // Smooth response
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const update = () => {
        analyser.getByteTimeDomainData(dataArray);
        
        // Calculate RMS
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const x = (dataArray[i] - 128) / 128.0;
            sum += x * x;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        
        // Map RMS roughly 0.00 to 0.10 -> 0 to 100
        // Logic matches useAudioRecorder: val = rms * 1000
        const val = Math.min(100, rms * 1000);
        
        setVolume(val);
        rafRef.current = requestAnimationFrame(update);
      };
      
      update();
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

       {/* Visualizer Bar */}
       <div className="relative h-8 bg-slate-950 rounded-md overflow-hidden border border-slate-700 shadow-inner">
          
          {/* Threshold Line */}
          <div 
             className="absolute top-0 bottom-0 w-0.5 bg-indigo-500/80 z-20 transition-all duration-300 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
             style={{ left: `${threshold}%` }}
          />
          
          {/* Labels for Zones */}
          <div className="absolute inset-0 flex text-[9px] font-bold text-slate-500 z-30 pointer-events-none select-none">
             <div style={{ width: `${threshold}%` }} className="h-full flex items-center justify-center border-r border-slate-700/30 bg-red-500/5">
                 <span className="opacity-50 truncate px-1">{t.silenceZone || "Silence"}</span>
             </div>
             <div className="flex-1 h-full flex items-center justify-center bg-emerald-500/5">
                 <span className="opacity-50 truncate px-1">{t.speechZone || "Speech"}</span>
             </div>
          </div>

          {/* Volume Fill */}
          <div 
             className={`absolute top-0 bottom-0 left-0 transition-all duration-75 ease-out z-10 ${isLoudEnough ? 'bg-emerald-500' : 'bg-slate-500'}`}
             style={{ width: `${volume}%`, opacity: isTesting ? 1 : 0.3 }}
          />
       </div>
       
       <p className="text-[10px] text-slate-500 mt-2 text-right">
          Current: {Math.round(volume)} | Cutoff: {threshold}
       </p>
    </div>
  );
}