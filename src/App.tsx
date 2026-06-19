import { lazy, Suspense, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useApp } from "@/store/AppStore";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { RouteTransition } from "@/components/layout/RouteTransition";
import { SplashScreen } from "@/components/SplashScreen";
import { preloadRoleRoutes } from "@/lib/routePreload";
import { isAdminEmail } from "@/lib/auth";
import { TermsAcceptanceGate } from "./components/terms/TermsAcceptanceGate";
import { PreviewModeBanner } from "./components/PreviewModeBanner";
import { getPreviewRole } from "./lib/previewMode";

const Welcome = lazy(() => import("./pages/Welcome"));
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const ThankYou = lazy(() => import("./pages/ThankYou"));
const SupplierProfile = lazy(() => import("./pages/SupplierProfile"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const TermsResidents = lazy(() => import("./pages/TermsResidents"));
const TermsSuppliers = lazy(() => import("./pages/TermsSuppliers"));
const SharedDeal = lazy(() => import("./pages/SharedDeal"));
const ProjectsList = lazy(() => import("./pages/resident/ProjectsList"));
const CategoriesList = lazy(() => import("./pages/resident/CategoriesList"));
const ResidentDashboard = lazy(() => import("./pages/resident/ResidentDashboard"));
const DealsList = lazy(() => import("./pages/resident/DealsList"));
const CategorySuppliers = lazy(() => import("./pages/resident/CategorySuppliers"));
const DealDetail = lazy(() => import("./pages/resident/DealDetail"));
const ResidentProfile = lazy(() => import("./pages/resident/ResidentProfile"));
const ResidentProfileEdit = lazy(() => import("./pages/resident/ResidentProfileEdit"));
const DeleteAccount = lazy(() => import("./pages/resident/DeleteAccount"));
const Notifications = lazy(() => import("./pages/resident/Notifications"));
const MyOffers = lazy(() => import("./pages/resident/MyOffers"));
const MyDocuments = lazy(() => import("./pages/resident/MyDocuments"));
const MyDeposits = lazy(() => import("./pages/resident/MyDeposits"));
const MyVouchers = lazy(() => import("./pages/resident/MyVouchers"));
const SearchPage = lazy(() => import("./pages/resident/Search"));
const Favorites = lazy(() => import("./pages/resident/Favorites"));
const BudgetPlanner = lazy(() => import("./pages/resident/BudgetPlanner"));
const Browse = lazy(() => import("./pages/Browse"));
const PrivacyPolicy = lazy(() => import("./pages/resident/PrivacyPolicy"));
const PublicPrivacy = lazy(() => import("./pages/Privacy"));
const PublicSupport = lazy(() => import("./pages/Support"));
const SupplierScan = lazy(() => import("./pages/supplier/SupplierScan"));
const SupplierRedemptions = lazy(() => import("./pages/supplier/SupplierRedemptions"));
const AdminComplaints = lazy(() => import("./pages/admin/AdminComplaints"));
const AdminSupplierTrust = lazy(() => import("./pages/admin/AdminSupplierTrust"));
const SupplierDashboard = lazy(() => import("./pages/supplier/SupplierDashboard"));
const SupplierProfileEdit = lazy(() => import("./pages/supplier/SupplierProfileEdit"));
const SupplierOffers = lazy(() => import("./pages/supplier/SupplierOffers"));
const OfferEditor = lazy(() => import("./pages/supplier/OfferEditor"));
const SupplierOfferMarketingEdit = lazy(() => import("./pages/supplier/SupplierOfferMarketingEdit"));
const SupplierLeads = lazy(() => import("./pages/supplier/SupplierLeads"));
const SupplierReviews = lazy(() => import("./pages/supplier/SupplierReviews"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProjects = lazy(() => import("./pages/admin/AdminProjects"));
const AdminResidents = lazy(() => import("./pages/admin/AdminResidents"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminDeals = lazy(() => import("./pages/admin/AdminDeals"));
const AdminDeposits = lazy(() => import("./pages/admin/AdminDeposits"));
const AdminStats = lazy(() => import("./pages/admin/AdminStats"));
const AdminPaymentSettings = lazy(() => import("./pages/admin/AdminPaymentSettings"));
const AdminRegions = lazy(() => import("./pages/admin/AdminRegions"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminSupplierAreas = lazy(() => import("./pages/admin/AdminSupplierAreas"));
const AdminSupplierMedia = lazy(() => import("./pages/admin/AdminSupplierMedia"));
const AdminDbSuppliers = lazy(() => import("./pages/admin/AdminDbSuppliers"));
const AdminLeads = lazy(() => import("./pages/admin/AdminLeads"));
const AdminCommitteeRequests = lazy(() => import("./pages/admin/AdminCommitteeRequests"));
const CommitteeDashboard = lazy(() => import("./pages/committee/CommitteeDashboard"));
const CommitteeRequest = lazy(() => import("./pages/committee/CommitteeRequest"));
const CommitteeQuoteRequest = lazy(() => import("./pages/committee/CommitteeQuoteRequest"));
const PaymentCheckout = lazy(() => import("./pages/payment/PaymentCheckout"));
const CheckoutSummary = lazy(() => import("./pages/payment/CheckoutSummary"));
const PaymentSuccess = lazy(() => import("./pages/payment/PaymentSuccess"));
const PaymentCancel = lazy(() => import("./pages/payment/PaymentCancel"));
const DesignSystem = lazy(() => import("./pages/DesignSystem"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

const adminRoute = (el: React.ReactNode) => <RequireAdmin>{el}</RequireAdmin>;

const SuspenseFallback = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShow(true), 800);
    return () => window.clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div
      role="status"
      aria-label="טוען"
      className="fixed top-0 inset-x-0 z-[80] pointer-events-none"
    >
      <div className="h-[2px] w-full overflow-hidden">
        <div
          className="h-full"
          style={{
            width: "40%",
            background: "linear-gradient(90deg, transparent, #C9A961, transparent)",
            animation: "gb-route-progress 1.1s ease-in-out infinite",
          }}
        />
      </div>
      <style>{`
        @keyframes gb-route-progress {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
};

const roleHome = (role: "resident" | "supplier" | "admin") => {
  if (role === "admin") return "/admin";
  return role === "supplier" ? "/supplier" : "/resident";
};

const RequireRole = ({ role, children }: { role: "resident" | "supplier"; children: React.ReactNode }) => {
  const { user, authReady } = useApp();

  if (!authReady) return <SuspenseFallback />;
  if (!user) return <Navigate to="/auth" replace />;
  // Admins can preview the resident/supplier UI when previewRole is set in sessionStorage
  const previewRole = getPreviewRole();
  if (isAdminEmail(user.email) || user.role === "admin") {
    if (previewRole === role) return <>{children}</>;
    return <Navigate to="/admin" replace />;
  }
  if (user.role !== role) return <Navigate to={roleHome(user.role)} replace />;

  return <>{children}</>;
};

const residentRoute = (el: React.ReactNode) => <RequireRole role="resident">{el}</RequireRole>;
const supplierRoute = (el: React.ReactNode) => <RequireRole role="supplier">{el}</RequireRole>;

const PreloadImportantRoutes = () => {
  const { user, authReady } = useApp();
  const role = user?.role;
  useEffect(() => {
    if (!authReady || !role) return;
    const run = () => {
      preloadRoleRoutes(role);
      if (role === "resident") {
        void import("./pages/resident/DealDetail");
        void import("./pages/resident/CategorySuppliers");
      }
    };
    const idle = window.requestIdleCallback ?? ((cb: IdleRequestCallback) => window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 }), 1200));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
    const id = idle(run);
    return () => cancelIdle(id as never);
  }, [authReady, role]);
  return null;
};

const AppSplash = () => {
  const { authReady } = useApp();
  return <SplashScreen ready={authReady} />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" dir="rtl" />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppSplash />
          <PreviewModeBanner />
          <PreloadImportantRoutes />
          <TermsAcceptanceGate>
            <RouteTransition>
              <Suspense fallback={<SuspenseFallback />}>
                <Routes>
                  <Route path="/" element={<Welcome />} />
                  <Route path="/about" element={<Landing />} />
                  <Route path="/index" element={<Navigate to="/" replace />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/thank-you" element={<ThankYou />} />
                  <Route path="/terms/residents" element={<TermsResidents />} />
                  <Route path="/terms/suppliers" element={<TermsSuppliers />} />
                  <Route path="/suppliers/:supplierId" element={<SupplierProfile />} />
                  <Route path="/resident" element={residentRoute(<ResidentDashboard />)} />
                  <Route path="/resident/projects" element={residentRoute(<ProjectsList />)} />
                  {/* Public read-only browsing — no auth required */}
                  <Route path="/resident/categories" element={<CategoriesList />} />
                  <Route path="/resident/categories/:categoryId" element={<CategorySuppliers />} />
                  <Route path="/resident/deals" element={<DealsList />} />
                  <Route path="/resident/deals/:dealId" element={<DealDetail />} />
                  <Route path="/categories" element={<CategoriesList />} />
                  <Route path="/categories/:categoryId" element={<CategorySuppliers />} />
                  <Route path="/deals" element={<DealsList />} />
                  <Route path="/deals/:dealId" element={<DealDetail />} />
                  <Route path="/share/deal/:dealId" element={<SharedDeal />} />
                  <Route path="/browse" element={<Browse />} />
                  <Route path="/resident/favorites" element={residentRoute(<Favorites />)} />
                  <Route path="/resident/budget-planner" element={residentRoute(<BudgetPlanner />)} />
                  <Route path="/resident/profile" element={residentRoute(<ResidentProfile />)} />
                  <Route path="/resident/profile/edit" element={residentRoute(<ResidentProfileEdit />)} />
                  <Route path="/resident/delete-account" element={residentRoute(<DeleteAccount />)} />
                  <Route path="/supplier/delete-account" element={supplierRoute(<DeleteAccount />)} />
                  <Route path="/resident/notifications" element={residentRoute(<Notifications />)} />
                  <Route path="/resident/my-offers" element={residentRoute(<MyOffers />)} />
                  <Route path="/resident/documents" element={residentRoute(<MyDocuments />)} />
                  <Route path="/resident/deposits" element={residentRoute(<MyDeposits />)} />
                  <Route path="/resident/my-vouchers" element={residentRoute(<MyVouchers />)} />
                  <Route path="/my-offers" element={<Navigate to="/resident/my-offers" replace />} />
                  <Route path="/my-vouchers" element={<Navigate to="/resident/my-vouchers" replace />} />
                  <Route path="/resident/search" element={<SearchPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/resident/privacy" element={residentRoute(<PrivacyPolicy />)} />
                  <Route path="/privacy" element={<PublicPrivacy />} />
                  <Route path="/support" element={<PublicSupport />} />
                  <Route path="/supplier" element={supplierRoute(<SupplierDashboard />)} />
                  <Route path="/supplier/profile/edit" element={supplierRoute(<SupplierProfileEdit />)} />
                  <Route path="/supplier/offers" element={supplierRoute(<SupplierOffers />)} />
                  <Route path="/supplier/offers/new" element={supplierRoute(<OfferEditor />)} />
                  <Route path="/supplier/offers/:dealId/edit" element={supplierRoute(<OfferEditor />)} />
                  <Route path="/supplier/offers/:dealId/marketing" element={supplierRoute(<SupplierOfferMarketingEdit />)} />
                  <Route path="/settings/notifications" element={<NotificationSettings />} />
                  <Route path="/supplier/leads" element={supplierRoute(<SupplierLeads />)} />
                  <Route path="/supplier/reviews" element={supplierRoute(<SupplierReviews />)} />
                  <Route path="/supplier/scan" element={supplierRoute(<SupplierScan />)} />
                  <Route path="/supplier/redemptions" element={supplierRoute(<SupplierRedemptions />)} />
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin-login" element={<AdminLogin />} />
                  <Route path="/admin" element={adminRoute(<AdminDashboard />)} />
                  <Route path="/admin/projects" element={adminRoute(<AdminProjects />)} />
                  <Route path="/admin/suppliers" element={adminRoute(<AdminDbSuppliers />)} />
                  <Route path="/admin/suppliers-mock" element={<Navigate to="/admin/suppliers" replace />} />
                  <Route path="/admin/residents" element={adminRoute(<AdminResidents />)} />
                  <Route path="/admin/categories" element={adminRoute(<AdminCategories />)} />
                  <Route path="/admin/deals" element={adminRoute(<AdminDeals />)} />
                  <Route path="/admin/deposits" element={adminRoute(<AdminDeposits />)} />
                  <Route path="/admin/payment-settings" element={adminRoute(<AdminPaymentSettings />)} />
                  <Route path="/admin/regions" element={adminRoute(<AdminRegions />)} />
                  <Route path="/admin/users" element={adminRoute(<AdminUsers />)} />
                  <Route path="/admin/settings" element={adminRoute(<AdminSettings />)} />
                  <Route path="/admin/suppliers/:supplierId/areas" element={adminRoute(<AdminSupplierAreas />)} />
                  <Route path="/admin/suppliers/:supplierId/media" element={adminRoute(<AdminSupplierMedia />)} />
                  <Route path="/admin/db-suppliers" element={adminRoute(<AdminDbSuppliers />)} />
                  <Route path="/admin/stats" element={adminRoute(<AdminStats />)} />
                  <Route path="/admin/complaints" element={adminRoute(<AdminComplaints />)} />
                  <Route path="/admin/leads" element={adminRoute(<AdminLeads />)} />
                  <Route path="/admin/supplier-trust" element={adminRoute(<AdminSupplierTrust />)} />
                  <Route path="/admin/committee-requests" element={adminRoute(<AdminCommitteeRequests />)} />
                  <Route path="/committee" element={<CommitteeDashboard />} />
                  <Route path="/committee/request" element={<CommitteeRequest />} />
                  <Route path="/committee/quote-request" element={<CommitteeQuoteRequest />} />
                  <Route path="/payment/checkout" element={<PaymentCheckout />} />
                  <Route path="/checkout/:dealId" element={<CheckoutSummary />} />
                  <Route path="/payment/success" element={<PaymentSuccess />} />
                  <Route path="/payment/cancel" element={<PaymentCancel />} />
<Route path="/design-system" element={adminRoute(<DesignSystem />)} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </RouteTransition>
          </TermsAcceptanceGate>
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;