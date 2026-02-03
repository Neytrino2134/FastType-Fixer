
import React, { useRef, useCallback } from 'react';

export const useSettingsScroll = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const scrollTop = useRef(0);
  const startPageY = useRef(0); 
  const wasDragged = useRef(false); 

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
      if (!isDragging.current || !scrollContainerRef.current) return;
      e.preventDefault();
      
      const movedY = Math.abs(e.pageY - startPageY.current);
      if (!wasDragged.current && movedY > 5) {
          wasDragged.current = true;
          document.body.classList.add('app-dragging');
      }

      const y = e.pageY - scrollContainerRef.current.offsetTop;
      const walk = (y - startY.current); 
      scrollContainerRef.current.scrollTop = scrollTop.current - walk;
  }, []);

  const handleGlobalMouseUp = useCallback(() => {
      isDragging.current = false;
      document.body.classList.remove('app-dragging');
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [handleGlobalMouseMove]);

  const handleMouseDown = (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      // Ignore interactive elements
      if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('button') || target.tagName === 'SELECT') {
          return;
      }

      if (scrollContainerRef.current) {
          isDragging.current = true;
          wasDragged.current = false;
          startY.current = e.pageY - scrollContainerRef.current.offsetTop;
          scrollTop.current = scrollContainerRef.current.scrollTop;
          startPageY.current = e.pageY;
          
          window.addEventListener('mousemove', handleGlobalMouseMove);
          window.addEventListener('mouseup', handleGlobalMouseUp);
      }
  };

  const safeAction = (fn: () => void) => {
      if (!wasDragged.current) fn();
  };

  return {
      scrollContainerRef,
      handleMouseDown,
      safeAction
  };
};
