
import React, { useEffect, useRef, useState } from 'react';
import { NEON_COLORS, EffectsConfig, DvdConfig } from '../types';

interface DvdLogoProps {
  containerRef: React.RefObject<HTMLDivElement>;
  fps: number;
  effectsConfig?: EffectsConfig;
  config: DvdConfig;
  onPlaySfx?: (name: string) => void;
}

const TRIGGER_ZONE_PX = 30; // Pixel distance to trigger sound before impact

const DvdLogo: React.FC<DvdLogoProps> = ({ containerRef, fps, effectsConfig, config, onPlaySfx }) => {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [color, setColor] = useState(NEON_COLORS[0]);
  const [isVisible, setIsVisible] = useState(true);
  
  // Store direction separately from speed so we can change speed dynamically
  const directionRef = useRef({ x: 1, y: 1 });
  
  // Track if sound was already triggered for the current wall approach to prevent spamming
  const soundStateRef = useRef({ xTriggered: false, yTriggered: false });

  const logoRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const lastDrawTimeRef = useRef<number>(0);

  // Determine aspect ratio based on logo type
  // Updated for new SVG: 740.376 / 805
  const aspectRatio = config.logoType === 'neon_waves' ? (740.376 / 805) : 0.5;

  useEffect(() => {
    lastDrawTimeRef.current = 0;

    const animate = (timestamp: number) => {
      requestRef.current = requestAnimationFrame(animate);

      const interval = 1000 / fps;
      const elapsed = timestamp - lastDrawTimeRef.current;
      
      if (elapsed < interval) return;

      lastDrawTimeRef.current = timestamp - (elapsed % interval);

      if (!containerRef.current || !logoRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      // We can't rely solely on cached rect because size might change
      const logoRect = logoRef.current.getBoundingClientRect();

      if (containerRect.width === 0 || containerRect.height === 0) return;

      // Handle Glitch Randomness
      const isGlitching = effectsConfig?.glitch.enabled;
      const glitchIntensity = effectsConfig?.glitch.intensity || 0;

      if (isGlitching && Math.random() > 0.95 - (glitchIntensity * 0.1)) {
           setIsVisible(Math.random() > 0.5);
      } else {
           setIsVisible(true);
      }

      setPosition((prev) => {
        const frameSkip = 60 / fps;
        
        // Use config speed
        const speed = config.speed;
        let moveX = directionRef.current.x * speed * frameSkip;
        let moveY = directionRef.current.y * speed * frameSkip;
        
        let newX = prev.x + moveX;
        let newY = prev.y + moveY;

        // Current dimensions
        const currentW = logoRect.width;
        const currentH = logoRect.height;
        const contW = containerRect.width;
        const contH = containerRect.height;

        // --- AUDIO PRE-TRIGGER LOGIC ---
        // We check if we are approaching a wall and are within the trigger zone.
        // If so, play sound immediately to compensate for latency.
        if (config.enableSfx && onPlaySfx) {
            // Check X Axis Approach
            if (directionRef.current.x > 0) { // Moving Right
                const distToRight = contW - (newX + currentW);
                if (distToRight <= TRIGGER_ZONE_PX && !soundStateRef.current.xTriggered) {
                    onPlaySfx('UI_BEEP.mp3');
                    soundStateRef.current.xTriggered = true;
                }
            } else { // Moving Left
                if (newX <= TRIGGER_ZONE_PX && !soundStateRef.current.xTriggered) {
                    onPlaySfx('UI_BEEP.mp3');
                    soundStateRef.current.xTriggered = true;
                }
            }

            // Check Y Axis Approach
            if (directionRef.current.y > 0) { // Moving Bottom
                const distToBottom = contH - (newY + currentH);
                if (distToBottom <= TRIGGER_ZONE_PX && !soundStateRef.current.yTriggered) {
                    onPlaySfx('UI_BEEP.mp3');
                    soundStateRef.current.yTriggered = true;
                }
            } else { // Moving Top
                if (newY <= TRIGGER_ZONE_PX && !soundStateRef.current.yTriggered) {
                    onPlaySfx('UI_BEEP.mp3');
                    soundStateRef.current.yTriggered = true;
                }
            }
        }

        // Glitch Jerk Logic
        if (isGlitching && Math.random() > 0.92 - (glitchIntensity * 0.1)) {
            newX += (Math.random() - 0.5) * 100 * glitchIntensity;
            newY += (Math.random() - 0.5) * 100 * glitchIntensity;
        }

        let hit = false;

        // --- PHYSICAL COLLISION LOGIC ---
        if (newX + currentW >= contW) {
          newX = contW - currentW;
          directionRef.current.x = -1;
          soundStateRef.current.xTriggered = false; // Reset trigger on bounce
          hit = true;
        } else if (newX <= 0) {
          newX = 0;
          directionRef.current.x = 1;
          soundStateRef.current.xTriggered = false; // Reset trigger on bounce
          hit = true;
        }

        if (newY + currentH >= contH) {
          newY = contH - currentH;
          directionRef.current.y = -1;
          soundStateRef.current.yTriggered = false; // Reset trigger on bounce
          hit = true;
        } else if (newY <= 0) {
          newY = 0;
          directionRef.current.y = 1;
          soundStateRef.current.yTriggered = false; // Reset trigger on bounce
          hit = true;
        }

        if (hit) {
            const nextColor = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
            setColor(nextColor);
            
            // NOTE: Sound is now handled in the Pre-Trigger block above for lower latency.
            // If the speed is extremely high (higher than TRIGGER_ZONE_PX per frame), 
            // the pre-trigger might miss. In that edge case, we could fallback here, 
            // but for normal DVD speeds, pre-trigger is smoother.
        }

        return { x: newX, y: newY };
      });
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [containerRef, fps, effectsConfig, config.speed, config.size, config.enableSfx, onPlaySfx]);

  return (
    <div
      ref={logoRef}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        color: color,
        filter: `drop-shadow(0 0 15px ${color})`,
        opacity: isVisible ? config.opacity : 0, 
        transition: 'opacity 0.05s steps(2), width 0.3s, height 0.3s',
        width: `${config.size}px`,
        height: `${config.size * aspectRatio}px`
      }}
      className="absolute top-0 left-0 z-20 select-none will-change-transform"
    >
        <div className="w-full h-full flex items-center justify-center">
            {config.logoType === 'neon_waves' ? (
                // NEON WAVES LOGO - OPTIMIZED VERSION
                <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 805 740.376">
                    <path 
                        id="WAVE" 
                        d="m432.384 434.973 133.34 361.184Q603.911 693.25 642.1 590.321h1.3l76.38 137.224L749.552 668s125.324.009 141.448 0c9.414 0 16 7.015 16 15 0 9.311-6.626 16.013-16 16-33.571-.048-124.618.064-124.618.064l-46.6 94.5-72.5-132.046-84.147 222.669L437.563 533.36l-82.852 299.045-50.489-133.341S167.188 699 118 699c-9.785.013-16-5.77-16-16 0-7.768 6.682-15 16-15 15.26.008 206.936 0 206.936 0l25.891 68.612s25.073-91.191 81.557-301.639" 
                        fill="currentColor" 
                        fillRule="evenodd" 
                        transform="translate(-102 -143.812)"
                    />
                    <path 
                        id="SUN" 
                        d="M422.476 155.675a286.36 286.36 0 0 1 150.622-3.4q6.326 1.563 12.507 3.4zm202.713 14.88a286 286 0 0 1 31.676 17.145H351.519a289 289 0 0 1 31.617-17.149h242.053Zm63.721 40.467a288 288 0 0 1 27.062 25.883H292.216a288 288 0 0 1 27.156-25.883z" 
                        fill="currentColor" 
                        fillRule="evenodd" 
                        transform="translate(-102 -143.812)"
                    />
                    <path 
                        id="NEON" 
                        d="M320.687 409.42V257.941h-42.253v67.922a138 138 0 0 0 .633 16.057h-.422a24 24 0 0 0-1.849-3.38q-1.215-1.9-2.588-3.909t-2.746-3.908q-1.374-1.9-2.324-3.275l-51.233-69.507h-43.1V409.42h42.255v-63.592q0-13.942-.634-25.141h.423a174 174 0 0 0 10.351 15.634l53.451 73.1h40.035Zm144.913 0v-35.7h-52.183v-22.293h45.74v-35.7h-45.74v-22.082h48.7v-35.7h-94.334V409.42zm173.593-116.778a65.9 65.9 0 0 0-26.514-27.571q-17.167-9.666-38.926-9.665-22.606 0-40.353 10.088a69.8 69.8 0 0 0-27.57 28.574q-9.823 18.486-9.824 41.619 0 22.08 9.718 39.56a68.4 68.4 0 0 0 27.2 27.148 78.9 78.9 0 0 0 38.821 9.666q21.865 0 39.507-9.983a70.04 70.04 0 0 0 27.465-27.993q9.824-18.009 9.824-40.827.001-22.71-9.348-40.616m-42.518 62.482a29.76 29.76 0 0 1-9.824 13.31 23.5 23.5 0 0 1-14.26 4.648q-12.993 0-20.546-10.352t-7.553-28.838q0-18.908 7.606-29.261t21.232-10.352q12.463 0 19.648 10.775t7.183 29.471q0 11.938-3.486 20.599m236.5 54.3V257.941h-42.256v67.922a137 137 0 0 0 .634 16.057h-.422a24 24 0 0 0-1.849-3.38q-1.215-1.9-2.588-3.909t-2.746-3.908-2.324-3.275l-51.233-69.507h-43.1V409.42h42.254v-63.592q0-13.942-.634-25.141h.423a174 174 0 0 0 10.352 15.634l53.451 73.1h40.035Zm-482.456 32.322-24.457 101.087a75.4 75.4 0 0 0-2.206 12.66h-.383a79.4 79.4 0 0 0-2.014-12.276l-26.087-101.471h-23.5l-28.2 100.7c-1.534 5.563-2.685 13.236-2.685 13.236h-.48s-.9-9.016-1.918-13.236l-24.936-100.7h-25.027l38.459 137.532h26.375l26.279-96.388a65.3 65.3 0 0 0 2.3-13.235h.384a65.6 65.6 0 0 0 2.014 13.427l26.183 96.2h25.8l37.692-137.532h-23.593Zm242.122 0L558.122 545.9a61 61 0 0 0-2.782 11.8h-.383a64.4 64.4 0 0 0-2.494-11.6l-33.951-104.354h-24.937l48.53 137.532h25.512l49.393-137.532zM723.272 560h-54.38v-40.665h47.283v-19.277h-47.283v-38.939H720.2v-19.373h-74.134v137.532h77.206zm32.609 17.071a95 95 0 0 0 9.975 2.446q5.273 1.006 10.31 1.535a84 84 0 0 0 8.488.527 92.7 92.7 0 0 0 19.661-2.014 50.6 50.6 0 0 0 16.448-6.522 34 34 0 0 0 11.365-11.7q4.22-7.192 4.22-17.647a32.56 32.56 0 0 0-2.829-13.859 40.1 40.1 0 0 0-7.673-11.077 64 64 0 0 0-11.221-9.111q-6.38-4.124-13.571-7.865-7-3.067-12.324-5.706a57 57 0 0 1-9.016-5.419 20.5 20.5 0 0 1-5.61-6.138 15.77 15.77 0 0 1-1.918-7.961 13.87 13.87 0 0 1 2.493-8.344 19.5 19.5 0 0 1 6.474-5.658 30.1 30.1 0 0 1 9.015-3.165 54 54 0 0 1 10.119-.959q18.414 0 30.115 8.44v-22.539q-9.879-4.891-31.458-4.891a77.2 77.2 0 0 0-18.606 2.254 52.8 52.8 0 0 0-16.257 6.905 36.9 36.9 0 0 0-11.509 11.8 31.65 31.65 0 0 0-4.364 16.832 34.2 34.2 0 0 0 2.542 13.715 35.5 35.5 0 0 0 7 10.5 56 56 0 0 0 10.5 8.487q6.042 3.839 13.044 7.577 6.52 2.974 12.228 5.707a69 69 0 0 1 9.927 5.706 24.7 24.7 0 0 1 6.569 6.57 15.17 15.17 0 0 1 2.35 8.488q0 9.112-7.049 13.907t-21.436 4.8a52 52 0 0 1-9.015-.863 73 73 0 0 1-9.783-2.446 58 58 0 0 1-9.255-3.884 36.3 36.3 0 0 1-7.529-5.179v23.5a31.5 31.5 0 0 0 7.58 3.252Z" 
                        fill="currentColor" 
                        fillRule="evenodd" 
                        transform="translate(-102 -143.812)"
                    />
                    <path 
                        id="NEON_copy" 
                        d="M320.687 409.42V257.941h-42.253l.211 83.979-60.74-83.979h-43.1V409.42h42.255l-.211-88.733 63.8 88.733h40.035Zm144.913 0v-35.7h-52.183v-22.293h45.74v-35.7h-45.74v-22.082h48.7v-35.7h-94.334V409.42zm147.079-144.349q-17.167-9.666-38.926-9.665c-30.142 0-54.823 14.014-67.923 38.662q-9.823 18.486-9.824 41.619 0 22.08 9.718 39.56c12.956 23.31 37.573 36.814 66.022 36.814 30.138 0 53.307-14.7 65.717-35.759 7.184-12.193 11.079-26.864 11.079-43.044 0-30.282-12.976-55.299-35.863-68.187m-16 90.053c-4.647 11.549-13.521 17.958-24.084 17.958q-12.993 0-20.546-10.352t-7.553-28.838q0-18.908 7.606-29.261t21.232-10.352q12.463 0 19.648 10.775t7.183 29.471q-.004 11.938-3.49 20.599ZM833 409V258h-42v84l-61-84h-43v151h42v-88l64 88zm-482.281 32.746-26.663 113.747-28.484-113.747h-23.5l-30.88 113.939-27.334-113.939h-25.032l38.459 137.532h26.375l28.964-109.623 28.2 109.623h25.8l37.692-137.532zm242.122 0L555.34 557.7l-36.828-115.954h-24.937l48.53 137.532h25.512l49.393-137.532zM723.272 560h-54.38v-40.665h47.283v-19.277h-47.283v-38.939H720.2v-19.373h-74.134v137.532h77.206zm42.584 19.517c-.529-.1 32.354 7.758 54.907-6.474 9.527-6.01 15.585-15.409 15.585-29.348 0-10.361-4.044-18.283-10.5-24.936-3.132-3.223-19.639-14.3-24.792-16.976-5.394-2.363-19.409-9.669-21.34-11.125-9.426-7.1-11.13-21.132 1.439-28.1 5.307-2.941 12.356-4.124 19.134-4.124q18.414 0 30.115 8.44v-22.539q-9.879-4.891-31.458-4.891c-12.659 0-25.336 2.957-34.863 9.159s-15.873 15.712-15.873 28.629c0 10.485 3.6 18.015 9.543 24.217 2.815 2.937 18.459 13.347 23.546 16.064 4.829 2.2 19.71 9.693 22.155 11.413 11.564 8.151 11.6 22.348 1.87 28.965-11.9 8.1-31.855 4.2-40.234 1.486-6.521-2.11-12.564-5.227-16.784-9.063v23.5c3.832 2.426 10.519 4.362 17.55 5.704Z" 
                        fill="currentColor" 
                        fillRule="evenodd" 
                        transform="translate(-102 -143.812)"
                    />
                </svg>
            ) : (
                // CLASSIC DVD LOGO (RECTANGLE 2:1)
                <svg viewBox="0 0 100 50" width="100%" height="100%" fill="currentColor">
                     <path d="M 10 25 C 10 10 90 10 90 25 C 90 40 10 40 10 25" stroke="currentColor" strokeWidth="4" fill="none" />
                     <text x="50" y="32" fontSize="22" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold" letterSpacing="2">DVD</text>
                     <path d="M 20 40 Q 50 50 80 40" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
            )}
        </div>
    </div>
  );
};

export default DvdLogo;
