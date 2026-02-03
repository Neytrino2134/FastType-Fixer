
import React from 'react';

interface NeonButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'danger'; 
  id?: string;
}

export const NeonButton: React.FC<NeonButtonProps> = ({ onClick, children, className = "", variant = 'primary', id }) => {
  let activeClasses = "";
  
  // Base style: Glassy fill, transparent border to reserve space
  const baseStyle = "text-theme-muted hover:text-white bg-white/5 hover:bg-white/10 border-2 border-transparent";

  switch(variant) {
      case 'primary':
          activeClasses = "bg-theme-primary/10 text-theme-primary hover:bg-theme-primary/20 hover:text-theme-primary hover:border-theme-primary hover:shadow-[0_0_15px_var(--color-primary)]";
          break;
      case 'secondary':
          activeClasses = "hover:bg-theme-secondary/20 hover:text-theme-secondary hover:border-theme-secondary hover:shadow-[0_0_10px_var(--color-secondary)]";
          break;
      case 'accent':
          activeClasses = "hover:bg-theme-accent/20 hover:text-theme-accent hover:border-theme-accent hover:shadow-[0_0_10px_var(--color-accent)]";
          break;
      case 'danger':
          activeClasses = "hover:bg-red-500/20 hover:text-red-500 hover:border-red-500 hover:shadow-[0_0_15px_#ff0000]";
          break;
  }

  return (
    <button
      id={id}
      onClick={onClick}
      className={`p-3 rounded-full transition-all active:scale-95 flex items-center justify-center ${baseStyle} ${activeClasses} ${className}`}
    >
      {children}
    </button>
  );
};
