'use client';

import React, { useState, useEffect } from 'react';
import { OfflineScreen } from './OfflineScreen';
import { NativeSplashScreen } from './NativeSplashScreen';
import { InstallBanner } from './InstallBanner';
import { UpdateToast } from './UpdateToast';
import { isPushSupported, requestNotificationPermission, subscribeToPush } from '@/lib/pushNotifications';

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
          setTimeout(() => setSwRegistration(reg), 0);
          
          // After SW is ready, attempt push subscription
          if (isPushSupported() && Notification.permission === 'granted') {
            subscribeToPush().catch(() => {});
          }
        })
        .catch((err) => {
          console.error('Service Worker registration failed:', err);
        });
    }

    // Capture install prompt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setTimeout(() => setDeferredPrompt(e), 0);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Track app launches in standalone mode for analytics
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone);
    if (isStandalone) {
      const launchCount = parseInt(localStorage.getItem('pingme_pwa_launches') || '0', 10) + 1;
      localStorage.setItem('pingme_pwa_launches', launchCount.toString());
    }

    // Auto-request notification permission after user engagement
    const requestPushOnEngagement = () => {
      if (isPushSupported() && Notification.permission === 'default') {
        const msgCount = parseInt(localStorage.getItem('pingme_msg_count') || '0', 10);
        if (msgCount >= 3) {
          requestNotificationPermission().then((perm) => {
            if (perm === 'granted') {
              subscribeToPush().catch(() => {});
            }
          });
        }
      }
    };

    window.addEventListener('pingme_message_sent', requestPushOnEngagement);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pingme_message_sent', requestPushOnEngagement);
    };
  }, []);

  const handleInstallSuccess = () => {
    setDeferredPrompt(null);
    localStorage.setItem('pingme_install_count', (parseInt(localStorage.getItem('pingme_install_count') || '0', 10) + 1).toString());
    
    // After install, subscribe to push notifications
    if (isPushSupported()) {
      requestNotificationPermission().then((perm) => {
        if (perm === 'granted') {
          subscribeToPush().catch(() => {});
        }
      });
    }
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
