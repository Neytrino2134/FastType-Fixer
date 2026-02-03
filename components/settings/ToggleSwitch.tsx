
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface ToggleSwitchProps {
  label: React.ReactNode;
  icon: any;
  value: boolean;
  onChange: (v: boolean) => void;
  color?: 'purple' | 'green' | 'blue'; // Kept for API compatibility, but mapped to theme
  disabled?: boolean; // NEW: Disabled state
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, icon: Icon, value, onChange, color: _color = 'purple', disabled = false }) => {
  const { controlStyle } = useTheme();
  
  // Use arbitrary value syntax to ensure the CSS variable is applied correctly even if tailwind config theme mapping fails
  const activeClass = 'bg-[var(--color-toggle-bg)] shadow-[0_0_8px_var(--color-toggle-bg)]';

  // Determine rounding based on style
  let containerRadius = 'rounded-sm';
  let knobRadius = 'rounded-sm';

  if (controlStyle === 'round') {
      containerRadius = 'rounded-lg';
      knobRadius = 'rounded-md';
  } else if (controlStyle === 'circle') {
      containerRadius = 'rounded-full';
      knobRadius = 'rounded-full';
  }

  return (
    <div className={`
      group flex items-center justify-between p-3 bg-black/20 border border-theme-border 
      ${controlStyle === 'round' ? 'rounded-lg' : 'rounded'} 
      mb-2 transition-all duration-200
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-theme-panel/40 hover:border-theme-primary hover:shadow-[0_0_10px_rgba(0,0,0,0.5)]'}
    `}>
      <div className="flex items-center gap-3">
        <div className={`text-theme-accent opacity-80 transition-all duration-300 ${!disabled ? 'group-hover:text-theme-primary group-hover:scale-110 group-hover:opacity-100' : ''}`}>
          <Icon size={16} />
        </div>
        <span className={`font-mono text-[11px] tracking-widest text-theme-text uppercase transition-colors ${!disabled ? 'group-hover:text-white' : ''}`}>{label}</span>
      </div>
      <button
        onClick={() => !disabled && onChange(!value)}
        disabled={disabled}
        className={`relative w-10 h-5 ${containerRadius} transition-all duration-300 shadow-inner border border-theme-border
          ${value ? activeClass : 'bg-gray-800'}
          ${disabled ? 'cursor-not-allowed' : 'group-hover:border-theme-primary group-hover:shadow-[0_0_5px_rgba(255,255,255,0.1)]'}
        `}
      >
        <div className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-theme-toggleKnob ${knobRadius} shadow-md transition-transform duration-300
          ${value ? 'translate-x-5' : 'translate-x-0'}
        `}></div>
      </button>
    </div>
  );
};

export default ToggleSwitch;
