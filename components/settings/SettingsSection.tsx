
import React from 'react';
import { ChevronRight } from 'lucide-react';
import { TranslatedText } from '../ui/TranslatedText';

interface SettingsSectionProps {
  id: string;
  title: React.ReactNode;
  isOpen: boolean;
  onToggle: (isAdditive: boolean) => void;
  stickyTop: string;
  children: React.ReactNode;
}

export const NumberedLabel = ({ num, k, custom }: { num: string, k?: any, custom?: string }) => (
    <span className="flex items-center gap-2">
        <span className="text-theme-muted opacity-50 font-normal">{num} //</span>
        {custom ? custom : <TranslatedText k={k} />}
    </span>
);

const SettingsSection: React.FC<SettingsSectionProps> = ({ id, title, isOpen, onToggle, stickyTop, children }) => {
  return (
    <>
      {/* Sticky Header */}
      <div 
        id={`section-header-${id}`}
        onClick={(e) => onToggle(e.shiftKey)}
        className={`
            sticky z-30 cursor-pointer flex items-center justify-between px-3 py-2 transition-all duration-300 shadow-lg border-b backdrop-blur-sm
            ${isOpen 
                ? 'bg-theme-primary/10 border-theme-primary text-theme-primary shadow-[0_4px_15px_-10px_var(--color-primary)]' 
                : 'bg-theme-bg border-theme-border text-theme-muted hover:bg-theme-panel hover:text-theme-text'
            }
        `}
        style={{ top: stickyTop, height: '36px' }}
      >
        <h3 className={`text-xs font-mono font-bold tracking-widest opacity-90 uppercase flex items-center gap-2 ${isOpen ? 'text-theme-primary drop-shadow-[0_0_5px_rgba(var(--color-primary),0.5)]' : ''}`}>
           {title}
        </h3>
        <div className={`transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isOpen ? 'rotate-90 text-theme-primary' : 'rotate-0 text-theme-muted'}`}>
           <ChevronRight size={14} />
        </div>
      </div>
      
      {/* Collapsible Content */}
      <div 
        className={`
          grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}
        `}
      >
         <div className="overflow-hidden">
            <div 
              className={`
                transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] px-1
                ${isOpen 
                  ? 'opacity-100 translate-x-0 py-3' 
                  : 'opacity-0 -translate-x-4 py-0 pointer-events-none'}
              `}
            >
                <div className="space-y-3">
                    {children}
                </div>
            </div>
         </div>
      </div>
    </>
  );
};

export default SettingsSection;
