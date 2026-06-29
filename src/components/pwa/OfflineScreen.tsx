'use client';

import { useState, useEffect } from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function OfflineScreen() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== 'undefined') {
      setTimeout(() => setIsOffline(!navigator.onLine), 0);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-2 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-slate-900/95 dark:bg-slate-800/95 border border-slate-700 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 text-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 text-red-400 rounded-xl">
              <WifiOff className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="font-semibold flex items-center gap-1.5 text-red-400">
                <span>📶 Offline Mode</span>
              </div>
              <div className="text-xs text-slate-300 flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Read chats</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Browse history</span>
              </div>
            </div>
          </div>
          <div className="text-[11px] font-medium text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 animate-pulse">
            Waiting...
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
