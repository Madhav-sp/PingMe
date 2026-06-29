'use client';

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic } from '@/lib/haptics';

interface UpdateToastProps {
  registration: ServiceWorkerRegistration | null;
}

export function UpdateToast({ registration }: UpdateToastProps) {
  const [showToast, setShowToast] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!registration) return;

    if (registration.waiting) {
      setTimeout(() => {
        setWaitingWorker(registration.waiting);
        setShowToast(true);
      }, 0);
    }

    const handleUpdateFound = () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setShowToast(true);
          }
        });
      }
    };

    registration.addEventListener('updatefound', handleUpdateFound);

    let refreshing = false;
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      registration.removeEventListener('updatefound', handleUpdateFound);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [registration]);

  const handleUpdate = () => {
    triggerHaptic('medium');
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    triggerHaptic('light');
    setShowToast(false);
  };

  return (
    <AnimatePresence>
      {showToast && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm bg-blue-600 border border-blue-400 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 text-xs font-medium"
        >
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>New Version Available</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDismiss}
              className="px-2 py-1.5 rounded-lg bg-blue-700/60 hover:bg-blue-700 text-blue-100 transition-colors"
            >
              Later
            </button>
            <button
              onClick={handleUpdate}
              className="px-3 py-1.5 rounded-lg bg-white text-blue-600 font-bold hover:bg-blue-50 transition-colors shadow-sm"
            >
              Update Now
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
