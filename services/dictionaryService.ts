
import { COMMON_WORDS_RU, COMMON_WORDS_EN } from '../data/dictionary';
import { Language } from '../types';

/**
 * Normalizes a word: removes punctuation, converts to lowercase.
 */
const normalizeWord = (word: string): string => {
  return word.toLowerCase().replace(/[.,!?;:()""''«»—]/g, '').trim();
};

/**
 * Checks if a word exists in the dictionary (Bilingual check).
 * Returns true if the word exists in EITHER Russian or English dictionary.
 */
export const isWordInDictionary = (word: string, language: Language): boolean => {
  const cleanWord = normalizeWord(word);
  if (!cleanWord) return true; // Empty or just punctuation is considered "known" to avoid flagging symbols

  // Simple numeric check
  if (!isNaN(Number(cleanWord))) return true;

  // Bilingual Check:
  // We check both dictionaries regardless of the 'language' parameter.
  // This allows typing English words while interface is in Russian without them being flagged as typos.
  return COMMON_WORDS_RU.has(cleanWord) || COMMON_WORDS_EN.has(cleanWord);
};

/**
 * Analyzes a text segment and returns ranges of UNKNOWN words.
 * Returns null if all words are known.
 */
export const findUnknownSegments = (text: string, language: Language): { text: string, start: number, end: number }[] | null => {
  // Easier approach: iterate words via regex matches
  const wordRegex = /[^ \t\n\r.,!?;:()""''«»—]+/g;
  
  const unknownRanges: { start: number, end: number }[] = [];
  let match;

  while ((match = wordRegex.exec(text)) !== null) {
    const word = match[0];
    const startIndex = match.index;
    const endIndex = startIndex + word.length;

    // RULE: Ignore words with 3 letters or less (prepositions, conjunctions, initials)
    if (word.length > 3 && !isWordInDictionary(word, language)) {
      unknownRanges.push({ start: startIndex, end: endIndex });
    }
  }

  if (unknownRanges.length === 0) return null;

  // Group adjacent unknown words into chunks.
  // If the gap between errors contains ONLY short words (<= 3 chars) or punctuation, merge them.
  const chunks: { text: string, start: number, end: number }[] = [];
  
  if (unknownRanges.length > 0) {
      let currentStart = unknownRanges[0].start;
      let currentEnd = unknownRanges[0].end;

      for (let i = 1; i < unknownRanges.length; i++) {
          const nextRange = unknownRanges[i];
          const gap = text.slice(currentEnd, nextRange.start);
          
          // Check if gap consists only of bridgeable content (short words <= 3 chars)
          const gapWords = gap.split(/[^a-zA-Zа-яА-ЯёЁ0-9]+/).filter(w => w.trim().length > 0);
          const isGapBridgeable = gapWords.every(w => w.length <= 3);

          // Heuristic: if gap is small (just a space) OR consists of short words, merge
          if (gap.length < 5 || isGapBridgeable) {
              currentEnd = nextRange.end;
          } else {
              // Push current group
              chunks.push({
                  text: text.slice(currentStart, currentEnd),
                  start: currentStart,
                  end: currentEnd
              });
              currentStart = nextRange.start;
              currentEnd = nextRange.end;
          }
      }
      // Push last group
      chunks.push({
          text: text.slice(currentStart, currentEnd),
          start: currentStart,
          end: currentEnd
      });
  }

  return chunks;
};
