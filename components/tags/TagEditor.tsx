
import React, { useState, useEffect } from 'react';
import { AudioTrack, TagMetadata } from '../../types';
import { Disc, FileAudio, User, Mic2, Calendar, Hash, Music, Save } from 'lucide-react';

interface TagEditorProps {
  tracks: AudioTrack[];
  onUpdateTrack: (id: string, updates: Partial<AudioTrack> & { tags?: TagMetadata }) => void;
}

const TagEditor: React.FC<TagEditorProps> = ({ tracks, onUpdateTrack }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TagMetadata>({});

  const selectedTrack = tracks.find(t => t.id === selectedId);

  useEffect(() => {
    if (tracks.length > 0 && !selectedId) {
      setSelectedId(tracks[0].id);
    }
  }, [tracks, selectedId]);

  useEffect(() => {
    if (selectedTrack) {
      setFormData({
        title: selectedTrack.tags?.title || selectedTrack.name.replace(/\.[^/.]+$/, ""),
        artist: selectedTrack.tags?.artist || "",
        album: selectedTrack.tags?.album || "",
        year: selectedTrack.tags?.year || "",
        genre: selectedTrack.tags?.genre || "",
        trackNumber: selectedTrack.tags?.trackNumber || "",
      });
    }
  }, [selectedId, selectedTrack]);

  const handleChange = (key: keyof TagMetadata, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (selectedId) {
      onUpdateTrack(selectedId, { tags: formData });
    }
  };

  // Helper for input styles
  const inputClass = "w-full bg-black/40 border-b border-theme-border focus:border-theme-primary outline-none px-2 py-1.5 text-xs font-mono text-theme-text transition-colors";
  const labelClass = "text-[10px] font-mono text-theme-muted uppercase tracking-wider mb-1 block";

  return (
    <div className="w-full h-full bg-black flex relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-20" 
           style={{ backgroundImage: 'linear-gradient(#111 1px, transparent 1px), linear-gradient(90deg, #111 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {/* LEFT: Track List */}
      <div className="w-1/3 min-w-[250px] border-r border-theme-border bg-theme-panel/30 flex flex-col z-10 backdrop-blur-sm">
        <div className="p-3 border-b border-theme-border bg-theme-panel/50">
          <h3 className="text-xs font-mono font-bold text-theme-primary tracking-widest flex items-center gap-2">
            <FileAudio size={14} /> LOADED TRACKS ({tracks.length})
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {tracks.map(track => (
            <div 
              key={track.id}
              onClick={() => setSelectedId(track.id)}
              className={`
                p-2 rounded cursor-pointer flex items-center gap-3 transition-all border
                ${selectedId === track.id 
                  ? 'bg-theme-primary/10 border-theme-primary text-theme-text' 
                  : 'bg-transparent border-transparent text-theme-muted hover:bg-white/5 hover:text-white'}
              `}
            >
              <div className={`w-8 h-8 rounded shrink-0 overflow-hidden bg-black/50 flex items-center justify-center border ${selectedId === track.id ? 'border-theme-primary/50' : 'border-theme-border'}`}>
                 {track.artworkUrl ? (
                   <img src={track.artworkUrl} className="w-full h-full object-cover" alt="Art" />
                 ) : (
                   <Disc size={14} className="opacity-50" />
                 )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold truncate font-mono">{track.tags?.title || track.name}</div>
                <div className="text-[9px] opacity-60 truncate font-mono">{track.tags?.artist || "Unknown Artist"}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: Editor */}
      <div className="flex-1 flex flex-col z-10 relative">
        {selectedTrack ? (
          <div className="p-8 flex flex-col h-full overflow-y-auto custom-scrollbar">
             
             {/* Header Info */}
             <div className="flex items-start gap-6 mb-8">
                {/* Artwork Large */}
                <div className="w-40 h-40 bg-black/50 border-2 border-theme-border rounded-lg shadow-lg flex items-center justify-center overflow-hidden shrink-0 group relative cursor-pointer hover:border-theme-primary transition-colors">
                    {selectedTrack.artworkUrl ? (
                      <img src={selectedTrack.artworkUrl} className="w-full h-full object-cover" alt="Art" />
                    ) : (
                      <Disc size={48} className="text-theme-muted opacity-30" />
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="text-[10px] font-mono text-white border border-white px-2 py-1 rounded">CHANGE ART</span>
                    </div>
                </div>

                <div className="flex-1 pt-2">
                    <h2 className="text-2xl font-bold font-mono text-white mb-1 tracking-wider">{formData.title || "Untitled"}</h2>
                    <p className="text-lg text-theme-primary font-mono mb-4">{formData.artist || "Unknown Artist"}</p>
                    
                    <div className="flex gap-2">
                       <span className="text-[10px] bg-theme-panel border border-theme-border px-2 py-1 rounded text-theme-muted font-mono">
                          ID: {selectedTrack.id.slice(0, 8)}
                       </span>
                       <span className="text-[10px] bg-theme-panel border border-theme-border px-2 py-1 rounded text-theme-muted font-mono">
                          MP3 / 44.1kHz
                       </span>
                    </div>
                </div>
             </div>

             {/* Form Grid */}
             <div className="grid grid-cols-2 gap-x-8 gap-y-6 max-w-2xl">
                <div className="col-span-2">
                   <label className={labelClass}><Music size={10} className="inline mr-1"/> TITLE</label>
                   <input 
                      value={formData.title} 
                      onChange={(e) => handleChange('title', e.target.value)}
                      className={`${inputClass} text-sm font-bold`}
                      placeholder="Track Title"
                   />
                </div>

                <div>
                   <label className={labelClass}><User size={10} className="inline mr-1"/> ARTIST</label>
                   <input 
                      value={formData.artist} 
                      onChange={(e) => handleChange('artist', e.target.value)}
                      className={inputClass}
                      placeholder="Artist Name"
                   />
                </div>

                <div>
                   <label className={labelClass}><Disc size={10} className="inline mr-1"/> ALBUM</label>
                   <input 
                      value={formData.album} 
                      onChange={(e) => handleChange('album', e.target.value)}
                      className={inputClass}
                      placeholder="Album Name"
                   />
                </div>

                <div>
                   <label className={labelClass}><Mic2 size={10} className="inline mr-1"/> GENRE</label>
                   <input 
                      value={formData.genre} 
                      onChange={(e) => handleChange('genre', e.target.value)}
                      className={inputClass}
                      placeholder="Genre"
                   />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}><Calendar size={10} className="inline mr-1"/> YEAR</label>
                        <input 
                            value={formData.year} 
                            onChange={(e) => handleChange('year', e.target.value)}
                            className={inputClass}
                            placeholder="YYYY"
                        />
                    </div>
                    <div>
                        <label className={labelClass}><Hash size={10} className="inline mr-1"/> TRACK #</label>
                        <input 
                            value={formData.trackNumber} 
                            onChange={(e) => handleChange('trackNumber', e.target.value)}
                            className={inputClass}
                            placeholder="01"
                        />
                    </div>
                </div>
             </div>

             {/* Action Bar */}
             <div className="mt-8 pt-6 border-t border-theme-border flex justify-end">
                 <button 
                    onClick={handleSave}
                    className="px-6 py-2 bg-theme-primary text-black font-mono font-bold rounded flex items-center gap-2 hover:bg-white hover:shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-all"
                 >
                    <Save size={16} /> SAVE CHANGES
                 </button>
             </div>

          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-theme-muted font-mono text-sm opacity-50">
             SELECT A TRACK TO EDIT
          </div>
        )}
      </div>
    </div>
  );
};

export default TagEditor;
