
import { useState, useEffect, useRef } from 'react';
import { Language } from '../types';

export type VoiceControlStatus = 'idle' | 'listening' | 'processing' | 'success' | 'error_network' | 'error_denied' | 'error_no_speech' | 'unsupported';

export const useVoiceControl = (
    isEnabled: boolean,
    isRecording: boolean, // Main recorder state
    wakeWord: string,
    language: Language,
    onTrigger: () => void
) => {
    const [status, setStatus] = useState<VoiceControlStatus>('idle');
    const recognitionRef = useRef<any>(null);
    const isMainRecordingRef = useRef(isRecording);
    const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync ref for access inside event handlers
    useEffect(() => {
        isMainRecordingRef.current = isRecording;
        
        // If main recording starts, STOP listener immediately
        if (isRecording && recognitionRef.current) {
            console.log("[VoiceControl] Main recording started, aborting listener.");
            recognitionRef.current.onend = null;
            recognitionRef.current.abort();
            setStatus('idle');
        } else if (!isRecording && isEnabled && status === 'idle') {
            // If main recording stops and we are enabled, restart listener
            startListener();
        }
    }, [isRecording]);

    const startListener = () => {
        // Safety checks
        if (!isEnabled || isMainRecordingRef.current) return;
        
        // Browser support check
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("[VoiceControl] Speech Recognition not supported in this browser/environment.");
            setStatus('unsupported');
            return;
        }

        try {
            // Stop existing instance if any
            if (recognitionRef.current) {
                recognitionRef.current.onend = null; 
                recognitionRef.current.abort();
            }

            const recognition = new SpeechRecognition();
            recognition.continuous = true; // Use continuous to keep listening
            recognition.interimResults = true;
            recognition.maxAlternatives = 1;
            
            // Map our language type to browser locale code
            let langCode = 'en-US';
            if (language === 'ru') langCode = 'ru-RU';
            else if (language === 'uz-latn' || language === 'uz-cyrl') langCode = 'uz-UZ'; 
            
            recognition.lang = langCode;

            recognition.onstart = () => {
                console.log("[VoiceControl] Started listening...");
                setStatus('listening');
            };

            recognition.onresult = (event: any) => {
                if (isMainRecordingRef.current) return;

                const resultsLength = event.results.length;
                const latestResult = event.results[resultsLength - 1];
                const transcript = latestResult[0].transcript.toLowerCase().trim();
                const cleanWakeWord = wakeWord.toLowerCase().trim();

                // Console log for debugging by user
                // console.log(`[VoiceControl] Heard: "${transcript}"`);

                if (transcript.includes(cleanWakeWord)) {
                    console.log(`[VoiceControl] TRIGGERED! "${transcript}" matched "${cleanWakeWord}"`);
                    
                    setStatus('success');
                    recognition.onend = null;
                    recognition.abort();
                    
                    // Trigger Action
                    onTrigger();
                    
                    // Sound
                    const audio = new Audio('./sounds/misc/mic_on.mp3');
                    audio.volume = 0.5;
                    audio.play().catch(() => {});
                }
            };

            recognition.onerror = (event: any) => {
                console.warn("[VoiceControl] Error:", event.error);
                if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                    setStatus('error_denied');
                } else if (event.error === 'network') {
                    setStatus('error_network');
                } else if (event.error === 'no-speech') {
                    // Normal, just restart
                    setStatus('error_no_speech');
                }
            };

            recognition.onend = () => {
                // Auto-restart if still enabled and not main recording
                if (isEnabled && !isMainRecordingRef.current) {
                    if (status !== 'error_denied' && status !== 'error_network') {
                        // console.log("[VoiceControl] Restarting...");
                        // Short delay to prevent CPU thrashing
                        restartTimerRef.current = setTimeout(() => startListener(), 200);
                    }
                } else {
                    setStatus('idle');
                }
            };

            recognition.start();
            recognitionRef.current = recognition;

        } catch (e) {
            console.error("[VoiceControl] Exception:", e);
            setStatus('unsupported');
        }
    };

    const stopListener = () => {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        if (recognitionRef.current) {
            recognitionRef.current.onend = null; 
            recognitionRef.current.abort();
            recognitionRef.current = null;
        }
        setStatus('idle');
    };

    // Effect to manage lifecycle based on isEnabled settings
    useEffect(() => {
        if (isEnabled && !isRecording) {
            startListener();
        } else {
            stopListener();
        }

        return () => {
            stopListener();
        };
    }, [isEnabled, wakeWord, language]); 

    return {
        status
    };
};
