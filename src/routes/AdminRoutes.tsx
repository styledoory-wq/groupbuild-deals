import { lazy } from "react";
import { Navigate, Route } from "react-router-dom";
import { RequireAdmin } from "@/components/auth/RequireAdmin";

const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminProjects = lazy(() => import("@/pages/admin/AdminProjects"));
const AdminDbSuppliers = lazy(() => import("@/pages/admin/AdminDbSuppliers"));
const AdminSupplierDetail = lazy(() => import("@/pages/admin/AdminSupplierDetail"));
const AdminResidents = lazy(() => import("@/pages/admin/AdminResidents"));
const AdminCategories = lazy(() => import("@/pages/admin/AdminCategories"));
const AdminCatalog = lazy(() => import("@/pages/admin/AdminCatalog"));
const AdminProjectStages = lazy(() => import("@/pages/admin/AdminProjectStages"));
const AdminDeals = lazy(() => import("@/pages/admin/AdminDeals"));
const AdminDeposits = lazy(() => import("@/pages/admin/AdminDeposits"));
const AdminPlatformFees = lazy(() => import("@/pages/admin/AdminPlatformFees"));
const AdminDealParticipationFees = lazy(() => import("@/pages/admin/AdminDealParticipationFees"));
const AdminFeeRevenue = lazy(() => import("@/pages/admin/AdminFeeRevenue"));
const AdminOfferPricingFixes = lazy(() => import("@/pages/admin/AdminOfferPricingFixes"));

const AdminPaymentSettings = lazy(() => import("@/pages/admin/AdminPaymentSettings"));
const AdminRegions = lazy(() => import("@/pages/admin/AdminRegions"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminReferrals = lazy(() => import("@/pages/admin/AdminReferrals"));
const AdminReferralSettings = lazy(() => import("@/pages/admin/AdminReferralSettings"));
const AdminPayments = lazy(() => import("@/pages/admin/AdminPayments"));
const AdminNotifications = lazy(() => import("@/pages/admin/AdminNotifications"));
const AdminSupport = lazy(() => import("@/pages/admin/AdminSupport"));
const AdminSupplierAreas = lazy(() => import("@/pages/admin/AdminSupplierAreas"));
const AdminSupplierMedia = lazy(() => import("@/pages/admin/AdminSupplierMedia"));
const AdminStats = lazy(() => import("@/pages/admin/AdminStats"));
const AdminComplaints = lazy(() => import("@/pages/admin/AdminComplaints"));
const AdminLeads = lazy(() => import("@/pages/admin/AdminLeads"));
const AdminSupplierTrust = lazy(() => import("@/pages/admin/AdminSupplierTrust"));
const AdminCommitteeRequests = lazy(() => import("@/pages/admin/AdminCommitteeRequests"));
const AdminDemandList = lazy(() => import("@/pages/admin/AdminDemandList"));
const AdminDemandDetail = lazy(() => import("@/pages/admin/AdminDemandDetail"));
const AdminMessageTemplates = lazy(() => import("@/pages/admin/AdminMessageTemplates"));
const OfferEditor = lazy(() => import("@/pages/supplier/OfferEditor"));
const DesignSystem = lazy(() => import("@/pages/DesignSystem"));

const g = (el: React.ReactNode) => <RequireAdmin>{el}</RequireAdmin>;

/** Admin routes — included ONLY in the full web build. */
export const adminRoutes = (
  <>
    <Route path="/admin/login" element={<AdminLogin />} />
    <Route path="/admin-login" element={<AdminLogin />} />
    <Route path="/admin" element={g(<AdminDashboard />)} />
    <Route path="/admin/projects" element={g(<AdminProjects />)} />
    <Route path="/admin/suppliers" element={g(<AdminDbSuppliers />)} />
    <Route path="/admin/suppliers/:supplierId" element={g(<AdminSupplierDetail />)} />
    <Route path="/admin/suppliers-mock" element={<Navigate to="/admin/suppliers" replace />} />
    <Route path="/admin/residents" element={g(<AdminResidents />)} />
    <Route path="/admin/categories" element={g(<AdminCategories />)} />
    <Route path="/admin/catalog" element={g(<AdminCatalog />)} />
    <Route path="/admin/project-stages" element={g(<AdminProjectStages />)} />
    <Route path="/admin/deals" element={g(<AdminDeals />)} />
    <Route path="/admin/deposits" element={g(<AdminDeposits />)} />
    <Route path="/admin/platform-fees" element={g(<AdminPlatformFees />)} />
    <Route path="/admin/deal-fees" element={g(<AdminDealParticipationFees />)} />
    <Route path="/admin/fee-revenue" element={g(<AdminFeeRevenue />)} />
    <Route path="/admin/offer-pricing-fixes" element={g(<AdminOfferPricingFixes />)} />

    <Route path="/admin/payment-settings" element={g(<AdminPaymentSettings />)} />
    <Route path="/admin/regions" element={g(<AdminRegions />)} />
    <Route path="/admin/users" element={g(<AdminUsers />)} />
    <Route path="/admin/settings" element={g(<AdminSettings />)} />
    <Route path="/admin/referrals" element={g(<AdminReferrals />)} />
    <Route path="/admin/referral-settings" element={g(<AdminReferralSettings />)} />
    <Route path="/admin/payments" element={g(<AdminPayments />)} />
    <Route path="/admin/control" element={<Navigate to="/admin" replace />} />
    <Route path="/admin/notifications" element={g(<AdminNotifications />)} />
    <Route path="/admin/support" element={g(<AdminSupport />)} />
    <Route path="/admin/suppliers/:supplierId/areas" element={g(<AdminSupplierAreas />)} />
    <Route path="/admin/suppliers/:supplierId/media" element={g(<AdminSupplierMedia />)} />
    <Route path="/admin/db-suppliers" element={<Navigate to="/admin/suppliers" replace />} />
    <Route path="/admin/stats" element={g(<AdminStats />)} />
    <Route path="/admin/complaints" element={g(<AdminComplaints />)} />
    <Route path="/admin/leads" element={g(<AdminLeads />)} />
    <Route path="/admin/supplier-trust" element={g(<AdminSupplierTrust />)} />
    <Route path="/admin/committee-requests" element={g(<AdminCommitteeRequests />)} />
    <Route path="/admin/demand" element={g(<AdminDemandList />)} />
    <Route path="/admin/demand/:id" element={g(<AdminDemandDetail />)} />
    <Route path="/admin/message-templates" element={g(<AdminMessageTemplates />)} />
    <Route path="/admin/offers/new" element={g(<OfferEditor />)} />
    <Route path="/admin/offers/:dealId/edit" element={g(<OfferEditor />)} />
    <Route path="/design-system" element={g(<DesignSystem />)} />
  </>
);
