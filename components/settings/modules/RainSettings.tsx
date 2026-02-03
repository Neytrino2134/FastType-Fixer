
import React from 'react';
import { EffectsConfig } from '../../../types';
import RangeControl from '../RangeControl';
import { useLanguage } from '../../../contexts/LanguageContext';

interface RainSettingsProps {
  config: EffectsConfig['rain'];
  update: (v: EffectsConfig['rain']) => void;
}

const RainSettings: React.FC<RainSettingsProps> = ({ config, update }) => {
  const { t } = useLanguage();

  return (
    <div className="pt-2">
       <RangeControl label={t('rain_intensity')} value={config.intensity} min={0.1} max={1.0} step={0.1} onChange={v => update({ ...config, intensity: v })} />
       <RangeControl label={t('rain_opacity')} value={config.opacity !== undefined ? config.opacity : 0.5} min={0.1} max={1.0} step={0.1} onChange={v => update({ ...config, opacity: v })} />
       <RangeControl label={t('rain_speed')} value={config.speed} min={0.5} max={3.0} step={0.1} onChange={v => update({ ...config, speed: v })} />
       <RangeControl label={t('rain_size')} value={config.size} min={0.5} max={3.0} step={0.1} onChange={v => update({ ...config, size: v })} />
       <RangeControl label={t('rain_direction')} value={config.direction} min={-45} max={45} step={5} onChange={v => update({ ...config, direction: v })} />
       <RangeControl label={t('rain_wind')} value={config.wind} min={-10} max={10} step={1} onChange={v => update({ ...config, wind: v })} />
       <RangeControl label={t('rain_gustiness')} value={config.gustiness} min={0} max={1.0} step={0.1} onChange={v => update({ ...config, gustiness: v })} />
       <RangeControl label={t('rain_wander')} value={config.wander !== undefined ? config.wander : 0.1} min={0} max={1.0} step={0.1} onChange={v => update({ ...config, wander: v })} />
    </div>
  );
};

export default RainSettings;