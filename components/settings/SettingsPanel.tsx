
import React, { useState } from 'react';
import { VisualizerConfig, EffectsConfig, DvdConfig, MarqueeConfig, PatternConfig, BackgroundMedia, AppPreset, CursorStyle, WatermarkConfig, ThemeType, ControlStyle, BgTransitionType, AmbienceFile, AmbienceConfig, BgAnimationType, BackgroundPlaylist, BgHotspot, EqualizerConfig } from '../../types';
import { useNotification } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { TranslatedText } from '../ui/TranslatedText';

// Hooks
import { useSettingsScroll } from '../../hooks/useSettingsScroll';
import { useSettingsExpansion } from '../../hooks/useSettingsExpansion';
import { useConfigUpdaters } from '../../hooks/useConfigUpdaters';

// Components
import SettingsHeader from './SettingsHeader';
import SettingsSection from './SettingsSection';
import HelpModal from './HelpModal';

// Sections
import SystemSection from './sections/SystemSection';
import BackgroundSection from './sections/BackgroundSection';
import SoundSection from './sections/SoundSection';
import WaveformSection from './sections/WaveformSection';
import ModulesSection from './sections/ModulesSection';
import GameSection from './sections/GameSection';
import PostProcessingSection from './sections/PostProcessingSection';

interface SettingsPanelProps {
  showVisualizer: boolean;
  setShowVisualizer: (v: boolean) => void;
  showVisualizer3D?: boolean;
  setShowVisualizer3D?: (v: boolean) => void;
  showSineWave?: boolean; 
  setShowSineWave?: (v: boolean) => void;
  showDvd: boolean;
  setShowDvd: (v: boolean) => void;
  marqueeConfig: MarqueeConfig;
  setMarqueeConfig: (c: MarqueeConfig) => void;
  
  visualizerConfig: VisualizerConfig;
  setVisualizerConfig: (config: VisualizerConfig) => void;
  reactorConfig?: VisualizerConfig; 
  setReactorConfig?: (config: VisualizerConfig) => void; 
  sineWaveConfig?: VisualizerConfig; 
  setSineWaveConfig?: (config: VisualizerConfig) => void; 

  dvdConfig: DvdConfig;
  setDvdConfig: (config: DvdConfig) => void;
  effectsConfig: EffectsConfig;
  setEffectsConfig: (config: EffectsConfig) => void;
  watermarkConfig?: WatermarkConfig;
  setWatermarkConfig?: (config: WatermarkConfig) => void;
  bgColor: string;
  setBgColor: (color: string) => void;
  bgPattern?: string;
  setBgPattern?: (pattern: string) => void;
  bgPatternConfig?: PatternConfig;
  setBgPatternConfig?: (config: PatternConfig) => void;
  onBgMediaUpload: (files: FileList) => void;
  onAudioUpload: (files: FileList) => void;
  onSfxUpload: (file: File) => void;
  bgMedia: { type: 'image' | 'video', url: string } | null;
  bgList: BackgroundMedia[];
  bgPlaylists: BackgroundPlaylist[]; 
  activeBgPlaylistId: string; 
  playingBgPlaylistId: string; 
  setActiveBgPlaylistId: (id: string) => void; 
  setPlayingBgPlaylistId: (id: string) => void; 
  addBgPlaylist: () => void; 
  removeBgPlaylist: (id: string) => void; 
  renameBgPlaylist: (id: string, name: string) => void; 
  currentBgIndex: number;
  onRemoveBg: (id: string) => void;
  onMoveBg: (index: number, dir: 'up' | 'down') => void;
  onSelectBg: (index: number) => void;
  onDeselectBg?: () => void;
  onClearBgMedia: () => void;
  onExportConfig: () => void;
  bgAutoplayInterval: number;
  setBgAutoplayInterval: (val: number) => void;
  onScheduleReload: () => void;
  onGoHome: () => void;
  crossfadeDuration: number;
  setCrossfadeDuration: (val: number) => void;
  smoothStart: boolean;
  setSmoothStart: (v: boolean) => void;
  
  savedPresets: AppPreset[];
  activePresetId: string | null;
  savePreset: (name: string) => void;
  overwritePreset: (id: string, theme: ThemeType, controlStyle: ControlStyle) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  renamePreset: (id: string, newName: string) => void;
  onResetDefault?: () => void; 

  sfxMap: Record<string, string>;
  sfxVolume: number;
  setSfxVolume: (v: number) => void;

  cursorStyle: CursorStyle;
  setCursorStyle: (s: CursorStyle) => void;
  retroScreenCursorStyle: CursorStyle; 
  setRetroScreenCursorStyle: (s: CursorStyle) => void; 

  apiKey: string;
  setApiKey: (k: string) => void;

  bgTransition: BgTransitionType;
  setBgTransition: (t: BgTransitionType) => void;
  
  bgAnimation: BgAnimationType;
  setBgAnimation: (a: BgAnimationType) => void;

  onRestartTutorial: () => void;

  ambienceFiles: AmbienceFile[];
  ambienceConfig: AmbienceConfig;
  onAmbienceUpload: (files: FileList) => void;
  onAmbienceDelete: (id: string) => void;
  onAmbienceSetActive: (id: string) => void;
  onAmbienceTogglePlay: () => void;
  onAmbienceVolume: (v: number) => void;

  isVideoActive: boolean;
  toggleVideo: () => void;
  
  isMicActive: boolean;
  toggleMic: () => void;
  isSysAudioActive: boolean;
  toggleSysAudio: () => void;

  isAdvancedMode?: boolean;
  setAdvancedMode?: (v: boolean) => void;

  useAlbumArtAsBackground?: boolean;
  setUseAlbumArtAsBackground?: (v: boolean) => void;

  streamMode?: 'bg' | 'window';
  setStreamMode?: (m: 'bg' | 'window') => void;

  shuffleBgList?: () => void; 
  updateBg?: (id: string, newFile: File) => Promise<void>; 
  updateBgMetadata?: (id: string, hotspots: BgHotspot[]) => Promise<void>; 

  // EQ
  eqConfig: EqualizerConfig;
  setEqBand: (i: number, v: number) => void;
  setEqPreset: (id: string, bands: number[]) => void;
  toggleEq: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = (props) => {
  const [showHelp, setShowHelp] = useState(false);
  
  const { currentTheme, setTheme, controlStyle, setControlStyle } = useTheme();
  const { addNotification } = useNotification();
  const { t } = useLanguage();

  // --- CUSTOM HOOKS FOR LOGIC SEPARATION ---
  const { scrollContainerRef, handleMouseDown, safeAction } = useSettingsScroll();
  const { expandedState, openSections, toggleExpand, handleSectionToggle } = useSettingsExpansion(safeAction, scrollContainerRef);
  const updaters = useConfigUpdaters(props);

  // Constants / Options
  const themeOptions = [
    { value: 'neon-retro', label: 'Default - Neon Retro', color: '#00f3ff' },
    { value: 'neon-blue', label: 'Neon Blue', color: '#3b82f6' },
    { value: 'neon-pink', label: 'Neon Pink', color: '#ff00ff' }, 
    { value: 'warm-cozy', label: 'Warm & Cozy', color: '#fbbf24' },
    { value: 'neutral-gray', label: t('theme_neutral'), color: '#d4d4d4' },
    { value: 'neutral-ocean', label: t('theme_ocean'), color: '#4B8CA8' },
  ];

  const cursorOptions = [
    { value: 'theme-sync', label: t('style_theme_sync'), color: 'theme' }, 
    { value: 'default', label: t('cursor_default'), color: '#00f3ff' },
    { value: 'music-flow', label: t('cursor_music'), color: '#ff00ff' }, 
    { value: 'dos-terminal', label: t('cursor_dos'), color: '#00ff00' }, 
    { value: 'classic-blue', label: t('cursor_classic'), color: '#00f3ff' },
    { value: 'classic-warm', label: t('cursor_warm'), color: '#ff8c00' },
    { value: 'classic-white', label: t('cursor_white'), color: '#ffffff' },
    { value: 'classic-ocean', label: t('cursor_ocean'), color: '#4B8CA8' },
    { value: 'crosshair', label: t('cursor_crosshair'), color: '#ff3333' },
    { value: 'rounded', label: t('cursor_rounded'), color: 'theme' },
    { value: 'system', label: t('cursor_system'), color: '#ffffff' }, 
  ];

  const controlStyleOptions = [
    { value: 'default', label: t('style_default'), shape: 'square' as const },
    { value: 'round', label: t('style_round'), shape: 'rounded' as const },
    { value: 'circle', label: t('style_circle'), shape: 'circle' as const },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-theme-bg border-r-4 border-theme-bg shadow-inner overflow-hidden">
      
      <SettingsHeader 
        onGoHome={props.onGoHome}
        onScheduleReload={props.onScheduleReload}
        onShowHelp={() => setShowHelp(true)}
      />

      {/* Main Content Area */}
      <div 
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        className="flex-1 overflow-y-auto px-4 pb-20 no-scrollbar select-none"
      >
        <SettingsSection 
            id="sys" 
            title={<><span className="text-theme-muted opacity-50 font-normal mr-2">1 //</span> <TranslatedText k="system_params" /></>} 
            isOpen={openSections['sys']} 
            onToggle={(isAdditive) => handleSectionToggle('sys', isAdditive)}
            stickyTop="0px"
        >
            <SystemSection 
                expandedState={expandedState} toggleExpand={toggleExpand}
                onBgMediaUpload={props.onBgMediaUpload} onAudioUpload={props.onAudioUpload} onSfxUpload={props.onSfxUpload} onExportConfig={props.onExportConfig} sfxMap={props.sfxMap}
                savedPresets={props.savedPresets} activePresetId={props.activePresetId} savePreset={props.savePreset} overwritePreset={props.overwritePreset} loadPreset={props.loadPreset} deletePreset={props.deletePreset} renamePreset={props.renamePreset} onResetDefault={props.onResetDefault}
                currentTheme={currentTheme} setTheme={setTheme} cursorStyle={props.cursorStyle} setCursorStyle={props.setCursorStyle} retroScreenCursorStyle={props.retroScreenCursorStyle} setRetroScreenCursorStyle={props.setRetroScreenCursorStyle} controlStyle={controlStyle} setControlStyle={setControlStyle}
                watermarkConfig={props.watermarkConfig} setWatermarkConfig={props.setWatermarkConfig}
                debugConfig={props.effectsConfig.debugConsole} updateDebugConfig={updaters.updateDebugConfig}
                themeOptions={themeOptions} cursorOptions={cursorOptions} controlStyleOptions={controlStyleOptions}
                isAdvancedMode={props.isAdvancedMode}
            />
        </SettingsSection>

        <SettingsSection 
            id="bg" 
            title={<><span className="text-theme-muted opacity-50 font-normal mr-2">2 //</span> <TranslatedText k="cat_backgrounds" /></>} 
            isOpen={openSections['bg']} 
            onToggle={(isAdditive) => handleSectionToggle('bg', isAdditive)}
            stickyTop="36px"
        >
            <BackgroundSection 
                expandedState={expandedState} toggleExpand={toggleExpand}
                bgAnimation={props.bgAnimation} setBgAnimation={props.setBgAnimation} bgTransition={props.bgTransition} setBgTransition={props.setBgTransition}
                bgMedia={props.bgMedia} bgList={props.bgList} currentBgIndex={props.currentBgIndex} onRemoveBg={props.onRemoveBg} onMoveBg={props.onMoveBg} onSelectBg={props.onSelectBg} onClearBgMedia={props.onClearBgMedia} shuffleBgList={props.shuffleBgList} onBgMediaUpload={props.onBgMediaUpload} onUpdateBg={props.updateBg || (async()=>{})} onUpdateMetadata={props.updateBgMetadata}
                bgAutoplayInterval={props.bgAutoplayInterval} setBgAutoplayInterval={props.setBgAutoplayInterval} useAlbumArtAsBackground={props.useAlbumArtAsBackground || false} setUseAlbumArtAsBackground={props.setUseAlbumArtAsBackground}
                bgColor={props.bgColor} setBgColor={props.setBgColor} bgPattern={props.bgPattern} setBgPattern={props.setBgPattern} bgPatternConfig={props.bgPatternConfig} setBgPatternConfig={props.setBgPatternConfig} onDeselectBg={props.onDeselectBg}
                isVideoActive={props.isVideoActive} toggleVideo={props.toggleVideo} streamMode={props.streamMode} setStreamMode={props.setStreamMode}
                bgPlaylists={props.bgPlaylists} activeBgPlaylistId={props.activeBgPlaylistId} playingBgPlaylistId={props.playingBgPlaylistId} setActiveBgPlaylistId={props.setActiveBgPlaylistId} setPlayingBgPlaylistId={props.setPlayingBgPlaylistId} addBgPlaylist={props.addBgPlaylist} removeBgPlaylist={props.removeBgPlaylist} renameBgPlaylist={props.renameBgPlaylist}
            />
        </SettingsSection>

        <SettingsSection 
            id="sfx" 
            title={<><span className="text-theme-muted opacity-50 font-normal mr-2">3 //</span> <TranslatedText k="cat_sound_effects" /></>} 
            isOpen={openSections['sfx']} 
            onToggle={(isAdditive) => handleSectionToggle('sfx', isAdditive)}
            stickyTop="72px"
        >
            <SoundSection 
                expandedState={expandedState} toggleExpand={toggleExpand}
                crossfadeDuration={props.crossfadeDuration} setCrossfadeDuration={props.setCrossfadeDuration} sfxVolume={props.sfxVolume} setSfxVolume={props.setSfxVolume} smoothStart={props.smoothStart} setSmoothStart={props.setSmoothStart}
                ambienceFiles={props.ambienceFiles} ambienceConfig={props.ambienceConfig} onAmbienceUpload={props.onAmbienceUpload} onAmbienceDelete={props.onAmbienceDelete} onAmbienceSetActive={props.onAmbienceSetActive} onAmbienceTogglePlay={props.onAmbienceTogglePlay} onAmbienceVolume={props.onAmbienceVolume}
                isMicActive={props.isMicActive} toggleMic={props.toggleMic} isSysAudioActive={props.isSysAudioActive} toggleSysAudio={props.toggleSysAudio}
                eqConfig={props.eqConfig} setEqBand={props.setEqBand} setEqPreset={props.setEqPreset} toggleEq={props.toggleEq}
            />
        </SettingsSection>

        <SettingsSection 
            id="waves" 
            title={<><span className="text-theme-muted opacity-50 font-normal mr-2">4 //</span> WAVEFORMS</>} 
            isOpen={openSections['waves']} 
            onToggle={(isAdditive) => handleSectionToggle('waves', isAdditive)}
            stickyTop="108px"
        >
            <WaveformSection 
                expandedState={expandedState} toggleExpand={toggleExpand} safeAction={safeAction}
                showVisualizer={props.showVisualizer} setShowVisualizer={props.setShowVisualizer} visualizerConfig={props.visualizerConfig} updateVisualizer={updaters.updateVisualizer}
                showVisualizer3D={props.showVisualizer3D} setShowVisualizer3D={props.setShowVisualizer3D} reactorConfig={props.reactorConfig} updateReactor={updaters.updateReactor}
                showSineWave={props.showSineWave} setShowSineWave={props.setShowSineWave} sineWaveConfig={props.sineWaveConfig} updateSineWave={updaters.updateSineWave}
            />
        </SettingsSection>

        <SettingsSection 
            id="mod" 
            title={<><span className="text-theme-muted opacity-50 font-normal mr-2">5 //</span> <TranslatedText k="modules" /></>} 
            isOpen={openSections['mod']} 
            onToggle={(isAdditive) => handleSectionToggle('mod', isAdditive)}
            stickyTop="144px"
        >
            <ModulesSection 
                expandedState={expandedState} toggleExpand={toggleExpand} safeAction={safeAction}
                marqueeConfig={props.marqueeConfig} updateMarquee={updaters.updateMarquee}
                showDvd={props.showDvd} setShowDvd={props.setShowDvd} dvdConfig={props.dvdConfig} updateDvd={updaters.updateDvd}
                effectsConfig={props.effectsConfig} updateEffect={updaters.updateEffect} apiKey={props.apiKey} setApiKey={props.setApiKey}
            />
        </SettingsSection>

        <SettingsSection 
            id="game" 
            title={<><span className="text-theme-muted opacity-50 font-normal mr-2">6 //</span> GAME MODULES</>} 
            isOpen={openSections['game']} 
            onToggle={(isAdditive) => handleSectionToggle('game', isAdditive)}
            stickyTop="180px"
        >
            <GameSection 
                expandedState={expandedState} toggleExpand={toggleExpand} safeAction={safeAction}
                effectsConfig={props.effectsConfig} updateEffect={updaters.updateEffect}
            />
        </SettingsSection>

        <SettingsSection 
            id="post" 
            title={<><span className="text-theme-muted opacity-50 font-normal mr-2">7 //</span> <TranslatedText k="cat_screen_effects" /></>} 
            isOpen={openSections['post']} 
            onToggle={(isAdditive) => handleSectionToggle('post', isAdditive)}
            stickyTop="216px"
        >
            <PostProcessingSection 
                expandedState={expandedState} toggleExpand={toggleExpand} safeAction={safeAction}
                effectsConfig={props.effectsConfig} updateEffect={updaters.updateEffect}
            />
        </SettingsSection>
      </div>
      
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} onRestartTutorial={props.onRestartTutorial} onUnlockAdvanced={(pass) => {
          if (pass === 'Meow' && props.setAdvancedMode) {
              props.setAdvancedMode(true);
              addNotification("ADVANCED MODE UNLOCKED", "success");
              return true;
          }
          return false;
      }} isAdvanced={props.isAdvancedMode} />}
    </div>
  );
};

export default SettingsPanel;
