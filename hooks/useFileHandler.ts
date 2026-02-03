
import React, { useState, useEffect, useCallback } from 'react';
import { useNotification } from '../contexts/NotificationContext';

interface UseFileHandlerProps {
  player: any;
  config: any;
  containerRef: React.RefObject<HTMLDivElement>;
  handleZipUpload: (file: File) => Promise<void>;
}

// --- FILE SYSTEM API TYPES (For TypeScript) ---
// Note: Basic shim for FileSystemEntry API which isn't fully typed in standard React setups
interface FileSystemEntry {
    isFile: boolean;
    isDirectory: boolean;
    name: string;
    fullPath: string;
    file: (callback: (file: File) => void) => void;
    createReader: () => FileSystemDirectoryReader;
}

interface FileSystemDirectoryReader {
    readEntries: (success: (entries: FileSystemEntry[]) => void, error?: (err: any) => void) => void;
}

export const useFileHandler = ({ player, config, containerRef, handleZipUpload }: UseFileHandlerProps) => {
  const { addNotification } = useNotification();
  const [isDragging, setIsDragging] = useState(false);

  // --- RECURSIVE FILE SCANNER ---
  // Reads all files from a directory entry, recursively handling subdirectories
  const scanEntry = async (entry: FileSystemEntry): Promise<File[]> => {
      if (entry.isFile) {
          return new Promise((resolve) => {
              entry.file((file) => {
                  resolve([file]);
              });
          });
      } else if (entry.isDirectory) {
          const dirReader = entry.createReader();
          const entries: FileSystemEntry[] = [];
          
          // readEntries needs to be looped because it might not return all files in one call
          const readBatch = async (): Promise<void> => {
              const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
                  dirReader.readEntries(resolve, reject);
              });
              
              if (batch.length > 0) {
                  entries.push(...batch);
                  await readBatch(); // Keep reading until empty
              }
          };

          await readBatch();
          
          const results = await Promise.all(entries.map(e => scanEntry(e)));
          return results.flat();
      }
      return [];
  };

  const handleFilesSelected = async (fileList: FileList) => {
    await player.processAudioFiles(Array.from(fileList));
    addNotification(`${fileList.length} tracks added`, "success");
  };

  // --- CORE FILE PROCESSOR ---
  // Reusable logic for Drop and Paste
  const processFiles = useCallback(async (allFiles: File[]) => {
    if (allFiles.length === 0) return;

    addNotification(`Scanning ${allFiles.length} files...`, "info");

    // --- SMART DISTRIBUTION LOGIC ---

    // 1. Configs (.NRP)
    const nrpFiles = allFiles.filter(f => f.name.toLowerCase().endsWith('.nrp'));
    if (nrpFiles.length > 0) {
      // Import multiple presets into the list
      const lastImportedId = await config.batchImportPresets(nrpFiles);
      
      // If we successfully imported presets, load the last one immediately
      if (lastImportedId) {
          const loaded = config.loadPreset(lastImportedId);
          if (loaded) {
              if (loaded.theme) config.setTheme(loaded.theme);
              if (loaded.controlStyle) config.setControlStyle(loaded.controlStyle);
          }
      }
      addNotification(`${nrpFiles.length} presets imported & saved`, "success");
    }

    // 2. Audio Files
    const audioFiles = allFiles.filter(f => 
        f.type.startsWith('audio/') || 
        f.name.toLowerCase().endsWith('.ogg') || 
        f.name.toLowerCase().endsWith('.mp3') || 
        f.name.toLowerCase().endsWith('.wav') ||
        f.name.toLowerCase().endsWith('.m4a')
    );

    // 3. Media Files (Images/Videos)
    const mediaFiles = allFiles.filter(f => 
        f.type.startsWith('image/') || 
        f.type.startsWith('video/')
    );

    // 4. SFX Archives
    const zipFiles = allFiles.filter(f => f.name.toLowerCase().endsWith('.zip'));

    // --- ACTIONS ---

    let actionCount = 0;

    if (audioFiles.length > 0) {
        await player.processAudioFiles(audioFiles);
        addNotification(`${audioFiles.length} tracks added to playlist`, "success");
        actionCount++;
    }
    
    if (mediaFiles.length > 0) {
        await config.handleBgUpload(mediaFiles);
        addNotification(`${mediaFiles.length} backgrounds added`, "success");
        actionCount++;
    }
    
    if (zipFiles.length > 0) {
        await handleZipUpload(zipFiles[0]);
        actionCount++;
    }

    if (actionCount === 0 && nrpFiles.length === 0) {
        addNotification("No compatible media files found", "warning");
    }
  }, [config, player, handleZipUpload, addNotification]);

  // --- PASTE HANDLER ---
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
        // If user is focused on an input, we typically allow default paste,
        // but if they paste a file (image/audio), we intercept it regardless of focus.
        
        const items = e.clipboardData?.items;
        if (!items) return;

        const files: File[] = [];
        for (let i = 0; i < items.length; i++) {
            // Check if item is a file
            if (items[i].kind === 'file') {
                const file = items[i].getAsFile();
                if (file) files.push(file);
            }
        }

        // If files are found, prevent default and process them
        // Even if in an input, if the user pastes an image, we probably want to capture it 
        // rather than pasting nothing or the filename.
        if (files.length > 0) {
            e.preventDefault();
            processFiles(files);
        }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processFiles]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if items are being dragged (files)
    if (!e.dataTransfer.types.includes('Files')) return;
    
    const target = e.target as HTMLElement;
    // Don't show global drop overlay if hovering over specific controls (like playlist tabs)
    if (target.closest('#tutorial-player')) {
        if (isDragging) setIsDragging(false);
        return;
    }
    if (!isDragging) setIsDragging(true);
  };

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.dataTransfer.types.includes('Files')) return;
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (containerRef.current) {
        const related = e.relatedTarget as Node;
        // Logic to prevent flickering when moving between child elements
        const isOutsideApp = !containerRef.current.contains(related);
        const isInsideControls = related && (related as Element).closest('#tutorial-player');
        if (isOutsideApp || isInsideControls) {
            setIsDragging(false);
        }
    }
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    let allFiles: File[] = [];

    // 1. Try to use webkitGetAsEntry for recursive folder scanning
    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
        const promises: Promise<File[]>[] = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
            if (entry) {
                // Cast to our interface
                promises.push(scanEntry(entry as unknown as FileSystemEntry));
            } else if (item.kind === 'file') {
                // Fallback for items that are files but entry retrieval failed
                const f = item.getAsFile();
                if (f) promises.push(Promise.resolve([f]));
            }
        }
        const results = await Promise.all(promises);
        allFiles = results.flat();
    } else {
        // 2. Fallback to standard files list (no folder recursion)
        allFiles = Array.from(e.dataTransfer.files);
    }

    await processFiles(allFiles);
  };

  return {
    isDragging,
    handleFilesSelected,
    onDragOver,
    onDragEnter,
    onDragLeave,
    onDrop
  };
};
