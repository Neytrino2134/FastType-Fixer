
import React, { useEffect, useState, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { TranslatedText } from './ui/TranslatedText';
import { en } from '../locales/en';

interface ConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  translationKey?: keyof typeof en;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ onConfirm, onCancel, translationKey = 'confirm_clear' }) => {
  // Animation Phases:
  // 0: Init (Invisible)
  // 1: Overlay Fade In
  // 2: Window Width Expand (Line)
  // 3: Window Height Expand (Box)
  // 4: Content Fade In
  const [animPhase, setAnimPhase] = useState(0);
  const timeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    const schedule = (fn: () => void, ms: number) => {
        const id = window.setTimeout(fn, ms);
        timeoutsRef.current.push(id);
    };

    schedule(() => setAnimPhase(1), 50);
    schedule(() => setAnimPhase(2), 300);
    schedule(() => setAnimPhase(3), 800);
    schedule(() => setAnimPhase(4), 1300);

    return () => {
      timeoutsRef.current.forEach(window.clearTimeout);
    };
  }, []);

  const triggerClose = (callback: () => void) => {
    // Clear any pending opening animations
    timeoutsRef.current.forEach(window.clearTimeout);
    timeoutsRef.current = [];

    // Start Closing Sequence (Reverse of opening)
    setAnimPhase(3); // Fade content out
    
    const t1 = window.setTimeout(() => setAnimPhase(2), 300); // Collapse height
    const t2 = window.setTimeout(() => setAnimPhase(1), 800); // Collapse width
    const t3 = window.setTimeout(() => setAnimPhase(0), 1300); // Fade overlay
    const t4 = window.setTimeout(() => callback(), 1600); // Unmount parent
    
    timeoutsRef.current.push(t1, t2, t3, t4);
  };

  const handleConfirm = () => triggerClose(onConfirm);
  const handleCancel = () => triggerClose(onCancel);

  // Styles calculation based on phase
  const overlayClass = `absolute inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 transition-opacity duration-500 ${animPhase >= 1 ? 'opacity-100' : 'opacity-0'}`;
  
  const windowStyle: React.CSSProperties = {
    width: animPhase >= 2 ? '100%' : '0px',
    height: animPhase >= 3 ? '220px' : '2px', // Fixed height for consistency
    opacity: animPhase >= 2 ? 1 : 0,
    transition: 'width 0.5s cubic-bezier(0.23, 1, 0.32, 1), height 0.5s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.2s',
  };

  const contentClass = `flex flex-col h-full items-center justify-center text-center p-6 overflow-hidden transition-opacity duration-500 ${animPhase >= 4 ? 'opacity-100' : 'opacity-0'}`;

  // Render inline (absolute to parent) instead of Portal to contain it within specific panels
  return (
    <div className={overlayClass} onClick={handleCancel}>
      <div 
        className="bg-theme-panel border-2 border-red-500 shadow-[0_0_30px_rgba(255,0,0,0.3)] rounded-lg w-full max-w-sm relative"
        style={windowStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={contentClass}>
            
            <AlertTriangle className="text-red-500 w-12 h-12 mb-4 animate-pulse" />
            
            <h3 className="text-white font-mono font-bold text-lg uppercase tracking-widest mb-2">Warning</h3>
            
            <p className="text-gray-300 font-mono text-xs mb-6">
                <TranslatedText k={translationKey} />
            </p>
            
            <div className="flex gap-4 w-full justify-center">
                <button 
                  onClick={handleConfirm}
                  className="px-6 py-2 bg-red-600 text-black font-mono font-bold rounded hover:bg-red-500 hover:shadow-[0_0_15px_#ff0000] transition-all tracking-wider text-xs"
                >
                  YES
                </button>
                <button 
                  onClick={handleCancel}
                  className="px-6 py-2 border border-gray-600 text-gray-400 font-mono text-xs rounded hover:bg-gray-800 hover:text-white hover:border-white transition-all tracking-wider"
                >
                  NO
                </button>
            </div>

            {/* Decorative corners */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-red-500"></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-red-500"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-red-500"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-red-500"></div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
