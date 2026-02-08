

import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { Language } from "../types";
import { getPrompts } from "../utils/i18n";
import { cleanAudioHallucinations, removeFillers, cleanGeminiResponse } from "../utils/textCleaner";

let ai: GoogleGenAI | null = null;

export const setGeminiApiKey = (key: string) => {
  if (!key) return;
  ai = new GoogleGenAI({ apiKey: key });
};

if (process.env.API_KEY) {
  setGeminiApiKey(process.env.API_KEY);
}

// --- ERROR HANDLING HELPER ---

class AppError extends Error {
    code: string;
    isFatal: boolean;
    
    constructor(message: string, code: string, isFatal: boolean = false) {
        super(message);
        this.code = code;
        this.isFatal = isFatal;
    }
}

const parseGeminiError = (error: any, language: Language): AppError => {
    const msg = error.message || error.toString();
    const isRu = language === 'ru' || language === 'uz-cyrl'; // Treat Uzbek Cyrillic like Ru for tech errors roughly, or customize
    
    // 400: Bad Request (Invalid API Key often comes as 400 with specific text in some SDK versions, or 403)
    if (msg.includes('400') || msg.includes('INVALID_ARGUMENT')) {
        if (msg.includes('API key')) {
             return new AppError(isRu ? "Неверный API ключ" : "Invalid API Key", 'KEY_INVALID', true);
        }
        return new AppError(isRu ? "Ошибка запроса (400)" : "Bad Request (400)", 'BAD_REQUEST', false);
    }

    // 401/403: Permission / Auth
    if (msg.includes('401') || msg.includes('403') || msg.includes('PERMISSION_DENIED')) {
        return new AppError(isRu ? "Ошибка доступа: Проверьте API ключ" : "Access Denied: Check API Key", 'KEY_PERMS', true);
    }

    // 429: Quota
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Too Many Requests')) {
        return new AppError(isRu ? "Лимит квоты исчерпан (429)" : "Quota Exceeded (429)", 'QUOTA', true);
    }

    // 5xx: Server
    if (msg.includes('500') || msg.includes('503') || msg.includes('INTERNAL')) {
        return new AppError(isRu ? "Ошибка сервера Google" : "Google Server Error", 'SERVER', false);
    }

    // Network
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
        return new AppError(isRu ? "Нет соединения с интернетом" : "No Internet Connection", 'NETWORK', true);
    }

    // Generic
    return new AppError(isRu ? "Ошибка API" : "API Error", 'UNKNOWN', false);
};

// --- AUDIO HELPERS ---

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

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

// Helper: Timeout Wrapper for API calls
const withTimeout = <T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("TIMEOUT")), ms);
        promise.then(
            (res) => { clearTimeout(timer); resolve(res); },
            (err) => { clearTimeout(timer); reject(err); }
        );
    });
};

// --- SERVICES ---

export const speakText = async (text: string, voiceName: string): Promise<string | null> => {
    if (!ai) throw new Error("API Key not set");
    if (!text || !text.trim()) return null;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName || 'Puck' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        
        if (base64Audio) {
            const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const outputNode = outputAudioContext.createGain();
            
            const audioBytes = decode(base64Audio);
            const audioBuffer = await decodeAudioData(audioBytes, outputAudioContext, 24000, 1);
            
            const source = outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputNode);
            outputNode.connect(outputAudioContext.destination);
            source.start();

            return base64Audio;
        }
        return null;
    } catch (error) {
        console.error("TTS Error:", error);
        // Throw simple error for UI to catch
        throw new Error("TTS Failed"); 
    }
};

export const fixTyposOnly = async (text: string, language: Language): Promise<string> => {
  if (!text || text.trim().length === 0) return text;
  if (!ai) return text;

  const prompts = getPrompts(language);

  try {
    const call = ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: text,
      config: {
        systemInstruction: prompts.fixTypos,
        temperature: 0.2, 
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingBudget: 0 } as any,
      },
    });

    const response = await withTimeout(call, 15000, "Gemini Timeout") as GenerateContentResponse;
    let result = response.text?.trim() || text;
    result = cleanGeminiResponse(result);
    return result;
  } catch (error: any) {
    if (error.message === 'TIMEOUT') return text; // Silent fail on timeout
    throw parseGeminiError(error, language); // Throw fatal errors
  }
};

export const finalizeText = async (text: string, language: Language): Promise<string> => {
  if (!text || text.trim().length === 0) return text;
  if (!ai) return text;

  const prompts = getPrompts(language);

  try {
    const call = ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: text,
      config: {
        systemInstruction: prompts.finalize,
        temperature: 0.1, 
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 0 } as any,
      },
    });

    const response = await withTimeout(call, 20000, "Gemini Timeout") as GenerateContentResponse;
    let result = response.text?.trim() || text;
    result = removeFillers(result, language);
    result = cleanGeminiResponse(result);
    return result;
  } catch (error: any) {
    if (error.message === 'TIMEOUT') return text;
    throw parseGeminiError(error, language);
  }
};

export const fixAndFinalize = async (text: string, language: Language): Promise<string> => {
  if (!text || text.trim().length === 0) return text;
  if (!ai) return text;

  const prompts = getPrompts(language);

  try {
    const call = ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: text,
      config: {
        systemInstruction: prompts.combined,
        temperature: 0.1, 
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 0 } as any,
      },
    });

    const response = await withTimeout(call, 25000, "Gemini Timeout") as GenerateContentResponse;
    let result = response.text?.trim() || text;
    result = removeFillers(result, language);
    result = cleanGeminiResponse(result);
    return result;
  } catch (error: any) {
    if (error.message === 'TIMEOUT') return text;
    throw parseGeminiError(error, language);
  }
};

export const enhanceFullText = async (text: string, language: Language): Promise<string> => {
  if (!text || text.trim().length === 0) return text;
  if (!ai) return text;

  const prompts = getPrompts(language);

  try {
    const call = ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: text,
      config: {
        systemInstruction: prompts.enhance,
        temperature: 0.1, 
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 0 } as any,
      },
    });
    
    const response = await withTimeout(call, 25000, "Gemini Timeout") as GenerateContentResponse;
    let result = response.text || text;
    result = removeFillers(result, language);
    result = cleanGeminiResponse(result);
    return result;
  } catch (error: any) {
    if (error.message === 'TIMEOUT') return text;
    throw parseGeminiError(error, language);
  }
};

const isRepetitive = (text: string): boolean => {
    if (!text || text.length < 10) return false;
    const russianHello = "привет, как дела";
    const lower = text.toLowerCase();
    if (lower.split(russianHello).length > 3) return true;
    const parts = text.split(/[.!?]\s+/);
    if (parts.length > 3) {
        const unique = new Set(parts.map(p => p.trim().toLowerCase()));
        if (unique.size < parts.length / 2) return true;
    }
    return false;
};

export const transcribeAudio = async (base64Audio: string, mimeType: string, language: Language, modelName: string = 'gemini-2.5-flash'): Promise<string> => {
  if (!ai) throw new Error("API Key not set");

  const prompts = getPrompts(language);

  try {
    if (!base64Audio || base64Audio.length < 100) {
        return "";
    }

    const call = ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio,
            },
          },
        ],
      },
      config: {
        systemInstruction: prompts.transcribe,
        temperature: 0.1, 
      },
    });

    const response = await withTimeout(call, 15000, "Gemini Transcription Timeout") as GenerateContentResponse;

    let result = response.text || "";
    result = cleanAudioHallucinations(result, language);
    
    if (!result) return "";

    const lower = result.toLowerCase().trim();
    if (
        lower.includes("эксперт по транскрибации") || 
        lower.includes("expert transcriber") ||
        lower.startsWith("я думаю, что")
    ) {
        return "";
    }

    if (isRepetitive(result)) return "";

    return result;
  } catch (error: any) {
    if (error.message === 'TIMEOUT') return "";
    throw parseGeminiError(error, language);
  }
};

export const recognizeTextFromImage = async (base64Image: string, mimeType: string, language: Language): Promise<string> => {
  if (!ai) throw new Error("API Key not set");

  const prompts = getPrompts(language);

  try {
    const call = ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
        ],
      },
      config: {
        systemInstruction: prompts.ocr,
        temperature: 0.1, 
      },
    });

    const response = await withTimeout(call, 20000, "OCR Timeout") as GenerateContentResponse;
    let result = response.text || "";
    result = cleanGeminiResponse(result);
    return result;
  } catch (error: any) {
    if (error.message === 'TIMEOUT') return "";
    throw parseGeminiError(error, language);
  }
};
