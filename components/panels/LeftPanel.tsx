
import React from 'react';
import { Settings } from 'lucide-react';
import SettingsPanel from '../settings/SettingsPanel';
import EditorControls from '../editor/EditorControls';
import TagControls from '../tags/TagControls';

// We pass down big hook objects to avoid prop drilling 50 props
// In a real refactor, these would be Contexts, but for this step, this is cleaner than app.tsx
interface LeftPanelProps {
  view: any;
  appState: any;
  config: any;
  player: any;
  system: any;
  ambience: any;
  screenCapture: any;
  musicEngine: any;
  fileHandler: any;
  currentTheme: any;
  controlStyle: any;
  setTheme: any;
  setControlStyle: any;
  sfxMap: any;
  sfxVolume: number;
  setSfxVolume: (v: number) => void;
  handleZipUpload: any;
  addNotification: any;
}

const LeftPanel: React.FC<LeftPanelProps> = (props) => {
  const { 
    view, appState, config, player, system, ambience, screenCapture, 
    musicEngine, fileHandler, currentTheme, controlStyle, setTheme, setControlStyle,
    sfxMap, sfxVolume, setSfxVolume, handleZipUpload, addNotification
  } = props;

  const handleResetDefault = () => {
    const defaults = config.resetDefaultPreset();
    // Batch reset logic... (simplified to call config setters)
    config.setVisualizerConfig(defaults.visualizerConfig);
    if (defaults.reactorConfig) config.setReactorConfig(defaults.reactorConfig);
    if (defaults.sineWaveConfig) config.setSineWaveConfig(defaults.sineWaveConfig);
    config.setDvdConfig(defaults.dvdConfig);
    config.setEffectsConfig(defaults.effectsConfig);
    config.setMarqueeConfig(defaults.marqueeConfig);
    if (defaults.watermarkConfig) config.setWatermarkConfig(defaults.watermarkConfig);
    config.setEqualizerConfig(defaults.equalizerConfig); // Reset EQ
    config.setBgColor(defaults.bgColor);
    config.setBgPattern(defaults.bgPattern);
    config.setBgPatternConfig(defaults.bgPatternConfig);
    config.setShowVisualizer(defaults.showVisualizer);
    if (defaults.showVisualizer3D !== undefined) config.setShowVisualizer3D(defaults.showVisualizer3D);
    if (defaults.showSineWave !== undefined) config.setShowSineWave(defaults.showSineWave);
    config.setShowDvd(defaults.showDvd);
    config.setBgAutoplayInterval(defaults.bgAutoplayInterval);
    if (defaults.cursorStyle) config.setCursorStyle(defaults.cursorStyle);
    if (defaults.retroScreenCursorStyle) config.setRetroScreenCursorStyle(defaults.retroScreenCursorStyle);
    if (defaults.bgTransition) config.setBgTransition(defaults.bgTransition);
    if (defaults.bgAnimation) config.setBgAnimation(defaults.bgAnimation);
    if (defaults.theme) setTheme(defaults.theme);
    if (defaults.controlStyle) setControlStyle(defaults.controlStyle);
    addNotification("System Reset to Factory", "success");
  };

  return (
    <div className={view.leftPanelClass} style={view.leftPanelStyle}>
      <div className="h-full relative" style={{ width: `${view.leftPanelWidth}px` }}>
        
        {/* MODE SWITCHER: EDITOR vs TAGS vs SETTINGS */}
        {appState.isEditorMode ? (
          <EditorControls
            instruments={musicEngine.instruments}
            bpm={musicEngine.bpm}
            setBpm={musicEngine.setBpm}
            isPlaying={musicEngine.isPlaying}
            onTogglePlay={musicEngine.togglePlay}
            onSetVolume={musicEngine.setInstrumentVolume}
            onClearPattern={musicEngine.clearPattern}
            onExit={() => appState.toggleEditor(musicEngine.isPlaying, musicEngine.togglePlay, player.stop, () => view.setShowLeftPanel(true), addNotification)}
          />
        ) : appState.isTagEditorMode ? (
          <TagControls
            onExit={() => appState.toggleTagEditor(() => view.setShowLeftPanel(true), addNotification)}
            onSaveAll={() => addNotification("All tags saved", "success")}
          />
        ) : (
          <SettingsPanel
            // Mapping extensive props...
            showVisualizer={config.showVisualizer} setShowVisualizer={config.setShowVisualizer}
            showVisualizer3D={config.showVisualizer3D} setShowVisualizer3D={config.setShowVisualizer3D}
            showSineWave={config.showSineWave} setShowSineWave={config.setShowSineWave}
            showDvd={config.showDvd} setShowDvd={config.setShowDvd}
            marqueeConfig={config.marqueeConfig} setMarqueeConfig={config.setMarqueeConfig}
            visualizerConfig={config.visualizerConfig} setVisualizerConfig={config.setVisualizerConfig}
            reactorConfig={config.reactorConfig} setReactorConfig={config.setReactorConfig}
            sineWaveConfig={config.sineWaveConfig} setSineWaveConfig={config.setSineWaveConfig}
            dvdConfig={config.dvdConfig} setDvdConfig={config.setDvdConfig}
            effectsConfig={config.effectsConfig} setEffectsConfig={config.setEffectsConfig}
            watermarkConfig={config.watermarkConfig} setWatermarkConfig={config.setWatermarkConfig}
            bgColor={config.bgColor} setBgColor={config.setBgColor}
            bgPattern={config.bgPattern} setBgPattern={config.setBgPattern}
            bgPatternConfig={config.bgPatternConfig} setBgPatternConfig={config.setBgPatternConfig}
            onBgMediaUpload={(f: FileList) => { config.handleBgUpload(f); addNotification(`${f.length} backgrounds added`, "success"); }}
            bgMedia={config.bgMedia}
            bgList={config.bgList}
            bgPlaylists={config.bgPlaylists}
            activeBgPlaylistId={config.activeBgPlaylistId}
            playingBgPlaylistId={config.playingBgPlaylistId}
            setActiveBgPlaylistId={config.setActiveBgPlaylistId}
            setPlayingBgPlaylistId={config.setPlayingBgPlaylistId}
            addBgPlaylist={config.addBgPlaylist}
            removeBgPlaylist={config.removeBgPlaylist}
            renameBgPlaylist={config.renameBgPlaylist}
            currentBgIndex={config.currentBgIndex}
            onRemoveBg={config.removeBg}
            onMoveBg={config.moveBg}
            onSelectBg={config.selectBg}
            onDeselectBg={config.deselectBg}
            onClearBgMedia={config.handleClearBg}
            onExportConfig={() => config.exportConfig(currentTheme, controlStyle)}
            bgAutoplayInterval={config.bgAutoplayInterval}
            setBgAutoplayInterval={config.setBgAutoplayInterval}
            onScheduleReload={system.handleScheduleReload}
            onGoHome={system.handleGoHome}
            onAudioUpload={fileHandler.handleFilesSelected}
            crossfadeDuration={player.crossfadeDuration}
            setCrossfadeDuration={player.setCrossfadeDuration}
            smoothStart={player.smoothStart}
            setSmoothStart={player.setSmoothStart}
            savedPresets={config.savedPresets}
            activePresetId={config.activePresetId}
            savePreset={(n: string) => { config.savePreset(n, currentTheme, controlStyle); addNotification(`Preset "${n}" saved`, "success"); }}
            overwritePreset={config.overwritePreset}
            loadPreset={(id: string) => {
              const loaded = config.loadPreset(id);
              if (loaded) {
                if (loaded.theme) setTheme(loaded.theme);
                if (loaded.controlStyle) setControlStyle(loaded.controlStyle);
                if (loaded.ambienceConfig) ambience.importConfig(loaded.ambienceConfig);
                if (loaded.equalizerConfig) player.setEqConfig(loaded.equalizerConfig); // Apply EQ on load (optional, handled by config hook but useful for forced updates)
                addNotification("Preset loaded", "success");
              }
            }}
            deletePreset={config.deletePreset}
            renamePreset={config.renamePreset}
            onResetDefault={handleResetDefault}
            onSfxUpload={handleZipUpload}
            sfxMap={sfxMap}
            sfxVolume={sfxVolume}
            setSfxVolume={setSfxVolume}
            cursorStyle={config.cursorStyle}
            setCursorStyle={config.setCursorStyle}
            retroScreenCursorStyle={config.retroScreenCursorStyle}
            setRetroScreenCursorStyle={config.setRetroScreenCursorStyle}
            apiKey={config.apiKey}
            setApiKey={config.setApiKey}
            bgTransition={config.bgTransition}
            setBgTransition={config.setBgTransition}
            bgAnimation={config.bgAnimation}
            setBgAnimation={config.setBgAnimation}
            onRestartTutorial={() => system.setShowTutorial(true)}
            ambienceFiles={ambience.files}
            ambienceConfig={ambience.config}
            onAmbienceUpload={ambience.handleUpload}
            onAmbienceDelete={ambience.handleDelete}
            onAmbienceSetActive={ambience.setActive}
            onAmbienceTogglePlay={ambience.togglePlay}
            onAmbienceVolume={ambience.setVolume}
            isVideoActive={screenCapture.isVideoActive}
            toggleVideo={screenCapture.toggleVideoCapture}
            isMicActive={screenCapture.isMicActive}
            toggleMic={screenCapture.toggleMic}
            isSysAudioActive={screenCapture.isSysAudioActive}
            toggleSysAudio={screenCapture.toggleSysAudio}
            isAdvancedMode={config.isAdvancedMode}
            setAdvancedMode={config.setAdvancedMode}
            useAlbumArtAsBackground={config.useAlbumArtAsBackground}
            setUseAlbumArtAsBackground={config.setUseAlbumArtAsBackground}
            streamMode={appState.streamMode}
            setStreamMode={appState.setStreamMode}
            shuffleBgList={config.shuffleBgList}
            updateBg={config.updateBg} 
            // EQ Props
            eqConfig={player.eqConfig}
            setEqBand={player.setEqBand}
            setEqPreset={player.setEqPreset}
            toggleEq={player.toggleEq}
          />
        )}

        {/* BOTTOM EXPANSION BAR */}
        {!appState.isEditorMode && !appState.isTagEditorMode && (
          <div className="absolute bottom-0 left-0 right-0 z-50 bg-theme-bg border-t border-theme-border p-3">
            <div className="flex items-center justify-between px-1 gap-2">
              <span className="text-[9px] font-mono text-theme-muted tracking-widest opacity-40 select-none">
                EXPANSION
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => appState.setShowRecModal(true)}
                  className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-[10px] font-mono text-gray-400 hover:text-white hover:border-theme-primary hover:bg-gray-800 transition-all flex items-center gap-2 group shadow-sm"
                  title="Recording Settings"
                >
                  <Settings size={12} className="group-hover:text-theme-primary transition-colors" />
                  <span>Rec Setup</span>
                </button>

                <button
                  onClick={() => appState.toggleTagEditor(() => view.setShowLeftPanel(true), addNotification)}
                  className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-[10px] font-mono text-gray-400 hover:text-white hover:border-gray-500 hover:bg-gray-800 transition-all flex items-center gap-2 group shadow-sm"
                >
                  <span>Tag Editor</span>
                </button>
                <button
                  onClick={() => appState.toggleEditor(musicEngine.isPlaying, musicEngine.togglePlay, player.stop, () => view.setShowLeftPanel(true), addNotification)}
                  className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-[10px] font-mono text-gray-400 hover:text-white hover:border-gray-500 hover:bg-gray-800 transition-all flex items-center gap-2 group shadow-sm"
                >
                  <span>Studio</span>
                  <span className="text-[9px] text-yellow-600 group-hover:text-yellow-500 transition-colors opacity-80">(Alpha)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeftPanel;
