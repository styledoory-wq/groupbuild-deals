import { supabase } from "@/integrations/supabase/client";
import { cachedQuery } from "@/lib/clientCache";

/**
 * Fetches real joiners count per deal in a single query.
 * Counts distinct users who actually joined — paid deposit, or approved when no deposit is required.
 * Excludes pending_deposit / interested — those haven't completed payment yet.
 */
export async function fetchDealJoinerCounts(dealIds: string[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  if (!dealIds.length) return result;
  const ids = Array.from(new Set(dealIds)).sort();
  return cachedQuery(`deal-counts:${ids.join(",")}`, async () => {
  try {
    const { data, error } = await supabase
      .from("deal_interests")
      .select("deal_id,user_id,status,is_deleted")
      .in("deal_id", ids)
      .in("status", ["paid", "committed", "joined", "approved"])
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
  ids.forEach((id) => { if (!(id in result)) result[id] = 0; });
  return result;
  }, 45_000);
}
