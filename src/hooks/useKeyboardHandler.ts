'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * useKeyboardHandler
 * 
 * Controls the chat container height using window.visualViewport.height.
 * 
 * Strategy:
 * - Returns `viewportHeight` which is always `visualViewport.height`
 * - The chat container sets its height to this value directly
 * - When the keyboard opens, visualViewport.height shrinks → container shrinks
 * - The flex layout (header + messages + composer) naturally adjusts
 * - No padding tricks, no double-adjustment, no gaps
 * 
 * Works on:
 * - iOS Safari (where layout viewport does NOT resize with keyboard)
 * - Android Chrome (where layout viewport DOES resize)
 * - Samsung Internet, Edge, installed PWAs
 */
export function useKeyboardHandler() {
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const initialHeight = useRef<number>(0);
  const rafId = useRef<number>(0);

  const update = useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);

    rafId.current = requestAnimationFrame(() => {
      const vv = window.visualViewport;
      if (!vv) return;

      const h = Math.round(vv.height);
      setViewportHeight(h);

      // Keyboard is open if viewport shrank by more than 150px
      // (accounts for mobile browser chrome changes)
      const diff = initialHeight.current - h;
      setIsKeyboardOpen(diff > 150);
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const vv = window.visualViewport;
    if (!vv) {
      // Fallback for browsers without Visual Viewport API
      setTimeout(() => setViewportHeight(window.innerHeight), 0);
      return;
    }

    // Capture the initial height (no keyboard)
    initialHeight.current = Math.round(vv.height);
    setTimeout(() => setViewportHeight(initialHeight.current), 0);

    vv.addEventListener('resize', update);

    // Reset initial height on orientation change
    const onOrientation = () => {
      setTimeout(() => {
        if (vv) {
          initialHeight.current = Math.round(vv.height);
          update();
        }
      }, 500);
    };
    window.addEventListener('orientationchange', onOrientation);

    return () => {
      vv.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', onOrientation);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [update]);

  return { viewportHeight, isKeyboardOpen };
}
