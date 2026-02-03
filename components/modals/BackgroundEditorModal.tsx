
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw, ChevronLeft, ChevronRight, Crop, CheckCheck, Move, MousePointerClick, Trash2, Check } from 'lucide-react';
import { BackgroundMedia, BgHotspot, HotspotType } from '../../types';
import { useNotification } from '../../contexts/NotificationContext';

interface BackgroundEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: BackgroundMedia[];
  onUpdateBg: (id: string, newFile: File) => Promise<void>;
  onUpdateMetadata?: (id: string, hotspots: BgHotspot[]) => Promise<void>;
}

type AspectRatio = 'original' | '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
type FillMode = 'contain' | 'cover' | 'blur-fill';
type EditorMode = 'crop' | 'interactive';

const RATIOS: Record<AspectRatio, number> = {
    'original': 0,
    '1:1': 1,
    '16:9': 16/9,
    '9:16': 9/16,
    '4:3': 4/3,
    '3:4': 3/4
};

const HOTSPOT_TYPES: { type: HotspotType, label: string, color: string }[] = [
    { type: 'error', label: 'ERROR', color: '#ff3333' },
    { type: 'decrypt', label: 'DECRYPT', color: '#00ff00' },
    { type: 'target', label: 'TARGET', color: '#ff8c00' },
    { type: 'scan', label: 'SCAN', color: '#f9f871' },
    { type: 'secure', label: 'SECURE', color: '#00f3ff' },
    { type: 'link', label: 'LINK', color: '#bc13fe' }
];

const BackgroundEditorModal: React.FC<BackgroundEditorModalProps> = ({ isOpen, onClose, images, onUpdateBg, onUpdateMetadata }) => {
  const { addNotification } = useNotification();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<EditorMode>('crop');
  
  // Visual States
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('original');
  const [fillMode, setFillMode] = useState<FillMode>('contain');
  
  // Data States
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  
  // Cache Ref - Use Ref for immediate synchronous updates avoiding effect race conditions
  const hotspotsCacheRef = useRef<Record<string, BgHotspot[]>>({});
  // Force update to re-render UI when ref changes
  const [, setForceUpdate] = useState(0);
  
  const [edits, setEdits] = useState<Record<string, { ratio: AspectRatio, mode: FillMode }>>({});
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const imageBoundsRef = useRef({ x: 0, y: 0, w: 0, h: 0 }); 
  const [isProcessing, setIsProcessing] = useState(false);

  // Window State
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 900, h: 600 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const currentImage = images[currentIndex];

  // Init on Open
  useEffect(() => {
      if (isOpen) {
          setCurrentIndex(0);
          setEdits({});
          // Deep clone initial hotspots to cache
          const initialCache: Record<string, BgHotspot[]> = {};
          images.forEach(img => {
              initialCache[img.id] = img.hotspots ? JSON.parse(JSON.stringify(img.hotspots)) : [];
          });
          hotspotsCacheRef.current = initialCache;
          
          setMode('crop');
          // Center window
          const w = Math.min(window.innerWidth - 40, 1152); 
          const h = Math.min(window.innerHeight - 40, 800); 
          setSize({ w, h });
          setPosition({ 
              x: (window.innerWidth - w) / 2, 
              y: (window.innerHeight - h) / 2 
          });
      }
  }, [isOpen]); 

  // Sync Visual State on Navigate
  useEffect(() => {
      if (currentImage) {
          const savedEdit = edits[currentImage.id];
          if (savedEdit) {
              setAspectRatio(savedEdit.ratio);
              setFillMode(savedEdit.mode);
          } else {
              setAspectRatio('original');
              setFillMode('contain');
          }
          setSelectedHotspotId(null);
      }
  }, [currentIndex, currentImage]);

  // Helper to get current hotspots
  const getCurrentHotspots = () => {
      if (!currentImage) return [];
      return hotspotsCacheRef.current[currentImage.id] || [];
  };

  // Helper to update hotspots synchronously
  const updateHotspots = (newHotspots: BgHotspot[]) => {
      if (!currentImage) return;
      hotspotsCacheRef.current[currentImage.id] = newHotspots;
      setForceUpdate(prev => prev + 1); // Trigger render
  };

  // --- RENDER LOOP ---
  useEffect(() => {
      if (!currentImage || !canvasRef.current) return;

      const img = new Image();
      img.src = currentImage.url;
      img.crossOrigin = "anonymous";
      
      img.onload = () => {
          imgRef.current = img;
          drawCanvas();
      };
  }, [currentImage, aspectRatio, fillMode, isOpen, hotspotsCacheRef.current, mode, currentIndex, selectedHotspotId]); // Depend on ref.current implicitly via forceUpdate

  const drawCanvas = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const img = imgRef.current;
      if (!canvas || !ctx || !img) return;

      let targetW = img.naturalWidth;
      let targetH = img.naturalHeight;

      if (aspectRatio !== 'original' && mode === 'crop') {
          const ratio = RATIOS[aspectRatio];
          const maxDim = Math.max(img.naturalWidth, img.naturalHeight);
          
          if (ratio >= 1) {
              targetW = maxDim;
              targetH = maxDim / ratio;
          } else {
              targetH = maxDim;
              targetW = maxDim * ratio;
          }
      }

      canvas.width = targetW;
      canvas.height = targetH;

      ctx.clearRect(0, 0, targetW, targetH);

      // --- DRAW IMAGE ---
      let bounds = { x: 0, y: 0, w: targetW, h: targetH };

      if (mode === 'crop') {
          if (fillMode === 'blur-fill') {
              ctx.save();
              ctx.filter = 'blur(40px) brightness(0.6)';
              ctx.drawImage(img, -20, -20, targetW + 40, targetH + 40);
              ctx.restore();
              bounds = drawContain(ctx, img, targetW, targetH, true);
          } else if (fillMode === 'cover') {
              drawCover(ctx, img, targetW, targetH);
              bounds = { x: 0, y: 0, w: targetW, h: targetH };
          } else {
              bounds = drawContain(ctx, img, targetW, targetH, false);
          }
      } else {
          // Interactive mode: Just display contained
          bounds = drawContain(ctx, img, targetW, targetH, false);
      }
      
      imageBoundsRef.current = bounds;

      // --- DRAW HOTSPOTS ---
      const activeHotspots = getCurrentHotspots();
      
      activeHotspots.forEach(h => {
          const x = bounds.x + (h.x / 100) * bounds.w;
          const y = bounds.y + (h.y / 100) * bounds.h;
          
          const isSelected = h.id === selectedHotspotId;
          const color = HOTSPOT_TYPES.find(t => t.type === h.type)?.color || '#fff';

          const scaleFactor = Math.max(1, Math.min(bounds.w, bounds.h) / 800); 
          const radius = 15 * scaleFactor;

          // Outer Ring
          ctx.strokeStyle = color;
          ctx.lineWidth = 3 * scaleFactor;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.stroke();
          
          // Inner Dot
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, radius * 0.3, 0, Math.PI * 2);
          ctx.fill();
          
          if (isSelected) {
              ctx.fillStyle = color;
              ctx.globalAlpha = 0.3;
              ctx.fill(); // Fill outer ring
              ctx.globalAlpha = 1.0;
              
              // Selection Indicator
              ctx.beginPath();
              ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
              ctx.setLineDash([5, 5]);
              ctx.stroke();
              ctx.setLineDash([]);
          }

          // Label
          const fontSize = Math.max(12, 20 * scaleFactor);
          ctx.font = `bold ${fontSize}px monospace`;
          ctx.fillStyle = color;
          ctx.fillText(h.type.toUpperCase(), x + (radius * 1.8), y + (radius * 0.5));
      });
  };

  const drawContain = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number, withShadow: boolean) => {
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const canvasRatio = w / h;
      
      let drawW, drawH, x, y;

      if (imgRatio > canvasRatio) {
          drawW = w;
          drawH = w / imgRatio;
          x = 0;
          y = (h - drawH) / 2;
      } else {
          drawH = h;
          drawW = h * imgRatio;
          y = 0;
          x = (w - drawW) / 2;
      }

      if (withShadow) {
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 20;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 10;
      }

      ctx.drawImage(img, x, y, drawW, drawH);
      ctx.shadowBlur = 0;
      
      return { x, y, w: drawW, h: drawH };
  };

  const drawCover = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) => {
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const canvasRatio = w / h;
      
      let drawW, drawH, x, y;

      if (imgRatio > canvasRatio) {
          drawH = h;
          drawW = h * imgRatio;
          y = 0;
          x = (w - drawW) / 2; 
      } else {
          drawW = w;
          drawH = w / imgRatio;
          x = 0;
          y = (h - drawH) / 2; 
      }

      ctx.drawImage(img, x, y, drawW, drawH);
  };

  const updateEditState = (newRatio: AspectRatio, newMode: FillMode) => {
      setAspectRatio(newRatio);
      setFillMode(newMode);
      if (currentImage) {
          setEdits(prev => ({
              ...prev,
              [currentImage.id]: { ratio: newRatio, mode: newMode }
          }));
      }
  };

  // --- INTERACTIVE MODE LOGIC ---
  
  const handleCanvasClick = (e: React.MouseEvent) => {
      if (mode !== 'interactive' || !canvasRef.current) return;
      
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const bounds = imageBoundsRef.current;

      const scaleX = canvasRef.current.width / canvasRect.width;
      const scaleY = canvasRef.current.height / canvasRect.height;

      const clickX = (e.clientX - canvasRect.left) * scaleX;
      const clickY = (e.clientY - canvasRect.top) * scaleY;
      
      // Outside check
      if (
          clickX < bounds.x || 
          clickX > bounds.x + bounds.w || 
          clickY < bounds.y || 
          clickY > bounds.y + bounds.h
      ) {
          setSelectedHotspotId(null);
          return;
      }

      // Calculate % relative to IMAGE BOUNDS
      const xPercent = ((clickX - bounds.x) / bounds.w) * 100;
      const yPercent = ((clickY - bounds.y) / bounds.h) * 100;

      // Hit test existing
      const activeHotspots = getCurrentHotspots();
      const hitRadius = Math.max(1, Math.min(bounds.w, bounds.h) / 800) * 40; 

      const clickedHotspot = activeHotspots.find(h => {
          const hx = bounds.x + (h.x / 100) * bounds.w;
          const hy = bounds.y + (h.y / 100) * bounds.h;
          const dist = Math.sqrt(Math.pow(clickX - hx, 2) + Math.pow(clickY - hy, 2));
          return dist < hitRadius;
      });

      if (clickedHotspot) {
          setSelectedHotspotId(clickedHotspot.id);
      } else {
          // ADD NEW POINT
          const newHotspot: BgHotspot = {
              id: crypto.randomUUID(),
              x: xPercent,
              y: yPercent,
              type: 'error' // Default type
          };
          updateHotspots([...activeHotspots, newHotspot]);
          setSelectedHotspotId(newHotspot.id);
      }
  };

  const updateHotspotType = (type: HotspotType) => {
      if (!selectedHotspotId) return;
      const activeHotspots = getCurrentHotspots();
      const updated = activeHotspots.map(h => h.id === selectedHotspotId ? { ...h, type } : h);
      updateHotspots(updated);
  };

  const deleteHotspot = () => {
      if (!selectedHotspotId) return;
      const activeHotspots = getCurrentHotspots();
      const updated = activeHotspots.filter(h => h.id !== selectedHotspotId);
      updateHotspots(updated);
      setSelectedHotspotId(null);
  };

  const handleApplyHotspot = () => {
      setSelectedHotspotId(null);
      addNotification("HOTSPOT SAVED", "success");
  };

  // --- ACTIONS ---

  const handleReset = () => {
      updateEditState('original', 'contain');
      // Reset hotspots from original props, not clearing them
      if (currentImage) {
          updateHotspots(currentImage.hotspots ? [...currentImage.hotspots] : []);
      }
  };

  const processAndSave = async (imgEntry: BackgroundMedia, settings: { ratio: AspectRatio, mode: FillMode } | undefined) => {
      return new Promise<void>((resolve) => {
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          const tempImg = new Image();
          tempImg.src = imgEntry.url;
          tempImg.crossOrigin = "anonymous";
          
          tempImg.onload = async () => {
              const mode = settings?.mode || 'contain';
              const ratio = settings?.ratio || 'original';
              
              let targetW = tempImg.naturalWidth;
              let targetH = tempImg.naturalHeight;

              if (ratio !== 'original') {
                  const r = RATIOS[ratio];
                  const maxDim = Math.max(tempImg.naturalWidth, tempImg.naturalHeight);
                  if (r >= 1) { targetW = maxDim; targetH = maxDim / r; } 
                  else { targetH = maxDim; targetW = maxDim * r; }
              }

              tempCanvas.width = targetW;
              tempCanvas.height = targetH;

              if (tempCtx) {
                  if (mode === 'blur-fill') {
                      tempCtx.filter = 'blur(40px) brightness(0.6)';
                      tempCtx.drawImage(tempImg, -20, -20, targetW + 40, targetH + 40);
                      tempCtx.filter = 'none';
                      
                      const imgR = tempImg.naturalWidth / tempImg.naturalHeight;
                      const canR = targetW / targetH;
                      let dw, dh, dx, dy;
                      if (imgR > canR) { dw=targetW; dh=targetW/imgR; dx=0; dy=(targetH-dh)/2; }
                      else { dh=targetH; dw=targetH*imgR; dy=0; dx=(targetW-dw)/2; }
                      
                      tempCtx.shadowColor = 'rgba(0,0,0,0.5)';
                      tempCtx.shadowBlur = 20;
                      tempCtx.shadowOffsetY = 10;
                      tempCtx.drawImage(tempImg, dx, dy, dw, dh);
                  } else if (mode === 'cover') {
                      const imgR = tempImg.naturalWidth / tempImg.naturalHeight;
                      const canR = targetW / targetH;
                      let dw, dh, dx, dy;
                      if (imgR > canR) { dh=targetH; dw=targetH*imgR; dy=0; dx=(targetW-dw)/2; }
                      else { dw=targetW; dh=targetW/imgR; dx=0; dy=(targetH-dh)/2; }
                      tempCtx.drawImage(tempImg, dx, dy, dw, dh);
                  } else {
                      const imgR = tempImg.naturalWidth / tempImg.naturalHeight;
                      const canR = targetW / targetH;
                      let dw, dh, dx, dy;
                      if (imgR > canR) { dw=targetW; dh=targetW/imgR; dx=0; dy=(targetH-dh)/2; }
                      else { dh=targetH; dw=targetH*imgR; dy=0; dx=(targetW-dw)/2; }
                      tempCtx.drawImage(tempImg, dx, dy, dw, dh);
                  }
              }

              tempCanvas.toBlob(async (blob) => {
                  if (blob) {
                      const newFile = new File([blob], imgEntry.file.name, { type: 'image/png' });
                      await onUpdateBg(imgEntry.id, newFile);
                  }
                  resolve();
              }, 'image/png', 0.95);
          };
      });
  };

  const handleApply = async () => {
      setIsProcessing(true);
      
      // 1. Process Visual Edits
      const editKeys = Object.keys(edits);
      for (const id of editKeys) {
          const img = images.find(i => i.id === id);
          if (img) {
              await processAndSave(img, edits[id]);
          }
      }
      
      // Check current if unsaved changes
      if ((aspectRatio !== 'original' || fillMode !== 'contain') && currentImage && !edits[currentImage.id]) {
           await processAndSave(currentImage, { ratio: aspectRatio, mode: fillMode });
      }

      // 2. Save Metadata (Hotspots) from Cache
      if (onUpdateMetadata) {
          const cacheKeys = Object.keys(hotspotsCacheRef.current);
          for (const id of cacheKeys) {
              const points = hotspotsCacheRef.current[id];
              // Find the original image to compare if changed, or just save all
              await onUpdateMetadata(id, points);
          }
      }

      setIsProcessing(false);
      onClose();
  };

  const handleNav = (dir: -1 | 1) => {
      const next = Math.max(0, Math.min(images.length - 1, currentIndex + dir));
      setCurrentIndex(next);
  };

  // Dragging
  const handleHeaderDown = (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
  };

  const handleDragMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      setPosition({
          x: e.clientX - dragStart.current.x,
          y: e.clientY - dragStart.current.y
      });
  };

  const handleDragEnd = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
  };

  useEffect(() => {
      return () => {
          document.removeEventListener('mousemove', handleDragMove);
          document.removeEventListener('mouseup', handleDragEnd);
      };
  }, []);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] pointer-events-none">
        <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-200" 
            onClick={onClose}
        ></div>

        <div 
            className="absolute bg-theme-panel border border-theme-border shadow-2xl rounded-xl flex flex-col overflow-hidden pointer-events-auto animate-in zoom-in-95 duration-200"
            style={{
                left: position.x,
                top: position.y,
                width: size.w,
                height: size.h
            }}
        >
            {/* Header */}
            <div 
                className="h-16 border-b border-theme-border bg-black/40 flex items-center justify-between px-4 shrink-0 cursor-move select-none"
                onMouseDown={handleHeaderDown}
            >
                <div className="flex items-center gap-4">
                    <span className="text-theme-primary font-mono font-bold tracking-widest flex items-center gap-2">
                        <Crop size={18} /> EDITOR <Move size={12} className="opacity-50" />
                    </span>
                    <div className="h-6 w-px bg-theme-border"></div>
                    <div className="flex bg-black/50 p-1 rounded border border-theme-border" onMouseDown={e => e.stopPropagation()}>
                        <button 
                            onClick={() => setMode('crop')}
                            className={`px-3 py-1 text-[10px] font-mono rounded flex items-center gap-2 transition-colors ${mode === 'crop' ? 'bg-theme-primary text-black font-bold' : 'text-theme-muted hover:text-white'}`}
                        >
                            <Crop size={12} /> CROP
                        </button>
                        <button 
                            onClick={() => setMode('interactive')}
                            className={`px-3 py-1 text-[10px] font-mono rounded flex items-center gap-2 transition-colors ${mode === 'interactive' ? 'bg-theme-primary text-black font-bold' : 'text-theme-muted hover:text-white'}`}
                        >
                            <MousePointerClick size={12} /> HOTSPOTS
                        </button>
                    </div>
                    {mode === 'crop' && (
                        <div className="flex gap-1 bg-black/50 p-1 rounded border border-theme-border" onMouseDown={e => e.stopPropagation()}>
                            {(Object.keys(RATIOS) as AspectRatio[]).map(r => (
                                <button
                                    key={r}
                                    onClick={() => updateEditState(r, fillMode)}
                                    className={`px-2 py-1 text-[10px] font-mono rounded transition-colors ${aspectRatio === r ? 'bg-theme-primary text-black' : 'text-theme-muted hover:text-white'}`}
                                >
                                    {r.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2" onMouseDown={e => e.stopPropagation()}>
                    <button onClick={handleReset} className="p-2 text-theme-muted hover:text-white"><RotateCcw size={16} /></button>
                    <button onClick={onClose} className="p-2 text-theme-muted hover:text-red-500"><X size={20} /></button>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 flex overflow-hidden">
                <div className="w-48 border-r border-theme-border bg-black/20 flex flex-col">
                    <div className="p-2 text-[10px] font-mono text-theme-muted uppercase border-b border-theme-border/50">IMAGES ({images.length})</div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                        {images.map((img, idx) => {
                            const hasPoints = (hotspotsCacheRef.current[img.id] && hotspotsCacheRef.current[img.id].length > 0) || (img.hotspots && img.hotspots.length > 0);
                            return (
                            <div 
                                key={img.id}
                                onClick={() => setCurrentIndex(idx)}
                                className={`flex items-center gap-2 p-1.5 rounded cursor-pointer border transition-all ${currentIndex === idx ? 'bg-theme-primary/10 border-theme-primary text-theme-text' : 'bg-transparent border-transparent text-theme-muted hover:bg-white/5'}`}
                            >
                                <div className="w-8 h-8 rounded bg-black overflow-hidden shrink-0"><img src={img.url} className="w-full h-full object-cover" /></div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] truncate font-mono">{img.file.name}</div>
                                    {(edits[img.id] || hasPoints) && <div className="text-[8px] text-theme-accent">* Modified</div>}
                                </div>
                            </div>
                        )})}
                    </div>
                </div>

                <div className="flex-1 bg-[#111] relative flex items-center justify-center p-8 overflow-hidden">
                    <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(45deg, #222 25%, transparent 25%), linear-gradient(-45deg, #222 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222 75%), linear-gradient(-45deg, transparent 75%, #222 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px' }}></div>
                    <div className={`relative z-10 shadow-2xl ${mode === 'interactive' ? 'cursor-crosshair' : ''}`}>
                        <canvas ref={canvasRef} onClick={handleCanvasClick} className="max-w-full max-h-[60vh] object-contain border border-theme-border/30 bg-transparent" />
                    </div>

                    {mode === 'interactive' && selectedHotspotId && (
                        <div className="absolute top-4 right-4 bg-black/80 border border-theme-primary p-3 rounded z-50 w-48 animate-in fade-in slide-in-from-right-4">
                            <div className="text-[10px] font-mono text-theme-muted uppercase mb-2">HOTSPOT TYPE</div>
                            <div className="space-y-1">
                                {HOTSPOT_TYPES.map(t => (
                                    <button
                                        key={t.type}
                                        onClick={() => updateHotspotType(t.type)}
                                        className={`w-full text-left px-2 py-1.5 text-xs font-mono rounded flex items-center gap-2 border ${getCurrentHotspots().find(h => h.id === selectedHotspotId)?.type === t.type ? 'bg-theme-primary/20 border-theme-primary text-white' : 'border-transparent text-gray-400 hover:bg-white/5'}`}
                                    >
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }}></div>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                            <div className="h-px bg-gray-700 my-2"></div>
                            <button onClick={handleApplyHotspot} className="w-full text-left px-2 py-1.5 text-xs font-mono text-green-400 hover:bg-green-500/10 rounded flex items-center gap-2 mb-1"><Check size={12} /> APPLY</button>
                            <button onClick={deleteHotspot} className="w-full text-left px-2 py-1.5 text-xs font-mono text-red-500 hover:bg-red-500/10 rounded flex items-center gap-2"><Trash2 size={12} /> DELETE</button>
                        </div>
                    )}
                    
                    {isProcessing && (
                        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center flex-col gap-4">
                            <div className="w-8 h-8 border-2 border-theme-primary border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-theme-primary font-mono text-xs animate-pulse">SAVING...</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="h-16 border-t border-theme-border bg-theme-panel p-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <button onClick={() => handleNav(-1)} disabled={currentIndex === 0} className="p-2 border border-theme-border rounded text-theme-muted hover:text-white disabled:opacity-30"><ChevronLeft size={16} /></button>
                    <span className="font-mono text-xs text-theme-muted">{currentIndex + 1} / {images.length}</span>
                    <button onClick={() => handleNav(1)} disabled={currentIndex === images.length - 1} className="p-2 border border-theme-border rounded text-theme-muted hover:text-white disabled:opacity-30"><ChevronRight size={16} /></button>
                </div>
                <button onClick={handleApply} className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-black rounded hover:shadow-[0_0_15px_var(--color-primary)] transition-all font-mono text-xs font-bold">
                    <CheckCheck size={14} /> SAVE & CLOSE
                </button>
            </div>
        </div>
    </div>,
    document.body
  );
};

export default BackgroundEditorModal;
