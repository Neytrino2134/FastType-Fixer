
import React, { useEffect, useRef } from 'react';

interface NoiseOverlayProps {
  opacity: number;
  pixelation: number;
}

const NoiseOverlay: React.FC<NoiseOverlayProps> = ({ opacity, pixelation }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      const parent = canvas.parentElement;
      const rectW = parent ? parent.clientWidth : 300;
      const rectH = parent ? parent.clientHeight : 200;
      
      // OPTIMIZATION:
      // Cap the internal resolution for noise. Even for HD, noise doesn't need to be 1920x1080.
      // 640px width is enough to look like good "static" when scaled up.
      // This reduces pixel iterations from ~2,000,000 to ~230,000 (10x faster).
      const MAX_WIDTH = 640; 
      let scale = Math.max(1, pixelation);
      
      // If no pixelation set, still scale down to save performance unless user has large screen
      if (scale === 1 && rectW > MAX_WIDTH) {
          scale = rectW / MAX_WIDTH;
      }
      
      const renderW = Math.ceil(rectW / scale);
      const renderH = Math.ceil(rectH / scale);

      if (canvas.width !== renderW || canvas.height !== renderH) {
        canvas.width = renderW;
        canvas.height = renderH;
      }

      // Optimization: Use ImageData + Uint32Array instead of fillRect loop
      // fillRect is very slow for thousands of particles.
      if (opacity > 0) {
        const imageData = ctx.createImageData(renderW, renderH);
        const buffer32 = new Uint32Array(imageData.data.buffer);
        const len = buffer32.length;
        
        // Threshold for noise density (e.g. 15% of pixels are noise)
        // We use Math.random() in a simplified way or just loop
        // To be super fast, we can skip pixels.
        
        // Alpha calculation: 0xAABBGGRR
        // We want white (FFFFFF) with Alpha.
        const alphaInt = Math.floor(opacity * 255);
        const pixelValue = (alphaInt << 24) | 0x00FFFFFF;

        for (let i = 0; i < len; i++) {
           if (Math.random() < 0.15) {
               buffer32[i] = pixelValue;
           }
        }
        
        ctx.putImageData(imageData, 0, 0);
      } else {
        ctx.clearRect(0, 0, renderW, renderH);
      }

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [opacity, pixelation]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-none z-40"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};

export default NoiseOverlay;
