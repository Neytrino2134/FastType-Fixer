
import { useState } from 'react';
import { RecorderConfig } from '../types';

export const useAppState = () => {
  // --- UI MODES ---
  const [isEditorMode, setIsEditorMode] = useState(false);
  const [isTagEditorMode, setIsTagEditorMode] = useState(false);
  const [devSkip, setDevSkip] = useState(false);
  const [showRecModal, setShowRecModal] = useState(false);
  
  // --- GLOBAL PLAYLIST LOCK ---
  const [isPlaylistLocked, setPlaylistLocked] = useState(false);

  // --- RECORDING CONFIG ---
  const [recorderConfig, setRecorderConfig] = useState<RecorderConfig>({
    resolution: '1080p',
    fps: 60,
    videoBitrate: 8000000,
    audioBitrate: 192000
  });

  // --- SCREEN CAPTURE STATE ---
  const [screenVideo, setScreenVideo] = useState<MediaStream | null>(null);
  const [streamMode, setStreamMode] = useState<'bg' | 'window'>('bg');

  // --- HANDLERS ---
  const toggleEditor = (musicEngineIsPlaying: boolean, musicEngineToggle: () => void, playerStop: () => void, openLeftPanel: () => void, notify: (msg: string, type: any) => void) => {
    if (isEditorMode) {
      if (musicEngineIsPlaying) musicEngineToggle();
      setIsEditorMode(false);
      notify("EDITOR CLOSED", "info");
    } else {
      playerStop();
      setIsEditorMode(true);
      setIsTagEditorMode(false);
      openLeftPanel();
      notify("MUSIC STUDIO INITIALIZED", "success");
    }
  };

  const toggleTagEditor = (openLeftPanel: () => void, notify: (msg: string, type: any) => void) => {
    if (isTagEditorMode) {
      setIsTagEditorMode(false);
      notify("TAG EDITOR CLOSED", "info");
    } else {
      setIsTagEditorMode(true);
      setIsEditorMode(false);
      openLeftPanel();
      notify("TAG EDITOR INITIALIZED", "success");
    }
  };

  return {
    isEditorMode, setIsEditorMode,
    isTagEditorMode, setIsTagEditorMode,
    devSkip, setDevSkip,
    showRecModal, setShowRecModal,
    isPlaylistLocked, setPlaylistLocked,
    recorderConfig, setRecorderConfig,
    screenVideo, setScreenVideo,
    streamMode, setStreamMode,
    toggleEditor,
    toggleTagEditor
  };
};
