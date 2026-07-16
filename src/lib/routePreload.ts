import type { Role } from "@/types";
import { includesAdminRoutes, includesResidentRoutes, includesSupplierRoutes } from "@/config/appMode";

type PreloadFn = () => Promise<unknown>;

const routePreloads: Record<string, PreloadFn> = {
  "/resident": () => Promise.resolve(),
  "/resident/deals": () => import("@/pages/resident/DealsList"),
  "/resident/search": () => import("@/pages/resident/Search"),
  "/resident/my-offers": () => import("@/pages/resident/MyOffers"),
  "/resident/profile": () => import("@/pages/resident/ResidentProfile"),
  "/resident/categories": () => import("@/pages/resident/CategoriesList"),
  "/resident/projects": () => import("@/pages/resident/ProjectsList"),
  "/resident/deposits": () => import("@/pages/resident/MyDeposits"),
  "/resident/documents": () => import("@/pages/resident/MyDocuments"),
  "/resident/my-vouchers": () => import("@/pages/resident/MyVouchers"),
  "/resident/notifications": () => import("@/pages/resident/Notifications"),

  "/supplier": () => import("@/pages/supplier/SupplierDashboard"),
  "/supplier/offers": () => import("@/pages/supplier/SupplierOffers"),
  "/supplier/scan": () => import("@/pages/supplier/SupplierScan"),
  "/supplier/redemptions": () => import("@/pages/supplier/SupplierRedemptions"),
  "/supplier/leads": () => import("@/pages/supplier/SupplierLeads"),
  "/supplier/reviews": () => import("@/pages/supplier/SupplierReviews"),

  "/admin": () => import("@/pages/admin/AdminDashboard"),
  "/admin/projects": () => import("@/pages/admin/AdminProjects"),
  "/admin/suppliers": () => import("@/pages/admin/AdminDbSuppliers"),
  "/admin/deals": () => import("@/pages/admin/AdminDeals"),
  "/admin/stats": () => import("@/pages/admin/AdminStats"),
};

const roleRoutes: Record<Role, string[]> = {
  resident: [
    "/resident",
    "/resident/deals",
    "/resident/search",
    "/resident/my-offers",
    "/resident/profile",
    "/resident/categories",
  ],
  supplier: [
    "/supplier",
    "/supplier/offers",
    "/supplier/scan",
    "/supplier/redemptions",
    "/supplier/leads",
  ],
  admin: ["/admin", "/admin/projects", "/admin/suppliers", "/admin/deals", "/admin/stats"],
};

export function preloadRoute(to: string) {
  const exact = routePreloads[to];
  if (exact) {
    void exact();
    return;
  }

  const prefix = Object.keys(routePreloads)
    .filter((route) => route !== "/" && to.startsWith(`${route}/`))
    .sort((a, b) => b.length - a.length)[0];

  if (prefix) {
    void routePreloads[prefix]();
  }
}

export function preloadRoleRoutes(role: Role) {
  for (const route of roleRoutes[role]) {
    preloadRoute(route);
  }
}
