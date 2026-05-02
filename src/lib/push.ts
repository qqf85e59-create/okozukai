/**
 * Push notification helper.
 * Uses web-push library to send VAPID-authenticated push notifications.
 * Falls back gracefully if VAPID keys are not configured.
 */

let webpush: typeof import("web-push") | null = null;

async function getWebPush() {
  if (webpush) return webpush;
  try {
    webpush = await import("web-push");
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
    }
    return webpush;
  } catch {
    return null;
  }
}

// Lazy import prisma to avoid circular deps
async function getPrisma() {
  const { prisma } = await import("./db");
  return prisma;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

/**
 * Send push notification to a specific user.
 */
export async function notifyUser(userId: string, payload: PushPayload): Promise<void> {
  const wp = await getWebPush();
  if (!wp) return;

  const prisma = await getPrisma();
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  const payloadStr = JSON.stringify(payload);
  const expired: string[] = [];

  for (const sub of subscriptions) {
    try {
      await wp.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payloadStr
      );
      // Update lastUsedAt
      await prisma.pushSubscription.update({
        where: { id: sub.id },
        data: { lastUsedAt: new Date() },
      });
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 410 || statusCode === 404) {
        expired.push(sub.id);
      }
      // Silently ignore other errors
    }
  }

  // Clean up expired subscriptions
  if (expired.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: expired } },
    });
  }
}

/**
 * Send push notification to all parents (approver + admin).
 */
export async function notifyParents(payload: PushPayload): Promise<void> {
  const prisma = await getPrisma();
  const parents = await prisma.user.findMany({
    where: { role: { in: ["approver", "admin"] } },
    select: { id: true },
  });

  await Promise.allSettled(parents.map((p) => notifyUser(p.id, payload)));
}

/**
 * Send push notification to all users.
 */
export async function notifyAll(payload: PushPayload): Promise<void> {
  const prisma = await getPrisma();
  const users = await prisma.user.findMany({ select: { id: true } });
  await Promise.allSettled(users.map((u) => notifyUser(u.id, payload)));
}
