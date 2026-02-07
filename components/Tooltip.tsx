
import React from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  delay?: number; // Kept for interface compatibility but ignored logic-wise for "instant" feel
}

export const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  children, 
  side = 'top',
  align = 'center'
}) => {
  
  const getPositionClasses = () => {
    switch (side) {
      case 'top':
        return `bottom-full mb-2 ${
          align === 'start' ? 'left-0' : align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2'
        }`;
      case 'bottom':
        return `top-full mt-2 ${
          align === 'start' ? 'left-0' : align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2'
        }`;
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      default:
        return '';
    }
  };

  const getArrowClasses = () => {
    let base = 'absolute w-2 h-2 bg-slate-800 border-slate-700 transform rotate-45';
    
    if (side === 'top') {
      base += ' bottom-[-5px] border-b border-r';
      if (align === 'center') base += ' left-1/2 -translate-x-1/2';
      if (align === 'start') base += ' left-3';
      if (align === 'end') base += ' right-3';
    } else if (side === 'bottom') {
      base += ' top-[-5px] border-t border-l';
      if (align === 'center') base += ' left-1/2 -translate-x-1/2';
      if (align === 'start') base += ' left-3';
      if (align === 'end') base += ' right-3';
    } else if (side === 'left') {
      base += ' right-[-5px] top-1/2 -translate-y-1/2 border-t border-r';
    } else if (side === 'right') {
      base += ' left-[-5px] top-1/2 -translate-y-1/2 border-b border-l';
    }
    
    return base;
  };

  return (
    <div className="relative flex items-center group z-40 hover:z-[1000] transition-none">
      {children}
      
      {content && (
        <div 
          className={`
            absolute pointer-events-none z-[9999] px-3 py-2 
            bg-slate-800/95 border border-slate-700/80 rounded-lg shadow-2xl backdrop-blur-md
            whitespace-pre-wrap text-[10px] font-medium text-slate-200 tracking-wide
            opacity-0 group-hover:opacity-100 transition-opacity duration-200
            select-none w-max max-w-[200px] text-center
            ${getPositionClasses()}
          `}
        >
          {content}
          {/* Subtle arrow/caret */}
          <div className={getArrowClasses()} />
        </div>
      )}
    </div>
  );
};
