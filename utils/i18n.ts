
import { Language, UIDictionary, PromptDictionary } from '../types';
import { UI_RU } from '../locales/ui/ru';
import { UI_EN } from '../locales/ui/en';
import { UI_UZ_LATN } from '../locales/ui/uz_latn';
import { UI_UZ_CYRL } from '../locales/ui/uz_cyrl';
import { PROMPTS_RU } from '../locales/prompts/ru';
import { PROMPTS_EN } from '../locales/prompts/en';
import { PROMPTS_UZ_LATN } from '../locales/prompts/uz_latn';
import { PROMPTS_UZ_CYRL } from '../locales/prompts/uz_cyrl';

// --- CENTRAL DISPATCHER ---

type Resources = {
    [key in Language]: {
        ui: UIDictionary;
        prompts: PromptDictionary;
    }
};

const RESOURCES: Resources = {
    ru: {
        ui: UI_RU,
        prompts: PROMPTS_RU
    },
    en: {
        ui: UI_EN,
        prompts: PROMPTS_EN
    },
    'uz-latn': {
        ui: UI_UZ_LATN,
        prompts: PROMPTS_UZ_LATN
    },
    'uz-cyrl': {
        ui: UI_UZ_CYRL,
        prompts: PROMPTS_UZ_CYRL
    }
};

export const getTranslation = (lang: Language): UIDictionary => {
    // Fallback to EN if language not found (safety)
    return RESOURCES[lang]?.ui || RESOURCES['en'].ui;
};

export const getPrompts = (lang: Language): PromptDictionary => {
    // Fallback to EN if language not found
    return RESOURCES[lang]?.prompts || RESOURCES['en'].prompts;
};
