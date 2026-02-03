
import React, { useEffect, useState, useRef } from 'react';

interface ProgressBarProps {
  progress: number; // 0 to 100
  color?: string;
  visible: boolean;
  mode?: 'continuous' | 'blocks';
  height?: number;
  opacity?: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  color = '#00ff00', 
  visible,
  mode = 'continuous',
  height = 4,
  opacity = 0.8
}) => {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [glitchText, setGlitchText] = useState<string | null>(null);
  
  const animationRef = useRef<number>(0);
  const glitchIntervalRef = useRef<number>(0);
  const isAnimatingRef = useRef(false);

  // Handle Progress Changes & Reset Animation
  useEffect(() => {
    // If we detect a reset (e.g. from > 90% to < 10%), assume track change/restart
    if (progress < 10 && displayProgress > 90) {
        animateToZero();
    } else {
        // Normal update - only if not currently resetting
        if (!isAnimatingRef.current) {
            setDisplayProgress(progress);
        }
    }
  }, [progress]);

  const startGlitch = () => {
      if (glitchIntervalRef.current) clearInterval(glitchIntervalRef.current);
      const chars = "0123456789%$#@!&";
      glitchIntervalRef.current = window.setInterval(() => {
          const r1 = chars[Math.floor(Math.random()*chars.length)];
          const r2 = chars[Math.floor(Math.random()*chars.length)];
          setGlitchText(`${r1}${r2}%`);
      }, 50);
  };

  const stopGlitch = () => {
      if (glitchIntervalRef.current) clearInterval(glitchIntervalRef.current);
      setGlitchText(null);
  };

  const animateToZero = () => {
    isAnimatingRef.current = true;
    startGlitch();
    
    const startValue = displayProgress;
    const startTime = performance.now();
    const duration = 600; // 600ms slide transition

    const animate = (time: number) => {
        const elapsed = time - startTime;
        const t = Math.min(1, elapsed / duration);
        
        // Easing out cubic
        const ease = 1 - Math.pow(1 - t, 3);
        const current = startValue * (1 - ease);

        setDisplayProgress(current);

        if (t < 1) {
            animationRef.current = requestAnimationFrame(animate);
        } else {
             // Reset complete
             setDisplayProgress(0);
             isAnimatingRef.current = false;
             stopGlitch();
        }
    };

    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(animate);
  };

  // Cleanup
  useEffect(() => {
      return () => {
          if (animationRef.current) cancelAnimationFrame(animationRef.current);
          if (glitchIntervalRef.current) clearInterval(glitchIntervalRef.current);
      };
  }, []);

  if (!visible) return null;

  // Digital Block Mode
  if (mode === 'blocks') {
    // Number of blocks
    const totalBlocks = 50; 
    const activeBlocks = Math.ceil((displayProgress / 100) * totalBlocks);

    return (
      <div className="absolute top-0 left-0 w-full z-40 pointer-events-none flex items-center pr-12">
        {/* Blocks Container */}
        <div className="flex-1 flex gap-[2px] h-full" style={{ height: `${height}px`, opacity }}>
            {Array.from({ length: totalBlocks }).map((_, i) => (
                <div 
                    key={i} 
                    className="flex-1 transition-colors duration-100"
                    style={{ 
                        backgroundColor: i < activeBlocks ? color : 'rgba(255,255,255,0.1)',
                        boxShadow: i < activeBlocks ? `0 0 5px ${color}` : 'none'
                    }}
                />
            ))}
        </div>

        {/* Percentage Indicator (Right side) */}
        <div 
            className="absolute right-2 top-0 font-mono font-bold tracking-widest"
            style={{ 
                color: color, 
                fontSize: `${Math.max(10, height + 6)}px`,
                lineHeight: 1,
                top: `${height > 10 ? 0 : -2}px`,
                textShadow: `0 0 5px ${color}`
            }}
        >
            {glitchText ? glitchText : `${Math.floor(displayProgress)}%`}
        </div>
      </div>
    );
  }

  // Continuous Mode
  return (
    <div className="absolute top-0 left-0 w-full z-40 pointer-events-none">
      <div 
        className="w-full bg-gray-900/50 backdrop-blur-sm relative overflow-hidden"
        style={{ height: `${height}px`, opacity }}
      >
        {/* Fill Bar */}
        <div 
          className="h-full relative transition-all duration-300 ease-linear"
          style={{ 
            width: `${displayProgress}%`,
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}`
          }}
        >
          {/* Leading Edge Cursor */}
          <div className="absolute top-0 right-0 h-full w-1 bg-white animate-pulse shadow-[0_0_5px_#fff]"></div>
        </div>
        
        {/* Loading Text - Only show if thick enough */}
        {height >= 8 && (
            <div 
            className="absolute top-0 left-2 font-mono font-bold tracking-widest drop-shadow-md transition-opacity duration-300 flex items-center h-full"
            style={{ color: color, opacity: displayProgress > 0 ? 0.9 : 0, fontSize: `${height * 0.8}px` }}
            >
            {glitchText ? `RESETTING... [${glitchText}]` : `LOADING SYSTEM... ${Math.floor(displayProgress)}%`}
            </div>
        )}
      </div>
    </div>
  );
};

export default ProgressBar;
