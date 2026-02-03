import React, { useEffect, useState, useRef } from 'react';
import { Terminal } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ShutdownOverlayProps {
  active: boolean; // Triggers the sequence
  onCancel?: () => void;
  onPlayRebootSfx?: () => void;
  // Recording Props for auto-stop handling
  isRecording?: boolean;
  stopRecording?: () => Promise<boolean>;
}

type SequenceStep = 
  | 'idle' 
  | 'bg_fade_in' 
  | 'window_slide' 
  | 'typing_header' 
  | 'typing_instructions' 
  | 'countdown' 
  | 'loading' 
  | 'tv_off' 
  | 'silence';

const ShutdownOverlay: React.FC<ShutdownOverlayProps> = ({ active, onCancel, onPlayRebootSfx, isRecording, stopRecording }) => {
  const { t } = useLanguage();
  const [step, setStep] = useState<SequenceStep>('idle');
  
  // Animation State
  const [bgOpacity, setBgOpacity] = useState(0);
  const [windowSize, setWindowSize] = useState({ w: 0, h: 2 });
  const [typedHeader, setTypedHeader] = useState("");
  const [typedLines, setTypedLines] = useState<string[]>([]);
  const [timer, setTimer] = useState(5);
  const [progress, setProgress] = useState(0);

  const sequenceRef = useRef<boolean>(false);
  const timeoutsRef = useRef<number[]>([]);
  
  // Ref for callback to prevent effect dependency changes triggering restarts
  const onPlayRebootSfxRef = useRef(onPlayRebootSfx);
  useEffect(() => {
      onPlayRebootSfxRef.current = onPlayRebootSfx;
  }, [onPlayRebootSfx]);

  // Handle Forced DOS Cursor logic
  useEffect(() => {
      if (active) document.body.classList.add('force-dos-cursor');
      else document.body.classList.remove('force-dos-cursor');
      return () => document.body.classList.remove('force-dos-cursor');
  }, [active]);

  // Helper to manage timeouts cleanly
  const wait = (ms: number) => new Promise(resolve => {
    const id = window.setTimeout(resolve, ms);
    timeoutsRef.current.push(id);
  });

  const handleDoubleClick = () => {
    if (onCancel) onCancel();
  };

  // --- MAIN SEQUENCE LOGIC ---
  useEffect(() => {
    const runSequence = async () => {
      if (sequenceRef.current) return;
      sequenceRef.current = true;
      
      // 1. Black Background Smooth Fade In
      setStep('bg_fade_in');
      await wait(50); 
      setBgOpacity(1);
      await wait(1500); 

      // TRIGGER AUDIO SYNC HERE
      // Play sound right before the window starts to slide/appear
      if (onPlayRebootSfxRef.current) onPlayRebootSfxRef.current();

      // 2. Smooth Window Slide (Width then Height)
      setStep('window_slide');
      setWindowSize({ w: 600, h: 2 }); // Expand Width
      await wait(800);
      setWindowSize({ w: 600, h: 500 }); // Expand Height (Increased to prevent footer clipping)
      await wait(800);

      // 3. Type "CRITICAL ERROR DETECTED"
      setStep('typing_header');
      const headerText = t('critical_error');
      for (let i = 0; i <= headerText.length; i++) {
          setTypedHeader(headerText.slice(0, i));
          await wait(50);
      }
      await wait(800);

      // 4. Type Instructions
      setStep('typing_instructions');
      const lines = [
          t('shutdown_instructions_title'),
          "",
          t('shutdown_inst_1'),
          t('shutdown_inst_2'),
          t('shutdown_inst_3'),
      ];
      
      const currentLines: string[] = [];
      for (const line of lines) {
          if (line === "") {
              currentLines.push("");
              setTypedLines([...currentLines]);
              await wait(300);
              continue;
          }
          let currentLineText = "";
          for (let i = 0; i < line.length; i++) {
              currentLineText += line[i];
              setTypedLines([...currentLines, currentLineText]);
              await wait(30);
          }
          currentLines.push(currentLineText);
          setTypedLines([...currentLines]);
          await wait(400); 
      }
      await wait(1000);

      // 5. Countdown (5 -> 0)
      setStep('countdown');
      for (let i = 5; i >= 0; i--) {
          setTimer(i);
          if (i > 0) await wait(1000);
      }
      await wait(500);

      // 6. Loading Bar (0 -> 100)
      setStep('loading');
      for (let i = 0; i <= 100; i += 2) {
          setProgress(i);
          await wait(20 + Math.random() * 30);
      }
      await wait(1000);

      // 7. TV Off Animation
      setStep('tv_off');
      await wait(600);

      // 8. Silence & Save Wait Logic
      setStep('silence');
      
      // Basic waiting time
      await wait(5000);

      // --- RECORDING STOP LOGIC ---
      if (isRecording && stopRecording) {
          // Pause here if recording is active
          // The promise from stopRecording resolves ONLY after file is saved (or cancelled)
          await stopRecording();
      }

      // 9. Reload
      window.location.reload();
    };

    const resetSequence = () => {
        sequenceRef.current = false;
        timeoutsRef.current.forEach(window.clearTimeout);
        timeoutsRef.current = [];
        setStep('idle');
        setBgOpacity(0);
        setWindowSize({ w: 0, h: 2 });
        setTypedHeader("");
        setTypedLines([]);
        setTimer(5);
        setProgress(0);
    };

    if (active) {
        runSequence();
    } else {
        resetSequence();
    }

    return () => {
       timeoutsRef.current.forEach(window.clearTimeout);
       sequenceRef.current = false;
    };
  }, [active, t, isRecording, stopRecording]);


  if (!active && step === 'idle') return null;

  // Helper flags for rendering transitions
  const showHeader = step !== 'window_slide';
  const showInstructions = step !== 'window_slide' && step !== 'typing_header';
  const showCountdown = step === 'countdown' || step === 'loading';
  const showLoading = step === 'loading';
  // Animation continues during countdown AND loading
  const isBreathing = step === 'countdown' || step === 'loading';

  // 1. TV OFF / SILENCE PHASE
  if (step === 'tv_off' || step === 'silence') {
    return (
        <div className="fixed inset-0 z-[200005] bg-black overflow-hidden cursor-none">
            {step === 'tv_off' && (
                <div className="absolute inset-0 z-[100] bg-black animate-[tv-off-scale_0.5s_ease-in_forwards] origin-center">
                    <div className="absolute inset-0 animate-[tv-off-flash_0.6s_ease-out_forwards] pointer-events-none"></div>
                </div>
            )}
        </div>
    );
  }

  // 2. MAIN INTERFACE PHASE
  return (
    <div 
        className="fixed inset-0 z-[200000] flex items-center justify-center select-none overflow-hidden cursor-none"
        onDoubleClick={handleDoubleClick}
        style={{
            backgroundColor: `rgba(0, 0, 0, ${bgOpacity})`,
            transition: 'background-color 1.5s ease-in-out',
            backdropFilter: bgOpacity > 0.8 ? 'blur(10px)' : 'none'
        }}
    >
        {/* CRT Scanlines */}
        <div 
            className="absolute inset-0 bg-white/5 pointer-events-none scanlines"
            style={{ opacity: bgOpacity * 0.1 }}
        ></div>
        
        {/* Main Dialog Window */}
        <div 
          className="relative bg-black border-2 border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.5)] overflow-hidden flex flex-col transition-all duration-700 ease-in-out"
          style={{ 
              width: `${windowSize.w}px`, 
              height: `${windowSize.h}px`,
              opacity: step === 'idle' || step === 'bg_fade_in' ? 0 : 1
          }}
        >
            {/* Header */}
            <div className="bg-red-900/30 border-b border-red-600/50 p-2 flex items-center justify-between shrink-0 h-10">
                <div className="flex items-center gap-2 text-red-500">
                    <Terminal size={16} className="animate-pulse" />
                    <span className="font-mono text-xs font-bold tracking-widest uppercase">{t('window_sys_failure')}</span>
                </div>
                <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                    <div className="w-1.5 h-1.5 bg-red-600/50 rounded-full"></div>
                </div>
            </div>

            {/* Content Area - Changed to justify-start with padding to anchor top elements */}
            <div className="flex-1 p-6 pt-10 flex flex-col items-center justify-start font-mono relative">
                
                {/* Background Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,0,0.05)_1px,transparent_1px)] bg-[length:20px_20px] pointer-events-none"></div>

                {/* Content Container */}
                <div className="z-10 w-full flex flex-col items-center">
                    
                    {/* Header Text - Fixed height to reserve space */}
                    <div className="h-8 flex items-center justify-center mb-4">
                         {showHeader && (
                            <span className="text-red-500 font-bold text-lg tracking-[0.1em] drop-shadow-[0_0_8px_rgba(255,0,0,0.8)]">
                                {typedHeader}
                                {step === 'typing_header' && <span className="animate-pulse inline-block w-2 h-5 bg-red-500 ml-1 align-middle"></span>}
                            </span>
                         )}
                    </div>

                    {/* Instructions Block - Wrapper to smooth out height changes if needed, but typing handles it well */}
                    <div className="w-full max-w-[480px] min-h-[100px] mb-2">
                        {showInstructions && (
                            <div className="text-xs space-y-1 text-left border-l-2 border-red-900/50 pl-4 py-2 bg-red-950/10 transition-opacity duration-500">
                                {typedLines.map((line, i) => (
                                    <div key={i} className={`${i === 0 ? 'text-red-500 font-bold mb-2 tracking-widest' : `text-red-300 font-bold opacity-100 ${isBreathing ? 'animate-pulse' : ''}`}`}>
                                        {line}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Countdown - Animate Height/Opacity/Translate for smooth entry */}
                    <div 
                        className={`overflow-hidden transition-all duration-700 ease-out w-full flex flex-col items-center
                            ${showCountdown ? 'max-h-24 opacity-100 translate-y-0 mt-4' : 'max-h-0 opacity-0 translate-y-4 mt-0'}
                        `}
                    >
                         <div className="text-[10px] text-red-500/50 uppercase tracking-widest mb-1">
                             {t('system_down')}
                         </div>
                         <div className="text-6xl font-black text-red-600 animate-pulse tabular-nums drop-shadow-[0_0_15px_rgba(255,0,0,0.6)]">
                             00:0{timer}
                         </div>
                    </div>

                    {/* Loading Bar - Animate Height/Opacity/Translate for smooth entry */}
                    <div 
                        className={`overflow-hidden transition-all duration-700 ease-out w-full max-w-[300px]
                            ${showLoading ? 'max-h-20 opacity-100 translate-y-0 mt-6' : 'max-h-0 opacity-0 translate-y-4 mt-0'}
                        `}
                    >
                         <div className="space-y-1">
                             <div className="flex justify-between text-[9px] text-red-500 font-bold uppercase">
                                 <span>{t('initiating_dump')}</span>
                                 <span>{Math.round(progress)}%</span>
                             </div>
                             <div className="h-3 w-full bg-red-950 border border-red-600/50 p-0.5 relative overflow-hidden">
                                 <div 
                                    className="h-full bg-red-600 shadow-[0_0_10px_#ff0000] transition-all duration-200 ease-linear"
                                    style={{ width: `${progress}%` }}
                                 ></div>
                                 <div className="absolute inset-0 bg-white/10 w-full animate-[shimmer_1s_infinite]"></div>
                             </div>
                         </div>
                    </div>

                </div>
            </div>

            {/* Footer */}
            <div className="bg-red-900/20 border-t border-red-600/30 p-1.5 flex justify-between px-3 text-[9px] font-mono text-red-500/60 uppercase">
                <span>UID: 0xDEAD_BEEF</span>
                <span>{t('status_label')}: {step === 'loading' ? t('status_critical') : t('status_unstable')}</span>
            </div>
        </div>
    </div>
  );
};

export default ShutdownOverlay;