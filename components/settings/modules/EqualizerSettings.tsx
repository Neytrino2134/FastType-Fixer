
import React from 'react';
import { EqualizerConfig } from '../../../types';
import { EQ_FREQUENCIES, EQ_PRESETS } from '../../../config/eqPresets';
import ToggleSwitch from '../ToggleSwitch';
import CustomSelect from '../CustomSelect';
import { Sliders, Power } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

interface EqualizerSettingsProps {
  config: EqualizerConfig;
  onBandChange: (index: number, val: number) => void;
  onPresetChange: (presetId: string, bands: number[]) => void;
  onToggle: () => void;
}

const EqualizerSettings: React.FC<EqualizerSettingsProps> = ({ config, onBandChange, onPresetChange, onToggle }) => {
  const { t } = useLanguage();

  const handlePresetSelect = (val: string) => {
      const preset = EQ_PRESETS.find(p => p.id === val);
      if (preset) {
          onPresetChange(val, preset.bands);
      }
  };

  const presetOptions = EQ_PRESETS.map(p => ({ value: p.id, label: p.label }));

  // Helper to format frequency labels (60, 1k, 12k)
  const formatFreq = (hz: number) => {
      if (hz >= 1000) return `${hz / 1000}k`;
      return `${hz}`;
  };

  return (
    <div className="pt-2 space-y-4">
        {/* Toggle */}
        <ToggleSwitch 
            label={t('eq_enable')} 
            icon={Power} 
            value={config.enabled} 
            onChange={onToggle} 
            color="green"
        />

        {/* Preset Selector */}
        <CustomSelect 
            label={t('eq_preset')} 
            value={config.preset} 
            options={presetOptions} 
            onChange={handlePresetSelect} 
        />

        {/* Sliders Container */}
        <div className={`bg-black/20 p-3 rounded border border-theme-border transition-opacity ${config.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <div className="flex justify-between items-end h-48 gap-1 md:gap-2">
                {EQ_FREQUENCIES.map((freq, i) => (
                    <div key={freq} className="flex flex-col items-center flex-1 group">
                        {/* Gain Value */}
                        <div className="text-[9px] font-mono text-theme-muted mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {Math.round(config.bands[i])}
                        </div>
                        
                        {/* Vertical Slider Wrapper */}
                        <div className="relative flex-1 w-full flex justify-center bg-gray-900/50 rounded-full border border-theme-border/30 overflow-hidden">
                            {/* Visual Bar */}
                            <div 
                                className="absolute bottom-0 w-full bg-theme-primary/20"
                                style={{ 
                                    height: `${((config.bands[i] + 12) / 24) * 100}%`,
                                    transition: 'height 0.1s linear'
                                }}
                            ></div>
                            
                            {/* Center Line (0dB) */}
                            <div className="absolute top-1/2 w-full h-px bg-theme-border/50"></div>

                            {/* Actual Input */}
                            <input 
                                type="range" 
                                min="-12" 
                                max="12" 
                                step="0.5" 
                                value={config.bands[i]} 
                                onChange={(e) => onBandChange(i, parseFloat(e.target.value))}
                                className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer opacity-0 z-10"
                                style={{
                                    // Make sure vertical orientation works or handled via wrapper
                                    WebkitAppearance: 'slider-vertical',
                                    writingMode: 'bt-lr' // Deprecated but helpful fallback
                                } as any} 
                            />
                            
                            {/* Thumb Indicator (Visual only, position calculated) */}
                            <div 
                                className="absolute w-3 h-3 bg-theme-primary rounded-full shadow-[0_0_5px_var(--color-primary)] pointer-events-none transition-all duration-100"
                                style={{ 
                                    bottom: `calc(${((config.bands[i] + 12) / 24) * 100}% - 6px)` 
                                }}
                            ></div>
                        </div>

                        {/* Frequency Label */}
                        <div className="mt-2 text-[9px] font-mono text-theme-muted font-bold">
                            {formatFreq(freq)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};

export default EqualizerSettings;
