'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * useKeyboardHandler
 * 
 * Accurately tracks visual viewport height and offsetTop using window.visualViewport.
 * When the keyboard opens on iOS/Android, the browser may resize the visual viewport
 * and scroll the layout viewport (changing offsetTop).
 * 
 * By returning both `viewportHeight` and `offsetTop`, the application container
 * can position itself exactly over the visible screen area, ensuring the Header
 * never moves and the Composer stays attached directly above the keyboard.
 */
export function useKeyboardHandler() {
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [offsetTop, setOffsetTop] = useState<number>(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const maxKnownHeight = useRef<number>(0);
  const rafId = useRef<number>(0);

  const update = useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);

    rafId.current = requestAnimationFrame(() => {
      const vv = window.visualViewport;
      if (!vv) return;

      const h = Math.round(vv.height);
      const top = Math.round(vv.offsetTop);

      setViewportHeight(h);
      setOffsetTop(top);

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
    setTimeout(() => {
      setViewportHeight(Math.round(vv.height));
      setOffsetTop(Math.round(vv.offsetTop));
    }, 0);

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update);

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
      window.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', onOrientation);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [update]);

  return { viewportHeight, offsetTop, isKeyboardOpen };
}
