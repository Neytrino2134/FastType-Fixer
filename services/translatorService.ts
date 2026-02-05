import { GoogleGenAI } from "@google/genai";

type TranslationDirection = 'ru-en' | 'en-ru';

export const translateText = async (
    text: string, 
    direction: TranslationDirection, 
    apiKey: string
): Promise<string> => {
    if (!text || !text.trim() || !apiKey) return "";

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = direction === 'ru-en' 
        ? "You are a professional translator. Translate the following Russian text to English. Maintain the original tone, nuance, and formatting. Return ONLY the translation."
        : "Ты профессиональный переводчик. Переведи следующий английский текст на русский язык. Сохрани оригинальный тон, нюансы и форматирование. Верни ТОЛЬКО перевод.";

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: text,
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.3, // Lower temperature for more accurate translation
            }
        });

        return response.text?.trim() || "";
    } catch (error) {
        console.error("Translation Error:", error);
        return "Error: Could not translate.";
    }
};