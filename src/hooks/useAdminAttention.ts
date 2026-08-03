import { useQuery } from "@tanstack/react-query";
import { includesAdminRoutes } from "@/config/appMode";
import { useApp } from "@/store/AppStore";

export type AttentionCounts = {
  pendingSuppliers: number;
  openComplaints: number;
  failedPayments: number;
  openLeads: number;
  pendingCommittee: number;
  dealsNoImage: number;
  total: number;
};

/**
 * Admin-only. Fires ZERO network requests unless:
 *   1. this build ships admin routes at all (web build only — the iOS
 *      Residents/Suppliers bundles alias AdminRoutes to an empty stub), and
 *   2. auth has resolved and the signed-in user's verified role is "admin".
 *
 * The actual queries live in a dynamically-imported module, so guests,
 * residents and suppliers never even download the admin query code.
 */
export function useAdminAttention() {
  const { user, authReady } = useApp();
  const enabled = includesAdminRoutes && authReady && user?.role === "admin";

  return useQuery({
    queryKey: ["admin-attention"],
    queryFn: async () => {
      const { fetchAttention } = await import("./adminAttentionQuery");
      return fetchAttention();
    },
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}
