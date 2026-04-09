"use client";

import { useState, useEffect } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export default function NotificationBell() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const isSupported =
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      !!vapidKey;

    setSupported(isSupported);

    if (isSupported) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, []);

  async function checkSubscription() {
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch {
      // ignore
    }
  }

  async function toggle() {
    if (subscribed) {
      await handleUnsubscribe();
    } else {
      await handleSubscribe();
    }
  }

  async function handleSubscribe() {
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;

      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });

      if (res.ok) setSubscribed(true);
    } catch (err) {
      console.error("Subscribe failed:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUnsubscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;

      await fetch("/api/notifications/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });

      await sub.unsubscribe();
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }

  if (!supported) return null;

  const denied = permission === "denied";

  return (
    <button
      onClick={toggle}
      disabled={loading || denied}
      title={
        denied
          ? "Notifications are blocked — allow in browser settings"
          : subscribed
          ? "Disable daily brief notifications"
          : "Get daily brief notifications"
      }
      style={{
        background: "none",
        border: "none",
        cursor: denied ? "not-allowed" : "pointer",
        fontSize: "18px",
        opacity: loading ? 0.5 : denied ? 0.3 : 1,
        padding: "0",
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
      }}
    >
      {subscribed ? "🔔" : "🔕"}
    </button>
  );
}
