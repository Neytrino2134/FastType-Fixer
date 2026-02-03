
import React, { useRef } from 'react';
import { CloudRain, Trash2, Upload, Volume2, Power } from 'lucide-react';
import { AmbienceFile, AmbienceConfig } from '../../../types';
import RangeControl from '../RangeControl';
import ToggleSwitch from '../ToggleSwitch';
import { useLanguage } from '../../../contexts/LanguageContext';

interface AmbienceSettingsProps {
  files: AmbienceFile[];
  config: AmbienceConfig;
  onUpload: (files: FileList) => void;
  onDelete: (id: string) => void;
  onSetActive: (id: string) => void;
  onTogglePlay: () => void;
  onVolumeChange: (v: number) => void;
}

const AmbienceSettings: React.FC<AmbienceSettingsProps> = ({
  files,
  config,
  onUpload,
  onDelete,
  onSetActive,
  onTogglePlay,
  onVolumeChange
}) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToggle = () => {
      onTogglePlay();
  };

  return (
    <div className="pt-2 space-y-4">
        {/* Top: Load Button */}
        <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 bg-theme-panel border border-theme-border rounded text-theme-muted hover:text-theme-text hover:border-theme-accent transition-all flex items-center justify-center gap-2 group"
            title={t('load')}
        >
            <Upload size={16} className="text-theme-accent group-hover:scale-110 transition-transform" />
            <span className="font-mono text-xs font-bold tracking-widest">{t('no_ambience_files')}</span>
        </button>

        {/* Master Toggle */}
        <ToggleSwitch 
            label={t('enable_ambience')} 
            icon={Power} 
            value={config.isPlaying} 
            onChange={handleToggle} 
            color="blue"
        />

        {/* Volume Control */}
        <div className="bg-black/20 p-3 rounded border border-theme-border flex flex-col gap-3">
            <div className="flex items-center gap-3">
                <Volume2 size={14} className="text-theme-muted" />
                <RangeControl 
                    label="" 
                    value={config.volume} 
                    min={0} max={1} step={0.01} 
                    onChange={onVolumeChange} 
                    className="flex-1 mb-0"
                />
            </div>
        </div>

        {/* File List */}
        <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
            {files.length === 0 && (
                <div className="text-center py-4 text-theme-muted text-[10px] font-mono italic opacity-50">
                    EMPTY
                </div>
            )}
            
            {files.map(file => {
                const isActive = config.activeId === file.id;
                return (
                    <div 
                        key={file.id}
                        className={`flex items-center justify-between p-2 rounded border text-xs font-mono transition-all cursor-pointer group ${
                            isActive 
                            ? 'bg-theme-secondary/20 border-theme-secondary text-theme-secondary' 
                            : 'bg-transparent border-transparent text-theme-muted hover:bg-theme-panel hover:text-theme-text'
                        }`}
                        onClick={() => onSetActive(file.id)}
                    >
                        <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0 mr-2">
                            {isActive && config.isPlaying ? (
                                <div className="flex gap-0.5 items-end h-3 shrink-0">
                                    <div className="w-0.5 bg-current animate-[pulse_0.5s_infinite] h-2"></div>
                                    <div className="w-0.5 bg-current animate-[pulse_0.7s_infinite] h-3"></div>
                                    <div className="w-0.5 bg-current animate-[pulse_0.6s_infinite] h-1.5"></div>
                                </div>
                            ) : (
                                <CloudRain size={12} className="shrink-0" />
                            )}
                            <span className="truncate">{file.name}</span>
                        </div>
                        
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(file.id); }}
                            className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all shrink-0"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                );
            })}
        </div>

        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                    onUpload(e.target.files);
                    e.target.value = '';
                }
            }}
            accept="audio/*"
            multiple 
            className="hidden"
        />
    </div>
  );
};

export default AmbienceSettings;
