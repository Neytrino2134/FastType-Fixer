
import React, { useEffect, useRef } from 'react';
import { EffectsConfig } from '../../types';

interface CyberHackEffectProps {
  effects: EffectsConfig;
}

interface TypedLine {
  text: string;
  color: string;
  timestamp: number;
}

// --- DATA LISTS FOR VARIETY ---

const COMMANDS = [
  "sudo su", "tar -xvf payload.tar.gz", "grep -r 'PASSWORD' /var/log", 
  "ssh root@192.168.0.1", "nmap -sV -p 1-65535", "chmod +x inject.sh",
  "./exploit_v2", "rm -rf /sys/logs", "ping -c 100 mainframe", 
  "iptables -F", "mount /dev/sda1 /mnt/data", "whoami", "history -c"
];

const DIRECTORIES = [
  "/usr/bin", "/etc/shadow", "/var/www/html", "/sys/kernel/debug", 
  "/home/admin/.ssh", "/opt/quantum_core", "/dev/mem", "/tmp/cache"
];

const EXTENSIONS = [".dat", ".log", ".enc", ".bin", ".key", ".rsa", ".sys"];

const TARGETS = [
  "FIREWALL_LAYER_7", "NEURAL_NET_V4", "BIOS_SUBROUTINE", "SATELLITE_UPLINK", 
  "QUANTUM_GATE", "SECURITY_DAEMON", "ADMIN_CREDENTIALS", "KERNEL_MEMORY"
];

const ERRORS = [
  "SEGMENTATION FAULT", "ACCESS DENIED", "CONNECTION REFUSED", 
  "BUFFER OVERFLOW", "MEMORY LEAK DETECTED", "HANDSHAKE FAILED", 
  "UNKNOWN PROTOCOL", "CORRUPT SECTOR", "TIMEOUT"
];

const HACK_CODE_TEMPLATES = [
  // Simple Logs
  "CONNECTING TO {IP}... [ESTABLISHED]",
  "EXTRACTING {FILE}...",
  "Running heuristics on {TARGET}...",
  "Bypassing proxy at {IP}:{PORT}...",
  "Dumping memory range 0x{HEX}-0x{HEX}...",
  
  // Progress Bars
  "Loading module {TARGET}: {PROGRESS}",
  "Decrypting RSA key: {PROGRESS}",
  "Brute-forcing PIN: {PROGRESS}",
  "Uploading virus: {PROGRESS}",
  "System wipe: {PROGRESS}",
  
  // Complex/Code
  "function {FUNC}(x) { return x ^ 0x{HEX}; }",
  "if (user.id !== 0) { throw new Error('{ERROR}'); }",
  "while(true) { inject_packet({HEX}); }",
  "Allocating {NUMBER}TB for virtual heap...",
  "Thread {NUMBER} started. PID: {NUMBER}",
  
  // Short/CLI
  "> {COMMAND}",
  "> {COMMAND}",
  "root@{IP}:~# {COMMAND}",
  
  // Critical
  "CRITICAL: {ERROR} AT ADDRESS 0x{HEX}",
  "WARNING: CPU TEMPERATURE {NUMBER}°C",
  "ALERT: INTRUSION DETECTED IN {DIR}",
  "SUCCESS: {TARGET} COMPROMISED",

  // --- BRANDING & CUSTOM TEXT ---
  "Neon Waves – Your Perfect Destination",
  "Neon Waves: INITIALIZING...",
  "USER: MeowMasterArt [VERIFIED]",
  "CONTACT: MeowMasterArt@gmail.com",
  "Admin: MeowMaster [GOD MODE]",
  "MeowMaster is God of waves",
  "Neon Waves best youtube channel",
  "DOWNLOADING WAVE_DATA FROM NEON WAVES...",
  "ACCESSING MEOWMASTER_ART ARCHIVES...",
  "STREAMING: NEON WAVES PROTOCOL",
  "YOUTUBE CHANNEL: NEON WAVES [SUBSCRIBED]",
  "VIBE CHECK: NEON WAVES [PASSED]",
  "RETRO_SONIC_ULTRA // MEOWMASTER_ART"
];

const CyberHackEffect: React.FC<CyberHackEffectProps> = ({ effects }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const terminalLinesRef = useRef<TypedLine[]>([]);
  
  const currentLineRef = useRef<{
    fullText: string;
    displayed: string;
    color: string;
    isProgress: boolean;
    progressVal: number;
    difficulty: number; // 1 = normal, 0.2 = slow, 3 = fast
    nextCharDelay: number;
  } | null>(null);
  
  const lastStepTimeRef = useRef<number>(0);
  const nextStepDelayRef = useRef<number>(0);
  const charIdxRef = useRef<number>(0);
  
  // Config Ref
  const configRef = useRef(effects.cyberHack);

  useEffect(() => {
    configRef.current = effects.cyberHack;
  }, [effects.cyberHack]);

  const getRandomHex = (len = 4) => {
    let s = "";
    for(let i=0; i<len; i++) s += Math.floor(Math.random()*16).toString(16).toUpperCase();
    return s;
  };

  const generateHackerString = () => {
    const template = HACK_CODE_TEMPLATES[Math.floor(Math.random() * HACK_CODE_TEMPLATES.length)];
    const isProgress = template.includes('{PROGRESS}');
    
    let text = template;
    
    // Replacements
    if (text.includes('{IP}')) text = text.replace('{IP}', `192.168.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`);
    if (text.includes('{PORT}')) text = text.replace('{PORT}', Math.floor(Math.random()*65535).toString());
    if (text.includes('{HEX}')) text = text.replace(/{HEX}/g, () => getRandomHex());
    if (text.includes('{NUMBER}')) text = text.replace(/{NUMBER}/g, () => Math.floor(Math.random()*9999).toString());
    if (text.includes('{FILE}')) text = text.replace('{FILE}', getRandomHex(8) + EXTENSIONS[Math.floor(Math.random()*EXTENSIONS.length)]);
    if (text.includes('{TARGET}')) text = text.replace('{TARGET}', TARGETS[Math.floor(Math.random()*TARGETS.length)]);
    if (text.includes('{DIR}')) text = text.replace('{DIR}', DIRECTORIES[Math.floor(Math.random()*DIRECTORIES.length)]);
    if (text.includes('{FUNC}')) text = text.replace('{FUNC}', ['main', 'init', 'hack', 'override', 'loop'][Math.floor(Math.random()*5)]);
    if (text.includes('{COMMAND}')) text = text.replace('{COMMAND}', COMMANDS[Math.floor(Math.random()*COMMANDS.length)]);
    if (text.includes('{ERROR}')) text = text.replace('{ERROR}', ERRORS[Math.floor(Math.random()*ERRORS.length)]);
    
    return { text, isProgress };
  };

  useEffect(() => {
    if (!effects.cyberHack.enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = (timestamp: number) => {
      const w = canvas.width = canvas.offsetWidth;
      const h = canvas.height = canvas.offsetHeight;
      
      const { speed: printSpeed, scale: cyberScale, opacity: cyberOpacity, backgroundOpacity: bgOpacity } = configRef.current;
      const baseSpeed = Math.max(0.1, printSpeed);

      // --- 1. Line Generation Logic ---
      if (!currentLineRef.current) {
        const { text, isProgress } = generateHackerString();
        
        let color = '#00ff00';
        if (text.includes('ERROR') || text.includes('FAILED') || text.includes('DENIED') || text.includes('ALERT')) color = '#ff3333';
        else if (text.includes('WARNING') || text.includes('Running')) color = '#ffff00';
        else if (text.startsWith('>')) color = '#00f3ff';
        else if (text.includes('SUCCESS') || text.includes('GRANTED') || text.includes('Neon Waves') || text.includes('MeowMaster')) color = '#00ff00';
        else if (text.includes('Admin')) color = '#bc13fe'; // Purple for Admin

        // Difficulty determines how fast a progress bar fills or text types
        // Range 0.5 (Slow/Hard) to 2.0 (Fast/Easy)
        const difficulty = 0.5 + Math.random() * 2.5;

        currentLineRef.current = { 
            fullText: text, 
            displayed: "", 
            color, 
            isProgress, 
            progressVal: 0,
            difficulty,
            nextCharDelay: 0
        };
        charIdxRef.current = 0;
        
        // Initial delay before starting new line
        nextStepDelayRef.current = (100 + Math.random() * 200) / baseSpeed; 
      }

      // --- 2. Update Logic ---
      if (timestamp - lastStepTimeRef.current > nextStepDelayRef.current) {
        lastStepTimeRef.current = timestamp;
        const line = currentLineRef.current;
        
        if (line.isProgress) {
          // Progress Bar Logic
          // Chance to hang/stall (simulating network lag)
          const isStalled = Math.random() > 0.85; 
          
          if (!isStalled && line.progressVal < 100) {
            // Variable increment based on "difficulty"
            const increment = Math.max(1, Math.floor(Math.random() * 10 * line.difficulty));
            line.progressVal = Math.min(100, line.progressVal + increment);
            
            const barLength = 20;
            const filled = Math.floor((line.progressVal / 100) * barLength);
            const empty = barLength - filled;
            const bar = `[${'#'.repeat(filled)}${'.'.repeat(empty)}]`;
            
            line.displayed = line.fullText.replace('{PROGRESS}', `${line.progressVal}% ${bar}`);
            
            // Speed of updates
            nextStepDelayRef.current = (30 + Math.random() * 50) / (baseSpeed * line.difficulty);
          } else if (line.progressVal >= 100) {
             // Finish
             terminalLinesRef.current.push({ text: line.displayed, color: line.color, timestamp });
             currentLineRef.current = null;
          } else {
             // Stalled state delay
             nextStepDelayRef.current = (200 + Math.random() * 300) / baseSpeed;
          }

        } else {
          // Standard Typing Logic
          if (charIdxRef.current < line.fullText.length) {
            const char = line.fullText[charIdxRef.current];
            line.displayed += char;
            charIdxRef.current++;
            
            // Dynamic Delay Calculation for Natural Typing
            let delay = (10 + Math.random() * 30); // Base jitter

            // Slow down on punctuation
            if (char === '.' || char === ',' || char === ':') delay += 150;
            else if (char === ' ') delay += 20;
            else if (char === '/') delay += 50; // Pause on directory slashes

            // Random "burst" speed (hacker typing fast)
            if (Math.random() > 0.8) delay = 5;

            nextStepDelayRef.current = delay / (baseSpeed * line.difficulty);

          } else {
            // Line Finished
            terminalLinesRef.current.push({ text: line.displayed, color: line.color, timestamp });
            currentLineRef.current = null;
          }
        }
        
        if (terminalLinesRef.current.length > 40) terminalLinesRef.current.shift();
      }

      // --- 3. Render Logic ---
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      
      const history = terminalLinesRef.current;
      const fontSize = Math.floor(16 * cyberScale);
      const lineHeight = fontSize * 1.5;
      const startY = h - (40 * cyberScale); // Bottom margin
      
      // Draw Background Plate
      if (bgOpacity > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${bgOpacity})`;
        const totalLinesHeight = (history.length + 2) * lineHeight;
        const plateTop = Math.max(0, startY - totalLinesHeight);
        const plateWidth = Math.min(w * 0.9, 800 * cyberScale);
        
        ctx.fillRect(0, plateTop, plateWidth, h - plateTop);
        ctx.strokeStyle = `rgba(0, 255, 0, ${bgOpacity * 0.4})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(0, plateTop, plateWidth, h - plateTop);
      }

      ctx.globalAlpha = cyberOpacity;
      ctx.font = `bold ${fontSize}px "Courier New", monospace`;

      // Render Active Line (Typing)
      if (currentLineRef.current) {
        ctx.fillStyle = currentLineRef.current.color;
        const prefix = "> ";
        const fullStr = prefix + currentLineRef.current.displayed;
        
        ctx.fillText(fullStr, 20, startY);

        // --- BLINKING CURSOR ---
        // Blink every 500ms
        const blink = Math.floor(timestamp / 500) % 2 === 0;
        if (blink) {
            const measured = ctx.measureText(fullStr);
            ctx.fillRect(20 + measured.width + 2, startY - fontSize + 4, fontSize * 0.6, fontSize);
        }
      } else {
          // Idle Cursor (waiting for next line)
          const blink = Math.floor(timestamp / 500) % 2 === 0;
          if (blink) {
            ctx.fillStyle = '#00ff00';
            ctx.fillText("> ", 20, startY);
            const measured = ctx.measureText("> ");
            ctx.fillRect(20 + measured.width, startY - fontSize + 4, fontSize * 0.6, fontSize);
          }
      }

      // Render History (Bottom-Up)
      for (let i = 0; i < history.length; i++) {
        const line = history[history.length - 1 - i];
        const y = startY - (i + 1) * lineHeight;
        if (y < -fontSize) break; // Optimization
        
        // Fade out top lines
        const fade = Math.min(1, Math.max(0, y / (h * 0.5)));
        ctx.globalAlpha = fade * cyberOpacity;
        
        ctx.fillStyle = line.color;
        // Strip ">" from history to make it look cleaner, or add indent
        ctx.fillText(`  ${line.text}`, 20, y);
      }
      ctx.restore();
      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [effects.cyberHack.enabled]);

  if (!effects.cyberHack.enabled) return null;

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-20 pointer-events-none" />;
};

export default CyberHackEffect;
