
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { useSFX } from './useSFX';
import { ViewMode } from '../types';

// Animation phases for the view transition
export type AnimSequence = 
  | 'idle' 
  | 'exiting_default'   // Fade out/scale down from big mode
  | 'exiting_mini'      // Fade out/scale down from mini mode
  | 'exiting_center'    // New: Fade out/scale down to center (generic exit)
  | 'loading'           // New: Spinner state (App hidden)
  | 'entering_center'   // New: Scale up from center (generic enter)
  | 'void_layout'       // Layout mounted but hidden (preparation phase)
  | 'reveal_left'       // System panel slides in
  | 'reveal_right'      // Player panel slides in
  | 'reveal_center';    // Screen pops in

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export const useViewLayout = (introState: number) => {
  const { addNotification } = useNotification();
  const { playSFX } = useSFX();

  const [viewMode, setViewMode] = useState<ViewMode>('default');
  
  // Visibility States
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showCenterPanel, setShowCenterPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  
  // Resizable Panel Widths
  const [leftPanelWidth, setLeftPanelWidth] = useState(460);
  const [rightPanelWidth, setRightPanelWidth] = useState(580);
  
  // Layout State
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('desktop');
  
  const [animSequence, setAnimSequence] = useState<AnimSequence>('idle');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Ref to block responsive resize logic during animation transitions
  const isTransitioningRef = useRef(false);
  
  // Resizing Refs (Manual Drag Handles)
  const isResizingLeft = useRef(false);
  const isResizingRight = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  // NEW: Detect Native Window Resize
  const [isWindowResizing, setIsWindowResizing] = useState(false);
  const windowResizeTimeoutRef = useRef<number>(0);

  const isCinema = viewMode === 'cinema';
  const focusMode = isCinema;

  // Combine all resizing states. If ANY is true, transitions become "none" (instant).
  const isResizing = animSequence.startsWith('exiting') || 
                     animSequence === 'void_layout' || 
                     animSequence === 'loading' || 
                     isResizingLeft.current || 
                     isResizingRight.current ||
                     isWindowResizing;

  // Fullscreen listener
  useEffect(() => {
      const handleFullscreenChange = () => {
          setIsFullscreen(!!document.fullscreenElement);
      };
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Window Resize Listener (For Transition Disabling)
  useEffect(() => {
    const handleNativeResize = () => {
        // As soon as resize event fires, disable transitions
        if (!isWindowResizing) setIsWindowResizing(true);
        
        // Debounce the clearing of the flag
        if (windowResizeTimeoutRef.current) clearTimeout(windowResizeTimeoutRef.current);
        
        windowResizeTimeoutRef.current = window.setTimeout(() => {
            setIsWindowResizing(false);
        }, 150); // Small buffer to ensure resize is definitely done
    };

    window.addEventListener('resize', handleNativeResize);
    return () => {
        window.removeEventListener('resize', handleNativeResize);
        if (windowResizeTimeoutRef.current) clearTimeout(windowResizeTimeoutRef.current);
    };
  }, [isWindowResizing]);

  // --- PANEL RESIZING LOGIC ---
  const handleMouseDownLeft = useCallback((e: React.MouseEvent) => {
      isResizingLeft.current = true;
      startX.current = e.clientX;
      startWidth.current = leftPanelWidth;
      // USE CUSTOM CURSOR CLASS
      document.body.classList.add('custom-cursor-col-resize');
      document.body.style.cursor = 'none'; 
      document.body.style.userSelect = 'none';
  }, [leftPanelWidth]);

  const handleMouseDownRight = useCallback((e: React.MouseEvent) => {
      isResizingRight.current = true;
      startX.current = e.clientX;
      startWidth.current = rightPanelWidth;
      // USE CUSTOM CURSOR CLASS
      document.body.classList.add('custom-cursor-col-resize');
      document.body.style.cursor = 'none';
      document.body.style.userSelect = 'none';
  }, [rightPanelWidth]);

  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (isResizingLeft.current) {
              const delta = e.clientX - startX.current;
              const newWidth = Math.min(Math.max(startWidth.current + delta, 300), 800);
              setLeftPanelWidth(newWidth);
          } else if (isResizingRight.current) {
              const delta = startX.current - e.clientX; // Dragging left increases width
              const newWidth = Math.min(Math.max(startWidth.current + delta, 350), 900);
              setRightPanelWidth(newWidth);
          }
      };

      const handleMouseUp = () => {
          if (isResizingLeft.current || isResizingRight.current) {
              isResizingLeft.current = false;
              isResizingRight.current = false;
              
              // REMOVE CUSTOM CURSOR CLASS
              document.body.classList.remove('custom-cursor-col-resize');
              
              document.body.style.cursor = 'default';
              document.body.style.userSelect = 'auto';
              // Trigger window resize event to fix canvas scaling
              window.dispatchEvent(new Event('resize'));
          }
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
      };
  }, []);

  // --- SMART BREAKPOINT LOGIC ---
  // Calculates the current breakpoint based on width
  const getBreakpoint = (width: number): Breakpoint => {
      if (width < 940) return 'mobile';
      if (width < 1300) return 'tablet';
      return 'desktop';
  };

  // 1. Handle Window Resize -> Update Breakpoint
  useEffect(() => {
    const handleResize = () => {
        if (viewMode === 'cinema' || viewMode === 'mini' || viewMode === 'player-focus' || isTransitioningRef.current) return;
        
        const w = window.innerWidth;
        const newBreakpoint = getBreakpoint(w);
        
        if (newBreakpoint !== currentBreakpoint) {
            setCurrentBreakpoint(newBreakpoint);
        }
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentBreakpoint, viewMode]);

  // 2. Handle Breakpoint Changes -> Apply Defaults
  useEffect(() => {
      if (viewMode !== 'default' || isTransitioningRef.current) return;

      if (currentBreakpoint === 'mobile') {
          // Mobile: Only Player by default (Full width right panel)
          setShowLeftPanel(false);
          setShowCenterPanel(false);
          setShowRightPanel(true);
      } else if (currentBreakpoint === 'tablet') {
          // Tablet: Screen + Player (Hide Left)
          setShowLeftPanel(false);
          setShowCenterPanel(true);
          setShowRightPanel(true);
      } else {
          // Desktop: Show All
          setShowLeftPanel(true);
          setShowCenterPanel(true);
          setShowRightPanel(true);
      }
  }, [currentBreakpoint, viewMode]);


  // --- MUTUAL EXCLUSION TOGGLING ---
  
  const toggleLeftPanel = useCallback(() => {
      setShowLeftPanel(prev => {
          const willShow = !prev;
          if (willShow && currentBreakpoint === 'tablet' && viewMode === 'default') {
              setShowRightPanel(false);
          }
          return willShow;
      });
  }, [currentBreakpoint, viewMode]);

  const toggleRightPanel = useCallback(() => {
      setShowRightPanel(prev => {
          const willShow = !prev;
          if (willShow && currentBreakpoint === 'tablet' && viewMode === 'default') {
              setShowLeftPanel(false);
          }
          return willShow;
      });
  }, [currentBreakpoint, viewMode]);


  const handleSetViewMode = useCallback(async (targetMode: ViewMode) => {
      const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
      const ipc = (window as any).require ? (window as any).require('electron').ipcRenderer : null;

      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true; // LOCK responsive logic

      try {
          // 1. SWITCHING TO MINI MODE (Compact Mode: No Left Panel, Fixed Size)
          if (targetMode === 'mini' && viewMode !== 'mini') {
              playSFX('WHOOSH_IN.mp3');
              // Transition Step 1: Scale down into darkness
              setAnimSequence('exiting_center');
              await wait(600); 

              // Transition Step 2: Show Loader
              setAnimSequence('loading');
              await wait(800); // Simulate load time

              if (ipc) ipc.send('set-mini-mode');
              
              setViewMode('mini');
              // Mini Mode Logic: Show Screen + Player, Hide Settings
              setShowLeftPanel(false);
              setShowCenterPanel(false); // Hide center screen in true mini mode
              setShowRightPanel(true);
              
              // Transition Step 3: Reveal from center
              setAnimSequence('entering_center'); 
              await wait(600); 
          } 
          
          // 2. SWITCHING TO DEFAULT/FULL MODE
          else if (targetMode === 'default' && (viewMode === 'mini' || viewMode === 'cinema')) {
              if (viewMode === 'mini') {
                  playSFX('WHOOSH_OUT.mp3'); 
                  // Transition Step 1: Scale down into darkness
                  setAnimSequence('exiting_center');
                  await wait(600); 

                  // Transition Step 2: Show Loader
                  setAnimSequence('loading');
                  await wait(800); // Simulate load time
              }

              if (ipc) ipc.send('set-full-mode');
              
              setViewMode('default');
              
              // Recalculate layout based on current width
              const w = window.innerWidth;
              const bp = getBreakpoint(w);
              setCurrentBreakpoint(bp);

              const shouldShowLeft = bp === 'desktop';
              const shouldShowCenter = bp !== 'mobile';

              setShowLeftPanel(shouldShowLeft);
              setShowCenterPanel(shouldShowCenter);
              setShowRightPanel(true);
              
              if (viewMode === 'mini') {
                  // Transition Step 3: Reveal from center
                  setAnimSequence('entering_center');
                  await wait(600);
              }
          }
          // 3. CINEMA MODE
          else if (targetMode === 'cinema') {
              setViewMode('cinema');
              // In Cinema, we keep center true. We hide sides initially for clean entry.
              // But user can toggle them back on as overlays.
              setShowLeftPanel(false);
              setShowCenterPanel(true);
              setShowRightPanel(false);
              if (ipc) ipc.send('set-full-mode');
          } 
          // 4. PLAYER FOCUS MODE
          else if (targetMode === 'player-focus') {
              setViewMode('player-focus');
              setShowLeftPanel(false);
              setShowCenterPanel(false);
              setShowRightPanel(true);
              if (ipc) ipc.send('set-full-mode');
          }
          else {
              setViewMode(targetMode);
              if (targetMode === 'default') {
                  const bp = getBreakpoint(window.innerWidth);
                  setShowLeftPanel(bp === 'desktop');
                  setShowCenterPanel(bp !== 'mobile');
                  setShowRightPanel(true);
              }
          }
      } catch (err) {
          console.error("View transition error", err);
          // Fallback to default safe state
          setViewMode('default');
          setShowLeftPanel(true);
          setShowCenterPanel(true);
          setShowRightPanel(true);
      } finally {
          setAnimSequence('idle');
          isTransitioningRef.current = false; // UNLOCK
          
          // Trigger a manual resize event to ensure Canvases update dimensions after animation
          setTimeout(() => {
              window.dispatchEvent(new Event('resize'));
          }, 100);
      }

  }, [viewMode, playSFX]);

  // NEW EFFECT: Auto-enter Cinema Mode if both panels are manually collapsed in Default View
  useEffect(() => {
    if (viewMode === 'default' && !showLeftPanel && !showRightPanel && !isTransitioningRef.current && introState >= 2) {
       handleSetViewMode('cinema');
       addNotification("Cinema Mode Activated", "info");
    }
  }, [viewMode, showLeftPanel, showRightPanel, introState, handleSetViewMode, addNotification]);

  const toggleFocusMode = useCallback((forceState?: boolean) => {
      const newState = forceState !== undefined ? forceState : !focusMode;
      if (newState) {
          handleSetViewMode('cinema');
          addNotification("Cinema Mode Active", "info");
      } else {
          handleSetViewMode('default');
          addNotification("UI Restored", "info");
      }
  }, [focusMode, addNotification, handleSetViewMode]);

  // --- RENDER STYLES ---
  
  let masterStyle: React.CSSProperties = { 
      opacity: 1, 
      transform: 'scale(1)', 
      transition: isResizing ? 'none' : 'opacity 0.6s ease-in-out, transform 0.6s ease-in-out' 
  };

  // Updated Transition Styles
  if (animSequence === 'exiting_center') {
      masterStyle = { opacity: 0, transform: 'scale(0.5)', transition: 'opacity 0.5s ease-in, transform 0.5s ease-in' };
  } else if (animSequence === 'loading') {
      masterStyle = { opacity: 0, transform: 'scale(0.5)', transition: 'none' };
  } else if (animSequence === 'entering_center') {
      masterStyle = { opacity: 1, transform: 'scale(1)', transition: 'opacity 0.5s ease-out, transform 0.5s ease-out' };
  } else if (animSequence === 'exiting_mini' || animSequence === 'exiting_default') {
      masterStyle = { opacity: 0, transform: 'scale(0.95)', transition: 'opacity 0.5s ease, transform 0.5s ease' };
  } else if (animSequence === 'void_layout') {
      masterStyle = { opacity: 0, transform: 'scale(1)', transition: 'none' };
  }

  // --- LEFT PANEL LOGIC ---
  const isLeftPanelVisible = 
      (introState >= 1) && 
      showLeftPanel && 
      viewMode !== 'mini' && 
      viewMode !== 'player-focus' &&
      (animSequence === 'reveal_left' || animSequence === 'reveal_right' || animSequence === 'reveal_center' || animSequence === 'idle' || animSequence === 'entering_center');

  let leftPanelClass = `shrink-0 z-20 overflow-hidden ${!isResizing ? 'transition-[width] duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]' : ''}`;
  let leftPanelStyle: React.CSSProperties = { width: isLeftPanelVisible ? `${leftPanelWidth}px` : '0px' };

  // CINEMA OVERRIDE (Left)
  if (isCinema) {
      leftPanelClass = `absolute z-50 h-[calc(100%-2rem)] top-4 left-4 rounded-xl border border-theme-border shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-xl bg-black/90 overflow-hidden transition-transform duration-500 cubic-bezier(0.2,0.8,0.2,1)`;
      // In Cinema, width is fixed, visibility is controlled by transform slide
      leftPanelStyle = { 
          width: `${leftPanelWidth}px`, 
          transform: isLeftPanelVisible ? 'translateX(0)' : 'translateX(-120%)'
      };
  }

  // --- RIGHT PANEL LOGIC ---
  const isRightPanelVisible = 
      (viewMode === 'mini' && (animSequence === 'reveal_right' || animSequence === 'reveal_center' || animSequence === 'idle' || animSequence === 'entering_center')) || 
      (viewMode === 'player-focus') ||
      (
          introState >= 1 &&
          showRightPanel && 
          (animSequence === 'reveal_right' || animSequence === 'reveal_center' || animSequence === 'idle' || animSequence === 'entering_center')
      );

  let rightPanelClass = `shrink-0 z-20 overflow-hidden ${!isResizing ? 'transition-[width] duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]' : ''}`;
  
  const isMobileOrMini = viewMode === 'mini' || viewMode === 'player-focus' || (!showCenterPanel && !showLeftPanel && currentBreakpoint === 'mobile');
  
  let rightPanelStyle: React.CSSProperties = {
      width: !isRightPanelVisible ? '0px' : (isMobileOrMini ? '100%' : `${rightPanelWidth}px`)
  };

  // CINEMA OVERRIDE (Right)
  // UPDATED: Removed border/shadow/bg styles to allow a clean floating/sidebar look without "card" container.
  if (isCinema) {
      rightPanelClass = `absolute z-50 h-full top-0 right-0 overflow-hidden transition-transform duration-500 cubic-bezier(0.2,0.8,0.2,1)`;
      rightPanelStyle = { 
          width: `${rightPanelWidth}px`, 
          transform: isRightPanelVisible ? 'translateX(0)' : 'translateX(100%)' // Move completely off-screen right
      };
  }

  // --- CENTER PANEL LOGIC ---
  const isScreenVisible = 
      introState >= 2 && 
      viewMode !== 'mini' && 
      viewMode !== 'player-focus' &&
      showCenterPanel &&
      (animSequence === 'reveal_center' || animSequence === 'idle' || animSequence === 'entering_center');

  // In Cinema mode, Left/Right panels are absolute, so flex-grow takes 100% of space automatically.
  // We ensure w-full is applied or w-0 if hidden.
  const screenContainerClass = `flex-grow flex flex-col relative overflow-hidden
      ${!isResizing ? 'transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)]' : ''}
      ${!isScreenVisible ? 'w-0 opacity-0 scale-95' : 'w-auto opacity-100 scale-100'}
  `;

  return {
    viewMode,
    setViewMode: handleSetViewMode,
    showLeftPanel,
    setShowLeftPanel,
    toggleLeftPanel,
    showCenterPanel, 
    showRightPanel,
    setShowRightPanel,
    toggleRightPanel,
    focusMode,
    toggleFocusMode,
    animSequence,
    isFullscreen,
    masterStyle,
    leftPanelClass,
    leftPanelStyle,
    rightPanelClass,
    rightPanelStyle,
    screenContainerClass,
    isResizing,
    leftPanelWidth,
    rightPanelWidth,
    handleMouseDownLeft,
    handleMouseDownRight
  };
};
