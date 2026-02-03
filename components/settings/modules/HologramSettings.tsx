
import React from 'react';
import { Square, CheckSquare, Zap, Target } from 'lucide-react';
import RangeControl from '../RangeControl';
import CustomSelect from '../CustomSelect';
import ToggleSwitch from '../ToggleSwitch';
import { EffectsConfig, HologramCategory } from '../../../types';
import { useLanguage } from '../../../contexts/LanguageContext';

interface HologramSettingsProps {
  config: EffectsConfig['holograms'];
  update: (val: EffectsConfig['holograms']) => void;
}

const HologramSettings: React.FC<HologramSettingsProps> = ({ config, update }) => {
  const { t } = useLanguage();

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
       {/* 1. Categories Grid (Moved to top) */}
       <div className="mb-4">
          <label className="text-white font-mono text-[10px] block mb-2 tracking-widest uppercase opacity-70">CATEGORIES</label>
          <div className="grid grid-cols-2 gap-2">
              {(['system', 'interactive', 'music', 'motivational', 'philosophy', 'space'] as HologramCategory[]).map(cat => (
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

       {/* 2. Graphical Icons Toggle */}
       <div className="mb-4 pt-2 border-t border-theme-border">
          <ToggleSwitch 
              label={t('hologram_icons')} 
              icon={Zap} 
              value={config.enableIcons || false} 
              onChange={(v) => update({ ...config, enableIcons: v })} 
              color="blue"
          />
       </div>

       {/* 3. Interactive Hotspots Toggle (NEW) */}
       <div className="mb-4">
          <ToggleSwitch 
              label={t('show_hotspots')} 
              icon={Target} 
              value={config.showHotspots !== false} 
              onChange={(v) => update({ ...config, showHotspots: v })} 
              color="green"
          />
       </div>

       {/* 4. Style / Color (Moved below) */}
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
         <RangeControl label={t('scale')} value={config.scale ?? 1.0} min={0.5} max={2.0} step={0.1} onChange={v => update({ ...config, scale: v })} />
         <RangeControl label={t('msg_speed')} value={config.speed} min={0.5} max={5} step={0.5} onChange={v => update({ ...config, speed: v })} />
         <RangeControl label={t('msg_interval')} value={config.interval} min={1} max={60} step={1} onChange={v => update({ ...config, interval: v })} />
       </div>
    </div>
  );
};

export default HologramSettings;