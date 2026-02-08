
import React from 'react';
import { Volume2, VolumeX, Sparkles, Zap, Wand2, ShieldCheck, ArrowRight, ChevronLeft } from 'lucide-react';
import { Language } from '../../types';
import { getTranslation } from '../../utils/i18n';
import { TypingDemo } from './TypingDemo';

interface WelcomeWizardProps {
    wizardStep: number;
    language: Language;
    setLanguage: (lang: Language) => void;
    langConfirmation: boolean;
    setLangConfirmation: (v: boolean) => void;
    handleLanguageSelect: (lang: Language) => void;
    setIsMuted: (muted: boolean) => void;
    handleWizardNext: () => void;
    handleWizardBack: () => void;
    onNavigateSetup: () => void;
    onNavigateGuide: () => void;
    MuteButton: React.FC<{className?: string}>;
}

// Helper for cleaner feature rows
const FeatureRow = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
    <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/10 transition-colors duration-300">
        <div className="p-2 bg-slate-800 rounded-lg shrink-0 ring-1 ring-white/10">
            {icon}
        </div>
        <div>
            <h3 className="text-sm font-bold text-slate-200">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
        </div>
    </div>
);

export const WelcomeWizard: React.FC<WelcomeWizardProps> = ({
    wizardStep,
    language,
    langConfirmation,
    handleLanguageSelect,
    setIsMuted,
    handleWizardNext,
    handleWizardBack,
    onNavigateSetup,
    onNavigateGuide,
    MuteButton
}) => {
    const t = getTranslation(language);
    const totalWizardSteps = 5;

    const getLanguageConfirmationText = () => {
        switch(language) {
            case 'ru': return "Вы выбрали русский язык. Нажмите далее, чтобы продолжить.";
            case 'en': return "You selected English. Press Next to continue.";
            case 'uz-latn': return "Siz O'zbek (Lat) tilini tanladingiz. Davom etish uchun Keyingi tugmasini bosing.";
            case 'uz-cyrl': return "Сиз Ўзбек (Кир) тилини танладингиз. Давом этиш учун Кейинги тугмасини босинг.";
            default: return "Language selected. Press Next to continue.";
        }
    };

    return (
        <div className="flex-1 flex flex-col relative overflow-hidden">
            <div className="shrink-0 h-14 w-full flex items-center px-4 z-50 titlebar-drag-region">
                {wizardStep > 0 && <MuteButton />}
            </div>
            
            <div className="flex-1 relative">
                
                {/* STEP 0: SOUND CHECK */}
                <div className={`absolute inset-0 flex flex-col items-center justify-center p-8 transition-all duration-500 ${wizardStep === 0 ? 'opacity-100 translate-x-0' : wizardStep < 0 ? 'opacity-0 translate-x-10 pointer-events-none' : 'opacity-0 -translate-x-10 pointer-events-none'}`}>
                        <div className="bg-indigo-600/20 p-6 rounded-full mb-8 ring-1 ring-indigo-500/50">
                            <Volume2 className="w-12 h-12 text-indigo-400" />
                        </div>
                        <h1 className="text-3xl font-bold text-white text-center mb-2">{t.wizStep0Title}</h1>
                        <p className="text-xl text-slate-400 text-center mb-10">{t.wizStep0Subtitle}</p>
                        
                        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                            <button 
                            onClick={() => { setIsMuted(false); handleWizardNext(); }}
                            className="p-6 rounded-2xl border border-slate-700 bg-slate-800 hover:bg-emerald-900/20 hover:border-emerald-500/50 hover:text-emerald-400 transition-all duration-300 flex flex-col items-center gap-3 group"
                            >
                                <Volume2 className="w-8 h-8 group-hover:scale-110 transition-transform" />
                                <span className="font-bold">{t.btnSoundOn}</span>
                            </button>

                            <button 
                            onClick={() => { setIsMuted(true); handleWizardNext(); }}
                            className="p-6 rounded-2xl border border-slate-700 bg-slate-800 hover:bg-slate-700/50 hover:border-slate-600 hover:text-slate-300 transition-all duration-300 flex flex-col items-center gap-3 group"
                            >
                                <VolumeX className="w-8 h-8 group-hover:scale-110 transition-transform" />
                                <span className="font-bold">{t.btnSoundOff}</span>
                            </button>
                        </div>
                </div>

                {/* STEP 1: LANGUAGE */}
                <div className={`absolute inset-0 flex flex-col items-center justify-center p-8 transition-all duration-500 ${wizardStep === 1 ? 'opacity-100 translate-x-0' : wizardStep < 1 ? 'opacity-0 translate-x-10 pointer-events-none' : 'opacity-0 -translate-x-10 pointer-events-none'}`}>
                        <h2 className="text-2xl font-bold text-white mb-2">{t.wizStep2Title}</h2>
                        <p className="text-slate-400 text-center mb-8">{t.wizStep2Desc}</p>
                        
                        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-4">
                            <button 
                            onClick={() => handleLanguageSelect('ru')}
                            className={`p-4 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2 ${language === 'ru' ? 'bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500/50' : 'bg-slate-800 border-slate-700'}`}
                            >
                                <div className="text-2xl">🇷🇺</div>
                                <span className="font-bold text-white text-sm">Русский</span>
                            </button>

                            <button 
                            onClick={() => handleLanguageSelect('en')}
                            className={`p-4 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2 ${language === 'en' ? 'bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500/50' : 'bg-slate-800 border-slate-700'}`}
                            >
                                <div className="text-2xl">🇺🇸</div>
                                <span className="font-bold text-white text-sm">English</span>
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-6">
                            <button 
                            onClick={() => handleLanguageSelect('uz-latn')}
                            className={`p-4 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2 ${language === 'uz-latn' ? 'bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500/50' : 'bg-slate-800 border-slate-700'}`}
                            >
                                <div className="text-2xl">🇺🇿</div>
                                <span className="font-bold text-white text-sm">O'zbek</span>
                            </button>

                            <button 
                            onClick={() => handleLanguageSelect('uz-cyrl')}
                            className={`p-4 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2 ${language === 'uz-cyrl' ? 'bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500/50' : 'bg-slate-800 border-slate-700'}`}
                            >
                                <div className="text-2xl">🇺🇿</div>
                                <span className="font-bold text-white text-sm">Ўзбек</span>
                            </button>
                        </div>

                        {langConfirmation && (
                            <div className="animate-in slide-in-from-bottom-2 fade-in duration-300 bg-indigo-900/30 border border-indigo-500/30 text-indigo-200 px-4 py-3 rounded-lg text-sm text-center font-medium max-w-sm shadow-lg">
                                {getLanguageConfirmationText()}
                            </div>
                        )}
                </div>

                {/* STEP 2: INTRO */}
                <div className={`absolute inset-0 flex flex-col items-center justify-center p-8 transition-all duration-500 ${wizardStep === 2 ? 'opacity-100 translate-x-0' : wizardStep < 2 ? 'opacity-0 translate-x-10 pointer-events-none' : 'opacity-0 -translate-x-10 pointer-events-none'}`}>
                    <div className="bg-indigo-600 p-6 rounded-3xl shadow-2xl shadow-indigo-900/50 mb-8 animate-[bounce_2s_infinite]">
                        <Sparkles className="w-12 h-12 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white text-center mb-2">{t.wizStep1Title}</h1>
                    <p className="text-xl text-indigo-400 font-medium text-center mb-6">{t.wizStep1Subtitle}</p>
                    <p className="text-slate-400 text-center max-w-sm leading-relaxed">{t.wizStep1Desc}</p>
                </div>

                {/* STEP 3: FEATURES + DEMO */}
                <div className={`absolute inset-0 flex flex-col items-center justify-center p-8 transition-all duration-500 ${wizardStep === 3 ? 'opacity-100 translate-x-0' : wizardStep < 3 ? 'opacity-0 translate-x-10 pointer-events-none' : 'opacity-0 -translate-x-10 pointer-events-none'}`}>
                        <h2 className="text-2xl font-bold text-white mb-2">{t.wizStep3Title}</h2>
                        <p className="text-slate-400 text-center mb-6 max-w-sm text-sm">{t.wizStep3Desc}</p>
                        
                        <TypingDemo language={language} />

                        <div className="w-full max-w-sm space-y-3">
                            <FeatureRow icon={<Zap className="w-4 h-4 text-amber-400" />} title={t.feature1Title} desc={t.feature1Desc} />
                            <FeatureRow icon={<Wand2 className="w-4 h-4 text-purple-400" />} title={t.feature2Title} desc={t.feature2Desc} />
                        </div>
                </div>

                {/* STEP 4: API KEY */}
                <div className={`absolute inset-0 flex flex-col items-center justify-center p-8 transition-all duration-500 ${wizardStep === 4 ? 'opacity-100 translate-x-0' : wizardStep < 4 ? 'opacity-0 translate-x-10 pointer-events-none' : 'opacity-0 -translate-x-10 pointer-events-none'}`}>
                        <div className="bg-emerald-500/20 p-6 rounded-full mb-6 ring-1 ring-emerald-500/50">
                            <ShieldCheck className="w-12 h-12 text-emerald-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">{t.wizStep4Title}</h2>
                        <p className="text-slate-400 text-center mb-8 max-w-xs">{t.wizStep4Desc}</p>
                        
                        <div className="w-full max-w-sm space-y-3">
                        <button 
                            onClick={onNavigateSetup}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group shadow-lg shadow-indigo-900/20 hover:shadow-indigo-900/40 active:scale-95"
                        >
                            <span>{t.btnHaveKey}</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                        
                        <button 
                            onClick={onNavigateGuide}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold py-4 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 text-sm border border-slate-700 active:scale-95"
                        >
                            <span>{t.btnNoKey}</span>
                        </button>
                        </div>
                </div>
            </div>

            {/* WIZARD CONTROLS */}
            <div className="p-6 shrink-0 flex items-center justify-between border-t border-slate-800/50 bg-slate-900/50">
                <button 
                    onClick={handleWizardBack}
                    className={`text-slate-500 hover:text-white transition-colors text-sm font-medium ${wizardStep === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                >
                    {language === 'en' ? 'Back' : 'Назад'}
                </button>

                <div className="flex gap-2">
                    {[0, 1, 2, 3, 4].map(i => (
                        <div 
                            key={i} 
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === wizardStep ? 'w-6 bg-indigo-500' : 'w-1.5 bg-slate-700'}`} 
                        />
                    ))}
                </div>

                <button 
                    onClick={handleWizardNext}
                    className={`
                        transition-all duration-300 text-sm font-bold flex items-center gap-1
                        ${wizardStep === totalWizardSteps - 1 || wizardStep === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}
                        ${langConfirmation && wizardStep === 1 
                            ? 'bg-indigo-600 text-white px-6 py-3 rounded-xl animate-bounce shadow-lg shadow-indigo-500/40 hover:bg-indigo-500' 
                            : 'text-indigo-400 hover:text-indigo-300'
                        }
                    `}
                >
                    {language === 'en' ? 'Next' : 'Далее'} <ChevronLeft className={`w-4 h-4 rotate-180 ${langConfirmation && wizardStep === 1 ? 'animate-pulse' : ''}`} />
                </button>
            </div>

        </div>
    );
};
