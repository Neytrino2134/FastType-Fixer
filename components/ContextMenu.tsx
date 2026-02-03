
import React, { useEffect, useState, useRef } from 'react';
import { ChevronRight, ChevronLeft, Image, Music, Maximize } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ContextMenuProps {
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onNextBg: () => void;
  onPrevBg: () => void;
  onToggleFullScreen: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  onNextTrack,
  onPrevTrack,
  onNextBg,
  onPrevBg,
  onToggleFullScreen
}) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const { t } = useLanguage();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // Block default browser menu
      
      let x = e.clientX;
      let y = e.clientY;
      
      // Boundary check to prevent menu going off-screen
      const width = 240;
      const height = 260; // Increased slightly for new option
      
      if (x + width > window.innerWidth) x = window.innerWidth - width;
      if (y + height > window.innerHeight) y = window.innerHeight - height;

      setPosition({ x, y });
      setVisible(true);
    };

    const handleClick = (e: MouseEvent) => {
        // Close if clicking outside, or clicking inside on a button (which handles close internally)
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
            setVisible(false);
        }
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
        if(e.key === 'Escape') setVisible(false);
    };

    // Attach to document to cover everything
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    // Handle scrolling closing the menu
    document.addEventListener('scroll', () => setVisible(false), true);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('scroll', () => setVisible(false), true);
    };
  }, []);

  if (!visible) return null;

  return (
    <div 
      ref={menuRef}
      className="fixed z-[100] w-60 bg-black/95 border border-theme-primary shadow-[0_0_20px_var(--color-primary)] backdrop-blur-md rounded flex flex-col overflow-hidden"
      style={{ top: position.y, left: position.x }}
    >
       {/* Header */}
       <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-gray-900/80">
          <span className="text-[10px] font-mono text-theme-primary tracking-widest font-bold">
            {t('ctx_actions')}
          </span>
          <div className="flex gap-1">
             <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]"></div>
             <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.5)]"></div>
             <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
          </div>
       </div>
       
       {/* Track Controls */}
       <div className="p-2 space-y-1">
           <div className="text-[9px] text-gray-500 px-2 mb-1 font-mono flex items-center gap-1 uppercase tracking-wider">
              <Music size={10} /> {t('ctx_track_ctrl')}
           </div>
           <button onClick={() => { onPrevTrack(); setVisible(false); }} className="w-full text-left px-3 py-2 text-xs font-mono text-theme-muted hover:bg-theme-primary hover:text-black transition-all flex items-center justify-between group rounded-sm border border-transparent hover:border-theme-primary/50">
               <span>{t('ctx_prev_track')}</span>
               <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
           </button>
           <button onClick={() => { onNextTrack(); setVisible(false); }} className="w-full text-left px-3 py-2 text-xs font-mono text-theme-muted hover:bg-theme-primary hover:text-black transition-all flex items-center justify-between group rounded-sm border border-transparent hover:border-theme-primary/50">
               <span>{t('ctx_next_track')}</span>
               <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" /> 
           </button>
       </div>

       <div className="h-px bg-gray-800 mx-2 shadow-[0_1px_0_rgba(255,255,255,0.05)]"></div>

       {/* Background Controls */}
       <div className="p-2 space-y-1">
           <div className="text-[9px] text-gray-500 px-2 mb-1 font-mono flex items-center gap-1 uppercase tracking-wider">
              <Image size={10} /> {t('ctx_bg_ctrl')}
           </div>
           <button onClick={() => { onPrevBg(); setVisible(false); }} className="w-full text-left px-3 py-2 text-xs font-mono text-theme-muted hover:bg-theme-secondary hover:text-black transition-all flex items-center justify-between group rounded-sm border border-transparent hover:border-theme-secondary/50">
               <span>{t('ctx_prev_bg')}</span>
               <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
           </button>
           <button onClick={() => { onNextBg(); setVisible(false); }} className="w-full text-left px-3 py-2 text-xs font-mono text-theme-muted hover:bg-theme-secondary hover:text-black transition-all flex items-center justify-between group rounded-sm border border-transparent hover:border-theme-secondary/50">
               <span>{t('ctx_next_bg')}</span>
               <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" /> 
           </button>
       </div>

       <div className="h-px bg-gray-800 mx-2 shadow-[0_1px_0_rgba(255,255,255,0.05)]"></div>

       {/* View Controls */}
       <div className="p-2 space-y-1">
           <div className="text-[9px] text-gray-500 px-2 mb-1 font-mono flex items-center gap-1 uppercase tracking-wider">
              <Maximize size={10} /> {t('ctx_view_ctrl')}
           </div>
           <button onClick={() => { onToggleFullScreen(); setVisible(false); }} className="w-full text-left px-3 py-2 text-xs font-mono text-theme-muted hover:bg-theme-accent hover:text-black transition-all flex items-center justify-between group rounded-sm border border-transparent hover:border-theme-accent/50">
               <span>{t('ctx_fullscreen')}</span>
           </button>
       </div>
    </div>
  );
};

export default ContextMenu;
