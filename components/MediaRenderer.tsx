
import React, { useEffect, useRef } from 'react';
import { EffectsConfig } from '../types';

interface MediaRendererProps {
  type: 'image' | 'video' | 'color';
  url?: string;
  stream?: MediaStream | null; // NEW: Live Stream
  bgColor: string;
  effects: EffectsConfig;
}

const MediaRenderer: React.FC<MediaRendererProps> = ({ type, url, stream, bgColor, effects }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Ref for Image
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  // Ref for Single File Video (Native Loop)
  const fileVideoRef = useRef<HTMLVideoElement | null>(null);

  // Ref for Live Stream
  const streamVideoRef = useRef<HTMLVideoElement | null>(null);

  const animationRef = useRef<number>(0);
  const lastDrawTimeRef = useRef<number>(0);
  
  // --- 1. SETUP MEDIA SOURCES ---
  useEffect(() => {
    // CLEANUP PREVIOUS
    if (fileVideoRef.current) {
        fileVideoRef.current.pause();
        fileVideoRef.current.removeAttribute('src');
        fileVideoRef.current.load();
        fileVideoRef.current = null;
    }
    if (streamVideoRef.current) {
        streamVideoRef.current.pause();
        streamVideoRef.current.srcObject = null;
        streamVideoRef.current = null;
    }
    imageRef.current = null;

    if (stream) {
        // --- LIVE STREAM MODE ---
        const v = document.createElement('video');
        v.srcObject = stream;
        v.muted = true;
        v.playsInline = true;
        v.onloadedmetadata = () => {
            v.play().catch(e => console.warn("Stream play failed", e));
        };
        streamVideoRef.current = v;

    } else if (type === 'video' && url) {
      // --- FILE VIDEO MODE (NATIVE LOOP) ---
      const v = document.createElement('video');
      v.src = url;
      v.muted = true;
      v.loop = true; // Native seamless loop
      v.playsInline = true;
      v.autoplay = true;
      v.preload = 'auto'; // Important for buffer

      // Optimization: Force hardware acceleration hints if possible
      v.play().catch(e => console.warn("Video play failed", e));
      
      fileVideoRef.current = v;

    } else if (type === 'image' && url) {
      // --- IMAGE MODE ---
      const img = new Image();
      img.src = url;
      imageRef.current = img;
    }
    
    // Cleanup on unmount or prop change
    return () => {
      if (fileVideoRef.current) {
        fileVideoRef.current.pause();
        fileVideoRef.current.removeAttribute('src');
        fileVideoRef.current.load();
        fileVideoRef.current = null;
      }
      if (streamVideoRef.current) {
          streamVideoRef.current.pause();
          streamVideoRef.current.srcObject = null;
          streamVideoRef.current = null;
      }
    };
  }, [type, url, stream]);

  // --- 2. RENDER LOOP ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Enabled alpha to allow transparency when bgColor is 'transparent'
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const render = (timestamp: number) => {
      animationRef.current = requestAnimationFrame(render);

      const interval = 1000 / effects.fps;
      const elapsed = timestamp - lastDrawTimeRef.current;
      
      if (elapsed < interval) return;
      lastDrawTimeRef.current = timestamp - (elapsed % interval);

      // Resize
      if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }
      const w = canvas.width;
      const h = canvas.height;

      // Prepare Content
      const scaleEffect = Math.max(1, effects.pixelation);
      const drawW = Math.ceil(w / scaleEffect);
      const drawH = Math.ceil(h / scaleEffect);
      
      ctx.imageSmoothingEnabled = false;

      // --- LOGIC SPLIT: VIDEO VS IMAGE/COLOR ---
      
      let videoSource: HTMLVideoElement | null = null;
      if (stream && streamVideoRef.current) {
          videoSource = streamVideoRef.current;
      } else if (type === 'video' && fileVideoRef.current) {
          videoSource = fileVideoRef.current;
      }

      if (videoSource) {
          // --- VIDEO RENDERING (PERSISTENT FRAME) ---
          // Fix for Loop Blinking: We DO NOT clear the canvas for video.
          // If the video is looping and drops a frame, the previous frame remains on canvas, preventing the black flash.
          
          if (videoSource.readyState >= 2) {
              const srcW = videoSource.videoWidth;
              const srcH = videoSource.videoHeight;

              if (srcW && srcH) {
                  // "Cover" logic
                  const srcRatio = srcW / srcH;
                  const dstRatio = drawW / drawH;
                  
                  let renderX = 0, renderY = 0, renderW = drawW, renderH = drawH;

                  if (dstRatio > srcRatio) {
                      renderW = drawW;
                      renderH = drawW / srcRatio;
                      renderY = (drawH - renderH) / 2; 
                  } else {
                      renderH = drawH;
                      renderW = drawH * srcRatio;
                      renderX = (drawW - renderW) / 2;
                  }

                  // Keep-alive: Ensure it's playing if it paused itself unexpectedly (browser optimization)
                  if (videoSource.paused && !stream) videoSource.play().catch(() => {});

                  ctx.drawImage(videoSource, renderX, renderY, renderW, renderH);

                  if (scaleEffect > 1) {
                      ctx.drawImage(canvas, 0, 0, drawW, drawH, 0, 0, w, h);
                  }
              }
          }
          // If readyState < 2, we do NOTHING. This leaves the old frame visible.
      } else {
          // --- IMAGE / COLOR RENDERING ---
          // For static content, we clear and redraw to support transparency/bg color changes.
          
          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, w, h);

          if (type === 'image' && imageRef.current && imageRef.current.complete) {
              const img = imageRef.current;
              const srcW = img.naturalWidth;
              const srcH = img.naturalHeight;

              if (srcW && srcH) {
                  // "Cover" logic
                  const srcRatio = srcW / srcH;
                  const dstRatio = drawW / drawH;
                  
                  let renderX = 0, renderY = 0, renderW = drawW, renderH = drawH;

                  if (dstRatio > srcRatio) {
                      renderW = drawW;
                      renderH = drawW / srcRatio;
                      renderY = (drawH - renderH) / 2; 
                  } else {
                      renderH = drawH;
                      renderW = drawH * srcRatio;
                      renderX = (drawW - renderW) / 2;
                  }

                  ctx.drawImage(img, renderX, renderY, renderW, renderH);

                  if (scaleEffect > 1) {
                      ctx.drawImage(canvas, 0, 0, drawW, drawH, 0, 0, w, h);
                  }
              }
          }
      }
    };

    animationRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationRef.current);
  }, [type, url, stream, bgColor, effects]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover z-0" />;
};

export default MediaRenderer;
