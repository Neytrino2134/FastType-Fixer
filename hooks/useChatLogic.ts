

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, Language, Attachment } from '../types';
import { streamChatMessage, transcribeChatAudio } from '../services/chatService';
import { useAudioRecorder } from './useAudioRecorder';

const STORAGE_KEY_CHAT = 'fasttype_chat_history_v1';

export const useChatLogic = (language: Language, apiKey: string) => {
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
    const activeModel = 'gemini-3-flash-preview';
    
    // Audio Recorder
    const { isRecording, startRecording, stopRecording, autoStopCountdown } = useAudioRecorder(15);

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
        
        // Add placeholder for Bot response
        setMessages(prev => [...prev, {
            id: botMsgId,
            role: 'model',
            text: '',
            timestamp: Date.now(),
            isTyping: true
        }]);

        let fullResponse = "";
        
        // Use the stateless stream function
        // It strictly handles history sanitization inside
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
        if ((!text.trim() && !attachment) || !apiKey) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: text,
            timestamp: Date.now(),
            attachment: attachment
        };

        // Capture history BEFORE adding the new message to state
        // This ensures the sanitization logic sees the exact previous state
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
             // Clean up the error message for display
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
        if (isRecording) await stopRecording();
        try {
            const transcription = await transcribeChatAudio(apiKey, base64, mimeType, language);
            if (transcription) await handleSendMessage(transcription);
        } catch (e) {
            console.error("Transcription failed", e);
        }
    };

    const toggleVoice = async () => {
        if (isRecording) await stopRecording();
        else {
            const success = await startRecording(handleAudioChunk);
            if (!success) console.warn("Failed to start recording");
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
        setMessages([]);
        window.speechSynthesis.cancel();
    };

    return {
        messages,
        isLoading,
        activeModel,
        messagesEndRef,
        handleSendMessage,
        toggleVoice,
        isRecording,
        soundEnabled,
        setSoundEnabled,
        clearChat,
        autoStopCountdown
    };
};