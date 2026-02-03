
import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { VisualizerConfig, NEON_COLORS } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface VisualizerSpectrum3DProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  config: VisualizerConfig;
  volume: number;
}

const SpectrumScene: React.FC<{ analyser: AnalyserNode | null; isPlaying: boolean; config: VisualizerConfig; volume: number }> = ({ analyser, isPlaying, config, volume }) => {
  const { viewport } = useThree();
  const { colors } = useTheme();
  
  // Refs for Instanced Meshes (High Performance)
  const barsMeshRef = useRef<THREE.InstancedMesh>(null);
  const barsEdgesRef = useRef<THREE.InstancedMesh>(null); // For stroke
  const tipsMeshRef = useRef<THREE.InstancedMesh>(null);

  // Physics State Refs
  const prevBarsRef = useRef<Float32Array | null>(null);
  const tipBarsRef = useRef<Float32Array | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  // SMOOTHING REFS FOR CONFIG TRANSITIONS
  const smoothVolRef = useRef<number>(1);
  const smoothNormRef = useRef({ bass: 1, mid: 1, treb: 1 });

  // Helper Object for matrix calculations
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorObj = useMemo(() => new THREE.Color(), []);

  // Initialize Data Arrays
  useEffect(() => {
    if (analyser) {
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    }
    // Reset physics when config changes drastically
    prevBarsRef.current = new Float32Array(config.barCount).fill(0);
    tipBarsRef.current = new Float32Array(config.barCount).fill(0);
  }, [analyser, config.barCount]);

  // Frame Loop
  useFrame((_state: any, delta: number) => {
    if (!barsMeshRef.current) return;

    const count = config.barCount;
    const prevBars = prevBarsRef.current;
    const tipBars = tipBarsRef.current;
    
    // 1. Audio Data Processing
    if (analyser && dataArrayRef.current) {
        if (isPlaying) {
            // TypeScript workaround for Uint8Array mismatch in Web Audio types
            analyser.getByteFrequencyData(dataArrayRef.current as any);
        } else {
            dataArrayRef.current.fill(0);
        }
    }

    const dataArray = dataArrayRef.current;
    const bufferLength = dataArray ? dataArray.length : 0;
    const sampleRate = analyser ? analyser.context.sampleRate : 44100;
    const binSize = sampleRate / 2 / (bufferLength || 1);

    // Physics constants
    const fpsRatio = delta * 60; // Normalize to ~60fps
    const gravityInput = config.barGravity ?? 5;
    const baseDecay = Math.max(0.1, 0.98 - (gravityInput * 0.05));
    const decay = Math.pow(baseDecay, fpsRatio);

    // Layout calculations
    const totalWidth = viewport.width * 0.8;
    const gap = (config.barGap || 2) * 0.02;
    const barWidth = (totalWidth / (config.mirror ? count * 2 : count)) - gap;
    
    const minHz = 20 + (config.minFrequency * 40); 
    const maxHz = minHz + 500 + (config.maxFrequency * 180);
    const logMin = Math.log10(minHz);
    const logMax = Math.log10(maxHz);

    const bassEnd = Math.floor(250 / binSize);   
    const midEnd = Math.floor(2000 / binSize);   

    let maxBass = 150, maxMid = 100, maxTreb = 80;
    if (isPlaying && dataArray) {
        for(let i=0; i<bufferLength; i++) {
            if(i<bassEnd) maxBass = Math.max(maxBass, dataArray[i]);
            else if(i<midEnd) maxMid = Math.max(maxMid, dataArray[i]);
            else maxTreb = Math.max(maxTreb, dataArray[i]);
        }
    }

    // --- SMOOTH CONFIG TRANSITIONS ---
    // 1. VOLUME
    const targetVolFactor = config.preventVolumeScaling ? 1.0 : volume;
    smoothVolRef.current += (targetVolFactor - smoothVolRef.current) * 0.1;

    // 2. NORMALIZE
    let targetBassScale = 1;
    let targetMidScale = 1;
    let targetTrebScale = 1;

    if (config.normalize) {
        targetBassScale = 255 / Math.max(150, maxBass);
        targetMidScale = 255 / Math.max(100, maxMid);
        targetTrebScale = 255 / Math.max(80, maxTreb);
    }

    const normLerp = 0.05;
    smoothNormRef.current.bass += (targetBassScale - smoothNormRef.current.bass) * normLerp;
    smoothNormRef.current.mid += (targetMidScale - smoothNormRef.current.mid) * normLerp;
    smoothNormRef.current.treb += (targetTrebScale - smoothNormRef.current.treb) * normLerp;


    // --- RENDER LOOP ---
    for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const adjustedT = Math.pow(t, 0.6);
        const freq = Math.pow(10, logMin + (adjustedT * (logMax - logMin)));
        const index = Math.floor(freq / binSize);
        
        let rawValue = 0;
        if (dataArray && index < bufferLength) rawValue = dataArray[index] || 0;

        if (dataArray && index > bassEnd) {
             const nextT = Math.pow((i + 1) / (count - 1), 0.6);
             const nextFreq = Math.pow(10, logMin + (nextT * (logMax - logMin)));
             const nextIndex = Math.floor(nextFreq / binSize);
             const range = nextIndex - index;
             if (range > 1) {
                 for(let k=0; k<range && (index+k)<bufferLength; k++) {
                     rawValue = Math.max(rawValue, dataArray[index+k]);
                 }
             }
        }

        // Apply Volume (Smoothed)
        rawValue *= smoothVolRef.current;

        // Apply Normalization (Smoothed)
        if (index < bassEnd) rawValue *= smoothNormRef.current.bass;
        else if (index < midEnd) rawValue *= smoothNormRef.current.mid;
        else rawValue *= smoothNormRef.current.treb;

        let ratio = rawValue / 255;
        ratio = Math.pow(ratio, 2.5);
        ratio *= (config.sensitivity * 1.2);
        ratio *= (1 + (i / count) * 0.3);

        const maxHeight = viewport.height * 0.5;
        let targetHeight = maxHeight * Math.tanh(ratio);
        
        if (targetHeight < 0.05 && config.strokeEnabled && rawValue > 5) targetHeight = 0.05;
        if (rawValue < 5) targetHeight = 0.001;

        if (prevBars) {
            let finalH = prevBars[i] * decay;
            if (targetHeight > finalH) finalH = targetHeight;
            prevBars[i] = finalH;
            targetHeight = finalH;
        }

        if (tipBars) {
            let tipH = tipBars[i];
            if (targetHeight > tipH) tipH = targetHeight;
            else {
                const g = (config.tipSpeed || 15) * 0.001 * fpsRatio;
                tipH -= g;
            }
            if (tipH < 0) tipH = 0;
            tipBars[i] = tipH;
        }

        let hexColor = '#ffffff';
        switch (config.style) {
            case 'blue': hexColor = '#00f3ff'; break;
            case 'pink': hexColor = '#ff00ff'; break;
            case 'warm': hexColor = '#fbbf24'; break;
            case 'gray': hexColor = '#d4d4d4'; break;
            case 'ocean': hexColor = '#4B8CA8'; break;
            case 'theme-blue': hexColor = '#3b82f6'; break;
            case 'theme-sync': hexColor = colors.primary; break;
            case 'neon-gradient':
               // Height based gradient pink->blue
               const r = Math.min(1, targetHeight / maxHeight);
               colorObj.set('#ff00ff').lerp(new THREE.Color('#00f3ff'), r);
               hexColor = ''; 
               break;
            case 'matrix':
               const intensity = Math.min(1, (targetHeight / maxHeight) + 0.2);
               colorObj.setRGB(0, intensity, 0);
               hexColor = '';
               break;
            case 'inferno':
               const hue = (targetHeight / maxHeight) * 60;
               colorObj.setHSL(hue / 360, 1.0, 0.5);
               hexColor = '';
               break;
            case 'retro':
            default:
               hexColor = NEON_COLORS[i % NEON_COLORS.length];
               break;
        }
        
        if (hexColor) colorObj.set(hexColor);

        const setMatrix = (idx: number, x: number, h: number, isTip: boolean) => {
            dummy.position.set(0, 0, 0);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(1, 1, 1);

            const tipH = (config.tipHeight || 2) * 0.05;

            if (isTip) {
                if (!config.showTips || h < 0.1) {
                    dummy.scale.set(0, 0, 0); 
                } else {
                    let yPos = 0;
                    if (config.position === 'bottom') yPos = -viewport.height/3 + h + tipH/2;
                    else if (config.position === 'top') yPos = viewport.height/3 - h - tipH/2;
                    else yPos = (h/2) + tipH;

                    dummy.position.set(x, yPos, 0);
                    dummy.scale.set(barWidth, tipH, barWidth);
                }
            } else {
                if (h < 0.01) {
                    dummy.scale.set(0, 0, 0);
                } else {
                    let yPos = 0;
                    if (config.position === 'bottom') yPos = -viewport.height/3 + h/2;
                    else if (config.position === 'top') yPos = viewport.height/3 - h/2;
                    else yPos = 0;

                    dummy.position.set(x, yPos, 0);
                    dummy.scale.set(barWidth, h, barWidth);
                }
            }
            
            dummy.updateMatrix();

            if (isTip) {
                if (tipsMeshRef.current) {
                    tipsMeshRef.current.setMatrixAt(idx, dummy.matrix);
                    if (config.tipColor && config.tipColor !== 'white') {
                         const tipCol = new THREE.Color();
                         if (config.tipColor === 'blue') tipCol.set('#00f3ff');
                         else if (config.tipColor === 'pink') tipCol.set('#ff00ff');
                         else if (config.tipColor === 'green') tipCol.set('#00ff00');
                         else if (config.tipColor === 'red') tipCol.set('#ff3333');
                         else if (config.tipColor === 'yellow') tipCol.set('#f9f871');
                         else if (config.tipColor === 'purple') tipCol.set('#bc13fe');
                         else tipCol.set('#ffffff');
                         tipsMeshRef.current.setColorAt(idx, tipCol);
                    } else {
                         tipsMeshRef.current.setColorAt(idx, new THREE.Color(0xffffff));
                    }
                }
            } else {
                if (barsMeshRef.current) {
                    barsMeshRef.current.setMatrixAt(idx, dummy.matrix);
                    barsMeshRef.current.setColorAt(idx, colorObj);
                }
                if (barsEdgesRef.current) {
                    barsEdgesRef.current.setMatrixAt(idx, dummy.matrix);
                    barsEdgesRef.current.setColorAt(idx, colorObj);
                }
            }
        };

        if (config.mirror) {
            const startX = 0;
            const step = (totalWidth / 2) / count;
            const xRight = startX + (i * step) + (gap/2);
            const xLeft = startX - (i * step) - (gap/2);

            setMatrix(i, xRight, targetHeight, false);
            setMatrix(i + count, xLeft, targetHeight, false);
            
            if (tipBars) {
                setMatrix(i, xRight, tipBars[i], true);
                setMatrix(i + count, xLeft, tipBars[i], true);
            }

        } else {
            const startX = -totalWidth / 2;
            const x = startX + (i * (barWidth + gap)) + (barWidth/2);
            
            setMatrix(i, x, targetHeight, false);
            if (tipBars) setMatrix(i, x, tipBars[i], true);
        }
    }

    if (barsMeshRef.current) barsMeshRef.current.instanceMatrix.needsUpdate = true;
    if (barsMeshRef.current) barsMeshRef.current.instanceColor!.needsUpdate = true;
    
    if (tipsMeshRef.current) tipsMeshRef.current.instanceMatrix.needsUpdate = true;
    if (tipsMeshRef.current) tipsMeshRef.current.instanceColor!.needsUpdate = true;

    if (config.strokeEnabled && barsEdgesRef.current) {
        barsEdgesRef.current.instanceMatrix.needsUpdate = true;
        barsEdgesRef.current.instanceColor!.needsUpdate = true;
    }
  });

  const totalInstances = config.mirror ? config.barCount * 2 : config.barCount;

  useFrame((state) => {
      state.camera.position.x = Math.sin(state.clock.elapsedTime * 0.2) * 1;
      state.camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} />
      <pointLight position={[0, 0, 10]} intensity={0.5} />

      <instancedMesh ref={barsMeshRef} args={[undefined, undefined, totalInstances]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial 
            transparent 
            opacity={config.fillOpacity} 
            metalness={0.5} 
            roughness={0.2} 
        />
      </instancedMesh>

      {config.strokeEnabled && (
          <instancedMesh ref={barsEdgesRef} args={[undefined, undefined, totalInstances]}>
             <boxGeometry args={[1, 1, 1]} />
             <meshBasicMaterial 
                wireframe 
                transparent 
                opacity={config.strokeOpacity} 
                toneMapped={false}
             />
          </instancedMesh>
      )}

      {config.showTips && (
          <instancedMesh ref={tipsMeshRef} args={[undefined, undefined, totalInstances]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial 
                transparent 
                opacity={Math.min(1, config.fillOpacity + 0.3)} 
                emissive={config.tipGlow ? '#ffffff' : '#000000'}
                emissiveIntensity={config.tipGlow ? 0.5 : 0}
            />
          </instancedMesh>
      )}
    </>
  );
};

const VisualizerSpectrum3D: React.FC<VisualizerSpectrum3DProps> = (props) => {
  return (
    <div className="absolute inset-0 w-full h-full z-10 pointer-events-none">
        <Canvas 
            camera={{ position: [0, 2, 8], fov: 50 }} 
            gl={{ alpha: true, antialias: true }}
            dpr={[1, 2]} 
        >
            <SpectrumScene {...props} />
        </Canvas>
    </div>
  );
};

export default VisualizerSpectrum3D;
