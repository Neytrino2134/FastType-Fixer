
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
  dictionaryCheck: boolean;
  // Visualizer Settings
  visualizerLowCut: number;
  visualizerHighCut: number;
  visualizerAmp: number;
  visualizerStyle: 'classic' | 'bars' | 'circular' | 'wave';
  visualizerNorm: boolean;
  visualizerGravity: number;
  visualizerMirror: boolean;
  developerMode: boolean;
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
  unknownSegments?: string[];
}

export interface EditorState {
  text: string;
  isProcessing: boolean;
  lastCorrectionTime: number | null;
  correctionCount: number;
}

export type ProcessingStatus = 'idle' | 'typing' | 'dict_check' | 'ai_fixing' | 'ai_finalizing' | 'done' | 'recording' | 'transcribing' | 'paused' | 'error' | 'enhancing' | 'script_fix';

export type VisualizerStatus = 'idle' | 'listening' | 'editing' | 'analyzing_listening' | 'analyzing' | 'done';

// Updated Language Type to be extensible
export type Language = 'ru' | 'en' | 'uz-latn' | 'uz-cyrl'; 

export type AppState = 'loading' | 'welcome' | 'app';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export type Tab = 'editor' | 'chat' | 'translator' | 'planner';

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

// --- PLANNER TYPES ---
export interface PlannerNote {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  color: 'yellow' | 'blue' | 'green' | 'purple' | 'red';
}

export interface PlannerTask {
  id: string;
  text: string;
  completed: boolean;
  timestamp: number;
}

// --- LOCALIZATION INTERFACES ---

export interface PromptDictionary {
  fixTypos: string;
  finalize: string;
  combined: string;
  system: string;
  enhance: string;
  transcribe: string;
  ocr: string;
}

// Loose interface for UI to allow flexibility, but strongly typed in implementation
export interface UIDictionary {
  [key: string]: string;
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