

export interface CorrectionSettings {
  enabled: boolean;
  debounceMs: number;
  finalizationTimeout: number; 
  miniScripts: boolean; 
  fixTypos: boolean;
  fixPunctuation: boolean;
  clipboardEnabled: boolean;
  silenceThreshold: number; 
  audioModel: 'gemini-2.5-flash' | 'gemini-2.5-pro';
  economyMode: boolean; 
  // Visualizer Settings
  visualizerLowCut: number; // 0-20
  visualizerHighCut: number; // 20-128
  visualizerAmp: number; // 0.5 - 3.0 multiplier
  visualizerStyle: 'classic' | 'bars' | 'circular' | 'wave'; // New Setting
}

export interface ClipboardItem {
  id: string;
  text: string;
  timestamp: number;
}

export interface HistorySnapshot {
  id: string;
  timestamp: number;
  text: string;
  committedLength: number; 
  correctedLength: number; 
  checkedLength: number;   
  processedLength: number; 
  tags?: string[];
  finalizedSentences?: string[];
  aiFixedSegments?: string[]; 
  dictatedSegments?: string[]; 
}

export interface EditorState {
  text: string;
  isProcessing: boolean;
  lastCorrectionTime: number | null;
  correctionCount: number;
}

export type ProcessingStatus = 'idle' | 'typing' | 'dict_check' | 'ai_fixing' | 'ai_finalizing' | 'done' | 'recording' | 'transcribing' | 'paused' | 'error' | 'enhancing' | 'script_fix';

export type VisualizerStatus = 'idle' | 'listening' | 'editing' | 'analyzing_listening' | 'analyzing' | 'done';

export type Language = 'ru' | 'en';

export type AppState = 'loading' | 'welcome' | 'app';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export type Tab = 'editor' | 'chat' | 'translator';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

export interface Attachment {
  type: 'image';
  mimeType: string;
  data: string; 
  name?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isTyping?: boolean; 
  attachment?: Attachment; 
}

declare global {
  interface Window {
    require: any;
    electron?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
    };
  }
}