
import React from 'react';
import { Settings, HelpCircle, Power, Home } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { APP_VERSION } from '../../lib/version';
import { Tooltip } from '../ui/Tooltip';
import { TranslatedText } from '../ui/TranslatedText';

interface SettingsHeaderProps {
  onGoHome: () => void;
  onScheduleReload: () => void;
  onShowHelp: () => void;
  isPlaylistLocked?: boolean;
}

const SettingsHeader: React.FC<SettingsHeaderProps> = ({ 
  onGoHome, 
  onScheduleReload, 
  onShowHelp,
}) => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="p-4 pb-0 mb-4 bg-theme-bg z-40 shrink-0">
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Settings className="animate-spin-slow text-theme-primary" size={24} />
          <div className="flex items-center gap-3">
              <h2 className="text-xl font-mono text-theme-text leading-none">
                  <TranslatedText k="system" />
              </h2>
              <div className="flex items-center gap-1.5 opacity-60 pt-1">
                  <div className="w-1.5 h-1.5 bg-theme-accent rounded-full animate-pulse"></div>
                  <span className="text-[9px] font-mono text-theme-primary tracking-widest">{APP_VERSION}</span>
              </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Tooltip content={t('help')} position="bottom">
            <button onClick={onShowHelp} className="text-theme-muted hover:text-theme-primary transition-colors p-1"><HelpCircle size={18} /></button>
          </Tooltip>
          <Tooltip content="HOME" position="bottom">
            <button onClick={onGoHome} className="text-theme-muted hover:text-theme-primary transition-colors p-1"><Home size={18} /></button>
          </Tooltip>
          <Tooltip content={t('reboot')} position="bottom">
            <button onClick={onScheduleReload} className="text-theme-muted hover:text-red-500 transition-colors p-1"><Power size={18} /></button>
          </Tooltip>
          <div className="w-px h-4 bg-theme-border mx-1"></div>
          <div className="relative flex items-center bg-theme-panel border border-theme-border rounded h-7 w-20 cursor-pointer overflow-hidden shadow-inner">
              <div className={`absolute top-0 bottom-0 w-1/2 bg-theme-primary rounded-sm transition-all duration-300 ease-out shadow-[0_0_10px_var(--color-primary)] opacity-90`} style={{ transform: language === 'en' ? 'translateX(2px)' : 'translateX(calc(100% + 2px))' }} />
              
              <Tooltip content="ENGLISH" position="bottom" className="flex-1 z-10 h-full">
                  <button onClick={() => setLanguage('en')} className={`w-full h-full text-[10px] font-mono font-bold text-center transition-colors duration-300 ${language === 'en' ? 'text-black' : 'text-theme-muted hover:text-theme-text'}`}>EN</button>
              </Tooltip>
              
              <Tooltip content="RUSSIAN" position="bottom" className="flex-1 z-10 h-full">
                  <button onClick={() => setLanguage('ru')} className={`w-full h-full text-[10px] font-mono font-bold text-center transition-colors duration-300 ${language === 'ru' ? 'text-black' : 'text-theme-muted hover:text-theme-text'}`}>RU</button>
              </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsHeader;
