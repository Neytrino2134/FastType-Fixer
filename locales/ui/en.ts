


import { UIDictionary } from '../../types';

export const UI_EN: UIDictionary = {
    // --- WIZARD STEPS ---
    wizStep0Title: "Sound Setup",
    wizStep0Subtitle: "Enable voice guidance?",
    btnSoundOn: "Enable Sound",
    btnSoundOff: "Mute",

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

    // Welcome
    welcomeTitle: "Your Intelligent",
    welcomeSubtitle: "Typing Assistant.",
    welcomeDesc: "FastType AI runs in the background. Just type, and we'll handle the rest via a smart pipeline.",
    welcomeDisclaimer: "The app requires a Google (Gemini) API key. It is free, takes only 2 minutes to set up once.",
    
    feature1Title: "Instant Corrections",
    feature1Desc: "Automatically fixes typos during pauses.",
    feature2Title: "Style Enhancement",
    feature2Desc: "Turns drafts into professional text.",
    feature3Title: "Context Aware",
    feature3Desc: "Powered by Gemini 3 Flash.",
    
    setupTitle: "Access Setup",
    setupDesc: "Enter your Google Gemini API key to get started.",
    securityNote: "Developed with AI assistance. We guarantee privacy: data is not shared with third parties.",
    
    apiKeyLabel: "ENTER API KEY HERE",
    apiKeyTooltip: "Your key is stored locally only in your browser/app.",

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
    placeholder: "Start typing here... (or drop file)",
    chars: "chars",
    btnRecord: "Dictate (Alt+R)",
    btnStop: "Stop (Alt+R)",
    btnDevRecord: "Dictate (DEV)",
    btnEnhance: "Improve Text",
    btnUndo: "Undo",
    btnRedo: "Redo",
    btnSpeak: "Speak Text", 
    
    // Status
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
    statusTranscribing: "Processing...",
    statusDictation: "Dictation (Speech to Text)",
    statusDone: "Done",
    statusIdle: "Ready",
    statusPaused: "Paused",
    statusError: "Network Error",
    
    btnPause: "Pause",
    btnResume: "Resume",
    nothingToImprove: "Text is perfect. No improvements needed.",
    
    // Groups
    groupActive: "Active Correction",
    groupSilence: "Silence Threshold",
    groupModel: "Processing Model",

    // Settings
    settingsTitle: "Analysis Settings",
    settingsActive: "Active Mode",
    settingsMiniScripts: "Mini-Scripts",
    settingsMiniScriptsDesc: "Instant regex fixes for spacing and case (No AI)",
    settingsDevMode: "Developer Mode",
    settingsDevModeDesc: "Enables test buttons (Visualizer Test)",
    settingsDelay: "Delay (ms)",
    settingsDelayDesc: "Wait time before processing",
    settingsFinalization: "Idle Finalization (sec)",
    settingsEconomy: "Traffic Saver",
    settingsEconomyDesc: "Checks local dictionary first.",
    settingsMonochrome: "Grey Only Mode",
    settingsMonochromeDesc: "Disable text colors. Logic runs in background.",
    settingsVoiceControl: "Voice Control (Hands-Free)",
    settingsVoiceControlDesc: "Starts recording when you say the phrase",
    settingsWakeWord: "Trigger Phrase",
    vcActivated: "Voice Command Recognized",

    // TIERS
    settingsFreeTier: "Free Key (No Audio)",
    settingsPaidTier: "Paid Key (Full Access)",
    paidFeatureTooltip: "Only for Paid Tier keys",

    howItWorksTitle: "COLOR LEGEND",
    howItWorksDesc: "1. Grey: Input\n2. Yellow: Checking\n3. Red: Dict Error\n4. Blue: Verified (OK)\n5. Purple: AI Fixed\n6. Green: Final\n7. Orange: Dictation",
    changeKey: "Change API Key",
    footer: "FastType AI",
    
    // Clipboard
    clipboardTitle: "Clipboard History (Alt+V)",
    clipboardEmpty: "History is empty",
    clipboardCopy: "Copy",
    clipboardClear: "Clear All",
    clipboardEnable: "Enable History",
    clipboardSearch: "Search...",
    
    // Tooltips
    tooltipLang: "Switch Language",
    tooltipStats: "Corrections made",
    tooltipSettings: "Settings (Alt+S)",
    tooltipMin: "Minimize",
    tooltipMax: "Maximize",
    tooltipClose: "Close",
    tooltipNoColors: "Mode: Gray Only",
    tooltipColors: "Mode: Colorful",
    
    // Header Actions
    btnHeaderClear: "Clear All",
    btnHeaderCopy: "Copy All",
    btnHeaderPaste: "Paste",

    // Detailed Status & Modes
    detailDictation: "🟠 COLOR: Orange\nACTION: Voice Recording\nRESULT: Audio to Text",
    detailTyping: "⚪ COLOR: Grey\nACTION: Keyboard Input\nRESULT: Raw Text",
    detailDictCheck: "🟡 Yellow: Checking...\n🔵 Blue: Found (OK)\n🔴 Red: Error (Not in DB)",
    detailAiFixing: "🟣 COLOR: Purple\nACTION: Gemini Fixing\nRESULT: Clean Text",
    detailFinalizing: "🟢 COLOR: Green\nACTION: Finalizing\nRESULT: Punctuation",
    detailScriptFix: "⚡ AUTO-FORMAT\nACTION: Spacing and capitalization\nRESULT: Clean Format",
    detailReset: "Reset Processor State",
    detailPause: "Pause/Resume Processing",
    tooltipPauseAction: "Pause Processing (Alt+A)",
    tooltipResumeAction: "Resume Processing (Alt+A)",
    tooltipPin: "Pin Always on Top",
    tooltipUnpin: "Unpin",

    // NEW KEYS
    modeSmart: "Mode: Smart Dictation + Editor",
    modeTransOnly: "Mode: Transcription Only",
    pausedScriptFix: "Auto-Format: OFF",
    pausedDictCheck: "Dictionary: OFF",
    pausedAiFixing: "AI Fixing: OFF",
    pausedFinalizing: "Finalization: OFF",

    // Visualizer
    waveProcessing: "Processing...",
    waveProcessed: "Processed",
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
    
    // Audio Model
    audioModelTitle: "Audio Model",
    modelFlash: "Gemini 2.5 Flash (Fast)",
    modelPro: "Gemini 2.5 Pro (Smart)",
    ttsVoiceTitle: "TTS Voice", 
    
    // New Buttons
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
    helpDesc1: "Pipeline: Checking (Yellow) -> Error (Red) -> Verified (Blue) -> AI Fixed (Purple) -> Final (Green). Orange = Dictation.",
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
    lockVerifyOld: "Enter current PIN",
    lockNew: "New PIN",
    lockSaved: "PIN code set",
    lockForgot: "Forgot PIN / Reset?",
    
    // Wipe
    wipeTitle: "WARNING! FULL RESET",
    wipeDesc: "This action will remove the PIN code and unlock access. \n\n⚠️ ALL DATA WILL BE DELETED:\n• Text History\n• Clipboard Content\n• Personal Settings\n\nThis action cannot be undone.",
    wipeConfirm: "Yes, wipe data and unlock",
    wipeCancel: "Cancel",

    // General Buttons
    btnCreatePin: "Create PIN Code",
    btnBack: "Back",
    
    // Dictionary Status
    dictStatus: "Dictionary Check",
    dictRu: "RU Database",
    dictEn: "EN Database",
    dictWords: "words",
    dictMissing: "Empty",
    
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
    tabTrans: "Translator",
    tabPlanner: "Planner",
    
    // Media
    uploadMedia: "Upload Audio/Image",
    uploadProcessing: "Processing...",
    dropHere: "Drop file here",
    dropHint: "Audio (.mp3, .wav) or Images",

    // Planner
    planTitle: "Notes & Tasks",
    planNewNote: "Note",
    planNewTask: "Task",
    planDictateNote: "Dictate Note",
    planDictateTask: "Dictate Task",
    planClearDone: "Clear Done",
    planEmptyTasks: "No tasks for today",
    planEmptyNotes: "Your notes will appear here",
    planNotePlaceholder: "Note content...",
    planTaskPlaceholder: "New task...",
    planModeNote: "Mode: Notes",
    planModeTask: "Mode: Tasks"
};