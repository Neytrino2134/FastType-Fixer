
import React, { useEffect, useRef } from 'react';
import { VisualizerConfig } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface SineWaveProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  config: VisualizerConfig;
  volume: number;
}

const SineWave: React.FC<SineWaveProps> = ({ analyser, isPlaying, config, volume }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const { colors } = useTheme();

  // Physics state
  const timeRef = useRef(0);
  const smoothedDataRef = useRef({ bass: 0, mid: 0, treble: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    if (analyser && !dataArrayRef.current) {
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    }

    const render = () => {
      animationRef.current = requestAnimationFrame(render);

      // Resize
      if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }

      const w = canvas.width;
      const h = canvas.height;
      const centerY = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Update Audio Data
      let bass = 0, mid = 0, treble = 0;
      
      if (analyser && dataArrayRef.current && isPlaying) {
          // Cast to any to bypass strict type check for Uint8Array signature in Web Audio API types
          analyser.getByteFrequencyData(dataArrayRef.current as any);
          const len = dataArrayRef.current.length;
          
          // Frequency ranges
          const bassEnd = Math.floor(len * 0.05); // ~20-200Hz
          const midEnd = Math.floor(len * 0.3);   // ~200-2000Hz
          // Treble is rest

          let bSum = 0, mSum = 0, tSum = 0;
          for(let i=0; i<bassEnd; i++) bSum += dataArrayRef.current[i];
          for(let i=bassEnd; i<midEnd; i++) mSum += dataArrayRef.current[i];
          for(let i=midEnd; i<len; i++) tSum += dataArrayRef.current[i];

          bass = (bSum / bassEnd) / 255;
          mid = (mSum / (midEnd - bassEnd)) / 255;
          treble = (tSum / (len - midEnd)) / 255;
      }

      // Smooth volume transitions
      if (!config.preventVolumeScaling) {
          bass *= volume;
          mid *= volume;
          treble *= volume;
      }

      // Sensitivity Scaling
      const sens = config.sensitivity || 1.5;
      bass *= sens;
      mid *= sens;
      treble *= sens;

      // Apply smoothing to prevent jitter
      const smoothFactor = 0.2;
      smoothedDataRef.current.bass += (bass - smoothedDataRef.current.bass) * smoothFactor;
      smoothedDataRef.current.mid += (mid - smoothedDataRef.current.mid) * smoothFactor;
      smoothedDataRef.current.treble += (treble - smoothedDataRef.current.treble) * smoothFactor;

      const sBass = smoothedDataRef.current.bass;
      const sMid = smoothedDataRef.current.mid;
      const sTreble = smoothedDataRef.current.treble;

      // Advance Time (Speed controlled by config)
      // Reduced multiplier from 0.005 to 0.0005 for very slow movement
      const speed = (config.tipSpeed || 10) * 0.0005; 
      timeRef.current += speed;
      const t = timeRef.current;

      // Determine Colors
      let colorBass = '#4c1d95'; // Dark Violet
      let colorMid = '#0ea5e9'; // Sky Blue
      let colorTreble = '#f472b6'; // Pink

      if (config.style === 'theme-sync') {
          colorBass = `color-mix(in srgb, ${colors.primary}, black 60%)`;
          colorMid = colors.secondary;
          colorTreble = colors.accent;
      } else if (config.style === 'ocean') {
          colorBass = '#1e3a8a';
          colorMid = '#0ea5e9';
          colorTreble = '#a5f3fc';
      } else if (config.style === 'inferno') {
          colorBass = '#7f1d1d';
          colorMid = '#ea580c';
          colorTreble = '#facc15';
      } else if (config.style === 'matrix') {
          colorBass = '#064e3b';
          colorMid = '#10b981';
          colorTreble = '#a7f3d0';
      }

      // Helper to draw sine wave
      const drawWave = (color: string, amplitude: number, frequency: number, phase: number, lineWidth: number, opacity: number) => {
          ctx.beginPath();
          ctx.lineWidth = lineWidth;
          ctx.strokeStyle = color;
          ctx.globalAlpha = opacity * (config.strokeOpacity || 0.8);
          
          const points = config.barCount || 100; // Resolution
          const step = w / points;

          for (let x = 0; x <= w + step; x += step) {
              // x normalized 0-1
              const nx = x / w; 
              
              // Apply envelope to taper edges if desired (optional)
              
              // Wave formula: y = sin(x * freq + time) * amp
              const waveY = Math.sin(nx * frequency + phase) * amplitude;
              
              // Add slight noise/distortion based on amplitude for "vibration" effect
              const vibration = Math.sin(nx * 50 + t * 10) * (amplitude * 0.1);

              ctx.lineTo(x, centerY + waveY + vibration);
          }
          ctx.stroke();
      };

      // 1. Bass Wave (Back, Slow, Low Freq)
      // Amplitude: Base height + audio reaction
      const bassAmp = (h * 0.1) + (h * 0.2 * sBass); 
      drawWave(colorBass, bassAmp, 5, t * 0.5, 6, 0.6);

      // 2. Mid Wave (Middle, Medium speed)
      const midAmp = (h * 0.08) + (h * 0.15 * sMid);
      drawWave(colorMid, midAmp, 12, t * 1.2 + 2, 4, 0.8);

      // 3. Treble Wave (Front, Fast, High Freq)
      const trebAmp = (h * 0.05) + (h * 0.1 * sTreble);
      // More jagged frequency for high notes
      drawWave(colorTreble, trebAmp, 20, t * 2.0 + 4, 2, 1.0);

      // Reset Alpha
      ctx.globalAlpha = 1.0;
    };

    animationRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationRef.current);
  }, [analyser, isPlaying, config, volume, colors]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10 pointer-events-none" />;
};

export default SineWave;
