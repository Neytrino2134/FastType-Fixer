
import { useState, useRef, useEffect } from 'react';
import { Language } from '../types';

export const useWelcomeAudio = (
    wizardStep: number, 
    currentView: 'welcome' | 'setup' | 'guide', 
    language: Language,
    langConfirmation: boolean,
    justFinishedGuide: boolean
) => {
    const [isMuted, setIsMuted] = useState(false);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);

    // Audio System Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null); 
    const visualizerDataRef = useRef<Uint8Array>(new Uint8Array(128)); 
    const rafIdRef = useRef<number | null>(null);

    // --- INITIALIZE AUDIO SYSTEM ---
    useEffect(() => {
        const audio = new Audio();
        audio.crossOrigin = "anonymous";
        audioRef.current = audio;

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const source = ctx.createMediaElementSource(audio);
        sourceRef.current = source;
        source.connect(analyser);
        analyser.connect(ctx.destination);

        const updateVisualizer = () => {
            if (analyserRef.current) {
                analyserRef.current.getByteFrequencyData(visualizerDataRef.current as any);
            }
            rafIdRef.current = requestAnimationFrame(updateVisualizer);
        };
        updateVisualizer();

        return () => {
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
            if (audioContextRef.current) audioContextRef.current.close();
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    // --- AUDIO PLAYBACK CONTROL ---
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        // Remove old listeners
        const handleEnded = () => setIsPlayingAudio(false);
        audio.removeEventListener('ended', handleEnded);
        
        // Stop previous
        audio.pause();
        setIsPlayingAudio(false);

        // LOGIC: Play audio if:
        // 1. We are in 'welcome' mode AND step > 0
        // 2. OR we are in 'setup' mode AND just finished guide (Step 7)
        const isWelcomeAudio = currentView === 'welcome' && wizardStep > 0;
        const isSetupAudio = currentView === 'setup' && justFinishedGuide;

        if (isMuted || (!isWelcomeAudio && !isSetupAudio)) {
            return;
        }

        // Determine folder and suffix based on language
        let langFolder = 'RU';
        let langSuffix = 'ru';
        
        if (language === 'en') {
            langFolder = 'EN';
            langSuffix = 'en';
        } else if (language === 'uz-latn' || language === 'uz-cyrl') {
            langFolder = 'UZ';
            langSuffix = 'uz';
        }
        
        let baseFilename = '';

        if (isSetupAudio) {
            // Step 7: "Click paste" prompt
            baseFilename = `guide_step_7_${langSuffix}`;
        } else if (wizardStep === 1) {
            // Step 1: Language Selection
            if (langConfirmation) {
                baseFilename = `welcome_step_2_${langSuffix}_2`;
            } else {
                baseFilename = `welcome_step_2_${langSuffix}`;
            }
        } else if (wizardStep === 2) {
            baseFilename = `welcome_step_1_${langSuffix}`;
        } else if (wizardStep > 2) {
            baseFilename = `welcome_step_${wizardStep}_${langSuffix}`;
        } else {
            return;
        }

        const basePath = `./sounds/${langFolder}/${baseFilename}`;

        // Define Error Handler for Fallback (MP3 -> WAV)
        const handleError = () => {
            // If current src was MP3, try WAV
            if (audio.src && audio.src.includes('.mp3')) {
                audio.src = `${basePath}.wav`;
                const p = audio.play();
                if (p !== undefined) {
                    p.catch(e => console.log("WAV playback failed", e));
                }
            } else {
                // WAV also failed or something else
                setIsPlayingAudio(false);
            }
        };

        audio.addEventListener('error', handleError);
        audio.addEventListener('ended', handleEnded);

        // Initial Try: MP3
        audio.src = `${basePath}.mp3`;
        audio.volume = 0.6; 
        
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    setIsPlayingAudio(true);
                })
                .catch(e => {
                    console.log("Audio autoplay waiting for interaction:", e);
                    setIsPlayingAudio(false);
                });
        }

        return () => {
            if (audio) {
                audio.removeEventListener('error', handleError);
                audio.removeEventListener('ended', handleEnded);
            }
        };
    }, [wizardStep, language, currentView, isMuted, langConfirmation, justFinishedGuide]);

    return {
        isMuted,
        setIsMuted,
        isPlayingAudio,
        visualizerDataRef
    };
};
