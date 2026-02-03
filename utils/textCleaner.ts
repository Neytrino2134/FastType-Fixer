

import { NOISE_HALLUCINATIONS, FILLER_WORDS } from '../data/noiseDictionary';
import { Language } from '../types';

// Helper to escape regex characters
const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Removes audio hallucinations (short noises, single letters, AI artifacts).
 * Used immediately after transcription.
 */
export const cleanAudioHallucinations = (text: string, language: Language): string => {
  if (!text) return "";
  
  let cleaned = text;
  const noises = language === 'ru' ? NOISE_HALLUCINATIONS.ru : NOISE_HALLUCINATIONS.en;

  // 1. Remove exact matches (trimmed)
  const lower = cleaned.trim().toLowerCase().replace(/[.,!?;:]/g, ''); // Strip punctuation for check
  if (noises.includes(lower)) {
    return "";
  }

  // 2. Remove specific noise patterns inside text
  // We look for standalone words/phrases wrapped in punctuation or spaces
  noises.forEach(noise => {
    // Regex matches: Start of line or non-word char -> noise -> non-word char or end of line
    const regex = new RegExp(`(^|[^a-zA-Zа-яА-ЯёЁ])${escapeRegExp(noise)}($|[^a-zA-Zа-яА-ЯёЁ])`, 'gi');
    cleaned = cleaned.replace(regex, '$1$2').replace(/\s+/g, ' ');
  });

  // 3. Remove single letters that are often hallucinations (except 'я', 'a', 'i')
  // e.g. "м", "т"
  const singleLetterRegex = language === 'ru' 
    ? /(^|\s)([^явукоискв])(\s|$)/gi  // allow common Russian prepositions/pronouns
    : /(^|\s)([^ai])(\s|$)/gi;        // allow 'a', 'I'

  cleaned = cleaned.replace(singleLetterRegex, ' ');

  return cleaned.trim();
};

/**
 * Removes conversational filler words.
 * Used during finalization/enhancement.
 */
export const removeFillers = (text: string, language: Language): string => {
  if (!text) return "";
  
  let cleaned = text;
  const fillers = language === 'ru' ? FILLER_WORDS.ru : FILLER_WORDS.en;

  fillers.forEach(filler => {
    // Case insensitive, ensure whole word matching
    const regex = new RegExp(`(^|[^a-zA-Zа-яА-ЯёЁ])${escapeRegExp(filler)}($|[^a-zA-Zа-яА-ЯёЁ])`, 'gi');
    cleaned = cleaned.replace(regex, '$1$2');
  });

  // Clean up double spaces created by removal
  return cleaned.replace(/\s+/g, ' ').trim();
};

/**
 * STRICT CLEANER for Gemini Text Correction
 * Removes "Thinking" artifacts, debug info like "(remove)", bullet points, etc.
 */
export const cleanGeminiResponse = (text: string): string => {
  if (!text) return "";

  // 1. If the text contains bullet points or reasoning markers, try to extract the last valid line or clean it.
  // Example artifact: "* "допусти" is the winner."
  
  // Remove lines starting with * or -
  let lines = text.split('\n');
  lines = lines.filter(line => !/^\s*[\*\-]\s/.test(line));
  
  // If we filtered everything, fallback to original but strip markers
  if (lines.length === 0) {
      lines = text.split('\n').map(l => l.replace(/^\s*[\*\-]\s/, ''));
  }

  let cleaned = lines.join(' ').trim();

  // 2. Remove parenthetical debug info like "(remove)", "(2 removals)", "(insert)"
  cleaned = cleaned.replace(/\([a-zA-Z\s\d]+\)/g, '');

  // 3. Remove weird equation-like debugs "и=и"
  cleaned = cleaned.replace(/\b\w+=\w+\b/g, '');

  // 4. Remove "Wait, ..." reasoning if it appears at start
  cleaned = cleaned.replace(/^Wait,.*?:/i, '');

  // 5. Final cleanup of double spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
};


/**
 * Enforces proper spacing after punctuation marks.
 * Checks the entire text string, but respects numbers/decimals.
 */
export const ensureProperSpacing = (text: string): string => {
  if (!text) return "";
  
  // 1. Periods, Commas, Colons, Semicolons followed by a Letter
  // This logic adds a space ONLY if followed by a letter, preventing breakage of:
  // - Decimals/Versions: "3.14", "v1.2", "1,5кг"
  // - Time: "12:30"
  // Covers: "word.Word" -> "word. Word", "one,two" -> "one, two"
  let processed = text.replace(/([.,:;])([a-zA-Zа-яА-ЯёЁ])/g, '$1 $2');

  // 2. Question and Exclamation marks followed by Letter or Number
  // Allows spacing if followed by a digit too, since ?! rarely appear in numbers.
  // Covers: "Really?Yes", "Go!1"
  // Skips: "?!" (punctuation sequence), "..." (ellipsis)
  processed = processed.replace(/([?!])([a-zA-Zа-яА-ЯёЁ0-9])/g, '$1 $2');

  return processed;
};

/**
 * Removes spaces BEFORE punctuation marks on the fly.
 * Transforms "word , word" -> "word, word".
 */
export const formatPunctuationOnTheFly = (text: string): string => {
  if (!text) return "";
  // Remove one or more spaces immediately followed by .,!?:;
  // Does not affect the space AFTER the punctuation.
  return text.replace(/\s+([.,!?:;])/g, '$1');
};
