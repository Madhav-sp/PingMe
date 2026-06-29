'use client';

/**
 * Push notification subscription management.
 * 
 * This module handles:
 * - Requesting notification permission
 * - Subscribing to push notifications via the Push API
 * - Saving/refreshing subscriptions
 * - Checking support across browsers
 */

const SUBSCRIPTION_KEY = 'pingme_push_sub';

/** Check if push notifications are supported */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Check if the app is running as an installed PWA */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
  );
}

/** Request notification permission. Returns the permission state. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';

  return Notification.requestPermission();
}

/** 
 * Subscribe to push notifications.
 * Returns the PushSubscription or null if failed.
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') return null;

    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Create a new subscription
      // Using a VAPID public key placeholder — in production, replace with your real key
      // For local notifications (no server push), we can still use the Notification API directly
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // In production, set applicationServerKey to your VAPID public key
        // applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }).catch(() => null);
    }

    if (subscription) {
      // Persist the subscription state
      localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify({
        subscribed: true,
        timestamp: Date.now(),
      }));
    }

    return subscription;
  } catch {
    return null;
  }
}

/** Show a local notification (foreground). */
export async function showLocalNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/monochrome-icon-512x512.png',
      vibrate: [100, 50, 100],
      ...options,
    } as NotificationOptions);
  } catch {
    // Fallback to basic Notification API
    try {
      new Notification(title, {
        icon: '/icons/icon-192x192.png',
        ...options,
      });
    } catch {
      // Notifications not available
    }
  }
}

/** Check if we have an active push subscription */
export async function hasActiveSubscription(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}

/** Unsubscribe from push notifications */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      localStorage.removeItem(SUBSCRIPTION_KEY);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
