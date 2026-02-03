
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Legacy Neon Colors (Keep for backward compatibility with canvas logic)
        neon: {
          blue: '#00f3ff',
          pink: '#ff00ff',
          green: '#00ff00',
          purple: '#bc13fe',
          yellow: '#f9f871',
        },
        // New Semantic Theme Colors
        theme: {
          primary: 'var(--color-primary)',     // Main accent (was neon-blue)
          secondary: 'var(--color-secondary)', // Secondary accent (was neon-purple/pink)
          accent: 'var(--color-accent)',       // Highlights (was neon-green/yellow)
          bg: 'var(--color-bg)',               // App Background
          panel: 'var(--color-panel)',         // Panel Background
          text: 'var(--color-text)',           // Main Text
          muted: 'var(--color-muted)',         // Muted Text
          border: 'var(--color-border)',       // Borders
          toggleKnob: 'var(--color-toggle-knob)', // Toggle Switch Knob Color
          'toggle-bg': 'var(--color-toggle-bg)', // Unified Toggle Switch Active Background
        }
      },
      boxShadow: {
        'neon-blue': '0 0 10px #00f3ff, 0 0 20px #00f3ff',
        'neon-pink': '0 0 10px #ff00ff, 0 0 20px #ff00ff',
        'neon-green': '0 0 10px #00ff00, 0 0 20px #00ff00',
        'screen': 'inset 0 0 20px rgba(0,0,0,0.5)',
        // Themed Shadows
        'theme-glow': '0 0 10px var(--color-primary), 0 0 20px var(--color-primary)',
        'theme-glow-sec': '0 0 10px var(--color-secondary), 0 0 20px var(--color-secondary)',
      },
      fontFamily: {
        mono: ['Courier New', 'Courier', 'monospace'],
      },
      animation: {
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'marquee': 'marquee 10s linear infinite',
        'slide-in-right': 'slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
