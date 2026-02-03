

// Standalone Worker for Dictionary Checks
// Receives dictionary data from the main thread to ensure consistency

const COMMON_WORDS_RU = new Set<string>();
const COMMON_WORDS_EN = new Set<string>();

// Helper to clean words
// STRICT CLEANING: Matches data/dictionary.ts
const cleanWord = (w: string) => w.toLowerCase().replace(/[^a-zA-Zа-яА-ЯёЁ0-9]/g, '').trim();

const isWordInDictionary = (word: string): boolean => {
    const cleaned = cleanWord(word);
    if (!cleaned) return true; // Punctuation/Symbols are "valid"
    if (!isNaN(Number(cleaned))) return true; // Numbers are "valid"
    
    // BILINGUAL CHECK STRATEGY:
    // If a word exists in EITHER dictionary, we consider it "Valid" (Orange).
    // This prevents the AI from trying to fix valid English words inside Russian text and vice versa.
    
    if (COMMON_WORDS_RU.size > 0 && COMMON_WORDS_RU.has(cleaned)) return true;
    if (COMMON_WORDS_EN.size > 0 && COMMON_WORDS_EN.has(cleaned)) return true;

    return false;
};

self.onmessage = (e: MessageEvent) => {
    const { type, text, language, processedLength, words } = e.data;

    if (type === 'SET_DICTIONARY') {
        const targetSet = language === 'ru' ? COMMON_WORDS_RU : COMMON_WORDS_EN;
        targetSet.clear();
        if (Array.isArray(words)) {
            words.forEach(w => targetSet.add(w));
        }
        return;
    }

    if (type === 'CHECK_TEXT') {
        if (!text) {
             self.postMessage({ type: 'CHECK_RESULT', validatedLength: processedLength, checkedLength: processedLength });
             return;
        }

        // We check text starting from processedLength
        const remainingText = text.slice(processedLength);
        
        // Split by separators.
        // NOTE: We include standard hyphens in the 'word' for tokenization to keep "something-like-this" together for now,
        // but cleanWord will strip them for dictionary lookup.
        // This ensures "text-text" is checked as "texttext" against the dictionary.
        const tokens = remainingText.split(/([ \n\t.,!?;:()""''«»—]+)/);
        
        let localValidatedLength = 0;
        let localCheckedLength = 0;
        let scanBroken = false; // Flag to stop advancing validatedLength once we hit an error

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            
            if (token.length === 0) continue;

            const isSeparator = /^[ \n\t.,!?;:()""''«»—]+$/.test(token);
            
            // LOGIC:
            // 1. If it's a separator, it's always "checked" and "valid".
            // 2. If it's a word:
            //    - Check dictionary.
            //    - If Valid: Advance `checkedLength`. Advance `validatedLength` ONLY if we haven't broken the chain yet.
            //    - If Invalid: Advance `checkedLength`. Stop advancing `validatedLength`. Set scanBroken = true.
            
            // SPECIAL CASE: The last token (Active Typing).
            // If the last token is a word (not separator) and we are at the end of the string,
            // we consider it "Gray" (Typing). We do NOT include it in Checked/Red state yet.
            const isLastToken = (i === tokens.length - 1);

            if (isSeparator) {
                localCheckedLength += token.length;
                if (!scanBroken) localValidatedLength += token.length;
            } else {
                // Word Check
                if (isLastToken) {
                    // Stop scanning here. This is the "Gray" zone (user is still typing this word).
                    break; 
                }

                if (isWordInDictionary(token)) {
                    localCheckedLength += token.length;
                    if (!scanBroken) localValidatedLength += token.length;
                } else {
                    // UNKNOWN WORD -> RED
                    localCheckedLength += token.length;
                    scanBroken = true; // Stop the Orange frontier
                }
            }
        }

        self.postMessage({ 
            type: 'CHECK_RESULT', 
            validatedLength: processedLength + localValidatedLength, // Orange End
            checkedLength: processedLength + localCheckedLength // Red End
        });
    }
};
