
import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { useNotification } from '../contexts/NotificationContext';

// Helper: Base64 Decode
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper: Base64 Encode
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper: Create PCM Blob for Input
function createPcmBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = Math.max(-32768, Math.min(32767, data[i] * 32768));
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// Helper: Decode Audio Data for Output
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const useGeminiLive = (apiKey: string) => {
  const { addNotification } = useNotification();
  const [isLive, setIsLive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use a ref for instant access inside audio callbacks
  const isLiveRef = useRef(false);

  // Audio Contexts
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  
  // Processing Nodes
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  
  // Playback State
  const nextStartTimeRef = useRef<number>(0);
  const scheduledSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Data Ref for Visualizer (Exposed to UI)
  const liveVisualizerDataRef = useRef<Uint8Array>(new Uint8Array(128));
  const rafIdRef = useRef<number | null>(null);

  // Session Reference
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const currentSessionRef = useRef<any>(null); // To call close()

  const stopLive = useCallback(async () => {
    setIsLive(false);
    isLiveRef.current = false; // Immediate flag
    setIsConnecting(false);

    // Close Gemini Session
    if (currentSessionRef.current) {
        try {
            currentSessionRef.current.close();
        } catch(e) { console.error("Error closing live session", e); }
        currentSessionRef.current = null;
        sessionPromiseRef.current = null;
    }

    // Stop Audio Input
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (inputSourceRef.current) {
        inputSourceRef.current.disconnect();
        inputSourceRef.current = null;
    }
    if (inputContextRef.current) {
        inputContextRef.current.close();
        inputContextRef.current = null;
    }

    // Stop Audio Output
    scheduledSourcesRef.current.forEach(source => {
        try { source.stop(); } catch(e) {}
    });
    scheduledSourcesRef.current.clear();
    
    if (outputContextRef.current) {
        outputContextRef.current.close();
        outputContextRef.current = null;
    }
    
    if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
    }
  }, []);

  const startLive = useCallback(async () => {
    if (isLive || isConnecting || !apiKey) return;
    
    setIsConnecting(true);
    setError(null);

    try {
        const ai = new GoogleGenAI({ apiKey });
        
        // 1. Setup Audio Input
        const stream = await navigator.mediaDevices.getUserMedia({ audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        }});

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        inputContextRef.current = new AudioContextClass({ sampleRate: 16000 });
        inputSourceRef.current = inputContextRef.current.createMediaStreamSource(stream);
        processorRef.current = inputContextRef.current.createScriptProcessor(4096, 1, 1);
        
        inputSourceRef.current.connect(processorRef.current);
        processorRef.current.connect(inputContextRef.current.destination);

        // 2. Setup Audio Output & Visualizer
        outputContextRef.current = new AudioContextClass({ sampleRate: 24000 });
        nextStartTimeRef.current = outputContextRef.current.currentTime;
        
        // Output Analyser for Visuals
        outputAnalyserRef.current = outputContextRef.current.createAnalyser();
        outputAnalyserRef.current.fftSize = 256; // Smaller FFT for smoother UI
        outputAnalyserRef.current.connect(outputContextRef.current.destination);

        // Animation Loop for Visualizer
        const updateVisuals = () => {
            if (outputAnalyserRef.current) {
                // Fixed: Cast to any to avoid TS ArrayBufferLike mismatch errors
                outputAnalyserRef.current.getByteFrequencyData(liveVisualizerDataRef.current as any);
            }
            rafIdRef.current = requestAnimationFrame(updateVisuals);
        };
        updateVisuals();

        // 3. Connect to Gemini Live
        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
                },
                // FIXED: Cast to any to bypass strict TS Content type check while maintaining string for runtime
                systemInstruction: "You are a helpful, witty, and concise voice assistant. Keep answers short and conversational." as any,
            },
            callbacks: {
                onopen: () => {
                    console.log("Gemini Live Connected");
                    setIsConnecting(false);
                    setIsLive(true);
                    isLiveRef.current = true;
                },
                onmessage: async (message: LiveServerMessage) => {
                    // Safety check: Ignore messages if stopped
                    if (!isLiveRef.current) return;

                    // Handle Audio Response
                    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    
                    if (base64Audio && outputContextRef.current && outputAnalyserRef.current) {
                        try {
                            const pcmData = decode(base64Audio);
                            const audioBuffer = await decodeAudioData(pcmData, outputContextRef.current);
                            
                            const source = outputContextRef.current.createBufferSource();
                            source.buffer = audioBuffer;
                            // Connect to Analyser (Visualizer) -> Destination (Speakers)
                            source.connect(outputAnalyserRef.current);
                            
                            // Schedule playback
                            const now = outputContextRef.current.currentTime;
                            // Ensure next start time is in the future
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, now);
                            
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            
                            scheduledSourcesRef.current.add(source);
                            source.onended = () => {
                                scheduledSourcesRef.current.delete(source);
                            };
                        } catch(e) {
                            console.error("Error decoding audio chunk", e);
                        }
                    }

                    // Handle Interruption
                    if (message.serverContent?.interrupted) {
                        console.log("Interrupted!");
                        scheduledSourcesRef.current.forEach(s => s.stop());
                        scheduledSourcesRef.current.clear();
                        if (outputContextRef.current) {
                            nextStartTimeRef.current = outputContextRef.current.currentTime;
                        }
                    }
                },
                onclose: () => {
                    console.log("Gemini Live Closed");
                    stopLive();
                },
                onerror: (e) => {
                    console.error("Gemini Live Error", e);
                    setError("Connection lost");
                    addNotification("Live Error: Connection lost or API issue", 'error');
                    stopLive();
                }
            }
        });

        sessionPromiseRef.current = sessionPromise;
        sessionPromise.then(sess => {
            currentSessionRef.current = sess;
        }).catch(err => {
             console.error("Session promise failed:", err);
             setError("Failed to connect");
             addNotification("Live Connection Failed", 'error');
             stopLive();
        });

        // 4. Stream Input Audio
        processorRef.current.onaudioprocess = (e) => {
            // CRITICAL CHECK: Stop processing if we are no longer live
            if (!isLiveRef.current) return;

            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBlob = createPcmBlob(inputData);
            
            // Only send if session is established AND we are still live
            sessionPromise.then(session => {
                if (isLiveRef.current) {
                    session.sendRealtimeInput({ media: pcmBlob });
                }
            });
        };

    } catch (e) {
        console.error("Failed to start Live session", e);
        setError("Microphone access failed or API error.");
        addNotification("Failed to start Live. Check Mic/API.", 'error');
        setIsConnecting(false);
        stopLive();
    }
  }, [apiKey, isLive, isConnecting, stopLive, addNotification]);

  return {
    isLive,
    isConnecting,
    error,
    startLive,
    stopLive,
    liveVisualizerDataRef
  };
};
