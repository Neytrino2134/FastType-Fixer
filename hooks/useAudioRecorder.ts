
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

export const useAudioRecorder = (silenceThresholdSetting: number = 25): AudioRecorderHook => {
  const [isRecording, setIsRecording] = useState(false);
  const [autoStopCountdown, setAutoStopCountdown] = useState<number | null>(null);
  
  // Audio Context & Analysis
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const visualizerDataRef = useRef<Uint8Array | null>(null);
  
  // Recording State
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Smart Slicing Logic
  const onChunkCallbackRef = useRef<((base64: string, mimeType: string) => Promise<void>) | null>(null);
  const onStatusCallbackRef = useRef<((status: VisualizerStatus) => void) | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const checkSilenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSlicingRef = useRef(false);

  // VAD (Voice Activity Detection) State for current chunk
  const maxRmsInCurrentSliceRef = useRef<number>(0);

  // Constants
  const SLICE_TIMEOUT = 1200; // Increased to 1.2s to prevent cutting mid-sentence
  const AUTO_STOP_TIMEOUT = 6000; // 6.0s of silence stops recording

  // Cleanup
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (checkSilenceIntervalRef.current) clearInterval(checkSilenceIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setAutoStopCountdown(null);
  };

  // Improved RMS Calculation for Time Domain Data
  const calculateTimeDomainRMS = (dataArray: Uint8Array) => {
    let sum = 0;
    // Time Domain: Values are 0-255 where 128 is silence (center)
    for (let i = 0; i < dataArray.length; i++) {
      const x = (dataArray[i] - 128) / 128.0; // Normalize to -1 to 1
      sum += x * x;
    }
    return Math.sqrt(sum / dataArray.length);
  };

  const processChunk = async (blob: Blob) => {
    if (blob.size === 0) return;

    if (onStatusCallbackRef.current) {
        onStatusCallbackRef.current('analyzing_listening');
    }

    // REMOVED: Strict VAD Check inside processChunk.
    // We trust that if a chunk is produced (via manual stop or auto-slice), 
    // it should be sent to Gemini. Gemini handles silence gracefully (returns empty string).
    // This prevents the "nothing happens" issue when the user speaks quietly or briefly.

    try {
      // Direct Base64 conversion without re-encoding to WAV.
      // Gemini supports webm/opus natively and it handles silence well.
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (result && onChunkCallbackRef.current) {
          const base64 = result.split(',')[1];
          // Get the actual MIME type from the blob/recorder
          const actualMimeType = blob.type || 'audio/webm';
          console.log(`Sending audio chunk: ${Math.round(blob.size / 1024)}KB, MIME: ${actualMimeType}`);
          onChunkCallbackRef.current(base64, actualMimeType);
        }
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.error("Chunk processing failed", e);
    }
  };

  const startMediaRecorder = (stream: MediaStream) => {
    let options: MediaRecorderOptions | undefined = undefined;
    
    // Prefer efficient codecs supported by Gemini
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
    } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' }; // Safari support
    }

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
      const mimeType = mediaRecorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      audioChunksRef.current = [];
      processChunk(audioBlob);
    };

    mediaRecorder.start();
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
      audioContextRef.current = audioCtx;
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512; // Increased for better time-domain resolution
      analyser.smoothingTimeConstant = 0.3; // Faster response for VAD
      
      analyserRef.current = analyser;
      
      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(analyser);

      // Data for Visualization (Frequency)
      const bufferLength = analyser.frequencyBinCount;
      const freqDataArray = new Uint8Array(bufferLength);
      visualizerDataRef.current = freqDataArray;

      // Data for VAD (Time Domain - Volume)
      const timeDataArray = new Uint8Array(bufferLength);

      startMediaRecorder(stream);
      setIsRecording(true);
      silenceStartRef.current = Date.now();

      checkSilenceIntervalRef.current = setInterval(() => {
        if (!analyserRef.current || !mediaRecorderRef.current) return;

        // 1. Get Frequency Data for UI Visualizer
        analyserRef.current.getByteFrequencyData(freqDataArray);

        // 2. Get Time Domain Data for Accurate Volume/VAD
        analyserRef.current.getByteTimeDomainData(timeDataArray);
        
        // Calculate true volume
        const rms = calculateTimeDomainRMS(timeDataArray);
        
        if (rms > maxRmsInCurrentSliceRef.current) {
            maxRmsInCurrentSliceRef.current = rms;
        }
        
        // Threshold Logic
        const thresholdRMS = Math.max(0.01, (silenceThresholdSetting / 100) * 0.15);

        if (rms > thresholdRMS) {
          // SPEECH DETECTED
          silenceStartRef.current = null;
          setAutoStopCountdown(null);
        } else {
          // SILENCE DETECTED
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
      }, 50); // Check every 50ms for more responsive VAD

      return true;
    } catch (error) {
      console.error("Error accessing microphone:", error);
      return false;
    }
  }, [silenceThresholdSetting]); 

  const stopRecording = useCallback(async (): Promise<void> => {
    console.log("Stopping recording...");
    if (checkSilenceIntervalRef.current) clearInterval(checkSilenceIntervalRef.current);
    setAutoStopCountdown(null);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    // Wait slightly to allow onstop to fire
    setTimeout(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setIsRecording(false);
    }, 200);
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    visualizerDataRef,
    autoStopCountdown
  };
};
