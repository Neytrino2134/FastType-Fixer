import { useState, useCallback, useRef, useEffect } from 'react';
import { translateText } from '../services/translatorService';

export type TranslationDirection = 'ru-en' | 'en-ru';

export const useTranslator = (apiKey: string) => {
    const [inputText, setInputText] = useState('');
    const [outputText, setOutputText] = useState('');
    const [direction, setDirection] = useState<TranslationDirection>('en-ru');
    const [isLoading, setIsLoading] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const performTranslation = useCallback(async (text: string, dir: TranslationDirection) => {
        if (!text.trim()) {
            setOutputText('');
            return;
        }

        setIsLoading(true);
        try {
            const result = await translateText(text, dir, apiKey);
            setOutputText(result);
        } catch (e) {
            setOutputText("Error...");
        } finally {
            setIsLoading(false);
        }
    }, [apiKey]);

    // Handle Input Change with Debounce
    const handleInputChange = (text: string) => {
        setInputText(text);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!text.trim()) {
            setOutputText('');
            return;
        }

        debounceRef.current = setTimeout(() => {
            performTranslation(text, direction);
        }, 800); // 800ms wait
    };

    const toggleDirection = () => {
        setDirection(prev => {
            const newDir = prev === 'en-ru' ? 'ru-en' : 'en-ru';
            // If there is existing text, re-translate immediately with new direction logic
            // Optionally, we could swap input/output, but usually users just want to switch mode
            if (inputText) {
                performTranslation(inputText, newDir);
            }
            return newDir;
        });
    };

    const swapLanguages = () => {
         setDirection(prev => prev === 'en-ru' ? 'ru-en' : 'en-ru');
         // Swap text content
         const oldInput = inputText;
         const oldOutput = outputText;
         
         setInputText(oldOutput);
         // Trigger translation for the "new" input (which was the old output)
         performTranslation(oldOutput, direction === 'en-ru' ? 'ru-en' : 'en-ru');
    };

    const clearAll = () => {
        setInputText('');
        setOutputText('');
    };

    return {
        inputText,
        outputText,
        direction,
        isLoading,
        handleInputChange,
        toggleDirection,
        swapLanguages,
        clearAll
    };
};