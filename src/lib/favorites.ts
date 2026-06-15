import { supabase } from "@/integrations/supabase/client";

export async function listFavoriteIds(): Promise<Set<string>> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user?.id;
  if (!uid) return new Set();
  const { data } = await supabase.from("favorites").select("deal_id").eq("user_id", uid);
  return new Set((data ?? []).map((r) => r.deal_id as string));
}

export async function toggleFavorite(dealId: string, on: boolean): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user?.id;
  if (!uid) throw new Error("יש להתחבר כדי לשמור מועדפים");
  if (on) {
    const { error } = await supabase.from("favorites").insert({ user_id: uid, deal_id: dealId });
    if (error && !error.message.toLowerCase().includes("duplicate")) throw error;
  } else {
    const { error } = await supabase.from("favorites").delete().eq("user_id", uid).eq("deal_id", dealId);
    if (error) throw error;
  }
}
