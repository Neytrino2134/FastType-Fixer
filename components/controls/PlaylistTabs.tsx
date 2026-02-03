
import React, { useRef, useEffect, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Playlist } from '../../types';

interface PlaylistTabsProps {
  playlists: Playlist[];
  activePlaylistId: string;
  playingPlaylistId: string;
  isPlaying: boolean;
  isLocked: boolean;
  // Actions
  onSwitchPlaylist: (id: string) => void;
  onAddPlaylist: () => void;
  onRequestRemovePlaylist: (id: string, force?: boolean) => void; 
  onRenamePlaylist: (id: string, name: string) => void;
  onReorderPlaylists: (dragIndex: number, hoverIndex: number) => void;
  // Drag Data props from parent to handle drop zones
  draggedTrackIds: string[];
  dragSourcePlaylistId: string | null;
  moveTracksToPlaylist: (sourceId: string, trackIds: string[], targetId: string) => void;
  onNewPlaylistWithTracks: (trackIds: string[], sourceId: string) => void;
  onNewPlaylistWithFiles: (files: File[]) => void;
  // Clear drag state callback
  clearDragState: () => void;
  onFilesSelected: (files: FileList) => void;
}

export const PlaylistTabs: React.FC<PlaylistTabsProps> = ({
  playlists, activePlaylistId, playingPlaylistId, isPlaying, isLocked,
  onSwitchPlaylist, onAddPlaylist, onRequestRemovePlaylist, onRenamePlaylist, onReorderPlaylists,
  draggedTrackIds, dragSourcePlaylistId, moveTracksToPlaylist, onNewPlaylistWithTracks, onNewPlaylistWithFiles,
  clearDragState, onFilesSelected
}) => {
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [isPlusDragOver, setIsPlusDragOver] = useState(false);
  
  const tabSwitchTimeoutRef = useRef<number | null>(null);

  // Scroll to active tab
  useEffect(() => {
    if (tabsContainerRef.current) {
      const container = tabsContainerRef.current;
      const activeTab = container.querySelector(`[data-tab-id="${activePlaylistId}"]`) as HTMLElement;
      
      if (activeTab) {
        const containerWidth = container.clientWidth;
        const tabWidth = activeTab.offsetWidth;
        const tabLeft = activeTab.offsetLeft;
        const scrollLeft = tabLeft - (containerWidth / 2) + (tabWidth / 2);
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }, [activePlaylistId, playlists.length]);

  // Horizontal Wheel Scroll
  useEffect(() => {
      const tabsEl = tabsContainerRef.current;
      const onTabsWheel = (e: WheelEvent) => {
          if (e.shiftKey) return;
          e.preventDefault();
          if (tabsContainerRef.current) {
              tabsContainerRef.current.scrollLeft += e.deltaY;
          }
      };
      if (tabsEl) tabsEl.addEventListener('wheel', onTabsWheel, { passive: false });
      return () => { if (tabsEl) tabsEl.removeEventListener('wheel', onTabsWheel); };
  }, []);

  const handleTabDragStart = (e: React.DragEvent, id: string) => {
    if (isLocked) { e.preventDefault(); return; }
    setDraggedTabId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTabDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (isLocked) return;
    if (dragOverTabId !== targetId) setDragOverTabId(targetId);

    // Auto-switch tab if dragging tracks over it
    if (draggedTrackIds.length > 0 && targetId !== activePlaylistId) {
        if (!tabSwitchTimeoutRef.current) {
            tabSwitchTimeoutRef.current = window.setTimeout(() => {
                onSwitchPlaylist(targetId);
                tabSwitchTimeoutRef.current = null;
            }, 600); 
        }
    }
  };

  const handleTabDragLeave = () => {
      if (tabSwitchTimeoutRef.current) {
          clearTimeout(tabSwitchTimeoutRef.current);
          tabSwitchTimeoutRef.current = null;
      }
      setDragOverTabId(null);
  };

  const handleTabDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverTabId(null);
    if (isLocked) return;

    if (draggedTabId) {
        // Reorder Tabs
        if (draggedTabId === targetId) return;
        const dragIndex = playlists.findIndex(p => p.id === draggedTabId);
        const hoverIndex = playlists.findIndex(p => p.id === targetId);
        if (dragIndex !== -1 && hoverIndex !== -1) {
            onReorderPlaylists(dragIndex, hoverIndex);
        }
        setDraggedTabId(null);
    } else if (draggedTrackIds.length > 0) {
        // Drop Tracks on Tab
        if (targetId !== activePlaylistId) {
            moveTracksToPlaylist(activePlaylistId, draggedTrackIds, targetId);
            clearDragState();
        }
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        // Drop Files on Tab
        onSwitchPlaylist(targetId);
        onFilesSelected(e.dataTransfer.files);
    }
  };

  const handlePlusDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      if (!isPlusDragOver) setIsPlusDragOver(true);
  };

  const handlePlusDragLeave = () => {
      setIsPlusDragOver(false);
  };

  const handlePlusDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsPlusDragOver(false);
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          onNewPlaylistWithFiles(Array.from(e.dataTransfer.files));
          return;
      }

      if (draggedTrackIds.length > 0 && dragSourcePlaylistId) {
          onNewPlaylistWithTracks(draggedTrackIds, dragSourcePlaylistId);
          clearDragState();
      }
  };

  const requestDeleteTab = (id: string, e: React.MouseEvent) => {
      // SHIFT + CLICK: Force delete (skip confirmation logic passed via force flag)
      onRequestRemovePlaylist(id, e.shiftKey);
  };

  const startRename = (id: string, name: string) => {
      if (isLocked) return;
      setEditingTabId(id);
      setEditingName(name);
  };

  const finishRename = () => {
      if (editingTabId && editingName.trim()) {
          onRenamePlaylist(editingTabId, editingName);
      }
      setEditingTabId(null);
  };

  return (
    <>
        <style>{`
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
        
        <div 
            ref={tabsContainerRef}
            className="flex items-end gap-1 overflow-x-auto no-scrollbar scroll-smooth shrink-0 relative z-20 pl-1"
        >
            {playlists.map((playlist) => {
                const isPlayingThis = playlist.id === playingPlaylistId && isPlaying;
                const isDragTarget = dragOverTabId === playlist.id;
                const isActive = playlist.id === activePlaylistId;
                
                return (
                <div 
                    key={playlist.id}
                    data-tab-id={playlist.id} 
                    draggable={!isLocked}
                    onDragStart={(e) => handleTabDragStart(e, playlist.id)}
                    onDragOver={(e) => handleTabDragOver(e, playlist.id)}
                    onDragLeave={handleTabDragLeave}
                    onDrop={(e) => handleTabDrop(e, playlist.id)}
                    onClick={() => onSwitchPlaylist(playlist.id)}
                    onDoubleClick={() => startRename(playlist.id, playlist.name)}
                    className={`
                        group flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-mono cursor-pointer transition-all shrink-0 select-none border-t border-r border-l
                        ${isDragTarget
                            ? 'bg-theme-accent text-black font-bold scale-105 z-30 border-theme-accent'
                            : isActive 
                                // CHANGED: Border to theme-border to avoid white glow effect
                                ? 'bg-theme-bg/40 text-theme-primary font-bold z-20 shadow-[0_-2px_5px_rgba(0,0,0,0.2)] border-theme-border -mb-[1px]' 
                                : 'bg-transparent text-theme-muted hover:bg-theme-panel hover:text-white z-0 opacity-70 hover:opacity-100 border-transparent'
                        }
                    `}
                >
                    {isPlayingThis && !isActive && (
                        <div className="w-1.5 h-1.5 rounded-full bg-theme-accent animate-pulse"></div>
                    )}

                    {editingTabId === playlist.id ? (
                        <input 
                            type="text" 
                            value={editingName} 
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={finishRename}
                            onKeyDown={(e) => e.key === 'Enter' && finishRename()}
                            autoFocus
                            onFocus={(e) => e.target.select()}
                            className="bg-black text-white w-20 outline-none border-b border-gray-600"
                        />
                    ) : (
                        <span>{playlist.name}</span>
                    )}
                    
                    {playlists.length > 1 && !isLocked && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); requestDeleteTab(playlist.id, e); }}
                            className="text-theme-muted/50 hover:text-red-500 transition-colors p-0.5 ml-1"
                        >
                            <X size={10} />
                        </button>
                    )}
                </div>
            )})}
            
            {!isLocked && (
                <button 
                    onClick={onAddPlaylist}
                    onDragOver={handlePlusDragOver}
                    onDragLeave={handlePlusDragLeave}
                    onDrop={handlePlusDrop}
                    className={`
                        px-2 py-2 rounded-t-lg transition-all duration-200 shrink-0 mb-0 z-0
                        ${isPlusDragOver 
                            ? 'bg-theme-accent text-black scale-110 z-30' 
                            : 'bg-transparent text-theme-muted hover:text-theme-accent hover:bg-theme-primary/10'
                        }
                    `}
                >
                    <Plus size={14} className={isPlusDragOver ? "animate-pulse" : ""} />
                </button>
            )}
        </div>
    </>
  );
};
