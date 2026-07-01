// Sends push notifications to a user's registered devices.
// Supports:
//   - Web Push (browser/PWA) via VAPID
//   - iOS Native via APNs HTTP/2 (JWT auth with a .p8 key)
// FCM (Android) remains a skeleton until credentials are configured.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type EventType =
  | "deposit"
  | "new_lead"
  | "new_offer"
  | "voucher"
  | "deal_status"
  | "approval"
  | "system";

interface Payload {
  user_id: string;
  event: EventType;
  title: string;
  body: string;
  url?: string;
  data?: Record<string, unknown>;
}

const EVENT_TO_PUSH_PREF: Record<EventType, string> = {
  deposit: "deposit_push_enabled",
  new_lead: "new_lead_push_enabled",
  new_offer: "new_offer_push_enabled",
  voucher: "voucher_push_enabled",
  deal_status: "deal_status_push_enabled",
  approval: "approval_push_enabled",
  system: "system_push_enabled",
};

type NotificationPushSettings = Record<string, boolean | null | undefined> & {
  push_notifications_enabled?: boolean | null;
};

// -------------------- Web Push (VAPID) --------------------
const VAPID_PUBLIC =
  "BJlGbkX7ULu6JRIXlcOspKwl7u9FkgLZslOShCYuU_17NvLvlwn5dyFpjpUQdjLA9icunbHAZs3F1zcbE-ZpsXQ";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:support@groupbuild.co.il";

let vapidReady = false;
function ensureVapid(): boolean {
  if (vapidReady) return true;
  if (!VAPID_PRIVATE) return false;
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    vapidReady = true;
    return true;
  } catch (e) {
    console.warn("[send-push] vapid setup failed", e);
    return false;
  }
}

function hasFcm(): boolean {
  return !!Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
}

// -------------------- APNs (iOS) --------------------
const APNS_P8_KEY = Deno.env.get("APNS_P8_KEY") || "";
const APNS_TEAM_ID = Deno.env.get("APNS_TEAM_ID") || "";
const APNS_KEY_ID = Deno.env.get("APNS_KEY_ID") || "";
const APNS_BUNDLE_ID = Deno.env.get("APNS_BUNDLE_ID") || "";
// Use sandbox for TestFlight / dev builds when set to "true"
const APNS_USE_SANDBOX = (Deno.env.get("APNS_USE_SANDBOX") || "false").toLowerCase() === "true";
const APNS_HOST = APNS_USE_SANDBOX
  ? "https://api.sandbox.push.apple.com"
  : "https://api.push.apple.com";

function hasApns(): boolean {
  return !!(APNS_P8_KEY && APNS_TEAM_ID && APNS_KEY_ID && APNS_BUNDLE_ID);
}

function b64urlEncode(bytes: Uint8Array | string): string {
  const b = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  let s = btoa(String.fromCharCode(...b));
  return s.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToPkcs8Bytes(pem: string): Uint8Array {
  const clean = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const raw = atob(clean);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// APNs JWT is valid up to 60 min. Regenerate every ~50 min.
let apnsJwtCache: { token: string; exp: number } | null = null;
async function getApnsJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (apnsJwtCache && apnsJwtCache.exp - 60 > now) return apnsJwtCache.token;

  const header = { alg: "ES256", kid: APNS_KEY_ID, typ: "JWT" };
  const payload = { iss: APNS_TEAM_ID, iat: now };
  const signingInput = `${b64urlEncode(JSON.stringify(header))}.${b64urlEncode(
    JSON.stringify(payload),
  )}`;

  const keyBytes = pemToPkcs8Bytes(APNS_P8_KEY);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      cryptoKey,
      new TextEncoder().encode(signingInput),
    ),
  );
  const jwt = `${signingInput}.${b64urlEncode(sig)}`;
  apnsJwtCache = { token: jwt, exp: now + 50 * 60 };
  return jwt;
}

interface ApnsResult {
  status: "sent" | "expired_removed" | "failed";
  detail?: string;
}

async function sendApns(
  deviceToken: string,
  body: Payload,
  url: string,
): Promise<ApnsResult> {
  try {
    const jwt = await getApnsJwt();
    const aps = {
      aps: {
        alert: { title: body.title, body: body.body },
        sound: "default",
        "mutable-content": 1,
      },
      url,
      data: body.data || {},
    };
    const res = await fetch(`${APNS_HOST}/3/device/${deviceToken}`, {
      method: "POST",
      headers: {
        authorization: `bearer ${jwt}`,
        "apns-topic": APNS_BUNDLE_ID,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "content-type": "application/json",
      },
      body: JSON.stringify(aps),
    });
    if (res.status === 200) return { status: "sent" };

    const txt = await res.text().catch(() => "");
    let reason = "";
    try {
      reason = JSON.parse(txt).reason || "";
    } catch {
      reason = txt;
    }
    // Dead tokens: remove locally
    if (
      res.status === 410 ||
      reason === "Unregistered" ||
      reason === "BadDeviceToken" ||
      reason === "DeviceTokenNotForTopic"
    ) {
      return { status: "expired_removed", detail: `${res.status} ${reason}` };
    }
    console.warn("[send-push] apns failed", res.status, reason);
    return { status: "failed", detail: `${res.status} ${reason}`.slice(0, 500) };
  } catch (e) {
    const msg = (e as Error).message || String(e);
    console.warn("[send-push] apns exception", msg);
    return { status: "failed", detail: msg.slice(0, 500) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (p: unknown, s = 200) =>
    new Response(JSON.stringify(p), {
      status: s,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE);

    const body = (await req.json()) as Payload;
    if (!body?.user_id || !body?.event || !body?.title || !body?.body) {
      return json({ success: false, error: "missing_fields" });
    }

    // Check user push preferences
    const { data: settings } = await admin
      .from("notification_settings")
      .select(`push_notifications_enabled, ${EVENT_TO_PUSH_PREF[body.event]}`)
      .eq("user_id", body.user_id)
      .maybeSingle();

    if (settings) {
      if (!settings.push_notifications_enabled)
        return json({ success: true, skipped: "user_master_off" });
      if ((settings as NotificationPushSettings)[EVENT_TO_PUSH_PREF[body.event]] === false)
        return json({ success: true, skipped: "user_event_off" });
    }

    // Load device tokens (web subscriptions + native tokens)
    const { data: tokens } = await admin
      .from("device_tokens")
      .select("id, token, platform, device_info")
      .eq("user_id", body.user_id);

    if (!tokens || tokens.length === 0)
      return json({ success: true, skipped: "no_devices" });

    const fcmReady = hasFcm();
    const apnsReady = hasApns();
    const webReady = ensureVapid();

    const results: Array<{ platform: string; status: string; detail?: string }> = [];
    const webPayload = JSON.stringify({
      title: body.title,
      body: body.body,
      url: body.url || "/",
      data: body.data || {},
      tag: `${body.event}-${body.user_id}`,
    });
    const iosUrl = body.url || "/";

    for (const t of tokens) {
      if (t.platform === "web") {
        if (!webReady) {
          results.push({ platform: "web", status: "skipped_no_vapid" });
          continue;
        }
        const info = (t.device_info as { p256dh?: string; auth?: string } | null) || {};
        if (!info.p256dh || !info.auth) {
          results.push({ platform: "web", status: "skipped_bad_sub" });
          continue;
        }
        try {
          await webpush.sendNotification(
            { endpoint: t.token, keys: { p256dh: info.p256dh, auth: info.auth } },
            webPayload,
            { TTL: 60 * 60 * 24 },
          );
          results.push({ platform: "web", status: "sent" });
        } catch (err) {
          const e = err as { statusCode?: number; body?: string; message?: string };
          if (e.statusCode === 404 || e.statusCode === 410) {
            await admin.from("device_tokens").delete().eq("id", t.id);
            results.push({ platform: "web", status: "expired_removed" });
          } else {
            console.warn("[send-push] web push failed", e.statusCode, e.body || e.message);
            results.push({
              platform: "web",
              status: "failed",
              detail: `${e.statusCode || ""} ${e.message || ""}`.trim(),
            });
          }
        }
        continue;
      }

      if (t.platform === "ios") {
        if (!apnsReady) {
          results.push({ platform: "ios", status: "skipped_no_apns" });
          continue;
        }
        const r = await sendApns(t.token, body, iosUrl);
        if (r.status === "expired_removed") {
          await admin.from("device_tokens").delete().eq("id", t.id);
        }
        results.push({ platform: "ios", status: r.status, detail: r.detail });
        continue;
      }

      if (t.platform === "android") {
        results.push({
          platform: "android",
          status: fcmReady ? "would_send_fcm" : "skipped_no_fcm",
        });
        continue;
      }

      results.push({ platform: t.platform, status: "skipped_unknown" });
    }

    return json({ success: true, results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[send-push] error", msg);
    return json({ success: false, error: msg });
  }
});
