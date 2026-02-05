import React from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number; // Kept for interface compatibility but ignored logic-wise for "instant" feel
}

export const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  children, 
  side = 'top'
}) => {
  
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative flex items-center group z-[100]">
      {children}
      
      <div 
        className={`
          absolute pointer-events-none z-[9999] px-3 py-2 
          bg-slate-800/95 border border-slate-700/80 rounded-lg shadow-2xl backdrop-blur-md
          whitespace-pre-wrap text-[10px] font-medium text-slate-200 tracking-wide
          opacity-0 group-hover:opacity-100 transition-opacity duration-200
          select-none w-max max-w-[200px] text-center
          ${positionClasses[side]}
        `}
      >
        {content}
        {/* Subtle arrow/caret */}
        <div 
            className={`
                absolute w-2 h-2 bg-slate-800 border-slate-700 transform rotate-45
                ${side === 'top' ? 'bottom-[-5px] left-1/2 -translate-x-1/2 border-b border-r' : ''}
                ${side === 'bottom' ? 'top-[-5px] left-1/2 -translate-x-1/2 border-t border-l' : ''}
                ${side === 'left' ? 'right-[-5px] top-1/2 -translate-y-1/2 border-t border-r' : ''}
                ${side === 'right' ? 'left-[-5px] top-1/2 -translate-y-1/2 border-b border-l' : ''}
            `}
        />
      </div>
    </div>
  );
};