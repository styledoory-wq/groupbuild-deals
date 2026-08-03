/**
 * Participation fee mode — a system-wide, admin-controlled switch that decides
 * HOW residents join group-buy deals.
 *
 *  - "enabled"     → participation fee is charged (Cardcom checkout)
 *  - "disabled"    → joining is free: no deposit, no checkout, direct join
 *  - "maintenance" → joining is blocked entirely
 *
 * FAIL CLOSED: if the mode cannot be read, joining must be blocked. We never
 * assume "free" and we never assume "enabled" silently.
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

/**
 * Reads the current mode. Throws when it cannot be determined — callers MUST
 * treat a throw as "block joining" (fail closed).
 */
export async function fetchParticipationFeeMode(): Promise<ParticipationFeeMode> {
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
  ) => Promise<{ data: unknown; error: { message: string } | null }>)(
    "get_participation_fee_mode",
  );
  if (error) throw new Error(error.message);
  if (!isParticipationFeeMode(data)) throw new Error("participation_fee_mode_unavailable");
  return data;
}

/** Admin-only mode change. Reason is mandatory and is stored in the audit log. */
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

/** Free join (only valid while the mode is "disabled"; the RPC re-checks). */
export async function joinDealFree(
  dealId: string,
  payload: Record<string, unknown>,
): Promise<string | null> {
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>)("join_deal_free", {
    _deal_id: dealId,
    _payload: payload,
  });
  if (error) throw new Error(error.message);
  return typeof data === "string" ? data : null;
}
