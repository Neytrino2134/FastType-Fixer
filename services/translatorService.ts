
import { GoogleGenAI } from "@google/genai";
import { Language } from "../types";

// Map internal codes to readable English names for the AI Prompt
const LANG_MAP: Record<string, string> = {
    'ru': 'Russian',
    'en': 'English',
    'uz-latn': 'Uzbek (Latin script)',
    'uz-cyrl': 'Uzbek (Cyrillic script)'
};

export const translateText = async (
    text: string, 
    sourceLang: string,
    targetLang: string,
    apiKey: string
): Promise<string> => {
    if (!apiKey) {
        console.error("Translation Error: API Key is missing.");
        return "Error: No API Key.";
    }
    if (!text || !text.trim()) return "";

    const ai = new GoogleGenAI({ apiKey });

    const sourceName = LANG_MAP[sourceLang] || sourceLang;
    const targetName = LANG_MAP[targetLang] || targetLang;

    // Dynamic system prompt construction
    const systemPrompt = `You are a professional translator. 
    Your task is to translate text from ${sourceName} to ${targetName}.
    
    STRICT RULES:
    1. Maintain the original tone, nuance, and formatting.
    2. Return ONLY the translation. Do not add introductory phrases like "Here is the translation".
    3. If the input is technically code or untranslatable, return it as is.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: text,
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.3, 
            }
        });

        return response.text?.trim() || "";
    } catch (error: any) {
        console.error("Translation API Error:", error);
        
        let msg = "Error: Could not translate.";
        if (error.message && error.message.includes("429")) {
            msg = "Error: Too many requests (429).";
        } else if (error.message && error.message.includes("API key")) {
            msg = "Error: Invalid API Key.";
        }
        
        return msg;
    }
};
