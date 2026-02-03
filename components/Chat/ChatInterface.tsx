

import React from 'react';
import { Language } from '../../types';
import { useChatLogic } from '../../hooks/useChatLogic';
import { ChatBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { Volume2, VolumeX, Trash2, Bot } from 'lucide-react';

interface ChatInterfaceProps {
  language: Language;
  apiKey: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ language, apiKey }) => {
  const {
      messages,
      isLoading,
      activeModel,
      messagesEndRef,
      handleSendMessage,
      toggleVoice,
      isRecording,
      soundEnabled,
      setSoundEnabled,
      clearChat
  } = useChatLogic(language, apiKey);

  const t = {
      placeholder: language === 'ru' ? 'Сообщение... (Drop file or Paste image)' : 'Message... (Drop file or Paste image)',
      emptyTitle: language === 'ru' ? 'Чат с Gemini' : 'Gemini Chat',
      emptyDesc: language === 'ru' ? 'Я готов помочь с текстом, идеями или анализом изображений.' : 'I am ready to help with text, ideas, or image analysis.',
  };

  const modelNameDisplay = 'Gemini 3 Flash';

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 overflow-hidden">
        
        {/* Chat Toolbar */}
        <div className="shrink-0 h-10 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
                <span className="text-xs font-medium text-slate-400">{modelNameDisplay}</span>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`p-1.5 rounded transition-colors ${soundEnabled ? 'text-indigo-400 bg-indigo-900/20' : 'text-slate-600 hover:text-slate-400'}`}
                    title="Toggle Sound"
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
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
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

        {/* Input Area */}
        <ChatInput 
            onSend={handleSendMessage}
            onRecordToggle={toggleVoice}
            isRecording={isRecording}
            isLoading={isLoading}
            placeholder={t.placeholder}
        />
    </div>
  );
};