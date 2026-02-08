
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getTranslation } from '../utils/i18n';
import { Language } from '../types';
import { Check, ExternalLink, Key, Loader2, MousePointer2, Plus, ChevronDown, Copy, RotateCcw } from 'lucide-react';

interface ApiKeyGuideProps {
  language: Language;
  onDone: () => void;
  isActive: boolean;
  isMuted: boolean;
}

export const ApiKeyGuide: React.FC<ApiKeyGuideProps> = ({ language, onDone, isActive, isMuted }) => {
  const t = getTranslation(language);
  
  // Animation State: 0 to 6
  const [animStep, setAnimStep] = useState(0);
  
  // State for loop control
  const [hasCompletedLoop, setHasCompletedLoop] = useState(false);
  const [restartTrigger, setRestartTrigger] = useState(0);
  const isLoopCompleteRef = useRef(false);
  
  // Refs for dynamic cursor positioning
  const containerRef = useRef<HTMLDivElement>(null);
  const targetRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });

  // Audio Ref
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Ref to track if the sequence should continue (prevents race conditions on unmount)
  const isRunningRef = useRef(false);

  // Cycle the animation & Play Audio
  useEffect(() => {
    // Reset state when not active
    if (!isActive) {
        isRunningRef.current = false;
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        return;
    }

    isRunningRef.current = true;
    
    // Reset loop completion status on mount or when restarted
    isLoopCompleteRef.current = false;
    setHasCompletedLoop(false);

    let transitionTimeout: ReturnType<typeof setTimeout>;

    // Sequence of steps (0 to 6)
    const steps = [0, 1, 2, 3, 4, 5, 6];

    const playStep = (index: number) => {
        if (!isRunningRef.current) return;

        const stepNum = steps[index];
        setAnimStep(stepNum);

        // Stop previous audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        const next = () => {
            if (!isRunningRef.current) return;
            // Add a small pause after speech finishes before moving to next step
            transitionTimeout = setTimeout(() => {
                const nextIndex = (index + 1) % steps.length;
                
                // If we wrapped around to 0, mark loop as complete
                if (nextIndex === 0) {
                    isLoopCompleteRef.current = true;
                    setHasCompletedLoop(true);
                }

                playStep(nextIndex);
            }, 1000); // 1 second pause between steps
        };

        // Logic: Play audio ONLY if:
        // 1. Not globally muted
        // 2. Loop has not completed once yet (unless restarted)
        if (isMuted || isLoopCompleteRef.current) {
            // Silent Mode - Simulate duration
            transitionTimeout = setTimeout(next, 4000); 
            return;
        }

        // Determine folder and suffix based on language
        let langFolder = 'RU';
        let langSuffix = 'ru';
        
        if (language === 'en') {
            langFolder = 'EN';
            langSuffix = 'en';
        } else if (language === 'uz-latn' || language === 'uz-cyrl') {
            langFolder = 'UZ';
            langSuffix = 'uz';
        }

        const soundPathBase = `./sounds/${langFolder}/guide_step_${stepNum}_${langSuffix}`;
        
        // Helper to attempt playback with fallback
        const playAudioFile = (ext: 'mp3' | 'wav') => {
            if (!isRunningRef.current) return;

            const audio = new Audio(`${soundPathBase}.${ext}`);
            audio.volume = 0.6; // SET DEFAULT VOLUME TO 60%
            audioRef.current = audio;

            // 1. Success Path: Audio ends naturally
            audio.onended = next;

            // 2. Error Path: File missing or format error -> Try Fallback or Timer
            audio.onerror = () => {
                if (ext === 'mp3') {
                    // console.log(`MP3 missing for step ${stepNum}, trying WAV...`);
                    playAudioFile('wav');
                } else {
                    console.warn(`Audio missing for step ${stepNum} (both formats), using timer.`);
                    transitionTimeout = setTimeout(next, 4000);
                }
            };

            // Play
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.log("Guide audio autoplay blocked or failed:", e);
                    // If play fails (e.g. user didn't interact yet), fallback timer
                    transitionTimeout = setTimeout(next, 4000);
                });
            }
        };

        // Start with MP3
        playAudioFile('mp3');
    };

    // Start the loop
    playStep(0);

    // Cleanup
    return () => {
        isRunningRef.current = false;
        clearTimeout(transitionTimeout);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.onended = null;
            audioRef.current.onerror = null;
            audioRef.current = null;
        }
    };
  }, [isActive, language, isMuted, restartTrigger]);

  const handleRestart = () => {
      // Trigger re-run of effect, which resets completion flags
      setHasCompletedLoop(false);
      setRestartTrigger(prev => prev + 1);
  };

  // Calculate Cursor Position based on active target
  const updateCursorPosition = useCallback(() => {
    if (!containerRef.current) return;
    
    // For steps 0 and 6 (Intro/Outro), park the cursor off-screen or specific spot
    if (animStep === 0 || animStep === 6) {
        setCursorPos({ x: -100, y: 500 }); // Move off-screen downwards
        return;
    }

    const targetEl = targetRefs.current[animStep];
    if (targetEl) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();

        // Calculate center of the target relative to the container
        const x = targetRect.left - containerRect.left + (targetRect.width / 2);
        const y = targetRect.top - containerRect.top + (targetRect.height / 2);

        setCursorPos({ x, y });
    }
  }, [animStep]);

  // Trigger position update on step change, resize, or transition
  useEffect(() => {
    // Initial update
    requestAnimationFrame(updateCursorPosition);

    // Continuous update for a short duration to track CSS transitions (like modal scaling)
    const interval = setInterval(updateCursorPosition, 16); // 60fps for 500ms
    const stopInterval = setTimeout(() => clearInterval(interval), 600);

    // Resize Observer to handle window resizing
    const resizeObserver = new ResizeObserver(() => {
        updateCursorPosition();
    });
    
    if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
    }
    
    window.addEventListener('resize', updateCursorPosition);

    return () => {
        clearInterval(interval);
        clearTimeout(stopInterval);
        resizeObserver.disconnect();
        window.removeEventListener('resize', updateCursorPosition);
    };
  }, [animStep, updateCursorPosition]);


  const getStepText = () => {
      if (language === 'ru') {
          switch(animStep) {
              case 0: return "Шаг 1: Перейдите в Google AI Studio";
              case 1: return "Шаг 2: Нажмите 'Create API key'";
              case 2: return "Шаг 3: Откройте меню проектов";
              case 3: return "Шаг 4: Выберите 'Create in new project'";
              case 4: return "Шаг 5: Подтвердите создание";
              case 5: return "Шаг 6: Скопируйте ваш ключ";
              case 6: return "Шаг 7: Вернитесь и нажмите 'Ввести ключ'";
              default: return "";
          }
      } else {
           switch(animStep) {
              case 0: return "Step 1: Go to Google AI Studio";
              case 1: return "Step 2: Click 'Create API key'";
              case 2: return "Step 3: Open project menu";
              case 3: return "Step 4: Select 'New project'";
              case 4: return "Step 5: Confirm creation";
              case 5: return "Step 6: Copy your new key";
              case 6: return "Step 7: Return and click 'Enter key'";
              default: return "";
          }
      }
  };

  const getCursorTooltipText = () => {
      if (language === 'ru') {
          switch(animStep) {
              case 1: return "Нажмите Create";
              case 2: return "Откройте меню";
              case 3: return "Выберите 'New Project'";
              case 4: return "Подтвердить";
              case 5: return "Копировать";
              default: return "";
          }
      } else {
           switch(animStep) {
              case 1: return "Click Create";
              case 2: return "Open Menu";
              case 3: return "Select 'New Project'";
              case 4: return "Confirm";
              case 5: return "Copy Key";
              default: return "";
          }
      }
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (window.require) {
        e.preventDefault();
        try {
            const { shell } = window.require('electron');
            shell.openExternal(e.currentTarget.href);
        } catch (err) {
            console.error("Failed to open external link", err);
            window.open(e.currentTarget.href, '_blank');
        }
    }
  };

  const isTooltipLeft = cursorPos.x > 400; // Heuristic based on position

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden relative">
      
      {/* HEADER */}
      <div className="p-6 pb-4 shrink-0 z-20 bg-slate-900 border-b border-slate-800 flex flex-col items-center">
         <div className="w-full max-w-5xl">
             <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-400" />
                {t.guideTitle}
             </h2>
             <div className="h-6 flex items-center">
                <span key={animStep} className="text-sm text-indigo-300 font-mono animate-in slide-in-from-bottom-2 fade-in duration-300 bg-indigo-900/30 px-2 py-0.5 rounded border border-indigo-500/30">
                    {getStepText()}
                </span>
             </div>
         </div>
      </div>

      {/* CENTERED CONTENT WRAPPER */}
      <div className="flex-1 w-full max-w-6xl mx-auto relative flex flex-col">
          
          {/* ANIMATION CONTAINER */}
          <div ref={containerRef} className="flex-1 min-h-[350px] relative mx-4 my-4 flex flex-col font-sans select-none z-10">
              
              {/* MOCK WINDOW */}
              <div className="absolute inset-0 rounded-xl border border-slate-700 bg-[#1e1e1e] overflow-hidden shadow-2xl flex flex-col pointer-events-none">
                  
                  {/* Mock Browser Header */}
                  <div className="h-8 bg-[#2d2d2d] border-b border-[#1e1e1e] flex items-center px-3 gap-2 shrink-0">
                     <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                     </div>
                     <div className="ml-4 px-3 py-0.5 bg-[#1e1e1e] rounded text-[10px] text-slate-500 w-full max-w-[200px] flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                        aistudio.google.com
                     </div>
                  </div>

                  {/* MOCK AI STUDIO BODY */}
                  <div className="flex-1 relative p-6 overflow-hidden bg-[#1e1e1e]">
                      
                      {/* Fake Sidebar */}
                      <div className="absolute left-0 top-0 bottom-0 w-16 border-r border-[#333] flex flex-col items-center pt-4 gap-4 bg-[#1e1e1e] z-10">
                          <div className="w-8 h-8 rounded bg-blue-600/20 text-blue-500 flex items-center justify-center font-bold text-xs">AI</div>
                          <div className="w-8 h-8 rounded bg-[#333]"></div>
                          <div className="w-8 h-8 rounded bg-[#333] border-l-2 border-blue-500"></div>
                      </div>

                      {/* Fake Content Area */}
                      <div className="ml-16 h-full relative">
                          <div className="flex justify-between items-center mb-8">
                              <h1 className="text-2xl font-semibold text-white">API Keys</h1>
                              
                              {/* TARGET: CREATE BUTTON (Step 1) */}
                              <div 
                                ref={el => { targetRefs.current[1] = el }}
                                className={`
                                    relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300
                                    ${animStep === 1 ? 'bg-blue-600 text-white scale-110 shadow-[0_0_20px_rgba(37,99,235,0.6)] ring-2 ring-white z-20' : 'bg-[#333] text-gray-400'}
                              `}>
                                 <Plus className="w-4 h-4" />
                                 Create API key
                              </div>
                          </div>

                          {/* List Header */}
                          <div className="border-b border-[#333] pb-2 mb-4 flex text-xs text-gray-500 gap-8">
                              <span className="w-1/3">Key</span>
                              <span className="w-1/3">Project</span>
                              <span className="w-1/3 text-right">Action</span>
                          </div>

                          {/* List Content */}
                          <div className="flex flex-col gap-2">
                               {/* Empty State (Visible before Step 5) */}
                               {animStep < 5 && (
                                   <div className="flex flex-col items-center justify-center h-40 text-gray-600 text-sm gap-2 opacity-50">
                                        <div className="w-10 h-10 border-2 border-dashed border-gray-700 rounded rotate-45"></div>
                                        <span>No API keys found</span>
                                   </div>
                               )}

                               {/* Success Row (Visible at Step 5) */}
                               <div className={`
                                    w-full bg-[#252525] p-3 rounded flex items-center border border-green-900/30 transition-all duration-500
                                    ${animStep >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 absolute'}
                               `}>
                                   <div className="w-1/3 flex flex-col">
                                       <span className="text-white text-xs font-mono">AIzaSy...7x92</span>
                                       <span className="text-[10px] text-gray-500">Created just now</span>
                                   </div>
                                   <div className="w-1/3 text-xs text-gray-400">Gemini Project</div>
                                   <div className="w-1/3 flex justify-end">
                                       {/* TARGET: COPY ICON (Step 5) */}
                                       <div 
                                          ref={el => { targetRefs.current[5] = el }}
                                          className={`
                                          p-2 rounded transition-all duration-300
                                          ${animStep === 5 ? 'bg-blue-600 text-white scale-125 ring-2 ring-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'hover:bg-[#333] text-gray-500'}
                                       `}>
                                           <Copy className="w-4 h-4" />
                                           {animStep === 5 && <div className="absolute inset-0 bg-white/30 rounded-full animate-ping"></div>}
                                       </div>
                                   </div>
                               </div>
                          </div>
                      </div>

                      {/* MOCK MODAL: CREATE KEY */}
                      {/* Visible during steps 2, 3, 4 */}
                      <div 
                        className={`absolute inset-0 bg-black/60 z-20 flex items-center justify-center transition-all duration-300 ${
                            (animStep >= 2 && animStep <= 4) ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                      >
                          <div className={`bg-[#1e1e1e] w-full max-w-sm rounded-xl border border-[#333] shadow-2xl overflow-hidden p-6 relative transition-transform duration-300 ${(animStep >= 2 && animStep <= 4) ? 'scale-100' : 'scale-95'}`}>
                              <h3 className="text-lg text-white mb-6">Create a new key</h3>
                              
                              <div className="space-y-4">
                                  {/* TARGET: DROPDOWN (Step 2) */}
                                  <div className="space-y-1 relative">
                                      <label className="text-xs text-gray-400">Choose an imported project</label>
                                      <div 
                                          ref={el => { targetRefs.current[2] = el }}
                                          className={`
                                          w-full flex justify-between bg-[#111] border rounded p-2 text-sm text-left relative transition-all duration-300
                                          ${animStep === 2 ? 'border-blue-500 text-white ring-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)] scale-105 z-10' : 'border-[#333] text-gray-500'}
                                      `}>
                                          {animStep >= 3 ? 'New Project' : 'Select a Cloud Project'}
                                          <ChevronDown className="w-4 h-4" />
                                      </div>
                                      
                                      {/* Fake Dropdown Menu (Step 3 Target) */}
                                      <div className={`
                                          absolute top-full left-0 w-full bg-[#252525] border border-[#333] rounded mt-1 shadow-xl z-30 overflow-hidden transition-all duration-200 origin-top 
                                          ${animStep >= 2 && animStep <= 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
                                      `}>
                                            <div className="p-2 text-gray-400 text-xs border-b border-[#333]">Existing Project</div>
                                            {/* TARGET: NEW PROJECT OPTION (Step 3) */}
                                            <div 
                                                ref={el => { targetRefs.current[3] = el }}
                                                className={`
                                                p-2 font-medium text-xs flex items-center gap-2 transition-all duration-200
                                                ${animStep === 3 ? 'bg-blue-600 text-white scale-105 origin-left pl-4 font-bold shadow-md' : 'text-blue-500'}
                                            `}>
                                                <span>+</span> Create API key in new project
                                            </div>
                                        </div>
                                  </div>
                              </div>

                              {/* TARGET: CONFIRM BUTTON (Step 4) */}
                              <div className="mt-8 flex justify-end gap-3">
                                  <div className="px-3 py-1.5 rounded text-sm text-gray-400">Cancel</div>
                                  <div 
                                        ref={el => { targetRefs.current[4] = el }}
                                        className={`
                                        px-4 py-1.5 rounded text-sm font-medium transition-all duration-300
                                        ${animStep === 4 ? 'bg-blue-600 text-white scale-110 shadow-[0_0_20px_rgba(37,99,235,0.6)] ring-2 ring-white z-10' : 'bg-[#333] text-gray-500'}
                                    `}>
                                      Create key
                                  </div>
                              </div>
                          </div>
                      </div>

                  </div>
              </div>

              {/* === ANIMATED CURSOR === */}
              {/* Placed inside the container ref to share coordinate system */}
              <div 
                className="absolute z-50 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none"
                style={{
                    top: `${cursorPos.y}px`,
                    left: `${cursorPos.x}px`,
                    opacity: (animStep > 0 && animStep < 6) ? 1 : 0
                }}
              > 
                   <MousePointer2 className="w-8 h-8 text-indigo-500 fill-white drop-shadow-xl relative z-10 -mt-1 -ml-1" />
                   
                   {/* Tooltip */}
                   {(animStep > 0 && animStep < 6) && (
                       <div className={`
                            absolute top-8 flex items-center gap-2 whitespace-nowrap bg-indigo-600 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xl animate-bounce border border-indigo-400
                            ${isTooltipLeft ? 'right-0 mr-[-20px]' : 'left-0 ml-[-20px]'}
                       `}>
                           <div className="w-5 h-5 bg-white text-indigo-600 rounded-full flex items-center justify-center text-[10px] shrink-0">
                                {animStep}
                           </div>
                           <span>
                                {getCursorTooltipText()}
                           </span>
                       </div>
                   )}
              </div>

          </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="p-6 pt-0 shrink-0 flex flex-col items-center z-20">
           <div className="w-full max-w-2xl flex flex-col gap-3 relative">
                {/* Step 0 Tooltip Overlay */}
               {animStep === 0 && (
                   <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-30 animate-bounce whitespace-nowrap">
                        <div className="bg-indigo-600 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xl flex items-center gap-2">
                            <div className="w-5 h-5 bg-white text-indigo-600 rounded-full flex items-center justify-center text-[10px] shrink-0">
                                1
                            </div>
                            <span>{language === 'ru' ? 'Перейти в Google AI Studio' : 'Go to Google AI Studio'}</span>
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-indigo-600 rotate-45"></div>
                        </div>
                   </div>
               )}

               <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={handleLinkClick}
                  className={`
                    w-full font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 border
                    ${animStep === 0 ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-900/40 ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900' : 'bg-slate-800 hover:bg-slate-700 text-indigo-400 border-slate-700'}
                  `}
               >
                  <span>{t.guideGoToGoogle}</span>
                  <ExternalLink className="w-4 h-4" />
               </a>
               
               <div className="relative w-full space-y-3">
                    {/* Step 6 Tooltip Overlay */}
                   {animStep === 6 && (
                       <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-30 animate-bounce whitespace-nowrap">
                            <div className="bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xl flex items-center gap-2">
                                <div className="w-5 h-5 bg-white text-emerald-600 rounded-full flex items-center justify-center text-[10px] shrink-0">
                                    7
                                </div>
                                <span>{language === 'ru' ? 'Нажмите здесь' : 'Click here'}</span>
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-emerald-600 rotate-45"></div>
                            </div>
                       </div>
                   )}

                   <button
                        onClick={onDone}
                        className={`
                            w-full font-bold py-3.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 border
                            ${animStep === 6 
                                ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-900/40 ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900' 
                                : 'bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 border-slate-700 hover:border-emerald-500'
                            }
                        `}
                    >
                        <span>{t.guideDone}</span>
                        <Check className="w-4 h-4" />
                    </button>

                    {hasCompletedLoop && (
                       <button 
                           onClick={handleRestart}
                           className="w-full text-slate-500 hover:text-white text-xs font-medium py-2 transition-colors flex items-center justify-center gap-2"
                       >
                           <RotateCcw className="w-3 h-3" />
                           {t.guideRepeat}
                       </button>
                    )}
               </div>
           </div>
      </div>
    </div>
  );
};
