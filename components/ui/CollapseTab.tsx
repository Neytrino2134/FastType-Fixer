
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface CollapseTabProps {
  isOpen: boolean;
  onClick: () => void;
  side: 'left' | 'right';
  style?: React.CSSProperties;
}

const CollapseTab: React.FC<CollapseTabProps> = ({ isOpen, onClick, side, style }) => {
  return (
      // Trigger Area (Invisible but detectable)
      <div 
        className={`
            absolute top-1/2 -translate-y-1/2 z-[60]
            w-6 h-32
            flex items-center justify-center
            group/trigger
            ${!style ? (side === 'left' ? 'left-0' : 'right-0') : ''}
        `}
        style={style}
      >
          {/* Actual Button - Hidden until trigger hover */}
          {/* We add a 'key' prop here based on isOpen. 
              When the panel collapses/expands, the key changes, forcing React to 
              unmount the old tooltip (removing the stuck floating element) and mount a new one. */}
          <Tooltip 
            key={isOpen ? 'open' : 'closed'}
            content={isOpen ? "COLLAPSE" : "EXPAND"} 
            position={side === 'left' ? 'right' : 'left'}
          >
            <button
                onClick={onClick}
                className={`
                    h-8 w-5 
                    bg-theme-panel/90 backdrop-blur-sm
                    border border-gray-700
                    text-theme-muted
                    hover:text-theme-primary hover:border-theme-primary hover:bg-theme-panel
                    transition-all duration-200 ease-out
                    flex items-center justify-center
                    opacity-0 group-hover/trigger:opacity-100
                    pointer-events-none group-hover/trigger:pointer-events-auto
                    ${side === 'left' 
                        ? 'rounded-r -translate-x-full group-hover/trigger:translate-x-0 border-l-0' 
                        : 'rounded-l translate-x-full group-hover/trigger:translate-x-0 border-r-0'}
                `}
            >
                {side === 'left' 
                    ? (isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />)
                    : (isOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />)
                }
            </button>
          </Tooltip>
      </div>
  );
};

export default CollapseTab;
