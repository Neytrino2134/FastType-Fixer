

// Standalone Worker for Dictionary Checks
// Receives dictionary data from the main thread to ensure consistency

const COMMON_WORDS_RU = new Set<string>();
const COMMON_WORDS_EN = new Set<string>();

const cleanWord = (w: string) => w.toLowerCase().replace(/[^a-zA-Zа-яА-ЯёЁ0-9]/g, '').trim();

const isWordInDictionary = (word: string): boolean => {
    const cleaned = cleanWord(word);
    if (!cleaned) return true; // Punctuation/Symbols -> OK
    if (!isNaN(Number(cleaned))) return true; // Numbers -> OK
    
    // Check both (Bilingual)
    if (COMMON_WORDS_RU.size > 0 && COMMON_WORDS_RU.has(cleaned)) return true;
    if (COMMON_WORDS_EN.size > 0 && COMMON_WORDS_EN.has(cleaned)) return true;

    return false;
};

self.onmessage = (e: MessageEvent) => {
    const { type, text, language, words } = e.data;

    if (type === 'SET_DICTIONARY') {
        const targetSet = language === 'ru' ? COMMON_WORDS_RU : COMMON_WORDS_EN;
        targetSet.clear();
        if (Array.isArray(words)) {
            words.forEach(w => targetSet.add(w));
        }
        console.log(`[Worker] Dictionary ${language} loaded with ${targetSet.size} words.`);
        return;
    }

    if (type === 'CHECK_CHUNK') {
        // Return boolean: Does this chunk have errors?
        if (!text) {
             self.postMessage({ type: 'CHECK_RESULT', hasErrors: false });
             return;
        }

        const tokens = text.split(/([ \n\t.,!?;:()""''«»—]+)/);
        let hasErrors = false;

        for (const token of tokens) {
            if (!token.trim()) continue;
            // If token is just separators, skip
            if (/^[ \n\t.,!?;:()""''«»—]+$/.test(token)) continue;

            if (!isWordInDictionary(token)) {
                hasErrors = true;
                break;
            }
        }

        self.postMessage({ type: 'CHECK_RESULT', hasErrors });
    }
};