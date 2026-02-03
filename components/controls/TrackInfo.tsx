
import React from 'react';
import { Disc } from 'lucide-react';
import { AudioTrack } from '../../types';

interface TrackInfoProps {
  currentTrack?: AudioTrack;
}

export const TrackInfo: React.FC<TrackInfoProps> = ({ currentTrack }) => {
  // Common style for "recessed" plates: 
  // Changed from bg-black/40 to bg-theme-bg/30 (a bit lighter, more tinted)
  const plateStyle = "bg-theme-bg/30 rounded-lg shadow-inner border border-white/5";

  return (
    <div className="mb-6 flex gap-4 shrink-0 relative z-10">
        {/* Album Art: Recessed into chassis */}
        <div className={`w-24 h-24 shrink-0 overflow-hidden relative group ${plateStyle}`}>
            {currentTrack?.artworkUrl ? (
                <img src={currentTrack.artworkUrl} alt="Cover" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-theme-muted opacity-20">
                    <Disc size={40} />
                </div>
            )}
            {/* Gloss overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none"></div>
        </div>

        {/* Text Info: Recessed Screen look */}
        <div className={`flex-1 min-w-0 flex flex-col justify-center p-3 h-24 relative overflow-hidden ${plateStyle}`}>
            {/* Scanline texture */}
            <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%]"></div>
            
            <div className="h-full flex flex-col justify-between relative z-10">
                <div>
                    <p className="text-[9px] text-theme-muted font-mono uppercase tracking-widest mb-1 opacity-50">NOW PLAYING</p>
                    <div className="relative overflow-hidden w-full h-6">
                        {currentTrack ? (
                            <div className="absolute whitespace-nowrap text-theme-text font-mono text-lg font-bold animate-marquee drop-shadow-md">
                                {currentTrack.name}
                            </div>
                        ) : (
                            <span className="text-theme-muted font-mono text-sm opacity-30">NO SIGNAL</span>
                        )}
                    </div>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-theme-accent opacity-60">
                    <span>STEREO</span>
                    <span>44.1kHz</span>
                </div>
            </div>
        </div>
    </div>
  );
};
