
import { useState, useEffect, useCallback } from 'react';
import { VisualizerConfig, DvdConfig, EffectsConfig, MarqueeConfig, PatternConfig, BackgroundMedia, BackgroundPlaylist, AppPreset, CursorStyle, WatermarkConfig, ThemeType, ControlStyle, BgTransitionType, BgAnimationType, BgHotspot, EqualizerConfig } from '../types';
import { getAllBackgrounds, saveBackground, deleteBackground, getAllBgPlaylists, saveBgPlaylist, deleteBgPlaylistAndFiles } from '../lib/db';
import { 
  DEFAULT_VISUALIZER_CONFIG, 
  DEFAULT_REACTOR_CONFIG,
  DEFAULT_SINE_WAVE_CONFIG,
  DEFAULT_DVD_CONFIG, 
  DEFAULT_EFFECTS_CONFIG, 
  DEFAULT_MARQUEE_CONFIG, 
  DEFAULT_WATERMARK_CONFIG,
  DEFAULT_EQUALIZER_CONFIG
} from '../config/defaults';
import { DEFAULT_PRESETS, DEFAULT_SYSTEM_PRESET } from '../config/presets';

const STORAGE_KEYS = {
  VISUALIZER: 'neon_visualizer_config',
  REACTOR: 'neon_reactor_config',
  SINE_WAVE: 'neon_sine_wave_config', 
  DVD: 'neon_dvd_config',
  EFFECTS: 'neon_effects_config',
  BG_COLOR: 'neon_bg_color',
  BG_PATTERN: 'neon_bg_pattern',
  BG_PATTERN_CONFIG: 'neon_bg_pattern_config',
  SHOW_VISUALIZER: 'neon_show_visualizer',
  SHOW_VISUALIZER_3D: 'neon_show_visualizer_3d', 
  SHOW_SINE_WAVE: 'neon_show_sine_wave',
  SHOW_DVD: 'neon_show_dvd',
  MARQUEE: 'neon_marquee_config',
  WATERMARK: 'neon_watermark_config',
  BG_AUTOPLAY: 'neon_bg_autoplay_interval',
  PRESETS: 'neon_config_presets',
  ACTIVE_PRESET: 'neon_active_preset_id', 
  CURSOR: 'neon_cursor_style',
  RETRO_CURSOR: 'neon_retro_cursor_style',
  API_KEY: 'neon_gemini_api_key',
  BG_TRANSITION: 'neon_bg_transition',
  BG_ANIMATION: 'neon_bg_animation', 
  ADVANCED_MODE: 'neon_advanced_mode',
  USE_ALBUM_ART: 'neon_use_album_art',
  ACTIVE_BG_PLAYLIST: 'neon_active_bg_playlist',
  PLAYING_BG_PLAYLIST: 'neon_playing_bg_playlist',
  EQUALIZER: 'neon_equalizer_config' // NEW
};

// --- HELPER: SAFE MERGE ---
const safeMerge = <T>(defaults: T, source: any): T => {
  if (source === undefined || source === null) return defaults;
  if (typeof defaults !== 'object' || defaults === null) {
      return (typeof source === typeof defaults) ? source : defaults;
  }
  if (Array.isArray(defaults)) {
      return Array.isArray(source) ? source as unknown as T : defaults;
  }
  const result: any = { ...defaults }; 
  for (const key in defaults) {
      if (Object.prototype.hasOwnProperty.call(defaults, key)) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
              result[key] = safeMerge(defaults[key], source[key]);
          }
      }
  }
  return result as T;
};

const getInitial = <T,>(key: string, defaultValue: T): T => {
  const saved = localStorage.getItem(key);
  if (!saved) return defaultValue;
  try { 
      const parsed = JSON.parse(saved);
      return safeMerge(defaultValue, parsed);
  } catch { 
      return defaultValue; 
  }
};

export const useAppConfig = () => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEYS.API_KEY) || '');
  const [showVisualizer, setShowVisualizer] = useState(() => getInitial(STORAGE_KEYS.SHOW_VISUALIZER, true));
  const [showVisualizer3D, setShowVisualizer3D] = useState(() => getInitial(STORAGE_KEYS.SHOW_VISUALIZER_3D, false)); 
  const [showSineWave, setShowSineWave] = useState(() => getInitial(STORAGE_KEYS.SHOW_SINE_WAVE, false));
  const [showDvd, setShowDvd] = useState(() => getInitial(STORAGE_KEYS.SHOW_DVD, true));
  const [cursorStyle, setCursorStyle] = useState<CursorStyle>(() => getInitial(STORAGE_KEYS.CURSOR, 'theme-sync'));
  const [retroScreenCursorStyle, setRetroScreenCursorStyle] = useState<CursorStyle>(() => getInitial(STORAGE_KEYS.RETRO_CURSOR, 'dos-terminal'));
  const [bgTransition, setBgTransition] = useState<BgTransitionType>(() => getInitial(STORAGE_KEYS.BG_TRANSITION, 'glitch'));
  const [bgAnimation, setBgAnimation] = useState<BgAnimationType>(() => getInitial(STORAGE_KEYS.BG_ANIMATION, 'none')); 
  const [isAdvancedMode, setAdvancedMode] = useState(() => getInitial(STORAGE_KEYS.ADVANCED_MODE, false));
  const [useAlbumArtAsBackground, setUseAlbumArtAsBackground] = useState(() => getInitial(STORAGE_KEYS.USE_ALBUM_ART, false));
  
  const [marqueeConfig, setMarqueeConfig] = useState<MarqueeConfig>(() => getInitial(STORAGE_KEYS.MARQUEE, DEFAULT_MARQUEE_CONFIG));
  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig>(() => getInitial(STORAGE_KEYS.WATERMARK, DEFAULT_WATERMARK_CONFIG));
  const [equalizerConfig, setEqualizerConfig] = useState<EqualizerConfig>(() => getInitial(STORAGE_KEYS.EQUALIZER, DEFAULT_EQUALIZER_CONFIG));
  
  // Independent Configs
  const [visualizerConfig, setVisualizerConfig] = useState<VisualizerConfig>(() => getInitial(STORAGE_KEYS.VISUALIZER, DEFAULT_VISUALIZER_CONFIG));
  const [reactorConfig, setReactorConfig] = useState<VisualizerConfig>(() => getInitial(STORAGE_KEYS.REACTOR, DEFAULT_REACTOR_CONFIG));
  const [sineWaveConfig, setSineWaveConfig] = useState<VisualizerConfig>(() => getInitial(STORAGE_KEYS.SINE_WAVE, DEFAULT_SINE_WAVE_CONFIG));
  
  const [dvdConfig, setDvdConfig] = useState<DvdConfig>(() => getInitial(STORAGE_KEYS.DVD, DEFAULT_DVD_CONFIG));
  const [effectsConfig, setEffectsConfig] = useState<EffectsConfig>(() => getInitial(STORAGE_KEYS.EFFECTS, DEFAULT_EFFECTS_CONFIG));
  
  const [bgColor, setBgColor] = useState(() => localStorage.getItem(STORAGE_KEYS.BG_COLOR) || 'theme-sync');
  const [bgPattern, setBgPattern] = useState(() => localStorage.getItem(STORAGE_KEYS.BG_PATTERN) || 'none');
  const [bgPatternConfig, setBgPatternConfig] = useState<PatternConfig>(() => getInitial(STORAGE_KEYS.BG_PATTERN_CONFIG, { intensity: 0.25, scale: 1.0 }));
  
  // --- BACKGROUND PLAYLISTS STATE ---
  const [bgPlaylists, setBgPlaylists] = useState<BackgroundPlaylist[]>([]);
  const [activeBgPlaylistId, setActiveBgPlaylistId] = useState<string>(''); // For viewing/editing
  const [playingBgPlaylistId, setPlayingBgPlaylistId] = useState<string>(''); // For playback
  const [currentBgIndex, setCurrentBgIndex] = useState<number>(0);
  
  const [bgAutoplayInterval, setBgAutoplayInterval] = useState<number>(() => getInitial(STORAGE_KEYS.BG_AUTOPLAY, 5));
  
  // State to force timer reset
  const [timerResetToken, setTimerResetToken] = useState(0);

  // Active Preset State
  const [activePresetId, setActivePresetId] = useState<string | null>(() => {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_PRESET) || 'default_system';
  });

  const [savedPresets, setSavedPresets] = useState<AppPreset[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRESETS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) return parsed;
        return DEFAULT_PRESETS;
      } catch {
        return DEFAULT_PRESETS;
      }
    }
    return DEFAULT_PRESETS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VISUALIZER, JSON.stringify(visualizerConfig));
    localStorage.setItem(STORAGE_KEYS.REACTOR, JSON.stringify(reactorConfig));
    localStorage.setItem(STORAGE_KEYS.SINE_WAVE, JSON.stringify(sineWaveConfig));
    localStorage.setItem(STORAGE_KEYS.DVD, JSON.stringify(dvdConfig));
    localStorage.setItem(STORAGE_KEYS.EFFECTS, JSON.stringify(effectsConfig));
    localStorage.setItem(STORAGE_KEYS.BG_COLOR, bgColor);
    localStorage.setItem(STORAGE_KEYS.BG_PATTERN, bgPattern);
    localStorage.setItem(STORAGE_KEYS.BG_PATTERN_CONFIG, JSON.stringify(bgPatternConfig));
    localStorage.setItem(STORAGE_KEYS.SHOW_VISUALIZER, JSON.stringify(showVisualizer));
    localStorage.setItem(STORAGE_KEYS.SHOW_VISUALIZER_3D, JSON.stringify(showVisualizer3D));
    localStorage.setItem(STORAGE_KEYS.SHOW_SINE_WAVE, JSON.stringify(showSineWave));
    localStorage.setItem(STORAGE_KEYS.SHOW_DVD, JSON.stringify(showDvd));
    localStorage.setItem(STORAGE_KEYS.MARQUEE, JSON.stringify(marqueeConfig));
    localStorage.setItem(STORAGE_KEYS.WATERMARK, JSON.stringify(watermarkConfig));
    localStorage.setItem(STORAGE_KEYS.EQUALIZER, JSON.stringify(equalizerConfig));
    localStorage.setItem(STORAGE_KEYS.BG_AUTOPLAY, JSON.stringify(bgAutoplayInterval));
    localStorage.setItem(STORAGE_KEYS.CURSOR, JSON.stringify(cursorStyle));
    localStorage.setItem(STORAGE_KEYS.RETRO_CURSOR, JSON.stringify(retroScreenCursorStyle));
    localStorage.setItem(STORAGE_KEYS.BG_TRANSITION, JSON.stringify(bgTransition));
    localStorage.setItem(STORAGE_KEYS.BG_ANIMATION, JSON.stringify(bgAnimation)); 
    localStorage.setItem(STORAGE_KEYS.ADVANCED_MODE, JSON.stringify(isAdvancedMode));
    localStorage.setItem(STORAGE_KEYS.USE_ALBUM_ART, JSON.stringify(useAlbumArtAsBackground));
  }, [visualizerConfig, reactorConfig, sineWaveConfig, dvdConfig, effectsConfig, bgColor, bgPattern, bgPatternConfig, showVisualizer, showVisualizer3D, showSineWave, showDvd, marqueeConfig, watermarkConfig, bgAutoplayInterval, cursorStyle, retroScreenCursorStyle, bgTransition, bgAnimation, isAdvancedMode, useAlbumArtAsBackground, equalizerConfig]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(savedPresets));
  }, [savedPresets]);

  useEffect(() => {
    if (activePresetId) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_PRESET, activePresetId);
    } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_PRESET);
    }
  }, [activePresetId]);

  // Persist Active/Playing BG Playlist
  useEffect(() => {
      if (activeBgPlaylistId) localStorage.setItem(STORAGE_KEYS.ACTIVE_BG_PLAYLIST, activeBgPlaylistId);
      if (playingBgPlaylistId) localStorage.setItem(STORAGE_KEYS.PLAYING_BG_PLAYLIST, playingBgPlaylistId);
  }, [activeBgPlaylistId, playingBgPlaylistId]);

  // --- HYDRATE BACKGROUNDS AND PLAYLISTS ---
  useEffect(() => {
    const hydrate = async () => {
      const savedBgs = await getAllBackgrounds();
      const savedPlaylists = await getAllBgPlaylists();
      
      let hydratedPlaylists: BackgroundPlaylist[] = [];

      // MIGRATION: If we have files but no playlists, create default
      if (savedPlaylists.length === 0) {
          const defaultId = crypto.randomUUID();
          const defaultPl = { id: defaultId, name: 'DEFAULT', order: 0 };
          await saveBgPlaylist(defaultPl);
          
          // Migrate files
          const processedFiles = [];
          for (const bg of savedBgs) {
              const updated = { ...bg, playlistId: defaultId };
              
              if (!bg.playlistId) {
                  await saveBackground(updated);
                  bg.playlistId = defaultId;
              }
              processedFiles.push({
                  ...bg,
                  url: URL.createObjectURL(bg.file)
              });
          }
          
          hydratedPlaylists = [{ ...defaultPl, items: processedFiles }];
      } else {
          // Normal Load
          const processedFiles = savedBgs.map(bg => ({
              ...bg,
              url: URL.createObjectURL(bg.file)
          }));

          hydratedPlaylists = savedPlaylists.map(pl => ({
              ...pl,
              items: processedFiles.filter(f => f.playlistId === pl.id)
          }));
      }

      setBgPlaylists(hydratedPlaylists);

      const savedActive = localStorage.getItem(STORAGE_KEYS.ACTIVE_BG_PLAYLIST);
      const savedPlaying = localStorage.getItem(STORAGE_KEYS.PLAYING_BG_PLAYLIST);

      if (savedActive && hydratedPlaylists.some(p => p.id === savedActive)) {
          setActiveBgPlaylistId(savedActive);
      } else if (hydratedPlaylists.length > 0) {
          setActiveBgPlaylistId(hydratedPlaylists[0].id);
      }

      if (savedPlaying && hydratedPlaylists.some(p => p.id === savedPlaying)) {
          setPlayingBgPlaylistId(savedPlaying);
      } else if (hydratedPlaylists.length > 0) {
          setPlayingBgPlaylistId(hydratedPlaylists[0].id);
      }
      
      setCurrentBgIndex(0);
    };
    hydrate();
  }, []);

  // --- ACTIONS ---

  const handleBgUpload = async (files: FileList | File[]) => {
    if (!activeBgPlaylistId) return;

    const fileArray = Array.from(files);
    const newItems: BackgroundMedia[] = [];

    for (const file of fileArray) {
        const type = file.type.startsWith('video') ? 'video' : 'image';
        const id = crypto.randomUUID();
        const newItem: BackgroundMedia = { 
            id, 
            playlistId: activeBgPlaylistId, 
            type, 
            file, 
            url: URL.createObjectURL(file),
            hotspots: [] // Init empty
        };
        await saveBackground({ id, playlistId: activeBgPlaylistId, type, file, hotspots: [] });
        newItems.push(newItem);
    }

    setBgPlaylists(prev => prev.map(pl => {
        if (pl.id === activeBgPlaylistId) {
            return { ...pl, items: [...pl.items, ...newItems] };
        }
        return pl;
    }));
    
    if (activeBgPlaylistId === playingBgPlaylistId && currentBgIndex === 0) {
        setCurrentBgIndex(0);
    }
  };

  const updateBg = async (id: string, newFile: File) => {
      // Find current to keep metadata
      const currentPl = bgPlaylists.find(pl => pl.id === activeBgPlaylistId);
      const currentItem = currentPl?.items.find(i => i.id === id);
      const hotspots = currentItem?.hotspots || [];

      // Update DB
      await saveBackground({ id, playlistId: activeBgPlaylistId, type: 'image', file: newFile, hotspots });
      
      // Update State
      setBgPlaylists(prev => prev.map(pl => {
          if (pl.id === activeBgPlaylistId) {
              const updatedItems = pl.items.map(item => {
                  if (item.id === id) {
                      URL.revokeObjectURL(item.url); 
                      return { ...item, file: newFile, url: URL.createObjectURL(newFile), hotspots };
                  }
                  return item;
              });
              return { ...pl, items: updatedItems };
          }
          return pl;
      }));
  };

  const updateBgMetadata = async (id: string, hotspots: BgHotspot[]) => {
      // Find the playlist that contains this item (search all playlists)
      const currentPl = bgPlaylists.find(pl => pl.items.some(i => i.id === id));
      if (!currentPl) return;
      const currentItem = currentPl.items.find(i => i.id === id);
      if (!currentItem) return;

      // Update DB - This is critical for persistence "JSON file" effect
      await saveBackground({ 
          id, 
          playlistId: currentPl.id, 
          type: currentItem.type, 
          file: currentItem.file, 
          hotspots 
      });

      // Update State (Force new object reference to trigger UI updates)
      setBgPlaylists(prev => prev.map(pl => {
          if (pl.id === currentPl.id) {
              const updatedItems = pl.items.map(item => {
                  if (item.id === id) {
                      return { ...item, hotspots: [...hotspots] }; // Create new array ref
                  }
                  return item;
              });
              return { ...pl, items: updatedItems };
          }
          return pl;
      }));
  };

  const addBgPlaylist = async () => {
      const id = crypto.randomUUID();
      const name = `GROUP ${bgPlaylists.length + 1}`;
      const newPl = { id, name, order: bgPlaylists.length, items: [] };
      await saveBgPlaylist(newPl);
      setBgPlaylists(prev => [...prev, newPl]);
      setActiveBgPlaylistId(id);
  };

  const removeBgPlaylist = async (id: string) => {
      if (bgPlaylists.length <= 1) return;
      
      const plToDelete = bgPlaylists.find(p => p.id === id);
      if (plToDelete) {
          plToDelete.items.forEach(i => URL.revokeObjectURL(i.url));
      }
      
      await deleteBgPlaylistAndFiles(id);
      
      setBgPlaylists(prev => {
          const filtered = prev.filter(p => p.id !== id);
          if (id === activeBgPlaylistId) setActiveBgPlaylistId(filtered[0].id);
          if (id === playingBgPlaylistId) {
              setPlayingBgPlaylistId(filtered[0].id);
              setCurrentBgIndex(0);
          }
          return filtered;
      });
  };

  const renameBgPlaylist = async (id: string, newName: string) => {
      setBgPlaylists(prev => prev.map(p => {
          if (p.id === id) {
              const updated = { ...p, name: newName };
              saveBgPlaylist({ id: updated.id, name: updated.name, order: updated.order });
              return updated;
          }
          return p;
      }));
  };

  const removeBg = async (id: string) => {
    const playlist = bgPlaylists.find(pl => pl.items.some(i => i.id === id));
    if (!playlist) return;

    const item = playlist.items.find(i => i.id === id);
    if (item) URL.revokeObjectURL(item.url);

    await deleteBackground(id);

    setBgPlaylists(prev => prev.map(pl => {
        if (pl.id === playlist.id) {
            const newItems = pl.items.filter(i => i.id !== id);
            if (pl.id === playingBgPlaylistId) {
                if (newItems.length === 0) setCurrentBgIndex(0);
                else if (currentBgIndex >= newItems.length) setCurrentBgIndex(newItems.length - 1);
            }
            return { ...pl, items: newItems };
        }
        return pl;
    }));
  };

  const moveBg = (index: number, direction: 'up' | 'down') => {
    setBgPlaylists(prev => prev.map(pl => {
        if (pl.id === activeBgPlaylistId) {
            const newItems = [...pl.items];
            if (direction === 'up' && index > 0) {
                [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
                if (pl.id === playingBgPlaylistId) {
                    if (currentBgIndex === index) setCurrentBgIndex(index - 1);
                    else if (currentBgIndex === index - 1) setCurrentBgIndex(index);
                }
            } else if (direction === 'down' && index < newItems.length - 1) {
                [newItems[index + 1], newItems[index]] = [newItems[index], newItems[index + 1]];
                if (pl.id === playingBgPlaylistId) {
                    if (currentBgIndex === index) setCurrentBgIndex(index + 1);
                    else if (currentBgIndex === index + 1) setCurrentBgIndex(index);
                }
            }
            return { ...pl, items: newItems };
        }
        return pl;
    }));
  };

  const selectBg = (index: number) => {
      if (activeBgPlaylistId !== playingBgPlaylistId) {
          setPlayingBgPlaylistId(activeBgPlaylistId);
      }
      setCurrentBgIndex(index);
      setTimerResetToken(prev => prev + 1);
  };

  const deselectBg = () => {
      setCurrentBgIndex(-1);
      setTimerResetToken(prev => prev + 1);
  };

  const handleClearBg = async () => {
      if (!activeBgPlaylistId) return;
      const playlist = bgPlaylists.find(p => p.id === activeBgPlaylistId);
      if (!playlist) return;

      playlist.items.forEach(i => URL.revokeObjectURL(i.url));
      
      for (const item of playlist.items) {
          await deleteBackground(item.id);
      }

      setBgPlaylists(prev => prev.map(pl => {
          if (pl.id === activeBgPlaylistId) {
              if (pl.id === playingBgPlaylistId) setCurrentBgIndex(0);
              return { ...pl, items: [] };
          }
          return pl;
      }));
  };

  const shuffleBgList = () => {
      setBgPlaylists(prev => prev.map(pl => {
          if (pl.id === activeBgPlaylistId) {
              const shuffled = [...pl.items];
              for (let i = shuffled.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
              }
              if (pl.id === playingBgPlaylistId) {
                  setCurrentBgIndex(0);
                  setTimerResetToken(prev => prev + 1);
              }
              return { ...pl, items: shuffled };
          }
          return pl;
      }));
  };

  // --- CYCLING ---
  
  const getPlayingList = useCallback(() => {
      const pl = bgPlaylists.find(p => p.id === playingBgPlaylistId);
      return pl ? pl.items : [];
  }, [bgPlaylists, playingBgPlaylistId]);

  const nextBg = useCallback(() => {
    const list = getPlayingList();
    if (list.length === 0) return;
    setCurrentBgIndex(prev => (prev + 1) % list.length);
    setTimerResetToken(prev => prev + 1);
  }, [getPlayingList]);

  const prevBg = useCallback(() => {
    const list = getPlayingList();
    if (list.length === 0) return;
    setCurrentBgIndex(prev => (prev - 1 + list.length) % list.length);
    setTimerResetToken(prev => prev + 1);
  }, [getPlayingList]);

  useEffect(() => {
    const list = getPlayingList();
    if (list.length <= 1 || bgAutoplayInterval <= 0) return;
    const intervalMs = bgAutoplayInterval * 60 * 1000;
    const intervalId = setInterval(() => {
      nextBg();
    }, intervalMs);
    return () => clearInterval(intervalId);
  }, [getPlayingList, bgAutoplayInterval, nextBg, timerResetToken]);

  // --- PRESET MANAGEMENT ---

  const savePreset = (name: string, theme?: ThemeType, controlStyle?: ControlStyle) => {
    const newPreset: AppPreset = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      config: {
        visualizerConfig,
        reactorConfig,
        sineWaveConfig,
        dvdConfig,
        effectsConfig,
        marqueeConfig,
        watermarkConfig,
        bgColor,
        bgPattern,
        bgPatternConfig,
        showVisualizer,
        showVisualizer3D,
        showSineWave,
        showDvd,
        bgAutoplayInterval,
        cursorStyle,
        retroScreenCursorStyle,
        theme,
        controlStyle,
        bgTransition,
        bgAnimation,
        ambienceConfig: undefined,
        equalizerConfig // Save EQ
      }
    };
    
    setSavedPresets(prev => [...prev, newPreset]);
    setActivePresetId(newPreset.id);
  };

  const overwritePreset = (id: string, theme?: ThemeType, controlStyle?: ControlStyle) => {
      setSavedPresets(prev => prev.map(p => {
          if (p.id === id) {
              return {
                  ...p,
                  config: {
                    visualizerConfig,
                    reactorConfig,
                    sineWaveConfig,
                    dvdConfig,
                    effectsConfig,
                    marqueeConfig,
                    watermarkConfig,
                    bgColor,
                    bgPattern,
                    bgPatternConfig,
                    showVisualizer,
                    showVisualizer3D,
                    showSineWave,
                    showDvd,
                    bgAutoplayInterval,
                    cursorStyle,
                    retroScreenCursorStyle,
                    theme: theme || p.config.theme,
                    controlStyle: controlStyle || p.config.controlStyle,
                    bgTransition,
                    bgAnimation,
                    equalizerConfig // Save EQ
                  }
              };
          }
          return p;
      }));
  };

  const loadPreset = (id: string): AppPreset['config'] | null => {
    const preset = savedPresets.find(p => p.id === id);
    if (!preset) return null;

    const c = preset.config;
    
    // MERGE WITH DEFAULTS to prevent crashes from old presets
    const safeVisualizer = safeMerge(DEFAULT_VISUALIZER_CONFIG, c.visualizerConfig);
    const safeReactor = safeMerge(DEFAULT_REACTOR_CONFIG, c.reactorConfig || {});
    const safeSine = safeMerge(DEFAULT_SINE_WAVE_CONFIG, c.sineWaveConfig || {});
    const safeDvd = safeMerge(DEFAULT_DVD_CONFIG, c.dvdConfig);
    const safeEffects = safeMerge(DEFAULT_EFFECTS_CONFIG, c.effectsConfig);
    const safeMarquee = safeMerge(DEFAULT_MARQUEE_CONFIG, c.marqueeConfig);
    const safeWatermark = safeMerge(DEFAULT_WATERMARK_CONFIG, c.watermarkConfig || {});
    const safePatternConfig = safeMerge({ intensity: 0.25, scale: 1.0 }, c.bgPatternConfig);
    const safeEqualizer = safeMerge(DEFAULT_EQUALIZER_CONFIG, c.equalizerConfig || {});

    setVisualizerConfig(safeVisualizer);
    setReactorConfig(safeReactor);
    setSineWaveConfig(safeSine);
    setDvdConfig(safeDvd);
    setEffectsConfig(safeEffects);
    setMarqueeConfig(safeMarquee);
    setWatermarkConfig(safeWatermark);
    setEqualizerConfig(safeEqualizer);
    
    setBgColor(c.bgColor);
    setBgPattern(c.bgPattern);
    setBgPatternConfig(safePatternConfig);
    
    setShowVisualizer(c.showVisualizer);
    setShowVisualizer3D(c.showVisualizer3D || false);
    setShowSineWave(c.showSineWave || false);
    setShowDvd(c.showDvd);
    
    setBgAutoplayInterval(c.bgAutoplayInterval);
    if (c.cursorStyle) setCursorStyle(c.cursorStyle);
    if (c.retroScreenCursorStyle) setRetroScreenCursorStyle(c.retroScreenCursorStyle);
    if (c.bgTransition) setBgTransition(c.bgTransition);
    if (c.bgAnimation) setBgAnimation(c.bgAnimation);

    setActivePresetId(id);
    return c;
  };

  const deletePreset = (id: string) => {
    setSavedPresets(prev => prev.filter(p => p.id !== id));
    if (activePresetId === id) setActivePresetId(null);
  };

  const renamePreset = (id: string, newName: string) => {
    setSavedPresets(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
  };

  const resetDefaultPreset = () => {
      // Just returns default config to apply in App.tsx
      setActivePresetId(null);
      return DEFAULT_SYSTEM_PRESET.config;
  };

  const exportConfig = (currentTheme?: ThemeType, currentControlStyle?: ControlStyle) => {
      const configToExport = {
        visualizerConfig,
        reactorConfig,
        sineWaveConfig,
        dvdConfig,
        effectsConfig,
        marqueeConfig,
        watermarkConfig,
        bgColor,
        bgPattern,
        bgPatternConfig,
        showVisualizer,
        showVisualizer3D,
        showSineWave,
        showDvd,
        bgAutoplayInterval,
        cursorStyle,
        retroScreenCursorStyle,
        theme: currentTheme,
        controlStyle: currentControlStyle,
        bgTransition,
        bgAnimation,
        equalizerConfig
      };
      
      const blob = new Blob([JSON.stringify(configToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `neon-config-${Date.now()}.NRP`; // Neon Retro Player config
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const importConfig = async (file: File): Promise<string | null> => {
      return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
              try {
                  const content = e.target?.result as string;
                  const parsed = JSON.parse(content);
                  
                  // Create a new preset from imported config
                  const newPreset: AppPreset = {
                      id: crypto.randomUUID(),
                      name: file.name.replace('.NRP', '').replace('.json', '') + ' (Imported)',
                      createdAt: Date.now(),
                      config: parsed
                  };
                  
                  setSavedPresets(prev => [...prev, newPreset]);
                  resolve(newPreset.id);
              } catch (err) {
                  console.error("Failed to import config", err);
                  resolve(null);
              }
          };
          reader.readAsText(file);
      });
  };

  const batchImportPresets = async (files: File[]): Promise<string | null> => {
      let lastId: string | null = null;
      for (const file of files) {
          lastId = await importConfig(file);
      }
      return lastId;
  };

  // Derived state for consumers
  const playingList = getPlayingList();
  const currentBgMedia = playingList[currentBgIndex] || null;
  const activePlaylist = bgPlaylists.find(p => p.id === activeBgPlaylistId);
  const activeList = activePlaylist ? activePlaylist.items : [];

  return {
    apiKey, setApiKey,
    showVisualizer, setShowVisualizer,
    showVisualizer3D, setShowVisualizer3D,
    showSineWave, setShowSineWave,
    showDvd, setShowDvd,
    marqueeConfig, setMarqueeConfig,
    visualizerConfig, setVisualizerConfig,
    reactorConfig, setReactorConfig,
    sineWaveConfig, setSineWaveConfig,
    dvdConfig, setDvdConfig,
    effectsConfig, setEffectsConfig,
    watermarkConfig, setWatermarkConfig,
    equalizerConfig, setEqualizerConfig, // Export EQ
    bgColor, setBgColor,
    bgPattern, setBgPattern,
    bgPatternConfig, setBgPatternConfig,
    
    // Updated BG props
    bgMedia: currentBgMedia,
    bgList: activeList, // Return active list for UI editing
    bgPlaylists, // New
    activeBgPlaylistId, // New
    setActiveBgPlaylistId, // New
    playingBgPlaylistId, // New
    setPlayingBgPlaylistId, // New
    addBgPlaylist, // New
    removeBgPlaylist, // New
    renameBgPlaylist, // New
    
    currentBgIndex,
    bgAutoplayInterval, setBgAutoplayInterval,
    handleBgUpload, handleClearBg,
    removeBg, moveBg, selectBg, deselectBg,
    nextBg, prevBg,
    shuffleBgList, 
    bgCount: activeList.length,
    exportConfig, importConfig, batchImportPresets, 
    savedPresets,
    activePresetId,
    savePreset,
    overwritePreset,
    resetDefaultPreset,
    loadPreset,
    deletePreset,
    renamePreset,
    cursorStyle, setCursorStyle,
    retroScreenCursorStyle, setRetroScreenCursorStyle,
    bgTransition, setBgTransition,
    bgAnimation, setBgAnimation, 
    isAdvancedMode, setAdvancedMode,
    useAlbumArtAsBackground, setUseAlbumArtAsBackground,
    updateBg,
    updateBgMetadata // New export
  };
};
