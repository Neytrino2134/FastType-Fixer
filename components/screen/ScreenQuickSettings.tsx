
import React from 'react';
import HologramPanel from '../ui/HologramPanel';
import RangeControl from '../settings/RangeControl';
import { VisualizerConfig } from '../../types';
import { ActivePanelType } from '../../hooks/useScreenHotkeys';
import { useLanguage } from '../../contexts/LanguageContext';

interface ScreenQuickSettingsProps {
  activePanel: ActivePanelType;
  panelPos: { x: number; y: number };
  onClose: () => void;
  visualizerConfig: VisualizerConfig;
  setVisualizerConfig?: (c: VisualizerConfig) => void;
}

const ScreenQuickSettings: React.FC<ScreenQuickSettingsProps> = ({ 
    activePanel, 
    panelPos, 
    onClose, 
    visualizerConfig, 
    setVisualizerConfig 
}) => {
  const { t } = useLanguage();

  if (!activePanel || !setVisualizerConfig) return null;

  return (
    <>
        {activePanel === 'quantity' && (
            <HologramPanel title={t('group_qty_space')} x={panelPos.x} y={panelPos.y} onClose={onClose}>
                <RangeControl label={t('bar_count')} value={visualizerConfig.barCount} min={8} max={512} step={8} onChange={(v) => setVisualizerConfig({ ...visualizerConfig, barCount: v })} className="mb-0" />
                <RangeControl label={t('bar_gap')} value={visualizerConfig.barGap} min={0} max={20} step={0.5} onChange={(v) => setVisualizerConfig({ ...visualizerConfig, barGap: v })} className="mb-0" />
            </HologramPanel>
        )}
        
        {activePanel === 'power' && (
            <HologramPanel title={t('group_power_gravity')} x={panelPos.x} y={panelPos.y} onClose={onClose}>
                <RangeControl label={t('amplitude')} value={visualizerConfig.sensitivity} min={0.1} max={3.0} step={0.1} onChange={(v) => setVisualizerConfig({ ...visualizerConfig, sensitivity: v })} className="mb-0" />
                <RangeControl label={t('bar_gravity')} value={visualizerConfig.barGravity ?? 5} min={0} max={10} step={0.5} onChange={(v) => setVisualizerConfig({ ...visualizerConfig, barGravity: v })} className="mb-0" />
            </HologramPanel>
        )}

        {activePanel === 'freq' && (
            <HologramPanel title={t('group_cutoff')} x={panelPos.x} y={panelPos.y} onClose={onClose}>
                <RangeControl label={t('min_freq')} value={visualizerConfig.minFrequency} min={0} max={99} step={1} onChange={(v) => setVisualizerConfig({ ...visualizerConfig, minFrequency: v })} className="mb-0" />
                <RangeControl label={t('max_freq')} value={visualizerConfig.maxFrequency} min={1} max={100} step={1} onChange={(v) => setVisualizerConfig({ ...visualizerConfig, maxFrequency: v })} className="mb-0" />
            </HologramPanel>
        )}

        {activePanel === 'opacity' && (
            <HologramPanel title={t('group_opacity')} x={panelPos.x} y={panelPos.y} onClose={onClose}>
                <RangeControl label={t('fill_opacity')} value={visualizerConfig.fillOpacity} min={0} max={1} step={0.1} onChange={(v) => setVisualizerConfig({ ...visualizerConfig, fillOpacity: v })} className="mb-0" />
                {visualizerConfig.strokeEnabled && (
                    <RangeControl label={t('stroke_opacity')} value={visualizerConfig.strokeOpacity} min={0} max={1} step={0.1} onChange={(v) => setVisualizerConfig({ ...visualizerConfig, strokeOpacity: v })} className="mb-0" />
                )}
            </HologramPanel>
        )}
    </>
  );
};

export default ScreenQuickSettings;
