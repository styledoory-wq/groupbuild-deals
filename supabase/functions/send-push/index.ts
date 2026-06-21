// Sends push notifications to a user's registered devices.
// Supports Web Push (browser/PWA) via VAPID, plus skeleton hooks for
// APNs/FCM when those credentials are configured.
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

// Public VAPID key — must match src/lib/webPush.ts
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
function hasApns(): boolean {
  return !!(
    Deno.env.get("APNS_P8_KEY") &&
    Deno.env.get("APNS_TEAM_ID") &&
    Deno.env.get("APNS_KEY_ID") &&
    Deno.env.get("APNS_BUNDLE_ID")
  );
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
            {
              endpoint: t.token,
              keys: { p256dh: info.p256dh, auth: info.auth },
            },
            webPayload,
            { TTL: 60 * 60 * 24 },
          );
          results.push({ platform: "web", status: "sent" });
        } catch (err) {
          const e = err as { statusCode?: number; body?: string; message?: string };
          // 404/410 = subscription is gone — clean it up.
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

      // Native (APNs/FCM) — keep skeleton until creds are configured.
      results.push({
        platform: t.platform,
        status:
          t.platform === "ios"
            ? apnsReady ? "would_send_apns" : "skipped_no_apns"
            : t.platform === "android"
            ? fcmReady ? "would_send_fcm" : "skipped_no_fcm"
            : "skipped_unknown",
      });
    }

    return json({ success: true, results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[send-push] error", msg);
    return json({ success: false, error: msg });
  }
});
