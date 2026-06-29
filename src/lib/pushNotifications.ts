'use client';

/**
 * Push notification subscription management.
 * 
 * This module handles:
 * - Requesting notification permission
 * - Subscribing to push notifications via the Push API with VAPID key validation
 * - Syncing subscriptions with /api/push/subscribe endpoint
 * - Checking support across browsers and PWAs
 */

const SUBSCRIPTION_KEY = 'pingme_push_sub';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

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

  const perm = await Notification.requestPermission();
  console.log(`[Push Client] Permission requested: ${perm}`);
  return perm;
}

/** 
 * Subscribe to push notifications and register with server.
 * Returns the PushSubscription or null if failed.
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    console.warn("[Push Client] Push notifications not supported by this browser.");
    return null;
  }

  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn("[Push Client] Notification permission denied.");
      return null;
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim().replace(/^["']|["']$/g, "");
    if (!vapidKey) {
      console.error("[Push Client] CRITICAL: NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing from environment variables.");
      return null;
    }

    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      console.log("[Push Client] Generating new Web Push subscription...");
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as BufferSource,
      }).catch((err) => {
        console.error("[Push Client] pushManager.subscribe failure:", err);
        return null;
      });
    }

    if (subscription) {
      console.log("[Push Client] Syncing subscription with server endpoint...");
      const subJson = subscription.toJSON();
      
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      }).catch((err) => {
        console.error("[Push Client] Network error syncing subscription:", err);
        return null;
      });

      if (res && res.ok) {
        console.log("[Push Client] Server confirmed push subscription storage.");
        localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify({
          subscribed: true,
          timestamp: Date.now(),
        }));
      } else {
        console.error("[Push Client] Server rejected subscription registration:", res?.status);
      }
    }

    return subscription;
  } catch (error) {
    console.error("[Push Client] Unexpected error in subscribeToPush:", error);
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
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      localStorage.removeItem(SUBSCRIPTION_KEY);

      console.log("[Push Client] Removing endpoint from server...");
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      }).catch(() => null);

      return true;
    }
    return false;
  } catch {
    return false;
  }
}
