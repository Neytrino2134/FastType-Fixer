
export interface TextBlock {
  text: string;
  start: number;
  end: number;
  isSeparator: boolean;
}

/**
 * Splits text into sentences and separators to allow granular processing.
 * Keeps track of indices to map back to the original string.
 */
export const splitIntoBlocks = (text: string): TextBlock[] => {
  // Regex looks for sentence terminators (. ! ?) followed by whitespace or end of string.
  // We capture the delimiter to include it in the sentence.
  // Complex lookahead/behind is avoided for performance and simplicity.
  
  const blocks: TextBlock[] = [];
  let currentStart = 0;
  
  // This regex matches a "sentence" chunk: 
  // Non-terminators, then one or more terminators, then optional trailing whitespace
  const sentenceRegex = /([^.!?]+[.!?]+(\s+|$))/g;
  
  let match;
  let lastIndex = 0;

  while ((match = sentenceRegex.exec(text)) !== null) {
      // If there was a gap (e.g. leading separators or weird characters not matched), handle it
      if (match.index > lastIndex) {
          const gap = text.slice(lastIndex, match.index);
          blocks.push({
              text: gap,
              start: lastIndex,
              end: match.index,
              isSeparator: true // Treat chunks without sentence structure as separators/fragments
          });
      }

      blocks.push({
          text: match[0],
          start: match.index,
          end: match.index + match[0].length,
          isSeparator: false
      });
      
      lastIndex = match.index + match[0].length;
  }

  // Handle remaining text (incomplete sentence at the end)
  if (lastIndex < text.length) {
      blocks.push({
          text: text.slice(lastIndex),
          start: lastIndex,
          end: text.length,
          isSeparator: false // It's content, just incomplete
      });
  }

  return blocks;
};

/**
 * Normalizes a sentence for storage in the finalized set.
 * Trims whitespace to be position-independent.
 */
export const normalizeBlock = (text: string): string => {
    return text.trim();
};
