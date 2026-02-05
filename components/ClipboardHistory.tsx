

import React, { useState, useEffect } from 'react';
import { ClipboardItem, Language } from '../types';
import { getTranslation } from '../utils/i18n';
import { ClipboardList, Copy, Trash2, Search, X, Power, PowerOff, Check } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';

interface ClipboardHistoryProps {
  items: ClipboardItem[];
  isOpen: boolean;
  isEnabled: boolean;
  onToggleEnabled: () => void;
  onClose: () => void;
  onClear: () => void;
  language: Language;
}

export const ClipboardHistory: React.FC<ClipboardHistoryProps> = ({
  items,
  isOpen,
  isEnabled,
  onToggleEnabled,
  onClose,
  onClear,
  language
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false); // To prevent slide-out animation on mount

  const t = getTranslation(language);
  const { addNotification } = useNotification();

  // Prevent transition on initial mount
  useEffect(() => {
     const timer = setTimeout(() => setIsReady(true), 100);
     return () => clearTimeout(timer);
  }, []);

  const filteredItems = items.filter(item => 
    item.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopy = async (id: string, text: string) => {
    try {
      // Attempt 1: Modern Async Clipboard API
      await navigator.clipboard.writeText(text);
      triggerSuccess(id);
    } catch (err) {
      // Attempt 2: Fallback for Electron/WebView restrictions
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        
        // Ensure it's not visible but part of DOM
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
            triggerSuccess(id);
        } else {
            throw new Error("Fallback copy failed");
        }
      } catch (fallbackErr) {
        console.error('Copy failed', fallbackErr);
        addNotification(
            language === 'ru' ? 'Ошибка копирования' : 'Copy failed',
            'error'
        );
      }
    }
  };

  const triggerSuccess = (id: string) => {
    setCopiedId(id);
    addNotification(
      language === 'ru' ? 'Скопировано' : 'Copied',
      'success'
    );
    
    // Reset button state after 2 seconds
    setTimeout(() => {
        setCopiedId(null);
    }, 2000);
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(timestamp));
  };

  return (
    <div 
        className={`
            absolute top-0 right-0 w-80 h-full bg-slate-900 border-l border-slate-800 shadow-2xl z-40 
            flex flex-col no-drag 
            ${isReady ? 'transition-transform duration-300 ease-in-out' : ''} 
            ${isOpen ? 'translate-x-0' : 'translate-x-full invisible pointer-events-none'}
        `}
    >
      
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
           <ClipboardList className="w-4 h-4 text-indigo-400" />
           <h3 className="text-sm font-semibold text-slate-200">{t.clipboardTitle}</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Controls */}
      <div className="p-4 bg-slate-900 shrink-0 space-y-3 border-b border-slate-800">
        
        {/* Toggle */}
        <div className="flex items-center justify-between">
           <span className="text-xs text-slate-400 font-medium">{t.clipboardEnable}</span>
           <button 
             onClick={onToggleEnabled}
             className={`relative w-10 h-5 rounded-full transition-colors ${isEnabled ? 'bg-indigo-600' : 'bg-slate-700'}`}
           >
              <span className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full shadow transition-transform ${isEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
           </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
          <input 
            type="text" 
            placeholder={t.clipboardSearch}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        {!isEnabled ? (
           <div className="flex flex-col items-center justify-center h-48 text-slate-600 space-y-2">
             <PowerOff className="w-8 h-8 opacity-50" />
             <p className="text-xs">History disabled</p>
           </div>
        ) : filteredItems.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-48 text-slate-600 space-y-2">
             <ClipboardList className="w-8 h-8 opacity-50" />
             <p className="text-xs">{t.clipboardEmpty}</p>
           </div>
        ) : (
          filteredItems.map(item => {
            const isCopied = copiedId === item.id;
            
            return (
                <div key={item.id} className="group bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 hover:border-indigo-500/30 hover:bg-slate-800 transition-all">
                  <p className="text-xs text-slate-300 line-clamp-3 mb-2 font-mono break-all">
                    {item.text}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/50">
                     <span className="text-[10px] text-slate-500">{formatDate(item.timestamp)}</span>
                     <button 
                       onClick={() => handleCopy(item.id, item.text)}
                       className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] transition-all duration-200 ${
                         isCopied 
                           ? 'bg-emerald-600 text-white' 
                           : 'bg-slate-700 hover:bg-indigo-600 text-slate-300 hover:text-white'
                       }`}
                     >
                        {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {isCopied ? (language === 'ru' ? 'Скопировано' : 'Copied') : t.clipboardCopy}
                     </button>
                  </div>
                </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {filteredItems.length > 0 && isEnabled && (
        <div className="p-3 border-t border-slate-800 bg-slate-900 shrink-0">
           <button 
             onClick={onClear}
             className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-red-900/30 hover:bg-red-950/20 text-red-400 text-xs transition-colors"
           >
             <Trash2 className="w-3.5 h-3.5" />
             {t.clipboardClear}
           </button>
        </div>
      )}

    </div>
  );
};
