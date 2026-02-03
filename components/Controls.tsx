
import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, Radio, X, Minus, Maximize2, Minimize2, Maximize, Minimize, ArrowLeft } from 'lucide-react';
import { AudioTrack, Playlist, ViewMode, VisualizerConfig } from '../types';
import { Tooltip } from './ui/Tooltip';
import ConfirmModal from './ConfirmModal';

// Sub-Components
import { TrackInfo } from './controls/TrackInfo';
import { VolumeControl } from './controls/VolumeControl';
import { TransportControls } from './controls/TransportControls';
import { PlaylistTabs } from './controls/PlaylistTabs';
import { TrackList } from './controls/TrackList';

interface ControlsProps {
  viewMode?: ViewMode;
  onToggleMiniMode?: () => void;
  tracks: AudioTrack[];
  playlists: Playlist[];
  activePlaylistId: string;
  playingPlaylistId: string;
  currentTrackIndex: number;
  currentTrack: AudioTrack | undefined;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  
  // Visualizer Props for Playlist Background
  analyser?: AnalyserNode | null;
  visualizerConfig?: VisualizerConfig;

  onVolumeChange: (vol: number) => void;
  onSeek: (time: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onNext: () => void;
  onPrev: () => void;
  onTrackSelect: (index: number) => void;
  onFilesSelected: (files: FileList) => void;
  // New prop for precise insertion
  onFilesInserted: (files: File[], index: number) => void;
  onClearPlaylist: () => void;
  onSort: () => void;
  onSortByTrackNumber: () => void; // New Prop
  onShuffle: () => void;
  
  // Rating & Sorting
  onRateTrack: (trackId: string, delta: number) => void;
  onSortByRating: () => void;

  // Playlist actions
  onAddPlaylist: () => void;
  onRemovePlaylist: (id: string) => void;
  onRenamePlaylist: (id: string, name: string) => void;
  onSwitchPlaylist: (id: string) => void;
  onReorderPlaylists: (dragIndex: number, hoverIndex: number) => void;
  // New actions
  removeTracks: (playlistId: string, trackIds: string[]) => void;
  reorderTracks: (playlistId: string, sourceIndices: number[], targetIndex: number) => void;
  moveTracksToPlaylist: (sourcePlaylistId: string, trackIds: string[], targetPlaylistId: string) => void;
  // Drop to create
  onNewPlaylistWithTracks: (trackIds: string[], sourcePlaylistId: string) => void;
  onNewPlaylistWithFiles: (files: File[]) => void;
  // Lock Props
  isPlaylistLocked: boolean;
  onToggleLock: () => void;
  
  // Playback Modes
  isShuffle?: boolean;
  setIsShuffle?: (v: boolean) => void;
  isAutoNextPlaylist?: boolean;
  setIsAutoNextPlaylist?: (v: boolean) => void;

  // New View Controls
  onTogglePlayerFocus?: () => void;
  isPlayerFocus?: boolean;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

const Controls: React.FC<ControlsProps> = ({
  viewMode = 'default',
  onToggleMiniMode,
  tracks,
  playlists,
  activePlaylistId,
  playingPlaylistId,
  currentTrackIndex,
  currentTrack,
  isPlaying,
  volume,
  currentTime,
  duration,
  analyser,
  visualizerConfig,
  onVolumeChange,
  onSeek,
  onPlay,
  onPause,
  onStop,
  onNext,
  onPrev,
  onTrackSelect,
  onFilesSelected,
  onFilesInserted,
  onClearPlaylist,
  onSort,
  onSortByTrackNumber,
  onShuffle,
  onRateTrack,
  onSortByRating,
  onAddPlaylist,
  onRemovePlaylist,
  onRenamePlaylist,
  onSwitchPlaylist,
  onReorderPlaylists,
  removeTracks,
  reorderTracks,
  moveTracksToPlaylist,
  onNewPlaylistWithTracks,
  onNewPlaylistWithFiles,
  isPlaylistLocked,
  onToggleLock,
  isShuffle,
  setIsShuffle,
  isAutoNextPlaylist,
  setIsAutoNextPlaylist,
  onTogglePlayerFocus,
  isPlayerFocus,
  onToggleFullscreen,
  isFullscreen
}) => {
  // Drag State shared between TrackList and PlaylistTabs
  const [draggedTrackIds, setDraggedTrackIds] = useState<string[]>([]);
  const [dragSourcePlaylistId, setDragSourcePlaylistId] = useState<string | null>(null);
  
  // Playlist Deletion Confirmation State
  const [playlistToDelete, setPlaylistToDelete] = useState<string | null>(null);

  // Refs for mathematical wave animation
  const wavePath1Ref = useRef<SVGPathElement>(null);
  const wavePath2Ref = useRef<SVGPathElement>(null);
  const wavePath3Ref = useRef<SVGPathElement>(null);
  const animationRef = useRef<number>(0);

  // Hover state for Header/Info area to trigger wave acceleration
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const isHeaderHoveredRef = useRef(false); 

  // Check if running in Electron.
  const isElectron = typeof navigator !== 'undefined' && /Electron/.test(navigator.userAgent);
  
  // Determine if we are in Mini Mode layout
  const isMini = viewMode === 'mini';
  const isCinema = viewMode === 'cinema';
  
  // Ref for Mini Mode to access inside animation loop
  const isMiniRef = useRef(isMini);
  useEffect(() => { isMiniRef.current = isMini; }, [isMini]);

  // --- MATHEMATICAL WAVE GENERATOR ---
  useEffect(() => {
    let time = 0;
    
    // Base speed reduced further
    const BASE_SPEED = 0.000625; 
    const HOVER_SPEED = BASE_SPEED * 2.5; 
    let currentSpeed = BASE_SPEED;

    const animate = () => {
      // Smooth Acceleration Logic
      // Check both mouse hover OR mini mode to force active state
      const isActive = isHeaderHoveredRef.current || isMiniRef.current;
      const targetSpeed = isActive ? HOVER_SPEED : BASE_SPEED;
      currentSpeed += (targetSpeed - currentSpeed) * 0.05;
      
      time += currentSpeed;

      const width = 300; 
      const step = 5;
      
      // WAVE 1 (Front - Primary)
      const amp1 = 15 + 5 * Math.sin(time * 0.8); 
      // We subtract 'center' from 'x' to make frequency scaling happen from the center outwards
      const center = width / 2;
      const freq = 0.05;
      const startY1 = 40 + amp1 * Math.sin((0 - center) * freq - time * 9);
      let points1 = `M0,${startY1}`;
      for (let x = step; x <= width; x += step) {
        const y = 40 + amp1 * Math.sin((x - center) * freq - time * 9);
        points1 += ` L${x},${y}`;
      }

      // WAVE 2 (Middle - Secondary)
      const amp2 = 12 + 4 * Math.sin(time * 0.5 + 2);
      const startY2 = 50 + amp2 * Math.sin((0 - center) * (freq * 0.6) - time * 4 + 1);
      let points2 = `M0,${startY2}`;
      for (let x = step; x <= width; x += step) {
        const y = 50 + amp2 * Math.sin((x - center) * (freq * 0.6) - time * 4 + 1);
        points2 += ` L${x},${y}`;
      }

      // WAVE 3 (Back - Accent)
      const amp3 = 15 + 10 * Math.sin(time * 0.2 + 4);
      const startY3 = 45 + amp3 * Math.sin((0 - center) * (freq * 0.3) - time * 1.5 + 3);
      let points3 = `M0,${startY3}`;
      for (let x = step; x <= width; x += step) {
        const y = 45 + amp3 * Math.sin((x - center) * (freq * 0.3) - time * 1.5 + 3);
        points3 += ` L${x},${y}`;
      }

      if (wavePath1Ref.current) wavePath1Ref.current.setAttribute('d', points1);
      if (wavePath2Ref.current) wavePath2Ref.current.setAttribute('d', points2);
      if (wavePath3Ref.current) wavePath3Ref.current.setAttribute('d', points3);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const handleHeaderMouseEnter = () => {
      setIsHeaderHovered(true);
      isHeaderHoveredRef.current = true;
  };

  const handleHeaderMouseLeave = () => {
      setIsHeaderHovered(false);
      isHeaderHoveredRef.current = false;
  };

  const clearDragState = () => {
      setDraggedTrackIds([]);
      setDragSourcePlaylistId(null);
  };

  const handleRequestRemovePlaylist = (id: string, force: boolean = false) => {
      if (force) {
          onRemovePlaylist(id);
          return;
      }
      
      const playlist = playlists.find(p => p.id === id);
      if (playlist && playlist.tracks.length === 0) {
          onRemovePlaylist(id);
          return;
      }

      setPlaylistToDelete(id);
  };

  const confirmRemovePlaylist = () => {
      if (playlistToDelete) {
          onRemovePlaylist(playlistToDelete);
          setPlaylistToDelete(null);
      }
  };

  // Electron IPC Handlers for Mini Mode Header
  const handleMinimize = () => {
      if ((window as any).require) (window as any).require('electron').ipcRenderer.send('window-minimize');
  };
  const handleClose = () => {
      if ((window as any).require) (window as any).require('electron').ipcRenderer.send('window-close');
  };

  // Outer container styling 
  let outerContainerClass = "relative w-full h-full flex flex-col bg-theme-bg border-l-4 border-theme-bg shadow-inner p-4";
  
  if (isMini) {
      outerContainerClass = "relative w-full h-full flex flex-col bg-theme-bg overflow-hidden";
  } else if (isCinema) {
      // CINEMA OVERRIDE: Transparent container, no border, standard padding
      outerContainerClass = "relative w-full h-full flex flex-col bg-transparent p-4";
  }

  // Inner Chassis Styling
  // In Mini mode, we make the chassis draggable (app-drag-region) and add the group class for hover effects
  const innerContainerClass = isMini
    ? "relative w-full h-full flex flex-col bg-theme-panel overflow-hidden player-chassis app-drag-region group" 
    : "relative w-full h-full flex flex-col bg-theme-panel rounded-xl overflow-hidden player-chassis"; 

  // Determine if wave visuals should be active (Hovered OR Mini Mode)
  const isWaveActive = isHeaderHovered || isMini;

  return (
    // OUTER PANEL CONTAINER
    <div 
        id="tutorial-player" 
        className={outerContainerClass}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }} 
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); }} 
    >
      
      {/* INNER PLAYER DEVICE CONTAINER */}
      <div className={innerContainerClass}>

        {/* 
            INTERACTIVE ZONE: Waves + TrackInfo
            In Mini mode, this area acts as the main drag handle (inherited from container)
            BUT we need to make the wrapper catch mouse events for the wave highlight.
            We force h-48 in mini mode to cover the visual area.
            
            ADDED: group/header to scope hover effects for window controls.
        */}
        <div 
            className={`relative z-10 shrink-0 ${isMini ? 'h-48 group/header' : ''}`}
            onMouseEnter={handleHeaderMouseEnter}
            onMouseLeave={handleHeaderMouseLeave}
        >
            {/* CUSTOM MINI WINDOW CONTROLS (Floating - Scoped to Header Hover) */}
            {isMini && (
                <div className="absolute top-2 right-2 z-[60] flex items-center gap-1 app-no-drag opacity-0 group-hover/header:opacity-100 transition-opacity duration-200">
                    <Tooltip content="BACK TO MAIN" position="bottom">
                        <button 
                            onClick={onToggleMiniMode}
                            className="p-1.5 text-theme-muted hover:text-theme-accent bg-black/40 hover:bg-white/10 rounded-full backdrop-blur-sm border border-transparent hover:border-white/10 transition-all"
                        >
                            <ArrowLeft size={10} />
                        </button>
                    </Tooltip>
                    
                    {/* Maximize/Fullscreen in Mini Mode */}
                    <Tooltip content={isFullscreen ? "EXIT FULLSCREEN (Shift+F)" : "FULLSCREEN (Shift+F)"} position="bottom">
                        <button 
                            onClick={onToggleFullscreen}
                            className="p-1.5 text-theme-muted hover:text-theme-accent bg-black/40 hover:bg-white/10 rounded-full backdrop-blur-sm border border-transparent hover:border-white/10 transition-all"
                        >
                            {isFullscreen ? <Minimize size={10} /> : <Maximize size={10} />}
                        </button>
                    </Tooltip>

                    <Tooltip content="MINIMIZE" position="bottom">
                        <button 
                            onClick={handleMinimize}
                            className="p-1.5 text-theme-muted hover:text-theme-primary bg-black/40 hover:bg-white/10 rounded-full backdrop-blur-sm border border-transparent hover:border-white/10 transition-all"
                        >
                            <Minus size={10} />
                        </button>
                    </Tooltip>
                    <Tooltip content="CLOSE APP" position="bottom-right">
                        <button 
                            onClick={handleClose}
                            className="p-1.5 text-theme-muted hover:text-red-500 bg-black/40 hover:bg-white/10 rounded-full backdrop-blur-sm border border-transparent hover:border-red-500/30 transition-all"
                        >
                            <X size={10} />
                        </button>
                    </Tooltip>
                </div>
            )}

            {/* Background Graphic for Header - MATHEMATICAL WAVES */}
            <div className={`absolute top-0 left-0 w-full overflow-hidden z-0 pointer-events-none ${isMini ? 'h-48' : 'h-48'}`}>
                <svg viewBox="0 0 300 80" preserveAspectRatio="none" className="w-full h-full">
                    {/* Background Wave - Pink */}
                    <path 
                        ref={wavePath3Ref}
                        className="transition-all duration-500 ease-out"
                        style={{
                            stroke: '#ff00ff', 
                            opacity: isWaveActive ? 1 : 0.1,
                            strokeWidth: isWaveActive ? 2.5 : 1.5,
                            filter: isWaveActive ? 'drop-shadow(0 0 8px #ff00ff)' : 'none'
                        }}
                        fill="none" 
                        vectorEffect="non-scaling-stroke"
                    />
                    {/* Mid Wave - Purple */}
                    <path 
                        ref={wavePath2Ref}
                        className="transition-all duration-500 ease-out"
                        style={{
                            stroke: '#bc13fe',
                            opacity: isWaveActive ? 1 : 0.15,
                            strokeWidth: isWaveActive ? 2 : 1.2,
                            filter: isWaveActive ? 'drop-shadow(0 0 8px #bc13fe)' : 'none'
                        }}
                        fill="none" 
                        vectorEffect="non-scaling-stroke"
                    />
                    {/* Front Wave - Primary */}
                    <path 
                        ref={wavePath1Ref}
                        className="transition-all duration-500 ease-out"
                        style={{
                            stroke: 'var(--color-primary)', 
                            opacity: isWaveActive ? 1 : 0.2,
                            strokeWidth: isWaveActive ? 1.5 : 1,
                            filter: isWaveActive ? 'drop-shadow(0 0 5px var(--color-primary))' : 'none'
                        }}
                        fill="none" 
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>
            </div>

            {/* HEADER AREA (Regular Mode only) */}
            {!isMini && (
            <div className="flex items-center justify-between p-3 relative z-10 pb-2">
                <div className="flex items-center gap-2">
                    <div className={`
                        p-1.5 rounded-full transition-all duration-500 border
                        ${isWaveActive 
                            ? 'bg-theme-primary/20 shadow-[0_0_10px_var(--color-primary)] border-theme-primary' 
                            : 'bg-theme-primary/10 border-transparent'}
                    `}>
                        <Radio className={`text-theme-primary transition-opacity ${isWaveActive ? 'opacity-100' : 'opacity-90'}`} size={16} />
                    </div>
                    <h2 className={`text-xs font-mono tracking-[0.2em] font-bold transition-all duration-500 ${isWaveActive ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]' : 'text-theme-text opacity-80'}`}>
                        NEON PLAYER
                    </h2>
                </div>

                <div className="flex items-center gap-1 app-no-drag">
                    {/* NEW BUTTONS */}
                    <Tooltip content={isPlayerFocus ? "RESTORE VIEW (Shift+P)" : "FOCUS PLAYER (Shift+P)"} position="bottom">
                        <button 
                            onClick={onTogglePlayerFocus}
                            className={`text-theme-muted hover:text-theme-primary transition-colors p-2 hover:bg-white/5 rounded-full ${isPlayerFocus ? 'text-theme-primary' : ''}`}
                        >
                            {isPlayerFocus ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                        </button>
                    </Tooltip>

                    <Tooltip content={isFullscreen ? "EXIT FULLSCREEN (Shift+F)" : "FULLSCREEN (Shift+F)"} position="bottom">
                        <button 
                            onClick={onToggleFullscreen}
                            className={`text-theme-muted hover:text-theme-accent transition-colors p-2 hover:bg-white/5 rounded-full ${isFullscreen ? 'text-theme-accent' : ''}`}
                        >
                            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                        </button>
                    </Tooltip>

                    {isElectron && onToggleMiniMode && (
                        <Tooltip content="COMPACT VIEW (Shift+C)" position="bottom">
                            <button 
                                onClick={onToggleMiniMode}
                                className="text-theme-muted hover:text-theme-accent transition-colors p-2 hover:bg-white/5 rounded-full"
                            >
                                <Smartphone size={18} />
                            </button>
                        </Tooltip>
                    )}
                </div>
            </div>
            )}
            
            {/* 
                Info & Art 
                In Mini Mode, we ensure this area is draggable by NOT adding 'app-no-drag'.
                The parent container has 'app-drag-region', so allowing this div to be part of it makes it draggable.
            */}
            <div className={`px-4 relative z-10 ${isMini ? 'pt-4' : ''}`}>
                <TrackInfo currentTrack={currentTrack} />
            </div>
        </div>

        {/* Control Grid - Needs app-no-drag in mini mode to be clickable */}
        <div className={`flex gap-4 mb-4 shrink-0 relative z-10 px-4 h-44 ${isMini ? 'app-no-drag' : ''}`}>
            {/* Volume Control */}
            <VolumeControl volume={volume} onVolumeChange={onVolumeChange} />
            
            {/* Transport */}
            <TransportControls 
                isPlaying={isPlaying} 
                onPlay={onPlay} 
                onPause={onPause} 
                onStop={onStop} 
                onNext={onNext} 
                onPrev={onPrev}
                currentTime={currentTime}
                duration={duration}
                onSeek={onSeek}
                trackId={currentTrack?.id}
                isLocked={isPlaylistLocked}
                isShuffle={isShuffle}
                setIsShuffle={setIsShuffle}
                isAutoNextPlaylist={isAutoNextPlaylist}
                setIsAutoNextPlaylist={setIsAutoNextPlaylist}
            />
        </div>

        {/* Playlist Tabs & List - Needs app-no-drag in mini mode */}
        <div className={`px-4 shrink-0 ${isMini ? 'app-no-drag' : ''}`}>
            <PlaylistTabs 
                playlists={playlists}
                activePlaylistId={activePlaylistId}
                playingPlaylistId={playingPlaylistId}
                isPlaying={isPlaying}
                isLocked={isPlaylistLocked} 
                onSwitchPlaylist={onSwitchPlaylist}
                onAddPlaylist={onAddPlaylist}
                onRequestRemovePlaylist={handleRequestRemovePlaylist}
                onRenamePlaylist={onRenamePlaylist}
                onReorderPlaylists={onReorderPlaylists}
                draggedTrackIds={draggedTrackIds}
                dragSourcePlaylistId={dragSourcePlaylistId}
                moveTracksToPlaylist={moveTracksToPlaylist}
                onNewPlaylistWithTracks={onNewPlaylistWithTracks}
                onNewPlaylistWithFiles={onNewPlaylistWithFiles}
                clearDragState={clearDragState}
                onFilesSelected={onFilesSelected}
            />
        </div>

        {/* Track List */}
        <div className={`flex-1 min-w-0 overflow-hidden bg-theme-bg/40 shadow-inner border-t border-theme-border mx-4 mb-4 rounded-b-lg rounded-tr-lg ${isMini ? 'app-no-drag' : ''}`}>
            <TrackList 
                tracks={tracks}
                activePlaylistId={activePlaylistId}
                playingPlaylistId={playingPlaylistId}
                currentTrackIndex={currentTrackIndex}
                analyser={analyser}
                visualizerConfig={visualizerConfig}
                isPlaying={isPlaying}
                volume={volume}
                onTrackSelect={onTrackSelect}
                onFilesSelected={onFilesSelected}
                onFilesInserted={onFilesInserted}
                onClearPlaylist={onClearPlaylist}
                onSort={onSort}
                onSortByTrackNumber={onSortByTrackNumber}
                onShuffle={onShuffle}
                onRateTrack={onRateTrack}
                onSortByRating={onSortByRating}
                removeTracks={removeTracks}
                reorderTracks={reorderTracks}
                moveTracksToPlaylist={moveTracksToPlaylist}
                setDraggedTrackIds={setDraggedTrackIds}
                setDragSourcePlaylistId={setDragSourcePlaylistId}
                draggedTrackIds={draggedTrackIds}
                dragSourcePlaylistId={dragSourcePlaylistId}
                isPlaylistLocked={isPlaylistLocked}
                onToggleLock={onToggleLock}
            />
        </div>

        {/* CONFIRMATION MODAL OVERLAY */}
        {playlistToDelete && (
            <ConfirmModal 
                onConfirm={confirmRemovePlaylist}
                onCancel={() => setPlaylistToDelete(null)}
                translationKey="confirm_delete_tab"
            />
        )}
      </div>
    </div>
  );
};

export default Controls;
