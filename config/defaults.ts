
import { VisualizerConfig, DvdConfig, EffectsConfig, MarqueeConfig, WatermarkConfig, EqualizerConfig } from '../types';

export const DEFAULT_VISUALIZER_CONFIG: VisualizerConfig = {
  style: 'blue', position: 'bottom', barCount: 128, sensitivity: 1.5, fillOpacity: 0.3,
  strokeEnabled: true, strokeOpacity: 0.8, showTips: true, normalize: false, preventVolumeScaling: false, minFrequency: 0, maxFrequency: 100, 
  barGap: 2, mirror: false, segmented: false, segmentHeight: 4, segmentGap: 2,
  tipHeight: 2, tipSpeed: 15, highlightLastBrick: false, tipColor: 'white', tipGlow: false, barGravity: 5
};

// Independent Config for 3D Reactor (Module 10)
export const DEFAULT_REACTOR_CONFIG: VisualizerConfig = {
  style: 'theme-sync', position: 'center', barCount: 64, sensitivity: 1.2, fillOpacity: 0.8,
  strokeEnabled: true, strokeOpacity: 0.5, showTips: false, normalize: false, preventVolumeScaling: false, minFrequency: 0, maxFrequency: 80, 
  barGap: 0, mirror: false, segmented: false, segmentHeight: 0, segmentGap: 0,
  tipHeight: 0, tipSpeed: 0, highlightLastBrick: false, tipColor: 'white', tipGlow: false, barGravity: 5,
  threeDMode: 'reactor'
};

// Independent Config for Sine Wave
export const DEFAULT_SINE_WAVE_CONFIG: VisualizerConfig = {
  style: 'theme-sync', position: 'center', barCount: 128, sensitivity: 2.0, fillOpacity: 0.2,
  strokeEnabled: true, strokeOpacity: 0.8, showTips: false, normalize: false, preventVolumeScaling: false, minFrequency: 0, maxFrequency: 100,
  barGap: 0, mirror: false, segmented: false, segmentHeight: 0, segmentGap: 0,
  tipHeight: 0, tipSpeed: 10, // Used for horizontal scroll speed
  highlightLastBrick: false, tipColor: 'white', tipGlow: false, barGravity: 5
};

export const DEFAULT_DVD_CONFIG: DvdConfig = { 
  size: 150, speed: 2, opacity: 0.7, enableSfx: false, logoType: 'neon_waves' 
};

export const DEFAULT_EFFECTS_CONFIG: EffectsConfig = {
  fps: 60, 
  showFps: false,
  signalEnabled: true,
  pixelation: 1, 
  noise: 0, 
  chromaticEnabled: true,
  chromaticAberration: 0, 
  vhsJitter: 0, 
  scanlineEnabled: true, scanlineIntensity: 0.2, scanlineThickness: 4,
  glitch: { enabled: false, intensity: 0.5, speed: 0.2, opacity: 1.0, variant: 'v1' },
  cyberHack: { enabled: false, speed: 5, opacity: 0.7, density: 0.5, scale: 1.0, backgroundOpacity: 0.4 },
  debugConsole: { enabled: false, opacity: 0.9, scale: 1.0 },
  holograms: { 
    enabled: false, opacity: 0.8, speed: 1.0, interval: 15, scale: 1.0, enableIcons: false, showHotspots: true,
    categories: { system: true, interactive: true, music: true, motivational: true, philosophy: false, space: false }
  },
  geminiChat: {
    enabled: false, opacity: 0.9, scale: 1.0, width: 350, typingSpeed: 1.0,
    categories: { system: false, interactive: true, music: true, motivational: true, philosophy: true, space: true }
  },
  lightLeaks: { enabled: false, intensity: 0.5, speed: 0.5, number: 6 },
  lightFlicker: { enabled: false, intensity: 0.3, speed: 0.5 }, // Default: Off, moderate intensity
  rain: { enabled: false, intensity: 0.5, speed: 1.0, size: 1.0, direction: 0, wind: 0, gustiness: 0.5, opacity: 0.5, wander: 0.1 },
  tron: { 
    enabled: false, 
    opacity: 0.8, 
    speed: 0.311, // Calculated for UI level 6 (0.2 + (5/9)*0.2)
    spawnRate: 5, 
    trailLength: 0.1, 
    size: 3, 
    maxAgents: 6, 
    showNames: true, 
    showLeaderboard: true, // NEW
    enableUser: false, 
    enableDummies: true, // Default enabled for chaos
    glowEnabled: false, 
    glowIntensity: 0.5, 
    bgEnabled: false, 
    bgPattern: 'grid', 
    erasureSpeed: 2, 
    speedVariance: 0.5,
    roundMode: false 
  },
  vignette: { enabled: false, intensity: 0.5, roundness: 0.7 }
};

export const DEFAULT_MARQUEE_CONFIG: MarqueeConfig = {
  enabled: true, style: 'matrix', showProgress: true, progressMode: 'blocks', progressHeight: 20, progressOpacity: 0.6,
  speed: 1, opacity: 0.9, fontSize: 40
};

export const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = { 
  scale: 1.0, opacity: 1.0, flashIntensity: 0.5 
};

export const DEFAULT_EQUALIZER_CONFIG: EqualizerConfig = {
  enabled: false,
  bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 10 bands
  preset: 'flat'
};
