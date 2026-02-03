
import React from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, Shuffle, ArrowRight } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { NeonButton } from './NeonButton';
import { WaveformScrubber } from './WaveformScrubber';
import { useLanguage } from '../../contexts/LanguageContext';

interface TransportControlsProps {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onNext: () => void;
  onPrev: () => void;
  // Scrubber Props
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  trackId?: string;
  isLocked?: boolean; 
  // Playback Modes
  isShuffle?: boolean;
  setIsShuffle?: (v: boolean) => void;
  isAutoNextPlaylist?: boolean;
  setIsAutoNextPlaylist?: (v: boolean) => void;
}

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const TransportControls: React.FC<TransportControlsProps> = ({
  isPlaying, onPlay, onPause, onStop, onNext, onPrev,
  currentTime, duration, onSeek, trackId, isLocked,
  isShuffle, setIsShuffle, isAutoNextPlaylist, setIsAutoNextPlaylist
}) => {
  const { t } = useLanguage();
  const remainingTime = Math.max(0, duration - currentTime);

  // Wrappers to respect lock state
  const handlePrev = () => !isLocked && onPrev();
  const handleNext = () => !isLocked && onNext();
  const handleStop = () => !isLocked && onStop();
  const handlePause = () => !isLocked && onPause();
  
  // Play is allowed even if locked (Start playback feature)
  const handlePlay = () => onPlay();

  const handleToggleShuffle = () => {
      if (isLocked) return;
      if (setIsShuffle && isShuffle !== undefined) setIsShuffle(!isShuffle);
  };

  const handleToggleAuto = () => {
      if (isLocked) return;
      if (setIsAutoNextPlaylist && isAutoNextPlaylist !== undefined) setIsAutoNextPlaylist(!isAutoNextPlaylist);
  };

  return (
    <div className="flex-1 flex flex-col justify-between">
        
        {/* Waveform Area - Recessed "Screen" */}
        {/* Expanded vertically with flex-1 and flex-col */}
        <div className="bg-theme-bg/60 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)] rounded-lg p-3 relative overflow-hidden border border-white/5 flex-1 flex flex-col mb-2">
            <div className="flex justify-between text-xs font-mono text-theme-primary mb-2 opacity-60 relative z-10 shrink-0">
                <span>{formatTime(currentTime)}</span>
                <div className="flex gap-2">
                    <span>{formatTime(duration)}</span>
                    <span className="text-theme-muted opacity-50">(-{formatTime(remainingTime)})</span>
                </div>
            </div>
            
            {/* Scrubber Container */}
            <div className="flex items-center gap-3 relative z-10 flex-1">
                <Tooltip content={isLocked ? "LOCKED" : "STOP PLAYBACK"} position="top">
                    <button
                        onClick={handleStop}
                        disabled={isLocked}
                        className={`p-1.5 rounded transition-all shrink-0 self-center ${isLocked ? 'text-gray-600 cursor-not-allowed opacity-50' : 'text-theme-muted hover:text-red-500 hover:bg-white/5'}`}
                    >
                        <Square size={12} fill="currentColor" />
                    </button>
                </Tooltip>
                
                <div className="flex-1 h-full flex items-center">
                    <WaveformScrubber 
                        currentTime={currentTime} 
                        duration={duration} 
                        onSeek={onSeek} 
                        trackId={trackId}
                        isLocked={isLocked}
                    />
                </div>
            </div>
        </div>

        {/* Play Buttons: Clean, Floating */}
        <div className="flex justify-center items-center gap-4 mt-1 shrink-0 relative">
                
                {/* Shuffle Mode Toggle */}
                <div className="absolute left-0">
                    {setIsShuffle && (
                        <Tooltip content={isLocked ? "LOCKED" : t('mode_shuffle')} position="bottom">
                            <button
                                onClick={handleToggleShuffle}
                                disabled={isLocked}
                                className={`p-2 rounded-full transition-all 
                                    ${isShuffle ? 'text-theme-accent bg-theme-accent/10 shadow-[0_0_10px_var(--color-accent)]' : 'text-theme-muted opacity-50 hover:opacity-100'}
                                    ${isLocked ? 'cursor-not-allowed opacity-30 hover:opacity-30' : ''}
                                `}
                            >
                                <Shuffle size={14} />
                            </button>
                        </Tooltip>
                    )}
                </div>

                <Tooltip content={isLocked ? "LOCKED" : "PREVIOUS TRACK"} position="bottom">
                    <NeonButton 
                        onClick={handlePrev} 
                        variant="secondary" 
                        className={`w-10 h-10 ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <SkipBack size={18} />
                    </NeonButton>
                </Tooltip>
                
                {isPlaying ? (
                <Tooltip content={isLocked ? "LOCKED" : "PAUSE"} position="bottom">
                    <NeonButton 
                        id="tutorial-play-btn" 
                        onClick={handlePause} 
                        variant="primary" 
                        className={`w-16 h-16 shadow-lg bg-theme-panel ${isLocked ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                    >
                        <Pause size={32} />
                    </NeonButton>
                </Tooltip>
                ) : (
                <Tooltip content="PLAY" position="bottom">
                    <NeonButton 
                        id="tutorial-play-btn" 
                        onClick={handlePlay} 
                        variant="primary" 
                        className="w-16 h-16 shadow-lg bg-theme-panel"
                    >
                        <Play size={32} className="ml-1" />
                    </NeonButton>
                </Tooltip>
                )}

                <Tooltip content={isLocked ? "LOCKED" : "NEXT TRACK"} position="bottom">
                    <NeonButton 
                        onClick={handleNext} 
                        variant="secondary" 
                        className={`w-10 h-10 ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <SkipForward size={18} />
                    </NeonButton>
                </Tooltip>

                {/* Auto Playlist Toggle */}
                <div className="absolute right-0">
                    {setIsAutoNextPlaylist && (
                        <Tooltip content={isLocked ? "LOCKED" : t('mode_continue')} position="bottom">
                            <button
                                onClick={handleToggleAuto}
                                disabled={isLocked}
                                className={`p-2 rounded-full transition-all 
                                    ${isAutoNextPlaylist ? 'text-theme-primary bg-theme-primary/10 shadow-[0_0_10px_var(--color-primary)]' : 'text-theme-muted opacity-50 hover:opacity-100'}
                                    ${isLocked ? 'cursor-not-allowed opacity-30 hover:opacity-30' : ''}
                                `}
                            >
                                <ArrowRight size={14} />
                            </button>
                        </Tooltip>
                    )}
                </div>
        </div>
    </div>
  );
};
