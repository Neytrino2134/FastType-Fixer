
import React from 'react';

interface RangeControlProps {
  label: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  className?: string;
}

const RangeControl: React.FC<RangeControlProps> = ({ label, value, min, max, step, onChange, className = "mb-6 last:mb-2" }) => (
  <div className={className}>
    <div className="flex justify-between font-mono text-[10px] mb-2 px-0.5 tracking-tighter">
      <span className="text-theme-text uppercase opacity-70">{label}</span>
      <span className="text-theme-primary font-bold">{typeof value === 'number' ? value.toFixed(1) : value}</span>
    </div>
    <div className="relative flex items-center h-8">
      <input 
        type="range"
        min={min}
        max={max}
        step={step}
        value={value ?? min}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full focus:outline-none"
      />
    </div>
  </div>
);

export default RangeControl;
