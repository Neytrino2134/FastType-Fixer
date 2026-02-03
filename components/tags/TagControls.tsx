
import React from 'react';
import { Save, CheckCheck, Trash2, Download } from 'lucide-react';

interface TagControlsProps {
  onExit: () => void;
  onSaveAll: () => void;
}

const TagControls: React.FC<TagControlsProps> = ({ onExit, onSaveAll }) => {
  return (
    <div className="w-full h-full flex flex-col bg-theme-bg border-r-4 border-theme-panel shadow-inner overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-theme-panel border-b border-theme-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-theme-primary">
                <Save size={20} className="animate-pulse" />
                <span className="font-mono font-bold tracking-widest">TAG EDITOR</span>
            </div>
            <button 
                onClick={onExit}
                className="text-[10px] font-mono border border-theme-muted px-2 py-1 rounded text-theme-muted hover:text-white hover:border-white transition-colors"
            >
                EXIT
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            
            <div className="bg-black/30 p-4 rounded-lg border border-theme-border">
                <div className="text-[10px] font-mono text-theme-muted mb-3 uppercase tracking-widest">BATCH ACTIONS</div>
                
                <div className="space-y-2">
                    <button 
                        onClick={onSaveAll}
                        className="w-full py-3 bg-theme-primary/10 border border-theme-primary text-theme-primary font-mono text-xs font-bold rounded flex items-center justify-center gap-2 hover:bg-theme-primary hover:text-black transition-all"
                    >
                        <CheckCheck size={14} /> SAVE ALL META
                    </button>
                    
                    <button 
                        className="w-full py-3 bg-theme-panel border border-theme-border text-theme-muted font-mono text-xs font-bold rounded flex items-center justify-center gap-2 hover:text-white hover:border-theme-accent transition-all"
                    >
                        <Download size={14} /> DOWNLOAD FILES
                    </button>
                </div>
            </div>

            <div className="bg-black/30 p-4 rounded-lg border border-theme-border">
                <div className="text-[10px] font-mono text-theme-muted mb-3 uppercase tracking-widest">UTILITIES</div>
                <p className="text-[9px] font-mono text-theme-muted/70 mb-3 leading-relaxed">
                    Changes made here update the internal player database. Download files to persist tags to disk.
                </p>
                <button 
                    className="w-full py-2 border border-red-500/50 text-red-500/80 font-mono text-xs rounded hover:bg-red-500/20 hover:text-red-500 transition-all flex items-center justify-center gap-2"
                >
                    <Trash2 size={14} /> RESET ALL TAGS
                </button>
            </div>

        </div>
    </div>
  );
};

export default TagControls;
