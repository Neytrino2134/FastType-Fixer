import React, { useRef, useCallback } from 'react';
import { TOUCH_CONFIG } from '../config/touchConfig';

interface GestureHandlers {
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export const useGestures = (handlers: GestureHandlers) => {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const longPressTimerRef = useRef<number | null>(null);
  const isSwipeRef = useRef<boolean>(false);

  const triggerHaptic = (pattern: number[]) => {
    if (TOUCH_CONFIG.HAPTIC_ENABLED && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    isSwipeRef.current = false;

    // Setup Long Press
    if (handlers.onLongPress) {
      longPressTimerRef.current = window.setTimeout(() => {
        if (!isSwipeRef.current && touchStartRef.current) {
          triggerHaptic(TOUCH_CONFIG.HAPTIC_PATTERNS.LONG_PRESS);
          handlers.onLongPress?.();
          touchStartRef.current = null; // Invalidate current interaction
        }
      }, TOUCH_CONFIG.LONG_PRESS_DELAY);
    }
  }, [handlers]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const diffX = Math.abs(touch.clientX - touchStartRef.current.x);
    const diffY = Math.abs(touch.clientY - touchStartRef.current.y);

    // If moved significantly, cancel long press and mark as potential swipe
    if (diffX > 10 || diffY > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      isSwipeRef.current = true;
    }
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const endTime = Date.now();
    const startX = touchStartRef.current.x;
    const startY = touchStartRef.current.y;
    const diffX = touch.clientX - startX;
    const diffY = touch.clientY - startY;
    const duration = endTime - touchStartRef.current.time;

    // 1. Handle Swipe
    if (isSwipeRef.current && duration < TOUCH_CONFIG.SWIPE_TIMEOUT) {
      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);

      if (Math.max(absX, absY) > TOUCH_CONFIG.SWIPE_THRESHOLD) {
        if (absX > absY) {
          // Horizontal
          if (diffX > 0) handlers.onSwipeRight?.();
          else handlers.onSwipeLeft?.();
        } else {
          // Vertical
          if (diffY > 0) handlers.onSwipeDown?.();
          else handlers.onSwipeUp?.();
        }
        triggerHaptic(TOUCH_CONFIG.HAPTIC_PATTERNS.SUCCESS);
      }
    } 
    // 2. Handle Taps
    else if (!isSwipeRef.current) {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapTimeRef.current;

      if (timeSinceLastTap < TOUCH_CONFIG.DOUBLE_TAP_DELAY && handlers.onDoubleTap) {
        // Double Tap
        handlers.onDoubleTap();
        triggerHaptic(TOUCH_CONFIG.HAPTIC_PATTERNS.SUCCESS);
        lastTapTimeRef.current = 0; // Reset
      } else {
        // Single Tap
        // We delay single tap slightly in case a double tap comes in, 
        // OR fire immediately if no double tap handler exists to speed up interface
        if (handlers.onDoubleTap) {
           // If we need to wait for double tap, we strictly rely on the next tap or timeout.
           // However, for UI responsiveness, usually we fire onTap anyway unless conflicting.
           // Here we update the ref for the NEXT event check.
           lastTapTimeRef.current = now;
           handlers.onTap?.();
        } else {
           handlers.onTap?.();
           triggerHaptic(TOUCH_CONFIG.HAPTIC_PATTERNS.SUCCESS);
        }
      }
    }

    touchStartRef.current = null;
    isSwipeRef.current = false;
  }, [handlers]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
};