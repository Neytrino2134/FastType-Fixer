
import React from 'react';
import MusicEditor from '../editor/MusicEditor';
import TagEditor from '../tags/TagEditor';
import RetroScreen from '../RetroScreen';
import { AudioTrack, TagMetadata } from '../../types';

interface CenterPanelProps {
  view: any;
  appState: any;
  musicEngine: any;
  player: any;
  config: any;
  screenCapture: any;
  system: any;
  fileHandler: any;
  recorder: any;
  playSFX: (name: string) => void;
  addNotification: (msg: string, type: any) => void;
}

const CenterPanel: React.FC<CenterPanelProps> = ({
  view, appState, musicEngine, player, config, screenCapture, system, fileHandler, recorder, playSFX, addNotification
}) => {
  
  const handleUpdateTrackTags = (_id: string, _updates: Partial<AudioTrack> & { tags?: TagMetadata }) => {
    addNotification("Track Updated (Visual)", "success");
  };

  return (
    <div className={view.screenContainerClass}>
      {appState.isEditorMode ? (
        <MusicEditor
          instruments={musicEngine.instruments}
          currentStep={musicEngine.currentStep}
          onToggleStep={musicEngine.toggleStep}
          isPlaying={musicEngine.isPlaying}
        />
      ) : appState.isTagEditorMode ? (
        <TagEditor
          tracks={player.tracks}
          onUpdateTrack={handleUpdateTrackTags}
        />
      ) : (
        <RetroScreen
          analyser={player.analyser}
          isPlaying={player.isPlaying}
          currentTrack={player.currentTrack}
          tracks={player.tracks}
          onTrackSelect={player.selectTrack}
          bgMedia={config.bgMedia}
          bgColor={config.bgColor}
          bgPattern={config.bgPattern}
          bgPatternConfig={config.bgPatternConfig}

          videoStream={appState.screenVideo}
          isSystemAudioActive={screenCapture.isSysAudioActive}
          isMicActive={screenCapture.isMicActive}
          streamMode={appState.streamMode}

          visualizerConfig={config.visualizerConfig}
          setVisualizerConfig={config.setVisualizerConfig}
          reactorConfig={config.reactorConfig}
          setReactorConfig={config.setReactorConfig}
          sineWaveConfig={config.sineWaveConfig}

          showVisualizer={config.showVisualizer}
          showVisualizer3D={config.showVisualizer3D}
          showSineWave={config.showSineWave}

          dvdConfig={config.dvdConfig}
          showDvd={config.showDvd}
          effectsConfig={config.effectsConfig}
          marqueeConfig={config.marqueeConfig}
          watermarkConfig={config.watermarkConfig}

          progress={(player.duration > 0) ? (player.currentTime / player.duration) * 100 : 0}
          currentTime={player.currentTime}
          duration={player.duration}

          focusMode={view.focusMode}
          setFocusMode={view.toggleFocusMode}
          isDragging={fileHandler.isDragging}

          onDragOver={fileHandler.onDragOver}
          onDragEnter={fileHandler.onDragEnter}
          onDragLeave={fileHandler.onDragLeave}
          onDrop={fileHandler.onDrop}

          onScheduleReload={system.handleScheduleReload}
          rebootPhase={system.rebootPhase}

          onPlaySfx={playSFX}
          volume={player.volume}
          onVolumeChange={player.setVolume}
          apiKey={config.apiKey}
          useAlbumArtAsBackground={config.useAlbumArtAsBackground}
          bgAnimation={config.bgAnimation}

          isRecording={recorder.isRecording}
          onStartRecording={() => recorder.startRecording(appState.recorderConfig)}
          onStopRecording={recorder.stopRecording}
          
          isResizing={view.isResizing}
          isPlaylistLocked={appState.isPlaylistLocked}
        />
      )}
    </div>
  );
};

export default CenterPanel;
