
import { useState, useEffect, useRef, useMemo } from 'react';
import { BgTransitionType, AudioTrack } from '../types';

interface UseMediaTransitionProps {
  bgMedia: { type: 'image' | 'video', url: string, hotspots?: any[] } | null;
  videoStream?: MediaStream | null;
  streamMode?: 'bg' | 'window';
  useAlbumArtAsBackground?: boolean;
  currentTrack?: AudioTrack;
}

export const useMediaTransition = ({ 
  bgMedia, 
  videoStream, 
  streamMode, 
  useAlbumArtAsBackground, 
  currentTrack 
}: UseMediaTransitionProps) => {
  
  // Calculate Effective Media
  const effectiveMedia = useMemo(() => {
      if (useAlbumArtAsBackground && currentTrack?.artworkUrl) {
          return { type: 'image' as const, url: currentTrack.artworkUrl, hotspots: [] };
      }
      return bgMedia;
  }, [useAlbumArtAsBackground, currentTrack, bgMedia]);

  const [baseMedia, setBaseMedia] = useState(effectiveMedia);
  const [overlayMedia, setOverlayMedia] = useState<typeof effectiveMedia | null>(null);
  const [isCrossfading, setIsCrossfading] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState<'idle' | 'out' | 'in'>('idle');
  const [bgTransition, setBgTransition] = useState<BgTransitionType>('glitch');
  
  const leaksCleanupRef = useRef<number | null>(null);

  // Sync transition type from storage
  useEffect(() => {
      const load = () => {
          const stored = localStorage.getItem('neon_bg_transition');
          if (stored) {
              try { 
                  setBgTransition(JSON.parse(stored)); 
              } catch (e) {
                  console.warn("Failed to parse transition type", e);
              }
          }
      };
      load();
      window.addEventListener('storage', load);
      return () => window.removeEventListener('storage', load);
  }, [effectiveMedia]); 

  // Main Transition Logic
  useEffect(() => {
    if (videoStream && streamMode === 'bg') {
        setBaseMedia(effectiveMedia);
        setOverlayMedia(null);
        setIsCrossfading(false);
        return;
    }

    const currentTarget = overlayMedia || baseMedia;
    
    // URL Check
    if (effectiveMedia?.url === currentTarget?.url) {
        // CRITICAL FIX: If URL is same but hotspots changed, update baseMedia immediately (no transition needed)
        // This ensures interactive spots appear/move without glitching the background
        const currentHotspots = JSON.stringify(currentTarget?.hotspots || []);
        const newHotspots = JSON.stringify(effectiveMedia?.hotspots || []);
        
        if (currentHotspots !== newHotspots) {
            setBaseMedia(effectiveMedia);
        }
        return;
    }

    // Get fresh transition type
    const stored = localStorage.getItem('neon_bg_transition');
    const currentTransitionType = stored ? JSON.parse(stored) as BgTransitionType : 'glitch';
    setBgTransition(currentTransitionType);

    if (currentTransitionType === 'leaks') {
        // --- LEAKS TRANSITION ---
        if (leaksCleanupRef.current) {
            clearTimeout(leaksCleanupRef.current);
            leaksCleanupRef.current = null;
        }

        setOverlayMedia(effectiveMedia);
        
        requestAnimationFrame(() => {
             requestAnimationFrame(() => {
                 setIsCrossfading(true);
             });
        });

        // Reduced from 2000ms to 1200ms to match physics speed
        const timeout = setTimeout(() => {
            setBaseMedia(effectiveMedia);
            
            // Immediately trigger exit phase after swap
            leaksCleanupRef.current = window.setTimeout(() => {
                setOverlayMedia(null);
                setIsCrossfading(false);
                leaksCleanupRef.current = null;
            }, 50); 

        }, 1200); 

        return () => {
            clearTimeout(timeout);
            if (leaksCleanupRef.current) clearTimeout(leaksCleanupRef.current);
        };

    } else if (currentTransitionType === 'none') {
        // --- NO TRANSITION ---
        setBaseMedia(effectiveMedia);
        setOverlayMedia(null);
        setIsCrossfading(false);
    } else {
        // --- GLITCH TRANSITION ---
        setOverlayMedia(effectiveMedia); 
        setTransitionPhase('out'); 
        
        requestAnimationFrame(() => {
             requestAnimationFrame(() => {
                 setIsCrossfading(true);
             });
        });

        const PHASE_DURATION = 1200; // Equal time for In and Out phases

        const t1 = setTimeout(() => {
            setBaseMedia(effectiveMedia); 
            setTransitionPhase('in'); 
        }, PHASE_DURATION); 

        const t2 = setTimeout(() => {
            setOverlayMedia(null);
            setIsCrossfading(false);
            setTransitionPhase('idle');
        }, PHASE_DURATION * 2); // 2400ms total

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }
  }, [effectiveMedia, videoStream, streamMode]);

  return {
    baseMedia,
    overlayMedia,
    isCrossfading,
    transitionPhase,
    bgTransition,
    activeStream: (videoStream && streamMode === 'bg') ? videoStream : null
  };
};
