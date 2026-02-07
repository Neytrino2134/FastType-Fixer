
import { GoogleGenAI, Modality } from "@google/genai";
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

// --- SERVICES ---

/**
 * Generates speech, plays it immediately, and returns the base64 string for archiving.
 */
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

            // Return the base64 data for archiving
            return base64Audio;
        }
        return null;
    } catch (error) {
        console.error("TTS Error:", error);
        throw error;
    }
};

// STAGE 1: Fix Typos Only (Grey -> Orange)
export const fixTyposOnly = async (text: string, language: Language): Promise<string> => {
  if (!text || text.trim().length === 0) return text;
  if (!ai) return text;

  const prompts = getPrompts(language);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: text,
      config: {
        systemInstruction: prompts.fixTypos,
        // Increased from 0.1 to 0.2 to allow slight flexibility for typo guessing
        temperature: 0.2, 
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingBudget: 0 } as any,
      },
    });

    let result = response.text?.trim() || text;
    // Strict cleaning of reasoning artifacts
    result = cleanGeminiResponse(result);
    return result;
  } catch (error) {
    console.error("Gemini Typo Fix Error:", error);
    return text;
  }
};

// STAGE 2: Finalize Text (Orange -> Green)
// Adds punctuation, capitalization, formatting AND removes fillers
export const finalizeText = async (text: string, language: Language): Promise<string> => {
  if (!text || text.trim().length === 0) return text;
  if (!ai) return text;

  const prompts = getPrompts(language);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: text,
      config: {
        systemInstruction: prompts.finalize,
        // Lowered temperature to 0.1 to discourage creative "options" response
        temperature: 0.1, 
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 0 } as any,
      },
    });

    let result = response.text?.trim() || text;
    
    // Post-process: Double check for stubborn fillers via code logic
    result = removeFillers(result, language);
    result = cleanGeminiResponse(result);

    return result;
  } catch (error) {
    console.error("Gemini Finalize Error:", error);
    return text;
  }
};

// STAGE 3 (Combined): Fix & Finalize (Grey -> Green in one go)
// Used for large text pastes, dictation, or bulk edits
export const fixAndFinalize = async (text: string, language: Language): Promise<string> => {
  if (!text || text.trim().length === 0) return text;
  if (!ai) return text;

  const prompts = getPrompts(language);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: text,
      config: {
        systemInstruction: prompts.combined, // Use combined system instruction
        // Lowered temperature to 0.1 for strict output
        temperature: 0.1, 
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 0 } as any,
      },
    });

    let result = response.text?.trim() || text;
    
    // Clean fillers
    result = removeFillers(result, language);
    result = cleanGeminiResponse(result);

    return result;
  } catch (error) {
    console.error("Gemini Combined Fix Error:", error);
    return text;
  }
};

// Legacy/Full correction wrapper (used for Enhance button)
export const correctTextSegment = async (text: string, language: Language): Promise<string> => {
  return fixTyposOnly(text, language);
};

export const enhanceFullText = async (text: string, language: Language): Promise<string> => {
  if (!text || text.trim().length === 0) return text;
  if (!ai) return text;

  const prompts = getPrompts(language);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: text,
      config: {
        systemInstruction: prompts.enhance,
        // Strict low temperature
        temperature: 0.1, 
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 0 } as any,
      },
    });
    
    let result = response.text || text;
    result = removeFillers(result, language);
    result = cleanGeminiResponse(result);
    return result;
  } catch (error) {
    console.error("Gemini Enhancement Error:", error);
    return text;
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
    // Basic validation
    if (!base64Audio || base64Audio.length < 100) {
        console.warn("Audio chunk too small, skipping.");
        return "";
    }

    console.log(`Sending to Gemini [${modelName}]: ${mimeType}, size: ${Math.round(base64Audio.length/1024)}KB`);

    const response = await ai.models.generateContent({
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

    let result = response.text || "";
    console.log("Raw Transcription:", result);

    // 1. Clean Hallucinations immediately
    result = cleanAudioHallucinations(result, language);
    
    // If cleaning resulted in empty string, stop here
    if (!result) return "";

    const lower = result.toLowerCase().trim();
    
    // Filter common hallucinations where model describes its own job
    if (
        lower.includes("эксперт по транскрибации") || 
        lower.includes("expert transcriber") ||
        lower.startsWith("я думаю, что")
    ) {
        return "";
    }

    if (isRepetitive(result)) return "";

    return result;
  } catch (error) {
    console.error("Gemini Transcription Error:", error);
    // Return empty string on error so the app doesn't crash, just ignores the chunk
    return "";
  }
};

export const recognizeTextFromImage = async (base64Image: string, mimeType: string, language: Language): Promise<string> => {
  if (!ai) throw new Error("API Key not set");

  const prompts = getPrompts(language);

  try {
    console.log(`Sending Image to Gemini [OCR]: ${mimeType}, size: ${Math.round(base64Image.length/1024)}KB`);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Using flash for fast OCR
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
        temperature: 0.1, // Very low temp for exact text extraction
      },
    });

    let result = response.text || "";
    // Basic cleaning of OCR artifacts if needed, but usually OCR should be raw
    result = cleanGeminiResponse(result);
    
    return result;
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    return "";
  }
};