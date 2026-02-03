
import { useState, useEffect } from 'react';
import { AudioTrack, Playlist } from '../types';
import { saveTrack, savePlaylist, getAllTracks, getAllPlaylists, deletePlaylistAndTracks, clearTracksInPlaylist, saveTracksBulk, deleteTracksBulk, StoredTrack } from '../lib/db';
import { parseAudioMetadata } from '../lib/metadataParser';

export const useLibrary = () => {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string>('');
  const [isReady, setIsReady] = useState(false);

  // --- PERSISTENCE ---
  useEffect(() => {
      if (activePlaylistId) localStorage.setItem('neon_active_playlist', activePlaylistId);
  }, [activePlaylistId]);

  // --- INITIALIZATION ---
  useEffect(() => {
    const initDB = async () => {
        try {
            const storedPlaylists = await getAllPlaylists();
            const storedTracks = await getAllTracks();
            
            // Map DB tracks to runtime AudioTrack (url generation)
            const processedTracks: AudioTrack[] = await Promise.all(storedTracks.map(async (t) => {
                // Re-parsing metadata on load ensures we get artwork blobs
                const { tags, artworkUrl } = await parseAudioMetadata(t.file);
                return {
                    ...t,
                    url: URL.createObjectURL(t.file),
                    artworkUrl,
                    tags: { ...t.tags, ...tags },
                    rating: t.rating || 0
                };
            }));

            let hydratedPlaylists: Playlist[] = [];

            if (storedPlaylists.length === 0) {
                // Create Default Playlist if none exist
                const defaultId = crypto.randomUUID();
                const defaultPl = { id: defaultId, name: 'DEFAULT', order: 0 };
                await savePlaylist(defaultPl);
                hydratedPlaylists = [{ ...defaultPl, tracks: [] }];
            } else {
                hydratedPlaylists = storedPlaylists.map(pl => ({
                    ...pl,
                    tracks: processedTracks.filter(t => t.playlistId === pl.id).sort((a, b) => (a.order || 0) - (b.order || 0))
                }));
            }

            setPlaylists(hydratedPlaylists);
            
            // Restore Active Tab
            const savedActiveId = localStorage.getItem('neon_active_playlist');
            let targetActiveId = '';

            if (savedActiveId && hydratedPlaylists.some(p => p.id === savedActiveId)) {
                targetActiveId = savedActiveId;
            } else if (hydratedPlaylists.length > 0) {
                targetActiveId = hydratedPlaylists[0].id;
            }

            setActivePlaylistId(targetActiveId);
            setIsReady(true);

        } catch (e) {
            console.error("Failed to init library", e);
        }
    };
    initDB();
  }, []);

  // Update visible tracks when active playlist changes
  useEffect(() => {
      const pl = playlists.find(p => p.id === activePlaylistId);
      if (pl) setTracks(pl.tracks);
  }, [activePlaylistId, playlists]);

  // --- ACTIONS ---

  const addPlaylist = async () => {
      const id = crypto.randomUUID();
      const name = `Playlist ${playlists.length + 1}`;
      const newPl = { id, name, order: playlists.length, tracks: [] };
      await savePlaylist(newPl);
      setPlaylists(prev => [...prev, newPl]);
      setActivePlaylistId(id);
  };

  const removePlaylist = async (id: string) => {
      if (playlists.length <= 1) return;
      await deletePlaylistAndTracks(id);
      setPlaylists(prev => {
          const filtered = prev.filter(p => p.id !== id);
          if (activePlaylistId === id) setActivePlaylistId(filtered[0].id);
          return filtered;
      });
  };

  const renamePlaylist = async (id: string, name: string) => {
      setPlaylists(prev => prev.map(p => {
          if (p.id === id) {
              const updated = { ...p, name };
              savePlaylist({ id, name, order: p.order });
              return updated;
          }
          return p;
      }));
  };

  const reorderPlaylists = (dragIndex: number, hoverIndex: number) => {
      const newPlaylists = [...playlists];
      const [removed] = newPlaylists.splice(dragIndex, 1);
      newPlaylists.splice(hoverIndex, 0, removed);
      
      newPlaylists.forEach((p, i) => {
          p.order = i;
          savePlaylist({ id: p.id, name: p.name, order: i });
      });
      setPlaylists(newPlaylists);
  };

  const processAudioFiles = async (files: File[], targetPlaylistId = activePlaylistId): Promise<AudioTrack[]> => {
      if (!targetPlaylistId) return [];
      
      const currentPl = playlists.find(p => p.id === targetPlaylistId);
      const currentCount = currentPl ? currentPl.tracks.length : 0;
      const newTracks: AudioTrack[] = [];

      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const id = crypto.randomUUID();
          const { tags, artworkUrl } = await parseAudioMetadata(file);
          const name = tags.title || file.name.replace(/\.[^/.]+$/, "");
          const order = currentCount + i;

          const track: AudioTrack = {
              id, playlistId: targetPlaylistId, name, url: URL.createObjectURL(file),
              file, order, tags, artworkUrl, rating: 0
          };
          
          const trackForDb: StoredTrack = {
              id, playlistId: targetPlaylistId, name, file, order, tags, rating: 0
          };
          await saveTrack(trackForDb);
          newTracks.push(track);
      }

      setPlaylists(prev => prev.map(pl => 
          pl.id === targetPlaylistId ? { ...pl, tracks: [...pl.tracks, ...newTracks] } : pl
      ));
      
      return newTracks;
  };

  const clearPlaylist = async () => {
      await clearTracksInPlaylist(activePlaylistId);
      setPlaylists(prev => prev.map(pl => 
          pl.id === activePlaylistId ? { ...pl, tracks: [] } : pl
      ));
  };

  const removeTracks = async (playlistId: string, trackIds: string[]) => {
      await deleteTracksBulk(trackIds);
      setPlaylists(prev => prev.map(pl => {
          if (pl.id === playlistId) {
              return { ...pl, tracks: pl.tracks.filter(t => !trackIds.includes(t.id)) };
          }
          return pl;
      }));
  };

  const moveTracksToPlaylist = async (sourceId: string, trackIds: string[], targetId: string) => {
      const sourcePl = playlists.find(p => p.id === sourceId);
      if (!sourcePl) return;
      
      const tracksToMove = sourcePl.tracks.filter(t => trackIds.includes(t.id));
      
      const updatedTracksForDb: StoredTrack[] = tracksToMove.map(t => ({
          id: t.id, playlistId: targetId, name: t.name, file: t.file,
          order: t.order ?? 0, tags: t.tags, rating: t.rating
      }));
      await saveTracksBulk(updatedTracksForDb);

      const updatedTracksForState = tracksToMove.map(t => ({ ...t, playlistId: targetId }));

      setPlaylists(prev => prev.map(pl => {
          if (pl.id === sourceId) return { ...pl, tracks: pl.tracks.filter(t => !trackIds.includes(t.id)) };
          if (pl.id === targetId) return { ...pl, tracks: [...pl.tracks, ...updatedTracksForState] };
          return pl;
      }));
  };

  const createPlaylistFromMove = async (trackIds: string[], sourceId: string) => {
      const newId = crypto.randomUUID();
      const name = `New Playlist ${playlists.length + 1}`;
      const newPl = { id: newId, name, order: playlists.length, tracks: [] };
      await savePlaylist(newPl);
      
      const sourcePl = playlists.find(p => p.id === sourceId);
      if (sourcePl) {
          const tracksToMove = sourcePl.tracks.filter(t => trackIds.includes(t.id));
          
          const updatedTracksForDb: StoredTrack[] = tracksToMove.map(t => ({
              id: t.id, playlistId: newId, name: t.name, file: t.file,
              order: t.order ?? 0, tags: t.tags, rating: t.rating
          }));
          await saveTracksBulk(updatedTracksForDb);
          
          const updatedTracksForState = tracksToMove.map(t => ({ ...t, playlistId: newId }));

          setPlaylists(prev => {
              const withNew = [...prev, { ...newPl, tracks: updatedTracksForState }];
              return withNew.map(pl => {
                  if (pl.id === sourceId) return { ...pl, tracks: pl.tracks.filter(t => !trackIds.includes(t.id)) };
                  return pl;
              });
          });
          setActivePlaylistId(newId);
      }
  };

  const createPlaylistFromFiles = async (files: File[]) => {
      const newId = crypto.randomUUID();
      const name = `New Playlist ${playlists.length + 1}`;
      const newPl = { id: newId, name, order: playlists.length, tracks: [] };
      await savePlaylist(newPl);
      
      setActivePlaylistId(newId);
      setPlaylists(prev => [...prev, newPl]);
      
      // Use existing processor but redirect to new playlist
      await processAudioFiles(files, newId);
  };

  const updatePlaylistState = (id: string, updatedTracks: AudioTrack[]) => {
      setPlaylists(prev => prev.map(p => p.id === id ? { ...p, tracks: updatedTracks } : p));
      
      const tracksForDb: StoredTrack[] = updatedTracks.map(t => ({
          id: t.id, playlistId: t.playlistId, name: t.name, file: t.file,
          order: t.order!, tags: t.tags, rating: t.rating
      }));
      saveTracksBulk(tracksForDb);
  };

  // --- SORTERS ---
  const sortTracks = () => {
      const pl = playlists.find(p => p.id === activePlaylistId);
      if (!pl) return;
      
      const sorted = [...pl.tracks].sort((a, b) => {
          // Primary Sort: Album Name
          const albumA = (a.tags?.album || "").trim().toLowerCase();
          const albumB = (b.tags?.album || "").trim().toLowerCase();
          
          if (albumA < albumB) return -1;
          if (albumA > albumB) return 1;
          
          // Secondary Sort: Track Title
          return a.name.localeCompare(b.name);
      });

      const updated = sorted.map((t, i) => ({ ...t, order: i }));
      updatePlaylistState(activePlaylistId, updated);
  };

  const sortTracksByNumber = () => {
      const pl = playlists.find(p => p.id === activePlaylistId);
      if (!pl) return;
      
      const sorted = [...pl.tracks].sort((a, b) => {
          // Primary Sort: Album Name
          const albumA = (a.tags?.album || "").trim().toLowerCase();
          const albumB = (b.tags?.album || "").trim().toLowerCase();
          
          if (albumA < albumB) return -1;
          if (albumA > albumB) return 1;

          // Secondary Sort: Track Number
          const getNum = (t: AudioTrack) => {
              const val = t.tags?.trackNumber || "";
              // Handle "1/12" format
              const parsed = parseInt(val.split('/')[0], 10);
              return isNaN(parsed) ? 999999 : parsed; // Push unknowns to end
          };
          const numA = getNum(a);
          const numB = getNum(b);
          
          if (numA !== numB) return numA - numB;
          
          // Tertiary Sort: Title (fallback if numbers duplicate)
          return a.name.localeCompare(b.name);
      });

      const updated = sorted.map((t, i) => ({ ...t, order: i }));
      updatePlaylistState(activePlaylistId, updated);
  };

  const shuffleTracks = () => {
      const pl = playlists.find(p => p.id === activePlaylistId);
      if (!pl) return;
      const shuffled = [...pl.tracks].sort(() => Math.random() - 0.5);
      const updated = shuffled.map((t, i) => ({ ...t, order: i }));
      updatePlaylistState(activePlaylistId, updated);
  };

  const rateTrack = async (trackId: string, delta: number) => {
      const pl = playlists.find(p => p.id === activePlaylistId);
      if (!pl) return;
      const trackIndex = pl.tracks.findIndex(t => t.id === trackId);
      if (trackIndex === -1) return;

      const track = pl.tracks[trackIndex];
      const newRating = (track.rating || 0) + delta;
      
      const updatedTrack = { ...track, rating: newRating };
      const updatedTracks = [...pl.tracks];
      updatedTracks[trackIndex] = updatedTrack;

      // Optimistic Update
      setPlaylists(prev => prev.map(p => p.id === activePlaylistId ? { ...p, tracks: updatedTracks } : p));

      // DB Update
      const trackForDb: StoredTrack = {
          id: updatedTrack.id, playlistId: updatedTrack.playlistId, name: updatedTrack.name,
          file: updatedTrack.file, order: updatedTrack.order || 0, tags: updatedTrack.tags, rating: newRating
      };
      await saveTrack(trackForDb);
  };

  const sortByRating = () => {
      const pl = playlists.find(p => p.id === activePlaylistId);
      if (!pl) return;
      const sorted = [...pl.tracks].sort((a, b) => (b.rating || 0) - (a.rating || 0));
      const updated = sorted.map((t, i) => ({ ...t, order: i }));
      updatePlaylistState(activePlaylistId, updated);
  };

  return {
      isReady,
      tracks,
      playlists,
      activePlaylistId,
      setActivePlaylistId,
      actions: {
          addPlaylist,
          removePlaylist,
          renamePlaylist,
          reorderPlaylists,
          processAudioFiles,
          clearPlaylist,
          removeTracks,
          moveTracksToPlaylist,
          createPlaylistFromMove,
          createPlaylistFromFiles,
          sortTracks,
          sortTracksByNumber,
          shuffleTracks,
          rateTrack,
          sortByRating
      }
  };
};
