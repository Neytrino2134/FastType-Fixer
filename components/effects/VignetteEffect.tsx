
import React, { useMemo } from 'react';
import { EffectsConfig } from '../../types';

interface VignetteEffectProps {
  config: EffectsConfig['vignette'];
}

const VignetteEffect: React.FC<VignetteEffectProps> = ({ config }) => {
  // Generate a static noise data URL for dithering
  // This breaks up the gradient bands on 8-bit displays
  const noiseUrl = useMemo(() => {
      if (typeof document === 'undefined') return '';
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';
      
      const idata = ctx.createImageData(200, 200);
      const buffer32 = new Uint32Array(idata.data.buffer);
      
      for (let i = 0; i < buffer32.length; i++) {
          if (Math.random() < 0.5) {
             // Subtle black noise with low alpha
             buffer32[i] = 0x08000000; 
          }
      }
      ctx.putImageData(idata, 0, 0);
      return canvas.toDataURL();
  }, []);

  if (!config.enabled) return null;

  return (
    <div 
      className="absolute inset-0 pointer-events-none z-20"
      style={{
        background: `radial-gradient(circle, transparent ${100 * (1 - config.roundness)}%, rgba(0,0,0,${config.intensity}) 100%)`
      }}
    >
        {/* Dithering Layer to fix banding */}
        <div 
            className="absolute inset-0 w-full h-full opacity-30 mix-blend-overlay"
            style={{ backgroundImage: `url(${noiseUrl})` }}
        ></div>
    </div>
  );
};

export default VignetteEffect;
