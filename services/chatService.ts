import { GoogleGenAI, Content, Part } from "@google/genai";
import { Language, ChatMessage, Attachment } from "../types";

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
    // Convert ChatMessage[] to valid Content[] for the API.
    // Rules:
    // 1. Roles must alternate (User -> Model -> User).
    // 2. Cannot start with 'model'.
    // 3. Cannot end with 'user' (because we are about to send a new 'user' message).
    
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

    // Rule 3: History cannot end with 'user' before we send another 'user' message.
    // If it does, we must merge the last user message with the new one (conceptually),
    // BUT since we are using `chat.sendMessageStream`, the SDK handles the "next" message.
    // We just need to make sure `history` passed to `chats.create` doesn't have a trailing user message *unless* the model expects to continue.
    // However, Gemini SDK is smart. Usually, we just pass history up to the last point. 
    // To be safe, if the last message in history is USER, we remove it from `history` config and PREPEND it to our `newMessage`.
    
    // Construct the NEW message parts
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

    // Handle trailing user message in history
    if (validHistory.length > 0 && validHistory[validHistory.length - 1].role === 'user') {
        const lastUserContent = validHistory.pop(); // Remove it from history configuration
        
        // Prepend previous user parts to current message parts to effectively "merge" them
        if (lastUserContent && lastUserContent.parts) {
            currentMessageParts.unshift(...lastUserContent.parts);
        }
    }

    try {
        // Initialize Chat Session
        const chat = ai.chats.create({
            model: model,
            history: validHistory,
            config: {
                systemInstruction: getSystemInstruction(language),
                temperature: 0.7, 
            }
        });
        
        // Send Message
        // FIX: Pass currentMessageParts array directly to message property
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
 * Uses Gemini 3 Flash for consistency.
 */
export const transcribeChatAudio = async (apiKey: string, base64Audio: string, mimeType: string, language: Language): Promise<string> => {
    if (!apiKey) throw new Error("API Key Missing");
    const ai = new GoogleGenAI({ apiKey });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview', 
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64Audio } }
                ]
            },
            config: {
                systemInstruction: language === 'ru' 
                    ? "Транскрибируй аудио. Только текст того, что сказано." 
                    : "Transcribe the audio. Only the spoken text.",
                temperature: 0.1
            }
        });

        return response.text?.trim() || "";
    } catch (error) {
        console.error("Chat Transcription Error:", error);
        return "";
    }
};