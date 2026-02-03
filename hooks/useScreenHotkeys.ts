import React, { useEffect, useRef, useState, useCallback } from 'react';
import { VisualizerConfig } from '../types';
import { useNotification } from '../contexts/NotificationContext';

export type ActivePanelType = 'quantity' | 'power' | 'freq' | 'opacity' | null;

interface UseScreenHotkeysProps {
  containerRef: React.RefObject<HTMLDivElement>;
  visualizerConfig: VisualizerConfig;
  setVisualizerConfig?: (c: VisualizerConfig) => void;
  setShowHelp: (v: boolean | ((prev: boolean) => boolean)) => void;
}

export const useScreenHotkeys = ({
  containerRef,
  visualizerConfig,
  setVisualizerConfig,
  setShowHelp
}: UseScreenHotkeysProps) => {
  const { addNotification } = useNotification();
  
  const [activePanel, setActivePanel] = useState<ActivePanelType>(null);
  const [panelPos, setPanelPos] = useState({ x: 0, y: 0 });
  const mousePosRef = useRef({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
      if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          mousePosRef.current = {
              x: e.clientX - rect.left,
              y: e.clientY - rect.top
          };
      }
  }, [containerRef]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          const target = e.target as HTMLElement;
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
          if (e.repeat) return;
          if (e.ctrlKey || e.altKey || e.metaKey) return;

          // Visualizer Config Shortcuts
          if (setVisualizerConfig) {
              if (e.code === 'KeyT') {
                  setVisualizerConfig({ ...visualizerConfig, position: 'top' });
                  addNotification("WAVEFORM: TOP", "info");
              } else if (e.code === 'KeyB') {
                  setVisualizerConfig({ ...visualizerConfig, position: 'bottom' });
                  addNotification("WAVEFORM: BOTTOM", "info");
              } else if (e.code === 'KeyC' && !e.shiftKey) { 
                  setVisualizerConfig({ ...visualizerConfig, position: 'center' });
                  addNotification("WAVEFORM: CENTER", "info");
              } else if (e.code === 'KeyN') {
                  setVisualizerConfig({ ...visualizerConfig, normalize: !visualizerConfig.normalize });
                  addNotification(`NORMALIZE: ${!visualizerConfig.normalize ? 'ON' : 'OFF'}`, "info");
              } else if (e.code === 'KeyM') {
                  setVisualizerConfig({ ...visualizerConfig, mirror: !visualizerConfig.mirror });
                  addNotification(`MIRROR: ${!visualizerConfig.mirror ? 'ON' : 'OFF'}`, "info");
              } else if (e.code === 'KeyR') {
                  setVisualizerConfig({ ...visualizerConfig, preventVolumeScaling: !visualizerConfig.preventVolumeScaling });
                  addNotification(`IGNORE VOLUME: ${!visualizerConfig.preventVolumeScaling ? 'ON' : 'OFF'}`, "info");
              }
          }

          // Panel Shortcuts
          const togglePanel = (type: ActivePanelType) => {
              if (activePanel === type) setActivePanel(null);
              else {
                  setActivePanel(type);
                  setPanelPos({ ...mousePosRef.current });
              }
          };

          if (e.code === 'KeyQ') togglePanel('quantity');
          else if (e.code === 'KeyW') togglePanel('power');
          else if (e.code === 'KeyE') togglePanel('freq');
          else if (e.code === 'KeyY') togglePanel('opacity');
          
          // Help Shortcut
          else if (e.code === 'KeyH') {
              setShowHelp(prev => !prev);
          } else if (e.code === 'Escape') {
              setActivePanel(null);
              setShowHelp(false); 
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visualizerConfig, setVisualizerConfig, activePanel, addNotification, setShowHelp]);

  return {
    activePanel,
    setActivePanel,
    panelPos,
    handleMouseMove
  };
};