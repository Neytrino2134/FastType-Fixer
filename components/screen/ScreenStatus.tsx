
import React from 'react';
import { Upload } from 'lucide-react';
import { AudioTrack } from '../../types';

interface ScreenStatusProps {
  isPlaying: boolean;
  currentTrack?: AudioTrack;
  isDragging: boolean;
  isSystemAudioActive?: boolean;
  videoStream?: MediaStream | null;
  marqueeColor: string;
}

const ScreenStatus: React.FC<ScreenStatusProps> = ({ 
    isPlaying, 
    currentTrack, 
    isDragging, 
    isSystemAudioActive, 
    videoStream, 
    marqueeColor 
}) => {
  
  if (isDragging) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-neon-blue/20 backdrop-blur-sm pointer-events-none border-4 border-dashed border-neon-blue m-2 rounded-xl animate-pulse">
        <div className="flex flex-col items-center gap-4 text-neon-blue font-mono drop-shadow-[0_0_10px_#00f3ff]">
          <Upload size={64} />
          <span className="text-2xl font-bold">DROP FILES HERE</span>
          <span className="text-sm opacity-70">AUDIO • IMAGES • VIDEO • NRP CONFIG</span>
        </div>
      </div>
    );
  }

  if (!isPlaying && !currentTrack && !isSystemAudioActive) {
    return (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div 
                className="font-mono text-xl border px-8 py-4 rounded bg-black/20 backdrop-blur-[2px]"
                style={{ 
                    color: marqueeColor, 
                    borderColor: `${marqueeColor}80`, 
                    boxShadow: `0 0 20px ${marqueeColor}20` 
                }}
            >
                {videoStream ? 'SYSTEM LINK ACTIVE' : 'INSERT DISK'}
            </div>
        </div>
    );
  }

  return null;
};

export default ScreenStatus;
