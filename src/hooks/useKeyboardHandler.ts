'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * useKeyboardHandler - A hook that uses the Visual Viewport API to detect
 * the mobile keyboard and dynamically adjust the chat layout so that:
 * - The header stays fixed at top
 * - The composer stays fixed directly above the keyboard
 * - Only the message container resizes
 * - No viewport jumping, no white gaps, no layout shift
 */
export function useKeyboardHandler() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const previousViewportHeight = useRef<number>(0);
  const stableOuterHeight = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const handleViewportResize = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      const vv = window.visualViewport;
      if (!vv) return;

      // Use the stable outer height captured on first load
      // vs the visual viewport height to determine keyboard presence
      const currentViewportHeight = vv.height;
      const fullHeight = stableOuterHeight.current || window.innerHeight;
      const diff = fullHeight - currentViewportHeight;

      // Consider keyboard open if diff > 100px (accounts for browser chrome)
      const kbOpen = diff > 100;
      const kbHeight = kbOpen ? diff : 0;

      setKeyboardHeight(kbHeight);
      setIsKeyboardOpen(kbOpen);

      previousViewportHeight.current = currentViewportHeight;
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Capture stable height on mount (before any keyboard)
    stableOuterHeight.current = window.innerHeight;
    previousViewportHeight.current = window.innerHeight;

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', handleViewportResize);
      vv.addEventListener('scroll', handleViewportResize);
    }

    // Also track orientation changes to reset stable height
    const handleOrientationChange = () => {
      setTimeout(() => {
        stableOuterHeight.current = window.innerHeight;
        handleViewportResize();
      }, 300);
    };

    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      if (vv) {
        vv.removeEventListener('resize', handleViewportResize);
        vv.removeEventListener('scroll', handleViewportResize);
      }
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [handleViewportResize]);

  return { keyboardHeight, isKeyboardOpen };
}
