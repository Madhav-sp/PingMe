// Optional: Create this hook if you need more advanced keyboard detection
// src/hooks/useViewportHeight.js

import { useState, useEffect } from "react";

export const useViewportHeight = () => {
  const [viewportHeight, setViewportHeight] = useState(() => {
    if (typeof window !== "undefined") {
      return window.visualViewport?.height || window.innerHeight;
    }
    return 0;
  });

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) {
      return;
    }

    const handleViewportChange = () => {
      const currentHeight = window.visualViewport.height;
      const windowHeight = window.innerHeight;

      setViewportHeight(currentHeight);

      // Consider keyboard open if viewport is significantly smaller than window
      const keyboardOpen = currentHeight < windowHeight * 0.75;
      setIsKeyboardOpen(keyboardOpen);

      // Add class to body for CSS targeting
      document.body.classList.toggle("keyboard-open", keyboardOpen);
    };

    window.visualViewport.addEventListener("resize", handleViewportChange);
    window.visualViewport.addEventListener("scroll", handleViewportChange);

    return () => {
      window.visualViewport.removeEventListener("resize", handleViewportChange);
      window.visualViewport.removeEventListener("scroll", handleViewportChange);
      document.body.classList.remove("keyboard-open");
    };
  }, []);

  return { viewportHeight, isKeyboardOpen };
};

// Usage in your Home component:
// const { isKeyboardOpen } = useViewportHeight();
// Then you can conditionally apply styles based on isKeyboardOpen
