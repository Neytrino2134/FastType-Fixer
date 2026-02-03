
import React, { useEffect, useState } from 'react';
import { Terminal } from 'lucide-react';
import { useNotification, Notification } from '../../contexts/NotificationContext';

const NotificationItem: React.FC<{ notification: Notification, onDismiss: (id: string) => void, color: string, forceExpire: boolean }> = ({ notification, onDismiss, color, forceExpire }) => {
  // Phases: 
  // 'spawn' (line only) -> 'expand' (slide open) -> 'type' (text) -> 'wait' 
  // -> 'untype' -> 'collapse' (width) -> 'exit' (height/slide up) -> 'done'
  const [phase, setPhase] = useState<'spawn' | 'expand' | 'type' | 'wait' | 'untype' | 'collapse' | 'exit' | 'done'>('spawn');
  const [displayedText, setDisplayedText] = useState('');
  
  const EXPAND_DURATION = 500;
  const COLLAPSE_DURATION = 500;
  const EXIT_DURATION = 500; // Time for slide up animation
  const TYPE_SPEED = 30; // ms per char
  const WAIT_DURATION = 3000;
  const UNTYPE_SPEED = 15;

  // Create a semi-transparent version of the theme color (Hex + B3 = ~70% opacity)
  const fadedColor = `${color}B3`; 

  // Force expire logic: If list gets too long, trigger exit sequence immediately
  useEffect(() => {
      if (forceExpire && (phase === 'spawn' || phase === 'expand' || phase === 'type' || phase === 'wait')) {
          setPhase('untype');
      }
  }, [forceExpire, phase]);

  useEffect(() => {
    // Start animation sequence after mount
    const t = setTimeout(() => setPhase('expand'), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let t: number;
    let interval: number | undefined;

    if (phase === 'expand') {
        t = window.setTimeout(() => setPhase('type'), EXPAND_DURATION);
    } else if (phase === 'type') {
        let cursor = 0;
        const text = notification.message;
        interval = window.setInterval(() => {
            cursor++;
            setDisplayedText(text.slice(0, cursor));
            if (cursor >= text.length) {
                if (interval) clearInterval(interval);
                setPhase('wait');
            }
        }, TYPE_SPEED);
    } else if (phase === 'wait') {
        t = window.setTimeout(() => setPhase('untype'), WAIT_DURATION);
    } else if (phase === 'untype') {
        let cursor = notification.message.length;
        interval = window.setInterval(() => {
            cursor--;
            setDisplayedText(notification.message.slice(0, cursor));
            if (cursor <= 0) {
                if (interval) clearInterval(interval);
                setPhase('collapse');
            }
        }, UNTYPE_SPEED);
    } else if (phase === 'collapse') {
        // After width collapse, start height collapse (exit)
        t = window.setTimeout(() => setPhase('exit'), COLLAPSE_DURATION);
    } else if (phase === 'exit') {
        // After slide up animation, actually remove from DOM
        t = window.setTimeout(() => onDismiss(notification.id), EXIT_DURATION);
    }

    return () => {
        if (t) clearTimeout(t);
        if (interval) clearInterval(interval);
    };
  }, [phase, notification.message, onDismiss]);

  const isExiting = phase === 'exit';

  return (
    <div 
      className={`
        relative 
        bg-black/40 backdrop-blur-md border-l-4 
        shadow-[0_0_15px_rgba(0,0,0,0.3)]
        overflow-hidden
        transition-all duration-500 ease-in-out
        flex items-center
        ${isExiting ? 'border-l-0' : ''} 
      `}
      style={{
        maxWidth: (phase === 'spawn' || phase === 'collapse' || phase === 'exit') ? '4px' : '320px',
        // Smoothly collapse height and margin to 0 during exit phase to let siblings slide up
        minHeight: isExiting ? '0px' : '44px',
        height: isExiting ? '0px' : 'auto',
        marginBottom: isExiting ? '0px' : '8px',
        opacity: isExiting ? 0 : 1,
        
        borderColor: fadedColor, 
        boxShadow: isExiting ? 'none' : `0 0 10px ${color}1A`
      }}
    >
      {/* Content Container - Fixed width prevents text reflow during slide */}
      <div className="flex items-center pl-3 pr-4 py-2 min-w-[320px]">
        <Terminal size={14} style={{ color: fadedColor }} className="mr-2 shrink-0" />
        <span 
            className="font-mono text-xs font-bold tracking-wide"
            style={{ color: fadedColor }}
        >
          {displayedText}
          {(phase === 'type' || phase === 'wait' || phase === 'untype') && (
             <span 
                className="inline-block w-2 h-4 ml-1 align-middle animate-pulse"
                style={{ backgroundColor: fadedColor }}
             ></span>
          )}
        </span>
      </div>
    </div>
  );
};

interface NotificationOverlayProps {
    color?: string;
}

const NotificationOverlay: React.FC<NotificationOverlayProps> = ({ color = '#00ff00' }) => {
  const { notifications, removeNotification } = useNotification();

  // We render all notifications, but if the list exceeds 2, 
  // we trigger 'forceExpire' on the oldest ones.
  // This causes them to animate out gracefully instead of vanishing instantly.
  const MAX_VISIBLE = 2;

  return (
    <div className="absolute top-6 left-6 flex flex-col items-start pointer-events-none z-[99999] w-auto">
      {notifications.map((n, index) => {
        // Calculate if this item should be pushed out
        // The newest items are at the end of the array.
        // We want to keep the last 2. So if index < (length - 2), it expires.
        const shouldExpire = index < (notifications.length - MAX_VISIBLE);

        return (
          <NotificationItem 
            key={n.id} 
            notification={n} 
            onDismiss={removeNotification}
            color={color}
            forceExpire={shouldExpire}
          />
        );
      })}
    </div>
  );
};

export default NotificationOverlay;
