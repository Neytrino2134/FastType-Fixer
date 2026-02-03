
import { Agent, Loot } from './types';
import { DIRECTIONS } from './constants';

// --- UTILS ---

const isCellSafe = (x: number, y: number, grid: Uint8Array, cols: number, rows: number, safeZoneY: number): boolean => {
    if (x < 1 || x >= cols - 1 || y < safeZoneY || y >= rows - 1) return false;
    return grid[y * cols + x] === 0;
};

const getWallNeighbors = (x: number, y: number, grid: Uint8Array, cols: number, rows: number, safeZoneY: number): number => {
    let count = 0;
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (const d of dirs) {
        const nx = x + d[0];
        const ny = y + d[1];
        if (nx < 1 || nx >= cols - 1 || ny < safeZoneY || ny >= rows - 1 || grid[ny * cols + nx] === 1) {
            count++;
        }
    }
    return count;
};

// Vision Radius ~240px
const scanSurroundings = (
    cx: number, 
    cy: number, 
    grid: Uint8Array, 
    cols: number, 
    rows: number, 
    safeZoneY: number
): number => {
    let totalSpace = 0;
    const scanDirs = [
        {x:0, y:-1}, {x:1, y:-1}, {x:1, y:0}, {x:1, y:1},
        {x:0, y:1}, {x:-1, y:1}, {x:-1, y:0}, {x:-1, y:-1}
    ];
    const maxDist = 60; 
    
    for (const d of scanDirs) {
        let dist = 0;
        let tx = cx;
        let ty = cy;
        while(dist < maxDist) {
            tx += d.x;
            ty += d.y;
            if (!isCellSafe(tx, ty, grid, cols, rows, safeZoneY)) break;
            dist++;
        }
        totalSpace += dist;
    }
    return totalSpace;
};

// Safety Check (Flood Fill)
const getAccessibleAreaSize = (
    startX: number, 
    startY: number, 
    grid: Uint8Array, 
    cols: number, 
    rows: number, 
    safeZoneY: number, 
    limit: number = 300
): number => {
    const stack = [{x: startX, y: startY}];
    const visited = new Set<number>(); 
    let count = 0;
    const startIdx = startY * cols + startX;
    visited.add(startIdx);

    while (stack.length > 0 && count < limit) {
        const current = stack.pop()!;
        count++;
        const neighbors = [
            {x: current.x + 1, y: current.y},
            {x: current.x - 1, y: current.y},
            {x: current.x, y: current.y + 1},
            {x: current.x, y: current.y - 1}
        ];
        for (const n of neighbors) {
            if (isCellSafe(n.x, n.y, grid, cols, rows, safeZoneY)) {
                const idx = n.y * cols + n.x;
                if (!visited.has(idx)) {
                    visited.add(idx);
                    stack.push(n);
                }
            }
        }
    }
    return count;
};

const isSelfHugging = (nextX: number, nextY: number, path: {x: number, y: number}[]) => {
    const checkDepth = Math.min(path.length, 40);
    for(let i = 1; i < checkDepth; i++) {
        const pt = path[path.length - 1 - i];
        if (Math.abs(pt.x - nextX) + Math.abs(pt.y - nextY) === 1) {
            return true;
        }
    }
    return false;
}

// --- AGGRESSIVE MANEUVERS ---

// 1. Cut-Off Logic: Predict intersection
const evaluateCutOff = (
    myNextX: number,
    myNextY: number,
    myDirIdx: number,
    enemy: Agent
): number => {
    const dist = Math.abs(myNextX - enemy.x) + Math.abs(myNextY - enemy.y);
    if (dist > 15) return 0;

    const enemyDir = DIRECTIONS[enemy.dirIndex];
    const myDir = DIRECTIONS[myDirIdx];

    const lookAhead = 3;
    const enemyFutureX = enemy.x + (enemyDir.x * lookAhead);
    const enemyFutureY = enemy.y + (enemyDir.y * lookAhead);
    const myFutureX = myNextX + (myDir.x * (lookAhead - 1));
    const myFutureY = myNextY + (myDir.y * (lookAhead - 1));

    const distToInterceptMe = Math.abs(myFutureX - enemyFutureX) + Math.abs(myFutureY - enemyFutureY);
    
    if (distToInterceptMe <= 2) {
        const isPerpendicular = (myDir.x !== 0 && enemyDir.y !== 0) || (myDir.y !== 0 && enemyDir.x !== 0);
        if (isPerpendicular) {
            return 8000; // Increased value for aggressive cuts
        }
    }
    return 0;
};

// 2. Parallel Hunter: If moving parallel, turn into them
const evaluateParallelAttack = (
    agent: Agent,
    potentialDirIdx: number,
    enemy: Agent
): number => {
    const dist = Math.abs(agent.x - enemy.x) + Math.abs(agent.y - enemy.y);
    if (dist > 10) return 0;

    if (agent.dirIndex === enemy.dirIndex) {
        const turnDir = DIRECTIONS[potentialDirIdx];
        const dx = enemy.x - agent.x;
        const dy = enemy.y - agent.y;
        
        if (Math.sign(dx) === Math.sign(turnDir.x) && dx !== 0 && turnDir.x !== 0) return 3000;
        if (Math.sign(dy) === Math.sign(turnDir.y) && dy !== 0 && turnDir.y !== 0) return 3000;
    }
    return 0;
}

// --- MAIN EVALUATOR ---

export const evaluateMove = (
  agent: Agent, 
  potentialDirIndex: number, 
  grid: Uint8Array, 
  cols: number, 
  rows: number, 
  allAgents: Agent[],
  isImmune: boolean,
  safeZoneY: number,
  leaderId: number,
  loot: Loot[] 
): number => {
  const dir = DIRECTIONS[potentialDirIndex];
  const nextX = agent.x + dir.x;
  const nextY = agent.y + dir.y;

  // --- DUMMY LOGIC: PURE CHAOS ---
  // Dummies generally ignore safety and logic.
  if (agent.isDummy) {
      // 50% chance to behave slightly normally (avoid immediate wall), 50% purely random
      const isRandom = Math.random() < 0.5;
      
      if (!isRandom) {
          // Basic wall avoidance only
          if (!isCellSafe(nextX, nextY, grid, cols, rows, safeZoneY)) {
              return -500; // Penalize, but not impossibly so (they might crash)
          }
          return 50; // Just keep going
      } else {
          // Pure randomness - might pick a wall
          return Math.random() * 1000; 
      }
  }

  // --- 1. HARD COLLISION ---
  if (!isCellSafe(nextX, nextY, grid, cols, rows, safeZoneY) && !isImmune) {
      return -999999;
  }

  let score = 0;
  const isStraight = potentialDirIndex === agent.dirIndex;
  const isLeader = agent.id === leaderId;

  // --- 2. SURVIVAL (Area Check) ---
  const areaSize = getAccessibleAreaSize(nextX, nextY, grid, cols, rows, safeZoneY, 300);
  
  if (areaSize < 30) {
      score -= 10000; // Certain death
  } else if (areaSize < 100) {
      score -= 2000; // Trap
  } else {
      // Leader prioritizes survival space heavily
      if (isLeader) {
          score += areaSize * 5; 
      } else {
          score += 100; // Safe
      }
  }

  // --- 3. SPACE AWARENESS ---
  score += scanSurroundings(nextX, nextY, grid, cols, rows, safeZoneY);

  const wallNeighbors = getWallNeighbors(nextX, nextY, grid, cols, rows, safeZoneY);
  if (wallNeighbors > 0) {
      score -= 50 * wallNeighbors;
  }

  if (isSelfHugging(nextX, nextY, agent.path)) {
      score -= 800; 
  }

  // --- 4. MOMENTUM ---
  if (isStraight) {
      score += 50; 
      let clearPath = 0;
      let tx = nextX, ty = nextY;
      for(let k=0; k<15; k++) {
          tx += dir.x; ty += dir.y;
          if (isCellSafe(tx, ty, grid, cols, rows, safeZoneY)) clearPath++;
          else break;
      }
      score += clearPath * 5; 
  } else {
      score -= 20;
      const stepsSinceTurn = agent.stepsAlive - agent.lastTurnStep;
      if (stepsSinceTurn < 4) {
          score -= 500; 
      }
  }

  // --- 5. COMBAT LOGIC ---
  // If we are leader, we prioritize running away unless cornered
  const combatMultiplier = isLeader ? 0.2 : 2.5; 

  let closestEnemy: Agent | null = null;
  let minEnemyDist = Infinity;

  // Manual loop to ensure type safety and avoid TS 'never' inference bugs
  for (const other of allAgents) {
      if (other.id === agent.id || !other.alive || other.erasing) continue;
      const d = Math.abs(agent.x - other.x) + Math.abs(agent.y - other.y);
      if (d < minEnemyDist) {
          minEnemyDist = d;
          closestEnemy = other;
      }
  }

  if (closestEnemy) {
      let aggression = (agent.speedFactor || 1.0) * combatMultiplier;
      
      // HUNT THE LEADER: If I am not leader, and enemy IS leader, attack hard
      if (!isLeader && closestEnemy.id === leaderId) {
          aggression *= 2.0; 
          score += 500; // General bonus for moving towards leader vicinity
      }

      const cutOffScore = evaluateCutOff(nextX, nextY, potentialDirIndex, closestEnemy);
      score += cutOffScore * aggression;
      const parallelScore = evaluateParallelAttack(agent, potentialDirIndex, closestEnemy);
      score += parallelScore * aggression;
      
      if (minEnemyDist < 6) {
          const enemyNextX = closestEnemy.x + DIRECTIONS[closestEnemy.dirIndex].x;
          const enemyNextY = closestEnemy.y + DIRECTIONS[closestEnemy.dirIndex].y;
          if (nextX === enemyNextX && nextY === enemyNextY) score -= 10000;
          if (nextX === closestEnemy.x && nextY === closestEnemy.y) score -= 10000;
      }
  }

  // --- 6. LOOT SEEKING (PRIORITY #1) ---
  // Direct pickup
  const lootOnSpot = loot.find(l => l.x === nextX && l.y === nextY);
  if (lootOnSpot) {
      score += 5000; // MASSIVE PRIORITY: Grab it now
      score += lootOnSpot.value * 2; 
  }

  // Sense nearby loot (Smell)
  // Scan radius to encourage moving TOWARDS points
  let bestLootPull = 0;
  const sensingRadius = 40; // Increased radius
  
  loot.forEach(item => {
      const dist = Math.abs(item.x - nextX) + Math.abs(item.y - nextY);
      if (dist < sensingRadius) {
          // Inverse square law for attraction
          const pull = (sensingRadius - dist) * 50; // Increased pull strength
          // Weight by value (richer loot pulls harder)
          const valueWeight = Math.min(2, item.value / 50); 
          bestLootPull = Math.max(bestLootPull, pull * valueWeight);
      }
  });
  score += bestLootPull;

  // Small noise to break symmetry loops
  score += Math.random() * 15;

  return score;
};
