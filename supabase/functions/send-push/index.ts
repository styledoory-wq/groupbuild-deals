// Sends push notifications to a user's registered devices via APNs/FCM.
// Safe skeleton: if credentials are missing, returns a clear warning instead of failing.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
      // deno-lint-ignore no-explicit-any
      if ((settings as any)[EVENT_TO_PUSH_PREF[body.event]] === false)
        return json({ success: true, skipped: "user_event_off" });
    }

    // Load device tokens
    const { data: tokens } = await admin
      .from("device_tokens")
      .select("token, platform")
      .eq("user_id", body.user_id);

    if (!tokens || tokens.length === 0)
      return json({ success: true, skipped: "no_devices" });

    const fcmReady = hasFcm();
    const apnsReady = hasApns();

    // Skeleton mode: credentials not configured yet.
    if (!fcmReady && !apnsReady) {
      console.warn(
        "[send-push] Push credentials not configured. " +
          "Set FCM_SERVICE_ACCOUNT_JSON for Android and " +
          "APNS_P8_KEY/APNS_TEAM_ID/APNS_KEY_ID/APNS_BUNDLE_ID for iOS."
      );
      return json({
        success: true,
        warning: "push_credentials_not_configured",
        targeted_devices: tokens.length,
        message:
          "Push delivery skipped — APNs/FCM credentials are not configured yet. " +
          "The notification was logged. Add credentials to enable real delivery.",
      });
    }

    const results: Array<{ token: string; platform: string; status: string }> = [];
    for (const t of tokens) {
      // Real APNs/FCM dispatch should be implemented here once credentials are added.
      // Keeping the skeleton conservative — log only.
      results.push({
        token: t.token.slice(0, 10) + "…",
        platform: t.platform,
        status: t.platform === "ios" ? (apnsReady ? "would_send_apns" : "skipped_no_apns")
              : t.platform === "android" ? (fcmReady ? "would_send_fcm" : "skipped_no_fcm")
              : "skipped_web",
      });
    }
    return json({ success: true, results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[send-push] error", msg);
    return json({ success: false, error: msg });
  }
});
