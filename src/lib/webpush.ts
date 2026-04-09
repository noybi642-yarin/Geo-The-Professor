// Web Push notification utilities
// Requires: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL env vars
//
// Generate VAPID keys:
//   npx web-push generate-vapid-keys
// Then add to Vercel environment variables.

export async function sendDailyBriefNotification(headline: string): Promise<void> {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL || "mailto:admin@geoprofessor.com";

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.log("Push notifications not configured (missing VAPID keys)");
    return;
  }

  let subscriptions: { endpoint: string; p256dh: string; auth: string }[] = [];

  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();
    const { data } = await supabase.from("push_subscriptions").select("*");
    subscriptions = data || [];
  } catch {
    console.log("Could not fetch push subscriptions from Supabase");
    return;
  }

  if (!subscriptions.length) return;

  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

  const payload = JSON.stringify({
    title: "GeoProfessor Daily Brief",
    body: headline,
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush
        .sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        .catch(async (err: { statusCode?: number }) => {
          // Remove expired/invalid subscriptions (HTTP 410 = Gone)
          if (err.statusCode === 410) {
            try {
              const { createAdminClient } = await import("@/lib/supabase/server");
              const supabase = createAdminClient();
              await supabase
                .from("push_subscriptions")
                .delete()
                .eq("endpoint", sub.endpoint);
            } catch {
              // ignore cleanup errors
            }
          }
          throw err;
        })
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  console.log(`Push notifications: ${sent}/${subscriptions.length} delivered`);
}
