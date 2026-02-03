
import { useRef, useEffect } from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

// Components - Layout & UI
import TitleBar from './components/TitleBar';
import ContextMenu from './components/ContextMenu';
import CustomCursor from './components/CustomCursor';
import StreamWindow from './components/ui/StreamWindow';
import CollapseTab from './components/ui/CollapseTab';
import GlobalOverlays from './components/GlobalOverlays';

// Panels
import LeftPanel from './components/panels/LeftPanel';
import CenterPanel from './components/panels/CenterPanel';
import Controls from './components/Controls';

// Hooks
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useAppConfig } from './hooks/useAppConfig';
import { useSFX } from './hooks/useSFX';
import { useAmbience } from './hooks/useAmbience';
import { useScreenCapture } from './hooks/useScreenCapture';
import { useAppHotkeys } from './hooks/useAppHotkeys';
import { useMusicEngine } from './hooks/useMusicEngine';
import { useRecorder } from './hooks/useRecorder';
import { useViewLayout } from './hooks/useViewLayout';
import { useSystemCycle } from './hooks/useSystemCycle';
import { useFileHandler } from './hooks/useFileHandler';
import { useAppState } from './hooks/useAppState';

function AppContent() {
  // --- REFS ---
  const appContainerRef = useRef<HTMLDivElement>(null);
  const autoLaunchRef = useRef(false);

  // --- CONTEXTS ---
  const { addNotification } = useNotification();
  const { currentTheme, setTheme, controlStyle, setControlStyle } = useTheme();

  // --- HOOKS ---
  const appState = useAppState();
  const player = useAudioPlayer();
  const config = useAppConfig();
  const { playSFX, handleZipUpload, stopAllSFX, sfxMap, sfxVolume, setSfxVolume } = useSFX();
  const ambience = useAmbience();
  const musicEngine = useMusicEngine();

  // Modular Hooks
  const system = useSystemCycle({
    player,
    setDevSkip: appState.setDevSkip,
    setIsEditorMode: (v) => { appState.setIsEditorMode(v); if (v) appState.setIsTagEditorMode(false); },
    stopAllSFX
  });

  const view = useViewLayout(system.introState);

  const fileHandler = useFileHandler({
    player,
    config: { ...config, setTheme, setControlStyle },
    containerRef: appContainerRef,
    handleZipUpload
  });

  const recorder = useRecorder(player.getAudioStream);

  const screenCapture = useScreenCapture({
    onVideoStream: (stream) => appState.setScreenVideo(stream),
    onMicStream: (stream) => stream ? player.connectMic(stream) : player.disconnectMic(),
    onSysStream: (stream) => stream ? player.connectSys(stream) : player.disconnectSys()
  });

  // --- EFFECTS ---
  // Auto-Launch Sequence
  useEffect(() => {
    if (system.introState === 2 && autoLaunchRef.current) {
      view.toggleFocusMode(true);
      setTimeout(() => {
        if (!player.isPlaying) player.togglePlay();
      }, 500);
      autoLaunchRef.current = false;
    }
  }, [system.introState, view, player]);

  // Hotkeys Hook
  useAppHotkeys({
    player,
    config,
    focusMode: view.focusMode,
    toggleFocusMode: view.toggleFocusMode,
    handleScheduleReload: system.handleScheduleReload,
    stopAllSFX,
    setDevSkip: appState.setDevSkip,
    setIntroState: system.setIntroState,
    setShowTutorial: system.setShowTutorial,
    toggleLeftPanel: view.toggleLeftPanel,
    toggleRightPanel: view.toggleRightPanel,
    viewMode: view.viewMode,
    setViewMode: view.setViewMode,
    onGoHome: system.handleGoHome,
    isRecording: recorder.isRecording,
    startRecording: recorder.startRecording,
    stopRecording: recorder.stopRecording,
    introState: system.introState,
    isPlaylistLocked: appState.isPlaylistLocked,
    setPlaylistLocked: appState.setPlaylistLocked
  });

  // Render Check
  const shouldRenderCenter = view.viewMode !== 'mini' && view.showCenterPanel;
  const isRightPanelFullWidth = view.viewMode === 'mini' || view.viewMode === 'player-focus' || !view.showCenterPanel;
  const isCinema = view.viewMode === 'cinema';

  const handleToggleFullscreen = () => {
      if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => console.error(err));
      } else {
          document.exitFullscreen();
      }
  };

  return (
    <div
      ref={appContainerRef}
      className="flex flex-col h-screen w-full bg-theme-bg text-theme-text overflow-hidden relative"
      style={view.masterStyle}
      onDragOver={fileHandler.onDragOver}
      onDragEnter={fileHandler.onDragEnter}
      onDragLeave={fileHandler.onDragLeave}
      onDrop={fileHandler.onDrop}
    >
      <GlobalOverlays 
        system={system} 
        view={view} 
        recorder={recorder} 
        config={config} 
        player={player}
        appState={appState}
        playSFX={playSFX}
        stopAllSFX={stopAllSFX}
        autoLaunchRef={autoLaunchRef}
        addNotification={addNotification}
      />

      {!view.isFullscreen && view.viewMode !== 'mini' && (
        <TitleBar
          viewMode={view.viewMode}
          onRestore={() => view.setViewMode('default')}
          currentTrack={player.currentTrack}
        />
      )}

      {appState.screenVideo && appState.streamMode === 'window' && (
        <StreamWindow
          stream={appState.screenVideo}
          onClose={screenCapture.toggleVideoCapture}
        />
      )}

      <div
        id="tutorial-main-layout"
        className="flex-1 flex flex-col md:flex-row overflow-hidden relative"
        style={{ justifyContent: 'flex-end' }}
      >
        <CustomCursor
          style={(system.introState < 2 || system.rebootPhase === 'active') ? 'system' : config.cursorStyle}
          retroScreenStyle={config.retroScreenCursorStyle}
          analyser={player.analyser}
        />

        {/* --- SIDEBAR TOGGLE TABS --- */}
        {view.viewMode !== 'mini' && view.viewMode !== 'player-focus' && view.showCenterPanel && (
          <>
            <CollapseTab 
              side="left" 
              isOpen={view.showLeftPanel} 
              onClick={view.toggleLeftPanel} 
              style={{
                  left: view.showLeftPanel ? `${view.leftPanelWidth}px` : '0px',
                  transition: view.isResizing ? 'none' : 'left 0.7s cubic-bezier(0.25, 1, 0.5, 1)'
              }}
            />
            <CollapseTab 
              side="right" 
              isOpen={view.showRightPanel} 
              onClick={view.toggleRightPanel} 
              style={{
                  right: view.showRightPanel ? `${view.rightPanelWidth}px` : '0px',
                  transition: view.isResizing ? 'none' : 'right 0.7s cubic-bezier(0.25, 1, 0.5, 1)'
              }}
            />
          </>
        )}

        <audio ref={player.audioRefA} onEnded={player.activeDeck === 'A' ? () => { if (system.rebootPhase === 'waiting') { player.setIsPlaying(false); system.setRebootPhase('active'); } else { player.nextTrack(true); } } : undefined} onTimeUpdate={player.activeDeck === 'A' ? (e) => player.handleTimeUpdate(e, system.rebootPhase === 'waiting') : undefined} onLoadedMetadata={player.activeDeck === 'A' ? (e) => player.handleTimeUpdate(e, system.rebootPhase === 'waiting') : undefined} onPlay={player.onAudioPlay} onPause={player.onAudioPause} crossOrigin="anonymous" />
        <audio ref={player.audioRefB} onEnded={player.activeDeck === 'B' ? () => { if (system.rebootPhase === 'waiting') { player.setIsPlaying(false); system.setRebootPhase('active'); } else { player.nextTrack(true); } } : undefined} onTimeUpdate={player.activeDeck === 'B' ? (e) => player.handleTimeUpdate(e, system.rebootPhase === 'waiting') : undefined} onLoadedMetadata={player.activeDeck === 'B' ? (e) => player.handleTimeUpdate(e, system.rebootPhase === 'waiting') : undefined} onPlay={player.onAudioPlay} onPause={player.onAudioPause} crossOrigin="anonymous" />

        {/* --- LEFT PANEL --- */}
        {view.viewMode !== 'mini' && view.viewMode !== 'player-focus' && (
          <LeftPanel 
            view={view} appState={appState} config={config} player={player} system={system}
            ambience={ambience} screenCapture={screenCapture} musicEngine={musicEngine}
            fileHandler={fileHandler} currentTheme={currentTheme} controlStyle={controlStyle}
            setTheme={setTheme} setControlStyle={setControlStyle} sfxMap={sfxMap}
            sfxVolume={sfxVolume} setSfxVolume={setSfxVolume} handleZipUpload={handleZipUpload}
            addNotification={addNotification}
          />
        )}

        {/* LEFT RESIZER - Hide in Cinema Mode to avoid visual clutter */}
        {view.viewMode !== 'mini' && view.viewMode !== 'player-focus' && !isCinema && view.showLeftPanel && view.showCenterPanel && (
            <div className="w-4 z-30 flex items-center justify-center cursor-none custom-resizer group -ml-2 mr-0 relative touch-none" onMouseDown={view.handleMouseDownLeft}>
                <div className="w-[1px] h-[92%] bg-theme-primary/40 rounded-full group-hover:bg-theme-primary group-hover:w-[2px] group-hover:shadow-[0_0_10px_var(--color-primary)] transition-all duration-300"></div>
            </div>
        )}

        {/* --- CENTER PANEL --- */}
        {shouldRenderCenter && (
          <CenterPanel 
            view={view} appState={appState} musicEngine={musicEngine} player={player} config={config}
            screenCapture={screenCapture} system={system} fileHandler={fileHandler} recorder={recorder}
            playSFX={playSFX} addNotification={addNotification}
          />
        )}

        {/* RIGHT RESIZER - Hide in Cinema Mode */}
        {view.viewMode !== 'mini' && view.viewMode !== 'player-focus' && !isCinema && view.showRightPanel && view.showCenterPanel && (
            <div className="w-4 z-30 flex items-center justify-center cursor-none custom-resizer group -ml-0 mr-[-8px] relative touch-none" onMouseDown={view.handleMouseDownRight}>
                <div className="w-[1px] h-[92%] bg-theme-primary/40 rounded-full group-hover:bg-theme-primary group-hover:w-[2px] group-hover:shadow-[0_0_10px_var(--color-primary)] transition-all duration-300"></div>
            </div>
        )}

        {/* --- RIGHT PANEL --- */}
        <div className={view.rightPanelClass} style={view.rightPanelStyle}>
          <div 
            className={`${isRightPanelFullWidth ? 'w-full h-full' : (view.showCenterPanel ? '' : 'w-full')} h-full`} 
            style={{ width: isRightPanelFullWidth ? '100%' : `${view.rightPanelWidth}px` }}
          >
            <Controls
              viewMode={view.viewMode}
              onToggleMiniMode={() => view.setViewMode(view.viewMode === 'mini' ? 'default' : 'mini')}
              tracks={player.tracks}
              playlists={player.playlists}
              activePlaylistId={player.activePlaylistId}
              playingPlaylistId={player.playingPlaylistId}
              currentTrackIndex={player.currentTrackIndex}
              currentTrack={player.currentTrack}
              isPlaying={player.isPlaying}
              volume={player.volume}
              currentTime={player.currentTime}
              duration={player.duration}
              onVolumeChange={player.setVolume}
              onSeek={player.seek}
              onPlay={player.togglePlay}
              onPause={player.togglePlay}
              onStop={player.stop}
              onNext={player.nextTrack}
              onPrev={player.prevTrack}
              onTrackSelect={player.selectTrack}
              onFilesSelected={fileHandler.handleFilesSelected}
              onFilesInserted={player.insertAudioFiles}
              onClearPlaylist={() => { player.clearPlaylist(); addNotification("Playlist cleared", "warning"); }}
              onSort={() => { player.sortTracks(); addNotification("Playlist sorted A-Z", "info"); }}
              onSortByTrackNumber={() => { player.sortTracksByNumber(); addNotification("Sorted by Track #", "info"); }}
              onShuffle={() => { player.shuffleTracks(); addNotification("Playlist shuffled", "info"); }}
              onAddPlaylist={player.addPlaylist}
              onRemovePlaylist={player.removePlaylist}
              onRenamePlaylist={player.renamePlaylist}
              onSwitchPlaylist={player.switchPlaylist}
              onReorderPlaylists={player.reorderPlaylists}
              removeTracks={player.removeTracks}
              reorderTracks={player.reorderTracks}
              moveTracksToPlaylist={player.moveTracksToPlaylist}
              onNewPlaylistWithTracks={player.createPlaylistFromMove}
              onNewPlaylistWithFiles={player.createPlaylistFromFiles}
              analyser={player.analyser}
              visualizerConfig={config.visualizerConfig}
              isPlaylistLocked={appState.isPlaylistLocked}
              onToggleLock={() => { appState.setPlaylistLocked(!appState.isPlaylistLocked); addNotification(appState.isPlaylistLocked ? "PLAYLIST UNLOCKED" : "PLAYLIST LOCKED", "info"); }}
              isShuffle={player.isShuffle}
              setIsShuffle={player.setIsShuffle}
              isAutoNextPlaylist={player.isAutoNextPlaylist}
              setIsAutoNextPlaylist={player.setIsAutoNextPlaylist}
              onRateTrack={player.rateTrack}
              onSortByRating={() => { player.sortByRating(); addNotification("Sorted by Rating", "info"); }}
              onTogglePlayerFocus={() => view.setViewMode(view.viewMode === 'player-focus' ? 'default' : 'player-focus')}
              isPlayerFocus={view.viewMode === 'player-focus'}
              onToggleFullscreen={handleToggleFullscreen}
              isFullscreen={!!document.fullscreenElement}
            />
          </div>
        </div>

        {view.viewMode !== 'mini' && (
          <ContextMenu
            onNextTrack={player.nextTrack}
            onPrevTrack={player.prevTrack}
            onNextBg={config.nextBg}
            onPrevBg={config.prevBg}
            onToggleFullScreen={() => view.toggleFocusMode()}
          />
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <LanguageProvider>
          <AppContent />
        </LanguageProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
