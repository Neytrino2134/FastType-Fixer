
import React, { useRef, useEffect } from 'react';
import { Volume2 } from 'lucide-react';

interface VolumeControlProps {
  volume: number;
  onVolumeChange: (vol: number) => void;
}

export const VolumeControl: React.FC<VolumeControlProps> = ({ volume, onVolumeChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Store volume in ref to avoid stale closure in listener
  const volumeRef = useRef(volume);
  useEffect(() => {
      volumeRef.current = volume;
  }, [volume]);

  // Native wheel listener for smooth scrolling without focus
  useEffect(() => {
      const volEl = containerRef.current;
      const onVolWheel = (e: WheelEvent) => {
          e.preventDefault();
          const step = 0.05;
          const direction = e.deltaY > 0 ? -1 : 1;
          const newVol = Math.max(0, Math.min(1, volumeRef.current + (step * direction)));
          onVolumeChange(newVol);
      };

      if (volEl) volEl.addEventListener('wheel', onVolWheel, { passive: false });
      return () => {
          if (volEl) volEl.removeEventListener('wheel', onVolWheel);
      };
  }, [onVolumeChange]);

  return (
    <div 
        ref={containerRef}
        className="w-12 bg-black/40 rounded-lg flex flex-col items-center justify-between py-3 shadow-inner group/vol relative border border-white/5"
    >
        <Volume2 size={16} className="text-theme-muted group-hover/vol:text-white transition-colors opacity-70 mb-2 shrink-0" />
        
        <div className="flex-1 w-full flex items-center justify-center relative">
            <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="absolute w-28 h-2 -rotate-90 origin-center cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                // Increased width for taller container (was 64px, now 110px)
                style={{ width: '110px' }} 
            />
        </div>

        <div className="text-[9px] font-mono font-bold text-theme-muted opacity-50 mt-2 shrink-0">{Math.round(volume * 100)}%</div>
    </div>
  );
};
