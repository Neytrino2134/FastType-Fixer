
import { useState, useEffect, useRef } from 'react';
import { AmbienceFile, AmbienceConfig } from '../types';
import { getAllAmbience, saveAmbience, deleteAmbience } from '../lib/db';
import { useNotification } from '../contexts/NotificationContext';

export const useAmbience = () => {
  const [files, setFiles] = useState<AmbienceFile[]>([]);
  const [config, setConfig] = useState<AmbienceConfig>({
    activeId: null,
    isPlaying: false,
    volume: 0.5
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { addNotification } = useNotification();

  // Initialize Audio Element
  useEffect(() => {
    if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.loop = true;
    }
  }, []);

  // Load from DB on mount
  useEffect(() => {
    const load = async () => {
        try {
            const stored = await getAllAmbience();
            const processed = stored.map(s => ({
                ...s,
                url: URL.createObjectURL(s.file)
            }));
            setFiles(processed);
        } catch (e) {
            console.error("Failed to load ambience files", e);
        }
    };
    load();
  }, []);

  // Handle Playback Logic
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = config.volume;

    const playAudio = async () => {
        if (config.activeId && config.isPlaying) {
            const file = files.find(f => f.id === config.activeId);
            if (file && (!audio.src || audio.src !== file.url)) {
                audio.src = file.url;
                try {
                    await audio.play();
                } catch (e) {
                    console.warn("Ambience play failed", e);
                }
            } else if (file && audio.paused) {
                audio.play().catch(e => console.warn(e));
            }
        } else {
            audio.pause();
        }
    };

    playAudio();

  }, [config.activeId, config.isPlaying, files]);

  // Separate effect for volume to be responsive
  useEffect(() => {
      if (audioRef.current) {
          audioRef.current.volume = config.volume;
      }
  }, [config.volume]);

  // Actions
  const handleUpload = async (fileList: FileList) => {
      const newFiles: AmbienceFile[] = [];
      for (const file of Array.from(fileList)) {
          const id = crypto.randomUUID();
          const newItem = { id, name: file.name, file, url: URL.createObjectURL(file) };
          await saveAmbience({ id, name: file.name, file });
          newFiles.push(newItem);
      }
      setFiles(prev => [...prev, ...newFiles]);
      addNotification(`${newFiles.length} ambience tracks added`, 'success');
  };

  const handleDelete = async (id: string) => {
      // Stop if deleting active
      if (config.activeId === id) {
          setConfig(prev => ({ ...prev, activeId: null, isPlaying: false }));
          if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.src = "";
          }
      }
      
      const file = files.find(f => f.id === id);
      if (file) URL.revokeObjectURL(file.url);

      await deleteAmbience(id);
      setFiles(prev => prev.filter(f => f.id !== id));
  };

  const setActive = (id: string) => {
      if (config.activeId === id) {
          // Toggle play if clicking same
          setConfig(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
      } else {
          // Switch track and play
          setConfig(prev => ({ ...prev, activeId: id, isPlaying: true }));
      }
  };

  const togglePlay = () => {
      if (!config.activeId && files.length > 0) {
          // If nothing active, play first
          setConfig(prev => ({ ...prev, activeId: files[0].id, isPlaying: true }));
      } else if (config.activeId) {
          setConfig(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
      }
  };

  const setVolume = (v: number) => {
      setConfig(prev => ({ ...prev, volume: v }));
  };

  // Allow importing config (for presets)
  const importConfig = (newConfig: AmbienceConfig) => {
      // Validate if activeId exists in current files, else reset active
      const exists = files.some(f => f.id === newConfig.activeId);
      setConfig({
          ...newConfig,
          activeId: exists ? newConfig.activeId : null,
          isPlaying: exists ? newConfig.isPlaying : false
      });
  };

  return {
      files,
      config,
      handleUpload,
      handleDelete,
      setActive,
      togglePlay,
      setVolume,
      importConfig
  };
};
