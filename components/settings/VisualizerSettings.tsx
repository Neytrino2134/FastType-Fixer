
import React, { useState } from 'react';
import { Maximize, Split, Square, Minus, Grid, ChevronDown, Zap } from 'lucide-react';
import { VisualizerConfig, VisualizerPosition } from '../../types';
import RangeControl from './RangeControl';
import ToggleSwitch from './ToggleSwitch';
import CustomSelect from './CustomSelect';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

interface VisualizerSettingsProps {
  config: VisualizerConfig;
  update: (key: keyof VisualizerConfig, value: any) => void;
  mode: 'waveform' | 'reactor'; // Explicit mode prop
}

const VisualizerSettings: React.FC<VisualizerSettingsProps> = ({ config, update, mode }) => {
  const { t } = useLanguage();
  const { controlStyle } = useTheme();
  
  // Toggles groups state
  const [expandSegmented, setExpandSegmented] = useState(true);
  const [expandTips, setExpandTips] = useState(true);
  
  // Fine Tuning groups state
  const [expandQty, setExpandQty] = useState(false);
  const [expandPower, setExpandPower] = useState(false);
  const [expandFreq, setExpandFreq] = useState(false);
  const [expandOpacity, setExpandOpacity] = useState(false);

  const styleOptions = [
    { value: 'theme-sync', label: t('style_theme_sync') },
    { value: 'neon-gradient', label: t('style_neon_gradient') },
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

  const colorOptions = [
    { value: 'white', label: t('color_white') },
    { value: 'blue', label: t('color_blue') },
    { value: 'pink', label: t('color_pink') },
    { value: 'green', label: t('color_green') },
    { value: 'purple', label: t('color_purple') },
    { value: 'yellow', label: t('color_yellow') },
    { value: 'red', label: t('color_red') },
  ];

  const threeDModeOptions = [
      { value: 'reactor', label: 'REACTOR CORE (ORB)' },
      { value: 'spectrum', label: '3D SPECTRUM (BARS)' }
  ];

  // Dynamic Radius for Custom Toggles
  let containerRadius = 'rounded-sm';
  let knobRadius = 'rounded-sm';

  if (controlStyle === 'round') {
      containerRadius = 'rounded-lg';
      knobRadius = 'rounded-md';
  } else if (controlStyle === 'circle') {
      containerRadius = 'rounded-full';
      knobRadius = 'rounded-full';
  }

  // Wrapper radius
  const wrapperRadius = controlStyle === 'round' ? 'rounded-lg' : 'rounded';

  return (
    <div className="p-4 border-t border-theme-border space-y-8">
      
      {/* Position Section - Hidden for Reactor since it's centered 3D */}
      {mode === 'waveform' && (
      <div className="section-block">
         <label className="text-theme-text font-mono text-xs block mb-3 tracking-widest uppercase opacity-70">{t('position')}</label>
         <div className="grid grid-cols-3 gap-2">
            {(['top', 'center', 'bottom', 'circle'] as VisualizerPosition[]).map((pos) => (
              <button 
                id={`tutorial-vis-pos-${pos}`}
                key={pos} 
                onClick={() => update('position', pos)} 
                className={`px-2 py-2 text-xs font-mono border ${wrapperRadius} capitalize transition-all ${
                  config.position === pos 
                    ? 'border-theme-secondary text-theme-secondary bg-theme-secondary/20 shadow-[0_0_8px_var(--color-secondary)]' 
                    : 'border-theme-border text-theme-muted hover:text-theme-text hover:border-theme-primary'
                }`}
              >
                {t(`pos_${pos}` as any)}
              </button>
            ))}
         </div>
      </div>
      )}

      {/* Style Section */}
      <div className="section-block">
         <CustomSelect 
            label={t('visual_style')} 
            value={config.style} 
            options={styleOptions} 
            onChange={(v: any) => update('style', v)} 
         />
      </div>

      {/* REACTOR 3D MODE SELECTOR */}
      {mode === 'reactor' && (
          <div className="section-block mb-4">
             <CustomSelect 
                label="3D MODE" 
                value={config.threeDMode || 'reactor'} 
                options={threeDModeOptions} 
                onChange={(v: any) => update('threeDMode', v)} 
             />
          </div>
      )}

      {/* Toggles Section - WAVEFORM ONLY */}
      {mode === 'waveform' && (
      <div className="space-y-3">
         <label className="text-theme-text font-mono text-xs block mb-2 tracking-widest uppercase opacity-70">{t('processing')}</label>
         
         {/* Segmented Bars - Custom Collapsible */}
         <div className={`bg-theme-panel/40 ${wrapperRadius} overflow-hidden mb-2 transition-all duration-300 border border-theme-border hover:border-theme-primary hover:shadow-[0_0_5px_var(--color-primary)]`}>
             <div className="flex items-center justify-between p-3 border-b border-theme-border">
                <div 
                   className="flex items-center gap-3 cursor-pointer flex-1"
                   onClick={() => setExpandSegmented(!expandSegmented)}
                >
                    <div className="text-theme-accent opacity-80">
                        <Grid size={16} />
                    </div>
                    <span className="font-mono text-[11px] tracking-widest text-theme-text uppercase">{t('visual_segmented')}</span>
                    {config.segmented && (
                        <ChevronDown size={14} className={`text-theme-primary opacity-70 transition-transform ${expandSegmented ? 'rotate-180' : ''}`} />
                    )}
                </div>
                <button
                    onClick={() => update('segmented', !config.segmented)}
                    className={`relative w-10 h-5 ${containerRadius} transition-all duration-300 shadow-inner ml-2 border border-theme-border
                    ${config.segmented ? 'bg-[var(--color-toggle-bg)] shadow-[0_0_8px_var(--color-toggle-bg)]' : 'bg-gray-800'}
                    hover:border-theme-primary hover:shadow-[0_0_5px_var(--color-primary)]
                    `}
                >
                    <div className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-theme-toggleKnob ${knobRadius} shadow-md transition-transform duration-300
                    ${config.segmented ? 'translate-x-5' : 'translate-x-0'}
                    `}></div>
                </button>
             </div>
             
             {/* Collapsible Segment Settings */}
             <div 
                className={`grid transition-[grid-template-rows,padding,opacity] duration-300 ease-in-out
                    ${config.segmented && expandSegmented ? 'grid-rows-[1fr] opacity-100 p-3 pt-2' : 'grid-rows-[0fr] opacity-0 p-0'}
                `}
             >
                <div className="overflow-hidden">
                    <div className="pl-8 space-y-3 border-l-2 border-theme-border ml-2">
                        <RangeControl 
                            label={t('seg_height')} 
                            value={config.segmentHeight || 4} 
                            min={2} max={30} step={1} 
                            onChange={(v: number) => update('segmentHeight', v)} 
                            className="mb-0"
                        />
                        <RangeControl 
                            label={t('seg_gap')} 
                            value={config.segmentGap || 2} 
                            min={0} max={10} step={1} 
                            onChange={(v: number) => update('segmentGap', v)} 
                            className="mb-0"
                        />
                        <ToggleSwitch 
                            label={t('highlight_brick')} 
                            icon={Zap} 
                            value={config.highlightLastBrick} 
                            onChange={(v: boolean) => update('highlightLastBrick', v)} 
                            color="blue"
                        />
                    </div>
                </div>
             </div>
         </div>

         {/* Show Tips - Custom Collapsible */}
         <div className={`bg-theme-panel/40 ${wrapperRadius} overflow-hidden mb-2 transition-all duration-300 border border-theme-border hover:border-theme-primary hover:shadow-[0_0_5px_var(--color-primary)]`}>
             <div className="flex items-center justify-between p-3 border-b border-theme-border">
                <div 
                   className="flex items-center gap-3 cursor-pointer flex-1"
                   onClick={() => setExpandTips(!expandTips)}
                >
                    <div className="text-theme-accent opacity-80">
                        <Minus size={16} />
                    </div>
                    <span className="font-mono text-[11px] tracking-widest text-theme-text uppercase">{t('visual_tips')}</span>
                    {config.showTips && (
                        <ChevronDown size={14} className={`text-theme-primary opacity-70 transition-transform ${expandTips ? 'rotate-180' : ''}`} />
                    )}
                </div>
                <button
                    onClick={() => update('showTips', !config.showTips)}
                    className={`relative w-10 h-5 ${containerRadius} transition-all duration-300 shadow-inner ml-2 border border-theme-border
                    ${config.showTips ? 'bg-[var(--color-toggle-bg)] shadow-[0_0_8px_var(--color-toggle-bg)]' : 'bg-gray-800'}
                    hover:border-theme-primary hover:shadow-[0_0_5px_var(--color-primary)]
                    `}
                >
                    <div className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-theme-toggleKnob ${knobRadius} shadow-md transition-transform duration-300
                    ${config.showTips ? 'translate-x-5' : 'translate-x-0'}
                    `}></div>
                </button>
             </div>

             {/* Collapsible Tip Settings */}
             <div 
                className={`grid transition-[grid-template-rows,padding,opacity] duration-300 ease-in-out
                    ${config.showTips && expandTips ? 'grid-rows-[1fr] opacity-100 p-3 pt-2' : 'grid-rows-[0fr] opacity-0 p-0'}
                `}
             >
                <div className="overflow-hidden">
                    <div className="pl-8 space-y-3 border-l-2 border-theme-border ml-2">
                        <CustomSelect 
                            label={t('tip_color')} 
                            value={config.tipColor || 'white'} 
                            options={colorOptions} 
                            onChange={(v: any) => update('tipColor', v)} 
                        />
                        <ToggleSwitch 
                            label={t('tip_glow')} 
                            icon={Zap} 
                            value={config.tipGlow} 
                            onChange={(v: boolean) => update('tipGlow', v)} 
                            color="green"
                        />
                        <RangeControl 
                            label={t('tip_height')} 
                            value={config.tipHeight || 2} 
                            min={1} max={20} step={1} 
                            onChange={(v: number) => update('tipHeight', v)} 
                            className="mb-0"
                        />
                        <RangeControl 
                            label={t('tip_speed')} 
                            value={config.tipSpeed || 15} 
                            min={1} max={50} step={1} 
                            onChange={(v: number) => update('tipSpeed', v)} 
                            className="mb-0"
                        />
                    </div>
                </div>
             </div>
         </div>

         <ToggleSwitch label={t('normalize')} icon={Maximize} value={config.normalize} onChange={(v: boolean) => update('normalize', v)} />
         <ToggleSwitch label={t('ignore_volume')} icon={Maximize} value={config.preventVolumeScaling || false} onChange={(v: boolean) => update('preventVolumeScaling', v)} />
         <ToggleSwitch label={t('mirror')} icon={Split} value={config.mirror} onChange={(v: boolean) => update('mirror', v)} />
         <ToggleSwitch label={t('stroke')} icon={Square} value={config.strokeEnabled} onChange={(v: boolean) => update('strokeEnabled', v)} />
      </div>
      )}

      {/* REACTOR SPECIFIC TOGGLES */}
      {mode === 'reactor' && (
          <div className="space-y-3">
              <ToggleSwitch label={t('ignore_volume')} icon={Maximize} value={config.preventVolumeScaling || false} onChange={(v: boolean) => update('preventVolumeScaling', v)} />
              {/* Only show mirror for Spectrum mode */}
              {config.threeDMode === 'spectrum' && (
                  <ToggleSwitch label={t('mirror')} icon={Split} value={config.mirror} onChange={(v: boolean) => update('mirror', v)} />
              )}
          </div>
      )}

      {/* Sliders Section */}
      <div className="pt-2 space-y-2">
        <label className="text-theme-text font-mono text-xs block mb-2 tracking-widest uppercase opacity-70 border-b border-theme-border pb-2">{t('fine_tuning')}</label>
        
        {/* BAR QUANTITY - Waveform OR 3D Spectrum */}
        {(mode === 'waveform' || (mode === 'reactor' && config.threeDMode === 'spectrum')) && (
        <div className={`bg-theme-panel/40 ${wrapperRadius} overflow-hidden transition-all duration-300 border border-theme-border hover:border-theme-primary hover:shadow-[0_0_5px_var(--color-primary)]`}>
            <div 
                className="flex items-center justify-between p-3 cursor-pointer select-none bg-black/20 border-b border-theme-border"
                onClick={() => setExpandQty(!expandQty)}
            >
                <span className="font-mono text-[10px] text-theme-primary font-bold tracking-widest uppercase">{t('group_qty_space')}</span>
                <ChevronDown size={14} className={`text-theme-primary opacity-70 transition-transform duration-300 ${expandQty ? 'rotate-180' : ''}`} />
            </div>
            
            <div className={`grid transition-[grid-template-rows,padding,opacity] duration-300 ease-in-out ${expandQty ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="p-3 pt-2 flex flex-col gap-4">
                        <RangeControl 
                            label={t('bar_count')} 
                            value={config.barCount} 
                            min={8} max={512} step={8} 
                            onChange={(v: number) => update('barCount', v)} 
                            className="mb-0"
                        />
                        <RangeControl 
                            label={t('bar_gap')} 
                            value={config.barGap} 
                            min={0} max={20} step={0.5} 
                            onChange={(v: number) => update('barGap', v)} 
                            className="mb-0"
                        />
                    </div>
                </div>
            </div>
        </div>
        )}

        {/* POWER & GRAVITY - Both */}
        <div className={`bg-theme-panel/40 ${wrapperRadius} overflow-hidden transition-all duration-300 border border-theme-border hover:border-theme-primary hover:shadow-[0_0_5px_var(--color-primary)]`}>
            <div 
                className="flex items-center justify-between p-3 cursor-pointer select-none bg-black/20 border-b border-theme-border"
                onClick={() => setExpandPower(!expandPower)}
            >
                <span className="font-mono text-[10px] text-theme-primary font-bold tracking-widest uppercase">{t('group_power_gravity')}</span>
                <ChevronDown size={14} className={`text-theme-primary opacity-70 transition-transform duration-300 ${expandPower ? 'rotate-180' : ''}`} />
            </div>
            
            <div className={`grid transition-[grid-template-rows,padding,opacity] duration-300 ease-in-out ${expandPower ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="p-3 pt-2 flex flex-col gap-4">
                        <RangeControl 
                            label={t('amplitude')} 
                            value={config.sensitivity} 
                            min={0.1} max={3.0} step={0.1} 
                            onChange={(v: number) => update('sensitivity', v)} 
                            className="mb-0"
                        />
                        {(mode === 'waveform' || (mode === 'reactor' && config.threeDMode === 'spectrum')) && (
                        <RangeControl 
                            label={t('bar_gravity')} 
                            value={config.barGravity ?? 5} 
                            min={0} max={10} step={0.5} 
                            onChange={(v: number) => update('barGravity', v)} 
                            className="mb-0"
                        />
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* FREQ CUTOFF - Waveform Only (Reactor is auto-tuned) */}
        {mode === 'waveform' && (
        <div className={`bg-theme-panel/40 ${wrapperRadius} overflow-hidden transition-all duration-300 border border-theme-border hover:border-theme-primary hover:shadow-[0_0_5px_var(--color-primary)]`}>
            <div 
                className="flex items-center justify-between p-3 cursor-pointer select-none bg-black/20 border-b border-theme-border"
                onClick={() => setExpandFreq(!expandFreq)}
            >
                <span className="font-mono text-[10px] text-theme-primary font-bold tracking-widest uppercase">{t('group_cutoff')}</span>
                <ChevronDown size={14} className={`text-theme-primary opacity-70 transition-transform duration-300 ${expandFreq ? 'rotate-180' : ''}`} />
            </div>
            
            <div className={`grid transition-[grid-template-rows,padding,opacity] duration-300 ease-in-out ${expandFreq ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="p-3 pt-2 flex flex-col gap-4">
                        <RangeControl 
                            label={t('min_freq')} 
                            value={config.minFrequency} 
                            min={0} 
                            max={99} 
                            step={1} 
                            onChange={(v: number) => {
                                if (v <= config.maxFrequency - 1) update('minFrequency', v);
                            }} 
                            className="mb-0"
                        />
                        <RangeControl 
                            label={t('max_freq')} 
                            value={config.maxFrequency} 
                            min={1} 
                            max={100} 
                            step={1} 
                            onChange={(v: number) => {
                                if (v >= config.minFrequency + 1) update('maxFrequency', v);
                            }} 
                            className="mb-0"
                        />
                    </div>
                </div>
            </div>
        </div>
        )}

        {/* OPACITY - Waveform Only (Reactor has internal opacity) */}
        {mode === 'waveform' && (
        <div className={`bg-theme-panel/40 ${wrapperRadius} overflow-hidden transition-all duration-300 border border-theme-border hover:border-theme-primary hover:shadow-[0_0_5px_var(--color-primary)]`}>
            <div 
                className="flex items-center justify-between p-3 cursor-pointer select-none bg-black/20 border-b border-theme-border"
                onClick={() => setExpandOpacity(!expandOpacity)}
            >
                <span className="font-mono text-[10px] text-theme-primary font-bold tracking-widest uppercase">{t('group_opacity')}</span>
                <ChevronDown size={14} className={`text-theme-primary opacity-70 transition-transform duration-300 ${expandOpacity ? 'rotate-180' : ''}`} />
            </div>
            
            <div className={`grid transition-[grid-template-rows,padding,opacity] duration-300 ease-in-out ${expandOpacity ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="p-3 pt-2 flex flex-col gap-4">
                        <RangeControl 
                            label={t('fill_opacity')} 
                            value={config.fillOpacity} 
                            min={0} max={1} step={0.1} 
                            onChange={(v: number) => update('fillOpacity', v)} 
                            className="mb-0"
                        />
                        
                        {config.strokeEnabled && (
                        <RangeControl 
                            label={t('stroke_opacity')} 
                            value={config.strokeOpacity} 
                            min={0} max={1} step={0.1} 
                            onChange={(v: number) => update('strokeOpacity', v)} 
                            className="mb-0"
                        />
                        )}
                    </div>
                </div>
            </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default VisualizerSettings;