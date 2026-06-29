'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

export type KeyboardState = 'Closed' | 'Opening' | 'Open' | 'Closing';

/**
 * useKeyboardHandler (Architecture V2 Production Final)
 * 
 * Drives mobile chat layout sizing strictly via VisualViewport awareness without page translation.
 * Returns `keyboardHeight` so only the composer bottom offset adjusts, allowing flex:1 message list
 * to resize naturally while keeping the root container locked at 100dvh.
 */
export function useKeyboardHandler() {
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const [keyboardState, setKeyboardState] = useState<KeyboardState>('Closed');
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const maxKnownHeight = useRef<number>(0);
  const rafId = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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

      const baseline = Math.max(window.innerHeight, maxKnownHeight.current);
      const diff = baseline - h;
      const currentlyOpen = diff > 100;

      if (currentlyOpen) {
        setKeyboardHeight(diff);
        // Ensure Safari does not pan the document layout viewport
        if (window.scrollY !== 0 || window.scrollX !== 0) {
          window.scrollTo(0, 0);
        }
      } else {
        setKeyboardHeight(0);
      }

      setIsKeyboardOpen((prevOpen) => {
        if (prevOpen !== currentlyOpen) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);

          if (currentlyOpen) {
            setKeyboardState('Opening');
            timeoutRef.current = setTimeout(() => setKeyboardState('Open'), 150);
          } else {
            setKeyboardState('Closing');
            timeoutRef.current = setTimeout(() => setKeyboardState('Closed'), 150);
          }
        }
        return currentlyOpen;
      });
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
    setTimeout(() => {
      setViewportHeight(Math.round(vv.height));
    }, 0);

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('resize', update);

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
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', onOrientation);
      if (rafId.current) cancelAnimationFrame(rafId.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [update]);

  return { viewportHeight, keyboardHeight, offsetTop: 0, isKeyboardOpen, keyboardState };
}
