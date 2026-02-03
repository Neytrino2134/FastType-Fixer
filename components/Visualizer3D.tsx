
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Icosahedron, Torus, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { VisualizerConfig, NEON_COLORS } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface Visualizer3DProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  config: VisualizerConfig;
  volume: number;
}

// Scene Component that handles the animation loop
const Scene: React.FC<{ analyser: AnalyserNode | null; isPlaying: boolean; config: VisualizerConfig; volume: number }> = ({ analyser, isPlaying, config, volume }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const torusRef = useRef<THREE.Group>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const { colors } = useTheme();

  // Create data array once
  useMemo(() => {
    if (analyser) {
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    }
  }, [analyser]);

  // Determine Color based on the passed config (which is now independent from main visualizer)
  const getColor = () => {
      switch(config.style) {
          case 'blue': return '#00f3ff';
          case 'pink': return '#ff00ff';
          case 'warm': return '#fbbf24';
          case 'ocean': return '#4B8CA8';
          case 'theme-blue': return '#3b82f6';
          case 'theme-sync': return colors.primary;
          case 'neon-gradient': return '#ff00ff'; // Fallback to pink as gradient isn't easily mapped to single color 3D object
          case 'gray': return '#d4d4d4';
          case 'matrix': return '#00ff00';
          case 'inferno': return '#ff3333';
          default: return NEON_COLORS[0];
      }
  };
  
  const baseColor = getColor();

  useFrame((state: any, delta: number) => {
    if (!meshRef.current || !torusRef.current) return;

    let bass = 0;
    let mid = 0;

    if (analyser && dataArrayRef.current && isPlaying) {
        // Fix for Type mismatch
        analyser.getByteFrequencyData(dataArrayRef.current as any);
        const len = dataArrayRef.current.length;
        
        // Simple Frequency Extraction
        // Bass ~ 0-10% of buffer, Mid ~ 10-50%
        let bassSum = 0;
        let midSum = 0;
        const bassCount = Math.floor(len * 0.05);
        const midCount = Math.floor(len * 0.2);

        for(let i=0; i<bassCount; i++) bassSum += dataArrayRef.current[i];
        for(let i=bassCount; i<bassCount+midCount; i++) midSum += dataArrayRef.current[i];

        bass = (bassSum / bassCount) / 255;
        mid = (midSum / midCount) / 255;
    }

    // Apply Volume Scaling if not ignored
    if (!config.preventVolumeScaling) {
        bass *= volume;
        mid *= volume;
    }

    // Sensitivity
    bass *= config.sensitivity;
    mid *= config.sensitivity;

    // --- ANIMATE CORE (ICOSAHEDRON) ---
    const scale = 1 + (bass * 1.5);
    meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.2);
    
    meshRef.current.rotation.x += delta * 0.5 + (bass * 0.5);
    meshRef.current.rotation.y += delta * 0.8;

    // --- ANIMATE RINGS (TORUS) ---
    torusRef.current.rotation.z -= delta * 0.2;
    torusRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.5;
    const ringScale = 1 + (mid * 0.8);
    torusRef.current.scale.lerp(new THREE.Vector3(ringScale, ringScale, ringScale), 0.1);
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color={baseColor} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ffffff" />

      {/* Core Reactor */}
      <Icosahedron ref={meshRef} args={[1.5, 0]} position={[0, 0, 0]}>
        <meshStandardMaterial 
            color={baseColor} 
            wireframe={true} 
            emissive={baseColor}
            emissiveIntensity={2}
            transparent
            opacity={config.fillOpacity || 0.8}
        />
      </Icosahedron>

      {/* Outer Rings */}
      <group ref={torusRef}>
          <Torus args={[3, 0.05, 16, 100]} rotation={[Math.PI/2, 0, 0]}>
             <meshBasicMaterial color={baseColor} transparent opacity={0.3} />
          </Torus>
          <Torus args={[3.5, 0.02, 16, 100]} rotation={[Math.PI/3, 0, 0]}>
             <meshBasicMaterial color={colors.secondary} transparent opacity={0.2} />
          </Torus>
      </group>

      {/* Particles / Stars */}
      <Stars radius={50} depth={20} count={2000} factor={4} saturation={0} fade speed={1} />
    </>
  );
};

const Visualizer3D: React.FC<Visualizer3DProps> = (props) => {
  return (
    <div className="absolute inset-0 w-full h-full z-10 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 8], fov: 45 }} gl={{ alpha: true, antialias: true }}>
            <Scene {...props} />
        </Canvas>
    </div>
  );
};

export default Visualizer3D;