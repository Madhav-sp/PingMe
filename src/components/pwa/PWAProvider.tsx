'use client';

import React, { useState, useEffect } from 'react';
import { OfflineScreen } from './OfflineScreen';
import { NativeSplashScreen } from './NativeSplashScreen';
import { InstallBanner } from './InstallBanner';
import { UpdateToast } from './UpdateToast';

export function PWAProvider({ children }: { children: React.ReactNode }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          setSwRegistration(reg);
        })
        .catch((err) => {
          console.error('Service Worker registration failed:', err);
        });
    }

    // Capture install prompt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Track app launches in standalone mode for analytics
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone);
    if (isStandalone) {
      const launchCount = parseInt(localStorage.getItem('pingme_pwa_launches') || '0', 10) + 1;
      localStorage.setItem('pingme_pwa_launches', launchCount.toString());
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallSuccess = () => {
    setDeferredPrompt(null);
    localStorage.setItem('pingme_install_count', (parseInt(localStorage.getItem('pingme_install_count') || '0', 10) + 1).toString());
  };

  return (
    <>
      <NativeSplashScreen />
      <OfflineScreen />
      <UpdateToast registration={swRegistration} />
      <InstallBanner deferredPrompt={deferredPrompt} onInstallSuccess={handleInstallSuccess} />
      {children}
    </>
  );
}
