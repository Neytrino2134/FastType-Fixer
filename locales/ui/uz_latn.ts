


import { UIDictionary } from '../../types';

export const UI_UZ_LATN: UIDictionary = {
    // --- WIZARD STEPS ---
    wizStep0Title: "Ovoz sozlamalari",
    wizStep0Subtitle: "Ovozli yordamchini yoqasizmi?",
    btnSoundOn: "Ovozni yoqish",
    btnSoundOff: "Ovozsiz",

    wizStep1Title: "Xush kelibsiz",
    wizStep1Subtitle: "Sizning aqlli yordamchingiz",
    wizStep1Desc: "FastType AI matn terishni tezlashtiradi va xatolarni tuzatadi.",
    
    wizStep2Title: "Tizim tili",
    wizStep2Desc: "Siz yozadigan va interfeysda ko'rishni istagan asosiy tilni tanlang.",
    
    wizStep3Title: "Sehrli harakat",
    wizStep3Desc: "Shunchaki yozing. AI tushunadi, tuzatadi va formatlaydi.",
    wizDemoInput: "salom ishlar qalay",
    wizDemoOutput: "Salom! Ishlar qalay?",
    
    wizStep4Title: "So'nggi qadam",
    wizStep4Desc: "Intellekt ishlashi uchun Google Gemini API kaliti kerak.",

    // Welcome
    welcomeTitle: "Sizning aqlli",
    welcomeSubtitle: "yordamchingiz.",
    welcomeDesc: "FastType AI fon rejimida ishlaydi. Siz yozing, qolganini biz hal qilamiz.",
    welcomeDisclaimer: "Dastur ishlashi uchun Google (Gemini) API kaliti talab qilinadi. Bu bepul.",
    
    feature1Title: "Tezkor tuzatish",
    feature1Desc: "Xatolarni avtomatik tuzatadi.",
    feature2Title: "Uslubni yaxshilash",
    feature2Desc: "Qoralamani toza matnga aylantiradi.",
    feature3Title: "Kontekstni tushunish",
    feature3Desc: "Gemini 3 Flash kuchi bilan.",
    
    setupTitle: "Kirishni sozlash",
    setupDesc: "Boshlash uchun Google Gemini API kalitini kiriting.",
    securityNote: "Ma'lumotlar uchinchi shaxslarga berilmaydi.",
    
    apiKeyLabel: "API KALITNI BU YERGA KIRITING",
    apiKeyTooltip: "Kalit faqat sizning qurilmangizda saqlanadi.",

    linkGetKey: "Kalit olish",
    linkTutorial: "Qo'llanma",
    
    startBtn: "Boshladik",
    btnHaveKey: "Kalitni kiritish",
    btnNoKey: "Kalit yo'q / O'qish",

    // Guide
    guideTitle: "API Kalitni qanday olish mumkin",
    guideStep0: "Google AI Studio shartlarini qabul qiling.",
    guideStep1: "Yuqori chap burchakda 'Create API Key' ni bosing.",
    guideStep2: "'Create API key in new project' ni tanlang.",
    guideStep3: "Olingan kalitni nusxalang.",
    guideGoToGoogle: "Google AI Studio-ga o'tish",
    guideDone: "Kalitni kiritish",
    guideRepeat: "Qo'llanmani qaytarish",

    getKeyLink: "Bepul Gemini API kalitini olish",
    keyStorageInfo: "Kalit lokal saqlanadi.",
    placeholder: "Shu yerda yozishni boshlang... (yoki faylni tashlang)",
    chars: "belgi",
    btnRecord: "Yozish (Alt+R)",
    btnStop: "To'xtatish (Alt+R)",
    btnDevRecord: "Yozish (DEV)",
    btnEnhance: "Matnni yaxshilash",
    btnUndo: "Bekor qilish",
    btnRedo: "Qaytarish",
    btnSpeak: "Matnni o'qish", 
    
    // Status
    statusTyping: "Yozilmoqda...",
    statusThinking: "Kutilmoqda...",
    statusDictCheck: "Lug'at...",
    statusAiFixing: "AI: Tuzatish...",
    statusAiFinalizing: "AI: Yakunlash...",
    statusScriptFix: "Avto-Format...",
    statusGrammar: "Xatolar tekshiruvi...",
    statusCorrecting: "Tuzatish...",
    statusEnhancing: "Yaxshilash...",
    statusRecording: "Yozib olish...",
    statusTranscribing: "Qayta ishlash...",
    statusDictation: "Diktovka",
    statusDone: "Tayyor",
    statusIdle: "Tayyor",
    statusPaused: "Pauza",
    statusError: "Tarmoq xatosi",
    
    btnPause: "Pauza",
    btnResume: "Davom etish",
    nothingToImprove: "Matn mukammal. Yaxshilash talab etilmaydi.",
    
    // Groups
    groupActive: "Faol tuzatish",
    groupSilence: "Jimlik chegarasi",
    groupModel: "Qayta ishlash modeli",

    // Settings
    settingsTitle: "Tahlil sozlamalari",
    settingsActive: "Faol rejim",
    settingsMiniScripts: "Mini-Skriptlar",
    settingsMiniScriptsDesc: "Bo'shliqlar va registrlarni tezkor tuzatish (AI-siz)",
    settingsDevMode: "Dasturchi rejimi",
    settingsDevModeDesc: "Test tugmalarini yoqish",
    settingsDelay: "Kechikish (ms)",
    settingsDelayDesc: "Tuzatishdan oldingi kutish vaqti",
    settingsFinalization: "Yakunlash vaqti (sek)",
    settingsEconomy: "Traffikni tejash",
    settingsEconomyDesc: "Avval lokal lug'atni tekshiradi.",
    settingsMonochrome: "Kulrang rejim",
    settingsMonochromeDesc: "Rangli matnni o'chirish. Mantiq fonda ishlaydi.",
    settingsVoiceControl: "Ovozli boshqaruv",
    settingsVoiceControlDesc: "Gapirish orqali yozishni boshlash",
    settingsWakeWord: "Faollashtirish so'zi",
    vcActivated: "Ovozli buyruq qabul qilindi",

    // TIERS
    settingsFreeTier: "Bepul Kalit (Ovozsiz)",
    settingsPaidTier: "Pullik Kalit (To'liq)",
    paidFeatureTooltip: "Faqat pullik kalitlar uchun",

    howItWorksTitle: "RANGLAR MA'NOSI",
    howItWorksDesc: "1. Kulrang: Kiritish\n2. Sariq: Tekshirish\n3. Qizil: Xato (Lug'atda yo'q)\n4. Ko'k: Tasdiqlandi (OK)\n5. Binafsha: AI tuzatdi\n6. Yashil: Yakuniy",
    changeKey: "Kalitni o'zgartirish",
    footer: "FastType AI",
    
    // Clipboard
    clipboardTitle: "Bufer tarixi (Alt+V)",
    clipboardEmpty: "Tarix bo'sh",
    clipboardCopy: "Nusxalash",
    clipboardClear: "Tozalash",
    clipboardEnable: "Tarixni yoqish",
    clipboardSearch: "Qidirish...",
    
    // Tooltips
    tooltipLang: "Tilni o'zgartirish",
    tooltipStats: "Tuzatishlar soni",
    tooltipSettings: "Sozlamalar (Alt+S)",
    tooltipMin: "Kichraytirish",
    tooltipMax: "Kattalashtirish",
    tooltipClose: "Yopish",
    tooltipNoColors: "Rejim: Rangsiz (Kulrang)",
    tooltipColors: "Rejim: Rangli",
    
    // Header Actions
    btnHeaderClear: "Hammasini o'chirish",
    btnHeaderCopy: "Nusxalash",
    btnHeaderPaste: "Qo'yish",

    // Detailed Status & Modes
    detailDictation: "🟠 RANG: To'q sariq\nHARAKAT: Ovoz yozish\nNATIJA: Audio matnga",
    detailTyping: "⚪ RANG: Kulrang\nHARAKAT: Klaviatura kiritish\nNATIJA: Xom matn",
    detailDictCheck: "🟡 Sariq: Tekshirish...\n🔵 Ko'k: Topildi (OK)\n🔴 Qizil: Xato (Bazada yo'q)",
    detailAiFixing: "🟣 RANG: Binafsha\nHARAKAT: Gemini tuzatmoqda\nNATIJA: Toza matn",
    detailFinalizing: "🟢 RANG: Yashil\nHARAKAT: Yakunlash\nNATIJA: Tinish belgilari",
    detailScriptFix: "⚡ AVTO-FORMAT\nHARAKAT: Bo'shliqlar va registr\nNATIJA: Toza format",
    detailReset: "Jarayonni qayta boshlash",
    detailPause: "To'xtatish/Davom ettirish",
    tooltipPauseAction: "To'xtatish (Alt+A)",
    tooltipResumeAction: "Davom ettirish (Alt+A)",
    tooltipPin: "Yuqoriga mahkamlash",
    tooltipUnpin: "Yechish",

    // NEW KEYS
    modeSmart: "Rejim: Aqlli diktovka + Tahrir",
    modeTransOnly: "Rejim: Faqat transkripsiya",
    pausedScriptFix: "Avto-format: O'CHIQ",
    pausedDictCheck: "Lug'at: O'CHIQ",
    pausedAiFixing: "AI tuzatish: O'CHIQ",
    pausedFinalizing: "Yakunlash: O'CHIQ",

    // Visualizer
    waveProcessing: "Qayta ishlanmoqda...",
    waveProcessed: "Bajarildi",
    visGeminiLabel: "GEMINI",
    visListening: "ESHITMOQDA",
    visEditing: "ESHITISH / TAHRIR",
    visAnalyzingListening: "ESHITISH / TAHLIL",
    visAnalyzing: "TAHLIL",
    visDone: "TAYYOR",
    
    // Mic Test
    testMic: "Mikrofon testi",
    stopTest: "To'xtatish",
    noiseLevel: "Shovqin darajasi",
    silenceZone: "Jimlik (E'tiborsiz)",
    speechZone: "Nutq (Yozib olish)",
    micAccessError: "Mikrofonga ruxsat yo'q",
    
    // Audio Model
    audioModelTitle: "Audio Model",
    modelFlash: "Gemini 2.5 Flash (Tez)",
    modelPro: "Gemini 2.5 Pro (Aqlli)",
    ttsVoiceTitle: "Ovoz (TTS)", 
    
    // New Buttons
    btnHelp: "Yordam",
    btnHome: "Uyga",
    tooltipHelp: "Qisqa yordam (F1)",
    tooltipHome: "Bosh sahifaga qaytish",
    
    // History
    historyTitle: "Tarix (Alt+H)",
    historyEmpty: "Tarix bo'sh",
    historyRestore: "Ushbu versiyani tiklash",
    historyCurrent: "Joriy versiya",
    
    // History Tags
    tagRaw: "Xom kiritish",
    tagDictated: "Aytib yozilgan",
    tagProcessed: "Tahrirlangan",
    tagFinalized: "Yakuniy",
    tagEnhanced: "Yaxshilangan",
    tagRawDictation: "Xom diktovka",
    tagAiCorrected: "AI tuzatgan",
    
    // Help Modal
    helpModalTitle: "FastType AI Yordam",
    helpSection1: "Asosiy funksiyalar",
    helpDesc1: "Konveyer: Tekshirish (Sariq) -> Xato (Qizil) -> Tasdiq (Ko'k) -> AI Tuzatish (Binafsha) -> Yakuniy (Yashil). To'q sariq = Diktovka.",
    helpSection2: "Tugmalar",
    helpDesc2: "Ctrl+Z - Bekor qilish\nAlt+R - Yozish\nAlt+V - Bufer\nAlt+H - Tarix\nAlt+S - Sozlamalar\nAlt+A - Pauza",
    helpSection3: "Mikrofon",
    helpDesc3: "Bosing va gapiring. AI jimlikni avtomatik olib tashlaydi.",
    
    // Lock Screen
    lockTitle: "Tizimga kirish",
    lockDesc: "Ilova qulflangan. PIN kodni kiriting.",
    lockPlaceholder: "PIN kiritish",
    lockBtn: "Ochish",
    lockCreateTitle: "Himoya",
    lockCreateDesc: "Kirishni himoya qilish uchun PIN o'rnating.",
    lockCreatePlaceholder: "PIN yarating",
    lockSetBtn: "Saqlash",
    lockError: "Xato PIN kod",
    lockRemove: "PINni o'chirish",
    lockChange: "PINni o'zgartirish",
    lockVerifyOld: "Joriy PINni kiriting",
    lockNew: "Yangi PIN",
    lockSaved: "PIN o'rnatildi",
    lockForgot: "Unutdingizmi / Reset?",
    
    // Wipe
    wipeTitle: "DIQQAT! TO'LIQ TOZALASH",
    wipeDesc: "Bu harakat PIN kodni va barcha ma'lumotlarni o'chirib tashlaydi:\n• Tarix\n• Bufer\n• Sozlamalar\n\nOrtga qaytarib bo'lmaydi.",
    wipeConfirm: "Ha, tozalash va kirish",
    wipeCancel: "Bekor qilish",

    // General Buttons
    btnCreatePin: "PIN yaratish",
    btnBack: "Orqaga",
    
    // Dictionary Status
    dictStatus: "Lug'at tekshiruvi",
    dictRu: "RU Bazasi",
    dictEn: "EN Bazasi",
    dictWords: "so'z",
    dictMissing: "Bo'sh",
    
    // Translator
    transTitle: "Tarjimon",
    transInput: "Manba matn",
    transOutput: "Tarjima",
    transCopy: "Nusxalash",
    transClear: "Tozalash",
    transLangRuEn: "RU ➜ EN",
    transLangEnRu: "EN ➜ RU",
    transPlaceholder: "Tarjima uchun matn kiriting...",
    
    // Tabs
    tabEditor: "Tahrirlovchi",
    tabAssist: "Yordamchi",
    tabTrans: "Tarjimon",
    
    // Media
    uploadMedia: "Audio/Rasm yuklash",
    uploadProcessing: "Qayta ishlanmoqda...",
    dropHere: "Faylni tashlang",
    dropHint: "Audio (.mp3, .wav) yoki Rasm"
};