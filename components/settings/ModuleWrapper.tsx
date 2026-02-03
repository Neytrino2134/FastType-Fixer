
import React, { useEffect, useState } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ModuleWrapperProps {
  id: string;
  label: React.ReactNode;
  icon: LucideIcon;
  isEnabled: boolean;
  isExpanded: boolean;
  isAlwaysOn?: boolean;
  onToggleExpand: (e: React.MouseEvent) => void;
  onToggleEnable: () => void;
  children: React.ReactNode;
}

const ModuleWrapper: React.FC<ModuleWrapperProps> = ({
  id,
  label,
  icon: Icon,
  isEnabled,
  isExpanded,
  isAlwaysOn,
  onToggleExpand,
  onToggleEnable,
  children
}) => {
  const [allowOverflow, setAllowOverflow] = useState(false);
  const { controlStyle, colors } = useTheme();

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (isExpanded && isEnabled) {
      timeout = setTimeout(() => setAllowOverflow(true), 300); 
    } else {
      setAllowOverflow(false);
    }
    return () => clearTimeout(timeout);
  }, [isExpanded, isEnabled]);

  const activeStyle = isEnabled 
     ? "border-theme-border bg-theme-panel hover:bg-white/5 hover:border-theme-primary hover:shadow-[0_0_15px_var(--color-primary)]" 
     : "border-theme-border bg-gray-900/50 opacity-90 hover:opacity-100 hover:border-theme-muted hover:bg-white/5 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"; 

  // Dynamic Radius
  let containerRadius = 'rounded-sm';
  let knobRadius = 'rounded-sm';
  let wrapperRadius = controlStyle === 'round' ? 'rounded-lg' : 'rounded';

  if (controlStyle === 'round') {
      containerRadius = 'rounded-lg';
      knobRadius = 'rounded-md';
  } else if (controlStyle === 'circle') {
      containerRadius = 'rounded-full';
      knobRadius = 'rounded-full';
  }

  // Generate Unique Background based on ID
  const renderBackground = () => {
      const color = isEnabled ? colors.primary : colors.muted;
      const opacity = isEnabled ? 0.15 : 0.05;
      
      const commonProps = {
          className: "absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300",
          style: { opacity, color: color }
      };

      // USE preserveAspectRatio="xMidYMid slice" to mimic background-size: cover
      // This prevents distortion/stretching when the panel expands vertically.

      switch(id) {
          // --- SYSTEM MODULES ---
          case 'files': // File Management
              return (
                  <svg {...commonProps} viewBox="0 0 300 80" preserveAspectRatio="xMidYMid slice">
                      <path d="M20 20 L80 20 L90 10 L150 10 L160 20 L280 20 L280 70 L20 70 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" opacity="0.6"/>
                      <rect x="40" y="35" width="20" height="20" fill="currentColor" opacity="0.4"/>
                      <rect x="80" y="35" width="20" height="20" fill="currentColor" opacity="0.4"/>
                      <rect x="120" y="35" width="20" height="20" fill="currentColor" opacity="0.4"/>
                  </svg>
              );
          case 'presets': // Config/Disk
              return (
                  <svg {...commonProps} viewBox="0 0 300 80" preserveAspectRatio="xMidYMid slice">
                      <path d="M50 10 L250 10 L250 70 L50 70 Z" fill="none" stroke="currentColor" strokeWidth="2" />
                      <rect x="80" y="10" width="140" height="25" fill="none" stroke="currentColor" strokeWidth="1" />
                      <rect x="90" y="15" width="10" height="15" fill="currentColor" opacity="0.5"/>
                      <circle cx="200" cy="55" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
              );
          case 'themes': // Palette
              return (
                  <svg {...commonProps} viewBox="0 0 300 80" preserveAspectRatio="xMidYMid slice">
                      <circle cx="100" cy="40" r="30" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.4"/>
                      <circle cx="140" cy="40" r="30" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.6"/>
                      <circle cx="180" cy="40" r="30" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.8"/>
                  </svg>
              );
          case 'bg': // Backgrounds (Mountains/Landscape)
              return (
                  <svg {...commonProps} viewBox="0 0 300 80" preserveAspectRatio="xMidYMid slice">
                      <path d="M0 70 L80 20 L160 70" fill="none" stroke="currentColor" strokeWidth="2" />
                      <path d="M120 70 L200 10 L280 70" fill="none" stroke="currentColor" strokeWidth="2" />
                      <circle cx="250" cy="25" r="12" stroke="currentColor" strokeWidth="1.5" fill="none" />
                      <line x1="0" y1="70" x2="300" y2="70" stroke="currentColor" strokeWidth="2" />
                  </svg>
              );
          case 'mixer': // Mixer (Faders)
              return (
                  <svg {...commonProps} viewBox="0 0 300 80" preserveAspectRatio="xMidYMid slice">
                      <line x1="60" y1="15" x2="60" y2="65" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
                      <rect x="50" y="45" width="20" height="10" fill="currentColor" />
                      
                      <line x1="150" y1="15" x2="150" y2="65" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
                      <rect x="140" y="25" width="20" height="10" fill="currentColor" />
                      
                      <line x1="240" y1="15" x2="240" y2="65" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
                      <rect x="230" y="50" width="20" height="10" fill="currentColor" />
                  </svg>
              );
          case 'ambience': // Cloud/Rain
              return (
                  <svg {...commonProps} viewBox="0 0 300 80" preserveAspectRatio="xMidYMid slice">
                      <path d="M100 40 Q110 20 140 25 Q160 10 190 30 Q210 20 220 40 Q230 50 210 60 L120 60 Q90 60 100 40" fill="none" stroke="currentColor" strokeWidth="2" />
                      <path d="M120 65 L115 75 M140 65 L135 75 M160 65 L155 75 M180 65 L175 75" stroke="currentColor" strokeWidth="2" opacity="0.5" />
                  </svg>
              );
          case 'rain': // Rain Effect
              return (
                  <svg {...commonProps} viewBox="0 0 300 80" preserveAspectRatio="xMidYMid slice">
                      <line x1="50" y1="10" x2="40" y2="30" stroke="currentColor" strokeWidth="1" opacity="0.6"/>
                      <line x1="80" y1="20" x2="70" y2="40" stroke="currentColor" strokeWidth="1" opacity="0.8"/>
                      <line x1="150" y1="5" x2="140" y2="35" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
                      <line x1="200" y1="30" x2="190" y2="50" stroke="currentColor" strokeWidth="1" opacity="0.7"/>
                      <line x1="250" y1="10" x2="240" y2="40" stroke="currentColor" strokeWidth="1" opacity="0.6"/>
                      <line x1="120" y1="40" x2="110" y2="60" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
                  </svg>
              );
          case 'debug': // Console/Code
              return (
                  <svg {...commonProps} viewBox="0 0 300 80" preserveAspectRatio="xMidYMid slice">
                      <text x="20" y="30" fontSize="20" fontFamily="monospace" fill="currentColor" opacity="0.6">{`>_`}</text>
                      <path d="M50 25 L150 25" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.4"/>
                      <path d="M20 45 L200 45" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.3"/>
                      <path d="M20 65 L120 65" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.2"/>
                      <rect x="250" y="20" width="30" height="40" fill="none" stroke="currentColor" strokeWidth="2"/>
                      <line x1="250" y1="40" x2="280" y2="40" stroke="currentColor" strokeWidth="1"/>
                  </svg>
              );
          case 'sysaudio': // Radio/Wave
              return (
                  <svg {...commonProps} viewBox="0 0 300 80" preserveAspectRatio="xMidYMid slice">
                      <path d="M20 40 Q 50 10 80 40 T 140 40 T 200 40 T 260 40" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.5" />
                      <circle cx="40" cy="40" r="5" fill="currentColor" />
                      <circle cx="100" cy="40" r="5" fill="currentColor" />
                      <circle cx="160" cy="40" r="5" fill="currentColor" />
                      <circle cx="220" cy="40" r="5" fill="currentColor" />
                  </svg>
              );

          // --- VISUAL MODULES ---
          case 'wave': // Waveform: Bars
              return (
                  <svg {...commonProps} viewBox="0 0 300 80" preserveAspectRatio="xMidYMid slice">
                      <path fill="currentColor" d="M10 60h10v20H10zM30 40h10v40H30zM50 50h10v30H50zM70 30h10v50H70zM90 55h10v25H90zM110 20h10v60H110zM130 45h10v35H130zM150 10h10v70H150zM170 35h10v45H170zM190 50h10v30H190zM210 25h10v55H210zM230 60h10v20H230zM250 40h10v40H250zM270 65h10v15H270z" />
                  </svg>
              );
          case 'reactor': // 3D: Hexagon/Wireframe
              return (
                  <svg {...commonProps} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
                      <path fill="none" stroke="currentColor" strokeWidth="2" d="M50 10 L85 30 L85 70 L50 90 L15 70 L15 30 Z" />
                      <circle cx="50" cy="50" r="15" fill="currentColor" opacity="0.5" />
                      <path fill="none" stroke="currentColor" strokeWidth="1" d="M50 10 L50 50 M85 30 L50 50 M85 70 L50 50 M50 90 L50 50 M15 70 L50 50 M15 30 L50 50" />
                  </svg>
              );
          case 'marquee': // Top Line: Scrolling Text or Dots
              return (
                  <svg {...commonProps} viewBox="0 0 300 80" preserveAspectRatio="xMidYMid slice">
                      <pattern id="pat-marquee" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                          <circle cx="2" cy="10" r="1.5" fill="currentColor" />
                          <circle cx="8" cy="10" r="1.5" fill="currentColor" />
                          <circle cx="14" cy="10" r="1.5" fill="currentColor" />
                      </pattern>
                      <rect width="100%" height="100%" fill="url(#pat-marquee)" />
                      <path stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" d="M0 70 L300 70 M0 10 L300 10" opacity="0.5"/>
                  </svg>
              );
          case 'dvd': // DVD: Bouncing path
              return (
                  <svg {...commonProps} viewBox="0 0 300 80" preserveAspectRatio="xMidYMid slice">
                      <path fill="none" stroke="currentColor" strokeWidth="2" d="M10 10 L100 70 L200 20 L280 60" strokeDasharray="10,5" />
                      <rect x="270" y="50" width="20" height="20" fill="currentColor" opacity="0.6" />
                  </svg>
              );
          case 'leaks': // Leaks: Circles
              return (
                  <svg {...commonProps} viewBox="0 0 300 80" preserveAspectRatio="xMidYMid slice">
                      <circle cx="50" cy="40" r="30" fill="currentColor" opacity="0.6" filter="blur(10px)" />
                      <circle cx="200" cy="10" r="40" fill="currentColor" opacity="0.4" filter="blur(15px)" />
                      <circle cx="280" cy="70" r="25" fill="currentColor" opacity="0.5" filter="blur(8px)" />
                  </svg>
              );
          case 'flicker': // Flicker: Simple Bulb
              return (
                  <svg {...commonProps} viewBox="0 0 300 80" preserveAspectRatio="xMidYMid slice">
                      <circle cx="150" cy="40" r="20" fill="none" stroke="currentColor" strokeWidth="2" />
                      <path d="M150 40 L160 30 M150 40 L140 30 M150 40 L150 25" stroke="currentColor" strokeWidth="1" />
                      <circle cx="150" cy="40" r="30" fill="currentColor" opacity="0.2" filter="blur(10px)" />
                  </svg>
              );
          case 'hologram': // Hologram: Chat
              return (
                  <svg {...commonProps} viewBox="0 0 300 80" preserveAspectRatio="xMidYMid slice">
                      <rect x="20" y="20" width="60" height="40" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
                      <path d="M30 35h40M30 45h30" stroke="currentColor" strokeWidth="2" />
                      <rect x="100" y="10" width="60" height="40" rx="5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6" />
                      <path d="M110 25h40M110 35h20" stroke="currentColor" strokeWidth="2" opacity="0.6" />
                  </svg>
              );
          case 'gemini': // Gemini: Stars/Brain
              return (
                  <svg {...commonProps} viewBox="0 0 300 80" preserveAspectRatio="xMidYMid slice">
                      <path fill="currentColor" d="M150 10 L155 35 L180 40 L155 45 L150 70 L145 45 L120 40 L145 35 Z" opacity="0.8" />
                      <circle cx="50" cy="40" r="2" fill="currentColor" />
                      <circle cx="250" cy="60" r="2" fill="currentColor" />
                      <circle cx="280" cy="20" r="3" fill="currentColor" />
                  </svg>
              );
          case 'scan': // Scanlines: Lines
              return (
                  <svg {...commonProps} viewBox="0 0 300 80" preserveAspectRatio="xMidYMid slice">
                      <pattern id="pat-scan" x="0" y="0" width="10" height="4" patternUnits="userSpaceOnUse">
                          <rect y="0" width="10" height="2" fill="currentColor" opacity="0.5" />
                      </pattern>
                      <rect width="100%" height="100%" fill="url(#pat-scan)" />
                  </svg>
              );
          case 'cyber': // Cyber: Binary
              return (
                  <div {...commonProps} style={{...commonProps.style, fontFamily: 'monospace', fontSize: '10px', overflow: 'hidden', lineHeight: '10px', wordBreak: 'break-all'}}>
                      010101010101010101010101010101010101
                      101010101010101010101010101010101010
                      001100110011001100110011001100110011
                      110011001100110011001100110011001100
                      010101010101010101010101010101010101
                      101010101010101010101010101010101010
                  </div>
              );
          case 'glitch': // Glitch: Random rects
              return (
                  <svg {...commonProps} viewBox="0 0 300 80" preserveAspectRatio="xMidYMid slice">
                      <rect x="10" y="10" width="50" height="10" fill="currentColor" />
                      <rect x="80" y="40" width="80" height="5" fill="currentColor" />
                      <rect x="200" y="20" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" />
                      <rect x="250" y="60" width="40" height="10" fill="currentColor" opacity="0.5" />
                  </svg>
              );
          case 'signal': // Signal: Sine
              return (
                  <svg {...commonProps} viewBox="0 0 300 80" preserveAspectRatio="xMidYMid slice">
                      <path fill="none" stroke="currentColor" strokeWidth="2" d="M0 40 Q 20 10, 40 40 T 80 40 T 120 40 T 160 40 T 200 40 T 240 40 T 280 40" opacity="0.5" />
                      <path fill="none" stroke="currentColor" strokeWidth="2" d="M0 40 Q 15 70, 30 40 T 60 40 T 90 40 T 120 40 T 150 40 T 180 40" />
                  </svg>
              );
          case 'chromatic': // Chromatic: RGB Layers
              return (
                  <svg {...commonProps} viewBox="0 0 300 80" preserveAspectRatio="xMidYMid slice">
                      <rect x="50" y="20" width="40" height="40" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.5" />
                      <rect x="55" y="20" width="40" height="40" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.7" />
                      <rect x="60" y="20" width="40" height="40" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.9" />
                      
                      <rect x="200" y="30" width="60" height="10" fill="currentColor" opacity="0.4" />
                      <rect x="205" y="30" width="60" height="10" fill="currentColor" opacity="0.6" />
                  </svg>
              );
          case 'vignette': // Vignette: Radial
              return (
                  <svg {...commonProps} viewBox="0 0 300 80" preserveAspectRatio="xMidYMid slice">
                      <defs>
                          <radialGradient id="grad-vignette" cx="50%" cy="50%" r="50%">
                              <stop offset="0%" stopColor="transparent" />
                              <stop offset="100%" stopColor="currentColor" stopOpacity="0.8" />
                          </radialGradient>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grad-vignette)" />
                      <circle cx="150" cy="40" r="30" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.3" />
                  </svg>
              );
          default: // Fallback Grid
              return (
                  <svg {...commonProps} viewBox="0 0 300 80" preserveAspectRatio="xMidYMid slice">
                      <pattern id="pat-def" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                          <path d="M20 0L0 0L0 20" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                      </pattern>
                      <rect width="100%" height="100%" fill="url(#pat-def)" />
                  </svg>
              );
      }
  };

  return (
    <div id={`tutorial-${id}`} className={`relative ${wrapperRadius} border transition-all duration-300 flex flex-col overflow-hidden group ${activeStyle} ${isExpanded ? 'z-[50]' : 'z-0'}`}>
      
      {/* Background Graphic */}
      {renderBackground()}

      {/* Header Area - Increased Height */}
      <div 
        className="relative h-20 p-3 flex flex-col justify-between cursor-pointer select-none"
        onClick={(e) => {
             if (isEnabled) {
                 // Shift + Click -> Turn Off
                 if (e.shiftKey && !isAlwaysOn) {
                     onToggleEnable();
                 } else {
                     onToggleExpand(e);
                 }
             }
             else if (!isAlwaysOn) onToggleEnable(); 
        }}
      >
        {/* Toggle (Top Right) */}
        {!isAlwaysOn && (
          <div className="absolute top-3 right-3 z-20">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleEnable();
                }}
                className={`relative w-10 h-5 ${containerRadius} transition-all duration-300 shadow-inner border border-theme-border
                  ${isEnabled ? 'bg-[var(--color-toggle-bg)] shadow-[0_0_8px_var(--color-toggle-bg)]' : 'bg-gray-800'}
                  hover:border-theme-accent hover:shadow-[0_0_8px_var(--color-accent)] hover:scale-105
                `}
              >
                <div className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-theme-toggleKnob ${knobRadius} shadow-md transition-transform duration-300
                  ${isEnabled ? 'translate-x-5' : 'translate-x-0'}
                `}></div>
              </button>
          </div>
        )}

        {/* Title (Top Left) */}
        <div className="flex items-center gap-2 z-10">
            <span className={`font-mono text-xs font-bold tracking-widest uppercase transition-colors ${isEnabled ? "text-theme-text" : "text-theme-muted"}`}>
                {label}
            </span>
            {isEnabled && (
                <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>
                    <ChevronDown size={14} className="text-theme-primary opacity-70" />
                </div>
            )}
        </div>

        {/* Big Icon (Bottom Left / Overlay) */}
        <div className="flex items-end z-10 pointer-events-none">
             <Icon 
                size={32} 
                className={`transition-all duration-500 ${isEnabled ? "text-theme-accent drop-shadow-[0_0_5px_var(--color-accent)]" : "text-theme-muted opacity-30"}`} 
             />
        </div>
      </div>

      {/* Grid Transition for Smooth Height Animation */}
      <div 
        className={`grid transition-[grid-template-rows,opacity,padding] duration-300 ease-in-out relative z-10 bg-theme-panel/80 backdrop-blur-sm
          ${isExpanded && isEnabled ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}
        `}
      >
        <div className={`${allowOverflow && isExpanded && isEnabled ? 'overflow-visible' : 'overflow-hidden'}`}>
            <div className="p-3 pt-0 border-t border-theme-border group-hover:border-theme-primary transition-colors duration-300">
              {children}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleWrapper;
