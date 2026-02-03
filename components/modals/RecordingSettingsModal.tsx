
import React, { useState } from 'react';
import { X, Video, Save, Film, Mic } from 'lucide-react';
import { RecorderConfig } from '../../types';

interface RecordingSettingsModalProps {
  onClose: () => void;
  onSave: (config: RecorderConfig) => void;
  currentConfig: RecorderConfig;
}

const OptionRow = ({ label, icon: Icon, children }: { label: string, icon: any, children?: React.ReactNode }) => (
  <div className="mb-4">
    <label className="text-[10px] font-mono text-theme-muted uppercase tracking-widest mb-2 flex items-center gap-2">
      <Icon size={12} /> {label}
    </label>
    {children}
  </div>
);

const RecordingSettingsModal: React.FC<RecordingSettingsModalProps> = ({ onClose, onSave, currentConfig }) => {
  const [config, setConfig] = useState<RecorderConfig>(currentConfig);

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="bg-theme-panel border border-theme-primary shadow-[0_0_30px_rgba(var(--color-primary),0.3)] w-full max-w-sm rounded-lg overflow-hidden animate-[scale-in-center_0.2s_ease-out]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-theme-primary/10 border-b border-theme-primary p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-theme-primary">
            <Video size={16} className="animate-pulse" />
            <span className="font-mono text-xs font-bold tracking-widest uppercase">REC CONFIG</span>
          </div>
          <button onClick={onClose} className="text-theme-muted hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
            
            <OptionRow label="RESOLUTION" icon={Film}>
                <div className="grid grid-cols-3 gap-2">
                    {['720p', '1080p', '4k'].map((res) => (
                        <button
                            key={res}
                            onClick={() => setConfig({ ...config, resolution: res as any })}
                            className={`px-3 py-2 text-xs font-mono border rounded transition-all ${
                                config.resolution === res 
                                    ? 'bg-theme-primary text-black border-theme-primary font-bold' 
                                    : 'bg-black/30 text-theme-muted border-theme-border hover:border-theme-primary'
                            }`}
                        >
                            {res.toUpperCase()}
                        </button>
                    ))}
                </div>
            </OptionRow>

            <OptionRow label="FRAMERATE (FPS)" icon={Video}>
                <div className="grid grid-cols-2 gap-2">
                    {[30, 60].map((fps) => (
                        <button
                            key={fps}
                            onClick={() => setConfig({ ...config, fps: fps as any })}
                            className={`px-3 py-2 text-xs font-mono border rounded transition-all ${
                                config.fps === fps
                                    ? 'bg-theme-primary text-black border-theme-primary font-bold' 
                                    : 'bg-black/30 text-theme-muted border-theme-border hover:border-theme-primary'
                            }`}
                        >
                            {fps} FPS
                        </button>
                    ))}
                </div>
            </OptionRow>

            <OptionRow label="VIDEO BITRATE (QUALITY)" icon={Save}>
                <select 
                    value={config.videoBitrate}
                    onChange={(e) => setConfig({ ...config, videoBitrate: Number(e.target.value) })}
                    className="w-full bg-black/30 border border-theme-border text-theme-text text-xs font-mono p-2 rounded focus:border-theme-primary outline-none"
                >
                    <option value={2500000}>LOW (2.5 Mbps)</option>
                    <option value={5000000}>MEDIUM (5 Mbps)</option>
                    <option value={8000000}>HIGH (8 Mbps)</option>
                    <option value={15000000}>ULTRA (15 Mbps)</option>
                </select>
            </OptionRow>

            <OptionRow label="AUDIO BITRATE" icon={Mic}>
                <select 
                    value={config.audioBitrate}
                    onChange={(e) => setConfig({ ...config, audioBitrate: Number(e.target.value) })}
                    className="w-full bg-black/30 border border-theme-border text-theme-text text-xs font-mono p-2 rounded focus:border-theme-primary outline-none"
                >
                    <option value={128000}>128 kbps</option>
                    <option value={192000}>192 kbps</option>
                    <option value={256000}>256 kbps</option>
                    <option value={320000}>320 kbps</option>
                </select>
            </OptionRow>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-theme-border bg-black/20 flex justify-end gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-xs font-mono text-theme-muted hover:text-white transition-colors"
            >
                CANCEL
            </button>
            <button 
                onClick={handleSave}
                className="px-6 py-2 bg-theme-primary text-black font-mono font-bold text-xs rounded hover:shadow-[0_0_15px_var(--color-primary)] transition-all"
            >
                APPLY SETTINGS
            </button>
        </div>
      </div>
    </div>
  );
};

export default RecordingSettingsModal;
