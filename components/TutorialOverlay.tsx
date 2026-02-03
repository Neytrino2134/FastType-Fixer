
import React, { useState, useEffect, useRef } from 'react';
import { Terminal, ChevronRight, MousePointer2, Globe } from 'lucide-react';
import { VisualizerConfig } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface TutorialOverlayProps {
  onComplete: () => void;
  // State for tracking practice steps
  trackCount: number;
  isPlaying: boolean;
  visualizerConfig: VisualizerConfig;
  setVisualizerConfig: (c: VisualizerConfig) => void;
  setShowVisualizer: (v: boolean) => void;
  isSettingsOpen: boolean; 
  presetsCount?: number; // New prop for tracking saved presets
}

type StepType = 'welcome' | 'explain' | 'practice' | 'finish';

interface TutorialStep {
  id: string;
  type: StepType;
  targetId?: string; // DOM ID to highlight
  title?: string;
  text: string;
  actionCheck?: () => boolean; // Return true if action complete
  forceAction?: () => void; // Function to force open a menu if needed
  placement?: 'left' | 'right' | 'bottom-center' | 'top-center'; // Added top-center
}

const GLITCH_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*!??█▓▒░<>/[]{}-=_+";

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  onComplete,
  trackCount,
  isPlaying,
  visualizerConfig,
  // Removed unused props from destructuring to fix build errors
  presetsCount = 0
}) => {
  const { t, language, setLanguage } = useLanguage();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  
  // Text State
  const [displayedText, setDisplayedText] = useState("");
  const [displayedTitle, setDisplayedTitle] = useState("");
  const [isTitleDone, setIsTitleDone] = useState(false);

  // Animation Phase for Modal (0: hidden, 1: width, 2: height, 3: content)
  const [modalPhase, setModalPhase] = useState(0);
  // Background Opacity for smooth entry/exit
  const [bgOpacity, setBgOpacity] = useState(0);

  // Animation Phase for Tooltips (0: hidden, 1: width, 2: height)
  const [tooltipPhase, setTooltipPhase] = useState(0);

  // Track initial state to detect changes
  const initialTracksRef = useRef(trackCount);
  const initialPresetsRef = useRef(presetsCount);
  
  // Refs
  const typeIntervalRef = useRef<number>(0);
  const titleIntervalRef = useRef<number>(0);
  const glitchIntervalRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const timeoutsRef = useRef<number[]>([]);
  
  // Track previous step and language to decide animation type
  // FIXED: Initialize to -1 so the first step (index 0) triggers the animation check
  const prevStepIndexRef = useRef(-1);
  const prevLanguageRef = useRef(language);

  const steps: TutorialStep[] = [
    // --- WELCOME (0) ---
    {
      id: 'welcome',
      type: 'welcome',
      title: t('tut_welcome_title'),
      text: t('tut_welcome_text')
    },
    // --- OVERVIEW (1) ---
    {
      id: 'overview',
      type: 'explain',
      targetId: 'tutorial-main-layout',
      title: t('tut_overview_title'),
      text: t('tut_overview_text'),
      placement: 'top-center' // Changed from bottom-center to top-center
    },
    // --- EXPLANATION PHASE (2-7) ---
    {
      id: 'explain-files',
      type: 'explain',
      targetId: 'tutorial-files',
      title: t('tut_files_title'),
      text: t('tut_files_text')
    },
    {
      id: 'explain-presets',
      type: 'explain',
      targetId: 'tutorial-presets',
      title: t('tut_presets_title'),
      text: t('tut_presets_text')
    },
    {
      id: 'explain-themes',
      type: 'explain',
      targetId: 'tutorial-themes',
      title: t('tut_themes_title'),
      text: t('tut_themes_text')
    },
    {
      id: 'explain-modules',
      type: 'explain',
      targetId: 'tutorial-modules',
      title: t('tut_modules_title'),
      text: t('tut_modules_text')
    },
    {
      id: 'explain-screen',
      type: 'explain',
      targetId: 'tutorial-screen',
      title: t('tut_screen_title'),
      text: t('tut_screen_text'),
      placement: 'left' // Explicitly left as requested
    },
    {
      id: 'explain-player',
      type: 'explain',
      targetId: 'tutorial-player',
      title: t('tut_player_title'),
      text: t('tut_player_text'),
      placement: 'left' // Explicitly left for Right Panel target
    },
    // --- PRACTICE PHASE (8-10) ---
    {
      id: 'practice-expand-files',
      type: 'practice',
      targetId: 'tutorial-files',
      title: t('tut_act_open_menu_title'),
      text: t('tut_act_open_menu_text'),
      actionCheck: () => {
        const el = document.getElementById('tutorial-files');
        if (!el) return false;
        // Check for the expansion class applied by ModuleWrapper
        const grid = el.querySelector('.grid');
        return grid ? grid.classList.contains('grid-rows-[1fr]') : false;
      }
    },
    {
      id: 'practice-load',
      type: 'practice',
      targetId: 'tutorial-load-audio-btn',
      title: t('tut_act_load_music_title'),
      text: t('tut_act_load_music_text'),
      actionCheck: () => trackCount > initialTracksRef.current
    },
    {
      id: 'practice-play',
      type: 'practice',
      targetId: 'tutorial-play-btn',
      title: t('tut_act_play_title'),
      text: t('tut_act_play_text'),
      actionCheck: () => isPlaying
    },
    // --- VISUALIZER PHASE (11) ---
    // Removed intermediate "Observe" step to realign index 11 to Waveform
    {
      id: 'practice-vis-expand',
      type: 'practice',
      targetId: 'tutorial-wave',
      title: t('tut_act_vis_title'),
      text: t('tut_act_vis_text'),
      actionCheck: () => {
        const el = document.getElementById('tutorial-wave');
        if (!el) return false;
        const grid = el.querySelector('.grid');
        return grid ? grid.classList.contains('grid-rows-[1fr]') : false;
      }
    },
    {
      id: 'practice-vis-top',
      type: 'practice',
      targetId: 'tutorial-vis-pos-top',
      title: t('tut_act_pos_top_title'),
      text: t('tut_act_pos_top_text'),
      actionCheck: () => visualizerConfig.position === 'top'
    },
    // NEW STEP: Observe position change
    {
      id: 'observe-vis-change',
      type: 'explain',
      targetId: 'tutorial-screen', // FIXED: Pointing to TV Screen instead of panel
      title: t('tut_config_applied_title'),
      text: t('tut_config_applied_text'),
      // placement removed to default to 'right' (next to the settings panel)
    },
    {
      id: 'practice-vis-center',
      type: 'practice',
      targetId: 'tutorial-vis-pos-center',
      title: t('tut_act_pos_center_title'),
      text: t('tut_act_pos_center_text'),
      actionCheck: () => visualizerConfig.position === 'center'
    },
    // NEW STEPS: PRESETS
    {
      id: 'practice-expand-presets',
      type: 'practice',
      targetId: 'tutorial-presets',
      title: t('tut_act_open_presets_title'),
      text: t('tut_act_open_presets_text'),
      actionCheck: () => {
        const el = document.getElementById('tutorial-presets');
        if (!el) return false;
        const grid = el.querySelector('.grid');
        return grid ? grid.classList.contains('grid-rows-[1fr]') : false;
      }
    },
    {
      id: 'practice-save-preset',
      type: 'practice',
      targetId: 'tutorial-save-preset-btn',
      title: t('tut_act_save_preset_title'),
      text: t('tut_act_save_preset_text'),
      actionCheck: () => presetsCount > initialPresetsRef.current
    },
    {
      id: 'explain-saved',
      type: 'explain',
      targetId: 'tutorial-presets',
      title: t('tut_preset_saved_title'),
      text: t('tut_preset_saved_text')
    },
    // --- FINISH ---
    {
      id: 'finish',
      type: 'finish',
      title: t('tut_finish_title'),
      text: t('tut_finish_text')
    }
  ];

  const currentStep = steps[currentStepIndex];

  // Helper to clear all timeouts
  const clearAllTimeouts = () => {
      timeoutsRef.current.forEach(window.clearTimeout);
      timeoutsRef.current = [];
  };

  const schedule = (fn: () => void, ms: number) => {
      const id = window.setTimeout(fn, ms);
      timeoutsRef.current.push(id);
  };

  // --- MODAL ANIMATION SEQUENCE ---
  useEffect(() => {
    // Reset phase when entering welcome or finish steps
    if (currentStep.type === 'welcome' || currentStep.type === 'finish') {
        if (currentStepIndex !== prevStepIndexRef.current) {
            setModalPhase(0);
            setBgOpacity(0);
            setDisplayedText("");
            setDisplayedTitle("");
            setIsTitleDone(false);
            
            clearAllTimeouts();

            // 1. Fade In Background (Slow & Smooth)
            schedule(() => setBgOpacity(1), 100); 
            
            // 2. Expand Width (Slow)
            schedule(() => setModalPhase(1), 800); 
            
            // 3. Expand Height (Slow)
            // Wait for width (1s) to mostly finish
            schedule(() => setModalPhase(2), 1800); 
            
            // 4. Ready Content (Trigger typing)
            // Wait for height (1s) to finish
            schedule(() => setModalPhase(3), 2900); 
        }
    } else {
        // --- TOOLTIP ANIMATION SEQUENCE ---
        if (currentStepIndex !== prevStepIndexRef.current) {
            setTooltipPhase(0);
            setBgOpacity(0); // Ensure modal BG is gone if we are in tooltip mode
            
            // Small delay to allow positioning logic to run first, then expand
            const t1 = setTimeout(() => setTooltipPhase(1), 200); // Trigger Width
            const t2 = setTimeout(() => setTooltipPhase(2), 500); // Trigger Height

            return () => {
                clearTimeout(t1);
                clearTimeout(t2);
            };
        }
    }
    
    return () => clearAllTimeouts();
  }, [currentStepIndex, currentStep.type]);

  // --- POSITIONING LOGIC ---
  useEffect(() => {
    const updatePosition = () => {
      if (currentStep.targetId) {
        const el = document.getElementById(currentStep.targetId);
        if (el) {
          const r = el.getBoundingClientRect();
          setRect(r);
        }
      } else {
        setRect(null);
      }
      
      rafRef.current = requestAnimationFrame(updatePosition);
    };

    // Start loop
    rafRef.current = requestAnimationFrame(updatePosition);
    
    // Initial scroll
    if (currentStep.targetId) {
        const el = document.getElementById(currentStep.targetId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [currentStep.targetId]); 

  // --- TYPING / GLITCH EFFECT LOGIC ---
  useEffect(() => {
    const isStepChange = currentStepIndex !== prevStepIndexRef.current;
    const isLangChange = language !== prevLanguageRef.current;

    prevStepIndexRef.current = currentStepIndex;
    prevLanguageRef.current = language;

    // Clear previous intervals
    if (titleIntervalRef.current) clearInterval(titleIntervalRef.current);
    if (typeIntervalRef.current) clearInterval(typeIntervalRef.current);
    if (glitchIntervalRef.current) clearInterval(glitchIntervalRef.current);

    // Only start typing/glitching if window is fully open (Phase 3)
    if (modalPhase < 3 && (currentStep.type === 'welcome' || currentStep.type === 'finish')) {
        return;
    }

    const titleTarget = currentStep.title || "";
    const bodyTarget = currentStep.text;

    // --- CASE A: LANGUAGE SWITCH (GLITCH TRANSITION) ---
    if (isLangChange && !isStepChange) {
        // Run Matrix Glitch Effect
        const oldTitle = displayedTitle;
        const oldBody = displayedText;
        const duration = 600; 
        const fps = 30;
        let step = 0;
        const maxSteps = (duration / 1000) * fps;

        glitchIntervalRef.current = window.setInterval(() => {
            step++;
            const progress = step / maxSteps;
            
            if (progress >= 1) {
                setDisplayedTitle(titleTarget);
                setDisplayedText(bodyTarget);
                clearInterval(glitchIntervalRef.current);
                return;
            }

            // Chaos Calculation
            const chaos = 1 - Math.abs((progress - 0.5) * 2);

            // Glitch Title
            const titleLen = Math.round(oldTitle.length + (titleTarget.length - oldTitle.length) * progress);
            let nextTitle = "";
            for (let i = 0; i < titleLen; i++) {
                if (Math.random() < chaos * 0.8) nextTitle += GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
                else nextTitle += (progress > 0.5 ? titleTarget[i] : oldTitle[i]) || "";
            }
            setDisplayedTitle(nextTitle);

            // Glitch Body
            const bodyLen = Math.round(oldBody.length + (bodyTarget.length - oldBody.length) * progress);
            let nextBody = "";
            for (let i = 0; i < bodyLen; i++) {
                if (Math.random() < chaos * 0.5) nextBody += GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
                else nextBody += (progress > 0.5 ? bodyTarget[i] : oldBody[i]) || "";
            }
            setDisplayedText(nextBody);

        }, 1000 / fps);

        return;
    }

    // --- CASE B: STEP CHANGE (TYPEWRITER) ---
    
    // 1. TYPE TITLE
    if (currentStep.title && (currentStep.type === 'welcome' || currentStep.type === 'finish')) {
        if (!isStepChange && isTitleDone) {
             // Already done (if just re-rendering)
             setDisplayedTitle(titleTarget);
        } else {
            let i = 0;
            setIsTitleDone(false);
            setDisplayedTitle("");
            
            titleIntervalRef.current = window.setInterval(() => {
                setDisplayedTitle(titleTarget.slice(0, i + 1));
                i++;
                if (i >= titleTarget.length) {
                    clearInterval(titleIntervalRef.current);
                    setIsTitleDone(true); // Trigger body typing
                }
            }, 40); // Slower title typing
            return; // Exit here, body waits for isTitleDone
        }
    } 
    // If not a modal step, show title immediately (tooltip mode)
    else if (currentStep.type !== 'welcome' && currentStep.type !== 'finish') {
        setDisplayedTitle(titleTarget);
        setIsTitleDone(true);
    }

    // 2. TYPE BODY
    if (isTitleDone || (currentStep.type !== 'welcome' && currentStep.type !== 'finish')) {
        let j = 0;
        
        if ((currentStep.type === 'welcome' || currentStep.type === 'finish') && isStepChange) {
             // Typing effect for Modal
             setDisplayedText("");
             typeIntervalRef.current = window.setInterval(() => {
                setDisplayedText(bodyTarget.slice(0, j + 1));
                j++;
                if (j >= bodyTarget.length) clearInterval(typeIntervalRef.current);
            }, 20);
        } else {
            // Instant text for Tooltips to be snappy, or if not changing steps
            setDisplayedText(bodyTarget);
        }
    }

    return () => {
        if (titleIntervalRef.current) clearInterval(titleIntervalRef.current);
        if (typeIntervalRef.current) clearInterval(typeIntervalRef.current);
        if (glitchIntervalRef.current) clearInterval(glitchIntervalRef.current);
    };
  }, [currentStepIndex, currentStep.title, currentStep.text, modalPhase, isTitleDone, language]); 

  // --- PRACTICE CHECKER ---
  useEffect(() => {
    if (currentStep.type === 'practice' && currentStep.actionCheck) {
      const interval = setInterval(() => {
        if (currentStep.actionCheck!()) {
          handleNext();
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [currentStepIndex, trackCount, isPlaying, visualizerConfig, presetsCount]);

  const handleExitSequence = (isSkip: boolean, onCompleteCallback: () => void) => {
      // 1. ERASE TEXT ANIMATION
      // Instead of immediate fade out, we erase text quickly
      if (typeIntervalRef.current) clearInterval(typeIntervalRef.current);
      if (titleIntervalRef.current) clearInterval(titleIntervalRef.current);

      let textContent = displayedText;
      
      const eraseInterval = setInterval(() => {
          // Erase 4 chars per tick for speed
          textContent = textContent.slice(0, Math.max(0, textContent.length - 4));
          setDisplayedText(textContent);

          if (textContent.length === 0) {
              clearInterval(eraseInterval);
              setDisplayedTitle(""); // Clear title instantly after body
              
              // Proceed with collapse animation
              // 2. Hide Content (Fade out remainder)
              setModalPhase(2); 
              
              setTimeout(() => {
                  // 3. Collapse Height (Slow)
                  setModalPhase(1); 
                  
                  setTimeout(() => {
                      // 4. Collapse Width (Slow)
                      setModalPhase(0); 
                      
                      // 5. Fade BG (Only if skipping, otherwise let next step handle/override)
                      if (isSkip) {
                          setBgOpacity(0);
                          setTimeout(() => {
                              onCompleteCallback();
                          }, 1000); // Wait for BG fade
                      } else {
                          setTimeout(() => {
                              onCompleteCallback();
                          }, 500); // Wait for width collapse
                      }
                  }, 800); // Duration of Height Collapse
              }, 200); // Short pause after text gone
          }
      }, 10);
  };

  const handleNext = () => {
    if (currentStep.forceAction) currentStep.forceAction();
    
    const proceed = () => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            onComplete();
        }
    };

    // If leaving a modal step, trigger exit animation first
    if (currentStep.type === 'welcome' || currentStep.type === 'finish') {
        // Pass false for isSkip, so background stays for smooth transition to tooltips
        handleExitSequence(false, proceed);
    } else {
        proceed();
    }
  };

  const handleSkip = () => {
    // Trigger exit animation with BG fade then close
    handleExitSequence(true, onComplete);
  };

  // --- RENDERERS ---

  // 1. DIMMER & HIGHLIGHTER (For Tooltips)
  const highlightStyle: React.CSSProperties = rect ? {
    position: 'fixed',
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)', // Reduced opacity from 0.85 to 0.65
    borderRadius: '8px',
    zIndex: 9998, 
    pointerEvents: 'none',
  } : {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.65)', // Reduced opacity
    zIndex: 9998,
    transition: 'all 0.5s ease-in-out',
    // Hide this dimmer if we are in Modal mode, as Modal has its own bgOpacity controlled dimmer
    opacity: (currentStep.type === 'welcome' || currentStep.type === 'finish') ? 0 : 1
  };

  // 2. MODAL WINDOW (Welcome / Finish)
  if (currentStep.type === 'welcome' || currentStep.type === 'finish') {
    return (
      <div 
        className={`fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90 cursor-none select-none transition-opacity duration-1000 ease-in-out ${bgOpacity < 0.1 ? 'pointer-events-none' : 'pointer-events-auto'}`}
        style={{ opacity: bgOpacity }}
      >
        
        {/* Main Window Container */}
        <div 
            className="relative bg-black border-2 border-theme-primary shadow-[0_0_30px_var(--color-primary)] overflow-hidden flex flex-col transition-all ease-in-out"
            style={{ 
                // Animation Logic: Width -> Height -> Content
                width: modalPhase >= 1 ? '100%' : '0px',
                maxWidth: '500px',
                // Use max-height for smooth height transition instead of explicit height
                maxHeight: modalPhase >= 2 ? '800px' : '2px',
                minHeight: modalPhase >= 2 ? '400px' : '2px',
                opacity: modalPhase >= 1 ? 1 : 0,
                // Very slow, "Nirvana" transitions
                transitionDuration: '1000ms' 
            }}
        >
           {/* Header Strip */}
           <div className="bg-theme-primary/20 border-b border-theme-primary p-2 flex items-center justify-between shrink-0 h-10">
                <div className="flex items-center gap-2 text-theme-primary">
                    <Terminal size={16} className="animate-pulse" />
                    <span className="font-mono text-xs font-bold tracking-widest uppercase">
                        {currentStep.type === 'welcome' ? 'SYSTEM GUIDE' : 'COMPLETE'}
                    </span>
                </div>
                
                {/* LANGUAGE SWITCHER */}
                {currentStep.type === 'welcome' && modalPhase >= 3 && (
                    <div className="flex items-center gap-3 animate-in fade-in duration-500">
                        <Globe size={14} className="text-theme-primary" />
                        <div className="flex text-[10px] font-mono font-bold">
                            <button 
                                onClick={() => setLanguage('en')}
                                className={`px-1.5 py-0.5 rounded-l border border-theme-primary transition-all ${language === 'en' ? 'bg-theme-primary text-black' : 'text-theme-primary hover:bg-theme-primary/20'}`}
                            >
                                EN
                            </button>
                            <button 
                                onClick={() => setLanguage('ru')}
                                className={`px-1.5 py-0.5 rounded-r border border-l-0 border-theme-primary transition-all ${language === 'ru' ? 'bg-theme-primary text-black' : 'text-theme-primary hover:bg-theme-primary/20'}`}
                            >
                                RU
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex gap-1 ml-4">
                    <div className="w-2 h-2 bg-theme-primary"></div>
                    <div className="w-2 h-2 bg-theme-primary/50"></div>
                </div>
           </div>

           {/* Content */}
           <div 
             className="flex flex-col p-8 transition-opacity duration-1000 relative flex-1"
             style={{ opacity: modalPhase >= 3 ? 1 : 0 }}
           >
                {/* Decorative Grid BG */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:20px_20px] pointer-events-none z-0"></div>

                <div className="flex-1 flex flex-col items-center justify-center relative z-10 text-center">
                    <h2 className="text-2xl font-mono font-bold text-theme-text mb-6 tracking-widest leading-tight uppercase min-h-[40px]">
                        {displayedTitle}
                        {!isTitleDone && <span className="animate-pulse inline-block w-3 h-6 bg-theme-primary ml-1 align-middle"></span>}
                    </h2>
                    
                    <div className="font-mono text-sm text-theme-primary/90 mb-8 whitespace-pre-wrap leading-relaxed min-h-[120px] max-w-[400px]">
                        {displayedText}
                        {isTitleDone && <span className="animate-pulse inline-block w-2 h-4 bg-theme-primary ml-1 align-middle"></span>}
                    </div>
                </div>

                <div className="flex gap-4 w-full z-10 pt-4 border-t border-theme-primary/30 shrink-0">
                    {currentStep.type === 'welcome' && (
                        <button 
                        onClick={handleSkip}
                        className="flex-1 py-3 border border-theme-muted text-theme-muted font-mono text-xs font-bold rounded hover:bg-theme-muted/10 hover:text-theme-text transition-colors tracking-wider"
                        >
                        {t('tut_btn_skip')}
                        </button>
                    )}
                    <button 
                        onClick={handleNext}
                        className="flex-1 py-3 bg-theme-primary text-black font-mono text-xs font-bold rounded hover:shadow-[0_0_20px_var(--color-primary)] transition-all flex items-center justify-center gap-2 group tracking-wider"
                    >
                        {currentStep.type === 'finish' ? t('tut_btn_close') : t('tut_btn_start')} 
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
           </div>
        </div>
      </div>
    );
  }

  // 3. TOOLTIP (Explain / Practice)
  let tooltipStyle: React.CSSProperties = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  
  if (rect) {
      let top = rect.top + (rect.height / 2);
      let left = 0;
      
      const placement = currentStep.placement || 'right';

      if (placement === 'bottom-center') {
          top = rect.bottom - 120; // 120px from bottom edge
          left = rect.left + (rect.width / 2) - 150; // Center (assuming 300px width)
          
          tooltipStyle = {
              position: 'fixed',
              top: top,
              left: left,
              transform: 'none', 
              width: tooltipPhase >= 1 ? '300px' : '0px',
              height: tooltipPhase >= 2 ? 'auto' : '2px',
              opacity: tooltipPhase >= 1 ? 1 : 0,
              zIndex: 9999,
              transition: 'width 0.3s ease-out, height 0.3s ease-out, top 0.3s, left 0.3s',
              overflow: 'hidden'
          };
      } else if (placement === 'top-center') {
          // New Top-Center Placement
          top = rect.top + 80; // Push down from the very top of target
          left = rect.left + (rect.width / 2); // Center horizontally based on target
          
          tooltipStyle = {
              position: 'fixed',
              top: top,
              left: left,
              transform: 'translate(-50%, 0)', // Center horizontally
              width: tooltipPhase >= 1 ? '300px' : '0px',
              height: tooltipPhase >= 2 ? 'auto' : '2px',
              opacity: tooltipPhase >= 1 ? 1 : 0,
              zIndex: 9999,
              transition: 'width 0.3s ease-out, height 0.3s ease-out, top 0.3s, left 0.3s',
              overflow: 'hidden'
          };
      } else {
          // Standard Side Logic
          if (placement === 'left') {
              left = rect.left - 320;
          } else {
              left = rect.right + 20;
          }
          
          if (placement === 'right' && left + 300 > window.innerWidth) {
              left = rect.left - 320;
          }
          if (placement === 'left' && left < 0) {
              left = rect.right + 20;
          }
          
          tooltipStyle = {
              position: 'fixed',
              top: top,
              left: left,
              transform: 'translateY(-50%)',
              width: tooltipPhase >= 1 ? '300px' : '0px',
              height: tooltipPhase >= 2 ? 'auto' : '2px',
              opacity: tooltipPhase >= 1 ? 1 : 0,
              zIndex: 9999,
              transition: 'width 0.3s ease-out, height 0.3s ease-out, top 0.3s, left 0.3s',
              overflow: 'hidden'
          };
      }
  }

  return (
    <>
      {/* Highlight Cutout / Dimmer */}
      <div style={highlightStyle}>
          {/* Border Animation for highlight */}
          {rect && (
              <div className="absolute inset-[-4px] border-2 border-theme-primary rounded-lg animate-pulse pointer-events-none"></div>
          )}
      </div>

      {/* Tooltip Box */}
      <div 
        className="bg-black/90 border border-theme-secondary shadow-[0_0_20px_var(--color-secondary)] rounded-lg flex flex-col gap-3"
        style={tooltipStyle}
      >
         {/* Inner content wrapper to fade in */}
         <div 
            className="flex flex-col gap-3 p-4 transition-opacity duration-300"
            style={{ opacity: tooltipPhase >= 2 ? 1 : 0 }}
         >
            <div className="flex justify-between items-start border-b border-theme-secondary/30 pb-2">
                <span className="text-xs font-mono font-bold text-theme-secondary tracking-widest uppercase">
                    {displayedTitle}
                </span>
                <span className="text-[10px] text-theme-muted font-mono">
                    {currentStepIndex + 1} / {steps.length}
                </span>
            </div>

            <div className="font-mono text-sm text-white leading-relaxed min-h-[60px] whitespace-pre-wrap">
                {displayedText}
            </div>

            <div className="flex justify-between items-center pt-2">
                <button 
                    onClick={handleSkip}
                    className="text-[10px] font-mono font-bold text-theme-muted/60 hover:text-red-400 transition-colors tracking-wider uppercase"
                >
                    {t('tut_btn_skip')}
                </button>

                {currentStep.type === 'explain' ? (
                    <button 
                        onClick={handleNext}
                        className="text-xs font-mono font-bold text-theme-primary hover:text-white flex items-center gap-1 transition-colors"
                    >
                        {t('tut_btn_next')} <ChevronRight size={10} />
                    </button>
                ) : (
                    <div className="flex items-center gap-2 text-xs font-mono text-theme-accent animate-pulse">
                        <MousePointer2 size={12} />
                        <span>{t('tut_waiting')}</span>
                    </div>
                )}
            </div>
         </div>
      </div>
    </>
  );
};

export default TutorialOverlay;
