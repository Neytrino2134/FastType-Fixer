
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AudioTrack, EqualizerConfig } from '../types';
import { useLibrary } from './useLibrary';
import { useWebAudio } from './useWebAudio';
import { DEFAULT_EQUALIZER_CONFIG } from '../config/defaults';

export const useAudioPlayer = () => {
  const lib = useLibrary(); // Logic for DB and Playlists
  const [volume, setVolumeState] = useState(0.75);
  const audio = useWebAudio(volume); // Logic for AudioContext

  // --- PLAYBACK STATE ---
  const audioRefA = useRef<HTMLAudioElement>(null);
  const audioRefB = useRef<HTMLAudioElement>(null);
  const activeDeckRef = useRef<'A' | 'B'>('A');
  const [activeDeck, setActiveDeck] = useState<'A' | 'B'>('A');
  const sourceNodeRefA = useRef<MediaElementAudioSourceNode | null>(null);
  const sourceNodeRefB = useRef<MediaElementAudioSourceNode | null>(null);

  const [playingPlaylistId, setPlayingPlaylistId] = useState<string>('');
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | undefined>(undefined);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Settings
  const [crossfadeDuration, setCrossfadeDuration] = useState(3);
  const [smoothStart, setSmoothStart] = useState(false);
  
  // Persisted Playback Modes
  const [isShuffle, setIsShuffle] = useState(() => {
      return localStorage.getItem('neon_is_shuffle') === 'true';
  });
  const [isAutoNextPlaylist, setIsAutoNextPlaylist] = useState(() => {
      return localStorage.getItem('neon_auto_next_playlist') === 'true';
  });

  // EQ State
  const [eqConfig, setEqConfig] = useState<EqualizerConfig>(() => {
      const saved = localStorage.getItem('neon_equalizer_config');
      return saved ? JSON.parse(saved) : DEFAULT_EQUALIZER_CONFIG;
  });

  // Refs for logic
  const hasTriggeredAutoMixRef = useRef(false);

  // --- PERSISTENCE ---
  useEffect(() => {
      if (playingPlaylistId) localStorage.setItem('neon_playing_playlist', playingPlaylistId);
  }, [playingPlaylistId]);

  useEffect(() => {
      if (currentTrackIndex >= 0) {
          localStorage.setItem('neon_track_index', currentTrackIndex.toString());
      }
  }, [currentTrackIndex]);

  useEffect(() => {
      localStorage.setItem('neon_is_shuffle', String(isShuffle));
  }, [isShuffle]);

  useEffect(() => {
      localStorage.setItem('neon_auto_next_playlist', String(isAutoNextPlaylist));
  }, [isAutoNextPlaylist]);

  useEffect(() => {
      localStorage.setItem('neon_equalizer_config', JSON.stringify(eqConfig));
  }, [eqConfig]);

  // --- RESTORE STATE ON LOAD ---
  useEffect(() => {
      if (lib.isReady && lib.playlists.length > 0) {
          const savedPlayingId = localStorage.getItem('neon_playing_playlist');
          const savedIndexStr = localStorage.getItem('neon_track_index');
          let savedIndex = parseInt(savedIndexStr || '0', 10);
          
          let targetPlayingId = savedPlayingId;
          
          // Verify ID still exists
          if (!targetPlayingId || !lib.playlists.some(p => p.id === targetPlayingId)) {
              // Fallback to active playlist from library if available
              targetPlayingId = lib.activePlaylistId;
          }

          const playingPl = lib.playlists.find(p => p.id === targetPlayingId);
          if (playingPl && playingPl.tracks.length > 0) {
              setPlayingPlaylistId(targetPlayingId);
              if (savedIndex < 0 || savedIndex >= playingPl.tracks.length) savedIndex = 0;
              
              const track = playingPl.tracks[savedIndex];
              setCurrentTrack(track);
              setCurrentTrackIndex(savedIndex);
              
              if (audioRefA.current) audioRefA.current.src = track.url;
          }
      }
  }, [lib.isReady]); // Run only when library finishes loading DB

  // --- CONNECT AUDIO NODES ---
  useEffect(() => {
      if (!audio.audioContextRef.current || !audio.eqInputNodeRef.current) return;
      
      const ctx = audio.audioContextRef.current;
      const targetNode = audio.eqInputNodeRef.current; // Connect to EQ Entry, not Master Gain

      if (audioRefA.current && !sourceNodeRefA.current) {
          const src = ctx.createMediaElementSource(audioRefA.current);
          src.connect(targetNode);
          sourceNodeRefA.current = src;
      }
      if (audioRefB.current && !sourceNodeRefB.current) {
          const src = ctx.createMediaElementSource(audioRefB.current);
          src.connect(targetNode);
          sourceNodeRefB.current = src;
      }
  }, [audio.eqInputNodeRef]); // Re-run if node ref populates (usually mount)

  // --- EQUALIZER UPDATE ---
  useEffect(() => {
      if (!audio.eqFiltersRef.current || audio.eqFiltersRef.current.length === 0) return;
      
      const filters = audio.eqFiltersRef.current;
      
      filters.forEach((filter, i) => {
          // If EQ disabled, set flat (0 gain). If enabled, set band value.
          const gainValue = eqConfig.enabled ? eqConfig.bands[i] : 0;
          
          // Smooth transition to prevent clicks
          if (audio.audioContextRef.current) {
              const now = audio.audioContextRef.current.currentTime;
              filter.gain.cancelScheduledValues(now);
              filter.gain.linearRampToValueAtTime(gainValue, now + 0.1);
          } else {
              filter.gain.value = gainValue;
          }
      });
  }, [eqConfig, audio.eqFiltersRef]);

  // --- HELPERS ---
  const getPlayingTracks = useCallback(() => {
      return lib.playlists.find(p => p.id === playingPlaylistId)?.tracks || [];
  }, [lib.playlists, playingPlaylistId]);

  const setVolume = (vol: number) => {
      setVolumeState(vol);
      // Actual gain update handled by useEffect in useWebAudio
  };

  const setEqBand = (index: number, value: number) => {
      setEqConfig(prev => {
          const newBands = [...prev.bands];
          newBands[index] = value;
          return { ...prev, bands: newBands, preset: 'custom' };
      });
  };

  const setEqPreset = (presetId: string, bands: number[]) => {
      setEqConfig(prev => ({ ...prev, preset: presetId, bands }));
  };

  const toggleEq = () => {
      setEqConfig(prev => ({ ...prev, enabled: !prev.enabled }));
  };

  const seek = (time: number) => {
      const el = activeDeck === 'A' ? audioRefA.current : audioRefB.current;
      if (el) {
          el.currentTime = time;
          setCurrentTime(time);
      }
  };

  // --- PLAYBACK LOGIC ---
  const togglePlay = async () => {
      await audio.resumeContext();

      const el = activeDeck === 'A' ? audioRefA.current : audioRefB.current;
      if (!el) return;

      if (isPlaying) {
          el.pause();
          setIsPlaying(false);
          // Reset gain to full volume immediately in case we paused during a fade
          if (audio.gainNodeRef.current && audio.audioContextRef.current) {
              try {
                  audio.gainNodeRef.current.gain.cancelScheduledValues(audio.audioContextRef.current.currentTime);
                  audio.gainNodeRef.current.gain.value = volume;
              } catch(e) {}
          }
      } else {
          try {
              // Safety: If no current track but we have tracks
              if (!currentTrack && lib.tracks.length > 0 && lib.activePlaylistId === playingPlaylistId) {
                  const first = lib.tracks[0];
                  setCurrentTrack(first);
                  setCurrentTrackIndex(0);
                  el.src = first.url;
              } else if (!el.src && currentTrack) {
                  el.src = currentTrack.url;
              }
              
              if (el.src) {
                  // SMOOTH START
                  if (audio.gainNodeRef.current && smoothStart) {
                      const ctx = audio.audioContextRef.current!;
                      audio.gainNodeRef.current.gain.cancelScheduledValues(ctx.currentTime);
                      audio.gainNodeRef.current.gain.setValueAtTime(0, ctx.currentTime);
                      await el.play();
                      setIsPlaying(true);
                      audio.gainNodeRef.current.gain.linearRampToValueAtTime(volume, ctx.currentTime + 2.0);
                  } else {
                      await el.play();
                      setIsPlaying(true);
                  }
              }
          } catch (e) {
              console.error("Play failed", e);
          }
      }
  };

  const stop = () => {
      const el = activeDeck === 'A' ? audioRefA.current : audioRefB.current;
      if (el) {
          el.pause();
          el.currentTime = 0;
      }
      setIsPlaying(false);
      setCurrentTime(0);
      
      if (audio.gainNodeRef.current && audio.audioContextRef.current) {
          try {
            audio.gainNodeRef.current.gain.cancelScheduledValues(audio.audioContextRef.current.currentTime);
            audio.gainNodeRef.current.gain.setValueAtTime(volume, audio.audioContextRef.current.currentTime);
          } catch(e) {}
      }
  };

  const performCrossfade = useCallback((nextIndex: number, overrideTracks?: AudioTrack[], overridePlaylistId?: string) => {
      const currentDeck = activeDeckRef.current;
      const nextDeck = currentDeck === 'A' ? 'B' : 'A';
      
      const currentAudio = currentDeck === 'A' ? audioRefA.current : audioRefB.current;
      const nextAudio = nextDeck === 'A' ? audioRefA.current : audioRefB.current;

      const trackList = overrideTracks || getPlayingTracks();
      const nextTrack = trackList[nextIndex];

      if (!currentAudio || !nextAudio || !nextTrack) return;

      nextAudio.src = nextTrack.url;
      nextAudio.volume = 0; 
      nextAudio.play().then(() => {
          setActiveDeck(nextDeck);
          activeDeckRef.current = nextDeck;
          setCurrentTrackIndex(nextIndex);
          setCurrentTrack(nextTrack);
          setIsPlaying(true);
          if (overridePlaylistId) setPlayingPlaylistId(overridePlaylistId);
          
          hasTriggeredAutoMixRef.current = false;

          const durationMs = crossfadeDuration * 1000;
          const stepTime = 50;
          const steps = durationMs / stepTime;
          let currentStep = 0;

          const interval = setInterval(() => {
              currentStep++;
              const progress = currentStep / steps; 
              
              const fadeOutVol = 1 - progress;
              const fadeInVol = progress;

              currentAudio.volume = Math.max(0, fadeOutVol);
              nextAudio.volume = Math.min(1, fadeInVol);

              if (currentStep >= steps) {
                  clearInterval(interval);
                  currentAudio.pause();
                  currentAudio.currentTime = 0;
                  currentAudio.volume = 1; 
                  nextAudio.volume = 1;
              }
          }, stepTime);
      }).catch(e => console.error("Crossfade failed", e));

  }, [crossfadeDuration, getPlayingTracks]);

  const nextTrack = useCallback((forcePlay: boolean | unknown = false) => {
    const shouldPlay = isPlaying || (typeof forcePlay === 'boolean' && forcePlay);

    // If switching to a new active playlist manually
    if (lib.activePlaylistId !== playingPlaylistId) {
        const newPlaylist = lib.playlists.find(p => p.id === lib.activePlaylistId);
        if (newPlaylist && newPlaylist.tracks.length > 0) {
            setPlayingPlaylistId(lib.activePlaylistId);
            if (shouldPlay) {
                performCrossfade(0, newPlaylist.tracks);
            } else {
                setCurrentTrackIndex(0);
                setCurrentTrack(newPlaylist.tracks[0]);
                const nextDeck = activeDeckRef.current;
                const el = nextDeck === 'A' ? audioRefA.current : audioRefB.current;
                if (el) {
                    el.src = newPlaylist.tracks[0].url;
                    el.currentTime = 0;
                }
            }
            hasTriggeredAutoMixRef.current = false;
            return;
        }
    }

    const currentTracks = getPlayingTracks();
    if (currentTracks.length === 0) return;
    
    let nextIndex = 0;
    if (isShuffle) {
        if (currentTracks.length > 1) {
            do {
                nextIndex = Math.floor(Math.random() * currentTracks.length);
            } while (nextIndex === currentTrackIndex);
        }
    } else {
        nextIndex = currentTrackIndex + 1;
    }

    // Auto Next Playlist Logic
    if (!isShuffle && nextIndex >= currentTracks.length) {
        if (isAutoNextPlaylist) {
            const currentPlIndex = lib.playlists.findIndex(p => p.id === playingPlaylistId);
            if (currentPlIndex !== -1 && currentPlIndex < lib.playlists.length - 1) {
                const nextPlaylist = lib.playlists[currentPlIndex + 1];
                if (nextPlaylist && nextPlaylist.tracks.length > 0) {
                    lib.setActivePlaylistId(nextPlaylist.id);

                    if (shouldPlay) {
                        performCrossfade(0, nextPlaylist.tracks, nextPlaylist.id);
                    } else {
                        setPlayingPlaylistId(nextPlaylist.id);
                        setCurrentTrackIndex(0);
                        setCurrentTrack(nextPlaylist.tracks[0]);
                        const nextDeck = activeDeckRef.current;
                        const el = nextDeck === 'A' ? audioRefA.current : audioRefB.current;
                        if (el) {
                            el.src = nextPlaylist.tracks[0].url;
                            el.currentTime = 0;
                        }
                    }
                    hasTriggeredAutoMixRef.current = false;
                    return;
                }
            }
        }
        nextIndex = 0;
    }
    
    if (shouldPlay) {
        performCrossfade(nextIndex);
    } else {
        setCurrentTrackIndex(nextIndex);
        setCurrentTrack(currentTracks[nextIndex]);
        const nextDeck = activeDeckRef.current; 
        const el = nextDeck === 'A' ? audioRefA.current : audioRefB.current;
        if (el) {
            el.src = currentTracks[nextIndex].url;
            el.currentTime = 0;
        }
        hasTriggeredAutoMixRef.current = false;
    }
  }, [getPlayingTracks, currentTrackIndex, isPlaying, performCrossfade, lib.activePlaylistId, playingPlaylistId, lib.playlists, isShuffle, isAutoNextPlaylist, lib.setActivePlaylistId]);

  const prevTrack = () => {
      const currentTracks = getPlayingTracks();
      if (currentTracks.length === 0) return;
      let prevIndex = currentTrackIndex - 1;
      if (prevIndex < 0) prevIndex = currentTracks.length - 1;
      
      if (isPlaying) {
          performCrossfade(prevIndex);
      } else {
          setCurrentTrackIndex(prevIndex);
          setCurrentTrack(currentTracks[prevIndex]);
          const el = activeDeck === 'A' ? audioRefA.current : audioRefB.current;
          if (el) {
              el.src = currentTracks[prevIndex].url;
              el.currentTime = 0;
          }
      }
  };

  const selectTrack = (index: number) => {
      if (lib.activePlaylistId !== playingPlaylistId) {
          setPlayingPlaylistId(lib.activePlaylistId);
      }
      
      const pl = lib.playlists.find(p => p.id === lib.activePlaylistId);
      if (!pl || !pl.tracks[index]) return;

      if (isPlaying) {
          performCrossfade(index, pl.tracks, lib.activePlaylistId);
      } else {
          setCurrentTrackIndex(index);
          setCurrentTrack(pl.tracks[index]);
          const el = activeDeck === 'A' ? audioRefA.current : audioRefB.current;
          if (el) {
              el.src = pl.tracks[index].url;
              el.currentTime = 0;
              togglePlay(); 
          }
      }
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>, isWaitingReboot: boolean) => {
      if (isWaitingReboot) return;
      const el = e.currentTarget;
      setCurrentTime(el.currentTime);
      setDuration(el.duration);
      
      if (isPlaying && crossfadeDuration > 0 && !hasTriggeredAutoMixRef.current) {
          const timeLeft = el.duration - el.currentTime;
          if (timeLeft <= crossfadeDuration && timeLeft > 0) {
              hasTriggeredAutoMixRef.current = true;
              nextTrack(true);
          }
      }
  };

  const onAudioPlay = (e: React.SyntheticEvent<HTMLAudioElement>) => {
      const target = e.currentTarget;
      const activeAudio = activeDeckRef.current === 'A' ? audioRefA.current : audioRefB.current;
      if (target === activeAudio) setIsPlaying(true);
  };

  const onAudioPause = (e: React.SyntheticEvent<HTMLAudioElement>) => {
      const target = e.currentTarget;
      const activeAudio = activeDeckRef.current === 'A' ? audioRefA.current : audioRefB.current;
      if (target === activeAudio) setIsPlaying(false);
  };

  const insertAudioFiles = async (files: File[], _index: number) => {
      await lib.actions.processAudioFiles(files);
  };

  return {
    // Refs
    audioRefA, audioRefB, activeDeck,
    // State
    tracks: lib.tracks, 
    playlists: lib.playlists, 
    activePlaylistId: lib.activePlaylistId, 
    playingPlaylistId, 
    currentTrackIndex, 
    currentTrack,
    isPlaying, volume, currentTime, duration, 
    analyser: audio.analyser,
    eqConfig, // Expose EQ
    // Controls
    setVolume, seek, togglePlay, stop, nextTrack, prevTrack, selectTrack, setIsPlaying,
    setEqBand, setEqPreset, toggleEq, // Expose EQ Controls
    // Library Actions
    insertAudioFiles, 
    clearPlaylist: lib.actions.clearPlaylist, 
    sortTracks: lib.actions.sortTracks, 
    sortTracksByNumber: lib.actions.sortTracksByNumber, 
    shuffleTracks: lib.actions.shuffleTracks, 
    rateTrack: lib.actions.rateTrack, 
    sortByRating: lib.actions.sortByRating,
    addPlaylist: lib.actions.addPlaylist, 
    removePlaylist: lib.actions.removePlaylist, 
    renamePlaylist: lib.actions.renamePlaylist, 
    switchPlaylist: lib.setActivePlaylistId, 
    reorderPlaylists: lib.actions.reorderPlaylists,
    removeTracks: lib.actions.removeTracks, 
    reorderTracks: () => {}, 
    moveTracksToPlaylist: lib.actions.moveTracksToPlaylist, 
    createPlaylistFromMove: lib.actions.createPlaylistFromMove, 
    createPlaylistFromFiles: lib.actions.createPlaylistFromFiles,
    processAudioFiles: lib.actions.processAudioFiles,
    // Settings
    crossfadeDuration, setCrossfadeDuration, smoothStart, setSmoothStart,
    isShuffle, setIsShuffle, isAutoNextPlaylist, setIsAutoNextPlaylist,
    // Events
    handleTimeUpdate, onAudioPlay, onAudioPause,
    // Audio Context & Capture Routing
    connectMic: audio.connectMic,
    disconnectMic: audio.disconnectMic,
    connectSys: audio.connectSys,
    disconnectSys: audio.disconnectSys,
    getAudioStream: audio.getAudioStream
  };
};
