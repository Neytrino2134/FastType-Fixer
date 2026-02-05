
import React, { useEffect, useState } from 'react';
import { HelpCircle, Keyboard, Mic, Zap, X, Palette } from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../utils/i18n';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, language }) => {
  const t = getTranslation(language);
  const [isVisible, setIsVisible] = useState(false);

  // Sync visibility for animation readiness
  useEffect(() => {
    if (isOpen) setIsVisible(true);
    else {
        const timer = setTimeout(() => setIsVisible(false), 300); // Match duration
        return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // If completely closed and animation finished, we can unmount or keep hidden
  // But to keep it simple with transitions, we keep it mounted but hidden via CSS
  // However, for performance, if it's "closed", we can return null after timeout?
  // Let's keep it mounted to ensure smooth reverse animation, using pointer-events-none.

  return (
    <div 
        className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-all duration-300 ${
            isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div 
        className={`
            relative bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden 
            transform transition-all duration-300 ease-out
            ${isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'}
        `}
      >
        
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-800/50">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-100">{t.helpModalTitle}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-700/50 text-slate-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Section: How it works */}
          <div className="flex gap-4">
            <div className="shrink-0 p-3 bg-blue-500/10 rounded-lg h-fit">
              <Palette className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-200 mb-1">{t.howItWorksTitle}</h3>
              <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-line">
                {t.howItWorksDesc}
              </p>
            </div>
          </div>

          {/* Section 1: Typing */}
          <div className="flex gap-4">
            <div className="shrink-0 p-3 bg-indigo-500/10 rounded-lg h-fit">
              <Zap className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-200 mb-1">{t.helpSection1}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {t.helpDesc1}
              </p>
            </div>
          </div>

          {/* Section 2: Shortcuts */}
          <div className="flex gap-4">
            <div className="shrink-0 p-3 bg-emerald-500/10 rounded-lg h-fit">
              <Keyboard className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-200 mb-1">{t.helpSection2}</h3>
              <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-line">
                {t.helpDesc2}
              </p>
            </div>
          </div>

          {/* Section 3: Mic */}
          <div className="flex gap-4">
            <div className="shrink-0 p-3 bg-amber-500/10 rounded-lg h-fit">
              <Mic className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-200 mb-1">{t.helpSection3}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {t.helpDesc3}
              </p>
            </div>
          </div>

        </div>

        <div className="p-4 bg-slate-950/50 border-t border-slate-800 text-center">
            <button 
                onClick={onClose}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors"
            >
                {t.tooltipClose}
            </button>
        </div>
      </div>
    </div>
  );
};
