
import React, { useEffect, useRef, useState } from 'react';
import { X, Move, Monitor } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface StreamWindowProps {
  stream: MediaStream;
  onClose: () => void;
}

const StreamWindow: React.FC<StreamWindowProps> = ({ stream, onClose }) => {
  const { colors } = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Window State
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ w: 480, h: 320 }); // 3:2 Aspect default
  
  // Drag/Resize State
  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const initialDims = useRef({ x: 0, y: 0, w: 0, h: 0 });

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // --- DRAG LOGIC ---
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    initialDims.current = { x: position.x, y: position.y, w: 0, h: 0 };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // --- RESIZE LOGIC ---
  const handleResizeDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    initialDims.current = { x: 0, y: 0, w: size.w, h: size.h };

    // Set custom resize cursor class
    document.body.classList.add('custom-cursor-col-resize');
    document.body.style.cursor = 'none';
    document.body.style.userSelect = 'none';

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging.current) {
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setPosition({
            x: initialDims.current.x + dx,
            y: initialDims.current.y + dy
        });
    } else if (isResizing.current) {
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setSize({
            w: Math.max(200, initialDims.current.w + dx),
            h: Math.max(150, initialDims.current.h + dy)
        });
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    
    if (isResizing.current) {
        isResizing.current = false;
        document.body.classList.remove('custom-cursor-col-resize');
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    }
    
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  return (
    <div 
      className="fixed z-[60] flex flex-col bg-black/90 backdrop-blur-md border border-theme-primary shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden rounded-lg transition-colors"
      style={{
        left: position.x,
        top: position.y,
        width: size.w,
        height: size.h,
        borderColor: `color-mix(in srgb, ${colors.primary}, transparent 50%)`,
        boxShadow: `0 0 20px color-mix(in srgb, ${colors.primary}, transparent 80%)`
      }}
    >
      {/* Header */}
      <div 
        className="h-8 bg-theme-primary/20 border-b border-theme-primary/50 flex items-center justify-between px-2 cursor-move shrink-0 select-none"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2 text-theme-primary">
            <Monitor size={14} />
            <span className="font-mono text-[10px] font-bold tracking-widest uppercase">STREAM OUTPUT</span>
        </div>
        <div className="flex items-center gap-2">
            <Move size={12} className="text-theme-primary opacity-50" />
            <button 
                onClick={onClose}
                className="text-theme-primary hover:text-white transition-colors p-1 hover:bg-theme-primary/20 rounded"
            >
                <X size={14} />
            </button>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative bg-black overflow-hidden flex items-center justify-center">
         {/* Grid Pattern Overlay */}
         <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:20px_20px] pointer-events-none z-10 opacity-20"></div>
         
         <video 
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
         />
      </div>

      {/* Resize Handle */}
      <div 
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-20"
        onMouseDown={handleResizeDown}
      >
         <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-theme-primary"></div>
      </div>
    </div>
  );
};

export default StreamWindow;
