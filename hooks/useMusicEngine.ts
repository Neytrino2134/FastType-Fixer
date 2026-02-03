
import { useState, useEffect, useRef } from 'react';
import { EditorInstrument, InstrumentType } from '../types';

const INITIAL_INSTRUMENTS: EditorInstrument[] = [
  { id: '1', name: 'BD-808', type: 'kick', color: '#ff3333', volume: 0.8, steps: new Array(16).fill(false) },
  { id: '2', name: 'SD-ANALOG', type: 'snare', color: '#00f3ff', volume: 0.7, steps: new Array(16).fill(false) },
  { id: '3', name: 'CH-909', type: 'hihat', color: '#f9f871', volume: 0.6, steps: new Array(16).fill(false) },
  { id: '4', name: 'BASS-303', type: 'bass', color: '#bc13fe', volume: 0.6, steps: new Array(16).fill(false) },
];

export const useMusicEngine = () => {
  const [instruments, setInstruments] = useState<EditorInstrument[]>(INITIAL_INSTRUMENTS);
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0);
  const timerIDRef = useRef<number | null>(null);
  const stepRef = useRef(0); // Mutable ref for scheduler

  // Initialize Audio Context on user interaction (handled in play)
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AC();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  // --- SYNTHESIS ENGINE ---
  const playSound = (type: InstrumentType, volume: number, time: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Master Volume for channel
    gain.connect(ctx.destination);
    gain.gain.value = volume;

    const now = time;

    switch (type) {
      case 'kick':
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.5);
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;

      case 'snare':
        // Tone
        osc.frequency.setValueAtTime(250, now);
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        
        // Noise Burst (Simplified)
        const noiseBufferSize = ctx.sampleRate * 0.2; // 200ms
        const buffer = ctx.createBuffer(1, noiseBufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < noiseBufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 1000;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(volume * 0.5, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
        break;

      case 'hihat':
        // High Filtered Noise
        const hatBufferSize = ctx.sampleRate * 0.05; // 50ms
        const hatBuffer = ctx.createBuffer(1, hatBufferSize, ctx.sampleRate);
        const hatData = hatBuffer.getChannelData(0);
        for (let i = 0; i < hatBufferSize; i++) {
            hatData[i] = Math.random() * 2 - 1;
        }
        const hat = ctx.createBufferSource();
        hat.buffer = hatBuffer;
        
        const hatFilter = ctx.createBiquadFilter();
        hatFilter.type = 'highpass';
        hatFilter.frequency.value = 5000;
        
        gain.gain.setValueAtTime(volume * 0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        
        hat.connect(hatFilter);
        hatFilter.connect(gain); // Reuse gain node connected to dest
        hat.start(now);
        break;
        
      case 'bass':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now); // A2
        osc.frequency.linearRampToValueAtTime(55, now + 0.1);
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + 0.3);
        
        osc.connect(filter);
        filter.connect(gain);
        
        gain.gain.setValueAtTime(volume, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        
        osc.start(now);
        osc.stop(now + 0.3);
        break;
    }
  };

  // --- SCHEDULER ---
  const scheduleNote = (stepNumber: number, time: number) => {
    // Notify UI (this runs slightly ahead of audio, but close enough for visual feedback)
    // We use a small timeout to sync visual to audio time approximately
    setTimeout(() => {
        setCurrentStep(stepNumber);
    }, (time - (audioCtxRef.current?.currentTime || 0)) * 1000);

    instruments.forEach(inst => {
      if (inst.steps[stepNumber]) {
        playSound(inst.type, inst.volume, time);
      }
    });
  };

  const scheduler = () => {
    if (!audioCtxRef.current) return;
    
    // Lookahead: 100ms
    const lookahead = 25.0; 
    const scheduleAheadTime = 0.1; 

    // Determine Seconds Per Step (16th notes)
    // BPM = Beats Per Minute. 1 Beat = 4 x 16th notes.
    // 15 = 60 / 4
    const secondsPerStep = 60.0 / bpm / 4; 

    while (nextNoteTimeRef.current < audioCtxRef.current.currentTime + scheduleAheadTime) {
      scheduleNote(stepRef.current, nextNoteTimeRef.current);
      
      // Advance Time
      nextNoteTimeRef.current += secondsPerStep;
      
      // Advance Step
      stepRef.current = (stepRef.current + 1) % 16;
    }
    
    timerIDRef.current = window.setTimeout(scheduler, lookahead);
  };

  const togglePlay = () => {
    initAudio();
    if (isPlaying) {
      setIsPlaying(false);
      if (timerIDRef.current) window.clearTimeout(timerIDRef.current);
      setCurrentStep(0); // Reset visual
    } else {
      setIsPlaying(true);
      stepRef.current = 0;
      nextNoteTimeRef.current = audioCtxRef.current?.currentTime || 0;
      scheduler();
    }
  };

  const toggleStep = (instrumentId: string, stepIndex: number) => {
    setInstruments(prev => prev.map(inst => {
      if (inst.id === instrumentId) {
        const newSteps = [...inst.steps];
        newSteps[stepIndex] = !newSteps[stepIndex];
        return { ...inst, steps: newSteps };
      }
      return inst;
    }));
  };

  const setInstrumentVolume = (id: string, vol: number) => {
    setInstruments(prev => prev.map(inst => 
        inst.id === id ? { ...inst, volume: vol } : inst
    ));
  };

  const clearPattern = () => {
      setInstruments(prev => prev.map(inst => ({ ...inst, steps: new Array(16).fill(false) })));
  };

  // Cleanup
  useEffect(() => {
      return () => {
          if (timerIDRef.current) window.clearTimeout(timerIDRef.current);
      };
  }, []);

  return {
    instruments,
    bpm,
    setBpm,
    isPlaying,
    togglePlay,
    currentStep,
    toggleStep,
    setInstrumentVolume,
    clearPattern
  };
};
