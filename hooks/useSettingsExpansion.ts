
import React, { useState, useEffect } from 'react';

// Map of Main Section ID -> Array of Child Module IDs
const SECTION_MODULES: Record<string, string[]> = {
  sys: ['files', 'presets', 'themes', 'debug'],
  bg: ['bg-settings', 'bg-resources', 'bg-colors', 'screen-share'],
  sfx: ['mixer', 'ambience', 'sysaudio'],
  waves: ['wave', 'reactor', 'sine'],
  mod: ['marquee', 'dvd', 'leaks', 'rain', 'hologram', 'gemini', 'scan', 'cyber', 'glitch'],
  game: ['tron'],
  post: ['fps', 'signal', 'chromatic', 'vignette', 'flicker']
};

export const useSettingsExpansion = (safeAction: (fn: () => void) => void, scrollRef: React.RefObject<HTMLDivElement>) => {
  // Module Expansion State
  const [expandedState, setExpandedState] = useState<Record<string, boolean>>({});
  
  // Section Expansion State (Collapsible Headers)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
      sys: true,
      bg: true,
      sfx: true,
      waves: true, 
      mod: true,
      game: true,
      post: true
  });

  const toggleExpand = (id: string, isAdditive: boolean, forceOpen?: boolean) => {
    safeAction(() => {
        setExpandedState(prev => {
            const isCurrentlyOpen = prev[id];
            let newState = { ...prev };
    
            if (isAdditive && forceOpen === undefined) {
                // Shift click: Toggle target, leave others alone
                newState[id] = !isCurrentlyOpen;
            } else {
                // Normal click OR Force Open: Accordion behavior within the section
                
                // 1. Identify which section this module belongs to
                let groupIds: string[] = [];
                for (const sectionKey in SECTION_MODULES) {
                    if (SECTION_MODULES[sectionKey].includes(id)) {
                        groupIds = SECTION_MODULES[sectionKey];
                        break;
                    }
                }
    
                // 2. Close all other modules in this group
                groupIds.forEach(siblingId => {
                    if (siblingId !== id) {
                        newState[siblingId] = false;
                    }
                });
    
                // 3. Toggle or Force Open the target module
                newState[id] = forceOpen !== undefined ? forceOpen : !isCurrentlyOpen;
            }
            
            return newState;
        });
    });
  };

  const handleSectionToggle = (sectionId: string, isAdditive: boolean = false) => {
      safeAction(() => {
          setOpenSections(prev => {
              const isCurrentlyOpen = prev[sectionId];
              let newState: Record<string, boolean> = { ...prev };
              
              if (!isCurrentlyOpen) {
                  setExpandedState({});
              }
    
              if (isAdditive) {
                  newState[sectionId] = !isCurrentlyOpen;
              } else {
                  Object.keys(prev).forEach(key => {
                      if (key !== sectionId && prev[key]) {
                          newState[key] = false;
                      }
                  });
                  newState[sectionId] = true;
              }
              
              return newState;
          });
      });
  };

  // --- HOTKEY LISTENERS ---
  useEffect(() => {
      const handleToggleModule = (e: CustomEvent) => {
          const moduleId = e.detail;
          if (moduleId) {
              // Ensure specific module is expanded (bypass safeAction for hotkeys)
              setExpandedState(prev => {
                  // Accordion logic for hotkey too
                  let newState = { ...prev };
                  let groupIds: string[] = [];
                  for (const sectionKey in SECTION_MODULES) {
                      if (SECTION_MODULES[sectionKey].includes(moduleId)) {
                          groupIds = SECTION_MODULES[sectionKey];
                          break;
                      }
                  }
                  groupIds.forEach(sid => newState[sid] = false);
                  newState[moduleId] = true;
                  return newState;
              });
              
              // Also ensure parent section is open
              for (const secId in SECTION_MODULES) {
                  if (SECTION_MODULES[secId].includes(moduleId)) {
                      setOpenSections(prev => ({ ...prev, [secId]: true }));
                      
                      // Auto-scroll to section header if needed
                      setTimeout(() => {
                          const header = document.getElementById(`section-header-${secId}`);
                          if (header && scrollRef.current) {
                              header.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                      }, 100);
                      break;
                  }
              }
          }
      };

      const handleToggleSection = (e: CustomEvent) => {
          const sectionId = e.detail;
          if (sectionId) {
              // Direct state update for hotkey
              setOpenSections(prev => {
                  let newState: Record<string, boolean> = { ...prev };
                  Object.keys(prev).forEach(key => {
                      if (key !== sectionId && prev[key]) newState[key] = false;
                  });
                  newState[sectionId] = true;
                  return newState;
              });

              // Scroll to
              setTimeout(() => {
                  const header = document.getElementById(`section-header-${sectionId}`);
                  if (header && scrollRef.current) {
                      header.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
              }, 100);
          }
      };

      window.addEventListener('neon-toggle-module', handleToggleModule as EventListener);
      window.addEventListener('neon-toggle-section', handleToggleSection as EventListener);

      return () => {
          window.removeEventListener('neon-toggle-module', handleToggleModule as EventListener);
          window.removeEventListener('neon-toggle-section', handleToggleSection as EventListener);
      };
  }, [scrollRef]);

  return {
      expandedState,
      openSections,
      toggleExpand,
      handleSectionToggle
  };
};
