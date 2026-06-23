// Sends a notification to the admin notification email (if configured).
// Currently logs the event to console + waitlist log; in the future
// we will hook this up to actual email delivery.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type EventType =
  | "new_resident"
  | "new_supplier"
  | "deal_interest"
  | "waitlist_lead";

interface Payload {
  event: EventType;
  title: string;
  details: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = (await req.json()) as Payload;
    if (!body?.event || !body?.title) {
      return json({ error: "missing event/title" }, 400);
    }
    if (!["new_resident", "new_supplier", "deal_interest", "waitlist_lead"].includes(body.event)) {
      return json({ error: "invalid_event" }, 400);
    }


    // Read current admin settings
    const { data: settings } = await admin
      .from("admin_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    const shouldNotify =
      (body.event === "new_resident" && settings?.notify_on_new_resident) ||
      (body.event === "new_supplier" && settings?.notify_on_new_supplier) ||
      (body.event === "deal_interest" && settings?.notify_on_deal_interest) ||
      body.event === "waitlist_lead";

    const recipient = settings?.notification_email ?? null;

    console.log("[notify-admin]", {
      event: body.event,
      title: body.title,
      to: recipient,
      shouldNotify,
      details: scrubDetails(body.details),
    });

    let delivered = false;
    if (shouldNotify && recipient) {
      try {
        const detailsObj = (body.details ?? {}) as Record<string, unknown>;
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(detailsObj)) {
          if (v == null) continue;
          flat[k] = typeof v === "object" ? JSON.stringify(v) : String(v);
        }
        const { error: sendErr } = await admin.functions.invoke("send-transactional-email", {
          body: {
            templateName: "admin-notification",
            recipientEmail: recipient,
            idempotencyKey: `admin-${body.event}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            templateData: {
              eventType: body.event,
              eventTitle: body.title,
              details: flat,
            },
          },
        });
        if (sendErr) console.error("[notify-admin] send failed", sendErr);
        else delivered = true;
      } catch (e) {
        console.error("[notify-admin] send exception", e);
      }
    }

    return json({
      success: true,
      delivered,
      logged: true,
      recipient,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    return json({ error: msg }, 500);
  }
});

function scrubDetails(details: Record<string, unknown> | null | undefined) {
  const safe = { ...(details ?? {}) };
  for (const key of Object.keys(safe)) {
    if (/email|phone|name/i.test(key)) safe[key] = "[redacted]";
  }
  return safe;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
