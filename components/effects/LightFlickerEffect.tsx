
import React, { useEffect, useRef } from 'react';
import { EffectsConfig } from '../../types';

interface LightFlickerEffectProps {
  config: EffectsConfig['lightFlicker'];
}

const LightFlickerEffect: React.FC<LightFlickerEffectProps> = ({ config }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  
  // State refs for the flicker logic
  const nextUpdateRef = useRef<number>(0);
  const currentOpacityRef = useRef<number>(0);
  const isDimRef = useRef<boolean>(true); // True = Black overlay, False = White overlay

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const render = (time: number) => {
        // Resize handling
        if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        }

        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        if (!config.enabled) {
            animationRef.current = requestAnimationFrame(render);
            return;
        }

        // Logic:
        // We want stepped changes. We hold a value for a random duration based on speed.
        if (time >= nextUpdateRef.current) {
            // Calculate next update time
            // Speed 0.1 -> Slow (longer intervals)
            // Speed 1.0 -> Fast (shorter intervals)
            const speedFactor = Math.max(0.1, config.speed);
            const interval = (Math.random() * 500 + 50) / speedFactor;
            nextUpdateRef.current = time + interval;

            // Determine if we are dimming (common) or surging (rare)
            // 80% chance to dim (filament struggling), 20% chance to surge
            isDimRef.current = Math.random() > 0.2;

            // Determine opacity based on intensity
            // Intensity 0.1 -> Very subtle
            // Intensity 1.0 -> Full blackouts or bright flashes
            const randomVal = Math.random();
            
            // Non-linear curve for more natural flicker (more small flickers, fewer big ones)
            const strength = Math.pow(randomVal, 2) * config.intensity;
            
            currentOpacityRef.current = strength;
        }

        if (currentOpacityRef.current > 0.01) {
            if (isDimRef.current) {
                // Dimming: Draw Black with Multiply or Normal
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = `rgba(0, 0, 0, ${currentOpacityRef.current})`;
            } else {
                // Surging: Draw White with Screen or Soft Light
                // Using Screen makes it additive brightness
                ctx.globalCompositeOperation = 'screen';
                // Surges should be slightly less intense visually than blackouts to avoid blinding
                ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacityRef.current * 0.6})`;
            }
            
            ctx.fillRect(0, 0, w, h);
        }

        animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [config.enabled, config.intensity, config.speed]);

  return (
    <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-20"
    />
  );
};

export default LightFlickerEffect;
