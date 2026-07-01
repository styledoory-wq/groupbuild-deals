// Dispatches an in-app notification to external channels (web push + email).
// Currently scoped to the `demand_invitation` type. Native push (APNs) is out
// of scope for this phase.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const RATE_LIMIT_PER_HOUR = 5;

type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  metadata: Record<string, unknown> | null;
};

type Settings = {
  email_notifications_enabled?: boolean | null;
  push_notifications_enabled?: boolean | null;
  demand_invitation_email_enabled?: boolean | null;
  demand_invitation_push_enabled?: boolean | null;
} | null;

async function invokeFn(name: string, payload: unknown) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let body: unknown = text;
  try { body = JSON.parse(text); } catch { /* keep text */ }
  return { ok: res.ok, status: res.status, body };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (p: unknown, s = 200) =>
    new Response(JSON.stringify(p), {
      status: s,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  let notification_id: string | undefined;
  try {
    const body = await req.json();
    notification_id = body?.notification_id;
  } catch { /* ignore */ }
  if (!notification_id) return json({ error: "notification_id required" }, 400);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Load notification
  const { data: notif, error: notifErr } = await supabase
    .from("notifications")
    .select("id,user_id,type,title,body,link,metadata")
    .eq("id", notification_id)
    .maybeSingle();
  if (notifErr || !notif) return json({ error: "notification_not_found" }, 404);
  const n = notif as Notification;

  if (n.type !== "demand_invitation") {
    return json({ skipped: true, reason: "unsupported_type" });
  }

  // De-dup: skip if a log row already exists
  const { data: existing } = await supabase
    .from("notification_dispatch_log")
    .select("id, dispatch_status")
    .eq("notification_id", n.id)
    .maybeSingle();
  if (existing) {
    return json({ skipped: true, reason: "already_dispatched", log_id: existing.id });
  }

  // Rate limit: max 5 demand_invitation sends per user per hour
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .from("notification_dispatch_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", n.user_id)
    .eq("notification_type", "demand_invitation")
    .gte("created_at", hourAgo);

  if ((recentCount ?? 0) >= RATE_LIMIT_PER_HOUR) {
    await supabase.from("notification_dispatch_log").insert({
      notification_id: n.id,
      user_id: n.user_id,
      notification_type: n.type,
      dispatch_status: "rate_limited",
      push_status: "skipped",
      email_status: "skipped",
      attempts: 1,
    });
    return json({ skipped: true, reason: "rate_limited" });
  }

  // Insert pending log (unique constraint prevents concurrent duplicates)
  const { data: logRow, error: insErr } = await supabase
    .from("notification_dispatch_log")
    .insert({
      notification_id: n.id,
      user_id: n.user_id,
      notification_type: n.type,
      dispatch_status: "in_progress",
      attempts: 1,
    })
    .select("id")
    .maybeSingle();
  if (insErr || !logRow) {
    // Race: another dispatcher won. Bail cleanly.
    return json({ skipped: true, reason: "duplicate_race" });
  }

  // Load user prefs + email
  const [{ data: prefs }, { data: profile }] = await Promise.all([
    supabase
      .from("notification_settings")
      .select(
        "email_notifications_enabled,push_notifications_enabled,demand_invitation_email_enabled,demand_invitation_push_enabled",
      )
      .eq("user_id", n.user_id)
      .maybeSingle(),
    supabase.from("profiles").select("email,full_name").eq("id", n.user_id).maybeSingle(),
  ]);
  const s = prefs as Settings;

  // Default to enabled when settings row or field missing
  const pushGlobal = s?.push_notifications_enabled ?? true;
  const pushType = s?.demand_invitation_push_enabled ?? true;
  const emailGlobal = s?.email_notifications_enabled ?? true;
  const emailType = s?.demand_invitation_email_enabled ?? true;

  const link = n.link || "/supplier/demand-inbox";
  const url = link.startsWith("http")
    ? link
    : `https://www.groupbuild.co.il${link.startsWith("/") ? "" : "/"}${link}`;

  // ---- Push ----
  let push_status = "skipped";
  let push_sent_at: string | null = null;
  let push_error: string | null = null;
  if (pushGlobal && pushType) {
    // Check user actually has any web push token
    const { count: tokenCount } = await supabase
      .from("device_tokens")
      .select("id", { count: "exact", head: true })
      .eq("user_id", n.user_id)
      .eq("platform", "web");
    if ((tokenCount ?? 0) > 0) {
      try {
        const r = await invokeFn("send-push", {
          user_id: n.user_id,
          event: "new_offer",
          title: n.title,
          body: n.body ?? "",
          url,
          data: { notification_id: n.id, kind: "demand_invitation", ...(n.metadata ?? {}) },
        });
        if (r.ok) {
          push_status = "sent";
          push_sent_at = new Date().toISOString();
        } else {
          push_status = "failed";
          push_error = `push ${r.status}: ${typeof r.body === "string" ? r.body : JSON.stringify(r.body)}`.slice(0, 500);
        }
      } catch (e) {
        push_status = "failed";
        push_error = String((e as Error).message || e).slice(0, 500);
      }
    } else {
      push_status = "no_token";
    }
  } else {
    push_status = "disabled_by_user";
  }

  // ---- Email ----
  // Send email if: pref allows AND (push wasn't sent OR user prefers both).
  // Policy: send email whenever pref allows (independent of push).
  let email_status = "skipped";
  let email_sent_at: string | null = null;
  let email_error: string | null = null;
  const recipient = (profile as { email?: string | null } | null)?.email ?? null;
  if (emailGlobal && emailType && recipient) {
    const safeTitle = n.title.replace(/</g, "&lt;");
    const safeBody = (n.body ?? "").replace(/</g, "&lt;").replace(/\n/g, "<br/>");
    const html = `<!doctype html><html lang="he" dir="rtl"><body style="font-family:Arial,sans-serif;background:#F5F1EA;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;padding:24px;color:#0F172A">
    <div style="background:#0E2A47;color:#C9A24B;font-weight:bold;font-size:20px;padding:12px 16px;border-radius:10px;text-align:center;margin-bottom:16px">GroupBuild</div>
    <h1 style="font-size:20px;margin:0 0 12px">${safeTitle}</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 20px">${safeBody}</p>
    <a href="${url}" style="display:inline-block;background:#0E6B5A;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:bold">צפייה בביקוש</a>
  </div>
</body></html>`;
    try {
      const r = await invokeFn("send-email", {
        type: "raw",
        to: recipient,
        subject: n.title,
        html,
      });
      if (r.ok) {
        email_status = "sent";
        email_sent_at = new Date().toISOString();
      } else {
        email_status = "failed";
        email_error = `email ${r.status}: ${typeof r.body === "string" ? r.body : JSON.stringify(r.body)}`.slice(0, 500);
      }
    } catch (e) {
      email_status = "failed";
      email_error = String((e as Error).message || e).slice(0, 500);
    }
  } else if (!recipient) {
    email_status = "no_recipient";
  } else {
    email_status = "disabled_by_user";
  }

  const overall = push_status === "sent" || email_status === "sent"
    ? "sent"
    : push_status === "failed" || email_status === "failed"
    ? "failed"
    : "no_channel";

  await supabase
    .from("notification_dispatch_log")
    .update({
      push_status,
      push_sent_at,
      push_error,
      email_status,
      email_sent_at,
      email_error,
      dispatch_status: overall,
      dispatch_error: [push_error, email_error].filter(Boolean).join(" | ") || null,
    })
    .eq("id", logRow.id);

  return json({
    ok: true,
    dispatch_status: overall,
    push_status,
    email_status,
  });
});
