
export interface Agent {
  id: number;
  x: number;
  y: number;
  spawnX: number; 
  spawnY: number; 
  dirIndex: number; // 0: Up, 1: Right, 2: Down, 3: Left
  color: string;
  hue: number;
  name: string;
  score: number;
  alive: boolean;
  erasing: boolean; 
  stepsAlive: number;
  lastTurnStep: number;
  moveAccumulator: number; 
  eraseAccumulator: number; 
  path: {x: number, y: number}[]; 
  // User specifics
  isUser: boolean;
  isDummy: boolean; // Dumb bot flag
  immortality: number; // Seconds
  speedFactor: number; 
  // Reaction mechanics
  reactionGap: number; // How many ticks to skip between AI decisions
  reactionTimer: number; // Current countdown
  concentration: number; // NEW: 0.0 - 1.0. Low value = high chance to crash on dodge
  // Round Mode
  deaths: number; // Death Counter
}

export interface Loot {
  id: number;
  x: number;
  y: number;
  value: number;
  color: string;
  birthTime: number; // For animation pulsing
}

export interface ExplosionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'pixel' | 'ring' | 'glitch' | 'text';
  phase: number; 
  text?: string;
}

export interface GridDims {
  w: number;
  h: number;
}