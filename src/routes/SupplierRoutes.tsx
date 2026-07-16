import { lazy } from "react";
import { Route } from "react-router-dom";
import { RequireRole, RequireAuth } from "./guards";

const SupplierDashboard = lazy(() => import("@/pages/supplier/SupplierDashboard"));
const SupplierOnboarding = lazy(() => import("@/pages/supplier/SupplierOnboarding"));
const SupplierProfileEdit = lazy(() => import("@/pages/supplier/SupplierProfileEdit"));
const SupplierOffers = lazy(() => import("@/pages/supplier/SupplierOffers"));
const OfferEditor = lazy(() => import("@/pages/supplier/OfferEditor"));
const SupplierOfferMarketingEdit = lazy(() => import("@/pages/supplier/SupplierOfferMarketingEdit"));
const SupplierMarketingTools = lazy(() => import("@/pages/supplier/SupplierMarketingTools"));
const MarketingTemplatesPreview = lazy(() => import("@/pages/supplier/MarketingTemplatesPreview"));
const SupplierLeads = lazy(() => import("@/pages/supplier/SupplierLeads"));
const SupplierDemandInbox = lazy(() => import("@/pages/supplier/SupplierDemandInbox"));
const SupplierReviews = lazy(() => import("@/pages/supplier/SupplierReviews"));
const SupplierScan = lazy(() => import("@/pages/supplier/SupplierScan"));
const SupplierRedemptions = lazy(() => import("@/pages/supplier/SupplierRedemptions"));
const SupplierRevenue = lazy(() => import("@/pages/supplier/SupplierRevenue"));
const SupplierAnalytics = lazy(() => import("@/pages/supplier/SupplierAnalytics"));
const SupplierAccount = lazy(() => import("@/pages/supplier/SupplierAccount"));
const SupplierDeposits = lazy(() => import("@/pages/supplier/SupplierDeposits"));
const DeleteAccount = lazy(() => import("@/pages/resident/DeleteAccount"));

const s = (el: React.ReactNode) => <RequireRole role="supplier">{el}</RequireRole>;
const a = (el: React.ReactNode) => <RequireAuth>{el}</RequireAuth>;

/** Routes bundled in the suppliers build (and the full web build). */
export const supplierRoutes = (
  <>
    <Route path="/supplier" element={s(<SupplierDashboard />)} />
    <Route path="/supplier/onboarding" element={a(<SupplierOnboarding />)} />
    <Route path="/supplier/profile/edit" element={s(<SupplierProfileEdit />)} />
    <Route path="/supplier/offers" element={s(<SupplierOffers />)} />
    <Route path="/supplier/offers/new" element={s(<OfferEditor />)} />
    <Route path="/supplier/offers/:dealId/edit" element={s(<OfferEditor />)} />
    <Route path="/supplier/offers/:dealId/marketing" element={s(<SupplierOfferMarketingEdit />)} />
    <Route path="/supplier/offers/:dealId/marketing-tools" element={s(<SupplierMarketingTools />)} />
    <Route path="/supplier/marketing-templates-preview" element={s(<MarketingTemplatesPreview />)} />
    <Route path="/supplier/leads" element={s(<SupplierLeads />)} />
    <Route path="/supplier/demand-inbox" element={s(<SupplierDemandInbox />)} />
    <Route path="/supplier/reviews" element={s(<SupplierReviews />)} />
    <Route path="/supplier/scan" element={s(<SupplierScan />)} />
    <Route path="/supplier/redemptions" element={s(<SupplierRedemptions />)} />
    <Route path="/supplier/revenue" element={s(<SupplierRevenue />)} />
    <Route path="/supplier/analytics" element={s(<SupplierAnalytics />)} />
    <Route path="/supplier/account" element={s(<SupplierAccount />)} />
    <Route path="/supplier/deposits" element={<SupplierDeposits />} />
    <Route path="/supplier/delete-account" element={s(<DeleteAccount />)} />
  </>
);
