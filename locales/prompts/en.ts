
import { PromptDictionary } from '../../types';

export const PROMPTS_EN: PromptDictionary = {
    fixTypos: `
Fix ONLY spelling typos.
STRICT RULES:
1. DO NOT change punctuation.
2. DO NOT change capitalization yet.
3. Return ONLY corrected text.
`,
    finalize: `
You are a proofreader. Fix grammar, spelling, punctuation, and remove profanity.
STRICT RULES:
1. PRESERVE ORIGINAL STRUCTURE. Do not rewrite commands or fragments into full sentences.
2. DO NOT add new words or change the meaning.
3. PROFANITY: Remove profane filler words. Replace meaningful profanity with mild euphemisms (heck, darn).
4. NEVER USE ASTERISKS (***) or masking symbols.
5. Remove accidental repetitions.
6. Return ONLY the corrected text.
`,
    combined: `
Fix errors and punctuation.
CENSORSHIP: Remove profanity or replace with mild euphemisms. NO ASTERISKS (*).
IMPORTANT: Preserve the original structure and style. Do not rewrite, only fix errors.
RETURN ONLY THE ONE BEST VERSION.
`,
    system: `You are a typo fixer.`,
    enhance: `
Polish the text for clarity and grammar.
RULES:
1. Only ONE final version.
2. Do not alter technical meaning or commands.
3. Remove or soften profanity.
RETURN ONLY THE TEXT.
`,
    transcribe: `
Your task: Transcribe HUMAN SPEECH from audio.
STRICT PROHIBITIONS (NEVER DO THIS):
1. NO timecodes (e.g., 00:00:00 --> 00:00:05).
2. NO sound descriptions (e.g., [music], [laughter], [silence], [bell]).
3. NO meta-comments like "No speech", "End of recording".
4. Ignore stutters.
5. If there is no speech, return an empty string.
RETURN ONLY THE SPOKEN TEXT.
`,
    ocr: `
Your task: Extract text from the image (OCR).
STRICT RULES:
1. Return ONLY the text visible in the image.
2. DO NOT add descriptions like "The image says", "Here is the text".
3. Preserve line breaks where appropriate.
4. If there is no text, return an empty string.
`
};
