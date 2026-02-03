
import React, { useEffect, useState, useRef } from 'react';
import { Music, X, Lock } from 'lucide-react';
import { AudioTrack } from '../../types';

interface ScreenPlaylistProps {
  visible: boolean;
  tracks: AudioTrack[];
  currentTrack?: AudioTrack;
  onTrackSelect: (index: number) => void;
  onClose: () => void;
  marqueeColor: string;
  isLocked?: boolean;
}

const ScreenPlaylist: React.FC<ScreenPlaylistProps> = ({ visible, tracks, currentTrack, onTrackSelect, onClose, marqueeColor, isLocked }) => {
  // Animation Phases: 0: Init, 1: Line(Width), 2: Window(Height), 3: Content
  const [phase, setPhase] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let t1: number, t2: number, t3: number;
    if (visible) {
        // Opening Sequence
        setPhase(1); // Width
        t1 = window.setTimeout(() => setPhase(2), 300); // Height
        t2 = window.setTimeout(() => setPhase(3), 800); // Content
        
        // Scroll to active track after animation
        t3 = window.setTimeout(() => {
            if (scrollRef.current) {
                const activeEl = scrollRef.current.querySelector('[data-active="true"]');
                if (activeEl) activeEl.scrollIntoView({ block: "center", behavior: "smooth" });
            }
        }, 900);
    } else {
        setPhase(0);
    }
    return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
    };
  }, [visible]);

  if (!visible && phase === 0) return null;

  // Use the passed marqueeColor for visual consistency with the screen
  const baseColor = marqueeColor;

  return (
    <div 
        className="absolute right-4 top-20 bottom-20 z-[35] flex items-center justify-end pointer-events-none"
    >
        <div 
            className="relative pointer-events-auto flex flex-col overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] backdrop-blur-sm"
            style={{
                // Dimensions & Position
                width: phase >= 1 ? '320px' : '0px',
                height: phase >= 2 ? '100%' : '2px',
                
                // Light Hologram Style
                backgroundColor: `color-mix(in srgb, ${baseColor}, transparent 92%)`, // Very transparent light tint
                borderColor: `color-mix(in srgb, ${baseColor}, transparent 60%)`,
                borderWidth: '1px',
                borderStyle: 'solid',
                boxShadow: `0 0 30px color-mix(in srgb, ${baseColor}, transparent 90%)`,
                
                borderRadius: phase >= 2 ? '12px' : '0px',
                opacity: phase >= 1 ? 1 : 0
            }}
        >
            {/* Decorative Grid BG */}
            <div 
                className="absolute inset-0 bg-[length:20px_20px] pointer-events-none opacity-30"
                style={{
                    backgroundImage: `linear-gradient(color-mix(in srgb, ${baseColor}, transparent 80%) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, ${baseColor}, transparent 80%) 1px, transparent 1px)`
                }}
            ></div>

            {/* Decorative Corners */}
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 opacity-80" style={{ borderColor: baseColor }}></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 opacity-80" style={{ borderColor: baseColor }}></div>

            {/* Header */}
            <div 
                className="flex items-center justify-between p-3 border-b shrink-0 relative z-10 transition-opacity duration-300 delay-300"
                style={{ 
                    borderColor: `color-mix(in srgb, ${baseColor}, transparent 70%)`,
                    backgroundColor: `color-mix(in srgb, ${baseColor}, transparent 85%)`,
                    opacity: phase >= 2 ? 1 : 0
                }}
            >
                <div className="flex items-center gap-2">
                    {isLocked ? (
                        <Lock size={16} className="text-red-500 animate-pulse" />
                    ) : (
                        <Music size={16} style={{ color: baseColor }} className="animate-pulse" />
                    )}
                    <span className="font-mono text-xs font-bold tracking-widest uppercase" style={{ color: baseColor }}>
                        PLAYLIST // {tracks.length}
                    </span>
                </div>
                <button 
                    onClick={onClose}
                    className="p-1 hover:bg-white/20 rounded transition-colors"
                    style={{ color: baseColor }}
                >
                    <X size={14} />
                </button>
            </div>

            {/* List Content */}
            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1 relative z-10 transition-opacity duration-500 delay-500"
                style={{ opacity: phase >= 3 ? 1 : 0 }}
            >
                {tracks.map((track, i) => {
                    const isPlaying = currentTrack?.id === track.id;
                    return (
                        <div 
                            key={track.id}
                            data-active={isPlaying}
                            onClick={() => { if (!isLocked) onTrackSelect(i); }}
                            className={`
                                group flex items-center gap-3 p-2 rounded transition-all border
                                ${isPlaying 
                                    ? 'bg-white/10 border-current shadow-[inset_0_0_10px_rgba(255,255,255,0.1)]' 
                                    : 'border-transparent'
                                }
                                ${isLocked 
                                    ? 'cursor-not-allowed opacity-70' 
                                    : 'cursor-pointer hover:bg-white/5 hover:border-white/10'
                                }
                            `}
                            style={{ 
                                color: isPlaying ? baseColor : `color-mix(in srgb, ${baseColor}, white 40%)`, // Lighter text for readability
                                borderColor: isPlaying ? baseColor : 'transparent'
                            }}
                        >
                            <span className="font-mono text-[10px] opacity-60 w-6 shrink-0">
                                {String(i + 1).padStart(2, '0')}
                            </span>
                            
                            <span className={`font-mono text-xs truncate flex-1 ${isPlaying ? 'font-bold' : ''}`}>
                                {track.name}
                            </span>

                            {isPlaying && (
                                <div className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ backgroundColor: baseColor }}></div>
                            )}
                        </div>
                    );
                })}

                {tracks.length === 0 && (
                    <div className="text-center py-10 opacity-50 font-mono text-xs" style={{ color: baseColor }}>
                        NO DATA FOUND
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default ScreenPlaylist;
