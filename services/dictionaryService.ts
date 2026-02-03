
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
  // Regex to split by spaces but keep delimiters to calculate indices
  // We identify words.
  const regex = /([\s\S]+?)/g; 
  // Easier approach: iterate words via regex matches
  const wordRegex = /[^ \t\n\r.,!?;:()""''«»—]+/g;
  
  const unknownRanges: { start: number, end: number }[] = [];
  let match;

  while ((match = wordRegex.exec(text)) !== null) {
    const word = match[0];
    const startIndex = match.index;
    const endIndex = startIndex + word.length;

    if (!isWordInDictionary(word, language)) {
      unknownRanges.push({ start: startIndex, end: endIndex });
    }
  }

  if (unknownRanges.length === 0) return null;

  // Group adjacent unknown words into chunks to avoid too many API calls
  // e.g. "word (unknown) (unknown) word" -> 1 chunk
  const chunks: { text: string, start: number, end: number }[] = [];
  
  if (unknownRanges.length > 0) {
      let currentStart = unknownRanges[0].start;
      let currentEnd = unknownRanges[0].end;

      for (let i = 1; i < unknownRanges.length; i++) {
          const nextRange = unknownRanges[i];
          // If the gap between words is just whitespace/punctuation, merge them
          const gap = text.slice(currentEnd, nextRange.start);
          
          // Heuristic: if gap is small (just a space or two), merge
          if (gap.length < 3) {
              currentEnd = nextRange.end;
          } else {
              // Push current
              chunks.push({
                  text: text.slice(currentStart, currentEnd),
                  start: currentStart,
                  end: currentEnd
              });
              currentStart = nextRange.start;
              currentEnd = nextRange.end;
          }
      }
      // Push last
      chunks.push({
          text: text.slice(currentStart, currentEnd),
          start: currentStart,
          end: currentEnd
      });
  }

  return chunks;
};
