
import React, { useEffect } from 'react';
import { Language, CorrectionSettings, Tab } from '../../types';
import { useChatLogic } from '../../hooks/useChatLogic';
import { ChatBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { Volume2, VolumeX, Trash2, Bot, AudioWaveform, PhoneOff, Mic, Sparkles, ClipboardList } from 'lucide-react';
import { VisualizerCanvas } from '../Editor/VisualizerCanvas';
import { getTranslation } from '../../utils/i18n';

interface ChatInterfaceProps {
  language: Language;
  apiKey: string;
  settings?: CorrectionSettings;
  transferRequest?: { text: string, target: Tab, timestamp: number } | null;
  onToggleClipboard?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ language, apiKey, settings, transferRequest, onToggleClipboard }) => {
  const silenceThreshold = settings?.silenceThreshold || 20;
  const tLoc = getTranslation(language);

  const {
      messages,
      inputText,
      setInputText,
      isLoading,
      activeModel,
      messagesEndRef,
      handleSendMessage,
      toggleVoice,
      isRecording,
      isAnalyzing,
      soundEnabled,
      setSoundEnabled,
      clearChat,
      visualizerDataRef,
      isLive,
      isLiveConnecting,
      liveError,
      toggleLiveMode,
      liveVisualizerDataRef
  } = useChatLogic(language, apiKey, silenceThreshold);

  // Monitor incoming transfer requests
  useEffect(() => {
      if (transferRequest && transferRequest.target === 'chat') {
          setInputText(transferRequest.text);
      }
  }, [transferRequest, setInputText]);

  const t = {
      placeholder: language === 'ru' ? 'Сообщение... (Drop file or Paste image)' : 'Message... (Drop file or Paste image)',
      emptyTitle: language === 'ru' ? 'Чат с Gemini' : 'Gemini Chat',
      emptyDesc: language === 'ru' ? 'Я готов помочь с текстом, идеями или анализом изображений.' : 'I am ready to help with text, ideas, or image analysis.',
      liveConnecting: language === 'ru' ? 'Подключение к Live...' : 'Connecting to Live...',
      liveActive: language === 'ru' ? 'Gemini слушает' : 'Gemini is listening',
      liveEnd: language === 'ru' ? 'Завершить звонок' : 'End Call',
      statusListening: tLoc.visListening || "LISTENING",
      statusAnalyzing: tLoc.visAnalyzing || "ANALYZING"
  };

  const modelNameDisplay = 'Gemini 3 Flash';

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 overflow-hidden relative select-none">
        
        {/* Background Visualizer Layer */}
        {!isLive && (
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
                <VisualizerCanvas 
                    visualizerDataRef={visualizerDataRef}
                    isRecording={isRecording || isAnalyzing} // Keep waves alive during analyzing
                    visualizerStyle="wave"
                    amp={0.8}
                    lowCut={0}
                    highCut={50}
                    rounded={true}
                    silenceThreshold={silenceThreshold}
                />
            </div>
        )}

        {/* LIVE MODE OVERLAY */}
        {isLive && (
            <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
                <div className="absolute inset-0 z-0 opacity-60">
                     <VisualizerCanvas 
                        visualizerDataRef={liveVisualizerDataRef}
                        isRecording={true}
                        visualizerStyle="circular"
                        amp={1.5}
                        lowCut={5}
                        highCut={100}
                        rounded={true}
                        norm={true}
                        gravity={4}
                     />
                </div>

                <div className="z-10 flex flex-col items-center gap-8">
                    <div className="relative">
                        <div className="w-32 h-32 rounded-full bg-indigo-600/20 flex items-center justify-center animate-pulse">
                            <div className="w-24 h-24 rounded-full bg-indigo-500/30 flex items-center justify-center">
                                <Bot className="w-12 h-12 text-indigo-400" />
                            </div>
                        </div>
                        {isLiveConnecting && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-full h-full border-4 border-t-indigo-500 border-indigo-900/0 rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>

                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold text-white tracking-tight">
                            {isLiveConnecting ? t.liveConnecting : t.liveActive}
                        </h2>
                        <p className="text-indigo-400 font-mono text-sm animate-pulse">
                            Gemini 2.5 Live
                        </p>
                    </div>

                    <button 
                        onClick={toggleLiveMode}
                        className="mt-8 flex items-center gap-3 px-8 py-4 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold shadow-[0_0_30px_rgba(220,38,38,0.4)] transition-all hover:scale-105 active:scale-95 group"
                    >
                        <PhoneOff className="w-6 h-6 group-hover:shake" />
                        {t.liveEnd}
                    </button>
                </div>
            </div>
        )}

        {/* Chat Toolbar */}
        <div className="shrink-0 h-10 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm z-10">
            <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
                <span className="text-xs font-medium text-slate-400">{modelNameDisplay}</span>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={toggleLiveMode}
                    disabled={isLiveConnecting}
                    className={`flex items-center gap-2 px-3 py-1 rounded-md transition-all ${
                        isLiveConnecting 
                            ? 'bg-indigo-900/50 text-indigo-400' 
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20'
                    }`}
                    title="Live Voice Chat"
                >
                    <AudioWaveform className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Live</span>
                </button>

                <div className="w-px h-4 bg-slate-800 mx-1"></div>

                {onToggleClipboard && (
                    <button 
                        onClick={onToggleClipboard}
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-white transition-colors"
                        title={tLoc.clipboardTitle || "Clipboard"}
                    >
                        <ClipboardList className="w-4 h-4" />
                    </button>
                )}

                <button 
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`p-1.5 rounded transition-colors ${soundEnabled ? 'text-indigo-400 bg-indigo-900/20' : 'text-slate-600 hover:text-slate-400'}`}
                    title="Toggle Text-to-Speech"
                >
                    {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button 
                    onClick={clearChat}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-600 hover:text-red-400 transition-colors"
                    title="Clear Chat"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 z-10 relative">
            {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-4">
                    <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center">
                        <Bot className="w-8 h-8 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-300">{t.emptyTitle}</h3>
                        <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">{t.emptyDesc}</p>
                    </div>
                </div>
            ) : (
                messages.map(msg => (
                    <ChatBubble key={msg.id} message={msg} />
                ))
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* STATUS BADGES OVERLAY */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 flex flex-col-reverse items-center gap-2 pointer-events-none w-full max-w-md px-4">
            
            {/* Listening Badge */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-lg backdrop-blur-md transition-all duration-300 ease-out transform ${isRecording ? 'opacity-100 translate-y-0 scale-100 bg-orange-950/90 border-orange-500/50 text-orange-200 shadow-orange-500/20' : 'opacity-0 translate-y-4 scale-90 pointer-events-none'}`}>
                <Mic className="w-4 h-4 text-orange-400 animate-pulse" />
                <span className="text-xs font-bold tracking-wider">{t.statusListening}</span>
            </div>

            {/* Analyzing Badge - Shows when processing (even after recording stops) */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-lg backdrop-blur-md transition-all duration-300 ease-out transform ${isAnalyzing ? 'opacity-100 translate-y-0 scale-100 bg-sky-950/90 border-sky-500/50 text-sky-200 shadow-sky-500/20' : 'opacity-0 translate-y-4 scale-90 pointer-events-none absolute'}`}>
                <Sparkles className="w-4 h-4 text-sky-400 animate-spin" />
                <span className="text-xs font-bold tracking-wider">{t.statusAnalyzing}</span>
            </div>
        </div>

        {/* Input Area */}
        <div className="z-20 relative">
            <ChatInput 
                onSend={handleSendMessage}
                onRecordToggle={toggleVoice}
                isRecording={isRecording}
                isLoading={isLoading}
                placeholder={t.placeholder}
                value={inputText}
                onChange={setInputText}
            />
        </div>
        
        {liveError && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-red-900/90 text-red-200 px-4 py-2 rounded-lg text-sm border border-red-500/50 shadow-xl z-[60] animate-in slide-in-from-bottom-2">
                Error: {liveError}
            </div>
        )}
    </div>
  );
};
