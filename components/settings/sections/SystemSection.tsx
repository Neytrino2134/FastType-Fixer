
import React, { useState } from 'react';
import { Files, Save, Palette, Bug, MousePointer2, Sliders, Stamp, Lock, ChevronDown } from 'lucide-react';
import ModuleWrapper from '../ModuleWrapper';
import FileManagement from '../modules/FileManagement';
import ConfigManager from '../modules/ConfigManager';
import { DebugSettings } from '../modules/EffectModules';
import CustomSelect from '../CustomSelect';
import RangeControl from '../RangeControl';
import { TranslatedText } from '../../ui/TranslatedText';
import { NumberedLabel } from '../SettingsSection';
import { AppPreset, ThemeType, CursorStyle, ControlStyle, WatermarkConfig, EffectsConfig } from '../../../types';

interface SystemSectionProps {
  expandedState: Record<string, boolean>;
  toggleExpand: (id: string, isAdditive: boolean, forceOpen?: boolean) => void;
  // Props for sub-modules
  onBgMediaUpload: (files: FileList) => void;
  onAudioUpload: (files: FileList) => void;
  onSfxUpload: (file: File) => void;
  onExportConfig: () => void;
  sfxMap: Record<string, string>;
  savedPresets: AppPreset[];
  activePresetId: string | null;
  savePreset: (name: string) => void;
  overwritePreset: (id: string, theme: ThemeType, controlStyle: ControlStyle) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  renamePreset: (id: string, newName: string) => void;
  onResetDefault?: () => void;
  currentTheme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  cursorStyle: CursorStyle;
  setCursorStyle: (s: CursorStyle) => void;
  retroScreenCursorStyle: CursorStyle;
  setRetroScreenCursorStyle: (s: CursorStyle) => void;
  controlStyle: ControlStyle;
  setControlStyle: (style: ControlStyle) => void;
  watermarkConfig?: WatermarkConfig;
  setWatermarkConfig?: (config: WatermarkConfig) => void;
  isAdvancedMode?: boolean;
  debugConfig: EffectsConfig['debugConsole'];
  updateDebugConfig: (v: EffectsConfig['debugConsole']) => void;
  // Options (passed from parent or defined here)
  themeOptions: any[];
  cursorOptions: any[];
  controlStyleOptions: any[];
}

const SystemSection: React.FC<SystemSectionProps> = ({
  expandedState, toggleExpand,
  onBgMediaUpload, onAudioUpload, onSfxUpload, onExportConfig, sfxMap,
  savedPresets, activePresetId, savePreset, overwritePreset, loadPreset, deletePreset, renamePreset, onResetDefault,
  currentTheme, setTheme, cursorStyle, setCursorStyle, retroScreenCursorStyle, setRetroScreenCursorStyle, controlStyle, setControlStyle,
  watermarkConfig, setWatermarkConfig, isAdvancedMode,
  debugConfig, updateDebugConfig,
  themeOptions, cursorOptions, controlStyleOptions
}) => {
  const [expandWatermark, setExpandWatermark] = useState(false);
  const innerWrapperRadius = controlStyle === 'round' || controlStyle === 'circle' ? 'rounded-lg' : 'rounded';

  return (
    <>
      <ModuleWrapper id="files" label={<NumberedLabel num="01" k="file_management" />} icon={Files} isEnabled={true} isAlwaysOn={true} isExpanded={expandedState['files']} onToggleExpand={(e) => toggleExpand('files', e.shiftKey)} onToggleEnable={() => {}}>
          <FileManagement onBgMediaUpload={onBgMediaUpload} onAudioUpload={onAudioUpload} onSfxUpload={onSfxUpload} onExportConfig={onExportConfig} sfxMap={sfxMap} />
      </ModuleWrapper>

      <ModuleWrapper id="presets" label={<NumberedLabel num="02" k="config_manager" />} icon={Save} isEnabled={true} isAlwaysOn={true} isExpanded={expandedState['presets']} onToggleExpand={(e) => toggleExpand('presets', e.shiftKey)} onToggleEnable={() => {}}>
          <ConfigManager presets={savedPresets} activePresetId={activePresetId} onSave={savePreset} onOverwrite={(id) => overwritePreset(id, currentTheme, controlStyle)} onLoad={loadPreset} onDelete={deletePreset} onRename={renamePreset} onResetDefault={onResetDefault} />
      </ModuleWrapper>

      <ModuleWrapper id="themes" label={<NumberedLabel num="03" k="color_schemes" />} icon={Palette} isEnabled={true} isAlwaysOn={true} isExpanded={expandedState['themes']} onToggleExpand={(e) => toggleExpand('themes', e.shiftKey)} onToggleEnable={() => {}}>
          <div className="pt-2 space-y-6">
              {/* UI STYLE */}
              <div>
                  <div className="flex items-center gap-2 mb-1">
                      <Palette size={12} className="text-theme-muted" />
                      <span className="text-[10px] font-mono text-theme-muted tracking-widest uppercase">UI STYLE</span>
                  </div>
                  <div className="h-px bg-theme-border mb-3 opacity-50"></div>
                  <CustomSelect label={<TranslatedText k="theme_select" />} value={currentTheme} options={themeOptions} onChange={(v) => setTheme(v as ThemeType)} />
              </div>

              {/* CURSOR STYLE */}
              <div>
                  <div className="flex items-center gap-2 mb-1">
                      <MousePointer2 size={12} className="text-theme-muted" />
                      <span className="text-[10px] font-mono text-theme-muted tracking-widest uppercase"><TranslatedText k="cursor_style" /></span>
                  </div>
                  <div className="h-px bg-theme-border mb-3 opacity-50"></div>
                  <div className="space-y-1">
                      <CustomSelect label={<TranslatedText k="cursor_style" />} value={cursorStyle} options={cursorOptions} onChange={(v) => setCursorStyle(v as CursorStyle)} />
                      <CustomSelect label={<TranslatedText k="retro_cursor_style" />} value={retroScreenCursorStyle} options={cursorOptions} onChange={(v) => setRetroScreenCursorStyle(v as CursorStyle)} />
                  </div>
              </div>

              {/* CONTROLS STYLE */}
              <div>
                  <div className="flex items-center gap-2 mb-1">
                      <Sliders size={12} className="text-theme-muted" />
                      <span className="text-[10px] font-mono text-theme-muted tracking-widest uppercase"><TranslatedText k="control_style" /></span>
                  </div>
                  <div className="h-px bg-theme-border mb-3 opacity-50"></div>
                  <CustomSelect label={<TranslatedText k="control_style" />} value={controlStyle} options={controlStyleOptions} onChange={(v) => setControlStyle(v as ControlStyle)} />
              </div>
              
              {/* WATERMARK SETTINGS */}
              {watermarkConfig && setWatermarkConfig && (
                  <div className={`mt-4 bg-theme-panel/40 border ${expandWatermark ? 'border-theme-primary' : 'border-theme-border'} ${innerWrapperRadius} overflow-hidden hover:border-theme-primary transition-colors relative`}>
                      <div 
                          className={`flex items-center justify-between p-3 cursor-pointer ${expandWatermark ? '' : ''}`} 
                          onClick={() => setExpandWatermark(!expandWatermark)}
                      >
                          <div className="flex items-center gap-3">
                              <div className="text-theme-muted opacity-80"><Stamp size={16} /></div>
                              <span className="font-mono text-[11px] tracking-widest text-theme-muted uppercase"><TranslatedText k="watermark_settings" /></span>
                          </div>
                          <div className="flex items-center gap-2">
                              {!isAdvancedMode && <Lock size={12} className="text-theme-muted opacity-50" />}
                              <ChevronDown size={14} className={`text-theme-primary opacity-70 transition-transform ${expandWatermark ? 'rotate-180' : ''}`} />
                          </div>
                      </div>
                      
                      <div className={`grid transition-[grid-template-rows,padding,opacity] duration-300 ease-in-out ${expandWatermark ? 'grid-rows-[1fr] opacity-100 p-3 pt-0' : 'grid-rows-[0fr] opacity-0 p-0'}`}>
                          <div className="overflow-hidden relative">
                              <div className="h-px w-full bg-theme-primary opacity-50 mb-3 mt-1"></div>
                              <div className="pl-4 space-y-3 border-l-2 border-theme-primary ml-2">
                                  <RangeControl label={<TranslatedText k="scale" />} value={watermarkConfig.scale} min={0.5} max={2.0} step={0.1} onChange={(v) => setWatermarkConfig({ ...watermarkConfig, scale: v })} className="mb-0" />
                                  <RangeControl label={<TranslatedText k="opacity" />} value={watermarkConfig.opacity} min={0} max={1.0} step={0.1} onChange={(v) => setWatermarkConfig({ ...watermarkConfig, opacity: v })} className="mb-0" />
                                  <RangeControl label={<TranslatedText k="flash_intensity" />} value={watermarkConfig.flashIntensity} min={0} max={1.0} step={0.1} onChange={(v) => setWatermarkConfig({ ...watermarkConfig, flashIntensity: v })} className="mb-0" />
                              </div>
                              {!isAdvancedMode && (
                                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-10 flex items-center justify-center flex-col gap-2 rounded">
                                      <Lock size={20} className="text-theme-muted" />
                                      <span className="text-[9px] font-mono text-theme-muted uppercase tracking-wider">LOCKED</span>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              )}
          </div>
      </ModuleWrapper>

      <ModuleWrapper id="debug" label={<NumberedLabel num="04" k="debug_console" />} icon={Bug} isEnabled={true} isAlwaysOn={true} isExpanded={expandedState['debug']} onToggleExpand={(e) => toggleExpand('debug', e.shiftKey)} onToggleEnable={() => {}}>
          <DebugSettings config={debugConfig} update={updateDebugConfig} />
      </ModuleWrapper>
    </>
  );
};

export default SystemSection;
