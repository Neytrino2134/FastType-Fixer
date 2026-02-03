
import { useState, useEffect, useCallback, useRef } from 'react';
import JSZip from 'jszip';
import { saveSFX, getAllSFX } from '../lib/db';
import { useNotification } from '../contexts/NotificationContext';

export const REQUIRED_SFX_FILES = [
  'SFX_REBOOT',
  'SFX_START',
  'UI_BEEP',
  'WHOOSH_IN',
  'WHOOSH_OUT'
];

export const useSFX = () => {
  const [sfxMap, setSfxMap] = useState<Record<string, string>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const activeAudioRef = useRef<HTMLAudioElement[]>([]);
  const { addNotification } = useNotification();

  // SFX Volume State (Persisted)
  const [sfxVolume, setSfxVolumeState] = useState(() => {
      const saved = localStorage.getItem('neon_sfx_volume');
      return saved ? parseFloat(saved) : 0.6; // Default 0.6
  });

  const setSfxVolume = (vol: number) => {
      setSfxVolumeState(vol);
      localStorage.setItem('neon_sfx_volume', vol.toString());
  };

  // Load SFX from DB or Public Folder on mount
  useEffect(() => {
    const loadResources = async () => {
      try {
        // 1. Load user-uploaded SFX from IndexedDB
        const storedSFX = await getAllSFX();
        const loadedMap: Record<string, string> = {};
        
        storedSFX.forEach(item => {
          loadedMap[item.id] = URL.createObjectURL(item.blob);
        });

        // 2. Load Default SFX from public/sfx folder if missing in DB
        // We iterate through REQUIRED_SFX_FILES and try to fetch them
        const promises = REQUIRED_SFX_FILES.map(async (baseName) => {
            // Check if we already have this file (checking common extensions) from DB
            const hasMp3 = loadedMap[`${baseName}.mp3`];
            const hasWav = loadedMap[`${baseName}.wav`];
            const hasRaw = loadedMap[baseName]; // Legacy check

            if (hasMp3 || hasWav || hasRaw) return;

            // Try to fetch mp3 default from public/sfx/
            try {
                // Using relative path ./sfx/ works with Vite's public folder serving in both Dev and Electron
                const response = await fetch(`./sfx/${baseName}.mp3`);
                if (response.ok) {
                    const blob = await response.blob();
                    // Store WITH EXTENSION to allow direct overwrites by Zip uploads
                    loadedMap[`${baseName}.mp3`] = URL.createObjectURL(blob);
                } else {
                    // Try wav if mp3 missing
                     const respWav = await fetch(`./sfx/${baseName}.wav`);
                     if (respWav.ok) {
                        const blob = await respWav.blob();
                        loadedMap[`${baseName}.wav`] = URL.createObjectURL(blob);
                     }
                }
            } catch (err) {
                console.warn(`Could not load default SFX: ${baseName}`, err);
            }
        });

        await Promise.all(promises);

        setSfxMap(loadedMap);
        setIsLoaded(true);
      } catch (e) {
        console.error("Failed to load SFX resources", e);
      }
    };
    loadResources();
  }, []);

  // Handle ZIP upload
  const handleZipUpload = useCallback(async (file: File) => {
    try {
      addNotification("Processing SFX Archive...", "info");
      const zip = new JSZip();
      const unzipped = await zip.loadAsync(file);
      
      const newMap: Record<string, string> = { ...sfxMap };
      let count = 0;
      
      const promises: Promise<void>[] = [];

      unzipped.forEach((relativePath: string, zipEntry: JSZip.JSZipObject) => {
        const name = zipEntry.name.toLowerCase();
        if (relativePath && !zipEntry.dir && (
            name.endsWith('.wav') || 
            name.endsWith('.mp3') || 
            name.endsWith('.m4a') || 
            name.endsWith('.ogg')
        )) {
           const p = zipEntry.async('blob').then(async (blob: Blob) => {
               // Determine ID (filename)
               const fileName = zipEntry.name.split('/').pop() || zipEntry.name;
               
               // Save to DB
               await saveSFX({ id: fileName, blob });
               
               // Update local state - This overwrites any existing key with the same name
               newMap[fileName] = URL.createObjectURL(blob);
               count++;
           });
           promises.push(p);
        }
      });

      await Promise.all(promises);
      setSfxMap(newMap);
      
      if (count > 0) {
        addNotification(`SFX Pack Loaded: ${count} files`, "success");
      } else {
        addNotification("No audio files (wav/mp3/m4a) found", "warning");
      }
      
    } catch (e) {
      console.error("Failed to unzip or save SFX", e);
      addNotification("Failed to process SFX ZIP", "error");
    }
  }, [sfxMap, addNotification]);

  // Stop all currently playing SFX
  const stopAllSFX = useCallback(() => {
    activeAudioRef.current.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    activeAudioRef.current = [];
  }, []);

  // Play SFX with fuzzy matching for extensions
  const playSFX = useCallback((filenameWithExtension: string) => {
    // 1. Try exact match (Priority 1)
    let url = sfxMap[filenameWithExtension];

    // 2. Fallback: Try matching base name if exact match fails
    // (e.g. system asks for 'Start.mp3' but we might have 'Start.wav' or just 'Start')
    if (!url) {
        const baseName = filenameWithExtension.substring(0, filenameWithExtension.lastIndexOf('.'));
        const foundKey = Object.keys(sfxMap).find(k => k.startsWith(baseName));
        if (foundKey) {
            url = sfxMap[foundKey];
        }
    }

    if (!url) {
        return;
    }

    try {
        const audio = new Audio(url);
        audio.volume = sfxVolume; // Use dynamic volume state
        
        activeAudioRef.current.push(audio);
        
        // Remove from tracking when ended
        audio.onended = () => {
          activeAudioRef.current = activeAudioRef.current.filter(a => a !== audio);
        };

        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                // Autoplay policy or other error - silently fail
                console.warn("SFX playback failed (autoplay policy?)", error);
                activeAudioRef.current = activeAudioRef.current.filter(a => a !== audio);
            });
        }
    } catch (e) {
        console.warn("Error playing SFX", e);
    }
  }, [sfxMap, sfxVolume]);

  return {
    sfxMap,
    isLoaded,
    handleZipUpload,
    playSFX,
    stopAllSFX,
    sfxVolume,
    setSfxVolume
  };
};
