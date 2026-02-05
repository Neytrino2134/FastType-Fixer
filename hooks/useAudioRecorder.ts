
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

// Helper to write WAV header
const writeWavHeader = (sampleRate: number, numChannels: number, dataLength: number) => {
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * numChannels * 2, true); // ByteRate
    view.setUint16(32, numChannels * 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample

    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    return buffer;
};

const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
};

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
  const SLICE_TIMEOUT = 1000; // 1.0s of silence triggers a slice/send
  const AUTO_STOP_TIMEOUT = 5000; // 5.0s of silence stops recording

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

  // Helper: Decode, Trim, and Re-encode to WAV
  const trimAndEncodeWav = async (originalBlob: Blob): Promise<Blob | null> => {
    try {
        const arrayBuffer = await originalBlob.arrayBuffer();
        const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
        
        const channelData = audioBuffer.getChannelData(0); // Mono check
        const sampleRate = audioBuffer.sampleRate;
        
        // Threshold for trimming (normalized 0.0-1.0)
        // Scaled to match the VAD logic: 0-100 setting maps to roughly 0.01 - 0.2 amplitude
        const trimThreshold = Math.max(0.01, (silenceThresholdSetting / 100) * 0.2);
        
        let start = 0;
        let end = channelData.length;

        // Find Start
        for (let i = 0; i < channelData.length; i++) {
            if (Math.abs(channelData[i]) > trimThreshold) {
                start = i;
                break;
            }
        }

        // Find End
        for (let i = channelData.length - 1; i >= 0; i--) {
            if (Math.abs(channelData[i]) > trimThreshold) {
                end = i;
                break;
            }
        }

        // Add padding (0.2s)
        const padding = Math.floor(0.2 * sampleRate);
        start = Math.max(0, start - padding);
        end = Math.min(channelData.length, end + padding);

        // If the entire clip is silence
        if (end <= start) {
            tempCtx.close();
            return null;
        }

        // Extract Trimmed Data
        const trimmedLength = end - start;
        const trimmedData = channelData.slice(start, end);

        // Convert Float32 to Int16 for WAV
        const wavBuffer = new ArrayBuffer(trimmedLength * 2);
        const view = new DataView(wavBuffer);
        for (let i = 0; i < trimmedLength; i++) {
            let s = Math.max(-1, Math.min(1, trimmedData[i]));
            // scale to 16-bit signed integer
            view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }

        // Create WAV Blob
        const header = writeWavHeader(sampleRate, 1, trimmedLength * 2);
        const wavBlob = new Blob([header, wavBuffer], { type: 'audio/wav' });
        
        tempCtx.close();
        return wavBlob;

    } catch (e) {
        console.error("Audio trimming failed", e);
        return originalBlob;
    }
  };

  const processChunk = async (blob: Blob) => {
    if (blob.size === 0) return;

    if (onStatusCallbackRef.current) {
        onStatusCallbackRef.current('analyzing_listening');
    }

    // VAD Check: If the loudests part of this chunk was still quieter than threshold, discard it completely
    // This prevents sending files that are just "loud silence" (breathing, fans)
    const thresholdRMS = Math.max(0.01, (silenceThresholdSetting / 100) * 0.2);
    if (maxRmsInCurrentSliceRef.current < thresholdRMS) {
         console.log(`Chunk discarded by VAD MaxRMS check. Peak: ${maxRmsInCurrentSliceRef.current.toFixed(4)} < Thr: ${thresholdRMS.toFixed(4)}`);
         if (onStatusCallbackRef.current && isRecording) {
            onStatusCallbackRef.current('listening');
         }
         return;
    }

    try {
      const optimizedBlob = await trimAndEncodeWav(blob);
      
      if (!optimizedBlob) {
          if (onStatusCallbackRef.current && isRecording) {
              onStatusCallbackRef.current('listening');
          }
          return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (result && onChunkCallbackRef.current) {
          const base64 = result.split(',')[1];
          onChunkCallbackRef.current(base64, 'audio/wav');
        }
      };
      reader.readAsDataURL(optimizedBlob);
    } catch (e) {
      console.error("Chunk processing failed", e);
    }
  };

  const startMediaRecorder = (stream: MediaStream) => {
    let options: MediaRecorderOptions | undefined = undefined;
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
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
        
        // Threshold Logic:
        // Setting 1-100 maps to 0.01 - 0.2 RMS.
        // 0.01 is barely audible (breathing). 0.2 is quite loud speaking.
        const thresholdRMS = Math.max(0.01, (silenceThresholdSetting / 100) * 0.2);

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
