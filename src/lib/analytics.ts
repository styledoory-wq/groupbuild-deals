import { supabase } from "@/integrations/supabase/client";

export type SupplierEventType =
  | "view"
  | "call"
  | "whatsapp"
  | "website"
  | "navigate"
  | "open_project"
  | "favorite_attempt"
  | "gallery_open"
  | "deal_click"
  | "share";

const SESSION_KEY = "gb_session_id";

function getSessionId(): string {
  try {
    let s = localStorage.getItem(SESSION_KEY);
    if (!s) {
      s = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(SESSION_KEY, s);
    }
    return s;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function parseUtm(search: string) {
  const p = new URLSearchParams(search);
  return {
    utm_source: p.get("utm_source"),
    utm_medium: p.get("utm_medium"),
    utm_campaign: p.get("utm_campaign"),
  };
}

export async function trackSupplierEvent(
  supplierId: string | null | undefined,
  type: SupplierEventType,
  meta: Record<string, unknown> = {},
) {
  if (!supplierId) return;
  try {
    const { data: auth } = await supabase.auth.getSession();
    const utm = typeof window !== "undefined" ? parseUtm(window.location.search) : {};
    await supabase.from("supplier_analytics_events").insert({
      supplier_id: supplierId,
      event_type: type,
      session_id: getSessionId(),
      user_id: auth.session?.user?.id ?? null,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      page_url: typeof window !== "undefined" ? window.location.href : null,
      ...utm,
      meta,
    });
  } catch (e) {
    // best-effort — never block UX
    console.debug("[analytics] failed", e);
  }
}

export async function logSearchQuery(query: string, resultsCount: number, clicked?: { id: string; type: string }) {
  const q = query.trim();
  if (!q) return;
  try {
    const { data: auth } = await supabase.auth.getSession();
    await supabase.from("search_queries").insert({
      query: q,
      results_count: resultsCount,
      session_id: getSessionId(),
      user_id: auth.session?.user?.id ?? null,
      clicked_result_id: clicked?.id ?? null,
      clicked_result_type: clicked?.type ?? null,
    });
  } catch {
    /* noop */
  }
}
