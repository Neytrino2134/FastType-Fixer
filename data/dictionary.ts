
import { Language } from "../types";

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

// Fallback for Uzbek Latin
const INITIAL_UZ_LATN = [
  "va", "bilan", "uchun", "bu", "bir", "deb", "da", "ni", "ki", "bo'lib", "ham", "o'z", "esa", "edi", "qilish", "kerak",
  "uni", "undan", "ular", "biz", "siz", "men", "u", "nima", "qanday", "qachon", "kim", "yer", "suv", "yaxshi", "yomon",
  "katta", "kichik", "ko'p", "oz", "assalomu", "alaykum", "rahmat", "xayr", "bugun", "ertaga"
];

// Fallback for Uzbek Cyrillic
const INITIAL_UZ_CYRL = [
  "ва", "билан", "учун", "бу", "бир", "деб", "да", "ни", "ки", "бўлиб", "ҳам", "ўз", "эса", "эди", "қилиш", "керак",
  "уни", "ундан", "улар", "биз", "сиз", "мен", "у", "нима", "қандай", "қачон", "ким", "ер", "сув", "яхши", "ёмон",
  "катта", "кичик", "кўп", "оз", "ассалому", "алайкум", "раҳмат", "хайр", "бугун", "эртага"
];

// Mutable sets that will be populated
export const COMMON_WORDS_RU = new Set<string>(INITIAL_RU);
export const COMMON_WORDS_EN = new Set<string>(INITIAL_EN);
export const COMMON_WORDS_UZ_LATN = new Set<string>(INITIAL_UZ_LATN);
export const COMMON_WORDS_UZ_CYRL = new Set<string>(INITIAL_UZ_CYRL);

// Helper to normalize words before adding
// STRICT CLEANING: Removes everything except letters, numbers, Uzbek apostrophe/okina, and extended Cyrillic characters.
// Added specific Cyrillic chars for Uzbek: ў, қ, ғ, ҳ
const cleanWord = (w: string) => w.toLowerCase().replace(/[^a-zA-Zа-яА-ЯёЁ0-9'‘`ʻғқҳўҒҚҲЎ]/g, '').trim();

export const getDictionaryStats = () => ({
  ruCount: COMMON_WORDS_RU.size,
  enCount: COMMON_WORDS_EN.size,
  uzLatnCount: COMMON_WORDS_UZ_LATN.size,
  uzCyrlCount: COMMON_WORDS_UZ_CYRL.size,
  ruLoaded: COMMON_WORDS_RU.size > 200, 
  enLoaded: COMMON_WORDS_EN.size > 200,
  uzLatnLoaded: COMMON_WORDS_UZ_LATN.size > 100,
  uzCyrlLoaded: COMMON_WORDS_UZ_CYRL.size > 100
});

/**
 * Loads external dictionary files from the /public/dictionaries folder.
 * This should be called during the App Loading phase.
 */
export const loadDictionaries = async () => {
  console.log("Starting dictionary load...");
  
  // Generic loader helper
  const loadSet = async (path: string, set: Set<string>, name: string) => {
      try {
          const res = await fetch(path);
          if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data)) {
                  data.forEach(w => {
                      if (typeof w === 'string') set.add(cleanWord(w));
                      else if (w.word && typeof w.word === 'string') set.add(cleanWord(w.word));
                  });
              }
              console.log(`Loaded ${name} Dictionary: ${set.size} words`);
          }
      } catch (e) {
          // Silent fail for optional dicts to keep console clean if file missing
          // console.warn(`Dictionary ${name} not found or invalid.`);
      }
  };

  try {
    // Parallel loading
    await Promise.all([
        loadSet('./dictionaries/en/oxford-3000.json', COMMON_WORDS_EN, 'EN'),
        loadSet('./dictionaries/ru/dictionary.json', COMMON_WORDS_RU, 'RU'),
        loadSet('./dictionaries/uz-latn/dictionary.json', COMMON_WORDS_UZ_LATN, 'UZ-LATN'),
        loadSet('./dictionaries/uz-cyrl/dictionary.json', COMMON_WORDS_UZ_CYRL, 'UZ-CYRL')
    ]);

    // Fallback for RU CSVs if JSON missing (Legacy support)
    if (COMMON_WORDS_RU.size < 200) {
        const ruFiles = ['nouns.csv', 'adjectives.csv', 'verbs.csv', 'others.csv'];
        for (const file of ruFiles) {
            try {
                const res = await fetch(`./dictionaries/ru/${file}`);
                if (!res.ok) continue;
                const text = await res.text();
                const lines = text.split('\n');
                for (const line of lines) {
                    if (!line.trim()) continue;
                    const parts = line.split(/[\t,;]/);
                    const rawWord = parts[0];
                    if (rawWord && rawWord.length > 1) {
                        const word = cleanWord(rawWord);
                        if (word) COMMON_WORDS_RU.add(word);
                    }
                }
            } catch (e) {}
        }
    }

  } catch (error) {
    console.error("Critical error loading dictionaries:", error);
  }
};
