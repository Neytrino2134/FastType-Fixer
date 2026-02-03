

import React, { useEffect, useRef, useState } from 'react';

interface MarqueeProps {
  text: string;
  speed: number;
  opacity: number;
  fontSize: number;
  className?: string; // Keep for legacy, but color overrides it
  color?: string; // New: Hex color
}

// Characters used for the glitch effect: Blocks + Symbols
const GLITCH_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*!??█▓▒░<>/[]{}-=_+";

const Marquee: React.FC<MarqueeProps> = ({ text, speed, opacity, fontSize, className, color = '#00ff00' }) => {
  // We keep track of what is actually displayed (which might be glitched)
  const [displayText, setDisplayText] = useState(text);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);
  const contentWidthRef = useRef(0);
  
  // Refs for scrolling logic
  const xPos = useRef(0);
  const scrollRequestRef = useRef<number>(0);

  // Refs for text transition logic
  const prevTextRef = useRef(text);
  const glitchIntervalRef = useRef<number>(0);

  // --- GLITCH TRANSITION LOGIC ---
  useEffect(() => {
    // Only run if text actually changed
    if (prevTextRef.current === text) {
        // Even if text didn't change, we might need to update displayText if it was stuck in a glitch state
        // (Though usually the interval handles this, this is a safety fallback for hot-reloads)
        if (displayText !== text && glitchIntervalRef.current === 0) {
            setDisplayText(text);
        }
        return;
    }

    const oldText = displayText; // Start from whatever is currently on screen
    const newText = text;
    prevTextRef.current = text;

    const duration = 1200; // ms total transition time
    const fps = 30;
    const stepTime = 1000 / fps;
    const totalSteps = duration / stepTime;
    let currentStep = 0;

    // Clear any existing transition
    if (glitchIntervalRef.current) clearInterval(glitchIntervalRef.current);

    glitchIntervalRef.current = window.setInterval(() => {
      currentStep++;
      const progress = currentStep / totalSteps;

      if (progress >= 1) {
        setDisplayText(newText);
        clearInterval(glitchIntervalRef.current);
        glitchIntervalRef.current = 0;
        return;
      }

      // Calculate "Chaos" Level (0 to 1 to 0)
      // 0.0 -> 0.0 (Clean Old)
      // 0.5 -> 1.0 (Total Chaos)
      // 1.0 -> 0.0 (Clean New)
      const chaos = 1 - Math.abs((progress - 0.5) * 2);

      // Determine which base string to use
      // First half: modify old text
      // Second half: modify new text
      const isSecondHalf = progress > 0.5;
      const baseStr = isSecondHalf ? newText : oldText;

      const glitched = baseStr.split('').map((char) => {
        // Space usually stays space to preserve word structure, 
        // but at high chaos, even spaces get corrupted for "rectangular" look
        if (char === ' ' && chaos < 0.8) return ' ';

        // Probability to glitch this specific character based on global chaos
        // We add some randomness so characters flicker
        if (Math.random() < chaos) {
           return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        }
        return char;
      }).join('');

      setDisplayText(glitched);

    }, stepTime);

    return () => {
        if (glitchIntervalRef.current) clearInterval(glitchIntervalRef.current);
    };
  }, [text]); // Run when 'text' prop changes

  // --- MEASURE WIDTH ---
  useEffect(() => {
    if (itemRef.current) {
        // Update width whenever the display text changes (glitch causes width flux)
        // or font size changes
        contentWidthRef.current = itemRef.current.offsetWidth;
    }
  }, [displayText, fontSize]);

  // --- SCROLLING LOOP ---
  useEffect(() => {
    const animate = () => {
      xPos.current -= speed * 0.5;
      
      const w = contentWidthRef.current;
      
      // Infinite scroll logic
      if (w > 0 && Math.abs(xPos.current) >= w) {
         xPos.current += w;
      }

      if (containerRef.current) {
        containerRef.current.style.transform = `translate3d(${xPos.current}px, 0, 0)`;
      }

      scrollRequestRef.current = requestAnimationFrame(animate);
    };

    scrollRequestRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(scrollRequestRef.current);
    };
  }, [speed]); // Depend on speed, but NOT displayText (refs handle dynamic width)

  return (
    <div 
      className={`overflow-hidden whitespace-nowrap w-full h-full pointer-events-none ${className}`} 
      style={{ opacity, fontSize: `${fontSize}px` }}
    >
      <div 
        ref={containerRef} 
        className="flex items-center h-full will-change-transform"
        style={{
            color: color,
            textShadow: `0 0 8px ${color}cc`
        }}
      >
        {/* Render multiple copies for seamless scrolling */}
        {[0, 1, 2, 3].map((i) => (
          <div 
            key={i} 
            ref={i === 0 ? itemRef : null}
            className="flex-shrink-0 px-4"
          >
            {displayText}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Marquee;