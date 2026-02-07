

/**
 * MINI-SCRIPTS: Fast, Regex-based corrections.
 * These run locally and instantly before AI processing to fix common formatting errors.
 */

export const runMiniScripts = (text: string): string => {
    if (!text) return text;

    let res = text;

    // 1. Remove spaces BEFORE punctuation
    // Example: "word ." -> "word."
    // Example: "word , word" -> "word, word"
    res = res.replace(/\s+([.,!?:;])/g, '$1');

    // 2. Add spaces AFTER punctuation (if missing)
    // Example: "word.Word" -> "word. Word"
    // Note: We deliberately exclude numbers (1.2) and time (12:30) via regex ranges.
    // Logic: Punctuation char -> followed by Letter (English or Russian).
    // This assumes words starting with a digit immediately after a dot are rare or intended (like versions).
    res = res.replace(/([.,!?:;])([a-zA-Zа-яА-ЯёЁ])/g, '$1 $2');

    // 3. Auto-Capitalization after sentence terminators
    // Example: "word. word" -> "word. Word"
    // Matches: (Separator + whitespace) -> (Lowercase letter)
    res = res.replace(/([.!?]\s+)([a-zа-яё])/g, (match, separator, letter) => {
        return separator + letter.toUpperCase();
    });
    
    // 4. Auto-Capitalization for the very first word
    // Matches: Start of text -> optional whitespace -> lowercase letter
    res = res.replace(/^(\s*)([a-zа-яё])/g, (match, space, letter) => {
        return space + letter.toUpperCase();
    });
    
    // 5. Double space removal
    // Example: "word  word" -> "word word"
    res = res.replace(/[ \t]{2,}/g, ' ');

    return res;
};