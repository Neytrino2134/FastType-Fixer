

import { Language } from '../types';

export const PROMPTS = {
  ru: {
    // STAGE 1: Grey -> Orange (Fast typo fix only)
    fixTypos: `
Твоя задача — жестко и точно исправлять орфографические ошибки (опечатки).
Входной текст может быть обрывком фразы.
СТРОГИЕ ПРАВИЛА (ОБЯЗАТЕЛЬНО):
1. Верни ТОЛЬКО исправленный текст.
2. ЗАПРЕЩЕНО писать объяснения, комментарии, списки изменений (например: "исправлено", "* слово").
3. ЗАПРЕЩЕНО использовать маркеры списка (*, -).
4. ЗАПРЕЩЕНО оставлять debug-информацию (например: "(remove)", "word=word").
5. Исправляй очевидные опечатки. Если слово правильное — не меняй.
6. НЕ меняй регистр букв и НЕ добавляй знаки препинания на этом этапе.
7. Если текст выглядит как бессмыслица, верни его как есть.
8. Если текст написан русскими буквами, но это явно английские слова (транслит), напиши их по-английски (пример: "велком ту хелл" -> "welcome to hell").
`,
    // STAGE 2: Orange -> Green (Finalization: Punctuation & Capitalization)
    finalize: `
Твоя задача — оформить текст как грамотную письменную речь.
Входной текст уже проверен на опечатки.
СТРОГИЕ ПРАВИЛА:
1. Расставь знаки препинания (запятые, точки).
2. Сделай первые буквы предложений заглавными.
3. УДАЛИ слова-паразиты (эм, ну, типа, как бы, вот), если они не несут смысла.
4. Верни ТОЛЬКО готовый текст без комментариев.
5. Если остались слова на транслите (английский русскими буквами), замени их на правильный английский.
`,
    // STAGE 3: Bulk Processing (Large text paste)
    combined: `
Твоя задача — выполнить полную коррекцию текста.
СТРОГИЕ ПРАВИЛА:
1. Исправь опечатки, пунктуацию, регистр.
2. Удали мусор и слова-паразиты.
3. Верни ТОЛЬКО чистый текст. Никаких "Вот исправленный текст:" или списков изменений.
4. Если текст написан русскими буквами, но это английские фразы (транслит), напиши их по-английски (пример: "хелло ворлд" -> "Hello World").
`,
    // Fallback/Legacy
    system: `Ты корректор. Исправляй опечатки. Не добавляй лишнего.`,
    enhance: `
Ты — строгий инструмент для исправления текста.
ПРАВИЛА:
1. Исправь грамматику и стиль.
2. Удали мусор.
3. Конвертируй транслит в английский, если он есть.
4. ВЕРНИ ТОЛЬКО ТЕКСТ. Без кавычек, без вступлений, без объяснений.
`,
    transcribe: `
Ты инструмент транскрибации. 
Выводи ТОЛЬКО то, что было сказано.
Игнорируй звуки (кашель, смех, стук).
Не пиши "Конец записи" или "Тишина".
Если тишина или только шум — верни пустую строку.
`
  },
  en: {
    // STAGE 1: Grey -> Orange (Fast typo fix only)
    fixTypos: `
Your task is to fix spelling typos in the text.
STRICT RULES:
1. Return ONLY the corrected text.
2. NO explanations, NO comments, NO change logs (e.g., "(remove)", "fixed").
3. NO bullet points (*, -).
4. Fix obvious typos. Do not change correct words.
5. DO NOT change letter case or add punctuation yet.
`,
    // STAGE 2: Orange -> Green (Finalization: Punctuation & Capitalization)
    finalize: `
Your task is to format the text into proper written speech.
STRICT RULES:
1. Add punctuation and capitalization.
2. REMOVE filler words (um, like, you know).
3. Return ONLY the formatted text. NO extra comments.
`,
    // STAGE 3: Bulk Processing
    combined: `
Your task is to perform full text correction.
STRICT RULES:
1. Fix spelling, punctuation, capitalization.
2. Remove filler words.
3. Return ONLY the final text. NO conversational filler.
`,
    system: `You are a typo fixer. Fix spelling errors. Do not add filler.`,
    enhance: `
You are a strict text correction tool.
RULES:
1. Fix grammar and style.
2. Remove filler words.
3. RETURN ONLY THE TEXT. No quotes, no intros, no explanations.
`,
    transcribe: `
You are a transcription tool.
Output ONLY what is spoken.
Ignore noises.
Do not write "Silence".
If silence, return empty string.
`
  }
};

export const UI = {
  ru: {
    welcomeTitle: "Ваш умный помощник",
    welcomeSubtitle: "для набора текста.",
    welcomeDesc: "FastType AI работает в фоне и помогает вам писать быстрее и грамотнее. Просто печатайте, а мы позаботимся об остальном.",
    feature1Title: "Мгновенные исправления",
    feature1Desc: "Автоматически исправляет опечатки во время пауз.",
    feature2Title: "Улучшение стиля",
    feature2Desc: "Превращает черновики в профессиональный текст.",
    feature3Title: "Понимает контекст",
    feature3Desc: "Работает с Gemini 3 Flash для понимания смысла.",
    setupTitle: "Настройка доступа",
    setupDesc: "Введите ваш API ключ Google Gemini для начала работы.",
    apiKeyLabel: "GEMINI API KEY",
    startBtn: "Запустить редактор",
    getKeyLink: "Получить бесплатный ключ Gemini",
    keyStorageInfo: "Ключ сохраняется локально на вашем устройстве.",
    placeholder: "Начните печатать здесь или используйте микрофон...",
    chars: "симв.",
    btnRecord: "Диктовать (Alt+R)",
    btnStop: "Стоп (Alt+R)",
    btnEnhance: "Улучшить текст",
    btnUndo: "Отменить",
    btnRedo: "Вернуть",
    statusTyping: "Печатаю...",
    statusThinking: "Проверка...",
    statusGrammar: "Проверка ошибок ИИ...",
    statusCorrecting: "Исправление...",
    statusEnhancing: "Финализация...",
    statusRecording: "Запись...",
    statusTranscribing: "Транскрибация...",
    statusDone: "Готово",
    statusIdle: "Готов к работе",
    statusPaused: "На паузе",
    btnPause: "Приостановить",
    btnResume: "Продолжить",
    settingsTitle: "Параметры Анализа",
    settingsActive: "Активное исправление",
    settingsDelay: "Задержка (ms)",
    settingsDelayDesc: "Скорость реакции ИИ на опечатки",
    howItWorksTitle: "КАК ЭТО РАБОТАЕТ",
    howItWorksDesc: "1. Словарь проверяет слова на лету (Оранжевый).\n2. ИИ исправляет ошибки в неизвестных словах.\n3. ИИ расставляет знаки препинания в конце предложения (Зеленый).",
    changeKey: "Сменить API Ключ",
    footer: "FastType AI",
    clipboardTitle: "Буфер обмена (Alt+V)",
    clipboardEmpty: "История пуста",
    clipboardCopy: "Скопировать",
    clipboardClear: "Очистить",
    clipboardEnable: "Вкл. историю буфера",
    clipboardSearch: "Поиск...",
    tooltipLang: "Переключить язык",
    tooltipStats: "Исправлений сделано",
    tooltipSettings: "Настройки (Alt+S)",
    tooltipMin: "Свернуть",
    tooltipMax: "Развернуть",
    tooltipClose: "Закрыть",
    // Visualizer Specific
    waveProcessing: "Обрабатывается...",
    waveProcessed: "Обработано",
    // VISUALIZER STATES (UPDATED FOR 2-LINE PILLS)
    visGeminiLabel: "GEMINI",
    visListening: "СЛУШАЕТ",
    visEditing: "СЛУШАЕТ / РЕД.",
    visAnalyzingListening: "СЛУШАЕТ / АНАЛИЗ",
    visAnalyzing: "АНАЛИЗИРУЕТ",
    visDone: "ГОТОВО",
    // Mic Test
    testMic: "Тест микрофона",
    stopTest: "Стоп",
    noiseLevel: "Уровень шума",
    silenceZone: "Тишина (игнор)",
    speechZone: "Речь (запись)",
    micAccessError: "Нет доступа к микрофону",
    // Audio Model Settings
    audioModelTitle: "Модель звука",
    modelFlash: "Gemini 2.5 Flash (Быстро)",
    modelPro: "Gemini 2.5 Pro (Умно)",
    // Economy Mode
    settingsEconomy: "Экономия Трафика",
    settingsEconomyDesc: "Сначала проверяет локальный словарь. ИИ используется только для неизвестных слов.",
    // New Header Buttons
    btnHelp: "Справка",
    btnHome: "Домой",
    tooltipHelp: "Как пользоваться (F1)",
    tooltipHome: "Вернуться на старт (Home)",
    // History
    historyTitle: "История изменений (Alt+H)",
    historyEmpty: "История пуста",
    historyRestore: "Восстановить эту версию",
    historyCurrent: "Текущая версия",
    // History Tags
    tagRaw: "Сырой (ввод)",
    tagDictated: "Диктовка",
    tagProcessed: "Отредактировано",
    tagFinalized: "Финал",
    tagEnhanced: "Улучшено",
    // Help Modal
    helpModalTitle: "Справка FastType AI",
    helpSection1: "Основные функции",
    helpDesc1: "Просто печатайте. Словарь проверяет слова мгновенно. ИИ подключается для сложных ошибок и расстановки знаков препинания.",
    helpSection2: "Горячие клавиши",
    helpDesc2: "Ctrl+Z (Cmd+Z) - Отмена\nCtrl+Y (Cmd+Shift+Z) - Повтор\nAlt+R - Запись\nAlt+V - Буфер\nAlt+H - История\nAlt+S - Настройки\nF1 - Справка\nHome - На старт",
    helpSection3: "Микрофон",
    helpDesc3: "Нажмите и говорите. ИИ автоматически вырежет тишину и преобразует речь в текст.",
    // Lock Screen
    lockTitle: "Вход в систему",
    lockDesc: "Приложение заблокировано. Введите PIN-код.",
    lockPlaceholder: "Введите PIN",
    lockBtn: "Разблокировать",
    lockCreateTitle: "Защита (Опционально)",
    lockCreateDesc: "Создайте PIN для защиты входа.",
    lockCreatePlaceholder: "Придумайте PIN",
    lockSetBtn: "Установить PIN",
    lockError: "Неверный PIN-код",
    lockRemove: "Удалить PIN-код",
    lockSaved: "PIN-код установлен"
  },
  en: {
    welcomeTitle: "Your Intelligent",
    welcomeSubtitle: "Typing Assistant.",
    welcomeDesc: "FastType AI runs in the background, helping you write faster and better. Just type, and we'll handle the rest.",
    feature1Title: "Instant Corrections",
    feature1Desc: "Automatically fixes typos and transposed letters during pauses.",
    feature2Title: "Style Enhancement",
    feature2Desc: "Turns drafts into professional text with one click.",
    feature3Title: "Context Aware",
    feature3Desc: "Powered by Gemini 3 Flash for deep understanding.",
    setupTitle: "Access Setup",
    setupDesc: "Enter your Google Gemini API key to get started.",
    apiKeyLabel: "GEMINI API KEY",
    startBtn: "Launch Editor",
    getKeyLink: "Get free Gemini API Key",
    keyStorageInfo: "Key is stored locally on your device.",
    placeholder: "Start typing here or use the microphone...",
    chars: "chars",
    btnRecord: "Dictate (Alt+R)",
    btnStop: "Stop (Alt+R)",
    btnEnhance: "Enhance Text",
    btnUndo: "Undo",
    btnRedo: "Redo",
    statusTyping: "Typing...",
    statusThinking: "Checking...",
    statusGrammar: "AI Error Check...",
    statusCorrecting: "Fixing...",
    statusEnhancing: "Finalizing...",
    statusRecording: "Recording...",
    statusTranscribing: "Transcribing...",
    statusDone: "Done",
    statusIdle: "Ready",
    statusPaused: "Paused",
    btnPause: "Pause",
    btnResume: "Resume",
    settingsTitle: "Analysis Settings",
    settingsActive: "Active Correction",
    settingsDelay: "Delay (ms)",
    settingsDelayDesc: "AI reaction speed for typos",
    howItWorksTitle: "HOW IT WORKS",
    howItWorksDesc: "1. Dictionary checks words instantly (Orange).\n2. AI fixes unknown words.\n3. AI adds punctuation at sentence end (Green).",
    changeKey: "Change API Key",
    footer: "FastType AI",
    clipboardTitle: "Clipboard History (Alt+V)",
    clipboardEmpty: "History is empty",
    clipboardCopy: "Copy",
    clipboardClear: "Clear All",
    clipboardEnable: "Enable History",
    clipboardSearch: "Search...",
    tooltipLang: "Switch Language",
    tooltipStats: "Corrections made",
    tooltipSettings: "Settings (Alt+S)",
    tooltipMin: "Minimize",
    tooltipMax: "Maximize",
    tooltipClose: "Close",
    // Visualizer Specific
    waveProcessing: "Processing...",
    waveProcessed: "Processed",
    // VISUALIZER STATES (UPDATED FOR 2-LINE PILLS)
    visGeminiLabel: "GEMINI",
    visListening: "LISTENING",
    visEditing: "LISTENING / EDIT",
    visAnalyzingListening: "LISTENING / ANALYZE",
    visAnalyzing: "ANALYZING",
    visDone: "DONE",
    // Mic Test
    testMic: "Test Microphone",
    stopTest: "Stop",
    noiseLevel: "Noise Level",
    silenceZone: "Silence (Ignored)",
    speechZone: "Speech (Recorded)",
    micAccessError: "Microphone access denied",
     // Audio Model Settings
    audioModelTitle: "Audio Model",
    modelFlash: "Gemini 2.5 Flash (Fast)",
    modelPro: "Gemini 2.5 Pro (Smart)",
    // Economy Mode
    settingsEconomy: "Traffic Saver",
    settingsEconomyDesc: "Checks local dictionary first. Uses AI only for unknown words.",
    // New Header Buttons
    btnHelp: "Help",
    btnHome: "Home",
    tooltipHelp: "Quick Help (F1)",
    tooltipHome: "Return to Welcome (Home)",
    // History
    historyTitle: "Version History (Alt+H)",
    historyEmpty: "History is empty",
    historyRestore: "Restore this version",
    historyCurrent: "Current Version",
    // History Tags
    tagRaw: "Raw Input",
    tagDictated: "Dictated",
    tagProcessed: "Edited",
    tagFinalized: "Final",
    tagEnhanced: "Enhanced",
    // Help Modal
    helpModalTitle: "FastType AI Help",
    helpSection1: "Core Features",
    helpDesc1: "Just type. The dictionary checks words instantly. AI helps with typos and punctuation automatically.",
    helpSection2: "Shortcuts",
    helpDesc2: "Ctrl+Z (Cmd+Z) - Undo\nCtrl+Y (Cmd+Shift+Z) - Redo\nAlt+R - Record\nAlt+V - Clipboard\nAlt+H - History\nAlt+S - Settings\nF1 - Help\nHome - Welcome Screen",
    helpSection3: "Microphone",
    helpDesc3: "Click and speak. AI automatically filters silence and transcribes speech to text.",
    // Lock Screen
    lockTitle: "System Login",
    lockDesc: "Application is locked. Enter PIN to continue.",
    lockPlaceholder: "Enter PIN",
    lockBtn: "Unlock",
    lockCreateTitle: "Protection (Optional)",
    lockCreateDesc: "Create a PIN to protect access.",
    lockCreatePlaceholder: "Create a PIN",
    lockSetBtn: "Set PIN",
    lockError: "Invalid PIN code",
    lockRemove: "Remove PIN",
    lockSaved: "PIN code set"
  }
};

export const getTranslation = (lang: Language) => UI[lang];
export const getPrompts = (lang: Language) => PROMPTS[lang];
