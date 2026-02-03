
import React from 'react';
import RangeControl from '../RangeControl';
import CustomSelect from '../CustomSelect';
import ToggleSwitch from '../ToggleSwitch';
import { useLanguage } from '../../../contexts/LanguageContext';
import { DvdConfig, EffectsConfig } from '../../../types';
import { Volume2, Power, Play, Timer } from 'lucide-react';

const FPS_OPTIONS = [
  { value: 60, label: '60 FPS (OFF)' },
  { value: 30, label: '30 FPS' },
  { value: 25, label: '25 FPS (PAL)' },
  { value: 24, label: '24 FPS (CINEMA)' },
  { value: 12, label: '12 FPS (RETRO)' },
];

interface MixerSettingsProps {
    crossfadeDuration: number;
    setCrossfadeDuration: (v: number) => void;
    sfxVolume: number;
    setSfxVolume: (v: number) => void;
    smoothStart: boolean;
    setSmoothStart: (v: boolean) => void;
}

export const MixerSettings: React.FC<MixerSettingsProps> = ({ crossfadeDuration, setCrossfadeDuration, sfxVolume, setSfxVolume, smoothStart, setSmoothStart }) => {
    const { t } = useLanguage();
    return (
        <div className="pt-2 space-y-3">
            <div className="p-3 bg-theme-panel/50 border border-theme-border rounded">
                <RangeControl 
                    label={t('crossfade_duration')} 
                    value={crossfadeDuration} 
                    min={0} max={15} step={0.5} 
                    onChange={setCrossfadeDuration} 
                    className="mb-0"
                />
                <div className="mt-2 text-[10px] text-gray-500 font-mono flex items-start gap-1">
                    <div className="text-neon-blue">*</div>
                    <span>{t('constant_power_hint')}</span>
                </div>
            </div>

            <div className="p-3 bg-theme-panel/50 border border-theme-border rounded">
                <div className="mb-4">
                    <ToggleSwitch 
                        label={t('smooth_start')} 
                        icon={Play} 
                        value={smoothStart} 
                        onChange={setSmoothStart} 
                        color="green"
                    />
                </div>
                <RangeControl 
                    label={t('sfx_volume')} 
                    value={sfxVolume} 
                    min={0} max={1} step={0.05} 
                    onChange={setSfxVolume} 
                    className="mb-0"
                />
            </div>
        </div>
    );
};

export const DvdSettings: React.FC<{ config: DvdConfig, update: (k: keyof DvdConfig, v: any) => void }> = ({ config, update }) => {
    const { t } = useLanguage();
    return (
        <div className="pt-2">
            <div className="mb-4">
                <ToggleSwitch 
                    label={t('sfx_enabled')} 
                    icon={Volume2} 
                    value={config.enableSfx} 
                    onChange={(v) => update('enableSfx', v)} 
                    color="blue"
                />
            </div>
            
            <CustomSelect 
              label={t('dvd_logo_type')}
              value={config.logoType || 'dvd'}
              options={[
                { value: 'dvd', label: t('logo_dvd') },
                { value: 'neon_waves', label: t('logo_neon') }
              ]}
              onChange={v => update('logoType', v)}
           />

            <RangeControl label={t('size')} value={config.size} min={60} max={300} step={10} onChange={v => update('size', v)} />
            <RangeControl label={t('speed')} value={config.speed} min={1} max={15} step={1} onChange={v => update('speed', v)} />
            <RangeControl label={t('opacity')} value={config.opacity} min={0} max={1} step={0.1} onChange={v => update('opacity', v)} />
        </div>
    );
};

export const DebugSettings: React.FC<{ config: EffectsConfig['debugConsole'], update: (v: EffectsConfig['debugConsole']) => void }> = ({ config, update }) => {
    const { t } = useLanguage();
    return (
        <div className="pt-2">
           <div className="mb-4">
             <ToggleSwitch 
                label={t('debug_console')} 
                icon={Power} 
                value={config.enabled} 
                onChange={(v) => update({ ...config, enabled: v })} 
             />
           </div>
           <RangeControl label={t('opacity')} value={config.opacity} min={0.1} max={1} step={0.1} onChange={v => update({ ...config, opacity: v })} />
           <RangeControl label={t('scale')} value={config.scale} min={0.5} max={1.5} step={0.1} onChange={v => update({ ...config, scale: v })} />
        </div>
    );
};

export const ScanlineSettings: React.FC<{ config: EffectsConfig, update: (k: keyof EffectsConfig, v: any) => void }> = ({ config, update }) => {
    const { t } = useLanguage();
    return (
        <div className="pt-2">
          <RangeControl label={t('intensity')} value={config.scanlineIntensity} min={0} max={0.8} step={0.05} onChange={v => update('scanlineIntensity', v)} />
          <RangeControl label={t('thickness')} value={config.scanlineThickness} min={2} max={16} step={1} onChange={v => update('scanlineThickness', v)} />
        </div>
    );
};

export const CyberSettings: React.FC<{ config: EffectsConfig['cyberHack'], update: (v: EffectsConfig['cyberHack']) => void }> = ({ config, update }) => {
    const { t } = useLanguage();
    return (
        <div className="pt-2">
           <RangeControl label={t('print_speed')} value={config.speed} min={1} max={10} step={1} onChange={v => update({ ...config, speed: v })} />
           <RangeControl label={t('scale')} value={config.scale} min={0.5} max={3.0} step={0.1} onChange={v => update({ ...config, scale: v })} />
           <RangeControl label={t('bg_opacity')} value={config.backgroundOpacity} min={0} max={1} step={0.05} onChange={v => update({ ...config, backgroundOpacity: v })} />
        </div>
    );
};

export const GlitchSettings: React.FC<{ config: EffectsConfig['glitch'], update: (v: EffectsConfig['glitch']) => void }> = ({ config, update }) => {
    const { t } = useLanguage();
    return (
        <div className="pt-2">
           <CustomSelect 
              label={t('glitch_variant')}
              value={config.variant}
              options={[
                { value: 'v1', label: t('variant_v1') },
                { value: 'v2', label: t('variant_v2') }
              ]}
              onChange={v => update({ ...config, variant: v })}
           />
           <RangeControl label={t('intensity')} value={config.intensity} min={0.05} max={1.0} step={0.05} onChange={v => update({ ...config, intensity: v })} />
           <RangeControl label={t('speed')} value={config.speed} min={0.05} max={1.0} step={0.05} onChange={v => update({ ...config, speed: v })} />
           <RangeControl label={t('opacity')} value={config.opacity ?? 1.0} min={0} max={1} step={0.05} onChange={v => update({ ...config, opacity: v })} />
        </div>
    );
};

// New FPS Settings Component
export const FpsSettings: React.FC<{ config: EffectsConfig, update: (k: keyof EffectsConfig, v: any) => void }> = ({ config, update }) => {
    const { t } = useLanguage();
    return (
        <div className="pt-2">
            <div className="mb-4">
                <ToggleSwitch 
                    label={t('show_fps')} 
                    icon={Timer} 
                    value={config.showFps} 
                    onChange={(v) => update('showFps', v)} 
                    color="green"
                />
            </div>
            <CustomSelect 
              label={t('fps_limit')} 
              value={config.fps} 
              options={FPS_OPTIONS} 
              onChange={(v) => update('fps', v)} 
            />
        </div>
    );
};

// Updated SignalSettings (Removed FPS)
export const SignalSettings: React.FC<{ config: EffectsConfig, update: (k: keyof EffectsConfig, v: any) => void }> = ({ config, update }) => {
    const { t } = useLanguage();
    return (
        <div className="pt-2">
            <RangeControl label={t('pixelation')} value={config.pixelation} min={1} max={20} step={1} onChange={v => update('pixelation', v)} />
            <RangeControl label={t('static_noise')} value={config.noise} min={0} max={0.5} step={0.01} onChange={v => update('noise', v)} />
            <RangeControl label={t('vhs_jitter')} value={config.vhsJitter} min={0} max={10} step={0.5} onChange={v => update('vhsJitter', v)} />
        </div>
    );
};

export const ChromaticSettings: React.FC<{ config: EffectsConfig, update: (k: keyof EffectsConfig, v: any) => void }> = ({ config, update }) => {
    const { t } = useLanguage();
    return (
        <div className="pt-2">
            <RangeControl label={t('chromatic_aberration')} value={config.chromaticAberration ?? 0} min={0} max={20} step={0.5} onChange={v => update('chromaticAberration', v)} />
        </div>
    );
};

// Updated VignetteSettings
export const VignetteSettings: React.FC<{ config: EffectsConfig['vignette'], update: (v: EffectsConfig['vignette']) => void }> = ({ config, update }) => {
    const { t } = useLanguage();
    return (
        <div className="pt-2">
           <RangeControl label={t('vignette_intensity')} value={config.intensity} min={0.1} max={1.0} step={0.05} onChange={v => update({ ...config, intensity: v })} />
           <RangeControl label={t('vignette_roundness')} value={config.roundness} min={0.1} max={1.0} step={0.05} onChange={v => update({ ...config, roundness: v })} />
        </div>
    );
};

export const LightLeaksSettings: React.FC<{ config: EffectsConfig['lightLeaks'], update: (v: EffectsConfig['lightLeaks']) => void }> = ({ config, update }) => {
    const { t } = useLanguage();
    return (
        <div className="pt-2">
           <RangeControl label={t('quantity')} value={config.number} min={1} max={20} step={1} onChange={v => update({ ...config, number: v })} />
           <RangeControl label={t('intensity')} value={config.intensity} min={0.1} max={1.0} step={0.05} onChange={v => update({ ...config, intensity: v })} />
           <RangeControl label={t('speed')} value={config.speed} min={0.1} max={2.0} step={0.1} onChange={v => update({ ...config, speed: v })} />
        </div>
    );
};

export const LightFlickerSettings: React.FC<{ config: EffectsConfig['lightFlicker'], update: (v: EffectsConfig['lightFlicker']) => void }> = ({ config, update }) => {
    const { t } = useLanguage();
    return (
        <div className="pt-2">
           <RangeControl label={t('flicker_intensity')} value={config.intensity} min={0.1} max={1.0} step={0.05} onChange={v => update({ ...config, intensity: v })} />
           <RangeControl label={t('flicker_speed')} value={config.speed} min={0.1} max={2.0} step={0.1} onChange={v => update({ ...config, speed: v })} />
        </div>
    );
};