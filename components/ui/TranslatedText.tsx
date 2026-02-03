
import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { en } from '../../locales/en';

type TranslationKey = keyof typeof en;

// Characters used for the glitch effect
const GLITCH_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*!??█▓▒░<>/[]{}-=_+";

interface TranslatedTextProps {
  k: TranslationKey; // The key from the locale file
  className?: string;
  uppercase?: boolean;
}

export const TranslatedText: React.FC<TranslatedTextProps> = ({ k, className = "", uppercase = false }) => {
  const { t } = useLanguage();
  
  // The actual target text we want to show
  const targetText = t(k);
  const finalTargetText = uppercase ? targetText.toUpperCase() : targetText;

  // What is currently displayed on screen
  const [displayText, setDisplayText] = useState(finalTargetText);
  
  // Ref to track if this is the first render (to avoid animating on mount)
  const isFirstRender = useRef(true);
  const intervalRef = useRef<number>(0);

  useEffect(() => {
    // 1. On mount (first render), just clear the flag and exit. 
    // We don't want to animate initialization, but we MUST clear the flag 
    // so the NEXT update (first language switch) triggers animation.
    if (isFirstRender.current) {
        isFirstRender.current = false;
        // Ensure state syncs if somehow prop is different from init state
        if (displayText !== finalTargetText) {
            setDisplayText(finalTargetText);
        }
        return;
    }

    // Determine the text we are transitioning FROM
    const oldText = displayText;
    const newText = finalTargetText;

    // If text hasn't changed, just exit
    if (oldText === newText) return;

    // Animation Config
    const duration = 600; // Total time for swap
    const fps = 30;
    const stepTime = 1000 / fps;
    const totalSteps = duration / stepTime;
    let currentStep = 0;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = window.setInterval(() => {
      currentStep++;
      const progress = currentStep / totalSteps;

      if (progress >= 1) {
        setDisplayText(newText);
        clearInterval(intervalRef.current);
        return;
      }

      // Chaos curve: 0 -> 1 -> 0
      const chaos = 1 - Math.abs((progress - 0.5) * 2);

      // Determine max length to ensure smooth width transition
      const currentLength = Math.round(oldText.length + (newText.length - oldText.length) * progress);
      
      let result = "";
      
      // We pick characters from the new text based on progress, or glitch chars
      for (let i = 0; i < currentLength; i++) {
          // If we are deep in chaos, show random symbol
          if (Math.random() < chaos * 0.8) {
              result += GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
          } else {
              // Otherwise show the character from the TARGET text if we are past 50%, 
              // or OLD text if we are before 50% (helps readability morph)
              if (progress > 0.5) {
                  result += newText[i] || "";
              } else {
                  result += oldText[i] || "";
              }
          }
      }

      setDisplayText(result);

    }, stepTime);

    return () => {
        clearInterval(intervalRef.current);
    };
  }, [finalTargetText]); // Run whenever the translated target text changes

  return (
    <span className={className}>
      {displayText}
    </span>
  );
};
