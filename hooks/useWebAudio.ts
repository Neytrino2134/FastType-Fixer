
import { useRef, useState, useEffect } from 'react';
import { EQ_FREQUENCIES } from '../config/eqPresets';

export const useWebAudio = (volume: number) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  
  // Equalizer Nodes
  const eqInputNodeRef = useRef<GainNode | null>(null);
  const eqFiltersRef = useRef<BiquadFilterNode[]>([]);

  // Independent Source Nodes
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const sysSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Initialize Audio Context
  useEffect(() => {
    const initCtx = () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContext();
            audioContextRef.current = ctx;
            
            const ana = ctx.createAnalyser();
            ana.fftSize = 2048; // Higher res for visualizer
            analyserRef.current = ana;
            setAnalyser(ana);
            
            const gain = ctx.createGain();
            gain.gain.value = volume; 
            gain.connect(ctx.destination);
            gainNodeRef.current = gain;
            
            // --- EQUALIZER CHAIN SETUP ---
            const eqInput = ctx.createGain();
            eqInputNodeRef.current = eqInput;

            // Create 10 Bands
            const filters: BiquadFilterNode[] = [];
            
            EQ_FREQUENCIES.forEach((freq, i) => {
                const filter = ctx.createBiquadFilter();
                filter.frequency.value = freq;
                
                if (i === 0) {
                    filter.type = 'lowshelf';
                } else if (i === EQ_FREQUENCIES.length - 1) {
                    filter.type = 'highshelf';
                } else {
                    filter.type = 'peaking';
                    filter.Q.value = 1; // Bandwidth
                }
                filter.gain.value = 0; // Flat start
                filters.push(filter);
            });
            eqFiltersRef.current = filters;

            // Connect Chain: Input -> F1 -> F2... -> F10 -> Output
            let previousNode: AudioNode = eqInput;
            filters.forEach(f => {
                previousNode.connect(f);
                previousNode = f;
            });
            
            // Connect Last Filter to Master Gain (Volume) -> Speaker
            previousNode.connect(gain);

            // Connect EQ Chain Output to Analyser (Post-EQ Visuals? No, usually Pre-EQ is better for raw viz)
            // Let's connect eqInput directly to Analyser for Raw Visualization parallel to EQ chain
            eqInput.connect(ana);

        } catch (e) {
            console.error("AudioContext init failed", e);
        }
    };
    
    initCtx();
    
    return () => {
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }
    };
  }, []); // Run once on mount

  // Sync Volume (Only affects Music Playback, not inputs)
  useEffect(() => {
      if (gainNodeRef.current && audioContextRef.current) {
          try {
              gainNodeRef.current.gain.cancelScheduledValues(audioContextRef.current.currentTime);
              gainNodeRef.current.gain.value = volume;
          } catch (e) {}
      }
  }, [volume]);

  // --- MICROPHONE INPUT (Visualizer Only) ---
  const connectMic = (stream: MediaStream) => {
      if (!audioContextRef.current || !analyserRef.current) return;
      
      // Cleanup old
      if (micSourceRef.current) micSourceRef.current.disconnect();

      const src = audioContextRef.current.createMediaStreamSource(stream);
      // Connect ONLY to Analyser. Do NOT connect to destination/speakers.
      src.connect(analyserRef.current);
      micSourceRef.current = src;
  };

  const disconnectMic = () => {
      if (micSourceRef.current) {
          micSourceRef.current.disconnect();
          micSourceRef.current = null;
      }
  };

  // --- SYSTEM AUDIO INPUT (Visualizer Only) ---
  const connectSys = (stream: MediaStream) => {
      if (!audioContextRef.current || !analyserRef.current) return;

      // Cleanup old
      if (sysSourceRef.current) sysSourceRef.current.disconnect();

      const src = audioContextRef.current.createMediaStreamSource(stream);
      // Connect ONLY to Analyser. Do NOT connect to destination/speakers.
      src.connect(analyserRef.current);
      sysSourceRef.current = src;
  };

  const disconnectSys = () => {
      if (sysSourceRef.current) {
          sysSourceRef.current.disconnect();
          sysSourceRef.current = null;
      }
  };

  const getAudioStream = () => {
      if (!gainNodeRef.current || !audioContextRef.current) return null;
      const dest = audioContextRef.current.createMediaStreamDestination();
      gainNodeRef.current.connect(dest);
      return dest.stream;
  };

  const resumeContext = async () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
      }
  };

  return {
      audioContextRef,
      gainNodeRef,
      eqInputNodeRef, // Expose EQ Entry Point
      eqFiltersRef,   // Expose Filters for Control
      analyser,
      connectMic,
      disconnectMic,
      connectSys,
      disconnectSys,
      getAudioStream,
      resumeContext
  };
};
