
import React from 'react';
import { ChatMessage } from '../../types';
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatBubbleProps {
  message: ChatMessage;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-4`}>
        
        {/* Avatar */}
        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 shadow-lg select-none ${
            isUser ? 'bg-indigo-600' : 'bg-slate-700'
        }`}>
            {isUser ? <User className="w-5 h-5 text-indigo-100" /> : <Bot className="w-5 h-5 text-slate-300" />}
        </div>

        {/* Bubble */}
        <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
            
            {/* Attachment Image */}
            {message.attachment && message.attachment.type === 'image' && (
                <div className="rounded-xl overflow-hidden border border-slate-700/50 shadow-md max-w-full select-none">
                    <img 
                        src={`data:${message.attachment.mimeType};base64,${message.attachment.data}`} 
                        alt="attachment" 
                        className="max-h-[200px] object-cover"
                    />
                </div>
            )}

            {/* Text Content */}
            {(message.text || message.isTyping) && (
                <div className={`relative px-5 py-4 rounded-2xl text-sm leading-relaxed shadow-md select-text cursor-text ${
                    isUser 
                        ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-100 rounded-tr-none' 
                        : 'bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-tl-none'
                }`}>
                    {message.isTyping && !message.text ? (
                        <div className="flex gap-1.5 items-center h-5 px-2 select-none">
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                        </div>
                    ) : (
                        <div className="markdown-content">
                            {isUser ? (
                                <p className="whitespace-pre-wrap">{message.text}</p>
                            ) : (
                                <ReactMarkdown
                                    components={{
                                        h1: ({node, ...props}: any) => <h1 className="text-xl font-bold text-white mb-3 mt-4 border-b border-slate-700 pb-2" {...props} />,
                                        h2: ({node, ...props}: any) => <h2 className="text-lg font-bold text-indigo-300 mb-2 mt-4" {...props} />,
                                        h3: ({node, ...props}: any) => <h3 className="text-base font-bold text-emerald-400 mb-2 mt-3" {...props} />,
                                        strong: ({node, ...props}: any) => <strong className="font-bold text-amber-200" {...props} />,
                                        em: ({node, ...props}: any) => <em className="italic text-slate-300" {...props} />,
                                        ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-3 space-y-1.5 marker:text-indigo-500" {...props} />,
                                        ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-3 space-y-1.5 marker:text-indigo-500" {...props} />,
                                        li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
                                        p: ({node, ...props}: any) => <p className="mb-3 last:mb-0" {...props} />,
                                        code: ({node, inline, className, children, ...props}: any) => {
                                            return inline ? (
                                                <code className="bg-slate-900/50 text-indigo-200 px-1.5 py-0.5 rounded font-mono text-xs border border-slate-700/50" {...props}>
                                                    {children}
                                                </code>
                                            ) : (
                                                <div className="bg-slate-950 rounded-lg border border-slate-800 p-3 my-3 overflow-x-auto">
                                                    <code className="font-mono text-xs text-slate-300 block" {...props}>
                                                        {children}
                                                    </code>
                                                </div>
                                            )
                                        },
                                        blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-indigo-500/50 pl-4 py-1 my-3 bg-indigo-500/5 rounded-r text-slate-300 italic" {...props} />,
                                        a: ({node, ...props}: any) => <a className="text-indigo-400 hover:text-indigo-300 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                                    }}
                                >
                                    {message.text}
                                </ReactMarkdown>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>

      </div>
    </div>
  );
};
