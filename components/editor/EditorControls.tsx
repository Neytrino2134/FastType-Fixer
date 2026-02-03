
import React from 'react';
import { Play, Square, Trash2, Volume2, Music } from 'lucide-react';
import { EditorInstrument } from '../../types';
import RangeControl from '../settings/RangeControl';

interface EditorControlsProps {
  instruments: EditorInstrument[];
  bpm: number;
  setBpm: (v: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSetVolume: (id: string, vol: number) => void;
  onClearPattern: () => void;
  onExit: () => void;
}

const EditorControls: React.FC<EditorControlsProps> = ({ 
    instruments, bpm, setBpm, isPlaying, onTogglePlay, onSetVolume, onClearPattern, onExit
}) => {
  return (
    <div className="w-full h-full flex flex-col bg-theme-bg border-r-4 border-theme-panel shadow-inner overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-theme-panel border-b border-theme-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-theme-primary">
                <Music size={20} className="animate-pulse" />
                <span className="font-mono font-bold tracking-widest">STUDIO RACK</span>
            </div>
            <button 
                onClick={onExit}
                className="text-[10px] font-mono border border-theme-muted px-2 py-1 rounded text-theme-muted hover:text-white hover:border-white transition-colors"
            >
                EXIT EDITOR
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            
            {/* Transport Section */}
            <div className="bg-black/30 p-4 rounded-lg border border-theme-border">
                <div className="text-[10px] font-mono text-theme-muted mb-3 uppercase tracking-widest">MASTER TRANSPORT</div>
                
                <div className="flex items-center gap-4 mb-4">
                    <button 
                        onClick={onTogglePlay}
                        className={`
                            flex-1 py-4 rounded font-mono font-bold text-lg flex items-center justify-center gap-2 transition-all
                            ${isPlaying 
                                ? 'bg-red-500/20 text-red-500 border border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
                                : 'bg-green-500/20 text-green-500 border border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:bg-green-500/30'
                            }
                        `}
                    >
                        {isPlaying ? <><Square size={18} fill="currentColor" /> STOP</> : <><Play size={18} fill="currentColor" /> PLAY</>}
                    </button>
                </div>

                <RangeControl 
                    label={`TEMPO: ${Math.round(bpm)} BPM`} 
                    value={bpm} 
                    min={60} 
                    max={200} 
                    step={1} 
                    onChange={setBpm} 
                />
            </div>

            {/* Mixer Section */}
            <div className="bg-black/30 p-4 rounded-lg border border-theme-border">
                <div className="text-[10px] font-mono text-theme-muted mb-3 uppercase tracking-widest flex items-center gap-2">
                    <Volume2 size={12} /> CHANNEL MIXER
                </div>
                
                <div className="space-y-4">
                    {instruments.map(inst => (
                        <div key={inst.id} className="space-y-1">
                            <div className="flex justify-between text-[10px] font-mono">
                                <span style={{ color: inst.color }}>{inst.name}</span>
                                <span className="text-theme-muted">{Math.round(inst.volume * 100)}%</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.05" 
                                value={inst.volume}
                                onChange={(e) => onSetVolume(inst.id, parseFloat(e.target.value))}
                                className="w-full h-1 appearance-none rounded cursor-pointer bg-gray-800"
                                style={{ 
                                    backgroundImage: `linear-gradient(${inst.color}, ${inst.color})`,
                                    backgroundSize: `${inst.volume * 100}% 100%`,
                                    backgroundRepeat: 'no-repeat'
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Utilities */}
            <div className="grid grid-cols-1 gap-2">
                <button 
                    onClick={onClearPattern}
                    className="flex items-center justify-center gap-2 p-3 border border-gray-700 rounded text-xs font-mono text-gray-400 hover:text-red-400 hover:border-red-400 transition-all hover:bg-red-900/10"
                >
                    <Trash2 size={14} /> CLEAR PATTERN
                </button>
            </div>

        </div>
    </div>
  );
};

export default EditorControls;
