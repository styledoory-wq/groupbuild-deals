// Fallback dispatcher: finds demand_invitation notifications from the last 24h
// that have no notification_dispatch_log row and invokes dispatch-notification
// for each. Idempotency + rate limit + user settings are enforced inside the
// dispatcher itself, so this job is safe to re-run.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_PER_RUN = 100;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (p: unknown, s = 200) =>
    new Response(JSON.stringify(p), {
      status: s,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Get candidate notifications (last 24h, demand_invitation)
  const { data: notifs, error: notifErr } = await supabase
    .from("notifications")
    .select("id,created_at")
    .eq("type", "demand_invitation")
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(500);

  if (notifErr) return json({ error: notifErr.message }, 500);
  if (!notifs || notifs.length === 0) return json({ checked: 0, dispatched: 0 });

  const ids = notifs.map((n) => n.id);

  // Find which already have a dispatch log entry
  const { data: logged, error: logErr } = await supabase
    .from("notification_dispatch_log")
    .select("notification_id")
    .in("notification_id", ids);
  if (logErr) return json({ error: logErr.message }, 500);

  const loggedSet = new Set((logged ?? []).map((r) => r.notification_id));
  const missing = ids.filter((id) => !loggedSet.has(id)).slice(0, MAX_PER_RUN);

  const results: Array<{ id: string; ok: boolean; status: number }> = [];
  for (const id of missing) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/dispatch-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({ notification_id: id }),
      });
      results.push({ id, ok: res.ok, status: res.status });
    } catch (e) {
      results.push({ id, ok: false, status: 0 });
      console.error("fallback dispatch failed", id, e);
    }
  }

  return json({
    checked: notifs.length,
    missing: missing.length,
    dispatched: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
});
