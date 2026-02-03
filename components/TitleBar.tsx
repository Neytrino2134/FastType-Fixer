
import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Disc, Maximize2 } from 'lucide-react';
import { ViewMode, AudioTrack } from '../types';
import { Tooltip } from './ui/Tooltip';

interface TitleBarProps {
  viewMode?: ViewMode;
  onRestore?: () => void;
  currentTrack?: AudioTrack;
}

const TitleBar: React.FC<TitleBarProps> = ({ viewMode = 'default', onRestore }) => {
  const [isElectron, setIsElectron] = useState(false);
  const [ipcRenderer, setIpcRenderer] = useState<any>(null);

  useEffect(() => {
    // Check if running in Electron with nodeIntegration
    if ((window as any).require) {
      try {
        const electron = (window as any).require('electron');
        setIpcRenderer(electron.ipcRenderer);
        setIsElectron(true);
      } catch (e) {
        console.log('Not running in Electron or require not defined');
      }
    }
  }, []);

  if (!isElectron) return null;

  const handleMinimize = () => ipcRenderer?.send('window-minimize');
  const handleMaximize = () => ipcRenderer?.send('window-maximize');
  const handleClose = () => ipcRenderer?.send('window-close');

  // --- DEFAULT HEADER ---
  // We use the default header even for 'mini' mode now, because 'mini' mode 
  // is just a compact layout within the large 800x1000 window.
  return (
    <div className="h-8 bg-gray-950 flex items-center justify-between select-none z-[99999] w-full shrink-0 transition-colors duration-500">
      {/* Draggable Area */}
      <div className="flex-1 h-full flex items-center px-3 gap-2 app-drag-region overflow-hidden">
        {/* Logo Icon - Uses Theme Accent Color */}
        <Disc size={16} className="text-theme-accent animate-spin-slow shrink-0" />
        
        {/* Title Text - Uses Theme Primary Color */}
        <span className="text-[10px] font-mono font-bold text-theme-primary tracking-widest pt-0.5 truncate drop-shadow-[0_0_5px_rgba(0,0,0,0.5)]">
          NEON RETRO PLAYER {viewMode === 'mini' ? '// COMPACT' : ''}
        </span>
      </div>

      {/* Window Controls (No Drag) */}
      <div className="flex h-full app-no-drag">
        {viewMode === 'mini' && onRestore && (
             <Tooltip content="RESTORE LAYOUT" position="bottom">
                <button 
                onClick={onRestore}
                className="system-cursor w-12 h-full flex items-center justify-center text-theme-accent transition-all duration-200 hover:bg-white/5 hover:text-white focus:outline-none"
                >
                <Maximize2 size={12} />
                </button>
            </Tooltip>
        )}

        {/* Minimize Button - Theme Highlight on Hover */}
        <Tooltip content="MINIMIZE" position="bottom">
            <button 
            onClick={handleMinimize}
            className="system-cursor w-12 h-full flex items-center justify-center text-theme-muted transition-all duration-200 hover:bg-white/5 hover:text-theme-primary hover:shadow-[inset_0_-2px_0_var(--color-primary)] focus:outline-none"
            >
            <Minus size={14} />
            </button>
        </Tooltip>
        
        {/* Maximize Button - Theme Highlight on Hover */}
        <Tooltip content="MAXIMIZE" position="bottom">
            <button 
            onClick={handleMaximize}
            className="system-cursor w-12 h-full flex items-center justify-center text-theme-muted transition-all duration-200 hover:bg-white/5 hover:text-theme-primary hover:shadow-[inset_0_-2px_0_var(--color-primary)] focus:outline-none"
            >
            <Square size={12} />
            </button>
        </Tooltip>
        
        {/* Close Button - Red Icon + Red Underline on Hover */}
        <Tooltip content="CLOSE" position="bottom-right">
            <button 
            onClick={handleClose}
            className="system-cursor w-12 h-full flex items-center justify-center text-theme-muted transition-all duration-200 hover:bg-white/5 hover:text-red-500 hover:shadow-[inset_0_-2px_0_#ef4444] focus:outline-none"
            >
            <X size={14} />
            </button>
        </Tooltip>
      </div>
    </div>
  );
};

export default TitleBar;
