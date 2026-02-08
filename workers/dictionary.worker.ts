
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

// Levenshtein Distance Algorithm
const levenshteinDistance = (a: string, b: string): number => {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1  // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
};

const getSuggestions = (word: string, language: string): string[] => {
    const cleaned = cleanWord(word);
    if (cleaned.length < 3) return [];

    let targetSet: Set<string> | undefined;
    if (language === 'ru') targetSet = COMMON_WORDS_RU;
    else if (language === 'en') targetSet = COMMON_WORDS_EN;
    else if (language === 'uz-latn') targetSet = COMMON_WORDS_UZ_LATN;
    else if (language === 'uz-cyrl') targetSet = COMMON_WORDS_UZ_CYRL;

    // If specific language dict is empty or not selected, check all (or primary fallback)
    // For simplicity, if multilingual, we merge search or pick RU as default if others empty
    if (!targetSet || targetSet.size === 0) targetSet = COMMON_WORDS_RU;

    if (!targetSet || targetSet.size === 0) return [];

    const candidates: { word: string; dist: number }[] = [];
    const maxDist = 3; // Maximum allowed edits

    for (const dictWord of targetSet) {
        // Optimization 1: Length difference check
        if (Math.abs(dictWord.length - cleaned.length) > maxDist) continue;
        
        // Optimization 2: First letter check (optional, but speeds up massively)
        // We relax this for typo fixers, but for speed on 100k words it helps.
        // Let's rely on length first. If user swapped first letter, we might miss it with strict check.
        // Compromise: if word is long (>5), first letter usually matches.
        if (cleaned.length > 5 && dictWord[0] !== cleaned[0]) continue;

        const dist = levenshteinDistance(cleaned, dictWord);
        if (dist <= maxDist && dist > 0) { // dist > 0 because if it's 0 it's correct
            candidates.push({ word: dictWord, dist });
        }
    }

    // Sort by distance (asc) then length difference
    candidates.sort((a, b) => {
        if (a.dist !== b.dist) return a.dist - b.dist;
        return Math.abs(a.word.length - cleaned.length) - Math.abs(b.word.length - cleaned.length);
    });

    // Return top 3
    return candidates.slice(0, 3).map(c => c.word);
};

self.onmessage = async (e: MessageEvent) => {
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
        // Artificial delay for UI feedback (Yellow state)
        // Without this, local check is too fast (<5ms) for React to render "checking" state
        await new Promise(resolve => setTimeout(resolve, 80));

        if (!text) {
             self.postMessage({ type: 'CHECK_RESULT', unknownWords: [] });
             return;
        }
        
        const tokens = text.split(/([ \n\t.,!?;:()""«»—\-\/_+]+)/); 
        const unknownWords: string[] = [];

        for (const token of tokens) {
            if (!token.trim()) continue;
            if (/^[ \n\t.,!?;:()""«»—\-\/_+]+$/.test(token)) continue;
            if (token.length <= 3) continue;

            if (!isWordInDictionary(token)) {
                unknownWords.push(cleanWord(token));
            }
        }

        self.postMessage({ type: 'CHECK_RESULT', unknownWords });
    }

    if (type === 'GET_SUGGESTIONS') {
        const word = text; // Reuse text prop for the word
        const suggestions = getSuggestions(word, language);
        self.postMessage({ type: 'SUGGESTIONS_RESULT', suggestions, original: word });
    }
};
