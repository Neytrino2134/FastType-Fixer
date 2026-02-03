
import React from 'react';
import { EditorInstrument } from '../../types';

interface MusicEditorProps {
  instruments: EditorInstrument[];
  currentStep: number;
  onToggleStep: (id: string, step: number) => void;
  isPlaying: boolean;
}

const MusicEditor: React.FC<MusicEditorProps> = ({ instruments, currentStep, onToggleStep, isPlaying }) => {
  return (
    <div className="w-full h-full bg-black flex flex-col p-4 md:p-8 relative overflow-hidden">
      {/* Background Grid Decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-20" 
           style={{ backgroundImage: 'linear-gradient(#111 1px, transparent 1px), linear-gradient(90deg, #111 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6 z-10">
          <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <h2 className="text-2xl font-mono font-bold text-white tracking-[0.2em] uppercase text-shadow-neon">
                  NEON SEQUENCER
              </h2>
          </div>
          <div className="text-xs font-mono text-theme-muted">
              STEP: {String(currentStep + 1).padStart(2, '0')} / 16
          </div>
      </div>

      {/* Sequencer Grid */}
      <div className="flex-1 flex flex-col gap-4 z-10 overflow-y-auto custom-scrollbar pr-2">
          {/* Step Indicators (Top) */}
          <div className="flex gap-1 pl-24 md:pl-32">
              {Array.from({ length: 16 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`flex-1 h-1 rounded-full transition-colors duration-75 ${i === currentStep ? 'bg-white shadow-[0_0_10px_white]' : 'bg-gray-800'}`}
                  ></div>
              ))}
          </div>

          {instruments.map(inst => (
              <div key={inst.id} className="flex gap-4 items-center">
                  {/* Instrument Label */}
                  <div className="w-20 md:w-28 shrink-0 flex flex-col justify-center">
                      <span 
                        className="text-xs font-mono font-bold truncate tracking-wider"
                        style={{ color: inst.color, textShadow: `0 0 5px ${inst.color}` }}
                      >
                          {inst.name}
                      </span>
                      <div className="w-full h-1 bg-gray-800 rounded mt-1 overflow-hidden">
                          <div 
                            className="h-full transition-all duration-300"
                            style={{ width: `${inst.volume * 100}%`, backgroundColor: inst.color }}
                          ></div>
                      </div>
                  </div>

                  {/* Steps */}
                  <div className="flex-1 grid grid-cols-16 gap-1 h-10 md:h-12">
                      {inst.steps.map((isActive, stepIdx) => {
                          const isCurrent = stepIdx === currentStep;
                          const isBeat = stepIdx % 4 === 0; // Highlight every 4th beat
                          
                          return (
                              <button
                                  key={stepIdx}
                                  onClick={() => onToggleStep(inst.id, stepIdx)}
                                  className={`
                                      rounded-sm transition-all duration-75 relative border
                                      ${isActive 
                                          ? 'border-transparent shadow-[0_0_10px_currentColor]' 
                                          : 'bg-gray-900/50 border-gray-800 hover:border-gray-600'
                                      }
                                      ${isCurrent ? 'brightness-150 scale-105 z-10' : ''}
                                  `}
                                  style={{ 
                                      backgroundColor: isActive ? inst.color : undefined,
                                      borderColor: (!isActive && isCurrent) ? 'white' : undefined,
                                      color: inst.color,
                                      opacity: (!isActive && !isBeat) ? 0.6 : 1
                                  }}
                              >
                                  {isCurrent && (
                                      <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                                  )}
                              </button>
                          );
                      })}
                  </div>
              </div>
          ))}
      </div>
      
      {/* Decorative Footer */}
      <div className="mt-4 border-t border-gray-800 pt-2 flex justify-between text-[10px] font-mono text-gray-600 uppercase tracking-widest">
          <span>PATTERN MODE: 16-STEP</span>
          <span>QUANTIZE: 1/16</span>
          <span>SWING: 0%</span>
      </div>
    </div>
  );
};

export default MusicEditor;
