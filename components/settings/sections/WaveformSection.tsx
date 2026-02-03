
import React from 'react';
import { Activity, Box, Waves } from 'lucide-react';
import ModuleWrapper from '../ModuleWrapper';
import VisualizerSettings from '../VisualizerSettings';
import { NumberedLabel } from '../SettingsSection';
import { VisualizerConfig } from '../../../types';

interface WaveformSectionProps {
  expandedState: Record<string, boolean>;
  toggleExpand: (id: string, isAdditive: boolean, forceOpen?: boolean) => void;
  safeAction: (fn: () => void) => void;
  // Props
  showVisualizer: boolean;
  setShowVisualizer: (v: boolean) => void;
  visualizerConfig: VisualizerConfig;
  updateVisualizer: (k: keyof VisualizerConfig, v: any) => void;
  
  showVisualizer3D?: boolean;
  setShowVisualizer3D?: (v: boolean) => void;
  reactorConfig?: VisualizerConfig;
  updateReactor: (k: keyof VisualizerConfig, v: any) => void;

  showSineWave?: boolean;
  setShowSineWave?: (v: boolean) => void;
  sineWaveConfig?: VisualizerConfig;
  updateSineWave: (k: keyof VisualizerConfig, v: any) => void;
}

const WaveformSection: React.FC<WaveformSectionProps> = ({
  expandedState, toggleExpand, safeAction,
  showVisualizer, setShowVisualizer, visualizerConfig, updateVisualizer,
  showVisualizer3D, setShowVisualizer3D, reactorConfig, updateReactor,
  showSineWave, setShowSineWave, sineWaveConfig, updateSineWave
}) => {
  return (
    <div className="space-y-3">
        {/* Bar Visualizer */}
        <ModuleWrapper id="wave" label={<NumberedLabel num="01" k="waveform" />} icon={Activity} isEnabled={showVisualizer} isExpanded={expandedState['wave']} onToggleExpand={(e) => toggleExpand('wave', e.shiftKey)} onToggleEnable={() => safeAction(() => { if (!showVisualizer) toggleExpand('wave', false, true); setShowVisualizer(!showVisualizer); })}>
            <VisualizerSettings config={visualizerConfig} update={updateVisualizer} mode="waveform" />
        </ModuleWrapper>

        {/* 3D Visualizer */}
        {setShowVisualizer3D && reactorConfig && (
            <ModuleWrapper id="reactor" label={<span className="flex items-center gap-2"><span className="text-theme-muted opacity-50 font-normal">02 //</span> 3D VISUALIZER</span>} icon={Box} isEnabled={showVisualizer3D || false} isExpanded={expandedState['reactor']} onToggleExpand={(e) => toggleExpand('reactor', e.shiftKey)} onToggleEnable={() => safeAction(() => { if (!showVisualizer3D) toggleExpand('reactor', false, true); setShowVisualizer3D(!showVisualizer3D); })}>
                <VisualizerSettings config={reactorConfig} update={updateReactor} mode="reactor" />
            </ModuleWrapper>
        )}

        {/* Sine Wave Visualizer */}
        {setShowSineWave && sineWaveConfig && (
            <ModuleWrapper id="sine" label={<span className="flex items-center gap-2"><span className="text-theme-muted opacity-50 font-normal">03 //</span> SINE WAVE</span>} icon={Waves} isEnabled={showSineWave || false} isExpanded={expandedState['sine']} onToggleExpand={(e) => toggleExpand('sine', e.shiftKey)} onToggleEnable={() => safeAction(() => { if (!showSineWave) toggleExpand('sine', false, true); setShowSineWave(!showSineWave); })}>
                <VisualizerSettings config={sineWaveConfig} update={updateSineWave} mode="reactor" /> {/* Use 'reactor' mode to hide incompatible bar settings */}
            </ModuleWrapper>
        )}
    </div>
  );
};

export default WaveformSection;
