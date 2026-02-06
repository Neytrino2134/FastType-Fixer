

import { Language } from '../types';

export const PROMPTS = {
  ru: {
    // STAGE 1: Fix Typos Only (Grey -> Orange)
    fixTypos: `
Исправь ТОЛЬКО опечатки в тексте.
СТРОГИЕ ПРАВИЛА:
1. НЕ меняй знаки препинания. НЕ ставь точки в конце.
2. НЕ меняй регистр букв (кроме явных ошибок в именах).
3. Верни ТОЛЬКО исправленный текст.
4. Если текст правильный - верни его как есть.
`,
    // STAGE 2: Blue/Purple -> Green (Finalization)
    finalize: `
Ты — корректор. Твоя задача — исправить грамматику, орфографию и пунктуацию, а также цензурировать текст.
СТРОГИЕ ПРАВИЛА:
1. СОХРАНЯЙ ИСХОДНУЮ СТРУКТУРУ. Если текст состоит из команд или отрывистых фраз — оставь их такими. Не превращай список в рассказ.
2. НЕ меняй смысл слов и не добавляй отсебятины (вступлений, пояснений).
3. Цензурируй ненормативную лексику (заменяй на *), но не меняй общий тон, если он не оскорбителен.
4. Удали только явный мусор и повторы.
5. ВЕРНИ ТОЛЬКО ИСПРАВЛЕННЫЙ ТЕКСТ.
`,
    combined: `
Исправь ошибки и пунктуацию. Цензурируй мат (*).
ВАЖНО: Максимально сохрани исходную структуру и стиль. Не переписывай текст своими словами, только правь ошибки.
ВЕРНИ ТОЛЬКО ГОТОВЫЙ ВАРИАНТ.
`,
    system: `Ты корректор.`,
    enhance: `
Улучши читаемость текста, исправь ошибки.
СТРОГИЕ ЗАПРЕТЫ:
1. НИКАКИХ списков вариантов. Только ОДИН лучший результат.
2. Не меняй технический смысл или команды.
ВЕРНИ ТОЛЬКО УЛУЧШЕННЫЙ ТЕКСТ.
`,
    transcribe: `
Твоя задача: Транскрибировать ЧЕЛОВЕЧЕСКУЮ РЕЧЬ из аудио.
СТРОГИЕ ЗАПРЕТЫ (НИКОГДА НЕ ДЕЛАЙ ЭТОГО):
1. НЕ пиши таймкоды (например, 00:00:00 --> 00:00:05).
2. НЕ описывай звуки (например: [музыка], [смех], [колокольчик], [тишина]).
3. НЕ пиши комментарии типа "Без слов", "Конец записи", "Продолжение следует".
4. Игнорируй повторы и заикания.
5. Если речи нет — верни пустую строку.
ВЕРНИ ТОЛЬКО ПРОИЗНЕСЕННЫЙ ТЕКСТ.
`
  },
  en: {
    fixTypos: `
Fix ONLY spelling typos.
STRICT RULES:
1. DO NOT change punctuation.
2. DO NOT change capitalization yet.
3. Return ONLY corrected text.
`,
    finalize: `
You are a proofreader. Fix grammar, spelling, punctuation, and censor profanity.
STRICT RULES:
1. PRESERVE ORIGINAL STRUCTURE. Do not rewrite commands or fragments into full sentences.
2. DO NOT add new words or change the meaning.
3. Censor profanity with asterisks (*).
4. Remove accidental repetitions.
5. Return ONLY the corrected text.
`,
    combined: `
Fix errors and punctuation. Censor profanity (*).
IMPORTANT: Preserve the original structure and style. Do not rewrite, only fix errors.
RETURN ONLY THE ONE BEST VERSION.
`,
    system: `You are a typo fixer.`,
    enhance: `
Polish the text for clarity and grammar.
RULES:
1. Only ONE final version.
2. Do not alter technical meaning or commands.
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
`
  }
};

export const UI = {
  ru: {
    // --- WIZARD STEPS ---
    wizStep1Title: "Добро пожаловать",
    wizStep1Subtitle: "Ваш умный ИИ-помощник",
    wizStep1Desc: "FastType AI ускоряет набор текста, исправляет ошибки на лету и помогает формулировать мысли.",
    
    wizStep2Title: "Язык системы",
    wizStep2Desc: "Выберите основной язык, на котором вы пишете и хотите видеть интерфейс.",
    
    wizStep3Title: "Магия в действии",
    wizStep3Desc: "Просто печатайте как удобно. ИИ поймет, исправит и оформит текст за вас.",
    wizDemoInput: "рпивет ка кдела",
    wizDemoOutput: "Привет! Как дела?",
    
    wizStep4Title: "Последний шаг",
    wizStep4Desc: "Для работы интеллекта требуется ключ Google Gemini API.",
    
    // Existing keys...
    welcomeTitle: "Ваш умный помощник",
    welcomeSubtitle: "для набора текста.",
    welcomeDesc: "FastType AI работает в фоне и помогает вам писать быстрее и грамотнее. Просто печатайте, а мы позаботимся об остальном.",
    welcomeDisclaimer: "Для работы приложения потребуется API ключ Google (Gemini). Его можно получить бесплатно, это делается один раз на всю жизнь и займет всего 2 минуты. Этот ключ позволит вам пользоваться этим и многими другими AI приложениями.",
    
    feature1Title: "Мгновенные исправления",
    feature1Desc: "Автоматически исправляет опечатки.",
    feature2Title: "Улучшение стиля",
    feature2Desc: "Превращает черновики в чистовик.",
    feature3Title: "Понимает контекст",
    feature3Desc: "Gemini 3 Flash понимает смысл.",
    
    setupTitle: "Настройка доступа",
    setupDesc: "Введите ваш API ключ Google Gemini для начала работы.",
    securityNote: "Приложение разработано с использованием ИИ. Мы гарантируем конфиденциальность: данные не передаются третьим лицам, отсутствуют скрытые механизмы фишинга или трекинга.",
    
    apiKeyLabel: "ВВЕДИТЕ API KEY ЗДЕСЬ",
    apiKeyTooltip: "Ваш ключ хранится локально только в вашем браузере/приложении.",
    
    // NEW KEYS
    linkGetKey: "Получить ключ",
    linkTutorial: "Инструкция",

    startBtn: "Поехали", 
    btnHaveKey: "Ввести API Key",
    btnNoKey: "Нет ключа / Обучение",
    
    // Guide
    guideTitle: "Как получить API ключ",
    guideStep0: "Примите соглашения Google AI Studio (если вы зашли впервые).",
    guideStep1: "Нажмите кнопку 'Create API Key' в левом верхнем углу.",
    guideStep2: "Выберите 'Create API key in new project'. Это создаст проект автоматически.",
    guideStep3: "Скопируйте полученный ключ.",
    guideGoToGoogle: "Перейти на Google AI Studio",
    guideDone: "Ввести ключ",
    guideRepeat: "Повторить обучение",
    
    getKeyLink: "Получить бесплатный ключ Gemini",
    keyStorageInfo: "Ключ сохраняется локально на вашем устройстве.",
    placeholder: "Начните печатать здесь...",
    chars: "симв.",
    btnRecord: "Диктовать (Alt+R)",
    btnStop: "Стоп (Alt+R)",
    btnEnhance: "Улучшить текст",
    btnUndo: "Отменить",
    btnRedo: "Вернуть",
    statusTyping: "Печатаю...",
    statusThinking: "Ожидание...",
    statusDictCheck: "Словарь...",
    statusAiFixing: "ИИ: Исправление...",
    statusAiFinalizing: "ИИ: Финализация...",
    statusScriptFix: "Авто-формат...",
    statusGrammar: "Проверка ошибок...",
    statusCorrecting: "Исправление...",
    statusEnhancing: "Улучшение...",
    statusRecording: "Запись...",
    statusTranscribing: "Транскрибация...",
    statusDictation: "Диктовка (Речь в Текст)",
    statusDone: "Готово",
    statusIdle: "Готов к работе",
    statusPaused: "На паузе",
    statusError: "Ошибка сети",
    btnPause: "Приостановить",
    btnResume: "Продолжить",
    nothingToImprove: "Текст идеален. Улучшений не требуется.",
    // Group Headers
    groupActive: "Активное исправление",
    groupSilence: "Порог тишины",
    groupModel: "Модель обработки",
    
    settingsTitle: "Параметры Анализа",
    settingsActive: "Активный режим",
    settingsMiniScripts: "Мини-Скрипты",
    settingsMiniScriptsDesc: "Мгновенное исправление пробелов и регистра (без ИИ)",
    settingsDelay: "Задержка (ms)",
    settingsDelayDesc: "Скорость реакции ИИ на опечатки",
    settingsFinalization: "Финализация простоя (сек)",
    
    howItWorksTitle: "ЛЕГЕНДА ЦВЕТОВ",
    howItWorksDesc: "1. Серый: Ввод\n2. Красный: Ошибка (Словарь)\n3. Голубой: Проверено (ОК)\n4. Фиолетовый: Исправлено ИИ\n5. Зеленый: Финал\n6. Оранжевый: Диктовка",
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
    // Header Actions
    btnHeaderClear: "Очистить всё",
    btnHeaderCopy: "Копировать",
    btnHeaderPaste: "Вставить",
    
    // Detailed Status Tooltips
    detailDictation: "🟠 ЦВЕТ: Оранжевый\nДЕЙСТВИЕ: Запись голоса\nРЕЗУЛЬТАТ: Аудио в текст",
    detailTyping: "⚪ ЦВЕТ: Серый\nДЕЙСТВИЕ: Ввод с клавиатуры\nРЕЗУЛЬТАТ: Сырой текст",
    detailDictCheck: "🔵 Голубой: Слово найдено (ОК)\n🔴 Красный: Ошибка / Нет в словаре\nДЕЙСТВИЕ: Проверка орфографии",
    detailAiFixing: "🟣 ЦВЕТ: Фиолетовый\nДЕЙСТВИЕ: Gemini исправляет\nРЕЗУЛЬТАТ: Чистый текст",
    detailFinalizing: "🟢 ЦВЕТ: Зеленый\nДЕЙСТВИЕ: Финализация\nРЕЗУЛЬТАТ: Пунктуация",
    detailScriptFix: "⚡ АВТО-ФОРМАТ\nДЕЙСТВИЕ: Исправление пробелов и регистра\nРЕЗУЛЬТАТ: Чистый формат",
    detailReset: "Сбросить состояние процессора (Reset)",
    detailPause: "Приостановить/Возобновить обработку",
    tooltipPauseAction: "Приостановить (Alt+A)",
    tooltipResumeAction: "Возобновить (Alt+A)",
    tooltipPin: "Закрепить поверх всех окон",
    tooltipUnpin: "Открепить окно",
    
    // Visualizer Specific
    waveProcessing: "Обрабатывается...",
    waveProcessed: "Обработано",
    // VISUALIZER STATES
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
    tagRaw: "Сырой ввод",
    tagDictated: "Диктовка",
    tagProcessed: "Обработка",
    tagFinalized: "Финал",
    tagEnhanced: "Улучшено",
    tagRawDictation: "Сырой текст (Голос)",
    tagAiCorrected: "Исправлено ИИ",
    // Help Modal
    helpModalTitle: "Справка FastType AI",
    helpSection1: "Основные функции",
    helpDesc1: "Система работает по принципу конвейера. Группы слов проходят стадии: Словарь (Красный) -> Проверено (Голубой) -> Исправлено ИИ (Фиолетовый) -> Финал (Зеленый). Оранжевый = Диктовка.",
    helpSection2: "Горячие клавиши",
    helpDesc2: "Ctrl+Z - Отмена\nAlt+R - Запись\nAlt+V - Буфер\nAlt+H - История\nAlt+S - Настройки\nAlt+A - Пауза/Возобновление",
    helpSection3: "Микрофон",
    helpDesc3: "Нажмите и говорите. ИИ автоматически вырежет тишину.",
    // Lock Screen
    lockTitle: "Вход в систему",
    lockDesc: "Приложение заблокировано. Введите PIN-код.",
    lockPlaceholder: "Введите PIN",
    lockBtn: "Разблокировать",
    lockCreateTitle: "Защита приложения",
    lockCreateDesc: "Установите PIN для защиты от посторонних.",
    lockCreatePlaceholder: "Придумайте PIN",
    lockSetBtn: "Сохранить PIN",
    lockError: "Неверный PIN-код",
    lockRemove: "Удалить PIN-код",
    lockChange: "Изменить PIN",
    lockSaved: "PIN-код установлен",
    lockForgot: "Забыли PIN / Сбросить?",
    
    // Wipe Warning
    wipeTitle: "ВНИМАНИЕ! ПОЛНЫЙ СБРОС",
    wipeDesc: "Это действие удалит PIN-код и разблокирует вход. \n\n⚠️ ВСЕ ВАШИ ДАННЫЕ БУДУТ УДАЛЕНЫ:\n• История текстов\n• Содержимое буфера обмена\n• Персональные настройки\n\nЭто действие необратимо.",
    wipeConfirm: "Да, удалить данные и войти",
    wipeCancel: "Отмена",
    
    // New Buttons
    btnCreatePin: "Создать PIN-код",
    btnBack: "Назад",
    // Dictionary Check
    dictStatus: "Проверка словарей",
    dictRu: "База RU",
    dictEn: "База EN",
    dictWords: "слов",
    dictMissing: "Пусто",
    // Translator
    transTitle: "Переводчик",
    transInput: "Исходный текст",
    transOutput: "Перевод",
    transCopy: "Скопировать",
    transClear: "Очистить",
    transLangRuEn: "RU ➜ EN",
    transLangEnRu: "EN ➜ RU",
    transPlaceholder: "Введите текст для перевода...",
    // Tabs
    tabEditor: "Редактор",
    tabAssist: "Ассистент",
    tabTrans: "Перевод"
  },
  en: {
    // --- WIZARD STEPS ---
    wizStep1Title: "Welcome",
    wizStep1Subtitle: "Your Intelligent AI Assistant",
    wizStep1Desc: "FastType AI speeds up typing, fixes errors on the fly, and helps formulate thoughts.",
    
    wizStep2Title: "System Language",
    wizStep2Desc: "Choose the primary language you write in and want to see the interface in.",
    
    wizStep3Title: "Magic in Action",
    wizStep3Desc: "Just type naturally. AI will understand, correct, and format the text for you.",
    wizDemoInput: "hello hwo are yuo",
    wizDemoOutput: "Hello! How are you?",
    
    wizStep4Title: "Final Step",
    wizStep4Desc: "The intelligence requires a Google Gemini API key.",

    // Existing keys...
    welcomeTitle: "Your Intelligent",
    welcomeSubtitle: "Typing Assistant.",
    welcomeDesc: "FastType AI runs in the background. Just type, and we'll handle the rest via a smart pipeline.",
    welcomeDisclaimer: "The app requires a Google (Gemini) API key. It is free, takes only 2 minutes to set up once, and allows you to use this and many other AI apps.",
    
    feature1Title: "Instant Corrections",
    feature1Desc: "Automatically fixes typos during pauses.",
    feature2Title: "Style Enhancement",
    feature2Desc: "Turns drafts into professional text.",
    feature3Title: "Context Aware",
    feature3Desc: "Powered by Gemini 3 Flash.",
    setupTitle: "Access Setup",
    setupDesc: "Enter your Google Gemini API key to get started.",
    securityNote: "Developed with AI assistance. We guarantee privacy: data is not shared with third parties, and there are no hidden phishing or tracking mechanisms.",
    
    apiKeyLabel: "ENTER API KEY HERE",
    apiKeyTooltip: "Your key is stored locally only in your browser/app.",

    // NEW KEYS
    linkGetKey: "Get Key",
    linkTutorial: "Tutorial",
    
    startBtn: "Let's Go",
    btnHaveKey: "Enter API Key",
    btnNoKey: "No Key / Tutorial",

    // Guide
    guideTitle: "How to get an API Key",
    guideStep0: "Accept the Google AI Studio agreements (if it's your first time).",
    guideStep1: "Click 'Create API Key' in the top-left corner.",
    guideStep2: "Select 'Create API key in new project'. It will create a project automatically.",
    guideStep3: "Copy the generated key.",
    guideGoToGoogle: "Go to Google AI Studio",
    guideDone: "Enter Key",
    guideRepeat: "Repeat Tutorial",

    getKeyLink: "Get free Gemini API Key",
    keyStorageInfo: "Key is stored locally on your device.",
    placeholder: "Start typing here...",
    chars: "chars",
    btnRecord: "Dictate (Alt+R)",
    btnStop: "Stop (Alt+R)",
    btnEnhance: "Improve Text",
    btnUndo: "Undo",
    btnRedo: "Redo",
    statusTyping: "Typing...",
    statusThinking: "Waiting...",
    statusDictCheck: "Dictionary...",
    statusAiFixing: "AI: Fixing...",
    statusAiFinalizing: "AI: Finalizing...",
    statusScriptFix: "Auto-Format...",
    statusGrammar: "AI Error Check...",
    statusCorrecting: "Fixing...",
    statusEnhancing: "Enhancing...",
    statusRecording: "Recording...",
    statusTranscribing: "Transcribing...",
    statusDictation: "Dictation (Speech to Text)",
    statusDone: "Done",
    statusIdle: "Ready",
    statusPaused: "Paused",
    statusError: "Network Error",
    btnPause: "Pause",
    btnResume: "Resume",
    nothingToImprove: "Text is perfect. No improvements needed.",
    // Group Headers
    groupActive: "Active Correction",
    groupSilence: "Silence Threshold",
    groupModel: "Processing Model",

    settingsTitle: "Analysis Settings",
    settingsActive: "Active Mode",
    settingsMiniScripts: "Mini-Scripts",
    settingsMiniScriptsDesc: "Instant regex fixes for spacing and case (No AI)",
    settingsDelay: "Delay (ms)",
    settingsDelayDesc: "Wait time before processing",
    settingsFinalization: "Idle Finalization (sec)",

    howItWorksTitle: "COLOR LEGEND",
    howItWorksDesc: "1. Grey: Input\n2. Red: Dict Error\n3. Blue: Verified (OK)\n4. Purple: AI Fixed\n5. Green: Final\n6. Orange: Dictation",
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
    // Header Actions
    btnHeaderClear: "Clear All",
    btnHeaderCopy: "Copy All",
    btnHeaderPaste: "Paste",

    // Detailed Status Tooltips
    detailDictation: "🟠 COLOR: Orange\nACTION: Voice Recording\nRESULT: Audio to Text",
    detailTyping: "⚪ COLOR: Grey\nACTION: Keyboard Input\nRESULT: Raw Text",
    detailDictCheck: "🔵 Blue: Word Found (OK)\n🔴 Red: Error / Not found\nACTION: Spelling Check",
    detailAiFixing: "🟣 COLOR: Purple\nACTION: Gemini Fixing\nRESULT: Clean Text",
    detailFinalizing: "🟢 COLOR: Green\nACTION: Finalizing\nRESULT: Punctuation",
    detailScriptFix: "⚡ AUTO-FORMAT\nACTION: Spacing and capitalization\nRESULT: Clean Format",
    detailReset: "Reset Processor State",
    detailPause: "Pause/Resume Processing",
    tooltipPauseAction: "Pause Processing (Alt+A)",
    tooltipResumeAction: "Resume Processing (Alt+A)",
    tooltipPin: "Pin Always on Top",
    tooltipUnpin: "Unpin",

    // Visualizer Specific
    waveProcessing: "Processing...",
    waveProcessed: "Processed",
    // VISUALIZER STATES
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
    settingsEconomyDesc: "Checks local dictionary first.",
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
    tagRawDictation: "Raw Dictation",
    tagAiCorrected: "AI Corrected",
    // Help Modal
    helpModalTitle: "FastType AI Help",
    helpSection1: "Core Features",
    helpDesc1: "Pipeline system: Dictionary (Red) -> Verified (Blue) -> AI Fixed (Purple) -> Final (Green). Orange = Dictation.",
    helpSection2: "Shortcuts",
    helpDesc2: "Ctrl+Z - Undo\nAlt+R - Record\nAlt+V - Clipboard\nAlt+H - History\nAlt+S - Settings\nAlt+A - Pause/Resume",
    helpSection3: "Microphone",
    helpDesc3: "Click and speak. AI automatically filters silence.",
    // Lock Screen
    lockTitle: "System Login",
    lockDesc: "Application is locked. Enter PIN to continue.",
    lockPlaceholder: "Enter PIN",
    lockBtn: "Unlock",
    lockCreateTitle: "App Protection",
    lockCreateDesc: "Set a PIN code to protect access.",
    lockCreatePlaceholder: "Create a PIN",
    lockSetBtn: "Save PIN",
    lockError: "Invalid PIN code",
    lockRemove: "Remove PIN",
    lockChange: "Change PIN",
    lockSaved: "PIN code set",
    lockForgot: "Forgot PIN / Reset?",
    
    // Wipe Warning
    wipeTitle: "WARNING! FULL RESET",
    wipeDesc: "This action will remove the PIN code and unlock access. \n\n⚠️ ALL DATA WILL BE DELETED:\n• Text History\n• Clipboard Content\n• Personal Settings\n\nThis action cannot be undone.",
    wipeConfirm: "Yes, wipe data and unlock",
    wipeCancel: "Cancel",

    // New Buttons
    btnCreatePin: "Create PIN Code",
    btnBack: "Back",
    // Dictionary Check
    dictStatus: "Dictionary Check",
    dictRu: "RU Database",
    dictEn: "EN Database",
    dictWords: "слов",
    dictMissing: "Пусто",
    // Translator
    transTitle: "Translator",
    transInput: "Source Text",
    transOutput: "Translation",
    transCopy: "Copy",
    transClear: "Clear",
    transLangRuEn: "RU ➜ EN",
    transLangEnRu: "EN ➜ RU",
    transPlaceholder: "Enter text to translate...",
    // Tabs
    tabEditor: "Editor",
    tabAssist: "Assistant",
    tabTrans: "Translator"
  }
};

export const getTranslation = (lang: Language) => UI[lang];
export const getPrompts = (lang: Language) => PROMPTS[lang];