
import { HologramCategory } from '../types';

export interface GeminiQuestion {
  text: string;
  category: HologramCategory;
}

export const questionsEn: GeminiQuestion[] = [
  // SPACE
  { text: "What defines the event horizon of a black hole?", category: "space" },
  { text: "Explain the Fermi Paradox and why we haven't found aliens.", category: "space" },
  { text: "How does time dilation work near light speed?", category: "space" },
  { text: "Describe the lifecycle of a neutron star.", category: "space" },
  { text: "What is the Great Attractor pulling us towards?", category: "space" },
  
  // PHILOSOPHY
  { text: "If a ship has all its parts replaced, is it still the same ship?", category: "philosophy" },
  { text: "Does free will exist in a deterministic universe?", category: "philosophy" },
  { text: "What is the nature of consciousness?", category: "philosophy" },
  { text: "Is reality a simulation?", category: "philosophy" },
  { text: "Define the concept of 'Retro-Futurism' philosophically.", category: "philosophy" },

  // MOTIVATIONAL / LIFE
  { text: "How does one find purpose in chaos?", category: "motivational" },
  { text: "Why is failure essential for growth?", category: "motivational" },
  { text: "Explain the concept of 'Flow State'.", category: "motivational" },
  { text: "How to maintain creative discipline?", category: "motivational" },

  // MUSIC / TECH
  { text: "How does a synthesizer generate sound from electricity?", category: "music" },
  { text: "Explain the aesthetic of Cyberpunk.", category: "interactive" },
  { text: "What is the history of Synthwave music?", category: "music" },
];

export const questionsRu: GeminiQuestion[] = [
  // SPACE
  { text: "Что определяет горизонт событий черной дыры?", category: "space" },
  { text: "Объясни Парадокс Ферми и почему мы не нашли пришельцев.", category: "space" },
  { text: "Как работает замедление времени на скорости света?", category: "space" },
  { text: "Опиши жизненный цикл нейтронной звезды.", category: "space" },
  { text: "Что такое Великий Аттрактор?", category: "space" },

  // PHILOSOPHY
  { text: "Если в корабле заменить все части, это тот же корабль?", category: "philosophy" },
  { text: "Существует ли свобода воли в детерминированной вселенной?", category: "philosophy" },
  { text: "В чем природа сознания?", category: "philosophy" },
  { text: "Является ли реальность симуляцией?", category: "philosophy" },
  { text: "Определи философию 'Ретро-футуризма'.", category: "philosophy" },

  // MOTIVATIONAL / LIFE
  { text: "Как найти цель в хаосе?", category: "motivational" },
  { text: "Почему неудачи важны для роста?", category: "motivational" },
  { text: "Объясни концепцию 'Состояния потока'.", category: "motivational" },
  { text: "Как поддерживать творческую дисциплину?", category: "motivational" },

  // MUSIC / TECH
  { text: "Как синтезатор создает звук из электричества?", category: "music" },
  { text: "В чем суть эстетики Киберпанка?", category: "interactive" },
  { text: "Расскажи историю жанра Synthwave.", category: "music" },
];

// FALLBACK ANSWERS (OFFLINE MODE)
export const offlineAnswersEn = [
    "Connection unstable. Accessing local archives: The universe is vast and full of mysteries.",
    "Neural link offline. Simulation: Music is the only truth.",
    "Data unavailable. Hypothesis: Reality is a construct of perception.",
    "System cooling... Cached thought: Creativity requires courage.",
    "Signal lost. Fallback: Stars are merely distant nuclear furnaces.",
    "Analyzing... Result: To be is to be perceived.",
    "Offline Mode. Remember: Entropy always increases.",
    "Bandwidth limit. Message: Stay focused on your path.",
    "Cloud unreachable. Local wisdom: Silence speaks volumes.",
    "Processing... Output: The future is unwritten."
];

export const offlineAnswersRu = [
    "Связь нестабильна. Локальный архив: Вселенная полна тайн.",
    "Нейросеть офлайн. Симуляция: Музыка — единственная истина.",
    "Нет данных. Гипотеза: Реальность — это конструкция восприятия.",
    "Охлаждение системы... Мысль из кэша: Творчество требует смелости.",
    "Сигнал потерян. Резерв: Звезды — это просто далекие ядерные печи.",
    "Анализ... Результат: Быть — значит быть воспринимаемым.",
    "Автономный режим. Помни: Энтропия всегда растет.",
    "Лимит канала. Сообщение: Сфокусируйся на своем пути.",
    "Облако недоступно. Мудрость: Тишина говорит громче слов.",
    "Обработка... Вывод: Будущее еще не написано."
];
