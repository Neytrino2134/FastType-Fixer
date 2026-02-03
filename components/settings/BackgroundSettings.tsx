
import React, { useState, useRef, useMemo } from 'react';
import { List, ChevronDown, ChevronUp, Timer, Trash2, RefreshCw, Disc, Upload, Power, Shuffle, Plus, X, Play, Image as ImageIcon, Video, Wand2 } from 'lucide-react';
import { BackgroundMedia, PatternConfig, BgTransitionType, BgAnimationType, BackgroundPlaylist, BgHotspot } from '../../types';
import RangeControl from './RangeControl';
import CustomSelect from './CustomSelect';
import ToggleSwitch from './ToggleSwitch';
import { useLanguage } from '../../contexts/LanguageContext';
import { Tooltip } from '../ui/Tooltip';
import { useTheme } from '../../contexts/ThemeContext';
import BackgroundEditorModal from '../modals/BackgroundEditorModal';

// SHARED CONSTANTS
const PALETTE_OPTIONS = [
  { value: 'theme-sync', label: 'THEME SYNC' },
  { value: '#0f172a', label: 'SLATE' },
  { value: '#000000', label: 'PURE BLACK' },
  { value: '#030712', label: 'MIDNIGHT' },
  { value: '#020617', label: 'DEEP SPACE' },
  { value: '#1c1917', label: 'STONE' },
  { value: '#050A10', label: 'OCEANIC' },
  { value: '#1a0505', label: 'BLOOD' },
  { value: '#051a05', label: 'FOREST' },
  { value: '#05051a', label: 'ABYSS' },
  { value: '#1a051a', label: 'VOID' },
  { value: '#2d1b2e', label: 'NEBULA' },
  { value: '#001a1a', label: 'CYBER' },
  { value: '#171717', label: 'CARBON' },
  { value: '#2e2e2e', label: 'ASH' },
  { value: '#11001c', label: 'ROYAL' },
  { value: '#001510', label: 'MATRIX' },
  { value: '#1a1005', label: 'AMBER' },
];

const PATTERNS = [
  { id: 'none', label: 'NONE' },
  { id: 'grid', label: 'GRID' },
  { id: 'dots', label: 'DOTS' },
  { id: 'scan-v', label: 'SCAN V' },
  { id: 'scan-h', label: 'SCAN H' },
  { id: 'diag', label: 'DIAG' },
  { id: 'checker', label: 'CHECK' },
  { id: 'circuit', label: 'TECH' },
  { id: 'matrix', label: 'CODE' },
];

// --- MODULE 1: CONFIGURATION ---
interface BgConfigModuleProps {
  bgAnimation: BgAnimationType;
  setBgAnimation: (a: BgAnimationType) => void;
  bgTransition: BgTransitionType;
  setBgTransition: (t: BgTransitionType) => void;
}

export const BgConfigModule: React.FC<BgConfigModuleProps> = ({
  bgAnimation,
  setBgAnimation,
  bgTransition,
  setBgTransition
}) => {
  const { t } = useLanguage();

  const transitionOptions = [
      { value: 'glitch', label: t('trans_glitch') },
      { value: 'leaks', label: t('trans_leaks') },
      { value: 'none', label: t('trans_none') }
  ];

  const animationOptions = [
      { value: 'none', label: t('anim_none') },
      { value: 'zoom', label: t('anim_zoom') },
      { value: 'sway', label: t('anim_sway') },
      { value: 'handheld', label: t('anim_handheld') },
      { value: 'cinematic', label: t('anim_cinematic') },
      { value: 'chaos', label: t('anim_chaos') }
  ];

  return (
    <div className="pt-2 space-y-3">
        <CustomSelect 
            label={t('bg_animation')}
            value={bgAnimation}
            options={animationOptions}
            onChange={(v) => setBgAnimation(v as BgAnimationType)}
        />
        <CustomSelect 
            label={t('transition_type')}
            value={bgTransition}
            options={transitionOptions}
            onChange={(v) => setBgTransition(v as BgTransitionType)}
        />
    </div>
  );
};

// --- MODULE 2: RESOURCES ---
interface BgResourceModuleProps {
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
  onClearBgMedia: () => void;
  onShuffleBg: () => void;
  onBgMediaUpload: (files: FileList) => void;
  onUpdateBg: (id: string, newFile: File) => Promise<void>; 
  onUpdateMetadata?: (id: string, hotspots: BgHotspot[]) => Promise<void>; // New Prop
  bgAutoplayInterval: number;
  setBgAutoplayInterval: (val: number) => void;
  useAlbumArtAsBackground: boolean;
  setUseAlbumArtAsBackground: (v: boolean) => void;
}

export const BgResourceModule: React.FC<BgResourceModuleProps> = ({
  bgList, bgPlaylists = [], activeBgPlaylistId, playingBgPlaylistId,
  setActiveBgPlaylistId, setPlayingBgPlaylistId, addBgPlaylist, removeBgPlaylist, renameBgPlaylist,
  currentBgIndex, onRemoveBg, onMoveBg, onSelectBg,
  onClearBgMedia, onShuffleBg, onBgMediaUpload, onUpdateBg, onUpdateMetadata,
  bgAutoplayInterval, setBgAutoplayInterval,
  useAlbumArtAsBackground, setUseAlbumArtAsBackground
}) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showBgList, setShowBgList] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [showEditor, setShowEditor] = useState(false);

  const isTimerOn = bgAutoplayInterval > 0;
  
  const toggleTimer = () => {
      if (isTimerOn) {
          setBgAutoplayInterval(0);
      } else {
          setBgAutoplayInterval(5); 
      }
  };

  const startRename = (id: string, name: string) => {
      setEditingId(id);
      setEditingName(name);
  };

  const finishRename = () => {
      if (editingId && editingName.trim()) {
          renameBgPlaylist(editingId, editingName);
      }
      setEditingId(null);
  };

  // Filter images for editor
  const imagesForEditor = useMemo(() => {
      return bgList.filter(item => item.type === 'image');
  }, [bgList]);

  return (
    <div className="pt-2 space-y-3">
        <div className="rounded bg-theme-panel/40 overflow-hidden mb-2 transition-all duration-300 border border-theme-border hover:border-theme-primary hover:shadow-[0_0_5px_var(--color-primary)]">
            <button 
                onClick={() => setShowBgList(!showBgList)}
                className="w-full flex items-center justify-between p-2 text-xs font-mono text-theme-muted hover:text-theme-text hover:bg-theme-panel transition-colors"
            >
                <div className="flex items-center gap-2">
                    <List size={12} />
                    <span>BG RESOURCES</span>
                </div>
                <ChevronDown size={12} className={`transition-transform duration-300 ${showBgList ? 'rotate-180' : ''}`} />
            </button>
            
            <div 
              className={`grid transition-[grid-template-rows] duration-300 ease-in-out
                  ${showBgList ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}
              `}
            >
                <div className="overflow-hidden">
                  
                  {/* --- PLAYLIST TABS --- */}
                  <div className="flex items-end gap-1 overflow-x-auto no-scrollbar scroll-smooth pl-2 pt-2 border-b border-theme-border bg-black/20">
                      {bgPlaylists.map(playlist => {
                          const isActive = playlist.id === activeBgPlaylistId;
                          const isPlaying = playlist.id === playingBgPlaylistId;
                          
                          return (
                              <div
                                  key={playlist.id}
                                  onClick={() => setActiveBgPlaylistId(playlist.id)}
                                  onDoubleClick={() => startRename(playlist.id, playlist.name)}
                                  className={`
                                      group flex items-center gap-2 px-3 py-1.5 rounded-t text-[10px] font-mono cursor-pointer transition-all shrink-0 select-none border-t border-x
                                      ${isActive 
                                          ? 'bg-theme-panel text-theme-primary font-bold border-theme-border -mb-[1px] relative z-10' 
                                          : 'bg-transparent text-theme-muted hover:bg-white/5 border-transparent opacity-70'}
                                  `}
                              >
                                  {/* Playing Indicator */}
                                  {isPlaying ? (
                                      <div className="w-1.5 h-1.5 rounded-full bg-theme-accent animate-pulse shadow-[0_0_5px_var(--color-accent)]"></div>
                                  ) : (
                                      <Tooltip content="PLAY THIS GROUP" position="top">
                                          <button 
                                              onClick={(e) => { e.stopPropagation(); setPlayingBgPlaylistId(playlist.id); }}
                                              className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-theme-accent"
                                          >
                                              <Play size={8} fill="currentColor" />
                                          </button>
                                      </Tooltip>
                                  )}

                                  {editingId === playlist.id ? (
                                      <input 
                                          value={editingName}
                                          onChange={(e) => setEditingName(e.target.value)}
                                          onBlur={finishRename}
                                          onKeyDown={(e) => e.key === 'Enter' && finishRename()}
                                          autoFocus
                                          className="bg-black text-white w-16 outline-none border-b border-theme-primary text-[10px]"
                                      />
                                  ) : (
                                      <span>{playlist.name}</span>
                                  )}

                                  {bgPlaylists.length > 1 && (
                                      <button 
                                          onClick={(e) => { e.stopPropagation(); removeBgPlaylist(playlist.id); }}
                                          className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                                      >
                                          <X size={10} />
                                      </button>
                                  )}
                              </div>
                          );
                      })}
                      
                      <button 
                          onClick={addBgPlaylist}
                          className="px-2 py-1.5 text-theme-muted hover:text-theme-accent transition-colors mb-0.5"
                      >
                          <Plus size={12} />
                      </button>
                  </div>

                  {/* Timer Control */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-theme-border bg-theme-panel/50">
                      <div className="flex items-center gap-2 text-theme-muted">
                          <Timer size={12} />
                          <span className="text-[10px] font-mono tracking-wider">{t('auto_timer')}</span>
                      </div>
                      <div className="flex items-center gap-3">
                          <div className={`flex items-center gap-2 bg-black rounded border border-theme-border px-1 transition-opacity ${!isTimerOn ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                              <button 
                                  onClick={() => setBgAutoplayInterval(Math.max(0, bgAutoplayInterval - 1))}
                                  className="p-0.5 hover:text-theme-primary transition-colors"
                              >
                                  <ChevronDown size={14} />
                              </button>
                              <span className={`text-xs font-mono font-bold min-w-[20px] text-center ${bgAutoplayInterval > 0 ? 'text-theme-accent' : 'text-theme-muted'}`}>
                                  {String(bgAutoplayInterval).padStart(2, '0')}
                              </span>
                              <button 
                                  onClick={() => setBgAutoplayInterval(bgAutoplayInterval + 1)}
                                  className="p-0.5 hover:text-theme-primary transition-colors"
                              >
                                  <ChevronUp size={14} />
                              </button>
                          </div>
                          
                          <Tooltip content={isTimerOn ? "DISABLE TIMER" : "ENABLE TIMER"} position="top">
                              <button 
                                  onClick={toggleTimer}
                                  className={`p-1 rounded border transition-all ${isTimerOn ? 'text-green-500 border-green-500/50 bg-green-500/10' : 'text-theme-muted border-gray-700 bg-gray-800'}`}
                              >
                                  <Power size={14} />
                              </button>
                          </Tooltip>
                      </div>
                  </div>

                  {/* Controls: Load, Editor, Shuffle, Clear */}
                  <div className="p-2 border-b border-theme-border flex gap-2">
                      <Tooltip content="ADD IMAGES OR VIDEO" position="top" className="flex-1">
                          <button 
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full py-2 bg-theme-panel border border-theme-border rounded text-theme-muted hover:text-theme-text hover:border-theme-accent transition-all flex items-center justify-center gap-2 group text-xs font-mono"
                          >
                              <Upload size={14} className="text-theme-accent group-hover:scale-110 transition-transform" />
                              <span>LOAD BG</span>
                          </button>
                      </Tooltip>
                      
                      {imagesForEditor.length > 0 && (
                          <Tooltip content="BACKGROUND EDITOR" position="top">
                              <button 
                                  onClick={() => setShowEditor(true)}
                                  className="px-3 py-2 bg-theme-panel border border-theme-border rounded text-theme-muted hover:text-theme-primary hover:border-theme-primary transition-all flex items-center justify-center group"
                              >
                                  <Wand2 size={14} className="group-hover:rotate-12 transition-transform" />
                              </button>
                          </Tooltip>
                      )}
                      
                      <Tooltip content="SHUFFLE BACKGROUNDS" position="top">
                          <button 
                              onClick={onShuffleBg}
                              className="px-3 py-2 bg-theme-panel border border-theme-border rounded text-theme-muted hover:text-theme-secondary hover:border-theme-secondary transition-all flex items-center justify-center group"
                          >
                              <Shuffle size={14} className="group-hover:scale-110 transition-transform" />
                          </button>
                      </Tooltip>

                      <Tooltip content="CLEAR RESOURCES" position="top">
                          <button 
                              onClick={onClearBgMedia}
                              className="px-3 py-2 bg-theme-panel border border-theme-border rounded text-theme-muted hover:text-red-500 hover:border-red-500 transition-all flex items-center justify-center group"
                          >
                              <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
                          </button>
                      </Tooltip>
                  </div>

                  {/* List Content */}
                  <div className="p-2 space-y-1 overflow-y-auto max-h-48 custom-scrollbar">
                      {bgList.length === 0 && (
                          <div className="text-center py-4 text-theme-muted text-[10px] font-mono italic opacity-50">
                              NO BACKGROUNDS LOADED
                          </div>
                      )}
                      {bgList.map((bg, index) => {
                          const isPlayingThisItem = activeBgPlaylistId === playingBgPlaylistId && index === currentBgIndex;
                          const isVideo = bg.type === 'video';
                          const hasHotspots = bg.hotspots && bg.hotspots.length > 0;
                          
                          return (
                          <div 
                              key={bg.id} 
                              className={`
                                  flex items-center justify-between p-2 rounded text-xs font-mono border cursor-pointer group
                                  ${isPlayingThisItem 
                                      ? 'bg-theme-panel border-theme-primary text-theme-primary' 
                                      : 'bg-transparent border-transparent text-theme-muted hover:bg-theme-panel/50 hover:text-theme-text'}
                              `}
                              onClick={() => onSelectBg(index)}
                          >
                              <div className="flex items-center gap-2 overflow-hidden">
                                  <div className="shrink-0 text-theme-muted opacity-70">
                                      {isVideo ? <Video size={10} /> : <ImageIcon size={10} />}
                                  </div>
                                  <div className={`w-1 h-3 rounded-full ${isPlayingThisItem ? 'bg-theme-primary shadow-[0_0_5px_var(--color-primary)]' : 'bg-gray-700'}`}></div>
                                  <span className="truncate max-w-[120px] font-mono">{bg.file.name}</span>
                                  {hasHotspots && <span className="text-[8px] text-theme-accent">*</span>}
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                      onClick={(e) => { e.stopPropagation(); onMoveBg(index, 'up'); }} 
                                      disabled={index === 0}
                                      className="p-1 hover:text-theme-accent disabled:opacity-30"
                                  >
                                      <ChevronUp size={12} />
                                  </button>
                                  <button 
                                      onClick={(e) => { e.stopPropagation(); onMoveBg(index, 'down'); }} 
                                      disabled={index === bgList.length - 1}
                                      className="p-1 hover:text-theme-accent disabled:opacity-30"
                                  >
                                      <ChevronDown size={12} />
                                  </button>
                                  <button 
                                      onClick={(e) => { e.stopPropagation(); onRemoveBg(bg.id); }}
                                      className="p-1 text-theme-muted hover:text-red-500 transition-colors"
                                  >
                                      <Trash2 size={12} />
                                  </button>
                              </div>
                          </div>
                      )})}
                  </div>
                </div>
            </div>
        </div>

        <ToggleSwitch 
            label={t('use_album_art')} 
            icon={Disc} 
            value={useAlbumArtAsBackground} 
            onChange={setUseAlbumArtAsBackground} 
            color="blue"
        />

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={e => {
              if(e.target.files && e.target.files.length > 0) {
                  onBgMediaUpload(e.target.files);
                  e.target.value = '';
              }
          }} 
          accept="image/*,video/*" 
          multiple
          className="hidden" 
        />

        <BackgroundEditorModal 
            isOpen={showEditor}
            onClose={() => setShowEditor(false)}
            images={imagesForEditor}
            onUpdateBg={onUpdateBg}
            onUpdateMetadata={onUpdateMetadata}
        />
    </div>
  );
};

// --- MODULE 3: COLORS & PATTERNS ---
interface BgColorModuleProps {
  bgColor: string;
  setBgColor: (color: string) => void;
  bgPattern?: string;
  setBgPattern?: (pattern: string) => void;
  bgPatternConfig?: PatternConfig;
  setBgPatternConfig?: (config: PatternConfig) => void;
  bgMedia: { type: 'image' | 'video', url: string } | null;
  onDeselectBg?: () => void;
}

export const BgColorModule: React.FC<BgColorModuleProps> = ({
  bgColor, setBgColor, bgPattern, setBgPattern, bgPatternConfig, setBgPatternConfig, bgMedia, onDeselectBg
}) => {
  const { t } = useLanguage();
  const { colors } = useTheme();

  return (
    <div className="pt-2 space-y-4">
        {/* Colors */}
        <div>
            <div className="grid grid-cols-6 gap-1.5 mb-3">
                {PALETTE_OPTIONS.map((opt) => {
                  const isThemeSync = opt.value === 'theme-sync';
                  const displayColor = isThemeSync ? colors.bg : opt.value;
                  const isActive = bgColor === opt.value;

                  return (
                    <Tooltip key={opt.value} content={opt.label} position="top">
                      <button 
                          onClick={() => { 
                            setBgColor(opt.value); 
                            if (onDeselectBg) onDeselectBg(); 
                          }} 
                          className={`
                            h-6 w-full rounded-sm border relative overflow-hidden group
                            ${isActive && !bgMedia 
                                ? 'border-theme-secondary shadow-[0_0_10px_var(--color-secondary)] scale-105 z-10' 
                                : 'border-gray-700 hover:border-theme-primary'}
                          `}
                          style={{ backgroundColor: displayColor }} 
                      >
                          {isThemeSync && (
                             <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-colors">
                                <RefreshCw size={10} className={`text-theme-primary ${isActive ? 'animate-spin-slow' : ''}`} />
                             </div>
                          )}
                      </button>
                    </Tooltip>
                  );
                })}
            </div>
        </div>
        
        {/* Patterns */}
        <div>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
                {setBgPattern && PATTERNS.map(p => (
                <button 
                    key={p.id}
                    onClick={() => setBgPattern(p.id)}
                    className={`
                        px-1 py-1 text-[9px] font-mono border rounded-sm transition-all
                        ${bgPattern === p.id 
                            ? 'border-theme-primary bg-theme-primary/20 text-theme-primary shadow-[0_0_5px_var(--color-primary)]' 
                            : 'border-theme-border bg-black/20 text-theme-muted hover:border-theme-primary hover:text-theme-text'}
                    `}
                >
                    {p.label}
                </button>
                ))}
            </div>
        </div>

        {/* Pattern Config */}
        {bgPattern !== 'none' && bgPatternConfig && setBgPatternConfig && (
            <div className="space-y-3 pt-2 border-t border-theme-border/50">
                <RangeControl 
                label={t('intensity')} 
                value={bgPatternConfig.intensity} 
                min={0} max={1} step={0.05} 
                onChange={(v) => setBgPatternConfig({ ...bgPatternConfig, intensity: v })} 
                className="mb-0"
                />
                <RangeControl 
                label={t('scale')} 
                value={bgPatternConfig.scale} 
                min={0.1} max={5.0} step={0.1} 
                onChange={(v) => setBgPatternConfig({ ...bgPatternConfig, scale: v })} 
                className="mb-0"
                />
            </div>
        )}
    </div>
  );
};
