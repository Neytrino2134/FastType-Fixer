
import React, { useEffect, useRef, useState } from 'react';
import { X, Command, Activity, Zap, Monitor } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface HologramHelpProps {
  onClose: () => void;
}

// Simple Typing Effect Component for simultaneous text generation
const TypingBlock: React.FC<{ text: React.ReactNode; delay?: number; active: boolean; className?: string }> = ({ text, delay = 0, active, className = "" }) => {
  return (
    <div 
      className={`relative overflow-hidden whitespace-nowrap ${className}`}
      style={{
        width: active ? '100%' : '0%',
        transition: `width 0.5s steps(30) ${delay}ms`,
        opacity: active ? 1 : 0
      }}
    >
      {text}
    </div>
  );
};

const HologramHelp: React.FC<HologramHelpProps> = ({ onClose }) => {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Animation Phases:
  // 0: Init (Dot)
  // 1: Width Expand (Line)
  // 2: Height Expand (Window)
  // 3: Content (Typing)
  const [phase, setPhase] = useState(0);
  const timeoutsRef = useRef<number[]>([]);
  const isClosingRef = useRef(false);

  const schedule = (fn: () => void, ms: number) => {
      const id = window.setTimeout(fn, ms);
      timeoutsRef.current.push(id);
  };

  useEffect(() => {
    // Start Opening Sequence
    schedule(() => setPhase(1), 50);  // Expand Width
    schedule(() => setPhase(2), 400); // Expand Height
    schedule(() => setPhase(3), 900); // Show Content

    return () => {
        timeoutsRef.current.forEach(window.clearTimeout);
    };
  }, []);

  const handleCloseSequence = () => {
      if (isClosingRef.current) return;
      isClosingRef.current = true;

      // Clear pending opening animations
      timeoutsRef.current.forEach(window.clearTimeout);
      timeoutsRef.current = [];

      // Reverse Sequence
      // 1. Fade out content
      setPhase(2); 
      
      // 2. Collapse Height (Window -> Line)
      schedule(() => setPhase(1), 300); 
      
      // 3. Collapse Width (Line -> Dot)
      schedule(() => setPhase(0), 800); 
      
      // 4. Unmount
      schedule(() => onClose(), 1300);  
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Use capture-like logic or simply stop propagation if possible, 
        // though React synthetic events vs native events can be tricky.
        // We check for Escape or H.
        if (e.key === 'Escape' || e.code === 'KeyH') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation(); // Try to stop parent from seeing it
            handleCloseSequence();
        }
    };

    // Use { capture: true } to intercept the event before the parent (RetroScreen) sees it
    // This allows us to run the animation instead of instant unmount.
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, []);

  const baseColor = colors.primary;
  const isRu = language === 'ru';
  
  const highlightStyle = { color: baseColor, fontWeight: '900', fontSize: '1.2em', textShadow: `0 0 5px ${baseColor}` };

  const renderLabel = (text: string, highlightChar: string) => {
    if (!highlightChar || isRu) return text;
    
    const index = text.toLowerCase().indexOf(highlightChar.toLowerCase());
    if (index === -1) return text;
    
    const before = text.slice(0, index);
    const char = text.slice(index, index + 1);
    const after = text.slice(index + 1);
    
    return (
        <>
            {before}
            <span style={highlightStyle}>{char}</span>
            {after}
        </>
    );
  };

  const sections = [
      {
          title: isRu ? "ОСНОВНОЕ" : "GENERAL",
          icon: Command,
          items: [
              { key: "Space", desc: isRu ? "Старт / Пауза" : "Play / Pause" },
              { key: "- / =", desc: isRu ? "Пред / След трек" : "Prev / Next Track" },
              { key: "PgUp / PgDn", desc: isRu ? "Смена темы" : "Change Theme" },
              { key: "' / \\", desc: isRu ? "Смена фона" : "Change Background" }
          ]
      },
      {
          title: isRu ? "СИСТЕМА" : "SYSTEM",
          icon: Monitor,
          items: [
              { key: "S", desc: isRu ? "Системная панель" : renderLabel("System Panel", "S") },
              { key: "Shift + S", desc: isRu ? "Стоп" : renderLabel("Stop", "S") },
              { key: "L", desc: isRu ? "Список треков (Вкл/Выкл)" : renderLabel("Playlist (Toggle)", "L") },
              { key: "Shift + L", desc: isRu ? "Блок. плейлиста" : renderLabel("Lock Playlist", "L") },
              { key: "P", desc: isRu ? "Плеер (Панель)" : renderLabel("Player Panel", "P") },
              { key: "F", desc: isRu ? "Кино-режим" : "Cinema Mode" },
              { key: "Shift + F", desc: isRu ? "Полный экран" : renderLabel("Fullscreen", "F") },
              { key: "1-7", desc: isRu ? "Навигация настроек" : "Settings Nav" },
          ]
      },
      {
          title: isRu ? "WAVEFORM" : "WAVEFORM",
          icon: Activity,
          items: [
              { 
                  key: "T / C / B", 
                  desc: isRu ? "Верх / Центр / Низ" : (
                      <>
                        <span style={highlightStyle}>T</span>op / <span style={highlightStyle}>C</span>enter / <span style={highlightStyle}>B</span>ottom
                      </>
                  )
              },
              { key: "N", desc: isRu ? "Нормализация" : renderLabel("Normalize", "N") },
              { key: "M", desc: isRu ? "Зеркало" : renderLabel("Mirror", "M") },
              { key: "R", desc: isRu ? "Игнор. Громкость" : renderLabel("Ignore Volume", "R") },
          ]
      },
      {
          title: isRu ? "ПАНЕЛИ" : "PANELS",
          icon: Zap,
          items: [
              { key: "Q", desc: isRu ? "Количество" : renderLabel("Quantity", "Q") },
              { key: "W", desc: isRu ? "Сила / Гравитация" : renderLabel("PoWer / Gravity", "W") },
              { key: "E", desc: isRu ? "Частоты" : renderLabel("FrEquency", "E") },
              { key: "Y", desc: isRu ? "Прозрачность" : renderLabel("OpacitY", "Y") },
          ]
      }
  ];

  const contentActive = phase >= 3;

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center p-4 bg-transparent pointer-events-none">
        <div 
            ref={containerRef}
            className="relative overflow-hidden pointer-events-auto flex flex-col transition-all ease-in-out duration-500 backdrop-blur-md"
            style={{
                width: phase >= 1 ? '100%' : '4px',
                maxWidth: '72rem', 
                height: phase >= 2 ? 'auto' : '4px',
                maxHeight: phase >= 2 ? '80vh' : '4px',
                backgroundColor: `color-mix(in srgb, ${baseColor}, rgba(5, 5, 10, 0.9) 92%)`, 
                border: `2px solid color-mix(in srgb, ${baseColor}, transparent 40%)`,
                boxShadow: `0 0 40px color-mix(in srgb, ${baseColor}, transparent 80%)`,
                borderRadius: phase >= 2 ? '16px' : '2px',
                opacity: phase === 0 ? 0 : 1
            }}
        >
            <div 
                className="absolute inset-0 bg-[length:40px_40px] pointer-events-none transition-opacity duration-500"
                style={{
                    opacity: contentActive ? 0.15 : 0,
                    backgroundImage: `linear-gradient(color-mix(in srgb, ${baseColor}, transparent 80%) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, ${baseColor}, transparent 80%) 1px, transparent 1px)`
                }}
            ></div>

            {/* Header */}
            <div 
                className="flex items-center justify-between p-4 border-b shrink-0 transition-opacity duration-300"
                style={{ 
                    borderColor: `color-mix(in srgb, ${baseColor}, transparent 60%)`,
                    backgroundColor: `color-mix(in srgb, ${baseColor}, transparent 90%)`,
                    opacity: contentActive ? 1 : 0
                }}
            >
                <div className="flex items-center gap-3">
                    <Command size={20} style={{ color: baseColor }} className="animate-pulse" />
                    <TypingBlock 
                        active={contentActive} 
                        text={isRu ? "КОМАНДНЫЙ ЦЕНТР" : "COMMAND CENTER"}
                        className="font-mono text-lg font-bold tracking-[0.2em] uppercase" 
                        delay={100}
                    />
                </div>
                <button 
                    onClick={handleCloseSequence}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                    style={{ color: baseColor }}
                >
                    <X size={24} />
                </button>
            </div>

            {/* Content Grid */}
            <div 
                className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto custom-scrollbar relative z-10 transition-opacity duration-300"
                style={{ opacity: contentActive ? 1 : 0 }}
            >
                {sections.map((section, idx) => {
                    return (
                        <div key={idx} className={`space-y-3`}>
                            <div className="flex items-center gap-2 mb-2 pb-1 border-b" style={{ borderColor: `color-mix(in srgb, ${baseColor}, transparent 80%)` }}>
                                <section.icon size={14} style={{ color: baseColor }} />
                                <TypingBlock 
                                    active={contentActive} 
                                    text={section.title}
                                    className="font-mono text-xs font-bold tracking-widest text-white/70 uppercase"
                                    delay={200 + (idx * 100)}
                                />
                            </div>
                            <div className={`grid gap-x-4 gap-y-2 grid-cols-[auto_1fr]`}>
                                {section.items.map((item, i) => (
                                    <React.Fragment key={i}>
                                        <div 
                                            className="font-mono text-xs font-bold text-right py-1 px-2 rounded min-w-[30px]"
                                            style={{ 
                                                backgroundColor: `color-mix(in srgb, ${baseColor}, transparent 85%)`,
                                                color: baseColor
                                            }}
                                        >
                                            <TypingBlock active={contentActive} text={item.key} delay={300 + (idx * 50) + (i * 20)} />
                                        </div>
                                        <div className="font-mono text-xs text-white/80 flex items-center">
                                            <TypingBlock active={contentActive} text={item.desc} delay={300 + (idx * 50) + (i * 20)} />
                                        </div>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div 
                className="p-3 text-center border-t relative z-10 transition-opacity duration-300" 
                style={{ 
                    borderColor: `color-mix(in srgb, ${baseColor}, transparent 80%)`,
                    opacity: contentActive ? 1 : 0
                }}
            >
                <span className="font-mono text-[10px] text-white/50 tracking-widest animate-pulse">
                    {isRu ? "НАЖМИТЕ 'H' ИЛИ ESC ЧТОБЫ ЗАКРЫТЬ" : "PRESS 'H' OR ESC TO CLOSE"}
                </span>
            </div>
        </div>
    </div>
  );
};

export default HologramHelp;
