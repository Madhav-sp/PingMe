'use client';

import { useState, useEffect } from 'react';
import { Download, X, Zap, Maximize2, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic } from '@/lib/haptics';

interface InstallBannerProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deferredPrompt: any;
  onInstallSuccess: () => void;
}

export function InstallBanner({ deferredPrompt, onInstallSuccess }: InstallBannerProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already installed or dismissed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone);
    const dismissed = localStorage.getItem('pingme_install_dismissed');

    if (isStandalone || dismissed === 'true') {
      return;
    }

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
    setTimeout(() => setIsIOS(ios), 0);

    // If neither deferredPrompt nor iOS, don't show
    if (!deferredPrompt && !ios) return;

    // Check triggers: 5 messages OR 2.5 minutes usage
    const checkEligibility = () => {
      const msgCount = parseInt(localStorage.getItem('pingme_msg_count') || '0', 10);
      const startTime = parseInt(sessionStorage.getItem('pingme_start_time') || Date.now().toString(), 10);
      sessionStorage.setItem('pingme_start_time', startTime.toString());

      const timeElapsed = Date.now() - startTime;
      if (msgCount >= 5 || timeElapsed >= 150000) { // 2.5 mins = 150000ms
        setTimeout(() => setShowBanner(true), 0);
      }
    };

    checkEligibility();
    const timer = setInterval(checkEligibility, 10000);
    window.addEventListener('pingme_message_sent', checkEligibility);

    return () => {
      clearInterval(timer);
      window.removeEventListener('pingme_message_sent', checkEligibility);
    };
  }, [deferredPrompt]);

  const handleInstall = async () => {
    triggerHaptic('medium');
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        triggerHaptic('success');
        onInstallSuccess();
        setShowBanner(false);
      }
    } else if (isIOS) {
      alert("To install on iOS:\n1. Tap the Share button ⎋ at the bottom of Safari\n2. Select 'Add to Home Screen' ➕");
    }
  };

  const handleDismiss = () => {
    triggerHaptic('light');
    localStorage.setItem('pingme_install_dismissed', 'true');
    setShowBanner(false);
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-slate-900 dark:bg-slate-800 border border-slate-700/80 text-white p-5 rounded-3xl shadow-2xl backdrop-blur-xl"
        >
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800/50"
            aria-label="Close install prompt"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Enjoying PingMe?</h3>
              <p className="text-xs text-slate-300">Install the app for the ultimate experience</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 my-4 bg-slate-950/50 p-3.5 rounded-2xl border border-slate-800 text-xs text-slate-200">
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span><strong>Faster launch</strong> with instant loading</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Maximize2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span><strong>Fullscreen experience</strong> with zero browser UI</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-emerald-400 shrink-0" />
              <span><strong>Better notifications</strong> right on your home screen</span>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleDismiss}
              className="flex-1 py-3 rounded-xl font-semibold text-xs text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              {isIOS ? 'How to Install' : 'Install App'}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
