import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches real joiners count per deal in a single query.
 * Counts distinct users with active interest (interested/committed/paid/pending_deposit/joined).
 */
export async function fetchDealJoinerCounts(dealIds: string[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  if (!dealIds.length) return result;
  try {
    const { data, error } = await supabase
      .from("deal_interests")
      .select("deal_id,user_id,status,is_deleted")
      .in("deal_id", dealIds)
      .in("status", ["interested", "committed", "paid", "pending_deposit", "joined"])
      .eq("is_deleted", false);
    if (error) throw error;
    const seen: Record<string, Set<string>> = {};
    (data ?? []).forEach((r: { deal_id: string; user_id: string }) => {
      if (!seen[r.deal_id]) seen[r.deal_id] = new Set();
      seen[r.deal_id].add(r.user_id);
    });
    Object.entries(seen).forEach(([k, v]) => { result[k] = v.size; });
  } catch (e) {
    console.warn("[fetchDealJoinerCounts] failed", e);
  }
  dealIds.forEach((id) => { if (!(id in result)) result[id] = 0; });
  return result;
}
