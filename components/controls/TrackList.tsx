
import React, { useRef, useState, useEffect } from 'react';
import { FolderOpen, Lock, Unlock, ArrowDownAZ, Shuffle, Trash2, Upload, Music, Activity, Disc, Hash, Mic2, ThumbsUp, ThumbsDown, Star, ListOrdered } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { useLanguage } from '../../contexts/LanguageContext';
import { AudioTrack, VisualizerConfig } from '../../types';
import ConfirmModal from '../ConfirmModal';
import Visualizer from '../Visualizer';

interface TrackListProps {
  tracks: AudioTrack[];
  activePlaylistId: string;
  playingPlaylistId: string;
  currentTrackIndex: number;
  
  // Visualizer Props
  analyser?: AnalyserNode | null;
  visualizerConfig?: VisualizerConfig;
  isPlaying?: boolean;
  volume?: number;

  // Actions
  onTrackSelect: (index: number) => void;
  onFilesSelected: (files: FileList) => void;
  onFilesInserted?: (files: File[], index: number) => void;
  onClearPlaylist: () => void;
  onSort: () => void;
  onSortByTrackNumber: () => void; // New
  onShuffle: () => void;
  removeTracks: (playlistId: string, trackIds: string[]) => void;
  reorderTracks: (playlistId: string, sourceIndices: number[], targetIndex: number) => void;
  moveTracksToPlaylist: (sourceId: string, trackIds: string[], targetId: string) => void;
  
  // New Rating Props
  onRateTrack: (trackId: string, delta: number) => void;
  onSortByRating: () => void;

  // Drag State Props
  setDraggedTrackIds: (ids: string[]) => void;
  setDragSourcePlaylistId: (id: string | null) => void;
  draggedTrackIds: string[];
  dragSourcePlaylistId: string | null;

  // Lock Props
  isPlaylistLocked: boolean;
  onToggleLock: () => void;
}

// --- FILE SYSTEM API HELPERS ---
interface FileSystemEntry {
    isFile: boolean;
    isDirectory: boolean;
    name: string;
    fullPath: string;
    file: (callback: (file: File) => void) => void;
    createReader: () => FileSystemDirectoryReader;
}

interface FileSystemDirectoryReader {
    readEntries: (success: (entries: FileSystemEntry[]) => void, error?: (err: any) => void) => void;
}

const scanEntry = async (entry: FileSystemEntry): Promise<File[]> => {
    if (entry.isFile) {
        return new Promise((resolve) => {
            entry.file((file) => {
                resolve([file]);
            });
        });
    } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const entries: FileSystemEntry[] = [];
        
        const readBatch = async (): Promise<void> => {
            const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
                dirReader.readEntries(resolve, reject);
            });
            
            if (batch.length > 0) {
                entries.push(...batch);
                await readBatch(); 
            }
        };

        await readBatch();
        
        const results = await Promise.all(entries.map(e => scanEntry(e)));
        return results.flat();
    }
    return [];
};

const extractFilesFromDrop = async (dataTransfer: DataTransfer): Promise<File[]> => {
    const items = dataTransfer.items;
    let allFiles: File[] = [];

    if (items && items.length > 0) {
        const promises: Promise<File[]>[] = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
            if (entry) {
                promises.push(scanEntry(entry as unknown as FileSystemEntry));
            } else if (item.kind === 'file') {
                const f = item.getAsFile();
                if (f) promises.push(Promise.resolve([f]));
            }
        }
        const results = await Promise.all(promises);
        allFiles = results.flat();
    } else {
        allFiles = Array.from(dataTransfer.files);
    }
    return allFiles;
};

export const TrackList: React.FC<TrackListProps> = ({
  tracks, activePlaylistId, playingPlaylistId, currentTrackIndex,
  analyser, visualizerConfig, isPlaying = false, volume = 1,
  onTrackSelect, onFilesSelected, onFilesInserted, onClearPlaylist, onSort, onSortByTrackNumber, onShuffle, removeTracks, reorderTracks, moveTracksToPlaylist,
  onRateTrack, onSortByRating,
  setDraggedTrackIds, setDragSourcePlaylistId, draggedTrackIds, dragSourcePlaylistId,
  isPlaylistLocked, onToggleLock
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();
  
  const [showBgVisualizer, setShowBgVisualizer] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [lastSelectedTrackIndex, setLastSelectedTrackIndex] = useState<number>(-1);
  const [isListDragOver, setIsListDragOver] = useState(false);
  
  const [dropIndicator, setDropIndicator] = useState<{ index: number, position: 'top' | 'bottom' } | null>(null);
  const dragLeaveTimeoutRef = useRef<number | null>(null);
  const listHoverRef = useRef(false);

  useEffect(() => {
      setSelectedTrackIds(new Set());
      setLastSelectedTrackIndex(-1);
      setIsListDragOver(false);
      setDropIndicator(null);
      if (dragLeaveTimeoutRef.current) {
          window.clearTimeout(dragLeaveTimeoutRef.current);
          dragLeaveTimeoutRef.current = null;
      }
  }, [activePlaylistId]);

  useEffect(() => {
      return () => {
          if (dragLeaveTimeoutRef.current) window.clearTimeout(dragLeaveTimeoutRef.current);
      };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      e.target.value = '';
    }
  };

  const handleTrackClick = (e: React.MouseEvent, index: number, trackId: string) => {
      // Selection allowed even when locked, just not editing
      const newSelection = new Set(selectedTrackIds);

      if (e.shiftKey && lastSelectedTrackIndex !== -1) {
          const start = Math.min(lastSelectedTrackIndex, index);
          const end = Math.max(lastSelectedTrackIndex, index);
          if (!e.ctrlKey && !e.metaKey) {
              newSelection.clear();
          }
          for (let i = start; i <= end; i++) {
              if (tracks[i]) newSelection.add(tracks[i].id);
          }
      } else if (e.ctrlKey || e.metaKey) {
          if (newSelection.has(trackId)) {
              newSelection.delete(trackId);
          } else {
              newSelection.add(trackId);
          }
          setLastSelectedTrackIndex(index);
      } else {
          newSelection.clear();
          newSelection.add(trackId);
          setLastSelectedTrackIndex(index);
      }
      setSelectedTrackIds(newSelection);
  };

  const handleTrackDoubleClick = (index: number) => {
      onTrackSelect(index);
  };

  const handleDeleteSelected = () => {
      if (isPlaylistLocked || selectedTrackIds.size === 0) return;
      removeTracks(activePlaylistId, Array.from(selectedTrackIds));
      setSelectedTrackIds(new Set());
  };

  const handleDeleteTrack = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (isPlaylistLocked) return;
      removeTracks(activePlaylistId, [id]);
  };

  // NEW: Rate Handler with strict propagation stopping
  // UPDATED: No longer disabled by playlist lock
  const handleRate = (e: React.MouseEvent, id: string, delta: number) => {
      e.preventDefault();
      e.stopPropagation(); // CRITICAL: Stop click from bubbling to track selection
      onRateTrack(id, delta);
  };

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Delete' && selectedTrackIds.size > 0 && !isPlaylistLocked) {
              handleDeleteSelected();
          }
          if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyA')) {
              // Allow Select All even when locked? 
              // Usually fine, selection doesn't harm. But if user tries to delete, it's blocked above.
              if (listHoverRef.current && tracks.length > 0) {
                  e.preventDefault(); 
                  const allIds = new Set(tracks.map(t => t.id));
                  setSelectedTrackIds(allIds);
              }
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTrackIds, isPlaylistLocked, activePlaylistId, tracks]);

  const keepDragAlive = () => {
      if (dragLeaveTimeoutRef.current) {
          window.clearTimeout(dragLeaveTimeoutRef.current);
          dragLeaveTimeoutRef.current = null;
      }
      if (!isListDragOver) setIsListDragOver(true);
  };

  // Drag Handlers
  const handleTrackDragStart = (e: React.DragEvent, _index: number, trackId: string) => {
      if (isPlaylistLocked) { e.preventDefault(); return; }
      setDragSourcePlaylistId(activePlaylistId);
      
      let draggingIds: string[] = [];
      if (!selectedTrackIds.has(trackId)) {
          setSelectedTrackIds(new Set([trackId]));
          draggingIds = [trackId];
      } else {
          draggingIds = Array.from(selectedTrackIds);
      }
      
      setDraggedTrackIds(draggingIds);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleTrackDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault(); 
      e.stopPropagation(); 
      keepDragAlive();
      if (isPlaylistLocked) return;

      if (draggedTrackIds.length > 0) {
          e.dataTransfer.dropEffect = 'move';
      } else {
          e.dataTransfer.dropEffect = 'copy';
      }

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const midPoint = rect.top + rect.height / 2;
      
      if (e.clientY < midPoint) {
          setDropIndicator({ index: index, position: 'top' });
      } else {
          setDropIndicator({ index: index, position: 'bottom' });
      }
  };

  const handleTrackDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
  };

  const handleTrackDrop = async (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const midPoint = rect.top + rect.height / 2;
      const targetIndex = e.clientY < midPoint ? index : index + 1;

      setDropIndicator(null);
      if (dragLeaveTimeoutRef.current) window.clearTimeout(dragLeaveTimeoutRef.current);
      setIsListDragOver(false);

      if (isPlaylistLocked) return;

      if (e.dataTransfer.types.includes('Files')) {
          const files = await extractFilesFromDrop(e.dataTransfer);
          if (files.length > 0) {
              if (onFilesInserted) {
                  onFilesInserted(files, targetIndex);
              } else {
                  onFilesSelected(files as unknown as FileList);
              }
          }
          return;
      }

      if (draggedTrackIds.length > 0) {
          if (dragSourcePlaylistId && dragSourcePlaylistId !== activePlaylistId) {
              moveTracksToPlaylist(dragSourcePlaylistId, draggedTrackIds, activePlaylistId);
          } else {
              const sourceIndices = draggedTrackIds
                  .map(id => tracks.findIndex(t => t.id === id))
                  .filter(idx => idx !== -1);

              if (sourceIndices.length > 0) {
                  reorderTracks(activePlaylistId, sourceIndices, targetIndex);
              }
          }
          setDraggedTrackIds([]);
          setSelectedTrackIds(new Set());
          setDragSourcePlaylistId(null);
      }
  };

  const handleListDragEnter = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation(); 
      if (!isPlaylistLocked) {
          if (e.dataTransfer.types.includes('Files') || draggedTrackIds.length > 0) {
              keepDragAlive();
          }
      }
  };

  const handleListDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation(); 
      if (draggedTrackIds.length > 0) e.dataTransfer.dropEffect = 'move';
      setDropIndicator(null); 
      if (!isPlaylistLocked) keepDragAlive();
  };

  const handleListDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragLeaveTimeoutRef.current = window.setTimeout(() => {
          setIsListDragOver(false);
          setDropIndicator(null);
      }, 50);
  };

  const handleListDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (dragLeaveTimeoutRef.current) window.clearTimeout(dragLeaveTimeoutRef.current);
      setIsListDragOver(false);
      setDropIndicator(null);
      if (isPlaylistLocked) return;

      if (e.dataTransfer.types.includes('Files')) {
          const files = await extractFilesFromDrop(e.dataTransfer);
          if (files.length > 0) {
              if (onFilesInserted) {
                  onFilesInserted(files, tracks.length);
              } else {
                  onFilesSelected(files as unknown as FileList);
              }
          }
          return;
      }

      if (draggedTrackIds.length > 0) {
          if (dragSourcePlaylistId && dragSourcePlaylistId !== activePlaylistId) {
              moveTracksToPlaylist(dragSourcePlaylistId, draggedTrackIds, activePlaylistId);
          } else {
              const sourceIndices = draggedTrackIds
                  .map(id => tracks.findIndex(t => t.id === id))
                  .filter(idx => idx !== -1);
              if (sourceIndices.length > 0) {
                  reorderTracks(activePlaylistId, sourceIndices, tracks.length);
              }
          }
          setDraggedTrackIds([]);
          setSelectedTrackIds(new Set());
          setDragSourcePlaylistId(null);
      }
  };

  return (
    <div 
        className={`flex-1 overflow-hidden flex flex-col h-full relative z-10 transition-colors duration-300
            ${isListDragOver ? 'bg-theme-accent/5' : ''}
        `}
        onDragEnter={handleListDragEnter}
        onDragOver={handleListDragOver}
        onDragLeave={handleListDragLeave}
        onDrop={handleListDrop}
        onMouseEnter={() => listHoverRef.current = true}
        onMouseLeave={() => listHoverRef.current = false}
    >
        {showClearConfirm && (
            <ConfirmModal 
            onConfirm={() => { onClearPlaylist(); setShowClearConfirm(false); }} 
            onCancel={() => setShowClearConfirm(false)} 
            translationKey="confirm_clear"
            />
        )}

        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept="audio/*"
            className="hidden"
            style={{ display: 'none' }} 
        />

        {isListDragOver && !dropIndicator && tracks.length === 0 && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm m-2 rounded-lg pointer-events-none animate-pulse">
                <div className="flex flex-col items-center gap-4 text-theme-primary font-mono drop-shadow-[0_0_10px_var(--color-primary)]">
                <Upload size={48} />
                <span className="text-xl font-bold tracking-widest">DROP TO APPEND</span>
                </div>
            </div>
        )}

        {/* List Header */}
        <div className="flex items-center justify-between p-3 bg-black/20 shrink-0 relative z-20 border-b border-theme-border">
            <div className="flex items-center gap-2">
                <h3 className="text-theme-text font-mono opacity-50 text-xs font-bold tracking-widest mr-1">TRACKS [{tracks.length}]</h3>
                
                <Tooltip content={isPlaylistLocked ? "UNLOCK PLAYLIST" : "LOCK PLAYLIST"} position="top">
                    <button 
                        onClick={onToggleLock}
                        className={`p-1 rounded transition-colors ${isPlaylistLocked ? 'text-red-500 hover:text-red-400' : 'text-theme-muted hover:text-theme-primary'}`}
                    >
                        {isPlaylistLocked ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                </Tooltip>

                {analyser && visualizerConfig && (
                    <Tooltip content="BG VISUALIZER" position="top">
                        <button 
                            onClick={() => setShowBgVisualizer(!showBgVisualizer)}
                            className={`p-1 rounded transition-colors ${showBgVisualizer ? 'text-theme-accent hover:text-white' : 'text-theme-muted hover:text-theme-accent'}`}
                        >
                            <Activity size={12} />
                        </button>
                    </Tooltip>
                )}
            </div>
            
            <div className="flex items-center gap-2">
                <Tooltip content="LOAD FILES" position="top">
                    <button
                        onClick={() => !isPlaylistLocked && fileInputRef.current?.click()}
                        disabled={isPlaylistLocked}
                        className={`p-1.5 rounded transition-colors ${isPlaylistLocked ? 'opacity-30 cursor-not-allowed' : 'text-theme-muted hover:text-theme-accent hover:bg-theme-accent/10'}`}
                    >
                        <FolderOpen size={14} />
                    </button>
                </Tooltip>
                
                {tracks.length > 0 && !isPlaylistLocked && (
                    <>
                        <div className="w-px h-3 bg-theme-border mx-1"></div>
                        
                        <Tooltip content={t('sort_rating')} position="top">
                            <button onClick={onSortByRating} className="text-theme-muted hover:text-yellow-500 transition-colors p-1.5 hover:bg-yellow-500/10 rounded">
                                <Star size={14} />
                            </button>
                        </Tooltip>

                        <Tooltip content={t('sort_track_num')} position="top">
                            <button onClick={onSortByTrackNumber} className="text-theme-muted hover:text-theme-primary transition-colors p-1.5 hover:bg-theme-primary/10 rounded">
                                <ListOrdered size={14} />
                            </button>
                        </Tooltip>

                        <Tooltip content={t('sort_az')} position="top">
                            <button onClick={onSort} className="text-theme-muted hover:text-theme-primary transition-colors p-1.5 hover:bg-theme-primary/10 rounded">
                                <ArrowDownAZ size={14} />
                            </button>
                        </Tooltip>
                        <Tooltip content={t('shuffle')} position="top">
                            <button onClick={onShuffle} className="text-theme-muted hover:text-theme-secondary transition-colors p-1.5 hover:bg-theme-secondary/10 rounded">
                                <Shuffle size={14} />
                            </button>
                        </Tooltip>
                        <Tooltip content={t('clear_playlist')} position="top">
                            <button 
                                type="button"
                                onClick={(e) => {
                                    if (e.shiftKey) { onClearPlaylist(); } else { setShowClearConfirm(true); }
                                }} 
                                className="text-theme-muted hover:text-red-500 transition-colors ml-1 p-1.5 hover:bg-red-500/10 rounded"
                            >
                                <Trash2 size={14} />
                            </button>
                        </Tooltip>
                    </>
                )}
            </div>
        </div>

        {/* --- GRID HEADER --- */}
        {tracks.length > 0 && (
            <div className="flex items-center px-2 py-1 text-[9px] font-mono text-theme-muted uppercase bg-theme-panel/30 border-b border-theme-border select-none">
                <div className="w-8 text-center"><Hash size={10} className="inline"/></div>
                <div className="w-8 text-center"><Disc size={10} className="inline"/></div>
                <div className="flex-1 px-2"><Music size={10} className="inline mr-1"/> TITLE / ARTIST</div>
                <div className="w-24 hidden md:block"><Mic2 size={10} className="inline mr-1"/> ALBUM</div>
                <div className="w-20 text-center flex items-center justify-center gap-1"><Star size={10} /> {t('rating')}</div>
            </div>
        )}
        
        {/* Track List Items Container */}
        <div className="flex-1 overflow-y-auto pr-1 p-1 flex flex-col min-h-0 relative z-10 transition-colors duration-300 w-full relative">
            
            {showBgVisualizer && analyser && visualizerConfig && (
                <div className="absolute inset-0 pointer-events-none opacity-30 z-0 overflow-hidden mix-blend-screen">
                    <Visualizer analyser={analyser} isPlaying={isPlaying} config={visualizerConfig} fps={60} volume={volume} />
                </div>
            )}

            {tracks.map((track, index) => {
                const isPlayingTrack = index === currentTrackIndex && activePlaylistId === playingPlaylistId;
                const isSelected = selectedTrackIds.has(track.id);
                const isLineAbove = dropIndicator?.index === index && dropIndicator.position === 'top';
                const isLineBelow = dropIndicator?.index === index && dropIndicator.position === 'bottom';
                
                const title = track.tags?.title || track.name;
                const artist = track.tags?.artist || "Unknown Artist";
                const album = track.tags?.album || "-";
                const rating = track.rating || 0;

                // --- ALBUM HEADER LOGIC ---
                // Determine if this track starts a new album group
                const currentAlbumName = (track.tags?.album || "").trim() || "Unknown Album";
                const prevAlbumName = (tracks[index - 1]?.tags?.album || "").trim() || "Unknown Album";
                
                // Show header if: It's the first track OR the album name changed from previous track
                const showAlbumHeader = index === 0 || currentAlbumName !== prevAlbumName;
                const albumYear = track.tags?.year;
                
                return (
                <React.Fragment key={track.id}>
                    {/* Visual Separator for Albums */}
                    {showAlbumHeader && (
                        <div className="mt-3 mb-1 px-2 flex items-center justify-between group/header select-none pointer-events-none relative z-10">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <Disc size={10} className="text-theme-secondary shrink-0 opacity-70" />
                                <span className="text-[10px] font-mono font-bold text-theme-secondary uppercase tracking-wider truncate opacity-90">
                                    {currentAlbumName}
                                </span>
                                {albumYear && (
                                    <span className="text-[9px] font-mono text-theme-muted opacity-50 border border-theme-border px-1 rounded">
                                        {albumYear}
                                    </span>
                                )}
                            </div>
                            <div className="h-px bg-theme-border/30 flex-1 ml-3"></div>
                        </div>
                    )}

                    <div
                        className="relative pb-0.5" 
                        draggable={!isPlaylistLocked}
                        onDragStart={(e) => handleTrackDragStart(e, index, track.id)}
                        onDragOver={(e) => handleTrackDragOver(e, index)}
                        onDragLeave={handleTrackDragLeave}
                        onDrop={(e) => handleTrackDrop(e, index)}
                        onClick={(e) => handleTrackClick(e, index, track.id)}
                        onDoubleClick={() => handleTrackDoubleClick(index)}
                    >
                        <div 
                            className={`
                                group flex items-center px-2 py-1.5 rounded transition-all cursor-pointer relative overflow-visible shrink-0 z-10
                                ${isPlayingTrack 
                                ? 'bg-theme-primary/10 border-l-2 border-theme-primary' 
                                : isSelected 
                                    ? 'bg-theme-primary/40 text-white shadow-[inset_0_0_10px_rgba(255,255,255,0.05)]' 
                                    : 'text-theme-muted hover:bg-theme-primary/10 hover:text-theme-text'}
                            `}
                        >
                            {/* Drop Indicator Lines */}
                            {isLineAbove && (
                                <div className="absolute -top-0.5 left-0 right-0 h-0.5 bg-theme-accent shadow-[0_0_10px_var(--color-accent)] z-50 pointer-events-none"></div>
                            )}
                            {isLineBelow && (
                                <div className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-theme-accent shadow-[0_0_10px_var(--color-accent)] z-50 pointer-events-none"></div>
                            )}

                            {/* COLUMN 1: NUMBER */}
                            <div className={`w-8 text-center text-[10px] font-mono shrink-0 ${isPlayingTrack ? 'text-theme-primary font-bold' : 'opacity-50'}`}>
                                {isPlayingTrack ? <Activity size={10} className="inline animate-pulse"/> : String(index + 1).padStart(2, '0')}
                            </div>

                            {/* COLUMN 2: ARTWORK */}
                            <div className="w-8 h-8 rounded overflow-hidden bg-black/50 shrink-0 border border-theme-border mr-3 flex items-center justify-center">
                                {track.artworkUrl ? (
                                    <img src={track.artworkUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <Disc size={12} className="opacity-20" />
                                )}
                            </div>

                            {/* COLUMN 3: TITLE & ARTIST */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <span className={`block text-xs font-mono truncate w-full select-none ${isPlayingTrack ? 'text-theme-primary font-bold' : 'text-theme-text'}`}>
                                    {title}
                                </span>
                                <span className="block text-[9px] font-mono truncate w-full select-none opacity-50">
                                    {artist}
                                </span>
                            </div>

                            {/* COLUMN 4: ALBUM (MD+) */}
                            <div className="w-24 hidden md:block text-[9px] font-mono opacity-40 truncate px-2">
                                {album}
                            </div>

                            {/* COLUMN 5: RATING (NEW) */}
                            <div 
                                className="w-20 flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity"
                                // Stop double click propagation on the container too, just in case
                                onDoubleClick={(e) => e.stopPropagation()}
                            >
                                <button 
                                    onClick={(e) => handleRate(e, track.id, -1)}
                                    onDoubleClick={(e) => e.stopPropagation()} // Extra safety
                                    className={`p-0.5 hover:scale-110 transition-transform hover:text-red-500`}
                                >
                                    <ThumbsDown size={10} />
                                </button>
                                <span className={`text-[10px] font-mono font-bold w-6 text-center ${rating > 0 ? 'text-green-500' : rating < 0 ? 'text-red-500' : 'text-theme-muted'}`}>
                                    {rating > 0 ? `+${rating}` : rating}
                                </span>
                                <button 
                                    onClick={(e) => handleRate(e, track.id, 1)}
                                    onDoubleClick={(e) => e.stopPropagation()} // Extra safety
                                    className={`p-0.5 hover:scale-110 transition-transform hover:text-green-500`}
                                >
                                    <ThumbsUp size={10} />
                                </button>
                            </div>
                            
                            {/* DELETE ACTION */}
                            {!isPlaylistLocked && (
                                <button 
                                    onClick={(e) => handleDeleteTrack(e, track.id)}
                                    className="text-theme-muted/50 hover:text-red-500 transition-colors p-1 cursor-pointer ml-2"
                                    title="Delete Track"
                                >
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </div>
                    </div>
                </React.Fragment>
            )})}
            
            {isListDragOver && !dropIndicator && tracks.length > 0 && !isPlaylistLocked && (
                <div className="h-0.5 bg-theme-accent shadow-[0_0_10px_var(--color-accent)] w-full shrink-0 relative z-50 pointer-events-none"></div>
            )}

            {tracks.length > 0 && <div className="flex-1 min-h-[20px]"></div>}

            {tracks.length === 0 && !isListDragOver && (
                <div className={`flex-1 flex items-center justify-center text-center m-2 rounded-lg bg-theme-primary/5 text-theme-muted opacity-30 font-mono text-xs italic transition-all select-none z-10`}>
                {isPlaylistLocked ? "List Locked" : "Drop files or folders here..."}
                </div>
            )}
        </div>
    </div>
  );
};
