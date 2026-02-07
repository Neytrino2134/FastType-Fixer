
import React, { useState, useEffect, useRef } from 'react';
import { AudioArchiveItem, Language } from '../types';
import { getTranslation } from '../utils/i18n';
import { FileAudio, Play, Pause, Trash2, Download, X, Search, Archive } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';

interface AudioArchiveProps {
  items: AudioArchiveItem[];
  isOpen: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  language: Language;
}

// WAV Header Helper Functions
const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

const createWavHeader = (dataLength: number, sampleRate: number, numChannels: number, bitsPerSample: number): Uint8Array => {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length minus RIFF identifier length and file length field
  view.setUint32(4, 36 + dataLength, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  // bits per sample
  view.setUint16(34, bitsPerSample, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, dataLength, true);

  return new Uint8Array(header);
};

// Helper to convert base64 raw PCM to WAV Blob URL
const base64ToBlobUrl = (base64: string): string => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Construct WAV Header
    // Gemini 2.5 Flash TTS standard: 24kHz, Mono, 16-bit PCM
    const header = createWavHeader(len, 24000, 1, 16);
    
    // Combine Header + PCM Data
    const wavBytes = new Uint8Array(header.length + bytes.length);
    wavBytes.set(header, 0);
    wavBytes.set(bytes, header.length);

    const blob = new Blob([wavBytes], { type: 'audio/wav' }); 
    return URL.createObjectURL(blob);
};

export const AudioArchive: React.FC<AudioArchiveProps> = ({
  items,
  isOpen,
  onClose,
  onRemove,
  onClear,
  language
}) => {
  const t = getTranslation(language);
  const { addNotification } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Prevent transition on initial mount
  useEffect(() => {
     const timer = setTimeout(() => setIsReady(true), 100);
     return () => clearTimeout(timer);
  }, []);

  // Cleanup audio URLs on unmount
  useEffect(() => {
      return () => {
          if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current = null;
          }
      };
  }, []);

  const filteredItems = items.filter(item => 
    item.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePlay = (id: string, base64: string) => {
      if (playingId === id) {
          audioRef.current?.pause();
          setPlayingId(null);
          return;
      }

      if (audioRef.current) {
          audioRef.current.pause();
      }

      const url = base64ToBlobUrl(base64);
      const audio = new Audio(url);
      audioRef.current = audio;
      
      audio.onended = () => setPlayingId(null);
      audio.onerror = (e) => {
          console.error("Audio playback error", e);
          setPlayingId(null);
      };
      
      audio.play().catch(e => console.error("Playback failed", e));
      setPlayingId(id);
  };

  const handleDownload = (item: AudioArchiveItem) => {
      const filename = `speech-${item.timestamp}.wav`;
      const url = base64ToBlobUrl(item.base64Audio);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      addNotification(
          language === 'ru' 
            ? `Успешно сохранено: ${filename}` 
            : `Successfully Saved: ${filename}`, 
          'success'
      );
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
      <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
           <Archive className="w-4 h-4 text-purple-400" />
           <h3 className="text-sm font-semibold text-slate-200">{language === 'ru' ? 'Архив озвучки' : 'Audio Archive'}</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Controls */}
      <div className="p-4 bg-slate-900 shrink-0 space-y-3 border-b border-slate-800">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
          <input 
            type="text" 
            placeholder={t.clipboardSearch}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50 transition-colors"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        {items.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-48 text-slate-600 space-y-2">
             <FileAudio className="w-8 h-8 opacity-50" />
             <p className="text-xs">{t.historyEmpty}</p>
           </div>
        ) : (
          filteredItems.map(item => {
            const isPlaying = playingId === item.id;
            
            return (
                <div key={item.id} className="group bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 hover:border-purple-500/30 hover:bg-slate-800 transition-all">
                  <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-slate-300 line-clamp-2 font-medium mb-2 leading-relaxed">
                        {item.text}
                      </p>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 font-mono shrink-0">
                          {item.voice}
                      </span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/50">
                     <span className="text-[10px] text-slate-500">{formatDate(item.timestamp)}</span>
                     
                     <div className="flex items-center gap-1">
                         {/* Play */}
                         <button 
                           onClick={() => handlePlay(item.id, item.base64Audio)}
                           className={`p-1.5 rounded transition-colors ${isPlaying ? 'bg-purple-600 text-white' : 'hover:bg-slate-700 text-slate-400 hover:text-white'}`}
                           title="Play"
                         >
                            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                         </button>

                         {/* Download */}
                         <button 
                           onClick={() => handleDownload(item)}
                           className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-emerald-400 transition-colors"
                           title={language === 'ru' ? 'Скачать' : 'Download'}
                         >
                            <Download className="w-3.5 h-3.5" />
                         </button>

                         {/* Delete */}
                         <button 
                           onClick={() => onRemove(item.id)}
                           className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors"
                           title={language === 'ru' ? 'Удалить' : 'Delete'}
                         >
                            <Trash2 className="w-3.5 h-3.5" />
                         </button>
                     </div>
                  </div>
                </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {filteredItems.length > 0 && (
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
