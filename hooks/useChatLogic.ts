
import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, Language, Attachment } from '../types';
import { streamChatMessage, transcribeChatAudio } from '../services/chatService';
import { useAudioRecorder } from './useAudioRecorder';
import { useGeminiLive } from './useGeminiLive';

const STORAGE_KEY_CHAT = 'fasttype_chat_history_v1';

export const useChatLogic = (language: Language, apiKey: string, silenceThreshold: number = 20) => {
    // UI State
    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_CHAT);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    const [isLoading, setIsLoading] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(false);
    const [inputText, setInputText] = useState('');
    
    // Status State for Audio
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // Logic Refs
    const pendingAudioCount = useRef(0);
    const abortProcessingRef = useRef(false);
    
    const activeModel = 'gemini-3-flash-preview';
    
    const { isRecording, startRecording, stopRecording, autoStopCountdown, visualizerDataRef } = useAudioRecorder(silenceThreshold);

    const { 
        isLive, 
        isConnecting: isLiveConnecting, 
        startLive, 
        stopLive, 
        liveVisualizerDataRef,
        error: liveError
    } = useGeminiLive(apiKey);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_CHAT, JSON.stringify(messages));
    }, [messages]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

    // --- Core Send Logic ---

    const executeSend = async (text: string, attachment: Attachment | undefined, model: string, currentHistory: ChatMessage[]): Promise<void> => {
        const botMsgId = (Date.now() + 1).toString();
        
        setMessages(prev => [...prev, {
            id: botMsgId,
            role: 'model',
            text: '',
            timestamp: Date.now(),
            isTyping: true
        }]);

        let fullResponse = "";
        
        const stream = streamChatMessage(apiKey, model, language, currentHistory, text, attachment);

        for await (const chunk of stream) {
            fullResponse += chunk;
            setMessages(prev => prev.map(msg => 
                msg.id === botMsgId 
                    ? { ...msg, text: fullResponse } 
                    : msg
            ));
        }

        setMessages(prev => prev.map(msg => 
            msg.id === botMsgId 
                ? { ...msg, isTyping: false } 
                : msg
        ));

        if (soundEnabled && fullResponse) {
            speakText(fullResponse);
        }
    };

    const handleSendMessage = async (text: string, attachment?: Attachment) => {
        // KILL SWITCH: Stop recording and ignore any pending analysis results
        abortProcessingRef.current = true;
        if (isRecording) {
            await stopRecording();
        }
        setIsAnalyzing(false);
        pendingAudioCount.current = 0;

        if ((!text.trim() && !attachment) || !apiKey) return;

        setInputText('');

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: text,
            timestamp: Date.now(),
            attachment: attachment
        };

        const currentHistory = messages;

        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        try {
            await executeSend(text, attachment, activeModel, currentHistory);
        } catch (error: any) {
            console.warn("Model failed:", error);
            handleErrorDisplay(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleErrorDisplay = (error: any) => {
        let errorMsg = language === 'ru' ? "Ошибка..." : "Error...";
        if (error.message) {
             const clean = error.message.replace(/\[.*?\]/g, '').trim();
             errorMsg += ` (${clean.substring(0, 50)}...)`;
        }

        setMessages(prev => prev.map(msg => {
            if (msg.isTyping) {
                return { ...msg, text: errorMsg, isTyping: false };
            }
            return msg;
        }));
    };

    // --- Audio ---

    const handleAudioChunk = async (base64: string, mimeType: string) => {
        // If aborted (e.g. by sending message), reject chunks
        if (abortProcessingRef.current) return;

        pendingAudioCount.current++;
        setIsAnalyzing(true);

        try {
            const transcription = await transcribeChatAudio(apiKey, base64, mimeType, language);
            
            // Check abort again after async operation
            if (abortProcessingRef.current) return;

            if (transcription && transcription.trim()) {
                setInputText(prev => {
                    const clean = transcription.trim();
                    if (!clean) return prev;
                    const separator = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
                    return prev + separator + clean;
                });
            }
        } catch (e) {
            console.error("Chat Transcription failed", e);
        } finally {
            pendingAudioCount.current--;
            // Only turn off analyzing if no more chunks are pending
            if (pendingAudioCount.current === 0) {
                setIsAnalyzing(false);
            }
        }
    };

    const toggleVoice = async () => {
        if (isRecording) {
            // GRACEFUL STOP: We do NOT set abortProcessingRef = true here.
            // We want the last chunk to be processed.
            await stopRecording();
            // isRecording UI state updates automatically via hook
        } else {
            // START: Reset abort flag to allow new data
            abortProcessingRef.current = false;
            const success = await startRecording(handleAudioChunk);
            if (!success) console.warn("Failed to start recording");
        }
    };

    const toggleLiveMode = () => {
        if (isLive || isLiveConnecting) {
            stopLive();
        } else {
            if (isRecording) {
                abortProcessingRef.current = true; // Hard stop standard recording
                stopRecording();
            }
            startLive();
        }
    };

    // --- Utilities ---

    const speakText = useCallback((text: string) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language === 'ru' ? 'ru-RU' : 'en-US';
        window.speechSynthesis.speak(utterance);
    }, [language]);

    const clearChat = () => {
        // Clear also aborts pending audio to prevent weird state
        abortProcessingRef.current = true;
        setMessages([]);
        setInputText('');
        setIsAnalyzing(false);
        if (isRecording) stopRecording();
        window.speechSynthesis.cancel();
    };

    return {
        messages,
        inputText,
        setInputText,
        isLoading,
        activeModel,
        messagesEndRef,
        handleSendMessage,
        toggleVoice,
        isRecording,
        isAnalyzing, // Exposed status
        soundEnabled,
        setSoundEnabled,
        clearChat,
        autoStopCountdown,
        visualizerDataRef,
        isLive,
        isLiveConnecting,
        liveError,
        toggleLiveMode,
        liveVisualizerDataRef
    };
};
