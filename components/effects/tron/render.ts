
import { Agent, ExplosionParticle, Loot } from './types';
import { EffectsConfig } from '../../../types';
import { DIRECTIONS } from './constants'; 

export const drawBackgroundPattern = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pattern: string,
  opacity: number
) => {
  ctx.save();
  ctx.globalAlpha = opacity * 0.15; // Low opacity for background
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;

  const step = 60; // Large pattern size

  ctx.beginPath();
  
  if (pattern === 'grid') {
      for (let x = 0; x <= w; x += step) {
          ctx.moveTo(x, 0); ctx.lineTo(x, h);
      }
      for (let y = 0; y <= h; y += step) {
          ctx.moveTo(0, y); ctx.lineTo(w, y);
      }
  } else if (pattern === 'iso') {
      // Diagonals
      for (let x = -h; x < w; x += step) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x + h, h);
      }
      for (let x = 0; x < w + h; x += step) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x - h, h);
      }
  } else if (pattern === 'hex') {
      // Simplified Hexagon grid (triangles)
      const r = step / 2;
      const dy = step * Math.sin(Math.PI/3);
      for (let y = 0; y < h + step; y += dy) {
          for (let x = 0; x < w + step; x += step * 1.5) {
             const offset = (Math.floor(y / dy) % 2) * (step * 0.75);
             ctx.moveTo(x + offset + r, y);
             for(let i=1; i<=6; i++) {
                 ctx.lineTo(x + offset + r * Math.cos(i * Math.PI / 3), y + r * Math.sin(i * Math.PI / 3));
             }
          }
      }
  } else if (pattern === 'dots') {
      for (let x = 0; x <= w; x += step) {
          for (let y = 0; y <= h; y += step) {
              ctx.moveTo(x + 2, y);
              ctx.arc(x, y, 2, 0, Math.PI * 2);
          }
      }
  }

  ctx.stroke();
  ctx.restore();
};

export const drawGrid = (
  ctx: CanvasRenderingContext2D,
  w: number, 
  h: number,
  cellSize: number,
  safeZoneRows: number,
  opacity: number,
  cols: number,
  rows: number,
  getGateCoordinates: Function
) => {
  // Draw Arena Border
  // UPDATED: Inset by 1 cell on Left/Right/Bottom to visualize the new safe zones
  ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.2})`;
  ctx.lineWidth = 1;
  
  const startX = cellSize;
  const startY = safeZoneRows * cellSize;
  const rectW = w - (2 * cellSize); // Minus Left and Right columns
  const rectH = h - (safeZoneRows * cellSize) - cellSize; // Minus Top and Bottom rows

  ctx.strokeRect(startX, startY, rectW, rectH);
  
  // Safe Zone Line (Top) - Adjusted length
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(startX + rectW, startY);
  ctx.strokeStyle = `rgba(255, 0, 0, 0.3)`; 
  ctx.setLineDash([5, 5]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw Spawn Gates
  ctx.globalAlpha = opacity * 0.5;
  const gates = getGateCoordinates(cols, rows, safeZoneRows);
  gates.forEach((gate: any) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(gate.x * cellSize, gate.y * cellSize, cellSize, cellSize);
      // Marker
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 1;
      const size = cellSize * 3;
      const x = gate.x * cellSize + cellSize/2;
      const y = gate.y * cellSize + cellSize/2;
      ctx.strokeRect(x - size/2, y - size/2, size, size);
  });
};

export const drawLoot = (
  ctx: CanvasRenderingContext2D,
  loot: Loot[],
  cellSize: number,
  opacity: number
) => {
  const time = Date.now() * 0.005;
  
  loot.forEach(item => {
      const px = item.x * cellSize;
      const py = item.y * cellSize;
      
      // Pulse size
      const pulse = (Math.sin(time + item.x) + 1) * 0.5; // 0 to 1
      const sizeOffset = pulse * 2;
      const offset = -sizeOffset / 2;

      ctx.fillStyle = item.color;
      ctx.globalAlpha = opacity;
      ctx.shadowBlur = 5;
      ctx.shadowColor = item.color;
      
      // Diamond shape
      ctx.beginPath();
      ctx.moveTo(px + cellSize/2, py + offset);
      ctx.lineTo(px + cellSize - offset, py + cellSize/2);
      ctx.lineTo(px + cellSize/2, py + cellSize - offset);
      ctx.lineTo(px + offset, py + cellSize/2);
      ctx.closePath();
      ctx.fill();
      
      ctx.shadowBlur = 0;
  });
};

export const drawAgents = (
  ctx: CanvasRenderingContext2D,
  agents: Agent[],
  config: EffectsConfig['tron'],
  cellSize: number,
  audioLevel: number,
  leaderId: number
) => {
  agents.forEach(agent => {
    if (!agent.alive) return;

    const isLeader = agent.id === leaderId && agent.score > 0;
    const pathLen = agent.path.length;
    const fadeStartRatio = 0.2; 
    const fadeLen = Math.max(5, pathLen * fadeStartRatio);

    // Apply Glow (Audio Reactive)
    if (config.glowEnabled) {
       // Dynamic glow size and intensity based on audio
       const glowSize = (cellSize * 1.5) + (audioLevel * cellSize * 4 * (config.glowIntensity || 0.5));
       ctx.shadowBlur = isLeader ? glowSize * 1.5 : glowSize;
       // Gold glow for leader, normal color for others
       ctx.shadowColor = isLeader ? '#FFD700' : agent.color;
    } else {
       ctx.shadowBlur = 0;
    }

    // Draw Trail
    for (let i = 0; i < pathLen; i++) {
        const pt = agent.path[i];
        let alpha = 1;
        if (i < fadeLen) alpha = i / fadeLen;
        
        if (agent.erasing) {
            const steps = 4;
            const noise = Math.floor(Math.random() * steps) + 1;
            alpha *= (noise / steps);
        }
        
        ctx.fillStyle = agent.color;
        ctx.globalAlpha = alpha * config.opacity;
        ctx.fillRect(pt.x * cellSize, pt.y * cellSize, cellSize, cellSize);
    }
    
    // Reset shadow for text and other elements to avoid performance hit
    ctx.shadowBlur = 0;

    // Draw Head
    if (!agent.erasing && pathLen > 0) {
        const head = agent.path[pathLen - 1];
        const dir = DIRECTIONS[agent.dirIndex];
        const progress = Math.min(0.99, Math.max(0, agent.moveAccumulator));
        
        const gridX = head.x * cellSize;
        const gridY = head.y * cellSize;
        
        const offsetX = dir.x * progress * cellSize;
        const offsetY = dir.y * progress * cellSize;
        
        const smoothX = gridX + offsetX;
        const smoothY = gridY + offsetY;

        if (agent.immortality > 0 && Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        } else {
            ctx.globalAlpha = 1.0;
        }

        // Head Connector
        ctx.fillStyle = agent.color;
        ctx.globalAlpha = config.opacity;
        const connectorX = Math.min(gridX, smoothX);
        const connectorY = Math.min(gridY, smoothY);
        const connectorW = cellSize + Math.abs(offsetX);
        const connectorH = cellSize + Math.abs(offsetY);
        
        // Re-apply shadow for head if enabled, as it's drawn separately
        if (config.glowEnabled) {
            ctx.shadowBlur = (cellSize * 2) + (audioLevel * cellSize * 4 * (config.glowIntensity || 0.5));
            ctx.shadowColor = isLeader ? '#FFD700' : agent.color;
        }
        ctx.fillRect(connectorX, connectorY, connectorW, connectorH);
        ctx.shadowBlur = 0;

        // Highlight
        ctx.fillStyle = isLeader ? '#FFFF00' : '#ffffff';
        const hlSize = Math.max(1, cellSize - 2);
        const hlOffset = (cellSize - hlSize) / 2;
        ctx.fillRect(smoothX + hlOffset, smoothY + hlOffset, hlSize, hlSize);

        // --- LEADER EFFECT: HALO ---
        if (isLeader) {
            ctx.save();
            ctx.strokeStyle = '#FFD700'; // Gold
            ctx.lineWidth = 1;
            
            const time = Date.now() * 0.005;
            const ringSize = cellSize * 2.5 + Math.sin(time) * 2; // Pulsing
            
            ctx.beginPath();
            ctx.arc(smoothX + cellSize/2, smoothY + cellSize/2, ringSize, 0, Math.PI * 2);
            ctx.stroke();
            
            // Rotating markers
            ctx.translate(smoothX + cellSize/2, smoothY + cellSize/2);
            ctx.rotate(time);
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(-ringSize, -1, 2, 2);
            ctx.fillRect(ringSize - 2, -1, 2, 2);
            ctx.fillRect(-1, -ringSize, 2, 2);
            ctx.fillRect(-1, ringSize - 2, 2, 2);
            
            ctx.restore();
        }

        // --- NAMES & SCORE ---
        if (config.showNames !== false || agent.isUser) {
            const fontSize = Math.max(8, cellSize * 2);
            ctx.font = `bold ${fontSize}px "Courier New", monospace`;
            
            // Format: NAME [SCORE]
            const crown = isLeader ? "👑 " : "";
            const text = `${crown}${agent.name} [${agent.score}]`;
            
            const metrics = ctx.measureText(text);
            const bgW = metrics.width + 8;
            const bgH = fontSize + 4; 
            
            const textX = smoothX + cellSize/2;
            const textY = smoothY - cellSize - (isLeader ? 5 : 0); // Float higher if leader

            ctx.fillStyle = isLeader ? 'rgba(50, 40, 0, 0.7)' : 'rgba(0, 0, 0, 0.6)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillRect(textX - bgW/2, textY - fontSize - 2, bgW, bgH);
            
            // Border for leader tag
            if (isLeader) {
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 1;
                ctx.strokeRect(textX - bgW/2, textY - fontSize - 2, bgW, bgH);
            }

            ctx.fillStyle = isLeader ? '#FFD700' : agent.color;
            ctx.fillText(text, textX, textY);
        }
    }
  });
};

export const drawExplosions = (
  ctx: CanvasRenderingContext2D,
  explosions: ExplosionParticle[],
  opacity: number
) => {
  ctx.shadowBlur = 0; // Ensure no shadow leaks
  for (let i = explosions.length - 1; i >= 0; i--) {
    const p = explosions[i];
    
    if (p.type === 'pixel') {
        p.x += p.vx;
        p.y += p.vy;
        p.phase += 0.2;
        const jitterX = Math.sin(p.phase) * 0.5;
        const jitterY = Math.cos(p.phase) * 0.5;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.life -= 0.02;
        ctx.globalAlpha = p.life * opacity;
        ctx.fillStyle = p.life > 0.6 ? '#ffffff' : p.color; 
        ctx.fillRect(p.x + jitterX, p.y + jitterY, p.size, p.size);

    } else if (p.type === 'ring') {
        p.size += 2;
        p.life -= 0.04;
        ctx.globalAlpha = p.life * opacity;
        ctx.strokeStyle = p.life > 0.5 ? '#ffffff' : p.color;
        ctx.lineWidth = 2; 
        const offset = p.size / 2;
        ctx.strokeRect(p.x - offset, p.y - offset, p.size, p.size);

    } else if (p.type === 'glitch') {
        p.life -= 0.08;
        ctx.globalAlpha = p.life * opacity;
        ctx.fillStyle = p.color;
        if (Math.random() > 0.5) {
            ctx.fillRect(p.x - p.size/2, p.y, p.size, 2); 
        } else {
            ctx.fillRect(p.x, p.y - p.size/2, 2, p.size);
        }
    } else if (p.type === 'text' && p.text) {
        p.y += p.vy; 
        p.life -= 0.015;
        
        ctx.globalAlpha = p.life * opacity;
        ctx.fillStyle = p.color;
        ctx.textAlign = 'center';
        ctx.font = `bold ${p.size}px "Courier New", monospace`;
        ctx.fillText(p.text, p.x, p.y);
    }

    if (p.life <= 0) {
        explosions.splice(i, 1);
    }
  }
};

export const drawLeaderboard = (
  ctx: CanvasRenderingContext2D,
  agents: Agent[],
  opacity: number
) => {
  // Filter for active (or recently active) agents and sort by score
  // We include dead agents to show final scores of the round
  const leaders = [...agents].sort((a, b) => b.score - a.score).slice(0, 5);

  const boxX = 20;
  const boxY = 180; // Lowered by 100px (was 80)
  const boxW = 200;
  const lineHeight = 18;
  const headerHeight = 30;
  const boxH = (leaders.length * lineHeight) + headerHeight + 10;

  // Draw Box Background
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = 'rgba(0, 10, 20, 0.85)';
  ctx.strokeStyle = '#00f3ff';
  ctx.lineWidth = 1;
  
  // Hologram Glow Effect
  ctx.shadowColor = '#00f3ff';
  ctx.shadowBlur = 10;
  
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeRect(boxX, boxY, boxW, boxH);
  ctx.shadowBlur = 0; // Reset for text crispness

  // Draw Header
  ctx.fillStyle = '#00f3ff';
  ctx.font = "bold 12px 'Courier New', monospace";
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText("LEADERBOARD // TOP 5", boxX + 10, boxY + 15);
  
  // Separator Line
  ctx.beginPath();
  ctx.moveTo(boxX, boxY + 25);
  ctx.lineTo(boxX + boxW, boxY + 25);
  ctx.strokeStyle = 'rgba(0, 243, 255, 0.3)';
  ctx.stroke();

  // Draw Entries
  leaders.forEach((agent, i) => {
      const y = boxY + headerHeight + 5 + (i * lineHeight);
      
      // Agent Color
      if (i === 0) ctx.fillStyle = '#FFD700'; // Gold for leader
      else ctx.fillStyle = '#FFFFFF'; // White for others
      
      ctx.font = "11px 'Courier New', monospace";
      
      // Rank & Name
      // Truncate name if too long
      let name = agent.name;
      if (name.length > 12) name = name.substring(0, 12) + "..";
      
      const rankStr = `${i+1}.`;
      ctx.fillText(rankStr, boxX + 10, y);
      ctx.fillText(name, boxX + 35, y);
      
      // Score (Right Aligned)
      ctx.textAlign = 'right';
      ctx.fillText(agent.score.toString(), boxX + boxW - 10, y);
      ctx.textAlign = 'left'; // Reset
  });

  ctx.restore();
};

export const drawRoundEndScreen = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    agents: Agent[],
    timeLeft: number,
    animTime: number, // Time in ms since round end started
    masterOpacity: number
) => {
    // 1. Smooth Fade In Background
    // Uses masterOpacity for seamless fade in/out
    ctx.fillStyle = `rgba(0, 0, 0, ${0.85 * masterOpacity})`;
    ctx.fillRect(0, 0, w, h);

    // Find Winner
    const survivors = agents.filter(a => a.alive && !a.erasing);
    const winner = survivors.length > 0 
        ? survivors.reduce((prev, current) => (prev.score > current.score) ? prev : current)
        : { name: "NO SURVIVORS", score: 0, color: '#FF0000' };

    const cx = w / 2;
    const cy = h / 2;

    // 2. Animate Title Slide Up
    // Slide from +50px to 0px over the first 800ms
    const slideProgress = Math.min(1, animTime / 800);
    // Ease out cubic
    const ease = 1 - Math.pow(1 - slideProgress, 3);
    const yOffset = (1 - ease) * 50; 
    
    ctx.save();
    ctx.globalAlpha = masterOpacity;
    
    // TITLE
    ctx.font = "bold 60px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = '#FFD700';
    // Pulsing Glow
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20 + Math.sin(animTime * 0.005) * 10;
    
    ctx.fillText("ROUND FINISHED", cx, (cy - 120) + yOffset);
    ctx.shadowBlur = 0; // Reset for next texts

    // WINNER NAME
    ctx.font = "bold 50px 'Courier New', monospace";
    ctx.fillStyle = winner.color;
    // Slight shadow matching color
    ctx.shadowColor = winner.color;
    ctx.shadowBlur = 15;
    ctx.fillText(`WINNER: ${winner.name}`, cx, (cy - 40) + yOffset);
    ctx.shadowBlur = 0;

    // WINNER SCORE
    ctx.font = "bold 30px 'Courier New', monospace";
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`SCORE: ${winner.score}`, cx, (cy + 20) + yOffset);

    // NEXT ROUND TIMER
    ctx.font = "20px 'Courier New', monospace";
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(`NEXT ROUND IN ${Math.ceil(timeLeft)}s`, cx, (cy + 70) + yOffset);

    // 3. LEADERBOARD TYPEWRITER EFFECT
    // Starts after 800ms
    const listStartTime = 800;
    
    if (animTime > listStartTime) {
        const top5 = [...agents].sort((a, b) => b.score - a.score).slice(0, 5);
        const listStartY = cy + 130 + yOffset;
        const lineHeight = 25;
        const lineDelay = 200; // Time between lines
        const charSpeed = 20;  // ms per char

        ctx.textAlign = "left";
        ctx.font = "16px 'Courier New', monospace";

        top5.forEach((agent, i) => {
            const lineStart = listStartTime + (i * lineDelay);
            
            if (animTime > lineStart) {
                // Construct full string
                const rank = `${i + 1}.`;
                const name = agent.name.padEnd(15, ' ');
                const score = agent.score.toString().padStart(6, ' ');
                const fullLine = `${rank} ${name} ${score}`;
                
                // Calculate how many chars to show
                const charsToShow = Math.floor((animTime - lineStart) / charSpeed);
                const visibleText = fullLine.substring(0, charsToShow);
                
                // Color Logic
                ctx.fillStyle = (agent.id === (winner as any).id) ? '#FFD700' : '#CCCCCC';
                
                // Center the block
                const textWidth = ctx.measureText(fullLine).width;
                const lineX = cx - (textWidth / 2);
                
                ctx.fillText(visibleText, lineX, listStartY + (i * lineHeight));

                // Blinking Cursor (Block) at end of typing line
                if (charsToShow < fullLine.length) {
                    const typedWidth = ctx.measureText(visibleText).width;
                    ctx.fillStyle = '#00F3FF';
                    ctx.fillRect(lineX + typedWidth + 2, listStartY + (i * lineHeight) - 12, 8, 14);
                }
            }
        });
    }

    ctx.restore();
};
