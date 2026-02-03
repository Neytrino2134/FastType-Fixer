
import React, { useEffect, useRef } from 'react';
import { EffectsConfig, VisualizerConfig } from '../../types';
import { Agent, ExplosionParticle, Loot } from './tron/types';
import { BASE_CELL_SIZE, TOP_SAFE_ZONE_PX, NICKNAMES, DIRECTIONS } from './tron/constants';
import { evaluateMove } from './tron/ai';
import { drawGrid, drawAgents, drawExplosions, drawBackgroundPattern, drawLoot, drawLeaderboard, drawRoundEndScreen } from './tron/render';
import { useTheme } from '../../contexts/ThemeContext';

interface TronEffectProps {
  config: EffectsConfig['tron'];
  analyser?: AnalyserNode | null;
  isPlaying?: boolean;
  visualizerConfig?: VisualizerConfig;
  volume?: number;
  currentTime?: number; // New
  duration?: number; // New
}

const TronEffect: React.FC<TronEffectProps> = ({ config, analyser, isPlaying, visualizerConfig, volume = 1, currentTime = 0, duration = 0 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const agentsRef = useRef<Agent[]>([]);
  const explosionsRef = useRef<ExplosionParticle[]>([]);
  const lootRef = useRef<Loot[]>([]); // Ref for dropped score items
  const agentIdCounter = useRef(0);
  const lootIdCounter = useRef(0);
  const { colors } = useTheme();
  
  // Audio Data
  const dataArrayRef = useRef<Uint8Array | null>(null);
  
  // User Input State
  const userNextDirRef = useRef<number | null>(null);
  
  // Grid: 0 = empty, 1 = wall
  const gridRef = useRef<Uint8Array | null>(null);
  // Owner Grid: -1 = empty, else = agent ID
  const ownerGridRef = useRef<Int32Array | null>(null);

  const gridDimsRef = useRef({ w: 0, h: 0 });
  const safeZoneRowsRef = useRef(0);
  
  // Timers and Animation State
  const lastDrawTimeRef = useRef<number>(0);
  const roundAnimStartTimeRef = useRef<number>(0);
  const overlayOpacityRef = useRef<number>(0); // 0 to 1 for smooth fade in/out

  const configRef = useRef(config);
  const visualizerConfigRef = useRef(visualizerConfig);
  const colorsRef = useRef(colors);
  
  // Store dynamic playback props in ref to access in render loop without re-triggering effect
  const playbackRef = useRef({ isPlaying, volume, currentTime, duration });

  useEffect(() => {
      configRef.current = config;
  }, [config]);

  useEffect(() => {
      visualizerConfigRef.current = visualizerConfig;
  }, [visualizerConfig]);

  useEffect(() => {
      colorsRef.current = colors;
  }, [colors]);

  useEffect(() => {
      playbackRef.current = { isPlaying, volume, currentTime, duration };
  }, [isPlaying, volume, currentTime, duration]);

  // Audio Init
  useEffect(() => {
      if (analyser && !dataArrayRef.current) {
          dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      }
  }, [analyser]);

  // Spawn Gate Logic (Local helper required for spawn logic)
  const getGateCoordinates = (gridW: number, gridH: number, safeZoneY: number) => {
      const playableHeight = gridH - safeZoneY;
      const midY = safeZoneY + Math.floor(playableHeight / 2);

      // Adjusted for 1-cell margin
      return [
          { x: Math.floor(gridW / 2), y: safeZoneY + 2, dir: 2 }, // Top Gate (Spawns Down)
          { x: gridW - 4, y: midY, dir: 3 }, // Right Gate (Moved in slightly for safety)
          { x: Math.floor(gridW / 2), y: gridH - 4, dir: 0 }, // Bottom Gate (Moved up slightly)
          { x: 3, y: midY, dir: 1 } // Left Gate (Moved in slightly)
      ];
  };

  const spawnUser = (gridW: number, gridH: number): Agent => {
      const x = Math.floor(gridW / 2);
      const y = gridH - 5;
      const dir = 0; // Up

      userNextDirRef.current = dir; // Reset input

      return {
          id: agentIdCounter.current++,
          x,
          y,
          spawnX: x,
          spawnY: y,
          dirIndex: dir,
          color: '#ffffff',
          hue: 0,
          name: "USER",
          score: 0,
          alive: true,
          erasing: false,
          stepsAlive: 0,
          lastTurnStep: 0,
          moveAccumulator: 0,
          eraseAccumulator: 0,
          path: [],
          isUser: true,
          isDummy: false,
          immortality: 3.0, // 3 Seconds
          speedFactor: 1.0,
          reactionGap: 0,
          reactionTimer: 0,
          concentration: 1.0,
          deaths: 0
      };
  };

  // Input Listener
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (!configRef.current.enableUser) return;

          // RESTART USER
          if (e.code === 'Numpad0') {
              const cols = gridDimsRef.current.w;
              const rows = gridDimsRef.current.h;
              if (cols === 0 || rows === 0) return;

              const userAgent = agentsRef.current.find(a => a.isUser);
              
              if (userAgent) {
                  const grid = gridRef.current;
                  const ownerGrid = ownerGridRef.current;
                  if (grid && ownerGrid) {
                      userAgent.path.forEach(p => {
                          const idx = p.y * cols + p.x;
                          if (idx >= 0 && idx < grid.length) {
                              grid[idx] = 0;
                              ownerGrid[idx] = -1;
                          }
                      });
                      
                      const startX = Math.floor(cols / 2);
                      const startY = rows - 5;
                      const spawnIdx = startY * cols + startX;
                      if (spawnIdx >= 0 && spawnIdx < grid.length) {
                          grid[spawnIdx] = 0;
                          ownerGrid[spawnIdx] = -1;
                      }
                  }

                  userAgent.x = Math.floor(cols / 2);
                  userAgent.y = rows - 5;
                  userAgent.dirIndex = 0; 
                  userAgent.path = [];
                  userAgent.alive = true;
                  userAgent.erasing = false;
                  userAgent.immortality = 3.0;
                  userAgent.stepsAlive = 0;
                  userAgent.moveAccumulator = 0;
                  userAgent.score = 0; // Reset score on restart
                  userAgent.concentration = 1.0;
                  userNextDirRef.current = 0;
                  
              } else {
                  const newAgent = spawnUser(cols, rows);
                  const grid = gridRef.current;
                  const ownerGrid = ownerGridRef.current;
                  if (grid && ownerGrid) {
                      const idx = newAgent.y * cols + newAgent.x;
                      if (idx >= 0 && idx < grid.length) {
                          grid[idx] = 0;
                          ownerGrid[idx] = -1;
                      }
                  }
                  agentsRef.current.push(newAgent);
              }
              return;
          }

          // MOVEMENT
          let dir = -1;
          if (e.code === 'Numpad8' || e.code === 'ArrowUp') dir = 0;
          else if (e.code === 'Numpad6' || e.code === 'ArrowRight') dir = 1;
          else if (e.code === 'Numpad5' || e.code === 'ArrowDown') dir = 2; 
          else if (e.code === 'Numpad4' || e.code === 'ArrowLeft') dir = 3;

          if (dir !== -1) {
              userNextDirRef.current = dir;
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const generateUniqueColor = (activeAgents: Agent[]): { color: string, hue: number } => {
      const BASE_HUES = [0, 30, 60, 120, 180, 240, 280, 300, 330]; 
      const usedHues = new Set(activeAgents.map(a => a.hue));
      const freeHues = BASE_HUES.filter(h => !usedHues.has(h));
      
      if (freeHues.length > 0) {
          const hue = freeHues[Math.floor(Math.random() * freeHues.length)];
          return { color: `hsl(${hue}, 100%, 50%)`, hue };
      }
      const hue = BASE_HUES[Math.floor(Math.random() * BASE_HUES.length)];
      const lightness = 60 + Math.floor(Math.random() * 25);
      return { color: `hsl(${hue}, 100%, ${lightness}%)`, hue };
  };

  const spawnAgent = (
      gridW: number, 
      gridH: number, 
      activeAgents: Agent[], 
      safeZoneY: number, 
      reincarnation?: { name: string, color: string, hue: number, score: number, deaths: number }
  ): Agent => {
      const gates = getGateCoordinates(gridW, gridH, safeZoneY);
      const gate = gates[Math.floor(Math.random() * gates.length)];
      
      let color, hue, name, score, deaths;
      let isDummy = false;

      // Determine Dummy status - Only if NOT round mode and Enabled in config
      if (!reincarnation && !configRef.current.roundMode && configRef.current.enableDummies) {
          // 40% chance to be a dummy bot
          if (Math.random() < 0.4) {
              isDummy = true;
          }
      }

      if (reincarnation) {
          color = reincarnation.color;
          hue = reincarnation.hue;
          name = reincarnation.name;
          score = reincarnation.score;
          deaths = reincarnation.deaths;
      } else {
          if (isDummy) {
              color = '#666666'; // Gray for dummies
              hue = -1;
              name = `BOT-${Math.floor(Math.random() * 1000)}`;
          } else {
              const c = generateUniqueColor(activeAgents);
              color = c.color;
              hue = c.hue;
              name = NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)];
          }
          score = 0;
          deaths = 0;
      }

      // Calculate speed variance
      const varianceStrength = configRef.current.speedVariance || 0;
      const randomOffset = (Math.random() - 0.5) * varianceStrength; 
      const speedFactor = 1.0 + randomOffset;

      // REACTION TIME FACTOR
      // Dummies have very high reaction gap (low concentration)
      const reactionGap = isDummy 
          ? Math.floor(Math.random() * 20 + 20)  // 20-40 ticks (Very slow)
          : Math.floor(Math.random() * 6);       // 0-5 ticks (Normal)

      return {
          id: agentIdCounter.current++,
          x: gate.x,
          y: gate.y,
          spawnX: gate.x,
          spawnY: gate.y,
          dirIndex: gate.dir,
          color,
          hue,
          name,
          score,
          alive: true,
          erasing: false,
          stepsAlive: 0,
          lastTurnStep: 0,
          moveAccumulator: 0,
          eraseAccumulator: 0,
          path: [],
          isUser: false,
          isDummy,
          immortality: 2.0, // Respawn invulnerability
          speedFactor,
          reactionGap,
          reactionTimer: 0,
          concentration: 1.0,
          deaths
      };
  };

  const createExplosion = (gx: number, gy: number, color: string, cellSize: number, name: string) => {
      const px = gx * cellSize + cellSize / 2;
      const py = gy * cellSize + cellSize / 2;
      
      const newParticles: ExplosionParticle[] = [];

      for (let i = 0; i < 32; i++) {
          const angle = (Math.PI * 2 * i) / 32;
          const speed = (Math.random() * 2 + 1); 
          newParticles.push({
              x: px,
              y: py,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 1.0,
              maxLife: 1.0,
              color: color,
              size: cellSize, 
              type: 'pixel',
              phase: Math.random() * Math.PI * 2
          });
      }

      newParticles.push({
          x: px, y: py, vx: 0, vy: 0, life: 1.0, maxLife: 1.0,
          color: '#ffffff', size: cellSize * 2, type: 'ring', phase: 0
      });

      newParticles.push({
          x: px, y: py, vx: 0, vy: 0, life: 0.8, maxLife: 0.8,
          color: '#ffffff', size: cellSize * 10, type: 'glitch', phase: 0
      });

      if (configRef.current.showNames) {
          newParticles.push({
              x: px, y: py - cellSize * 4, vx: 0, vy: -0.5, life: 1.5, maxLife: 1.5,
              color: color, size: Math.max(10, cellSize * 3), type: 'text', phase: 0,
              text: `${name} DELETED`
          });
      }
      
      explosionsRef.current.push(...newParticles);
  };

  const scatterLoot = (gx: number, gy: number, totalScore: number, gridW: number, gridH: number, safeZoneY: number) => {
      const MAX_DROPS = 20;
      let dropsCount = 0;
      let valuePerDrop = 50;

      const rawDrops = Math.floor(totalScore / 50);
      
      if (rawDrops <= MAX_DROPS) {
          dropsCount = rawDrops;
          valuePerDrop = 50;
      } else {
          dropsCount = MAX_DROPS;
          valuePerDrop = Math.floor(totalScore / MAX_DROPS);
      }

      if (dropsCount <= 0) return;

      const grid = gridRef.current;
      if (!grid) return;

      for (let i = 0; i < dropsCount; i++) {
          let attempts = 0;
          let lx = 0, ly = 0;
          while (attempts < 10) {
              const radius = 10;
              const dx = Math.floor((Math.random() - 0.5) * 2 * radius);
              const dy = Math.floor((Math.random() - 0.5) * 2 * radius);
              lx = gx + dx;
              ly = gy + dy;
              
              if (lx >= 1 && lx < gridW - 1 && ly >= safeZoneY && ly < gridH - 1) {
                  const idx = ly * gridW + lx;
                  if (grid[idx] === 0) {
                      break; // Found spot
                  }
              }
              attempts++;
          }
          
          if (lx !== 0 && ly !== 0) {
              lootRef.current.push({
                  id: lootIdCounter.current++,
                  x: lx,
                  y: ly,
                  value: valuePerDrop,
                  color: '#00F3FF', // NEON BLUE
                  birthTime: Date.now()
              });
          }
      }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const currentSizeRef = { val: config.size || 1 };

    let w = canvas.width = canvas.offsetWidth;
    let h = canvas.height = canvas.offsetHeight;
    
    const initGrid = (scale: number) => {
        const cellSize = BASE_CELL_SIZE * scale;
        w = canvas.width = canvas.offsetWidth;
        h = canvas.height = canvas.offsetHeight;
        let cols = Math.ceil(w / cellSize);
        let rows = Math.ceil(h / cellSize);
        gridRef.current = new Uint8Array(cols * rows).fill(0);
        ownerGridRef.current = new Int32Array(cols * rows).fill(-1); 
        gridDimsRef.current = { w: cols, h: rows };
        safeZoneRowsRef.current = Math.ceil(TOP_SAFE_ZONE_PX / cellSize);
        agentsRef.current = [];
        explosionsRef.current = [];
        lootRef.current = [];
        ctx.clearRect(0, 0, w, h);
    };

    initGrid(config.size || 1);

    const render = (timestamp: number) => {
        const cfg = configRef.current;
        const scale = Math.max(1, cfg.size || 1);
        const cellSize = BASE_CELL_SIZE * scale;
        
        // Retrieve current playback state from ref
        const { isPlaying, volume, currentTime, duration } = playbackRef.current;

        const interval = 1000 / 60; 
        const elapsed = timestamp - lastDrawTimeRef.current;
        if (elapsed < interval) {
            animationRef.current = requestAnimationFrame(render);
            return;
        }
        lastDrawTimeRef.current = timestamp - (elapsed % interval);

        // --- ROUND MODE LOGIC ---
        let roundPhase: 'active' | 'sudden_death' | 'finished' = 'active';
        let timeLeft = 0;
        
        if (cfg.roundMode && duration > 0 && isPlaying) {
            timeLeft = duration - currentTime;
            if (timeLeft <= 10) roundPhase = 'finished';
            else if (timeLeft <= 40) roundPhase = 'sudden_death';
        }

        // Manage Round End Overlay Animation State
        if (roundPhase === 'finished') {
            if (roundAnimStartTimeRef.current === 0) {
                roundAnimStartTimeRef.current = timestamp;
            }
            // Fade in target: 1.0
            overlayOpacityRef.current += (1.0 - overlayOpacityRef.current) * 0.05;
        } else {
            roundAnimStartTimeRef.current = 0;
            // Fade out target: 0.0
            overlayOpacityRef.current += (0.0 - overlayOpacityRef.current) * 0.05;
        }

        // Calculate Audio Level for Glow Effect
        let audioLevel = 0;
        if (analyser && dataArrayRef.current && isPlaying) {
            analyser.getByteFrequencyData(dataArrayRef.current as any);
            const len = Math.floor(dataArrayRef.current.length * 0.2); 
            if (len > 0) {
                let sum = 0;
                for(let i=0; i<len; i++) sum += dataArrayRef.current[i];
                audioLevel = (sum / len) / 255;
            }
        }
        audioLevel *= volume;

        if (currentSizeRef.val !== scale || canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
             initGrid(scale);
             currentSizeRef.val = scale;
        }
        
        ctx.clearRect(0, 0, w, h);

        if (!cfg.enabled) {
             agentsRef.current = [];
             explosionsRef.current = [];
             lootRef.current = [];
             if (gridRef.current) gridRef.current.fill(0);
             if (ownerGridRef.current) ownerGridRef.current.fill(-1);
             animationRef.current = requestAnimationFrame(render);
             return;
        }

        const cols = gridDimsRef.current.w;
        const rows = gridDimsRef.current.h;
        const safeZoneRows = safeZoneRowsRef.current;
        const grid = gridRef.current;
        const ownerGrid = ownerGridRef.current;

        if (cfg.bgEnabled) {
            drawBackgroundPattern(ctx, w, h, cfg.bgPattern || 'grid', cfg.opacity);
        }

        drawGrid(ctx, w, h, cellSize, safeZoneRows, cfg.opacity, cols, rows, getGateCoordinates);
        
        // Filter out old loot (5 seconds lifetime)
        const now = Date.now();
        lootRef.current = lootRef.current.filter(l => (now - l.birthTime) < 5000);
        
        drawLoot(ctx, lootRef.current, cellSize, cfg.opacity);

        // --- SPAWN LOGIC ---
        const maxAgents = cfg.maxAgents || 12;
        
        if (cfg.roundMode) {
            // Round Mode: Initial population only, then handle respawns
            if (roundPhase !== 'finished') {
                const totalAgents = agentsRef.current.length; // Includes dead ones waiting to clear
                const aliveAgents = agentsRef.current.filter(a => a.alive);
                
                // Fill roster at start
                if (totalAgents < maxAgents && Math.random() < 0.2) {
                    agentsRef.current.push(spawnAgent(cols, rows, aliveAgents, safeZoneRows));
                }
            }
        } else {
            // Standard Mode: Random Spawns
            const spawnChance = cfg.spawnRate * 0.02;
            const activeAiAgents = agentsRef.current.filter(a => !a.isUser).length;
            if (Math.random() < spawnChance && activeAiAgents < maxAgents) {
                agentsRef.current.push(spawnAgent(cols, rows, agentsRef.current, safeZoneRows));
            }
        }

        const hasUser = agentsRef.current.some(a => a.isUser && a.alive);
        if (cfg.enableUser && !hasUser && roundPhase !== 'finished') {
            agentsRef.current.push(spawnUser(cols, rows));
        }

        let leaderId = -1;
        let maxScore = -1;
        agentsRef.current.forEach(a => {
            if (a.alive && !a.erasing && a.score > maxScore) {
                maxScore = a.score;
                leaderId = a.id;
            }
        });

        // --- UPDATE AGENTS ---
        if (roundPhase !== 'finished') {
            agentsRef.current.forEach(agent => {
                if (!agent.alive) return;
                if (!grid || !ownerGrid) return;

                if (agent.reactionTimer > 0) agent.reactionTimer--;

                if (agent.erasing) {
                    const erasureMult = cfg.erasureSpeed || 1.5;
                    agent.eraseAccumulator += cfg.speed * erasureMult;
                    while (agent.eraseAccumulator >= 1) {
                        agent.eraseAccumulator -= 1;
                        const head = agent.path.pop();
                        if (head) {
                            const idx = head.y * cols + head.x;
                            if (idx >= 0 && idx < grid.length) {
                                grid[idx] = 0;
                                ownerGrid[idx] = -1;
                            }
                        }
                        if (agent.path.length === 0) {
                            agent.alive = false; 
                            
                            // --- ROUND MODE RESPAWN LOGIC ---
                            if (cfg.roundMode && roundPhase !== 'sudden_death') {
                                // Reincarnate!
                                agentsRef.current.push(spawnAgent(cols, rows, agentsRef.current, safeZoneRows, {
                                    name: agent.name,
                                    color: agent.color,
                                    hue: agent.hue,
                                    score: agent.score,
                                    deaths: agent.deaths + 1
                                }));
                            }
                            break;
                        }
                    }
                    return;
                }

                agent.moveAccumulator += cfg.speed * agent.speedFactor;
                if (agent.immortality > 0) agent.immortality -= 0.016;

                while (agent.moveAccumulator >= 1) {
                    agent.moveAccumulator -= 1;
                    let bestOption = -1;
                    let crashed = false;

                    // --- CONCENTRATION & DODGE CHECK LOGIC ---
                    // Determine if the agent is about to crash forward
                    const currentDir = DIRECTIONS[agent.dirIndex];
                    const nextX_Forward = agent.x + currentDir.x;
                    const nextY_Forward = agent.y + currentDir.y;
                    
                    let isForwardBlocked = false;
                    if (nextX_Forward < 1 || nextX_Forward >= cols - 1 || nextY_Forward < safeZoneRows || nextY_Forward >= rows - 1) {
                        isForwardBlocked = true;
                    } else if (grid[nextY_Forward * cols + nextX_Forward] === 1) {
                        isForwardBlocked = true;
                    }

                    let forcePanicCrash = false;

                    // If not a dummy, check concentration
                    if (!agent.isDummy && !agent.isUser && agent.immortality <= 0) {
                        if (isForwardBlocked) {
                            // "Dodge Event"
                            // Roll against concentration
                            if (Math.random() > agent.concentration) {
                                // FAILED TO REACT
                                forcePanicCrash = true;
                            } else {
                                // SUCCESSFUL DODGE
                                // Reduce concentration (fatigue)
                                agent.concentration = Math.max(0, agent.concentration - 0.25);
                            }
                        } else {
                            // RECOVERY
                            // If safe, regain focus slowly
                            agent.concentration = Math.min(1.0, agent.concentration + 0.005);
                        }
                    }

                    if (agent.isUser) {
                        const inputDir = userNextDirRef.current;
                        if (inputDir !== null) {
                            const isOpposite = Math.abs(inputDir - agent.dirIndex) === 2;
                            if (!isOpposite) agent.dirIndex = inputDir;
                        }
                        bestOption = agent.dirIndex;
                        const move = DIRECTIONS[agent.dirIndex];
                        const nextX = agent.x + move.x;
                        const nextY = agent.y + move.y;
                        if (nextX < 1 || nextX >= cols - 1 || nextY < safeZoneRows || nextY >= rows - 1) crashed = true;
                        else if (grid[nextY * cols + nextX] === 1 && agent.immortality <= 0) crashed = true;
                    } else {
                        // AI LOGIC
                        if (forcePanicCrash) {
                            // PANIC: Skip evaluation, force current direction (Crash)
                            bestOption = agent.dirIndex; 
                            crashed = true; // We know it's blocked from check above
                        } else if (agent.reactionTimer > 0) {
                            bestOption = agent.dirIndex;
                            const move = DIRECTIONS[agent.dirIndex];
                            const nextX = agent.x + move.x;
                            const nextY = agent.y + move.y;
                            if (nextX < 1 || nextX >= cols - 1 || nextY < safeZoneRows || nextY >= rows - 1 || grid[nextY * cols + nextX] === 1) {
                                if (agent.immortality <= 0) crashed = true;
                            }
                        } else {
                            const distPixels = Math.sqrt((agent.x - agent.spawnX)**2 + (agent.y - agent.spawnY)**2) * cellSize;
                            const isImmune = distPixels < 100;
                            const currentDirIdx = agent.dirIndex;
                            const leftDir = (currentDirIdx + 3) % 4;
                            const rightDir = (currentDirIdx + 1) % 4;
                            const options = [currentDirIdx, leftDir, rightDir];
                            let maxScoreVal = -Infinity;
                            for (const opt of options) {
                                const score = evaluateMove(agent, opt, grid, cols, rows, agentsRef.current, isImmune, safeZoneRows, leaderId, lootRef.current);
                                if (score > maxScoreVal) {
                                    maxScoreVal = score;
                                    bestOption = opt;
                                }
                            }
                            if (maxScoreVal <= -5000) crashed = true;
                            agent.reactionTimer = agent.reactionGap;
                        }
                    }

                    if (!crashed && bestOption !== -1) {
                        if (bestOption !== agent.dirIndex) agent.lastTurnStep = agent.stepsAlive;
                        agent.dirIndex = bestOption;
                        const move = DIRECTIONS[agent.dirIndex];
                        agent.x += move.x;
                        agent.y += move.y;
                        agent.stepsAlive++;
                        const idx = agent.y * cols + agent.x;
                        
                        // Exact match loot pickup (legacy/running over)
                        const lootIdx = lootRef.current.findIndex(l => Math.round(l.x) === agent.x && Math.round(l.y) === agent.y);
                        if (lootIdx !== -1) {
                            const item = lootRef.current[lootIdx];
                            agent.score += item.value;
                            lootRef.current.splice(lootIdx, 1);
                        }

                        grid[idx] = 1;
                        ownerGrid[idx] = agent.id;
                        agent.path.push({x: agent.x, y: agent.y});

                        const userTrail = cfg.trailLength !== undefined ? cfg.trailLength : 0.8;
                        const maxPathLen = Math.floor((userTrail * 400) / (scale * 0.5)) + 20;
                        while (agent.path.length > maxPathLen) {
                            const tail = agent.path.shift();
                            if (tail && tail.x >= 0 && tail.x < cols && tail.y >= 0 && tail.y < rows) {
                                const tailIdx = tail.y * cols + tail.x;
                                grid[tailIdx] = 0;
                                ownerGrid[tailIdx] = -1;
                            }
                        }
                    } else {
                        if (agent.immortality <= 0) {
                            agent.erasing = true; 
                            createExplosion(agent.x, agent.y, agent.color, cellSize, agent.name);
                            
                            // Loot Drop: Kill Value + Half of Victim's Score
                            const baseDeathValue = 200;
                            const stolenScore = Math.floor(agent.score / 2);
                            const totalDrop = baseDeathValue + stolenScore;
                            
                            // Reset score (since they died and dropped half)
                            // This also prevents respawn with full score logic issues
                            agent.score = 0;

                            if (totalDrop > 0) scatterLoot(agent.x, agent.y, totalDrop, cols, rows, safeZoneRows);
                        }
                    }
                }
            });
        }

        // --- LOOT MAGNET LOGIC ---
        // 10x10 field = +/- 5 cells radius
        const magnetRange = 5;

        lootRef.current.forEach(item => {
            if (item.value <= 0) return; // Already collected

            let closestAgent: Agent | null = null;
            let minDst = Infinity;

            // Find closest active agent within range
            agentsRef.current.forEach(agent => {
                if (!agent.alive || agent.erasing) return;

                const dx = agent.x - item.x;
                const dy = agent.y - item.y;

                // Check bounding box first for speed (10x10 area)
                if (Math.abs(dx) <= magnetRange && Math.abs(dy) <= magnetRange) {
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < minDst) {
                        minDst = dist;
                        closestAgent = agent;
                    }
                }
            });

            if (closestAgent) {
                const target = closestAgent as Agent;
                const dx = target.x - item.x;
                const dy = target.y - item.y;
                const angle = Math.atan2(dy, dx);

                const magnetSpeed = (cfg.speed || 0.3) * 3.0;

                item.x += Math.cos(angle) * magnetSpeed;
                item.y += Math.sin(angle) * magnetSpeed;

                // Capture check (Distance < 1.0 cell)
                if (minDst < 1.0) {
                    target.score += item.value;
                    item.value = 0; // Mark for cleanup
                }
            }
        });

        // Cleanup collected loot
        lootRef.current = lootRef.current.filter(l => l.value > 0);

        drawAgents(ctx, agentsRef.current, cfg, cellSize, audioLevel, leaderId);
        drawExplosions(ctx, explosionsRef.current, cfg.opacity);

        // --- LEADERBOARD ---
        if (cfg.showLeaderboard) {
            drawLeaderboard(ctx, agentsRef.current, cfg.opacity);
        }

        // --- ROUND OVERLAYS ---
        if (cfg.roundMode && isPlaying) {
            ctx.save();
            const cx = w / 2;
            
            // Sudden Death Warning
            if (roundPhase === 'sudden_death') {
                ctx.font = "bold 40px 'Courier New', monospace";
                ctx.textAlign = "center";
                ctx.fillStyle = (timestamp % 500 < 250) ? '#FF0000' : '#880000';
                ctx.shadowColor = '#FF0000';
                ctx.shadowBlur = 20;
                ctx.fillText("SUDDEN DEATH", cx, 100);
            }

            // Cinematic Round End Screen
            // We use the overlayOpacityRef to handle smooth fade in AND fade out
            if (overlayOpacityRef.current > 0.01) {
                const animTime = roundAnimStartTimeRef.current > 0 ? (timestamp - roundAnimStartTimeRef.current) : 0;
                
                // Pass overlayOpacityRef.current as the master opacity for the whole screen
                drawRoundEndScreen(ctx, w, h, agentsRef.current, timeLeft, animTime, overlayOpacityRef.current);
            }
            
            ctx.restore();
        }

        // Cleanup dead agents
        agentsRef.current = agentsRef.current.filter(a => a.alive);
        
        animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [config.enabled, config.roundMode, config.size]);

  return (
    <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
    />
  );
};

export default TronEffect;
