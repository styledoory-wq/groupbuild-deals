import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type AttentionCounts = {
  pendingSuppliers: number;
  openComplaints: number;
  failedPayments: number;
  openLeads: number;
  pendingCommittee: number;
  dealsNoImage: number;
  total: number;
};

async function fetchAttention(): Promise<AttentionCounts> {
  const weekAgo = new Date(Date.now() - WEEK_MS).toISOString();

  const [pendingSuppliers, openComplaints, failedPayments, openLeads, pendingCommittee, dealsNoImage] =
    await Promise.all([
      supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("is_deleted", false).eq("approval_status", "pending"),
      supabase.from("complaints").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("deposit_attempt_logs").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
      supabase.from("supplier_inquiries").select("id", { count: "exact", head: true }).eq("status", "new").lte("created_at", weekAgo).eq("is_deleted", false),
      supabase.from("committee_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("deals").select("id", { count: "exact", head: true }).eq("is_deleted", false).is("cover_image_url", null),
    ]);

  const counts = {
    pendingSuppliers: pendingSuppliers.count ?? 0,
    openComplaints: openComplaints.count ?? 0,
    failedPayments: failedPayments.count ?? 0,
    openLeads: openLeads.count ?? 0,
    pendingCommittee: pendingCommittee.count ?? 0,
    dealsNoImage: dealsNoImage.count ?? 0,
  };
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  return { ...counts, total };
}

export function useAdminAttention() {
  return useQuery({
    queryKey: ["admin-attention"],
    queryFn: fetchAttention,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}
