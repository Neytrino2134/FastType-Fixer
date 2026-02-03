
import React, { useState } from 'react';
import { Square, CheckSquare, Eye, EyeOff, Key } from 'lucide-react';
import RangeControl from '../RangeControl';
import CustomSelect from '../CustomSelect';
import { EffectsConfig, HologramCategory } from '../../../types';
import { useLanguage } from '../../../contexts/LanguageContext';

interface GeminiSettingsProps {
  config: EffectsConfig['geminiChat'];
  update: (val: EffectsConfig['geminiChat']) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
}

const GeminiSettings: React.FC<GeminiSettingsProps> = ({ config, update, apiKey, setApiKey }) => {
  const { t } = useLanguage();
  const [showKey, setShowKey] = useState(false);

  const toggleCategory = (cat: HologramCategory) => {
      const newCats = { ...config.categories, [cat]: !config.categories[cat] };
      update({ ...config, categories: newCats });
  };

  const colorOptions = [
      { value: 'theme', label: 'THEME SYNC' },
      { value: '#00f3ff', label: 'NEON CYAN' },
      { value: '#ff3333', label: 'WARNING RED' },
      { value: '#ff8c00', label: 'SOLAR ORANGE' },
      { value: '#00ff00', label: 'TOXIC GREEN' },
      { value: '#bc13fe', label: 'DEEP PURPLE' },
      { value: '#ff00ff', label: 'HOT PINK' },
      { value: '#ffffff', label: 'PURE WHITE' },
  ];

  return (
    <div className="pt-2">
       {/* 0. API Key Input */}
       <div className="mb-4 bg-black/20 p-2 rounded border border-theme-border">
          <label className="text-theme-text font-mono text-[10px] block mb-2 tracking-widest uppercase opacity-70 flex items-center gap-2">
             <Key size={12} /> {t('api_key_label')}
          </label>
          <div className="flex gap-2">
             <input 
                type={showKey ? "text" : "password"} 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t('api_key_placeholder')}
                className="flex-1 bg-black/50 border-b border-theme-muted/50 focus:border-theme-primary outline-none text-xs font-mono text-theme-text placeholder-theme-muted/30 px-1 py-1 transition-colors"
             />
             <button 
                onClick={() => setShowKey(!showKey)}
                className="p-1 text-theme-muted hover:text-theme-primary transition-colors"
             >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
             </button>
          </div>
       </div>

       {/* 1. Categories Grid */}
       <div className="mb-4 border-t border-theme-border pt-3">
          <label className="text-white font-mono text-[10px] block mb-2 tracking-widest uppercase opacity-70">TOPICS</label>
          <div className="grid grid-cols-2 gap-2">
              {(['interactive', 'music', 'motivational', 'philosophy', 'space'] as HologramCategory[]).map(cat => (
                  <button 
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`
                        flex items-center gap-2 p-1.5 rounded border text-xs font-mono transition-all text-left
                        ${config.categories[cat] 
                            ? 'border-theme-primary bg-theme-primary/10 text-theme-primary' 
                            : 'border-theme-border bg-gray-800 text-theme-muted hover:border-theme-muted hover:text-theme-text'}
                    `}
                  >
                     {config.categories[cat] 
                        ? <CheckSquare size={12} className="shrink-0" /> 
                        : <Square size={12} className="shrink-0" />}
                     <span className="truncate">{t(`cat_${cat}` as any)}</span>
                  </button>
              ))}
          </div>
       </div>

       {/* 2. Style / Color */}
       <div className="mb-4 pt-2 border-t border-theme-border">
           <CustomSelect 
              label={t('hologram_color')}
              value={config.color || 'theme'}
              options={colorOptions}
              onChange={(v) => update({ ...config, color: v })}
           />
       </div>
       
       <div className="border-t border-theme-border pt-2">
         <RangeControl label={t('opacity')} value={config.opacity} min={0.1} max={1} step={0.1} onChange={v => update({ ...config, opacity: v })} />
         <RangeControl label={t('width')} value={config.width || 350} min={300} max={800} step={10} onChange={v => update({ ...config, width: v })} />
         <RangeControl label={t('print_speed')} value={config.typingSpeed} min={0.5} max={3} step={0.5} onChange={v => update({ ...config, typingSpeed: v })} />
       </div>
    </div>
  );
};

export default GeminiSettings;