
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
  const SLICE_TIMEOUT = 1000; // 1.0s of silence triggers a slice/send (More instant)
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

  const calculateRMS = (dataArray: Uint8Array) => {
    let sum = 0;
    // dataArray is 0-255 (128 is silence)
    for (let i = 0; i < dataArray.length; i++) {
      const x = (dataArray[i] - 128) / 128.0;
      sum += x * x;
    }
    return Math.sqrt(sum / dataArray.length);
  };

  // Helper: Decode, Trim, and Re-encode to WAV
  const trimAndEncodeWav = async (originalBlob: Blob): Promise<Blob | null> => {
    try {
        const arrayBuffer = await originalBlob.arrayBuffer();
        // We need a temporary AudioContext to decode
        const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
        
        const channelData = audioBuffer.getChannelData(0); // Mono check
        const sampleRate = audioBuffer.sampleRate;
        
        // Threshold for trimming (normalized 0.0-1.0)
        // Using a dynamic threshold based on the setting, but keeping it low for safety
        const trimThreshold = Math.max(0.01, (silenceThresholdSetting / 1000) * 0.5); 
        
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
        return originalBlob; // Fallback to original if trim fails
    }
  };

  const processChunk = async (blob: Blob) => {
    if (blob.size === 0) return;

    // Report status: Analyzing/Listening (chunk sent for processing)
    if (onStatusCallbackRef.current) {
        onStatusCallbackRef.current('analyzing_listening');
    }

    // DEBUG: Log chunk info
    console.log(`Processing raw chunk: Size=${blob.size}, MaxRMS=${maxRmsInCurrentSliceRef.current.toFixed(4)}`);

    try {
      // 1. Trim Silence and Convert to WAV
      const optimizedBlob = await trimAndEncodeWav(blob);
      
      if (!optimizedBlob) {
          console.log("Chunk discarded: Silence only.");
          // If silent, revert back to listening
          if (onStatusCallbackRef.current && isRecording) {
              onStatusCallbackRef.current('listening');
          }
          return;
      }

      console.log(`Processed chunk: Original Size=${blob.size}, Trimmed Size=${optimizedBlob.size}`);

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (result && onChunkCallbackRef.current) {
          const base64 = result.split(',')[1];
          // Always send as audio/wav after trimming
          onChunkCallbackRef.current(base64, 'audio/wav');
        }
      };
      reader.readAsDataURL(optimizedBlob);
    } catch (e) {
      console.error("Chunk processing failed", e);
    }
  };

  const startMediaRecorder = (stream: MediaStream) => {
    // Prefer webm/opus for efficient raw capture, we convert to WAV later
    let options: MediaRecorderOptions | undefined = undefined;
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
    }

    const mediaRecorder = new MediaRecorder(stream, options);
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];
    
    // Reset VAD for new slice
    maxRmsInCurrentSliceRef.current = 0;
    
    // Status: Listening
    if (onStatusCallbackRef.current) onStatusCallbackRef.current('listening');

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      // Assemble the blob from chunks
      const mimeType = mediaRecorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      audioChunksRef.current = []; // Reset chunks
      processChunk(audioBlob);
    };

    mediaRecorder.start();
  };

  const startRecording = useCallback(async (
      onChunk: (base64: string, mimeType: string) => Promise<void>,
      onStatusUpdate?: (status: VisualizerStatus) => void
  ): Promise<boolean> => {
    try {
      cleanup(); // Ensure clean state
      
      onChunkCallbackRef.current = onChunk;
      onStatusCallbackRef.current = onStatusUpdate || null;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 1. Setup Audio Analysis (Visualizer + VAD)
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256; 
      analyser.smoothingTimeConstant = 0.8; 
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      
      analyserRef.current = analyser;
      
      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      visualizerDataRef.current = dataArray;

      // 2. Setup Recording
      startMediaRecorder(stream);
      setIsRecording(true);
      silenceStartRef.current = Date.now(); // Initialize

      // 3. Start Analysis Loop
      checkSilenceIntervalRef.current = setInterval(() => {
        if (!analyserRef.current || !mediaRecorderRef.current) return;

        analyserRef.current.getByteTimeDomainData(dataArray);
        const rms = calculateRMS(dataArray);
        
        // Update the peak RMS for the current recording slice
        if (rms > maxRmsInCurrentSliceRef.current) {
            maxRmsInCurrentSliceRef.current = rms;
        }
        
        // Map 0-100 setting to 0.00 to 0.1 RMS range
        const thresholdRMS = Math.max(0.005, silenceThresholdSetting / 1000);

        if (rms > thresholdRMS) {
          // User is speaking
          silenceStartRef.current = null;
          setAutoStopCountdown(null);
          // If we were editing, back to listening
          // (Can't check previous state easily here, but safe to re-assert)
        } else {
          // Silence detected
          if (silenceStartRef.current === null) {
            silenceStartRef.current = Date.now();
          } else {
            const now = Date.now();
            const silenceDuration = now - silenceStartRef.current;
            const remaining = Math.max(0, AUTO_STOP_TIMEOUT - silenceDuration);

            // Calculate Countdown
            const secondsLeft = Math.ceil(remaining / 1000);
            
            // Show countdown if within 5 seconds
            if (secondsLeft <= 5 && secondsLeft > 0) {
                setAutoStopCountdown(prev => prev !== secondsLeft ? secondsLeft : prev);
            } else if (secondsLeft <= 0) {
                setAutoStopCountdown(0);
            }

            // CHECK 1: Auto-Stop after 5 seconds
            if (silenceDuration > AUTO_STOP_TIMEOUT) {
              stopRecording();
              return;
            }

            // CHECK 2: Slice after 1.0 seconds (if not already slicing)
            if (silenceDuration > SLICE_TIMEOUT && !isSlicingRef.current) {
                isSlicingRef.current = true;
                
                // Report status: Editing/Listening (Trimming/Cutting)
                if (onStatusCallbackRef.current) {
                    onStatusCallbackRef.current('editing');
                }

                // Stop current recorder (triggers onstop -> processChunk)
                if (mediaRecorderRef.current.state === 'recording') {
                   mediaRecorderRef.current.stop();
                }

                // Restart recorder immediately for next sentence
                if (streamRef.current && streamRef.current.active) {
                    startMediaRecorder(streamRef.current);
                }
                
                setTimeout(() => { isSlicingRef.current = false; }, 200);
            }
          }
        }
      }, 100);

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

    // Give it a moment to process the last chunk before killing the stream
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
