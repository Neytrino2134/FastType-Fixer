
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VisualizerStatus } from '../types';

interface AudioRecorderHook {
  isRecording: boolean;
  startRecording: (
      onChunk: (base64: string, mimeType: string) => Promise<void>,
      onStatusUpdate?: (status: VisualizerStatus) => void
  ) => Promise<boolean>;
  stopRecording: () => Promise<void>;
  visualizerDataRef: React.MutableRefObject<Uint8Array | null>;
  autoStopCountdown: number | null; // 5, 4, 3, 2, 1 or null
}

// Helper to play sounds safely
const playMicSound = (type: 'on' | 'off') => {
    const filename = type === 'on' ? 'mic_on' : 'mic_off';
    const basePath = `./sounds/misc/${filename}`;
    
    const audio = new Audio(`${basePath}.mp3`);
    audio.volume = 0.4;
    
    // Try playing MP3, fallback to WAV, silence on error
    audio.play().catch(() => {
        const audioWav = new Audio(`${basePath}.wav`);
        audioWav.volume = 0.4;
        audioWav.play().catch(() => {
            // Files likely missing, ignore
        });
    });
};

export const useAudioRecorder = (silenceThresholdSetting: number = 25): AudioRecorderHook => {
  const [isRecording, setIsRecording] = useState(false);
  const [autoStopCountdown, setAutoStopCountdown] = useState<number | null>(null);
  
  // "Source of Truth" ref
  const isRecordingRef = useRef(false);
  
  // Audio Context & Analysis
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const visualizerDataRef = useRef<Uint8Array | null>(null);
  
  // Recording State
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Callbacks
  const onChunkCallbackRef = useRef<((base64: string, mimeType: string) => Promise<void>) | null>(null);
  const onStatusCallbackRef = useRef<((status: VisualizerStatus) => void) | null>(null);
  
  // Logic
  const silenceStartRef = useRef<number | null>(null);
  const checkSilenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSlicingRef = useRef(false);

  // VAD State
  const maxRmsInCurrentSliceRef = useRef<number>(0);

  // Constants
  const SLICE_TIMEOUT = 1200; 
  const AUTO_STOP_TIMEOUT = 6000; 

  // Cleanup Function
  const cleanup = useCallback(() => {
    // 1. Mark as stopped to prevent NEW intervals
    isRecordingRef.current = false;
    setIsRecording(false);
    setAutoStopCountdown(null);

    // 2. Kill Timers
    if (checkSilenceIntervalRef.current) {
        clearInterval(checkSilenceIntervalRef.current);
        checkSilenceIntervalRef.current = null;
    }

    // 3. Stop Recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
          mediaRecorderRef.current.stop();
      } catch (e) {
          console.warn("Error stopping recorder:", e);
      }
    }
    mediaRecorderRef.current = null;

    // 4. Kill Stream Tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
          try {
              track.stop();
          } catch(e) {}
      });
      streamRef.current = null;
    }

    // 5. Close Context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
          audioContextRef.current.close();
      } catch(e) {}
      audioContextRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const calculateTimeDomainRMS = (dataArray: Uint8Array) => {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const x = (dataArray[i] - 128) / 128.0; 
      sum += x * x;
    }
    return Math.sqrt(sum / dataArray.length);
  };

  const processChunk = async (blob: Blob) => {
    if (!blob || blob.size === 0) return;

    if (onStatusCallbackRef.current) {
        onStatusCallbackRef.current('analyzing_listening');
    }

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (result && onChunkCallbackRef.current) {
          const base64 = result.split(',')[1];
          const actualMimeType = blob.type || 'audio/webm';
          
          onChunkCallbackRef.current(base64, actualMimeType)
            .catch(err => console.error("Chunk upload error:", err));
        }
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.error("Chunk processing failed", e);
    }
  };

  const startMediaRecorder = (stream: MediaStream) => {
    let options: MediaRecorderOptions | undefined = undefined;
    
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
    } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
    }

    try {
        const mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        maxRmsInCurrentSliceRef.current = 0;
        
        if (onStatusCallbackRef.current) onStatusCallbackRef.current('listening');

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          // Process if data exists.
          if (audioChunksRef.current.length > 0) {
              const mimeType = mediaRecorder.mimeType || 'audio/webm';
              const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
              audioChunksRef.current = []; 
              processChunk(audioBlob);
          }
        };

        mediaRecorder.start();
    } catch (e) {
        console.error("Failed to create MediaRecorder", e);
        cleanup();
    }
  };

  const startRecording = useCallback(async (
      onChunk: (base64: string, mimeType: string) => Promise<void>,
      onStatusUpdate?: (status: VisualizerStatus) => void
  ): Promise<boolean> => {
    try {
      cleanup();
      
      onChunkCallbackRef.current = onChunk;
      onStatusCallbackRef.current = onStatusUpdate || null;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // CRITICAL FIX FOR WINDOWS: Resume context explicitly
      if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
      }
      
      audioContextRef.current = audioCtx;
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      analyserRef.current = analyser;
      
      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const freqDataArray = new Uint8Array(bufferLength);
      visualizerDataRef.current = freqDataArray;
      const timeDataArray = new Uint8Array(bufferLength);

      startMediaRecorder(stream);
      
      // Play Start Sound
      playMicSound('on');

      isRecordingRef.current = true;
      setIsRecording(true);
      silenceStartRef.current = Date.now();

      checkSilenceIntervalRef.current = setInterval(() => {
        if (!isRecordingRef.current) {
            cleanup();
            return;
        }
        
        if (!analyserRef.current || !mediaRecorderRef.current) return;

        analyserRef.current.getByteFrequencyData(freqDataArray);
        analyserRef.current.getByteTimeDomainData(timeDataArray);
        
        const rms = calculateTimeDomainRMS(timeDataArray);
        if (rms > maxRmsInCurrentSliceRef.current) {
            maxRmsInCurrentSliceRef.current = rms;
        }
        
        const thresholdRMS = Math.max(0.01, (silenceThresholdSetting / 100) * 0.2);

        if (rms > thresholdRMS) {
          silenceStartRef.current = null;
          setAutoStopCountdown(null);
        } else {
          if (silenceStartRef.current === null) {
            silenceStartRef.current = Date.now();
          } else {
            const now = Date.now();
            const silenceDuration = now - silenceStartRef.current;
            const remaining = Math.max(0, AUTO_STOP_TIMEOUT - silenceDuration);

            const secondsLeft = Math.ceil(remaining / 1000);
            if (secondsLeft <= 5 && secondsLeft > 0) {
                setAutoStopCountdown(prev => prev !== secondsLeft ? secondsLeft : prev);
            } else if (secondsLeft <= 0) {
                setAutoStopCountdown(0);
            }

            if (silenceDuration > AUTO_STOP_TIMEOUT) {
              stopRecording();
              return;
            }

            if (silenceDuration > SLICE_TIMEOUT && !isSlicingRef.current) {
                isSlicingRef.current = true;
                
                if (onStatusCallbackRef.current) {
                    onStatusCallbackRef.current('editing');
                }

                if (mediaRecorderRef.current.state === 'recording') {
                   mediaRecorderRef.current.stop();
                }

                if (streamRef.current && streamRef.current.active) {
                    startMediaRecorder(streamRef.current);
                }
                
                setTimeout(() => { isSlicingRef.current = false; }, 200);
            }
          }
        }
      }, 50);

      return true;
    } catch (error) {
      console.error("Error accessing microphone:", error);
      cleanup();
      return false;
    }
  }, [silenceThresholdSetting, cleanup]); 

  const stopRecording = useCallback(async (): Promise<void> => {
    // Only play stop sound if we were actually recording
    if (isRecordingRef.current) {
        playMicSound('off');
    }
    cleanup();
  }, [cleanup]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    visualizerDataRef,
    autoStopCountdown
  };
};
