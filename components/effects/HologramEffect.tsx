
import React, { useEffect, useState, useRef } from 'react';
import { EffectsConfig, HologramCategory, BgHotspot } from '../../types';
import { messagesEn, messagesRu } from '../../data/messages';
import { useLanguage } from '../../contexts/LanguageContext';
import { MessageSquare, Heart, ThumbsUp, Smile, DollarSign, Music, Zap, Star, Ghost, AlertTriangle, Lock, Search, Target, Link } from 'lucide-react';

interface HologramEffectProps {
  effects: EffectsConfig;
  bgMedia?: { type: 'image' | 'video', url: string, hotspots?: BgHotspot[] } | null;
}

type AnimationPhase = 'spawn' | 'expandX' | 'expandY' | 'typing' | 'waiting' | 'collapseY' | 'collapseX' | 'despawn';

interface ActiveHologram {
  id: string;
  type: 'text' | 'icon';
  x: number;
  y: number;
  text: string;
  iconNode?: React.ReactNode;
  phase: AnimationPhase;
  displayedText: string;
  opacity: number;
  
  // Animation dimensions
  currentWidth: number;
  currentHeight: number;
  targetHeight: number;
  
  // Timers
  timer: number;
}

const START_SIZE = 40; // Size of the initial cube
const TARGET_WIDTH = 280; // Full width of the window
const HEADER_HEIGHT = 40;

// NIRVANA MODE CONSTANTS (Very slow, smooth movement)
const EXPAND_SPEED_X = 6; 
const EXPAND_SPEED_Y = 4; 
const FADE_SPEED = 0.02;  

const ICON_TYPES = [
    <Heart size={120} strokeWidth={1} />,
    <ThumbsUp size={120} strokeWidth={1} />,
    <Smile size={120} strokeWidth={1} />,
    <DollarSign size={120} strokeWidth={1} />,
    <Music size={120} strokeWidth={1} />,
    <Zap size={120} strokeWidth={1} />,
    <Star size={120} strokeWidth={1} />,
    <Ghost size={120} strokeWidth={1} />, // Proxy for "poop" or fun stuff
];

const HologramEffect: React.FC<HologramEffectProps> = ({ effects, bgMedia }) => {
  const [renderMessage, setRenderMessage] = useState<ActiveHologram | null>(null);
  const messageRef = useRef<ActiveHologram | null>(null);
  const { language } = useLanguage();
  const config = effects.holograms;
  const lastSpawnTime = useRef(0);
  
  const estimateHeight = (text: string) => {
      // Conservative estimation to ensure text fits
      const charsPerLine = 25; // Adjusted for word wrap (was 30)
      const lines = Math.ceil(text.length / charsPerLine);
      const lineHeight = 24; // Adjusted for leading-relaxed (was 20)
      const padding = 50; // Extra buffer at bottom (was 32)
      const minHeight = 120; // Increased min height (was 80)
      
      const contentHeight = (lines * lineHeight) + padding;
      return Math.max(minHeight, HEADER_HEIGHT + contentHeight);
  };

  useEffect(() => {
    if (!config.enabled) {
      messageRef.current = null;
      setRenderMessage(null);
      return;
    }

    let animationId: number;

    const loop = (timestamp: number) => {
      if (!messageRef.current) {
        if (timestamp - lastSpawnTime.current > config.interval * 1000) {
          
          // Decision Logic: Text vs Icon
          const spawnIcon = config.enableIcons && Math.random() > 0.6; // 40% chance for icons if enabled
          
          if (spawnIcon) {
              const randomIcon = ICON_TYPES[Math.floor(Math.random() * ICON_TYPES.length)];
              const x = 20 + Math.random() * 60; // Center biased
              const y = 20 + Math.random() * 40;

              const newMsg: ActiveHologram = {
                id: crypto.randomUUID(),
                type: 'icon',
                x,
                y,
                text: '',
                iconNode: randomIcon,
                phase: 'spawn',
                displayedText: "",
                opacity: 0,
                currentWidth: 0,
                currentHeight: 0,
                targetHeight: 0,
                timer: 0
              };
              messageRef.current = newMsg;
              setRenderMessage(newMsg);
              lastSpawnTime.current = timestamp;

          } else {
              // Standard Text Hologram
              const allMessages = language === 'ru' ? messagesRu : messagesEn;
              const enabledCategories = Object.entries(config.categories)
                 .filter(([_, enabled]) => enabled)
                 .map(([cat]) => cat as HologramCategory);
              
              const availableMessages = allMessages.filter(msg => enabledCategories.includes(msg.category));
              
              if (availableMessages.length > 0) {
                  const randomMsg = availableMessages[Math.floor(Math.random() * availableMessages.length)];
                  const x = 5 + Math.random() * 55; 
                  const y = 10 + Math.random() * 60;
                  const targetH = estimateHeight(randomMsg.text);

                  const newMsg: ActiveHologram = {
                    id: crypto.randomUUID(),
                    type: 'text',
                    x,
                    y,
                    text: randomMsg.text,
                    phase: 'spawn',
                    displayedText: "",
                    opacity: 0,
                    currentWidth: START_SIZE,
                    currentHeight: START_SIZE,
                    targetHeight: targetH,
                    timer: 0
                  };
                  
                  messageRef.current = newMsg;
                  setRenderMessage(newMsg);
              }
              lastSpawnTime.current = timestamp;
          }
        }
      } else {
        const msg = messageRef.current;
        let shouldUpdateRender = false;
        
        // --- ANIMATION LOGIC ---
        // For Icons, we skip the expansion/typing phases
        if (msg.type === 'icon') {
            switch (msg.phase) {
                case 'spawn':
                    msg.opacity += FADE_SPEED * 0.8;
                    if (msg.opacity >= 1) {
                        msg.opacity = 1;
                        msg.phase = 'waiting';
                        msg.timer = timestamp;
                    }
                    shouldUpdateRender = true;
                    break;
                case 'waiting':
                    // Float logic handled in CSS/Render, just wait here
                    if (timestamp - msg.timer > 3000) { 
                        msg.phase = 'despawn';
                    }
                    break;
                case 'despawn':
                    msg.opacity -= FADE_SPEED * 0.8;
                    shouldUpdateRender = true;
                    if (msg.opacity <= 0) {
                        messageRef.current = null;
                        setRenderMessage(null);
                        lastSpawnTime.current = timestamp;
                        shouldUpdateRender = false;
                    }
                    break;
            }
        } else {
            // Text Logic
            switch (msg.phase) {
                case 'spawn':
                    msg.opacity += FADE_SPEED;
                    if (msg.opacity >= 1) {
                        msg.opacity = 1;
                        msg.phase = 'expandX';
                    }
                    shouldUpdateRender = true;
                    break;
                case 'expandX':
                    msg.currentWidth += EXPAND_SPEED_X;
                    if (msg.currentWidth >= TARGET_WIDTH) {
                        msg.currentWidth = TARGET_WIDTH;
                        msg.phase = 'expandY';
                    }
                    shouldUpdateRender = true;
                    break;
                case 'expandY':
                    msg.currentHeight += EXPAND_SPEED_Y;
                    if (msg.currentHeight >= msg.targetHeight) {
                        msg.currentHeight = msg.targetHeight;
                        msg.phase = 'typing';
                        msg.timer = timestamp;
                    }
                    shouldUpdateRender = true;
                    break;
                case 'typing':
                    const charDelay = 120 / (config.speed || 1);
                    if (timestamp - msg.timer > charDelay) {
                        if (msg.displayedText.length < msg.text.length) {
                            msg.displayedText = msg.text.substring(0, msg.displayedText.length + 1);
                            msg.timer = timestamp;
                            shouldUpdateRender = true;
                        } else {
                            msg.phase = 'waiting';
                            msg.timer = timestamp;
                        }
                    }
                    break;
                case 'waiting':
                    if (timestamp - msg.timer > 5000) { 
                        msg.phase = 'collapseY';
                    }
                    break;
                case 'collapseY':
                    msg.currentHeight -= EXPAND_SPEED_Y;
                    if (msg.currentHeight <= START_SIZE) {
                        msg.currentHeight = START_SIZE;
                        msg.phase = 'collapseX';
                    }
                    shouldUpdateRender = true;
                    break;
                case 'collapseX':
                    msg.currentWidth -= EXPAND_SPEED_X;
                    if (msg.currentWidth <= START_SIZE) {
                        msg.currentWidth = START_SIZE;
                        msg.phase = 'despawn';
                    }
                    shouldUpdateRender = true;
                    break;
                case 'despawn':
                    msg.opacity -= FADE_SPEED;
                    shouldUpdateRender = true;
                    if (msg.opacity <= 0) {
                        messageRef.current = null;
                        setRenderMessage(null);
                        lastSpawnTime.current = timestamp;
                        shouldUpdateRender = false;
                    }
                    break;
            }
        }

        if (shouldUpdateRender && messageRef.current) {
            setRenderMessage({ ...messageRef.current });
        }
      }
      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [config.enabled, config.interval, config.speed, config.categories, config.enableIcons, language]);

  const scale = config.scale || 1.0;
  // Determine Dynamic Color
  const baseColor = (!config.color || config.color === 'theme') ? 'var(--color-primary)' : config.color;

  return (
    <>
        {/* RANDOM AMBIENT HOLOGRAM */}
        {renderMessage && (
            <AmbientHologram 
                msg={renderMessage} 
                baseColor={baseColor} 
                scale={scale} 
                config={config} 
                showBody={renderMessage.currentHeight > HEADER_HEIGHT + 10}
            />
        )}

        {/* PERSISTENT INTERACTIVE HOTSPOTS */}
        {config.enabled && (config.showHotspots !== false) && bgMedia?.hotspots && bgMedia.hotspots.map((hotspot) => (
            <HotspotHologram 
                key={hotspot.id} 
                hotspot={hotspot} 
                scale={scale} 
            />
        ))}
    </>
  );
};

// Sub-component for Standard Ambient Hologram
const AmbientHologram: React.FC<{ msg: ActiveHologram, baseColor: string, scale: number, config: any, showBody: boolean }> = ({ msg, baseColor, scale, config, showBody }) => {
    // --- ICON RENDER ---
    if (msg.type === 'icon' && msg.iconNode) {
        return (
          <div 
              className="absolute z-30 pointer-events-none flex items-center justify-center animate-pulse"
              style={{
                  left: `${msg.x}%`,
                  top: `${msg.y}%`,
                  opacity: msg.opacity * 0.6, // Low opacity as requested
                  transform: `scale(${scale}) translateY(${msg.phase === 'waiting' ? '-20px' : '0px'})`, 
                  transition: 'transform 3s ease-in-out',
                  color: baseColor,
                  filter: `drop-shadow(0 0 10px ${baseColor})` // Tinted shadow
              }}
          >
              {msg.iconNode}
          </div>
        );
    }
  
    const showFullHeader = msg.currentWidth > 100;

    return (
      <div 
        className="absolute z-30 pointer-events-none"
        style={{
          left: `${msg.x}%`,
          top: `${msg.y}%`,
          opacity: msg.opacity * config.opacity,
          transform: `scale(${scale})`, 
          transformOrigin: 'top left',
        }}
      >
          {/* Hologram Box Container */}
          <div 
              className="relative overflow-hidden transition-none backdrop-blur-md"
              style={{
                  width: `${msg.currentWidth}px`,
                  height: `${msg.currentHeight}px`,
                  borderTopLeftRadius: '12px',
                  borderBottomRightRadius: '12px',
                  backgroundColor: `color-mix(in srgb, ${baseColor}, rgba(0,0,0,0.4) 85%)`,
                  border: `1px solid color-mix(in srgb, ${baseColor}, transparent 40%)`,
                  boxShadow: `0 0 20px color-mix(in srgb, ${baseColor}, transparent 80%)`
              }}
          >
              {/* Glass Sheen */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20 pointer-events-none z-0"></div>
  
              {/* Background Grid - Colored */}
              <div 
                  className="absolute inset-0 bg-[length:100%_4px] pointer-events-none z-0"
                  style={{
                      backgroundImage: `linear-gradient(color-mix(in srgb, ${baseColor}, transparent 85%) 1px, transparent 1px)`
                  }}
              ></div>
              
              {/* Decorative Corners - Colored */}
              <div className="absolute top-0 right-0 w-3 h-3 border-t border-r opacity-50 z-10" style={{ borderColor: baseColor }}></div>
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l opacity-50 z-10" style={{ borderColor: baseColor }}></div>
  
              {/* Header - Colored Background */}
              <div 
                  className="flex items-center gap-3 overflow-hidden whitespace-nowrap relative z-10"
                  style={{ 
                      height: `${HEADER_HEIGHT}px`, 
                      paddingLeft: '10px', 
                      paddingRight: '10px',
                      backgroundColor: `color-mix(in srgb, ${baseColor}, transparent 80%)`,
                      borderBottom: `1px solid color-mix(in srgb, ${baseColor}, transparent 60%)`
                  }}
              >
                  <div className="min-w-[20px] flex items-center justify-center">
                      <MessageSquare size={16} style={{ color: baseColor }} className={`${msg.phase === 'spawn' ? '' : 'animate-pulse'}`} />
                  </div>
                  
                  <span 
                      className={`font-mono text-[10px] font-bold tracking-widest uppercase transition-opacity duration-200 ${showFullHeader ? 'opacity-100' : 'opacity-0'}`}
                      style={{ color: baseColor }}
                  >
                      INCOMING TRANSMISSION
                  </span>
              </div>
  
              {/* Content Body */}
              {showBody && (
                  <div className="p-4 font-mono text-white text-sm leading-relaxed text-shadow-neon absolute top-[40px] left-0 right-0 bottom-0 z-10">
                      {msg.displayedText}
                      {msg.phase === 'typing' && (
                          <span 
                              className="animate-pulse inline-block w-2 h-4 ml-0.5 align-middle"
                              style={{ backgroundColor: baseColor }}
                          ></span>
                      )}
                  </div>
              )}
          </div>
      </div>
    );
};

// Sub-component for Fixed Hotspot Holograms
const HotspotHologram: React.FC<{ hotspot: BgHotspot, scale: number }> = ({ hotspot, scale }) => {
    // Styles mapping
    const types = {
        error: { color: '#ff3333', icon: AlertTriangle, text: "CRITICAL FAILURE", sub: "SYSTEM UNSTABLE" },
        decrypt: { color: '#00ff00', icon: Lock, text: "DECRYPTING...", sub: "ACCESSING CORE" },
        target: { color: '#ff8c00', icon: Target, text: "TARGET LOCKED", sub: `COORD: ${hotspot.x.toFixed(1)} / ${hotspot.y.toFixed(1)}` },
        scan: { color: '#f9f871', icon: Search, text: "SCANNING AREA", sub: "NO THREATS" },
        secure: { color: '#00f3ff', icon: Lock, text: "SECURE CHANNEL", sub: "VERIFIED" },
        link: { color: '#bc13fe', icon: Link, text: "DATA LINK", sub: "CONNECTED" }
    };

    const style = types[hotspot.type] || types.error;
    const Icon = style.icon;

    // Decrypt specific state
    const [progress, setProgress] = useState(0);
    const [matrixText, setMatrixText] = useState("");

    useEffect(() => {
        if (hotspot.type === 'decrypt') {
            const interval = setInterval(() => {
                setProgress(p => (p + 1) % 100);
                setMatrixText(Math.random().toString(36).substring(7));
            }, 50);
            return () => clearInterval(interval);
        }
    }, [hotspot.type]);

    return (
        <div 
            className="absolute z-20 pointer-events-none flex flex-col items-center animate-[scale-in-center_0.5s_ease-out]"
            style={{
                left: `${hotspot.x}%`,
                top: `${hotspot.y}%`,
                transform: `translate(-50%, -50%) scale(${scale})`,
                color: style.color
            }}
        >
            {/* Main Icon/Box */}
            <div 
                className="relative p-2 border-2 rounded-sm backdrop-blur-sm bg-black/40 shadow-[0_0_20px_currentColor]"
                style={{ borderColor: style.color }}
            >
                <Icon size={24} className={hotspot.type === 'error' ? 'animate-pulse' : ''} />
                
                {/* Target Rotator */}
                {hotspot.type === 'target' && (
                    <div className="absolute inset-[-10px] border border-dashed border-current rounded-full animate-spin-slow opacity-50"></div>
                )}
                
                {/* Scan Sweep */}
                {hotspot.type === 'scan' && (
                    <div className="absolute inset-[-20px] border border-current opacity-30 animate-pulse">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-current animate-[scan_2s_linear_infinite] opacity-50"></div>
                    </div>
                )}
            </div>

            {/* Label */}
            <div className="mt-2 flex flex-col items-center">
                <div className="bg-black/60 px-2 py-0.5 rounded border border-current text-[10px] font-mono font-bold tracking-widest whitespace-nowrap">
                    {style.text}
                </div>
                
                {/* Sub-text or Widgets */}
                <div className="text-[8px] font-mono opacity-80 mt-0.5 bg-black/40 px-1">
                    {hotspot.type === 'decrypt' ? (
                        <div className="flex flex-col items-center w-24">
                            <div className="flex justify-between w-full mb-0.5">
                                <span>{matrixText.slice(0, 4)}</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="h-1 w-full bg-gray-700">
                                <div className="h-full bg-current transition-all duration-75" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    ) : (
                        style.sub
                    )}
                </div>
            </div>

            {/* Line to point */}
            <div className="absolute top-1/2 left-1/2 w-px h-8 bg-current opacity-50 -translate-x-1/2 -translate-y-full -mt-6"></div>
        </div>
    );
};

export default HologramEffect;