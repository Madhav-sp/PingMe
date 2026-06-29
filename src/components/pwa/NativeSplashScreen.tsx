'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function NativeSplashScreen() {
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if launched as standalone PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone);
    const hasSeenSplash = sessionStorage.getItem('pingme_splash_shown');

    if (isStandalone && !hasSeenSplash) {
      setTimeout(() => setShowSplash(true), 0);
      sessionStorage.setItem('pingme_splash_shown', 'true');
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 500); // 500ms feel expensive and native
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <AnimatePresence>
      {showSplash && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] bg-[#0f172a] flex flex-col items-center justify-between py-16 text-white select-none"
        >
          <div />
          <div className="flex flex-col items-center gap-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-600 to-blue-500 shadow-2xl flex items-center justify-center p-4 ring-1 ring-white/10"
            >
              <svg viewBox="0 0 512 512" className="w-14 h-14 fill-white">
                <path d="M160 140 H352 C387.3 140 416 168.7 416 204 V308 C416 343.3 387.3 372 352 372 H240 L160 420 V372 C124.7 372 96 343.3 96 308 V204 C96 168.7 124.7 140 160 140 Z" />
              </svg>
            </motion.div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              PingMe
            </h1>
          </div>
          <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Connecting...
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
