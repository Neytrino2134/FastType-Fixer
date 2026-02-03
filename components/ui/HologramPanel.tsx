
import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface HologramPanelProps {
  title: string;
  x: number;
  y: number;
  onClose: () => void;
  children: React.ReactNode;
}

const HologramPanel: React.FC<HologramPanelProps> = ({ title, x, y, onClose, children }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const { colors } = useTheme();

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Determine Dynamic Color
  const baseColor = colors.primary;

  // Simple boundary protection
  // x and y are relative to the RetroScreen container
  // We assume panel width ~224px (w-56) and height varies.
  // Clamp X to avoid right overflow
  const panelWidth = 224;
  // Note: We can't know parent width perfectly here without props, but visual estimation works for "too far right"
  // Better approach: Since x is local, if x is > 800 (typical screen width), clamp it?
  // Let's rely on standard offset logic:
  
  const style: React.CSSProperties = {
    position: 'absolute',
    left: Math.max(10, x + 20), 
    top: Math.max(10, y + 20),
    zIndex: 60,
    width: `${panelWidth}px`,
    // Use color-mix for transparency
    backgroundColor: `color-mix(in srgb, ${baseColor}, transparent 90%)`,
    border: `1px solid color-mix(in srgb, ${baseColor}, transparent 60%)`,
    boxShadow: `0 0 20px color-mix(in srgb, ${baseColor}, transparent 80%)`,
    borderTopLeftRadius: '12px',
    borderBottomRightRadius: '12px',
  };

  return (
    <div 
      ref={panelRef}
      style={style}
      className="flex flex-col overflow-hidden animate-[scale-in-center_0.2s_ease-out] backdrop-blur-sm"
    >
        {/* Background Grid - Colored */}
        <div 
            className="absolute inset-0 bg-[length:100%_4px] pointer-events-none"
            style={{
                backgroundImage: `linear-gradient(color-mix(in srgb, ${baseColor}, transparent 90%) 1px, transparent 1px)`
            }}
        ></div>

        {/* Decorative Corners - Colored */}
        {/* Top Left removed due to border-radius */}
        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r opacity-50" style={{ borderColor: baseColor }}></div>
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l opacity-50" style={{ borderColor: baseColor }}></div>
        {/* Bottom Right removed due to border-radius */}

        {/* Header */}
        <div 
            className="flex items-center justify-between p-2 border-b"
            style={{ 
                backgroundColor: `color-mix(in srgb, ${baseColor}, transparent 80%)`,
                borderColor: `color-mix(in srgb, ${baseColor}, transparent 60%)`
            }}
        >
            <span 
                className="font-mono text-[10px] font-bold tracking-widest uppercase"
                style={{ color: baseColor }}
            >
                {title}
            </span>
            <button onClick={onClose} style={{ color: baseColor }} className="hover:text-white transition-colors">
                <X size={12} />
            </button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-4 relative z-10">
            {children}
        </div>
    </div>
  );
};

export default HologramPanel;
