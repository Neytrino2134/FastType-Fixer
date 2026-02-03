
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'bottom-right';
  delay?: number;
  className?: string;
  overrideColor?: string; // New prop to force color
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top', delay = 200, className = "", overrideColor }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  
  // Animation States
  // 0: Hidden
  // 1: Line (Strip)
  // 2: Box (Expanded)
  // 3: Typing (Finished expansion)
  const [animStage, setAnimStage] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  
  const triggerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number>(0);
  const typingTimerRef = useRef<number>(0);

  const handleMouseEnter = () => {
    timerRef.current = window.setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        let top = 0;
        let left = 0;
        const gap = 12; // distance from element

        // Simple positioning logic
        switch (position) {
          case 'top':
            top = rect.top - gap;
            left = rect.left + rect.width / 2;
            break;
          case 'bottom':
            top = rect.bottom + gap;
            left = rect.left + rect.width / 2;
            break;
          case 'bottom-right':
            top = rect.bottom + gap;
            left = rect.right; // Anchor to right edge
            break;
          case 'left':
            top = rect.top + rect.height / 2;
            left = rect.left - gap;
            break;
          case 'right':
            top = rect.top + rect.height / 2;
            left = rect.right + gap;
            break;
        }

        setCoords({ top, left });
        setIsVisible(true);
      }
    }, delay);
  };

  const handleMouseLeave = () => {
    clearTimeout(timerRef.current);
    clearTimeout(typingTimerRef.current);
    setIsVisible(false);
    setAnimStage(0);
    setDisplayedText("");
  };

  // Animation Sequence Effect
  useEffect(() => {
    if (isVisible) {
      // Step 1: Show Line immediately
      setAnimStage(1);

      // Step 2: Expand to Box
      const t1 = setTimeout(() => {
        setAnimStage(2);
      }, 150); // Short delay for line visibility

      // Step 3: Start Typing
      const t2 = setTimeout(() => {
        setAnimStage(3);
      }, 400); // Wait for expansion to finish

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else {
      setAnimStage(0);
      setDisplayedText("");
    }
  }, [isVisible]);

  // Typewriter Effect Logic
  useEffect(() => {
    if (animStage === 3) {
      if (typeof content === 'string') {
        let i = 0;
        const text = content;
        setDisplayedText("");
        
        const typeChar = () => {
          if (i < text.length) {
            setDisplayedText(text.substring(0, i + 1));
            i++;
            // Random typing speed for realism
            typingTimerRef.current = window.setTimeout(typeChar, 20 + Math.random() * 30); 
          }
        };
        typeChar();
      } else {
        // If content is not a string (e.g. JSX), show immediately
        setDisplayedText("ready"); 
      }
    }
    return () => clearTimeout(typingTimerRef.current);
  }, [animStage, content]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
        clearTimeout(timerRef.current);
        clearTimeout(typingTimerRef.current);
    };
  }, []);

  const isStringContent = typeof content === 'string';

  return (
    <>
      <div 
        ref={triggerRef} 
        onMouseEnter={handleMouseEnter} 
        onMouseLeave={handleMouseLeave}
        className={`inline-flex ${className}`} 
      >
        {children}
      </div>
      {isVisible && createPortal(
        <div 
          className="fixed z-[99999] pointer-events-none flex flex-col items-center justify-center"
          style={{ 
             top: coords.top, 
             left: coords.left,
             transform: position === 'top' ? 'translate(-50%, -100%)' : 
                        position === 'bottom' ? 'translate(-50%, 0)' :
                        position === 'bottom-right' ? 'translate(-100%, 0)' :
                        position === 'left' ? 'translate(-100%, -50%)' :
                        'translate(0, -50%)',
             alignItems: position === 'bottom-right' ? 'flex-end' : 'center'
          }}
        >
            {/* 
                Animation Stages Styles:
                Stage 0: Hidden
                Stage 1 (Line): Height 2px, Width small/auto, No padding, Border only
                Stage 2 (Box): Height auto, Padding normal, Background opaque
            */}
          <div 
            className={`
                relative overflow-hidden transition-all duration-300 ease-out rounded
                ${animStage === 1 
                    ? `h-[2px] min-w-[20px] max-w-[40px] border-none ${!overrideColor ? 'bg-theme-primary shadow-[0_0_10px_var(--color-primary)]' : ''}` 
                    : `h-auto min-w-[60px] max-w-[250px] bg-black/90 border ${!overrideColor ? 'border-theme-primary shadow-[0_0_15px_var(--color-primary)]' : ''}`
                }
                ${animStage >= 2 ? 'px-3 py-1.5' : 'px-0 py-0'}
            `}
            style={overrideColor ? {
                backgroundColor: animStage === 1 ? overrideColor : undefined,
                borderColor: animStage >= 2 ? overrideColor : undefined,
                boxShadow: `0 0 ${animStage === 1 ? '10px' : '15px'} ${overrideColor}`
            } : undefined}
          >
             <div className={`
                text-[10px] font-mono font-bold tracking-wider uppercase whitespace-nowrap flex items-center
                ${!overrideColor ? 'text-theme-primary' : ''}
                ${animStage >= 3 ? 'opacity-100' : 'opacity-0'}
             `}
             style={overrideColor ? { color: overrideColor } : undefined}
             >
                {isStringContent ? (
                    <>
                        {displayedText}
                        <span 
                            className={`inline-block w-1.5 h-3 ml-0.5 animate-pulse align-middle ${!overrideColor ? 'bg-theme-primary' : ''}`}
                            style={overrideColor ? { backgroundColor: overrideColor } : undefined}
                        ></span>
                    </>
                ) : (
                    // If content is complex (JSX), fade it in
                    <div className="animate-fade-in-text">
                        {content}
                    </div>
                )}
             </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
