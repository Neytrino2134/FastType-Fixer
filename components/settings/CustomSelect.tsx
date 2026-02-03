
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: number | string;
  label: string; 
  color?: string; // Optional color for the icon
  shape?: 'square' | 'rounded' | 'circle'; // Optional shape for the icon
}

interface CustomSelectProps {
  label: React.ReactNode;
  value: number | string;
  options: Option[];
  onChange: (value: any) => void;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ label, value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [allowOverflow, setAllowOverflow] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle overflow visibility after animation to prevent shadow clipping
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (isOpen) {
      timeout = setTimeout(() => setAllowOverflow(true), 300);
    } else {
      setAllowOverflow(false);
    }
    return () => clearTimeout(timeout);
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  const renderIcon = (option: Option, isSelectedInList: boolean = false) => {
      if (option.shape) {
          let radius = 'rounded-none';
          if (option.shape === 'rounded') radius = 'rounded-[3px]';
          if (option.shape === 'circle') radius = 'rounded-full';
          
          return (
              <div 
                  className={`w-3 h-3 border-[1.5px] ${radius} shrink-0 transition-colors`}
                  style={{ 
                      borderColor: 'currentColor', 
                      backgroundColor: isSelectedInList ? 'currentColor' : 'transparent' 
                  }}
              />
          );
      }
      if (option.color) {
          return (
              <div 
                className={`w-2 h-2 rounded-full shrink-0 ${isSelectedInList ? 'shadow-none ring-1 ring-black' : 'shadow-[0_0_5px_currentColor]'}`} 
                style={{ backgroundColor: option.color, color: option.color }}
              ></div>
          );
      }
      return null;
  };

  return (
    <div className="mb-6 last:mb-2" ref={containerRef}>
      <div className="flex justify-between font-mono text-[10px] mb-2 px-0.5 tracking-tighter">
        <span className="text-theme-text uppercase opacity-70">{label}</span>
      </div>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between bg-black border font-mono text-xs px-3 py-2 transition-all duration-300
            ${isOpen 
              ? 'border-theme-secondary shadow-[0_0_10px_var(--color-secondary)] text-theme-secondary rounded-t' 
              : 'border-theme-border text-theme-text hover:border-theme-primary rounded'
            }
          `}
        >
          <div className="flex items-center gap-2 truncate">
            {renderIcon(selectedOption)}
            <span className="truncate">{selectedOption?.label}</span>
          </div>
          <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-theme-secondary' : 'text-gray-500'}`}>
             <ChevronDown size={14} />
          </div>
        </button>

        <div 
            className={`
                grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}
            `}
        >
            <div className={`${allowOverflow && isOpen ? 'overflow-visible' : 'overflow-hidden'}`}>
                {/* Wrapper for shadow and border to avoid clipping by scrollbar container if separated */}
                <div className="w-full bg-black border-x border-b border-theme-secondary shadow-[0_0_15px_var(--color-secondary)] rounded-b">
                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                        {options.map((option) => (
                        <div
                            key={option.value}
                            onClick={() => {
                            onChange(option.value);
                            setIsOpen(false);
                            }}
                            className={`
                            px-3 py-2 text-xs font-mono cursor-pointer transition-colors border-b border-gray-900 last:border-0 flex items-center gap-2
                            ${option.value === value 
                                ? 'bg-theme-primary text-black font-bold' 
                                : 'text-theme-muted hover:bg-gray-900 hover:text-theme-primary'}
                            `}
                        >
                            {renderIcon(option, option.value === value)}
                            {option.label}
                        </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CustomSelect;
