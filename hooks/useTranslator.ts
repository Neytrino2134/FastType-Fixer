
import { useState, useCallback, useRef } from 'react';
import { translateText } from '../services/translatorService';
import { Language } from '../types';

export const useTranslator = (apiKey: string) => {
    const [inputText, setInputText] = useState('');
    const [outputText, setOutputText] = useState('');
    
    // Independent language state
    const [sourceLang, setSourceLang] = useState<string>('en');
    const [targetLang, setTargetLang] = useState<string>('ru');
    
    const [isLoading, setIsLoading] = useState(false);
    const [isLive, setIsLive] = useState(true); // New: Live Translation Toggle

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const performTranslation = useCallback(async (text: string, src: string, tgt: string) => {
        if (!text.trim()) {
            setOutputText('');
            return;
        }

        if (src === tgt) {
            setOutputText(text); // No translation needed
            return;
        }

        setIsLoading(true);
        
        try {
            const result = await translateText(text, src, tgt, apiKey);
            setOutputText(result);
        } catch (e) {
            console.error("Translation Hook Error:", e);
            setOutputText("Error: Could not translate.");
        } finally {
            setIsLoading(false);
        }
    }, [apiKey]);

    // Handle Input Change with Debounce
    const handleInputChange = useCallback((text: string, force: boolean = false) => {
        setInputText(text);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!text.trim()) {
            setOutputText('');
            return;
        }

        // Only translate if Live or Forced
        if (isLive || force) {
            debounceRef.current = setTimeout(() => {
                performTranslation(text, sourceLang, targetLang);
            }, 800); // 800ms wait
        }
    }, [isLive, sourceLang, targetLang, performTranslation]);

    // Manual Trigger (for the "Send" button when paused)
    const triggerTranslation = useCallback(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        performTranslation(inputText, sourceLang, targetLang);
    }, [inputText, sourceLang, targetLang, performTranslation]);

    const toggleLive = useCallback(() => {
        setIsLive(prev => !prev);
    }, []);

    // Handle manual language change
    const changeSourceLang = useCallback((lang: string) => {
        setSourceLang(lang);
        // If live, translate immediately on lang change
        if (isLive && inputText) performTranslation(inputText, lang, targetLang);
    }, [isLive, inputText, targetLang, performTranslation]);

    const changeTargetLang = useCallback((lang: string) => {
        setTargetLang(lang);
        // If live, translate immediately on lang change
        if (isLive && inputText) performTranslation(inputText, sourceLang, lang);
    }, [isLive, inputText, sourceLang, performTranslation]);

    const swapLanguages = useCallback(() => {
         const newSource = targetLang;
         const newTarget = sourceLang;
         
         setSourceLang(newSource);
         setTargetLang(newTarget);
         
         const oldInput = inputText;
         const oldOutput = outputText;
         
         // If output exists, behave like a standard swap (Output -> Input).
         // If output is empty, keep existing Input (Input remains Input), just swap languages.
         if (oldOutput && oldOutput.trim().length > 0) {
             setInputText(oldOutput);
             performTranslation(oldOutput, newSource, newTarget);
         } else {
             // Keep input, re-translate with new direction
             performTranslation(oldInput, newSource, newTarget);
         }
    }, [targetLang, sourceLang, inputText, outputText, performTranslation]);

    const clearAll = useCallback(() => {
        setInputText('');
        setOutputText('');
    }, []);

    return {
        inputText,
        setInputText,
        outputText,
        sourceLang,
        targetLang,
        isLoading,
        isLive,
        setIsLive,
        handleInputChange,
        triggerTranslation,
        toggleLive,
        changeSourceLang,
        changeTargetLang,
        swapLanguages,
        clearAll
    };
};
