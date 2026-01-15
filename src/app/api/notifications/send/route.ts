import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import {
  getUsersWithExpiringProducts,
  getUserPushSubscriptions,
  deletePushSubscription,
} from "@/lib/db/queries";

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || "mailto:admin@example.com";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
}

export async function POST(request: NextRequest) {
  try {
    // Verify API key for cron job security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        { error: "VAPID keys not configured" },
        { status: 500 }
      );
    }

    // Get users with expiring products
    const usersWithExpiring = await getUsersWithExpiringProducts(3);

    let sent = 0;
    let failed = 0;

    for (const user of usersWithExpiring) {
      const subscriptions = await getUserPushSubscriptions(user.userId);

      for (const sub of subscriptions) {
        try {
          const payload = JSON.stringify({
            title: "Produkty wygasaja!",
            body: `${user.count} produktow wygasa w ciagu 3 dni: ${user.products.join(", ")}`,
            icon: "/icons/icon-192x192.png",
            badge: "/icons/icon-72x72.png",
            data: {
              url: "/inventory",
            },
          });

          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload
          );
          sent++;
        } catch (error: unknown) {
          const webPushError = error as { statusCode?: number };
          console.error("Error sending notification:", error);
          failed++;

          // Remove invalid subscriptions (410 Gone or 404 Not Found)
          if (webPushError.statusCode === 410 || webPushError.statusCode === 404) {
            await deletePushSubscription(sub.endpoint);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      usersNotified: usersWithExpiring.length,
    });
  } catch (error) {
    console.error("Error sending notifications:", error);
    return NextResponse.json(
      { error: "Failed to send notifications" },
      { status: 500 }
    );
  }
}

// Also support GET for easy testing / cron services
export async function GET(request: NextRequest) {
  return POST(request);
}
