
import { AppPreset } from '../types';
import { 
  DEFAULT_VISUALIZER_CONFIG, 
  DEFAULT_REACTOR_CONFIG, 
  DEFAULT_SINE_WAVE_CONFIG, 
  DEFAULT_DVD_CONFIG, 
  DEFAULT_EFFECTS_CONFIG, 
  DEFAULT_MARQUEE_CONFIG, 
  DEFAULT_WATERMARK_CONFIG 
} from './defaults';

const timestamp = Date.now();

export const DEFAULT_SYSTEM_PRESET: AppPreset = {
  id: 'default_system',
  name: 'Default System',
  createdAt: timestamp,
  config: {
    visualizerConfig: DEFAULT_VISUALIZER_CONFIG,
    reactorConfig: DEFAULT_REACTOR_CONFIG,
    sineWaveConfig: DEFAULT_SINE_WAVE_CONFIG,
    dvdConfig: DEFAULT_DVD_CONFIG,
    effectsConfig: DEFAULT_EFFECTS_CONFIG,
    marqueeConfig: DEFAULT_MARQUEE_CONFIG,
    watermarkConfig: DEFAULT_WATERMARK_CONFIG,
    bgColor: 'theme-sync',
    bgPattern: 'none',
    bgPatternConfig: { intensity: 0.25, scale: 1.0 },
    showVisualizer: true,
    showVisualizer3D: false, // Default OFF
    showSineWave: false, // Default OFF
    showDvd: true,
    bgAutoplayInterval: 5,
    cursorStyle: 'theme-sync',
    retroScreenCursorStyle: 'dos-terminal',
    theme: 'neon-retro',
    controlStyle: 'default',
    bgTransition: 'glitch'
  }
};

export const OCEAN_BLUE_PRESET: AppPreset = {
  id: 'ocean_blue',
  name: 'Ocean Blue',
  createdAt: timestamp + 1, // Ensure unique timestamp
  config: {
    visualizerConfig: {
      style: "theme-blue",
      position: "bottom",
      barCount: 128,
      sensitivity: 1.5,
      fillOpacity: 0.3,
      strokeEnabled: true,
      strokeOpacity: 0.8,
      showTips: true,
      normalize: false,
      preventVolumeScaling: false,
      minFrequency: 0,
      maxFrequency: 100,
      barGap: 2,
      mirror: false,
      segmented: false,
      segmentHeight: 4,
      segmentGap: 2,
      tipHeight: 2,
      tipSpeed: 15,
      highlightLastBrick: false,
      tipColor: "white",
      tipGlow: false,
      barGravity: 5
    },
    reactorConfig: DEFAULT_REACTOR_CONFIG,
    sineWaveConfig: { ...DEFAULT_SINE_WAVE_CONFIG, style: 'ocean' },
    dvdConfig: {
      size: 150,
      speed: 2,
      opacity: 0.7,
      enableSfx: false,
      logoType: "neon_waves"
    },
    effectsConfig: {
      fps: 60,
      showFps: false,
      signalEnabled: true,
      pixelation: 1,
      noise: 0,
      chromaticEnabled: true,
      chromaticAberration: 0,
      vhsJitter: 0,
      scanlineEnabled: true,
      scanlineIntensity: 0.2,
      scanlineThickness: 4,
      glitch: {
        enabled: false,
        intensity: 0.5,
        speed: 0.2,
        opacity: 1,
        variant: "v1"
      },
      cyberHack: {
        enabled: false,
        speed: 5,
        opacity: 0.7,
        density: 0.5,
        scale: 1,
        backgroundOpacity: 0.4
      },
      debugConsole: {
        enabled: false,
        opacity: 0.9,
        scale: 1
      },
      holograms: {
        enabled: false,
        opacity: 0.8,
        speed: 1,
        interval: 15,
        scale: 1,
        enableIcons: false,
        showHotspots: true,
        categories: {
          system: true,
          interactive: true,
          music: true,
          motivational: true,
          philosophy: false,
          space: false
        }
      },
      geminiChat: {
        enabled: false,
        opacity: 0.9,
        scale: 1,
        width: 350,
        typingSpeed: 1,
        categories: {
          system: false,
          interactive: true,
          music: true,
          motivational: true,
          philosophy: true,
          space: true
        }
      },
      lightLeaks: {
        enabled: false,
        intensity: 0.5,
        speed: 0.5,
        number: 6
      },
      lightFlicker: {
        enabled: false,
        intensity: 0.3,
        speed: 0.5
      },
      rain: {
        enabled: false,
        intensity: 0.5,
        speed: 1.0,
        size: 1.0,
        direction: 0,
        wind: 0,
        gustiness: 0.5,
        opacity: 0.5,
        wander: 0.1
      },
      tron: {
        enabled: false,
        opacity: 0.8,
        speed: 0.5,
        spawnRate: 5,
        trailLength: 0.8,
        size: 1,
        maxAgents: 12,
        showNames: true,
        showLeaderboard: true,
        enableUser: false,
        enableDummies: true,
        glowEnabled: false,
        glowIntensity: 0.5,
        bgEnabled: false,
        bgPattern: 'grid'
      },
      vignette: {
        enabled: true,
        intensity: 0.6,
        roundness: 0.5
      }
    },
    bgColor: "#0f172a",
    bgPattern: "none",
    bgPatternConfig: {
      intensity: 0.25,
      scale: 1
    },
    showVisualizer: true,
    showVisualizer3D: false, // Default OFF
    showSineWave: false,
    showDvd: true,
    marqueeConfig: {
      enabled: true,
      style: "ocean",
      showProgress: true,
      progressMode: "blocks",
      progressHeight: 20,
      progressOpacity: 0.6,
      speed: 1,
      opacity: 0.9,
      fontSize: 40
    },
    watermarkConfig: {
      scale: 1,
      opacity: 1,
      flashIntensity: 0.5
    },
    bgAutoplayInterval: 5,
    cursorStyle: "classic-ocean",
    theme: "neutral-ocean",
    controlStyle: "circle",
    bgTransition: "glitch",
  }
};

export const DEFAULT_PRESETS: AppPreset[] = [
  DEFAULT_SYSTEM_PRESET,
  OCEAN_BLUE_PRESET
];