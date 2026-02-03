
import React, { useEffect, useState, useRef } from 'react';
import { EffectsConfig } from '../../types';
import { GoogleGenAI } from "@google/genai";
import { questionsEn, questionsRu, offlineAnswersEn, offlineAnswersRu } from '../../data/geminiQuestions';
import { useLanguage } from '../../contexts/LanguageContext';
import { Bot, User, Send, Cpu, WifiOff, Play, Square } from 'lucide-react';

interface GeminiChatEffectProps {
  effects: EffectsConfig;
  apiKey?: string; // Prop for user provided key
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  isTyping?: boolean;
}

// Interval Range (Minutes)
const MIN_INTERVAL = 5;
const MAX_INTERVAL = 15;

const GeminiChatEffect: React.FC<GeminiChatEffectProps> = ({ effects, apiKey }) => {
  const config = effects.geminiChat;
  const { language, t } = useLanguage();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false); // Track connectivity
  const [isSessionActive, setIsSessionActive] = useState(false); // Manages session state
  
  // Refs for State machine
  const nextTriggerTime = useRef<number>(0); 
  const isActionInProgress = useRef(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<number | null>(null);

  // Dynamic Color
  const baseColor = (!config.color || config.color === 'theme') ? 'var(--color-primary)' : config.color;

  // Scroll to bottom on update
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, inputText, isAiProcessing]);

  // --- AUTOMATION LOOP ---
  useEffect(() => {
    if (!config.enabled || !isSessionActive) {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        return;
    }

    // Trigger immediately if just started
    if (nextTriggerTime.current === 0) {
        triggerAutomatedSession();
    }

    intervalRef.current = window.setInterval(() => {
        const now = Date.now();
        if (now >= nextTriggerTime.current && !isActionInProgress.current) {
            triggerAutomatedSession();
        }
    }, 1000);

    return () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };
  }, [config.enabled, isSessionActive, language, config.categories, apiKey]); 

  const startSession = () => {
      setIsSessionActive(true);
      // Reset trigger time to 0 so it starts immediately in the effect
      nextTriggerTime.current = 0;
  };

  const stopSession = () => {
      setIsSessionActive(false);
      isActionInProgress.current = false;
      setIsAiProcessing(false);
      setInputText("");
      if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const triggerAutomatedSession = async () => {
      isActionInProgress.current = true;

      // 1. Select Question
      const pool = language === 'ru' ? questionsRu : questionsEn;
      const validCategories = Object.entries(config.categories)
          .filter(([_, enabled]) => enabled)
          .map(([cat]) => cat);
      
      const filteredPool = pool.filter(q => validCategories.includes(q.category));
      
      if (filteredPool.length === 0) {
          // No categories enabled, reset timer and exit
          scheduleNext();
          return;
      }

      const question = filteredPool[Math.floor(Math.random() * filteredPool.length)];

      // 2. Simulate User Typing Question
      await simulateTypingInput(question.text);

      // 3. Send Message to History
      const userMsgId = crypto.randomUUID();
      setMessages(prev => [...prev, { id: userMsgId, sender: 'user', text: question.text }]);
      setInputText("");
      setIsAiProcessing(true);

      // 4. Call Gemini API (with Fallback)
      try {
          const answer = await fetchGeminiResponse(question.text);
          setIsOfflineMode(false); // If successful, mark as online
          setIsAiProcessing(false);
          await simulateTypingResponse(answer);
      } catch (e) {
          console.error("Gemini Chat API Error:", e);
          setIsOfflineMode(true); // Mark as offline
          setIsAiProcessing(false);
          
          // Select random fallback response
          const fallbacks = language === 'ru' ? offlineAnswersRu : offlineAnswersEn;
          const fallbackAns = fallbacks[Math.floor(Math.random() * fallbacks.length)];
          
          await simulateTypingResponse(fallbackAns);
      }

      // 5. Done
      scheduleNext();
  };

  const scheduleNext = () => {
      isActionInProgress.current = false;
      const minutes = Math.floor(Math.random() * (MAX_INTERVAL - MIN_INTERVAL + 1)) + MIN_INTERVAL;
      nextTriggerTime.current = Date.now() + (minutes * 60 * 1000);
  };

  const simulateTypingInput = (text: string): Promise<void> => {
      return new Promise(resolve => {
          let current = "";
          let i = 0;
          const speed = 50 / (config.typingSpeed || 1); // Base typing speed for input

          const typeLoop = () => {
              // Safety check if stopped
              if (!isSessionActive) {
                  setInputText("");
                  return;
              }

              if (i < text.length) {
                  current += text[i];
                  setInputText(current);
                  i++;
                  setTimeout(typeLoop, speed + Math.random() * 30);
              } else {
                  setTimeout(resolve, 800); // Pause before sending
              }
          };
          typeLoop();
      });
  };

  const simulateTypingResponse = (text: string): Promise<void> => {
      return new Promise(resolve => {
          const msgId = crypto.randomUUID();
          // Initialize empty AI message
          setMessages(prev => [...prev, { id: msgId, sender: 'ai', text: "", isTyping: true }]);

          let current = "";
          let i = 0;
          const speed = 30 / (config.typingSpeed || 1); // Faster reading speed

          const typeLoop = () => {
              if (!isSessionActive) {
                  setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isTyping: false } : m));
                  return;
              }

              if (i < text.length) {
                  current += text[i];
                  // Update the specific message
                  setMessages(prev => prev.map(m => 
                      m.id === msgId ? { ...m, text: current } : m
                  ));
                  i++;
                  // Occasional "pause" for realism
                  const extraDelay = (text[i] === '.' || text[i] === '\n') ? 300 : 0;
                  setTimeout(typeLoop, speed + extraDelay);
              } else {
                  setMessages(prev => prev.map(m => 
                      m.id === msgId ? { ...m, isTyping: false } : m
                  ));
                  resolve();
              }
          };
          typeLoop();
      });
  };

  const fetchGeminiResponse = async (question: string): Promise<string> => {
      // Use the provided apiKey prop first, fall back to process.env if available
      // Note: process.env.API_KEY is polyfilled by vite.config.ts
      const keyToUse = apiKey || process.env.API_KEY;
      
      // If no key, throw immediately to trigger fallback
      if (!keyToUse) {
          throw new Error("No API Key configured. Please enter one in settings or .env");
      }

      const ai = new GoogleGenAI({ apiKey: keyToUse });
      
      // Use latest Gemini 3.0 Flash Preview
      const modelName = 'gemini-3-flash-preview';
      
      const langPrompt = language === 'ru' ? 'на русском языке' : 'in English';
      const prompt = `Answer the following question ${langPrompt} extensively, philosophically, and creatively, suitable for a cyberpunk interface display: "${question}"`;

      const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
      });
      return response.text || (language === 'ru' ? "Нет данных." : "No data received.");
  };

  if (!config.enabled) return null;

  const width = config.width || 350;

  return (
    <div 
        className="absolute right-8 top-24 bottom-24 z-20 flex flex-col pointer-events-auto transition-all duration-500 backdrop-blur-sm"
        style={{
            width: `${width}px`,
            opacity: config.opacity,
            // Removed scale transform, handled by width
            backgroundColor: `color-mix(in srgb, ${baseColor}, transparent 95%)`,
            border: `1px solid color-mix(in srgb, ${baseColor}, transparent 60%)`,
            boxShadow: `0 0 30px color-mix(in srgb, ${baseColor}, transparent 80%)`,
            borderTopLeftRadius: '20px',
            borderBottomLeftRadius: '20px'
        }}
    >
        {/* Header */}
        <div 
            className="flex items-center justify-between p-3 border-b"
            style={{ 
                borderColor: `color-mix(in srgb, ${baseColor}, transparent 70%)`,
                backgroundColor: `color-mix(in srgb, ${baseColor}, transparent 90%)`,
                borderTopLeftRadius: '19px'
            }}
        >
            <div className="flex items-center gap-2" style={{ color: baseColor }}>
                {isOfflineMode ? (
                    <WifiOff size={16} className="animate-pulse" />
                ) : (
                    <Cpu size={16} className="animate-spin-slow" />
                )}
                <span className="font-mono text-[10px] font-bold tracking-widest">
                    {isOfflineMode ? "NEURAL LINK // SIMULATION" : "NEURAL LINK // GEMINI-LIVE"}
                </span>
            </div>
            <div className={`w-2 h-2 rounded-full ${isSessionActive ? (isOfflineMode ? 'bg-yellow-500' : 'animate-pulse') : 'bg-red-500'}`} style={{ backgroundColor: (isSessionActive && !isOfflineMode) ? baseColor : undefined }}></div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-hidden p-4 flex flex-col gap-4 font-mono text-xs relative">
            {/* Scanlines inside chat */}
            <div 
                className="absolute inset-0 bg-[length:100%_4px] pointer-events-none opacity-20"
                style={{
                    backgroundImage: `linear-gradient(color-mix(in srgb, ${baseColor}, transparent 80%) 1px, transparent 1px)`
                }}
            ></div>

            {messages.length === 0 && !isSessionActive && (
                <div className="flex-1 flex flex-col items-center justify-center opacity-50 text-center gap-2 select-none">
                    <Bot size={32} style={{ color: baseColor }} />
                    <span style={{ color: baseColor }} className="text-[10px] tracking-widest">SYSTEM STANDBY</span>
                </div>
            )}

            {messages.map(msg => (
                <div 
                    key={msg.id} 
                    className={`flex gap-3 z-10 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                >
                    <div 
                        className="w-6 h-6 rounded border flex items-center justify-center shrink-0"
                        style={{ borderColor: baseColor, color: baseColor }}
                    >
                        {msg.sender === 'user' ? <User size={12} /> : <Bot size={12} />}
                    </div>
                    <div 
                        className={`p-2 rounded max-w-[85%] border leading-relaxed`}
                        style={{ 
                            borderColor: `color-mix(in srgb, ${baseColor}, transparent 80%)`,
                            backgroundColor: msg.sender === 'ai' ? `color-mix(in srgb, ${baseColor}, transparent 95%)` : 'transparent',
                            color: msg.sender === 'ai' ? '#fff' : `color-mix(in srgb, ${baseColor}, transparent 20%)`
                        }}
                    >
                        {msg.text}
                        {msg.isTyping && <span className="inline-block w-1.5 h-3 ml-1 animate-pulse align-middle" style={{ backgroundColor: baseColor }}></span>}
                    </div>
                </div>
            ))}
            
            {isAiProcessing && (
                <div className="flex gap-3 z-10 animate-pulse opacity-70">
                    <div className="w-6 h-6 rounded border flex items-center justify-center shrink-0" style={{ borderColor: baseColor, color: baseColor }}>
                        <Bot size={12} />
                    </div>
                    <div className="text-[10px] pt-1" style={{ color: baseColor }}>
                        {isOfflineMode ? "GENERATING SIMULATION..." : "CALCULATING RESPONSE..."}
                    </div>
                </div>
            )}
            <div ref={chatBottomRef}></div>
        </div>

        {/* Footer / Controls */}
        <div 
            className="p-2 border-t relative"
            style={{ 
                borderColor: `color-mix(in srgb, ${baseColor}, transparent 70%)`,
                backgroundColor: `color-mix(in srgb, ${baseColor}, transparent 95%)`,
                borderBottomLeftRadius: '19px'
            }}
        >
            {isSessionActive ? (
                <div className="flex items-center gap-2">
                    {/* Simulated Input Display */}
                    <div className="flex-1 flex items-center gap-2 px-2 py-1 bg-black/20 rounded border border-transparent">
                        <span style={{ color: baseColor }}>{'>'}</span>
                        <div className="flex-1 font-mono text-xs text-white h-4 flex items-center truncate">
                            {inputText}
                            <span className="w-1.5 h-3 animate-pulse ml-0.5" style={{ backgroundColor: baseColor }}></span>
                        </div>
                        <Send size={12} style={{ color: baseColor, opacity: 0.5 }} />
                    </div>
                    {/* Stop Button */}
                    <button 
                        onClick={stopSession}
                        className="p-1.5 rounded border transition-all hover:opacity-100 opacity-70 flex items-center gap-1 group"
                        style={{ borderColor: `color-mix(in srgb, ${baseColor}, transparent 70%)`, color: baseColor }}
                        title={t('stop_session')}
                    >
                        <Square size={12} fill="currentColor" />
                    </button>
                </div>
            ) : (
                <button 
                    onClick={startSession}
                    className="w-full py-2 flex items-center justify-center gap-2 rounded border transition-all hover:opacity-100 opacity-80"
                    style={{ 
                        borderColor: baseColor, 
                        backgroundColor: `color-mix(in srgb, ${baseColor}, transparent 90%)`,
                        color: baseColor 
                    }}
                >
                    <Play size={12} fill="currentColor" />
                    <span className="font-mono text-[10px] font-bold tracking-widest">{t('start_session')}</span>
                </button>
            )}
        </div>
    </div>
  );
};

export default GeminiChatEffect;