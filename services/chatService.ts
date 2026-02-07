
import { GoogleGenAI, Content, Part } from "@google/genai";
import { Language, ChatMessage, Attachment } from "../types";
import { cleanAudioHallucinations } from "../utils/textCleaner";

const getSystemInstruction = (language: Language) => {
    return language === 'ru' 
        ? "Ты полезный и дружелюбный ИИ-ассистент. Отвечай кратко, по делу, но вежливо. Используй Markdown для форматирования."
        : "You are a helpful and friendly AI assistant. Answer concisely and politely. Use Markdown for formatting.";
};

/**
 * Streams a chat response using ai.chats.create (Stateful/Session approach).
 * Strictly sanitizes history to ensure alternating roles and prevents "400 Bad Request".
 */
export const streamChatMessage = async function* (
    apiKey: string, 
    model: string, 
    language: Language, 
    history: ChatMessage[], 
    newMessage: string,
    attachment?: Attachment
) {
    if (!apiKey) throw new Error("API Key Missing");
    
    const ai = new GoogleGenAI({ apiKey });

    // --- HISTORY SANITIZATION ---
    
    const validHistory: Content[] = [];

    for (const msg of history) {
        // Skip typing placeholders or empty messages (unless they have an attachment)
        if (msg.isTyping || ((!msg.text || !msg.text.trim()) && !msg.attachment)) continue;
        
        const role = msg.role;
        const text = msg.text ? msg.text.trim() : "";
        
        const parts: Part[] = [];
        
        // Add attachment to history if present
        if (msg.attachment) {
            parts.push({
                inlineData: {
                    mimeType: msg.attachment.mimeType,
                    data: msg.attachment.data
                }
            });
        }
        
        if (text) {
            parts.push({ text });
        }

        // Check previous message to see if we need to merge (Consecutive roles are not allowed)
        if (validHistory.length > 0 && validHistory[validHistory.length - 1].role === role) {
            // MERGE: Append parts to the previous message
            const lastContent = validHistory[validHistory.length - 1];
            if (lastContent.parts) {
                lastContent.parts.push(...parts);
            }
        } else {
            // NEW TURN
            validHistory.push({
                role: role,
                parts: parts
            });
        }
    }

    // Rule 2: History cannot start with 'model' (API requirement for some contexts)
    if (validHistory.length > 0 && validHistory[0].role === 'model') {
        validHistory.shift();
    }

    // Rule 3: History cannot end with 'user'
    const currentMessageParts: Part[] = [];
    if (attachment) {
        currentMessageParts.push({
            inlineData: {
                mimeType: attachment.mimeType,
                data: attachment.data
            }
        });
    }
    if (newMessage) {
        currentMessageParts.push({ text: newMessage });
    }

    if (validHistory.length > 0 && validHistory[validHistory.length - 1].role === 'user') {
        const lastUserContent = validHistory.pop();
        if (lastUserContent && lastUserContent.parts) {
            currentMessageParts.unshift(...lastUserContent.parts);
        }
    }

    try {
        const chat = ai.chats.create({
            model: model,
            history: validHistory,
            config: {
                systemInstruction: getSystemInstruction(language),
                temperature: 0.7, 
            }
        });
        
        const resultStream = await chat.sendMessageStream({ message: currentMessageParts });
        
        for await (const chunk of resultStream) {
            if (chunk.text) {
                yield chunk.text;
            }
        }
    } catch (error) {
        console.error("Chat Stream Error Details:", error);
        throw error;
    }
};

/**
 * Independent transcription service for Chat Audio.
 * Uses Gemini 2.5 Flash for better stability on short audio segments.
 */
export const transcribeChatAudio = async (apiKey: string, base64Audio: string, mimeType: string, language: Language): Promise<string> => {
    if (!apiKey) throw new Error("API Key Missing");
    const ai = new GoogleGenAI({ apiKey });

    try {
        const response = await ai.models.generateContent({
            // SWITCHED TO 2.5 FLASH for reliability on audio tasks (3.0 Preview can hallucinate on silence)
            model: 'gemini-2.5-flash', 
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64Audio } }
                ]
            },
            config: {
                // VERY STRICT Instruction to prevent hallucinations on silence
                systemInstruction: language === 'ru' 
                    ? "Ты — транскрибатор. Твоя задача: превратить аудио в текст. \nСТРОГИЕ ПРАВИЛА:\n1. Если в аудио только тишина, шум, музыка, дыхание или непонятные звуки — верни ПУСТУЮ СТРОКУ (просто пробел).\n2. Не придумывай текст. Не пиши 'Субтитры', 'Спасибо', 'Продолжение следует'. \n3. Игнорируй слова-паразиты и заикания.\n4. Верни ТОЛЬКО то, что было четко произнесено человеком." 
                    : "You are a transcriber. Your task: convert audio to text.\nSTRICT RULES:\n1. If audio contains only silence, noise, music, breathing, or unclear sounds - return EMPTY STRING (just a space).\n2. Do NOT hallucinate text. Do NOT write 'Subtitles', 'Thanks', 'Continued'.\n3. Ignore stutters.\n4. Return ONLY what was clearly spoken by a human.",
                temperature: 0.0, // Zero temperature for deterministic output
            }
        });

        let text = response.text?.trim() || "";
        
        // 1. Basic Cleaning
        text = cleanAudioHallucinations(text, language);

        // 2. Aggressive Hallucination Check
        // Models often output these specific phrases when hearing silence/white noise
        const lower = text.toLowerCase();
        const hallucinations = [
            "субтитры", "subtitles", "продолжение следует", "to be continued",
            "спасибо за просмотр", "thanks for watching", "copyright", 
            "все права защищены", "all rights reserved",
            "перевод", "translated by", "синхронизация",
            "конец", "the end", "transcribed by", "audio", "sound",
            "подпишись", "subscribe", "лайк", "like"
        ];

        // If the text is very short and contains these words, nuke it.
        if (text.length < 50) {
            if (hallucinations.some(h => lower.includes(h))) {
                console.warn("Hallucination detected and blocked:", text);
                return "";
            }
        }

        // 3. Repeat Check (e.g. "A A A A A")
        if (/^(.{1,3})\1{4,}$/.test(text.replace(/\s/g, ''))) {
             return "";
        }
        
        return text;
        
    } catch (error) {
        console.error("Chat Transcription Error:", error);
        return "";
    }
};
