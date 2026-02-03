
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeType, ControlStyle } from '../types';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  panel: string;
  text: string;
  muted: string;
  border: string;
  scrollThumb: string;
  toggleKnob: string;
  toggleBg: string; // New: Unified toggle background color
}

export const THEMES: Record<ThemeType, ThemeColors> = {
  'neon-retro': {
    primary: '#00f3ff',
    secondary: '#bc13fe',
    accent: '#00ff00',
    bg: '#030712',
    panel: '#111827',
    text: '#ffffff',
    muted: '#9ca3af',
    border: '#374151',
    scrollThumb: '#374151',
    toggleKnob: '#ffffff',
    toggleBg: '#bc13fe',
  },
  'neon-blue': {
    primary: '#3b82f6',
    secondary: '#2563eb',
    accent: '#38bdf8',
    bg: '#020617',
    panel: '#0f172a',
    text: '#e0f2fe',
    muted: '#64748b',
    border: '#1e3a8a',
    scrollThumb: '#1e3a8a',
    toggleKnob: '#ffffff',
    toggleBg: '#3b82f6',
  },
  'neon-pink': {
    primary: '#ff00ff', // Pink (High Contrast)
    secondary: '#00f3ff', // Blue
    accent: '#bc13fe', // Purple
    bg: '#030712', // Dark Bluish Black (Same as Retro for contrast)
    panel: '#111827', // Dark Gray Blue Panel
    text: '#ffdbf9', // Light Pink Text
    muted: '#9ca3af', // Cool Gray Muted
    border: '#374151', // Standard Dark Border (lets pink pop)
    scrollThumb: '#ff00ff',
    toggleKnob: '#ffffff',
    toggleBg: '#ff00ff',
  },
  'warm-cozy': {
    primary: '#fbbf24', // Amber-400
    secondary: '#d97706', // Amber-600
    accent: '#fcd34d', // Amber-300
    bg: '#1a120b', // Deep warm brown (almost black)
    panel: '#2e2012', // Dark golden-brown panel
    text: '#fef3c7', // Amber-100
    muted: '#a8a29e', // Warm gray
    border: '#78350f', // Amber-900
    scrollThumb: '#78350f',
    toggleKnob: '#ffffff',
    toggleBg: '#ea580c',
  },
  'neutral-gray': {
    primary: '#9ca3af', // Gray-400 (Cool Gray) - Darker
    secondary: '#4b5563', // Gray-600 - Darker
    accent: '#e5e7eb', // Gray-200
    bg: '#030303', // Almost black
    panel: '#0f1115', // Dark Gray-Blue (Custom)
    text: '#d1d5db', // Gray-300
    muted: '#6b7280', // Gray-500 (Blue-gray)
    border: '#1f2937', // Gray-800 (Cool/Blueish)
    scrollThumb: '#374151', // Gray-700
    toggleKnob: '#d1d5db',
    toggleBg: '#4b5563',
  },
  'neutral-ocean': {
    primary: '#4B8CA8',
    secondary: '#89C2D9',
    accent: '#70C6D6',
    bg: '#050A10',
    panel: '#0D1620',
    text: '#DDE6EB',
    muted: '#5A7585',
    border: '#1F3342',
    scrollThumb: '#4A6B82',
    toggleKnob: '#0F172A',
    toggleBg: '#00E5FF',
  }
};

export const THEME_KEYS = Object.keys(THEMES) as ThemeType[];

interface ThemeContextType {
  currentTheme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  controlStyle: ControlStyle;
  setControlStyle: (style: ControlStyle) => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(() => {
    return (localStorage.getItem('neon_theme') as ThemeType) || 'neon-retro';
  });

  const [controlStyle, setControlStyle] = useState<ControlStyle>(() => {
    return (localStorage.getItem('neon_control_style') as ControlStyle) || 'default';
  });

  useEffect(() => {
    localStorage.setItem('neon_theme', currentTheme);
    const colors = THEMES[currentTheme];
    const root = document.documentElement;

    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-secondary', colors.secondary);
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--color-bg', colors.bg);
    root.style.setProperty('--color-panel', colors.panel);
    root.style.setProperty('--color-text', colors.text);
    root.style.setProperty('--color-muted', colors.muted);
    root.style.setProperty('--color-border', colors.border);
    root.style.setProperty('--color-scroll-thumb', colors.scrollThumb);
    root.style.setProperty('--color-toggle-knob', colors.toggleKnob);
    root.style.setProperty('--color-toggle-bg', colors.toggleBg);

  }, [currentTheme]);

  useEffect(() => {
    localStorage.setItem('neon_control_style', controlStyle);
    // Set data attribute for CSS selectors (Range inputs)
    document.documentElement.setAttribute('data-control-style', controlStyle);
  }, [controlStyle]);

  return (
    <ThemeContext.Provider value={{ 
      currentTheme, 
      setTheme: setCurrentTheme, 
      controlStyle, 
      setControlStyle, 
      colors: THEMES[currentTheme] 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
