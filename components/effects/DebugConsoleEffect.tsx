
import React, { useEffect, useState, useRef } from 'react';
import { Copy, Terminal } from 'lucide-react';
import { EffectsConfig } from '../../types';

interface DebugConsoleEffectProps {
  effects: EffectsConfig;
}

interface LogEntry {
  id: string;
  type: 'log' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

const DebugConsoleEffect: React.FC<DebugConsoleEffectProps> = ({ effects }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Resizing State
  const [size, setSize] = useState(() => {
    // Default size or window percentage if available
    if (typeof window !== 'undefined') {
      return {
        width: Math.min(600, window.innerWidth * 0.5),
        height: Math.min(400, window.innerHeight * 0.5)
      };
    }
    return { width: 600, height: 400 };
  });
  const isResizing = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const config = effects.debugConsole;

  useEffect(() => {
    if (!config.enabled) return;

    const formatMessage = (args: any[]) => {
      return args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
    };

    const addLog = (type: LogEntry['type'], args: any[]) => {
      const now = new Date();
      const timestamp = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + String(now.getMilliseconds()).padStart(3, '0');
      
      const newEntry: LogEntry = {
        id: crypto.randomUUID(),
        type,
        message: formatMessage(args),
        timestamp
      };

      setLogs(prev => {
        const next = [...prev, newEntry];
        if (next.length > 50) next.shift(); // Keep logs manageable
        return next;
      });
    };

    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args) => {
      originalLog.apply(console, args);
      addLog('log', args);
    };

    console.warn = (...args) => {
      originalWarn.apply(console, args);
      addLog('warn', args);
    };

    console.error = (...args) => {
      originalError.apply(console, args);
      addLog('error', args);
    };

    const errorHandler = (event: ErrorEvent) => {
      addLog('error', [event.message]);
    };

    window.addEventListener('error', errorHandler);
    console.log("SYSTEM MONITOR INITIALIZED...");
    console.log("LISTENING FOR EVENTS...");

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      window.removeEventListener('error', errorHandler);
    };
  }, [config.enabled]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Resize Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing.current) return;
        
        // Since anchor is Bottom-Right:
        // Dragging left (decreasing X) increases width
        // Dragging up (decreasing Y) increases height
        const dx = dragStart.current.x - e.clientX;
        const dy = dragStart.current.y - e.clientY;

        setSize({
            width: Math.max(300, dragStart.current.w + dx),
            height: Math.max(200, dragStart.current.h + dy)
        });
    };

    const handleMouseUp = () => {
        if (isResizing.current) {
            isResizing.current = false;
            // Clear both classes just in case
            document.body.classList.remove('custom-cursor-col-resize');
            document.body.classList.remove('custom-cursor-row-resize');
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const initResize = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isResizing.current = true;
      dragStart.current = { 
          x: e.clientX, 
          y: e.clientY, 
          w: size.width, 
          h: size.height 
      };
      
      // Use Horizontal and Vertical resize cursors together if diagonally resizing, 
      // or just Horizontal for width/diagonal for now.
      // Since we don't have a diagonal custom cursor yet, let's use the Horizontal arrow 
      // as the primary resize indicator for this panel as width is usually primary.
      document.body.classList.add('custom-cursor-col-resize');
      document.body.style.cursor = 'none';
      document.body.style.userSelect = 'none';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!config.enabled) return null;

  return (
    <div 
      className="absolute bottom-0 right-0 flex flex-col pointer-events-auto z-40 border-l border-t border-neon-blue/30 bg-black/90 backdrop-blur-sm shadow-[0_0_20px_rgba(0,243,255,0.1)]"
      style={{ 
        width: size.width,
        height: size.height,
        opacity: config.opacity,
        transform: `scale(${config.scale})`,
        transformOrigin: 'bottom right',
        transition: 'opacity 0.3s, transform 0.3s'
      }}
    >
      {/* Resize Handle (Top Left) */}
      <div 
        onMouseDown={initResize}
        className="absolute top-0 left-0 w-8 h-8 cursor-nw-resize z-50 group flex items-start justify-start p-1"
        title="Resize Window"
      >
         {/* Visual Corner Bracket */}
         <div className="w-3 h-3 border-t-2 border-l-2 border-neon-blue bg-transparent group-hover:bg-neon-blue/20 group-hover:shadow-[0_0_5px_#00f3ff] transition-all"></div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-neon-blue/30 bg-neon-blue/10 shrink-0">
        <div className="flex items-center gap-2 text-neon-blue pl-4">
           <Terminal size={14} />
           <span className="font-mono text-xs font-bold tracking-widest">SYSTEM LOGS</span>
        </div>
        {/* Removed window control dots */}
      </div>

      {/* Logs Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 font-mono text-[10px] space-y-1 custom-scrollbar min-h-0"
      >
        {logs.length === 0 && (
           <div className="text-gray-500 text-center mt-10 italic">NO ACTIVE LOGS</div>
        )}
        {logs.map((log) => (
          <div 
            key={log.id} 
            className={`group relative pl-2 pr-8 py-1 border-l-2 hover:bg-white/5 transition-colors break-words rounded-r
              ${log.type === 'error' ? 'border-red-500 text-red-400' : 
                log.type === 'warn' ? 'border-yellow-500 text-yellow-400' : 
                'border-neon-blue text-neon-blue'}
            `}
          >
            <div className="flex gap-2 opacity-50 text-[9px] mb-0.5">
               <span>[{log.timestamp}]</span>
               <span className="uppercase">{log.type}</span>
            </div>
            <div className="whitespace-pre-wrap leading-tight font-bold">
              {log.message}
            </div>
            
            <button 
              onClick={() => copyToClipboard(log.message)}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-gray-800 border border-gray-600 text-white rounded hover:bg-neon-blue hover:text-black hover:border-neon-blue transition-all shadow-lg z-10"
              title="Copy Log"
            >
              <Copy size={12} />
            </button>
          </div>
        ))}
      </div>
      
      {/* Footer / Input simulation */}
      <div className="p-2 border-t border-neon-blue/30 bg-black/50 shrink-0">
         <div className="flex items-center gap-2 text-neon-green">
            <span>{'>'}</span>
            <div className="w-2 h-4 bg-neon-green animate-pulse"></div>
         </div>
      </div>
    </div>
  );
};

export default DebugConsoleEffect;
