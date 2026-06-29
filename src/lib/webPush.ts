import webPush from "web-push";
import prisma from "@/lib/prisma";

// Ensure strict VAPID environment configuration
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim().replace(/^["']|["']$/g, "");
const privateKey = process.env.VAPID_PRIVATE_KEY?.trim().replace(/^["']|["']$/g, "");
const subject = process.env.VAPID_SUBJECT?.trim().replace(/^["']|["']$/g, "") || "mailto:support@pingme.app";

let isVapidConfigured = false;
if (!publicKey || !privateKey) {
  console.error("[WebPush Service] CRITICAL: Missing VAPID keys (NEXT_PUBLIC_VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY). Push delivery will fail.");
} else {
  try {
    webPush.setVapidDetails(subject, publicKey, privateKey);
    isVapidConfigured = true;
    console.log("[WebPush Service] Successfully initialized VAPID configuration.");
  } catch (err) {
    console.error("[WebPush Service] Failed to initialize VAPID details:", err);
  }
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  url: string;
  tag?: string;
  conversationId?: string;
  messageId?: string;
  senderName?: string;
  senderAvatar?: string;
  timestamp?: number;
}

/**
 * Sends a rich Web Push notification to all subscribed endpoints for a specific user.
 * Handles retries for transient network failures and cleans up expired/unsubscribed (404/410) endpoints.
 */
export async function sendPushNotificationToUser(userId: string, payload: PushPayload): Promise<{ sent: number; failed: number; cleaned: number }> {
  if (!isVapidConfigured) {
    console.error(`[WebPush Service] Cannot send notification to user ${userId}: VAPID not configured.`);
    return { sent: 0, failed: 0, cleaned: 0 };
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0, cleaned: 0 };
  }

  const jsonPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: payload.badge || "/icons/monochrome-icon-512x512.png",
    image: payload.image,
    url: payload.url,
    tag: payload.tag || `msg-${payload.conversationId || Date.now()}`,
    data: {
      url: payload.url,
      conversationId: payload.conversationId,
      messageId: payload.messageId,
      senderName: payload.senderName,
      senderAvatar: payload.senderAvatar,
      timestamp: payload.timestamp || Date.now(),
    },
  });

  let sentCount = 0;
  let failedCount = 0;
  let cleanedCount = 0;

  console.log(`[WebPush Service] Delivering push to ${subscriptions.length} endpoints for user ${userId}...`);

  await Promise.all(
    subscriptions.map(async (sub) => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      // Attempt sending with up to 1 retry for transient errors
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          await webPush.sendNotification(pushConfig, jsonPayload);
          sentCount++;
          console.log(`[WebPush Service] Delivery success to endpoint: ${sub.endpoint.substring(0, 45)}...`);
          break;
        } catch (error: unknown) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const statusCode = (error as any)?.statusCode;

          // 404 Not Found or 410 Gone indicates the subscription expired or user unsubscribed
          if (statusCode === 404 || statusCode === 410) {
            console.warn(`[WebPush Service] Endpoint expired (${statusCode}). Cleaning up subscription from database...`);
            try {
              await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } });
              cleanedCount++;
            } catch (dbErr) {
              console.error("[WebPush Service] Error deleting expired subscription:", dbErr);
            }
            break; // Do not retry deleted endpoints
          }

          if (attempt === 2) {
            failedCount++;
            console.error(`[WebPush Service] Delivery failed after 2 attempts (HTTP ${statusCode || "unknown"}):`, (error as Error)?.message || error);
          } else {
            // Wait 250ms before retry
            await new Promise((r) => setTimeout(r, 250));
          }
        }
      }
    })
  );

  console.log(`[WebPush Service] Finished delivery for user ${userId}: Sent=${sentCount}, Failed=${failedCount}, Cleaned=${cleanedCount}`);
  return { sent: sentCount, failed: failedCount, cleaned: cleanedCount };
}
