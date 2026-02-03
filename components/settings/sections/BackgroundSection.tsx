
import React from 'react';
import { Sliders, Image as ImageIcon, Palette, Cast } from 'lucide-react';
import ModuleWrapper from '../ModuleWrapper';
import { BgConfigModule, BgResourceModule, BgColorModule } from '../BackgroundSettings';
import { ScreenVideoModule } from '../modules/ScreenSettings';
import { NumberedLabel } from '../SettingsSection';
import { BackgroundMedia, PatternConfig, BgTransitionType, BgAnimationType, BackgroundPlaylist, BgHotspot } from '../../../types';

interface BackgroundSectionProps {
  expandedState: Record<string, boolean>;
  toggleExpand: (id: string, isAdditive: boolean, forceOpen?: boolean) => void;
  // Props
  bgAnimation: BgAnimationType;
  setBgAnimation: (a: BgAnimationType) => void;
  bgTransition: BgTransitionType;
  setBgTransition: (t: BgTransitionType) => void;
  bgMedia: { type: 'image' | 'video', url: string } | null;
  bgList: BackgroundMedia[];
  bgPlaylists: BackgroundPlaylist[]; // New
  activeBgPlaylistId: string; // New
  playingBgPlaylistId: string; // New
  setActiveBgPlaylistId: (id: string) => void; // New
  setPlayingBgPlaylistId: (id: string) => void; // New
  addBgPlaylist: () => void; // New
  removeBgPlaylist: (id: string) => void; // New
  renameBgPlaylist: (id: string, name: string) => void; // New
  currentBgIndex: number;
  onRemoveBg: (id: string) => void;
  onMoveBg: (index: number, dir: 'up' | 'down') => void;
  onSelectBg: (index: number) => void;
  onClearBgMedia: () => void;
  shuffleBgList?: () => void;
  onBgMediaUpload: (files: FileList) => void;
  onUpdateBg: (id: string, newFile: File) => Promise<void>; // New Prop
  onUpdateMetadata?: (id: string, hotspots: BgHotspot[]) => Promise<void>; // New Prop
  bgAutoplayInterval: number;
  setBgAutoplayInterval: (val: number) => void;
  useAlbumArtAsBackground: boolean;
  setUseAlbumArtAsBackground?: (v: boolean) => void;
  bgColor: string;
  setBgColor: (color: string) => void;
  bgPattern?: string;
  setBgPattern?: (pattern: string) => void;
  bgPatternConfig?: PatternConfig;
  setBgPatternConfig?: (config: PatternConfig) => void;
  onDeselectBg?: () => void;
  isVideoActive: boolean;
  toggleVideo: () => void;
  streamMode?: 'bg' | 'window';
  setStreamMode?: (m: 'bg' | 'window') => void;
}

const BackgroundSection: React.FC<BackgroundSectionProps> = ({
  expandedState, toggleExpand,
  bgAnimation, setBgAnimation, bgTransition, setBgTransition,
  bgMedia, bgList, bgPlaylists, activeBgPlaylistId, playingBgPlaylistId,
  setActiveBgPlaylistId, setPlayingBgPlaylistId, addBgPlaylist, removeBgPlaylist, renameBgPlaylist,
  currentBgIndex, onRemoveBg, onMoveBg, onSelectBg, onClearBgMedia, shuffleBgList, onBgMediaUpload, onUpdateBg, onUpdateMetadata,
  bgAutoplayInterval, setBgAutoplayInterval, useAlbumArtAsBackground, setUseAlbumArtAsBackground,
  bgColor, setBgColor, bgPattern, setBgPattern, bgPatternConfig, setBgPatternConfig, onDeselectBg,
  isVideoActive, toggleVideo, streamMode, setStreamMode
}) => {
  return (
    <>
        <ModuleWrapper id="bg-settings" label={<NumberedLabel num="01" k="background" custom="BG CONFIG" />} icon={Sliders} isEnabled={true} isAlwaysOn={true} isExpanded={expandedState['bg-settings']} onToggleExpand={(e) => toggleExpand('bg-settings', e.shiftKey)} onToggleEnable={() => {}}>
            <BgConfigModule 
                bgAnimation={bgAnimation}
                setBgAnimation={setBgAnimation}
                bgTransition={bgTransition}
                setBgTransition={setBgTransition}
            />
        </ModuleWrapper>

        <ModuleWrapper id="bg-resources" label={<NumberedLabel num="02" k="background" custom="BG RESOURCES" />} icon={ImageIcon} isEnabled={true} isAlwaysOn={true} isExpanded={expandedState['bg-resources']} onToggleExpand={(e) => toggleExpand('bg-resources', e.shiftKey)} onToggleEnable={() => {}}>
            <BgResourceModule 
                bgMedia={bgMedia}
                bgList={bgList}
                bgPlaylists={bgPlaylists}
                activeBgPlaylistId={activeBgPlaylistId}
                playingBgPlaylistId={playingBgPlaylistId}
                setActiveBgPlaylistId={setActiveBgPlaylistId}
                setPlayingBgPlaylistId={setPlayingBgPlaylistId}
                addBgPlaylist={addBgPlaylist}
                removeBgPlaylist={removeBgPlaylist}
                renameBgPlaylist={renameBgPlaylist}
                currentBgIndex={currentBgIndex}
                onRemoveBg={onRemoveBg}
                onMoveBg={onMoveBg}
                onSelectBg={onSelectBg}
                onClearBgMedia={onClearBgMedia}
                onShuffleBg={shuffleBgList || (() => {})}
                onBgMediaUpload={onBgMediaUpload}
                onUpdateBg={onUpdateBg}
                onUpdateMetadata={onUpdateMetadata}
                bgAutoplayInterval={bgAutoplayInterval}
                setBgAutoplayInterval={setBgAutoplayInterval}
                useAlbumArtAsBackground={useAlbumArtAsBackground}
                setUseAlbumArtAsBackground={setUseAlbumArtAsBackground || (() => {})}
            />
        </ModuleWrapper>

        <ModuleWrapper id="bg-colors" label={<NumberedLabel num="03" k="background" custom="BG PALETTE" />} icon={Palette} isEnabled={true} isAlwaysOn={true} isExpanded={expandedState['bg-colors']} onToggleExpand={(e) => toggleExpand('bg-colors', e.shiftKey)} onToggleEnable={() => {}}>
            <BgColorModule 
                bgColor={bgColor}
                setBgColor={setBgColor}
                bgPattern={bgPattern}
                setBgPattern={setBgPattern}
                bgPatternConfig={bgPatternConfig}
                setBgPatternConfig={setBgPatternConfig}
                bgMedia={bgMedia}
                onDeselectBg={onDeselectBg}
            />
        </ModuleWrapper>

        <ModuleWrapper id="screen-share" label={<NumberedLabel num="04" k="background" custom="SCREEN SHARE" />} icon={Cast} isEnabled={true} isAlwaysOn={true} isExpanded={expandedState['screen-share']} onToggleExpand={(e) => toggleExpand('screen-share', e.shiftKey)} onToggleEnable={() => {}}>
            <ScreenVideoModule 
                isVideoActive={isVideoActive} 
                toggleVideo={toggleVideo} 
                streamMode={streamMode} 
                setStreamMode={setStreamMode} 
            />
        </ModuleWrapper>
    </>
  );
};

export default BackgroundSection;
