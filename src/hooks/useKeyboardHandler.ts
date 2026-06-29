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
 */
export function useKeyboardHandler() {
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const maxKnownHeight = useRef<number>(0);
  const rafId = useRef<number>(0);

  const update = useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);

    rafId.current = requestAnimationFrame(() => {
      const vv = window.visualViewport;
      if (!vv) return;

      const h = Math.round(vv.height);
      setViewportHeight(h);

      if (h > maxKnownHeight.current) {
        maxKnownHeight.current = h;
      }

      // Compare current visual viewport against window.innerHeight or known max height
      const baseline = Math.max(window.innerHeight, maxKnownHeight.current);
      const diff = baseline - h;
      setIsKeyboardOpen(diff > 120);
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const vv = window.visualViewport;
    if (!vv) {
      setTimeout(() => setViewportHeight(window.innerHeight), 0);
      return;
    }

    maxKnownHeight.current = Math.round(vv.height);
    setTimeout(() => setViewportHeight(maxKnownHeight.current), 0);

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);

    const onOrientation = () => {
      setTimeout(() => {
        if (vv) {
          maxKnownHeight.current = Math.round(vv.height);
          update();
        }
      }, 500);
    };
    window.addEventListener('orientationchange', onOrientation);

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', onOrientation);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [update]);

  return { viewportHeight, isKeyboardOpen };
}
