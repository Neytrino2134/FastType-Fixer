

export interface CorrectionSettings {
  enabled: boolean;
  debounceMs: number;
  finalizationTimeout: number; // New setting for idle timeout
  fixTypos: boolean;
  fixPunctuation: boolean;
  clipboardEnabled: boolean;
  silenceThreshold: number; // 0-100, maps to RMS sensitivity
  audioModel: 'gemini-2.5-flash' | 'gemini-2.5-pro';
  economyMode: boolean; // Traffic saver mode
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
  processedLength: number;
  tags?: string[]; // Added tags for history categorization
  finalizedSentences?: string[]; // New: Content based checkpoints
}

export interface EditorState {
  text: string;
  isProcessing: boolean;
  lastCorrectionTime: number | null;
  correctionCount: number;
}

export type ProcessingStatus = 'idle' | 'typing' | 'thinking' | 'correcting' | 'grammar_check' | 'done' | 'enhancing' | 'recording' | 'transcribing' | 'paused';

export type VisualizerStatus = 'idle' | 'listening' | 'editing' | 'analyzing_listening' | 'analyzing' | 'done';

export type Language = 'ru' | 'en';

export type AppState = 'loading' | 'welcome' | 'app';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export type Tab = 'editor' | 'chat';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

export interface Attachment {
  type: 'image';
  mimeType: string;
  data: string; // base64 string
  name?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isTyping?: boolean; // For streaming effect
  attachment?: Attachment; // Added attachment support
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