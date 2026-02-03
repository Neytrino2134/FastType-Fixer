
import { VisualizerConfig, MarqueeConfig, DvdConfig, EffectsConfig } from '../types';

interface UseConfigUpdatersProps {
  visualizerConfig: VisualizerConfig;
  setVisualizerConfig: (c: VisualizerConfig) => void;
  reactorConfig?: VisualizerConfig;
  setReactorConfig?: (c: VisualizerConfig) => void;
  sineWaveConfig?: VisualizerConfig;
  setSineWaveConfig?: (c: VisualizerConfig) => void;
  marqueeConfig: MarqueeConfig;
  setMarqueeConfig: (c: MarqueeConfig) => void;
  dvdConfig: DvdConfig;
  setDvdConfig: (c: DvdConfig) => void;
  effectsConfig: EffectsConfig;
  setEffectsConfig: (c: EffectsConfig) => void;
}

export const useConfigUpdaters = ({
  visualizerConfig, setVisualizerConfig,
  reactorConfig, setReactorConfig,
  sineWaveConfig, setSineWaveConfig,
  marqueeConfig, setMarqueeConfig,
  dvdConfig, setDvdConfig,
  effectsConfig, setEffectsConfig
}: UseConfigUpdatersProps) => {

  const updateVisualizer = (key: keyof VisualizerConfig, value: any) => {
    setVisualizerConfig({ ...visualizerConfig, [key]: value });
  };

  const updateReactor = (key: keyof VisualizerConfig, value: any) => {
    if (setReactorConfig && reactorConfig) {
      setReactorConfig({ ...reactorConfig, [key]: value });
    }
  };

  const updateSineWave = (key: keyof VisualizerConfig, value: any) => {
    if (setSineWaveConfig && sineWaveConfig) {
      setSineWaveConfig({ ...sineWaveConfig, [key]: value });
    }
  };

  const updateMarquee = (key: keyof MarqueeConfig, value: any) => {
    setMarqueeConfig({ ...marqueeConfig, [key]: value });
  };

  const updateDvd = (key: keyof DvdConfig, value: any) => {
    setDvdConfig({ ...dvdConfig, [key]: value });
  };

  const updateEffect = (key: keyof EffectsConfig, value: any) => {
    setEffectsConfig({ ...effectsConfig, [key]: value });
  };

  const updateDebugConfig = (value: EffectsConfig['debugConsole']) => {
    setEffectsConfig({ ...effectsConfig, debugConsole: value });
  };

  return {
      updateVisualizer,
      updateReactor,
      updateSineWave,
      updateMarquee,
      updateDvd,
      updateEffect,
      updateDebugConfig
  };
};
