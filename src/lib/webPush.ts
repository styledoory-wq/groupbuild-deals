// Web Push helper — registers the user's browser as a push target so
// notifications arrive even when the app/tab is closed.
//
// Flow:
//   1. Wait for the service worker registration (/sw.js).
//   2. Ask the browser for Notification permission.
//   3. Subscribe to PushManager using the project's VAPID public key.
//   4. Store the subscription as a row in `device_tokens` (platform = 'web').
//
// Web push only works in real browsers on HTTPS. iOS Safari supports it
// from 16.4+ but only after the user installs the PWA to their home screen.
import { supabase } from "@/integrations/supabase/client";

// Public VAPID key — safe to ship in client code.
export const VAPID_PUBLIC_KEY =
  "BJlGbkX7ULu6JRIXlcOspKwl7u9FkgLZslOShCYuU_17NvLvlwn5dyFpjpUQdjLA9icunbHAZs3F1zcbE-ZpsXQ";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function isWebPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function currentPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration("/");
    if (existing) return existing;
    // In preview hosts SW is intentionally not registered — bail.
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export async function enableWebPush(userId: string): Promise<
  | { ok: true }
  | { ok: false; reason: "unsupported" | "denied" | "no_sw" | "subscribe_failed" | "save_failed"; detail?: string }
> {
  if (!isWebPushSupported()) return { ok: false, reason: "unsupported" };

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return { ok: false, reason: "denied" };

  const reg = await getRegistration();
  if (!reg) return { ok: false, reason: "no_sw" };

  let sub: PushSubscription;
  try {
    sub =
      (await reg.pushManager.getSubscription()) ||
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      }));
  } catch (err) {
    return { ok: false, reason: "subscribe_failed", detail: String(err) };
  }

  const json = sub.toJSON() as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  const endpoint = json.endpoint || sub.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return { ok: false, reason: "subscribe_failed", detail: "missing_subscription_fields" };
  }

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const { error } = await supabase.from("device_tokens").upsert(
    {
      user_id: userId,
      token: endpoint,
      platform: "web",
      device_info: { p256dh, auth, ua } as never,
      last_active_at: new Date().toISOString(),
    },
    { onConflict: "user_id,token" },
  );
  if (error) return { ok: false, reason: "save_failed", detail: error.message };

  return { ok: true };
}

export async function disableWebPush(userId: string): Promise<void> {
  try {
    const reg = await getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub) {
      const endpoint = sub.endpoint;
      try { await sub.unsubscribe(); } catch {}
      await supabase
        .from("device_tokens")
        .delete()
        .eq("user_id", userId)
        .eq("token", endpoint);
    }
  } catch {
    /* best-effort */
  }
}

export async function hasActiveWebPush(): Promise<boolean> {
  if (!isWebPushSupported()) return false;
  if (Notification.permission !== "granted") return false;
  try {
    const reg = await getRegistration();
    if (!reg) return false;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}
