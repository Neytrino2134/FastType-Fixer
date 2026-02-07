
import { COMMON_WORDS_RU, COMMON_WORDS_EN, COMMON_WORDS_UZ_LATN, COMMON_WORDS_UZ_CYRL } from '../data/dictionary';
import { Language } from '../types';

/**
 * Normalizes a word: removes punctuation, converts to lowercase.
 * Keeps Uzbek apostrophes and extended Cyrillic.
 */
const normalizeWord = (word: string): string => {
  return word.toLowerCase().replace(/[.,!?;:()""«»—]/g, '').trim();
};

/**
 * Checks if a word exists in ANY loaded dictionary.
 */
export const isWordInDictionary = (word: string, language: Language): boolean => {
  const cleanWord = normalizeWord(word);
  if (!cleanWord) return true; 

  // Simple numeric check
  if (!isNaN(Number(cleanWord))) return true;

  // Multilingual Check:
  return (
      COMMON_WORDS_RU.has(cleanWord) || 
      COMMON_WORDS_EN.has(cleanWord) ||
      COMMON_WORDS_UZ_LATN.has(cleanWord) ||
      COMMON_WORDS_UZ_CYRL.has(cleanWord)
  );
};

/**
 * Analyzes a text segment and returns ranges of UNKNOWN words.
 * Returns null if all words are known.
 */
export const findUnknownSegments = (text: string, language: Language): { text: string, start: number, end: number }[] | null => {
  // Regex matches chunks that are NOT separators.
  // We include ' ` ‘ ’ inside words for Uzbek logic implicitly by excluding them from the separator list.
  const wordRegex = /[^ \t\n\r.,!?;:()""«»—]+/g;
  
  const unknownRanges: { start: number, end: number }[] = [];
  let match;

  while ((match = wordRegex.exec(text)) !== null) {
    const word = match[0];
    const startIndex = match.index;
    const endIndex = startIndex + word.length;

    // RULE: Ignore words with 3 letters or less
    if (word.length > 3 && !isWordInDictionary(word, language)) {
      unknownRanges.push({ start: startIndex, end: endIndex });
    }
  }

  if (unknownRanges.length === 0) return null;

  // Group adjacent unknown words into chunks.
  const chunks: { text: string, start: number, end: number }[] = [];
  
  if (unknownRanges.length > 0) {
      let currentStart = unknownRanges[0].start;
      let currentEnd = unknownRanges[0].end;

      for (let i = 1; i < unknownRanges.length; i++) {
          const nextRange = unknownRanges[i];
          const gap = text.slice(currentEnd, nextRange.start);
          
          // Allow merging across small gaps or short words
          // Allow apostrophes/extended chars in gap words check too
          const gapWords = gap.split(/[^a-zA-Zа-яА-ЯёЁ0-9'‘`ʻғқҳўҒҚҲЎ]+/).filter(w => w.trim().length > 0);
          const isGapBridgeable = gapWords.every(w => w.length <= 3);

          if (gap.length < 5 || isGapBridgeable) {
              currentEnd = nextRange.end;
          } else {
              chunks.push({
                  text: text.slice(currentStart, currentEnd),
                  start: currentStart,
                  end: currentEnd
              });
              currentStart = nextRange.start;
              currentEnd = nextRange.end;
          }
      }
      chunks.push({
          text: text.slice(currentStart, currentEnd),
          start: currentStart,
          end: currentEnd
      });
  }

  return chunks;
};
