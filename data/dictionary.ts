

// Initial fallback sets (kept small for immediate startup)
const INITIAL_RU = [
  "и", "в", "не", "на", "я", "быть", "он", "с", "что", "а", "по", "это", "она", "этот", "к", "но", "они", "мы", "как", "из",
  "у", "который", "то", "за", "свой", "что", "весь", "год", "от", "так", "о", "для", "ты", "же", "все", "тот", "мочь", "вы",
  "человек", "такой", "его", "сказать", "только", "или", "еще", "бы", "себя", "один", "как", "уже", "до", "время", "если",
  "сам", "когда", "другой", "вот", "говорить", "наш", "мой", "знать", "стать", "при", "чтобы", "дело", "жизнь", "кто",
  "первый", "очень", "два", "день", "ее", "новый", "рука", "даже", "во", "со", "раз", "где", "там", "под", "можно", "ну",
  "глаз", "ли", "после", "слово", "идти", "большой", "здесь", "место", "иметь", "ничто", "тогда", "видеть", "привет", "дела",
  "хорошо", "да", "нет", "спасибо", "пожалуйста", "нормально", "пока", "сегодня", "завтра", "сейчас"
];

const INITIAL_EN = [
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
  "this", "but", "his", "by", "from", "they", "we", "say", "her", "she", "or", "an", "will", "my", "one", "all", "would", "there",
  "their", "what", "so", "up", "out", "if", "about", "who", "get", "which", "go", "me", "when", "make", "can", "like", "time", "no",
  "just", "him", "know", "take", "people", "into", "year", "your", "good", "some", "could", "them", "see", "other", "than", "then",
  "now", "look", "only", "come", "its", "over", "think", "also", "back", "after", "use", "two", "how", "our", "work", "first", "well",
  "way", "even", "new", "want", "because", "any", "these", "give", "day", "most", "us", "hello", "hi", "ok", "yes", "thanks"
];

// Mutable sets that will be populated
export const COMMON_WORDS_RU = new Set<string>(INITIAL_RU);
export const COMMON_WORDS_EN = new Set<string>(INITIAL_EN);

// Helper to normalize words before adding
// STRICT CLEANING: Removes everything except letters and numbers. 
// "word-word" -> "wordword", "word." -> "word"
const cleanWord = (w: string) => w.toLowerCase().replace(/[^a-zA-Zа-яА-ЯёЁ0-9]/g, '').trim();

export const getDictionaryStats = () => ({
  ruCount: COMMON_WORDS_RU.size,
  enCount: COMMON_WORDS_EN.size,
  ruLoaded: COMMON_WORDS_RU.size > 200, // Threshold above initial fallback (96 words)
  enLoaded: COMMON_WORDS_EN.size > 200   // Threshold above initial fallback (96 words)
});

/**
 * Loads external dictionary files from the /public/dictionaries folder.
 * This should be called during the App Loading phase.
 */
export const loadDictionaries = async () => {
  console.log("Starting dictionary load...");
  
  try {
    // 1. Load English (JSON format expected based on oxford-3000.json)
    try {
        const res = await fetch('./dictionaries/en/oxford-3000.json');
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                data.forEach((w: any) => {
                    if (typeof w === 'string') COMMON_WORDS_EN.add(cleanWord(w));
                    else if (w.word && typeof w.word === 'string') COMMON_WORDS_EN.add(cleanWord(w.word));
                });
            } else if (typeof data === 'object') {
                Object.keys(data).forEach(w => COMMON_WORDS_EN.add(cleanWord(w)));
            }
            console.log(`Loaded English Dictionary: ${COMMON_WORDS_EN.size} words`);
        }
    } catch (e) {
        console.warn("Error parsing EN dictionary:", e);
    }

    // 2. Load Russian
    // Priority: Try to load the optimized JSON first (created by the script).
    // If not found, fallback to CSV parsing (legacy support).
    try {
        const resJson = await fetch('./dictionaries/ru/dictionary.json');
        if (resJson.ok) {
             const data = await resJson.json();
             if (Array.isArray(data)) {
                 data.forEach(w => COMMON_WORDS_RU.add(cleanWord(w)));
                 console.log(`⚡ Loaded Optimized RU Dictionary: ${data.length} words`);
                 return; // Success! Skip CSV parsing.
             }
        }
    } catch (e) {
        console.log("Optimized dictionary.json not found, falling back to CSVs...");
    }

    // Fallback: CSV Parsing (slower, but works if script wasn't run)
    const ruFiles = ['nouns.csv', 'adjectives.csv', 'verbs.csv', 'others.csv'];
    
    for (const file of ruFiles) {
        try {
            const res = await fetch(`./dictionaries/ru/${file}`);
            if (!res.ok) continue;

            const text = await res.text();
            const lines = text.split('\n');
            let count = 0;
            
            for (const line of lines) {
                if (!line.trim()) continue;
                // Basic CSV/TSV parser
                const parts = line.split(/[\t,;]/);
                const rawWord = parts[0];
                
                if (rawWord && rawWord.length > 1) {
                    const word = cleanWord(rawWord);
                    if (word && /[а-яё]/i.test(word)) {
                        COMMON_WORDS_RU.add(word);
                        count++;
                    }
                }
            }
            console.log(`Loaded RU file ${file}: added ${count} words`);
        } catch (e) {
            console.warn(`Error loading RU file ${file}:`, e);
        }
    }

    console.log(`Total RU Dictionary: ${COMMON_WORDS_RU.size} words`);

  } catch (error) {
    console.error("Critical error loading dictionaries:", error);
  }
};
