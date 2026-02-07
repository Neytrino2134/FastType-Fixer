
// Standalone Worker for Dictionary Checks
// Receives dictionary data from the main thread to ensure consistency

const COMMON_WORDS_RU = new Set<string>();
const COMMON_WORDS_EN = new Set<string>();
const COMMON_WORDS_UZ_LATN = new Set<string>();
const COMMON_WORDS_UZ_CYRL = new Set<string>();

// Updated cleaner to support Uzbek apostrophes and extended Cyrillic
const cleanWord = (w: string) => w.toLowerCase().replace(/[^a-zA-Zа-яА-ЯёЁ0-9'‘`ʻғқҳўҒҚҲЎ]/g, '').trim();

const isWordInDictionary = (word: string): boolean => {
    const cleaned = cleanWord(word);
    if (!cleaned) return true; // Punctuation/Symbols -> OK
    if (!isNaN(Number(cleaned))) return true; // Numbers -> OK
    
    // Check all dictionaries (Multilingual support by default)
    if (COMMON_WORDS_RU.size > 0 && COMMON_WORDS_RU.has(cleaned)) return true;
    if (COMMON_WORDS_EN.size > 0 && COMMON_WORDS_EN.has(cleaned)) return true;
    if (COMMON_WORDS_UZ_LATN.size > 0 && COMMON_WORDS_UZ_LATN.has(cleaned)) return true;
    if (COMMON_WORDS_UZ_CYRL.size > 0 && COMMON_WORDS_UZ_CYRL.has(cleaned)) return true;

    return false;
};

self.onmessage = (e: MessageEvent) => {
    const { type, text, language, words } = e.data;

    if (type === 'SET_DICTIONARY') {
        let targetSet;
        if (language === 'ru') targetSet = COMMON_WORDS_RU;
        else if (language === 'en') targetSet = COMMON_WORDS_EN;
        else if (language === 'uz-latn') targetSet = COMMON_WORDS_UZ_LATN;
        else if (language === 'uz-cyrl') targetSet = COMMON_WORDS_UZ_CYRL;
        
        if (targetSet) {
            targetSet.clear();
            if (Array.isArray(words)) {
                words.forEach(w => targetSet.add(w));
            }
            console.log(`[Worker] Dictionary ${language} loaded with ${targetSet.size} words.`);
        }
        return;
    }

    if (type === 'CHECK_CHUNK') {
        if (!text) {
             self.postMessage({ type: 'CHECK_RESULT', unknownWords: [] });
             return;
        }

        // Expanded splitter to handle hyphens, slashes, underscores as separators
        // Note: For Uzbek, apostrophes are part of words, so we must NOT split by them unless they are clearly quotes.
        // This simple splitter might be imperfect for "O'zbek", treating ' as separate or not splitting.
        // However, standard tokenizer usually splits on non-word chars. 
        // We exclude ' ` ‘ ’ from being separators if they are inside words.
        
        const tokens = text.split(/([ \n\t.,!?;:()""«»—\-\/_+]+)/); 
        const unknownWords: string[] = [];

        for (const token of tokens) {
            if (!token.trim()) continue;
            // If token is just separators, skip
            if (/^[ \n\t.,!?;:()""«»—\-\/_+]+$/.test(token)) continue;

            // RULE: Ignore short words (1, 2, or 3 letters)
            if (token.length <= 3) continue;

            if (!isWordInDictionary(token)) {
                unknownWords.push(cleanWord(token));
            }
        }

        self.postMessage({ type: 'CHECK_RESULT', unknownWords });
    }
};
