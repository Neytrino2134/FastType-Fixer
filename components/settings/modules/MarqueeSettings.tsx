
import React, { useState } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import RangeControl from '../RangeControl';
import CustomSelect from '../CustomSelect';
import { MarqueeConfig } from '../../../types';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';

interface MarqueeSettingsProps {
  config: MarqueeConfig;
  update: (key: keyof MarqueeConfig, val: any) => void;
}

const MarqueeSettings: React.FC<MarqueeSettingsProps> = ({ config, update }) => {
  const { t } = useLanguage();
  const { controlStyle } = useTheme();
  const [expandTimeScale, setExpandTimeScale] = useState(true);

  const styleOptions = [
    { value: 'theme-sync', label: t('style_theme_sync') }, // New Option
    { value: 'retro', label: t('style_retro') },
    { value: 'blue', label: t('style_blue') },
    { value: 'pink', label: t('style_pink') },
    { value: 'theme-blue', label: t('style_theme_blue') },
    { value: 'warm', label: t('style_warm') },
    { value: 'gray', label: t('style_gray') },
    { value: 'ocean', label: t('style_ocean') },
    { value: 'matrix', label: t('style_matrix') },
    { value: 'inferno', label: t('style_inferno') },
  ];

  // Dynamic Radius
  let containerRadius = 'rounded-sm';
  let knobRadius = 'rounded-sm';
  let wrapperRadius = 'rounded';

  if (controlStyle === 'round') {
      containerRadius = 'rounded-lg';
      knobRadius = 'rounded-md';
      wrapperRadius = 'rounded-lg';
  } else if (controlStyle === 'circle') {
      containerRadius = 'rounded-full';
      knobRadius = 'rounded-full';
      wrapperRadius = 'rounded-lg';
  }

  return (
    <div className="pt-2">
        <CustomSelect 
            label={t('visual_style')} 
            value={config.style || 'matrix'} 
            options={styleOptions} 
            onChange={(v) => update('style', v)} 
        />

        {/* Custom Collapsible for Time Scale (Progress Bar) */}
        <div className={`bg-theme-panel/40 ${wrapperRadius} overflow-hidden mb-3 transition-all duration-300 border border-theme-border hover:border-theme-primary hover:shadow-[0_0_5px_var(--color-primary)]`}>
          <div className="flex items-center justify-between p-3 border-b border-theme-border">
            <div 
               className="flex items-center gap-3 cursor-pointer flex-1"
               onClick={() => setExpandTimeScale(!expandTimeScale)}
            >
                <div className="text-theme-accent opacity-80">
                    <Clock size={16} />
                </div>
                <span className="font-mono text-[11px] tracking-widest text-theme-text uppercase">{t('time_scale')}</span>
                {config.showProgress && (
                    <ChevronDown size={14} className={`text-theme-primary opacity-70 transition-transform ${expandTimeScale ? 'rotate-180' : ''}`} />
                )}
            </div>
            <button
                onClick={() => update('showProgress', !config.showProgress)}
                className={`relative w-10 h-5 ${containerRadius} transition-all duration-300 shadow-inner ml-2 border border-theme-border
                ${config.showProgress ? 'bg-[var(--color-toggle-bg)] shadow-[0_0_8px_var(--color-toggle-bg)]' : 'bg-gray-800'}
                hover:border-theme-primary hover:shadow-[0_0_5px_var(--color-primary)]
                `}
            >
                <div className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-theme-toggleKnob ${knobRadius} shadow-md transition-transform duration-300
                ${config.showProgress ? 'translate-x-5' : 'translate-x-0'}
                `}></div>
            </button>
          </div>
          
          {/* Collapsible Progress Bar Settings */}
          <div 
            className={`grid transition-[grid-template-rows,padding,opacity] duration-300 ease-in-out
                ${config.showProgress && expandTimeScale ? 'grid-rows-[1fr] opacity-100 p-3 pt-2' : 'grid-rows-[0fr] opacity-0 p-0'}
            `}
          >
            <div className="overflow-hidden">
                <div className="pl-4 space-y-3 border-l-2 border-theme-border ml-2">
                <CustomSelect 
                    label={t('prog_mode')}
                    value={config.progressMode || 'continuous'}
                    options={[
                        { value: 'continuous', label: t('prog_cont') },
                        { value: 'blocks', label: t('prog_blocks') }
                    ]}
                    onChange={v => update('progressMode', v)}
                />
                <RangeControl 
                    label={t('prog_height')} 
                    value={config.progressHeight || 4} 
                    min={2} max={20} step={1} 
                    onChange={v => update('progressHeight', v)} 
                    className="mb-0"
                />
                <RangeControl 
                    label={t('prog_opacity')} 
                    value={config.progressOpacity || 0.8} 
                    min={0.1} max={1} step={0.1} 
                    onChange={v => update('progressOpacity', v)} 
                    className="mb-0"
                />
                </div>
            </div>
          </div>
        </div>

        <RangeControl label={t('speed')} value={config.speed} min={0.5} max={10} step={0.5} onChange={v => update('speed', v)} />
        <RangeControl label={t('opacity')} value={config.opacity} min={0} max={1} step={0.1} onChange={v => update('opacity', v)} />
        <RangeControl label={t('text_size')} value={config.fontSize} min={12} max={120} step={2} onChange={v => update('fontSize', v)} />
    </div>
  );
};

export default MarqueeSettings;
