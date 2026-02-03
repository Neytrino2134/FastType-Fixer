
export interface TronConfig {
  enabled: boolean;
  opacity: number;
  speed: number;
  spawnRate: number; // Frequency of new agents
  trailLength: number; // NEW: 0.1 (short) to 1.0 (long)
  size: number; // NEW: Thickness of agent (1-4)
  maxAgents: number; // NEW: Maximum players on map (4-20)
  showNames: boolean; // NEW: Show player nicknames
  showLeaderboard: boolean; // NEW: Show Holographic Leaderboard
  enableUser: boolean; // NEW: User playable character
  enableDummies: boolean; // NEW: Spawn stupid bots
  glowEnabled: boolean; // NEW: Enable glow effect
  glowIntensity: number; // NEW: Intensity of glow
  bgEnabled: boolean; // NEW: Background pattern toggle
  bgPattern: 'grid' | 'iso' | 'hex' | 'dots'; // NEW: Pattern type
  erasureSpeed?: number; // NEW: Multiplier for line erasure speed
  speedVariance?: number; // NEW: Random speed difference between agents (0-1)
  roundMode?: boolean; // NEW: Enable competitive round mode linked to track time
}

export interface EffectsConfig {
  fps: number;
  showFps: boolean; // NEW: Show FPS Counter
  signalEnabled: boolean; // NEW: Master toggle for signal processor
  pixelation: number;
  noise: number;
  chromaticEnabled: boolean; // NEW: Master toggle for chromatic aberration
  chromaticAberration: number;
  vhsJitter: number;
  scanlineEnabled: boolean;
  scanlineIntensity: number;
  scanlineThickness: number;
  glitch: {
    enabled: boolean;
    intensity: number;
    speed: number;
    opacity: number;
    variant: 'v1' | 'v2';
  };
  cyberHack: {
    enabled: boolean;
    speed: number;
    opacity: number;
    density: number;
    scale: number;
    backgroundOpacity: number;
  };
  debugConsole: {
    enabled: boolean;
    opacity: number;
    scale: number;
  };
  holograms: {
    enabled: boolean;
    opacity: number;
    speed: number; // Typing speed
    interval: number; // Seconds between messages
    scale: number;
    color?: string; // NEW: Specific color for hologram
    enableIcons: boolean; // NEW: Enable graphical icons
    showHotspots: boolean; // NEW: Show interactive background hotspots
    categories: Record<HologramCategory, boolean>;
  };
  geminiChat: GeminiChatConfig; // NEW
  lightLeaks: {
    enabled: boolean;
    intensity: number; // Opacity
    speed: number; // Movement speed
    number: number; // Amount of blobs
  };
  lightFlicker: { // NEW: Light Bulb Flicker Effect
    enabled: boolean;
    intensity: number; // How much brightness/darkness changes
    speed: number; // How erratic the flicker is
  };
  rain: RainConfig; // NEW: Rain Effect
  tron: TronConfig; // NEW: Tron Game
  vignette: {
    enabled: boolean;
    intensity: number; // Opacity 0-1
    roundness: number; // 0-1 (Size of center hole)
  };
}

// ... existing types (kept for context, but not modified in this block unless needed) ...
export interface AudioTrack {
  id: string;
  playlistId: string; // New field to link track to a playlist
  name: string;
  url: string;
  file: File;
  artworkUrl?: string; // NEW: Album art blob URL
  tags?: TagMetadata; // NEW: ID3 Tags
  order?: number; // Added order property for sorting
  rating?: number; // NEW: Track Rating
}

export interface TagMetadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  genre?: string;
  trackNumber?: string;
}

export interface Playlist {
  id: string;
  name: string;
  order: number;
  tracks: AudioTrack[];
}

// NEW: Interactive Background Hotspots
export type HotspotType = 'error' | 'decrypt' | 'target' | 'scan' | 'secure' | 'link';

export interface BgHotspot {
  id: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  type: HotspotType;
  label?: string; // Optional custom text
}

export interface BackgroundMedia {
  id: string;
  playlistId: string; // NEW: Link to BG Playlist
  type: 'image' | 'video';
  url: string;
  file: File;
  order?: number;
  hotspots?: BgHotspot[]; // NEW: Interactive points
}

export interface BackgroundPlaylist {
  id: string;
  name: string;
  order: number;
  items: BackgroundMedia[];
}

// NEW: Ambience File Type
export interface AmbienceFile {
  id: string;
  name: string;
  url: string;
  file: File;
}

// NEW: Ambience Configuration
export interface AmbienceConfig {
  activeId: string | null;
  isPlaying: boolean;
  volume: number;
}

// NEW: Equalizer Configuration
export interface EqualizerConfig {
  enabled: boolean;
  bands: number[]; // Array of 10 gain values (-12 to 12)
  preset: string; // ID of current preset
}

// NEW: Recorder Configuration
export interface RecorderConfig {
  resolution: '1080p' | '720p' | '4k';
  fps: 30 | 60;
  videoBitrate: number; // bps
  audioBitrate: number; // bps
}

// NEW: System Audio Configuration
export interface SystemAudioConfig {
  enabled: boolean;
  volume: number;
  monitor: boolean; // Playback to speakers? (Avoid feedback loop)
}

export interface PlayerState {
  isPlaying: boolean;
  currentTrackIndex: number;
  playlists: Playlist[];
  activePlaylistId: string;
}

// --- MUSIC EDITOR TYPES ---
export type InstrumentType = 'kick' | 'snare' | 'hihat' | 'clap' | 'bass' | 'lead';

export interface EditorInstrument {
  id: string;
  name: string;
  type: InstrumentType;
  color: string;
  volume: number; // 0 to 1
  steps: boolean[]; // Array of 16 steps
  pitch?: number; // Optional pitch tweak
}

export interface EditorState {
  bpm: number;
  isPlaying: boolean;
  currentStep: number;
  instruments: EditorInstrument[];
}
// --------------------------

export const NEON_COLORS = [
  '#00f3ff', // Blue
  '#ff00ff', // Pink
  '#00ff00', // Green
  '#bc13fe', // Purple
  '#f9f871', // Yellow
  '#ff3333', // Red
];

export type VisualizerStyle = 'retro' | 'blue' | 'pink' | 'matrix' | 'inferno' | 'warm' | 'gray' | 'ocean' | 'theme-blue' | 'theme-sync' | 'neon-gradient';
export type VisualizerPosition = 'center' | 'top' | 'bottom' | 'circle';
export type TipColor = 'white' | 'blue' | 'pink' | 'green' | 'purple' | 'yellow' | 'red';
export type CursorStyle = 'default' | 'music-flow' | 'classic-blue' | 'classic-warm' | 'classic-white' | 'classic-ocean' | 'theme-sync' | 'dos-terminal' | 'system' | 'crosshair' | 'rounded';

export type ThemeType = 'neon-retro' | 'neon-blue' | 'neon-pink' | 'warm-cozy' | 'neutral-gray' | 'neutral-ocean';
export type ControlStyle = 'default' | 'round' | 'circle';
export type BgTransitionType = 'glitch' | 'leaks' | 'none';
export type BgAnimationType = 'none' | 'zoom' | 'sway' | 'handheld' | 'cinematic' | 'chaos'; // NEW

// NEW: View Mode for Application Layout
export type ViewMode = 'default' | 'cinema' | 'mini' | 'player-focus';

export interface VisualizerConfig {
  style: VisualizerStyle;
  position: VisualizerPosition;
  barCount: number;
  sensitivity: number;
  fillOpacity: number;
  strokeEnabled: boolean;
  strokeOpacity: number;
  showTips: boolean; 
  tipHeight: number; // New: Thickness of the tip
  tipSpeed: number; // New: Falling speed (gravity)
  tipColor: TipColor; // NEW: Color of the tip
  tipGlow: boolean; // NEW: Enable glow for tip
  normalize: boolean;
  preventVolumeScaling: boolean; // NEW: Ignore volume level for visuals
  minFrequency: number;
  maxFrequency: number;
  barGap: number;
  mirror: boolean;
  segmented: boolean;
  segmentHeight: number; 
  segmentGap: number; 
  highlightLastBrick: boolean; // NEW: Highlight the top-most brick
  barGravity: number; // NEW: Gravity/Decay for the bars themselves
  threeDMode?: 'reactor' | 'spectrum'; // NEW: Specific for 3D Visualizer
}

export interface DvdConfig {
  size: number;
  speed: number;
  opacity: number;
  enableSfx: boolean;
  logoType: 'dvd' | 'neon_waves';
}

export interface MarqueeConfig {
  enabled: boolean;
  style: VisualizerStyle; // New: Visual style for text color
  showProgress: boolean; 
  progressMode: 'continuous' | 'blocks'; // New
  progressHeight: number; // New
  progressOpacity: number; // New
  speed: number;
  opacity: number;
  fontSize: number;
}

export interface WatermarkConfig {
  scale: number;
  opacity: number;
  flashIntensity: number; // 0 to 1
}

export type HologramCategory = 'system' | 'interactive' | 'music' | 'motivational' | 'philosophy' | 'space';

export interface GeminiChatConfig {
  enabled: boolean;
  opacity: number;
  scale: number; // Deprecated in UI but kept for type safety
  width?: number; // New: Width in pixels
  typingSpeed: number; // 1 = Normal
  color?: string;
  categories: Record<HologramCategory, boolean>;
}

export interface RainConfig {
  enabled: boolean;
  intensity: number; // 0.1 to 1.0 (Density)
  speed: number; // Fall speed
  size: number; // Length/thickness scale
  direction: number; // Angle in degrees (-45 to 45)
  wind: number; // Base horizontal wind speed
  gustiness: number; // Random wind variation
  opacity: number; // NEW: Rain opacity
  wander: number; // NEW: Direction randomness
}

export interface CrossfadeConfig {
  enabled: boolean;
  duration: number; // Seconds
}

export interface PatternConfig {
  intensity: number;
  scale: number;
}

export interface AppPreset {
  id: string;
  name: string;
  createdAt: number;
  config: {
    visualizerConfig: VisualizerConfig;
    reactorConfig?: VisualizerConfig; // NEW: Independent 3D Reactor config
    sineWaveConfig?: VisualizerConfig; // NEW: Sine Wave config
    dvdConfig: DvdConfig;
    effectsConfig: EffectsConfig;
    marqueeConfig: MarqueeConfig;
    watermarkConfig?: WatermarkConfig; // Optional for backward compatibility
    bgColor: string;
    bgPattern: string;
    bgPatternConfig: PatternConfig;
    showVisualizer: boolean;
    showVisualizer3D?: boolean; // NEW: Independent toggle
    showSineWave?: boolean; // NEW: Sine Wave Toggle
    showDvd: boolean;
    bgAutoplayInterval: number;
    cursorStyle?: CursorStyle;
    retroScreenCursorStyle?: CursorStyle; // NEW
    theme?: ThemeType;
    controlStyle?: ControlStyle;
    bgTransition?: BgTransitionType; // New
    ambienceConfig?: AmbienceConfig; // NEW
    equalizerConfig?: EqualizerConfig; // NEW: EQ
    bgAnimation?: BgAnimationType; // NEW
  }
}
