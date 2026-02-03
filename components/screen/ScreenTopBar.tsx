
import React from 'react';
import { Power, HelpCircle, List, Minimize, Maximize, Circle, Square, Lock } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { useLanguage } from '../../contexts/LanguageContext';

interface ScreenTopBarProps {
  rebootPhase: 'idle' | 'waiting' | 'active';
  onScheduleReload: () => void;
  duration: number;
  currentTime: number;
  marqueeColor: string;
  showHelp: boolean;
  setShowHelp: (v: boolean) => void;
  showPlaylist: boolean;
  setShowPlaylist: (v: boolean) => void;
  focusMode: boolean;
  setFocusMode: (v: boolean) => void;
  
  // Recording Props
  isRecording?: boolean;
  onStartRecording?: () => void;
  onStopRecording?: () => void;

  // Lock Prop
  isPlaylistLocked?: boolean;
}

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds) || seconds < 0) return "00:00";
  const totalSeconds = Math.floor(seconds);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const ScreenTopBar: React.FC<ScreenTopBarProps> = ({
  rebootPhase,
  onScheduleReload,
  duration,
  currentTime,
  marqueeColor,
  showHelp,
  setShowHelp,
  showPlaylist,
  setShowPlaylist,
  focusMode,
  setFocusMode,
  isRecording,
  onStartRecording,
  onStopRecording,
  isPlaylistLocked
}) => {
  const { t } = useLanguage();
  const isElectron = typeof navigator !== 'undefined' && /Electron/.test(navigator.userAgent);

  // Check if reboot is scheduled (waiting for track end)
  const isRebootWaiting = rebootPhase === 'waiting';

  // In Focus Mode (Big Screen), hide interface unless hovered.
  // EXCEPTION: If reboot is scheduled (waiting), keep interface visible to show the timer.
  const containerClass = (focusMode && !isRebootWaiting)
    ? "opacity-0 hover:opacity-100 transition-opacity duration-500" 
    : "opacity-100";

  return (
    <div className={`absolute inset-x-0 top-0 h-20 z-50 pointer-events-none ${containerClass}`}>
        {/* Pointer events auto enabled on children to allow clicking even when parent is transparent, 
            but we handle parent opacity hover for "Big Screen" effect */}
        
        {/* TOP LEFT CONTROLS */}
        <div className="absolute top-4 left-4 flex gap-2 pointer-events-auto items-center">
            <Tooltip content={t('reboot')} position="right">
            <button 
                onClick={onScheduleReload} 
                className="text-gray-500 opacity-50 p-2 bg-transparent rounded-full transition-all border border-transparent hover:text-red-500 hover:opacity-100 hover:bg-red-500/20 hover:shadow-[0_0_15px_rgba(255,0,0,0.5)] active:scale-95"
            >
                <Power size={20} />
            </button>
            </Tooltip>

            {isPlaylistLocked && (
                <div className="bg-gray-500/10 border border-gray-500 p-1.5 rounded-full text-gray-500">
                    <Lock size={14} />
                </div>
            )}
        </div>

        {/* TOP RIGHT CONTROLS & STATUS */}
        <div className="absolute top-4 right-4 flex items-center gap-4 pointer-events-auto">
            
            {/* RECORDING INDICATOR (If active) */}
            {isRecording && (
                <div className="flex items-center gap-2 bg-red-500/20 border border-red-500 rounded px-2 py-1 animate-pulse">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-[9px] font-mono text-red-500 font-bold tracking-widest">REC</span>
                </div>
            )}

            {rebootPhase === 'waiting' && (
            <div className="flex items-center gap-3 animate-slide-in-right pr-2">
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2">
                    <span 
                        className="text-[10px] font-mono font-bold tracking-widest leading-none"
                        style={{ color: marqueeColor, filter: `drop-shadow(0 0 5px ${marqueeColor})` }}
                    >
                        {t('reboot_scheduled')}
                    </span>
                    <div 
                        className="w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{ backgroundColor: marqueeColor, boxShadow: `0 0 5px ${marqueeColor}` }}
                    ></div>
                    </div>
                    <span 
                    className="text-[8px] font-mono tracking-wider leading-none mt-1 animate-pulse"
                    style={{ color: marqueeColor, opacity: 0.7 }}
                    >
                    {t('waiting_stream')}
                    </span>
                </div>
                <div 
                    className="text-3xl font-mono font-bold tabular-nums leading-none"
                    style={{ color: marqueeColor, filter: `drop-shadow(0 0 8px ${marqueeColor}99)` }}
                >
                -{formatTime(Math.max(0, duration - currentTime))}
                </div>
            </div>
            )}

            {/* BUTTONS */}
            <div className={`flex items-center gap-2 p-2 rounded-full transition-colors duration-300 ${focusMode ? 'bg-black/40 backdrop-blur-md' : ''}`}>
                
                {/* REC BUTTON - Only visible in Electron */}
                {onStartRecording && onStopRecording && isElectron && (
                    <Tooltip content={isRecording ? "STOP RECORDING" : "RECORD SCREEN"} position="left">
                        <button 
                            onClick={isRecording ? onStopRecording : onStartRecording}
                            className={`p-2 bg-transparent rounded-full transition-all border border-transparent active:scale-95
                                ${isRecording 
                                    ? 'text-red-500 hover:text-red-400 hover:shadow-[0_0_15px_#ef4444]' 
                                    : 'hover:text-red-500' // Default state inherits color below, hover red
                                }
                            `}
                            style={!isRecording ? { color: marqueeColor } : undefined}
                        >
                            {isRecording ? <Square size={20} fill="currentColor" /> : <Circle size={20} />}
                        </button>
                    </Tooltip>
                )}

                <Tooltip content="COMMANDS (H)" position="left">
                    <button 
                    onClick={() => setShowHelp(!showHelp)} 
                    style={{ color: marqueeColor }}
                    className="p-2 bg-transparent rounded-full transition-all border border-transparent hover:shadow-[0_0_15px_currentColor] active:scale-95"
                    >
                        <HelpCircle size={20} />
                    </button>
                </Tooltip>

                <Tooltip content="PLAYLIST VIEW (L)" position="left">
                    <button 
                    onClick={() => setShowPlaylist(!showPlaylist)} 
                    style={{ color: marqueeColor }}
                    className="p-2 bg-transparent rounded-full transition-all border border-transparent hover:shadow-[0_0_15px_currentColor] active:scale-95"
                    >
                        <List size={20} />
                    </button>
                </Tooltip>

                <Tooltip content={focusMode ? "EXIT CINEMA MODE (F)" : "CINEMA MODE (F)"} position="left">
                    <button 
                    onClick={() => setFocusMode(!focusMode)} 
                    style={{ color: marqueeColor }}
                    className="p-2 bg-transparent rounded-full transition-all border border-transparent hover:shadow-[0_0_15px_currentColor] active:scale-95"
                    >
                        {focusMode ? <Minimize size={20} /> : <Maximize size={20} />}
                    </button>
                </Tooltip>
            </div>
        </div>
    </div>
  );
};

export default ScreenTopBar;
