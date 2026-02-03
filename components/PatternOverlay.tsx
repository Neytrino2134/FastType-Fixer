
import React from 'react';
import { PatternConfig } from '../types';

interface PatternOverlayProps {
  pattern: string;
  config?: PatternConfig;
}

const PatternOverlay: React.FC<PatternOverlayProps> = ({ pattern, config }) => {
  if (pattern === 'none') return null;

  const scale = config?.scale ?? 1.0;
  const intensity = config?.intensity ?? 0.25;

  // Use 'any' to bypass strict CSSProperties checking for background shorthand properties
  // which might be missing in some TypeScript environment definitions
  let style: any = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 1, // Above background color/media, below UI
    opacity: intensity, 
  };

  switch (pattern) {
    case 'grid':
      style.backgroundImage = `
        linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
      `;
      style.backgroundSize = `${40 * scale}px ${40 * scale}px`;
      break;
    case 'dots':
      style.backgroundImage = 'radial-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 1px)';
      style.backgroundSize = `${20 * scale}px ${20 * scale}px`;
      break;
    case 'scan-v':
      style.backgroundImage = 'linear-gradient(90deg, rgba(0, 0, 0, 0.3) 50%, transparent 50%)';
      style.backgroundSize = `${4 * scale}px 100%`;
      break;
    case 'scan-h':
      style.backgroundImage = 'linear-gradient(rgba(0, 0, 0, 0.3) 50%, transparent 50%)';
      style.backgroundSize = `100% ${4 * scale}px`;
      break;
    case 'diag':
      style.backgroundImage = `repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.05) 0px, rgba(255, 255, 255, 0.05) ${2 * scale}px, transparent ${2 * scale}px, transparent ${10 * scale}px)`;
      break;
    case 'checker':
      style.backgroundImage = `
        linear-gradient(45deg, rgba(0, 0, 0, 0.2) 25%, transparent 25%), 
        linear-gradient(-45deg, rgba(0, 0, 0, 0.2) 25%, transparent 25%), 
        linear-gradient(45deg, transparent 75%, rgba(0, 0, 0, 0.2) 75%), 
        linear-gradient(-45deg, transparent 75%, rgba(0, 0, 0, 0.2) 75%)
      `;
      const size = 40 * scale;
      style.backgroundSize = `${size}px ${size}px`;
      style.backgroundPosition = `0 0, 0 ${size/2}px, ${size/2}px -${size/2}px, -${size/2}px 0px`;
      break;
    case 'circuit':
        style.backgroundImage = `
            radial-gradient(circle at ${10 * scale}px ${10 * scale}px, rgba(0, 243, 255, 0.1) 2px, transparent 2.5px),
            linear-gradient(0deg, transparent 49%, rgba(0, 243, 255, 0.05) 49%, rgba(0, 243, 255, 0.05) 51%, transparent 51%),
            linear-gradient(90deg, transparent 49%, rgba(0, 243, 255, 0.05) 49%, rgba(0, 243, 255, 0.05) 51%, transparent 51%)
        `;
        style.backgroundSize = `${40 * scale}px ${40 * scale}px`;
        break;
    case 'matrix':
        style.backgroundImage = 'linear-gradient(0deg, rgba(0, 255, 0, 0.1) 25%, transparent 25%, transparent 50%, rgba(0, 255, 0, 0.1) 50%, rgba(0, 255, 0, 0.1) 75%, transparent 75%, transparent)';
        style.backgroundSize = `${4 * scale}px ${10 * scale}px`;
        break;
    default:
      return null;
  }

  return <div style={style} />;
};

export default PatternOverlay;
