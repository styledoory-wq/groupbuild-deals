/**
 * Participation fee mode — system-wide by default, with optional per-deal override.
 *
 *  - "enabled"     → participation fee is charged (Cardcom checkout)
 *  - "disabled"    → joining is free: no deposit, no checkout, direct join
 *  - "maintenance" → joining is blocked entirely
 */
import { supabase } from "@/integrations/supabase/client";

export type ParticipationFeeMode = "enabled" | "disabled" | "maintenance";

export const PARTICIPATION_MODE_LABEL: Record<ParticipationFeeMode, string> = {
  enabled: "דמי השתתפות פעילים",
  disabled: "הצטרפות חינמית",
  maintenance: "הצטרפות מושבתת זמנית",
};

export const PARTICIPATION_MODE_DESCRIPTION: Record<ParticipationFeeMode, string> = {
  enabled: "דיירים משלמים דמי השתתפות בעת ההצטרפות, דרך מסך התשלום המאובטח.",
  disabled: "דיירים מצטרפים ללא תשלום כלל. לא נוצר תשלום ולא נפתח מסך סליקה.",
  maintenance: "לא ניתן להצטרף לעסקאות. מוצגת לדייר הודעה שההצטרפות אינה זמינה כרגע.",
};

export const MAINTENANCE_JOIN_MESSAGE =
  "ההצטרפות לעסקאות אינה זמינה כרגע. נסו שוב מאוחר יותר.";

export function isParticipationFeeMode(v: unknown): v is ParticipationFeeMode {
  return v === "enabled" || v === "disabled" || v === "maintenance";
}

function dealIdFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const m = window.location.pathname.match(/\/deals\/([0-9a-f-]{20,})/i);
  return m?.[1] ?? null;
}

/**
 * Reads the effective mode for the current deal when possible; otherwise the
 * global mode. Throws when it cannot be determined (fail closed).
 */
export async function fetchParticipationFeeMode(dealId?: string | null): Promise<ParticipationFeeMode> {
  const resolvedDealId = dealId ?? dealIdFromLocation();
  const fn = resolvedDealId ? "get_effective_participation_fee_mode" : "get_participation_fee_mode";
  const args = resolvedDealId ? { _deal_id: resolvedDealId } : undefined;
  const callMode = supabase.rpc as unknown as (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;

  const { data, error } = await callMode(fn, args);
  if (!error && isParticipationFeeMode(data)) return data;

  // Production-safe compatibility fallback: a newly pushed per-deal RPC may
  // arrive after the frontend bundle. Never turn a temporary schema-sync lag
  // into a full joining outage. The global mode still preserves the master
  // disabled/maintenance safety switch.
  if (resolvedDealId) {
    console.warn("[participationMode] effective mode unavailable; using global mode", error);
    const fallback = await callMode("get_participation_fee_mode");
    if (!fallback.error && isParticipationFeeMode(fallback.data)) return fallback.data;
    throw new Error(fallback.error?.message ?? error?.message ?? "participation_fee_mode_unavailable");
  }

  throw new Error(error?.message ?? "participation_fee_mode_unavailable");
}

/** Admin-only global mode change. Reason is mandatory and is stored in the audit log. */
export async function setParticipationFeeMode(
  mode: ParticipationFeeMode,
  reason: string,
): Promise<void> {
  const { error } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ error: { message: string } | null }>)("admin_set_participation_fee_mode", {
    _mode: mode,
    _reason: reason,
  });
  if (error) throw new Error(error.message);
}

/** Free join when the effective mode for this specific deal is disabled. */
export async function joinDealFree(
  dealId: string,
  payload: Record<string, unknown>,
): Promise<string | null> {
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>)("join_deal_free_effective", {
    _deal_id: dealId,
    _payload: payload,
  });
  if (error) throw new Error(error.message);
  return typeof data === "string" ? data : null;
}
