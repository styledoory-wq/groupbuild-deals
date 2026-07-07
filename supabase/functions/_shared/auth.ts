// Shared auth guards for edge functions.
// Every helper returns either `{ ok: true, ... }` or `{ ok: false, response }`.
// Callers should early-return the `response` when `ok` is false.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
};

export function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractBearer(req: Request): string | null {
  const h = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

/** Returns true if the caller presented the service-role key. */
export function isServiceRoleRequest(req: Request): boolean {
  const token = extractBearer(req);
  if (!token) return false;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return !!key && token === key;
}

export type AuthOk = {
  ok: true;
  userId: string;
  email: string | null;
  isAdmin: boolean;
  isServiceRole: boolean;
};

export type AuthFail = { ok: false; response: Response };

/** Require an authenticated user. Rejects anonymous callers with 401. */
export async function requireAuthUser(req: Request): Promise<AuthOk | AuthFail> {
  // Service-role bypass (used by other edge functions/cron)
  if (isServiceRoleRequest(req)) {
    return { ok: true, userId: "service_role", email: null, isAdmin: true, isServiceRole: true };
  }

  const token = extractBearer(req);
  if (!token) {
    return { ok: false, response: jsonResponse({ error: "unauthorized" }, 401) };
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) {
    return { ok: false, response: jsonResponse({ error: "unauthorized" }, 401) };
  }

  // Look up admin role via service-role client (bypass RLS on user_roles)
  const admin = createClient(url, service);
  const { data: roleRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .eq("role", "admin")
    .maybeSingle();

  return {
    ok: true,
    userId: data.user.id,
    email: data.user.email ?? null,
    isAdmin: !!roleRow,
    isServiceRole: false,
  };
}

/** Require an admin user (or service-role caller). */
export async function requireAdmin(req: Request): Promise<AuthOk | AuthFail> {
  const res = await requireAuthUser(req);
  if (!res.ok) return res;
  if (!res.isAdmin && !res.isServiceRole) {
    return { ok: false, response: jsonResponse({ error: "forbidden" }, 403) };
  }
  return res;
}

/** Require the caller to present the service-role key. Used for cron-only endpoints. */
export function requireServiceRole(req: Request): AuthFail | { ok: true } {
  if (isServiceRoleRequest(req)) return { ok: true };
  return { ok: false, response: jsonResponse({ error: "unauthorized" }, 401) };
}
