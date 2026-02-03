
import React, { useEffect, useRef } from 'react';
import { EffectsConfig } from '../../types';

interface RainEffectProps {
  config: EffectsConfig['rain'];
}

interface Drop {
  x: number;
  y: number;
  z: number; // Depth (0.1 to 1) for parallax
  length: number;
  speed: number;
}

const RainEffect: React.FC<RainEffectProps> = ({ config }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropsRef = useRef<Drop[]>([]);
  const animationRef = useRef<number>(0);
  
  // Fade level for smooth toggle
  const fadeLevelRef = useRef<number>(0);
  
  // Store config in ref
  const configRef = useRef(config);

  useEffect(() => {
      configRef.current = config;
  }, [config]);

  const initDrops = (width: number, height: number, count: number) => {
      const drops: Drop[] = [];
      // Wide margin to handle wind blowing rain from off-screen
      // Increased margin to ensure no gaps even with high wind/angle
      const margin = Math.max(width, height) * 1.5;
      
      for (let i = 0; i < count; i++) {
          drops.push({
              x: (Math.random() * (width + margin * 2)) - margin,
              y: Math.random() * height,
              z: Math.random() * 0.8 + 0.2, // 0.2 to 1.0 depth
              length: Math.random() * 20 + 10,
              speed: Math.random() * 5 + 5
          });
      }
      return drops;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.width = canvas.offsetWidth;
    let h = canvas.height = canvas.offsetHeight;
    
    // Wind Accumulator for gustiness
    let time = 0;

    const render = () => {
        if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
             w = canvas.width = canvas.offsetWidth;
             h = canvas.height = canvas.offsetHeight;
        }

        const cfg = configRef.current;
        const targetFade = cfg.enabled ? 1.0 : 0.0;
        
        // Smooth Fade In/Out
        const delta = (targetFade - fadeLevelRef.current) * 0.02;
        fadeLevelRef.current += delta;

        if (Math.abs(targetFade - fadeLevelRef.current) < 0.001) {
            fadeLevelRef.current = targetFade;
        }

        if (fadeLevelRef.current < 0.005 && !cfg.enabled) {
             ctx.clearRect(0, 0, w, h);
             dropsRef.current = [];
             animationRef.current = requestAnimationFrame(render);
             return;
        }

        // Initialize Drops
        // Max drops increased to 5000 to cover the wider spawn area without losing density
        const maxDrops = 5000;
        const targetCount = Math.floor(cfg.intensity * maxDrops);

        // Margin for resets - needs to match initDrops logic
        const margin = Math.max(w, h) * 1.5;

        if (dropsRef.current.length < targetCount) {
             // Add new drops
             const newDrops = initDrops(w, h, targetCount - dropsRef.current.length);
             dropsRef.current.push(...newDrops);
        } else if (dropsRef.current.length > targetCount) {
             // Trim drops
             dropsRef.current.length = targetCount;
        }

        ctx.clearRect(0, 0, w, h);
        
        // Physics & Drawing
        time += 0.01;
        
        // Calculate Wind
        const baseWind = cfg.wind * 10;
        const gust = Math.sin(time) * (cfg.gustiness * 10) + Math.sin(time * 2.5) * (cfg.gustiness * 5);
        const totalWind = baseWind + gust;
        
        // Direction angle
        const wanderOffset = Math.sin(time * 0.3) * ((cfg.wander || 0) * 30); 
        const angleRad = ((cfg.direction + wanderOffset) * Math.PI) / 180;
        
        const angleX = Math.sin(angleRad);
        const angleY = Math.cos(angleRad);

        const baseOpacity = cfg.opacity !== undefined ? cfg.opacity : 0.5;
        ctx.strokeStyle = `rgba(180, 220, 255, ${baseOpacity * fadeLevelRef.current})`;
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';

        ctx.beginPath();
        for (let i = 0; i < dropsRef.current.length; i++) {
            const d = dropsRef.current[i];
            
            // Move
            const moveSpeed = d.speed * cfg.speed * d.z;
            
            d.x += (angleX * moveSpeed) + (totalWind * 0.1 * d.z);
            d.y += angleY * moveSpeed;

            // Render details
            const len = d.length * cfg.size * d.z;
            
            const tailX = d.x - (angleX * len) - (totalWind * 0.05 * d.z);
            const tailY = d.y - (angleY * len);

            // Optimization: Only draw if visible on screen
            if (
                d.x > -50 && d.x < w + 50 &&
                d.y > -50 && d.y < h + 50
            ) {
                ctx.moveTo(d.x, d.y);
                ctx.lineTo(tailX, tailY);
            }

            // Reset if out of wide bounds
            if (d.y > h + len || d.x > w + margin || d.x < -margin) {
                d.y = -len;
                // Respawn randomly within the full wide range
                d.x = (Math.random() * (w + margin * 2)) - margin;
            }
        }
        ctx.stroke();

        animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10 mix-blend-screen"
    />
  );
};

export default RainEffect;
