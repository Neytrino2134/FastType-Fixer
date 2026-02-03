
import React, { useRef, useMemo, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface WaveformScrubberProps { 
    currentTime: number;
    duration: number;
    onSeek: (time: number) => void;
    trackId?: string;
    isLocked?: boolean; 
}

export const WaveformScrubber: React.FC<WaveformScrubberProps> = ({ currentTime, duration, onSeek, trackId }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { colors } = useTheme();
    const [isHovering, setIsHovering] = useState(false);

    // Increased bar count for better resolution on wider panels
    const BAR_COUNT = 100;

    const bars = useMemo(() => {
        const seed = trackId ? trackId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
        
        const generated = [];
        for(let i=0; i<BAR_COUNT; i++) {
            // Pseudo-random waveform generation based on trackId
            const x = Math.sin(seed + i * 0.2) * 10000;
            const rand = x - Math.floor(x); 
            // Mix of sine wave pattern and random noise for a "music-like" look
            const wave = Math.sin(i * 0.15) * 0.5 + 0.5; 
            const height = 0.2 + (wave * 0.4) + (rand * 0.4);
            
            generated.push(Math.min(1, Math.max(0.15, height)));
        }
        return generated;
    }, [trackId]);

    const handleClick = (e: React.MouseEvent) => {
        if (!containerRef.current || duration <= 0) return;
        const rect = containerRef.current.getBoundingClientRect();
        
        // Calculate relative position accurately
        const clickX = e.clientX - rect.left;
        let percent = clickX / rect.width;
        
        // Clamp percentage between 0 and 1 to prevent out-of-bounds seeking
        percent = Math.max(0, Math.min(1, percent));
        
        onSeek(percent * duration);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (e.buttons === 1) handleClick(e); 
    };

    const progressPercent = duration > 0 ? (currentTime / duration) : 0;

    return (
        <div 
            ref={containerRef}
            className="relative h-full w-full group flex items-center cursor-pointer select-none"
            style={{ gap: '1px' }} 
            onMouseDown={handleClick}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            {bars.map((height, i) => {
                const barPos = i / bars.length;
                const isPast = barPos <= progressPercent;
                
                return (
                    <div 
                        key={i}
                        // Removed max-w-[4px] to allow bars to stretch fully
                        // Changed min-w to 1px to prevent layout breaking on very small screens with high bar count
                        className="rounded-full transition-all duration-75 flex-1 min-w-[1px]"
                        style={{
                            height: `${height * 100}%`,
                            // Restrained colors: Primary for active, very dim gray for inactive
                            backgroundColor: isPast ? colors.primary : (isHovering ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)'),
                            boxShadow: isPast ? `0 0 5px ${colors.primary}` : 'none',
                            opacity: isPast ? 0.8 : 1 // Less glare
                        }}
                    />
                );
            })}
        </div>
    );
};
