
import React, { useState, useEffect } from 'react';
import { Save, Trash2, Edit2, Check, X, Download, RotateCcw } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { AppPreset } from '../../../types';
import { Tooltip } from '../../ui/Tooltip';

interface ConfigManagerProps {
  presets: AppPreset[];
  activePresetId: string | null;
  onSave: (name: string) => void;
  onOverwrite: (id: string) => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onResetDefault?: () => void;
}

const ConfigManager: React.FC<ConfigManagerProps> = ({ presets, activePresetId, onSave, onOverwrite, onLoad, onDelete, onRename, onResetDefault }) => {
  const { t } = useLanguage();
  
  // Logic to determine next default name
  const getNextName = () => {
      const base = "Preset_";
      const numbers = presets.map(p => {
          if (p.name.startsWith(base)) {
              const numPart = p.name.replace(base, '');
              const num = parseInt(numPart, 10);
              return isNaN(num) ? 0 : num;
          }
          return 0;
      });
      const max = Math.max(0, ...numbers);
      return `${base}${String(max + 1).padStart(2, '0')}`;
  };

  const [newName, setNewName] = useState(getNextName());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Update name when presets change (e.g. after a save or load)
  useEffect(() => {
      setNewName(getNextName());
  }, [presets]);

  const handleSave = () => {
    if (!newName.trim()) return;
    onSave(newName);
    // Name update is handled by useEffect
  };

  const handleOverwrite = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      onOverwrite(id);
  };

  const handleReset = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onResetDefault) onResetDefault();
  };

  const startEditing = (preset: AppPreset, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(preset.id);
    setEditName(preset.name);
  };

  const cancelEditing = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingId(null);
    setEditName('');
  };

  const saveEditing = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!editName.trim()) return;
    onRename(id, editName);
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(id);
  };

  const handleLoad = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onLoad(id);
  };

  const handleExport = (preset: AppPreset, e: React.MouseEvent) => {
      e.stopPropagation();
      const configToExport = {
          ...preset.config,
          version: '1.2'
      };
      
      const blob = new Blob([JSON.stringify(configToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const safeName = preset.name.replace(/[^a-z0-9_\-]/gi, '_');
      const date = new Date().toISOString().split('T')[0];
      const fileName = `${safeName}_${date}.NRP`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  return (
    <div className="pt-2">
      {/* Save Input */}
      <div className="flex gap-2 mb-4 bg-theme-panel/40 p-2 rounded border border-theme-border">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t('preset_name')}
          className="flex-1 bg-transparent border-b border-theme-primary focus:border-theme-primary outline-none text-xs font-mono text-theme-text placeholder-theme-muted px-1 transition-colors"
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <Tooltip content={t('save_preset')} position="top">
            <button
            id="tutorial-save-preset-btn"
            onClick={handleSave}
            disabled={!newName.trim()}
            className="flex items-center gap-1 px-3 py-1 bg-theme-primary/10 border border-theme-primary text-theme-primary rounded text-[10px] font-bold tracking-wider hover:bg-theme-primary hover:text-black disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-theme-primary transition-all"
            >
            <Save size={12} /> {t('save_preset')}
            </button>
        </Tooltip>
      </div>

      {/* Preset List */}
      <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
        {presets.length === 0 && (
          <div className="text-center text-theme-muted text-[10px] font-mono py-4 italic">
            {t('no_presets')}
          </div>
        )}
        
        {presets.map((preset) => {
          const isActive = preset.id === activePresetId;
          const isDefault = preset.id === 'default_system';

          return (
          <div 
            key={preset.id} 
            onClick={() => {
                if (editingId !== preset.id) handleLoad(preset.id);
            }}
            className={`flex items-center justify-between p-2 border rounded group transition-all cursor-pointer 
                ${isActive 
                    ? 'bg-theme-accent/10 border-theme-accent shadow-[inset_0_0_10px_rgba(var(--color-accent),0.2)]' 
                    : 'bg-theme-panel/30 border-theme-border hover:bg-theme-panel/60 hover:border-theme-primary'
                }
            `}
          >
            {editingId === preset.id ? (
              <div className="flex flex-1 items-center gap-2 mr-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 bg-black/50 border border-theme-secondary rounded px-2 py-0.5 text-xs text-theme-text font-mono focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEditing(preset.id);
                    if (e.key === 'Escape') cancelEditing();
                  }}
                />
                <button onClick={(e) => saveEditing(preset.id, e)} className="text-theme-accent hover:scale-110">
                  <Check size={14} />
                </button>
                <button onClick={(e) => cancelEditing(e)} className="text-red-500 hover:scale-110">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex-1 min-w-0 mr-2 flex items-center gap-2">
                <div className={`text-xs font-mono truncate transition-colors ${isActive ? 'text-theme-accent font-bold' : 'text-theme-muted group-hover:text-theme-text'}`}>
                  {preset.name}
                </div>
                {isActive && (
                    <span className="text-[8px] bg-theme-accent text-black px-1 rounded font-bold tracking-wider">ACTIVE</span>
                )}
              </div>
            )}

            {editingId !== preset.id && (
              <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                 
                 {/* Apply Button */}
                 {!isActive && (
                    <Tooltip content="APPLY" position="top">
                        <button 
                        onClick={(e) => handleLoad(preset.id, e)}
                        className="p-1.5 hover:bg-theme-primary/20 hover:text-theme-primary rounded transition-colors text-theme-muted"
                        >
                        <Check size={12} />
                        </button>
                    </Tooltip>
                 )}

                 {/* Reset Default Button */}
                 {isDefault && onResetDefault && (
                     <Tooltip content="FACTORY RESET" position="top">
                        <button 
                        onClick={handleReset}
                        className="p-1.5 hover:bg-amber-500/20 hover:text-amber-500 rounded transition-colors text-theme-muted"
                        >
                        <RotateCcw size={12} />
                        </button>
                    </Tooltip>
                 )}

                 {/* Save/Overwrite Button */}
                 {!isDefault && (
                     <Tooltip content="OVERWRITE" position="top">
                        <button 
                        onClick={(e) => handleOverwrite(preset.id, e)}
                        className="p-1.5 hover:bg-theme-accent/20 hover:text-theme-accent rounded transition-colors text-theme-muted"
                        >
                        <Save size={12} />
                        </button>
                    </Tooltip>
                 )}

                 {/* Export Config */}
                 <Tooltip content={t('export_config')} position="top">
                    <button 
                    onClick={(e) => handleExport(preset, e)}
                    className="p-1.5 hover:bg-theme-primary/20 hover:text-theme-primary rounded transition-colors"
                    >
                    <Download size={12} />
                    </button>
                </Tooltip>
                
                {/* Rename */}
                {!isDefault && (
                    <Tooltip content={t('rename')} position="top">
                        <button 
                        onClick={(e) => startEditing(preset, e)}
                        className="p-1.5 hover:bg-theme-secondary/20 hover:text-theme-secondary rounded transition-colors"
                        >
                        <Edit2 size={12} />
                        </button>
                    </Tooltip>
                )}

                {/* Delete */}
                {!isDefault && (
                    <Tooltip content={t('delete')} position="top">
                        <button 
                        onClick={(e) => handleDelete(preset.id, e)}
                        className="p-1.5 hover:bg-red-500/20 hover:text-red-500 rounded transition-colors"
                        >
                        <Trash2 size={12} />
                        </button>
                    </Tooltip>
                )}
              </div>
            )}
          </div>
        )})}
      </div>
    </div>
  );
};

export default ConfigManager;
