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

    // Always log to server output for visibility in the meantime
    console.log("[notify-admin]", {
      event: body.event,
      title: body.title,
      to: recipient,
      shouldNotify,
      details: body.details,
    });

    return json({
      success: true,
      delivered: false, // email delivery not yet wired (no domain)
      logged: true,
      recipient,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    return json({ error: msg }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
