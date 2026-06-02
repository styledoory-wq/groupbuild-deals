import { lazy, Suspense, useEffect } from "react";
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
import { TermsAcceptanceGate } from "./components/terms/TermsAcceptanceGate";
import ResidentDashboard from "./pages/resident/ResidentDashboard";

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
const DealsList = lazy(() => import("./pages/resident/DealsList"));
const CategorySuppliers = lazy(() => import("./pages/resident/CategorySuppliers"));
const DealDetail = lazy(() => import("./pages/resident/DealDetail"));
const ResidentProfile = lazy(() => import("./pages/resident/ResidentProfile"));
const ResidentProfileEdit = lazy(() => import("./pages/resident/ResidentProfileEdit"));
const Notifications = lazy(() => import("./pages/resident/Notifications"));
const MyOffers = lazy(() => import("./pages/resident/MyOffers"));
const MyDocuments = lazy(() => import("./pages/resident/MyDocuments"));
const MyDeposits = lazy(() => import("./pages/resident/MyDeposits"));
const MyVouchers = lazy(() => import("./pages/resident/MyVouchers"));
const SearchPage = lazy(() => import("./pages/resident/Search"));
const PrivacyPolicy = lazy(() => import("./pages/resident/PrivacyPolicy"));
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
const PaymentSuccess = lazy(() => import("./pages/payment/PaymentSuccess"));
const PaymentCancel = lazy(() => import("./pages/payment/PaymentCancel"));

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

const SuspenseFallback = () => (
  <div
    role="status"
    aria-label="טוען"
    className="flex items-center justify-center"
    style={{ minHeight: "100dvh", background: "#F4F6F9" }}
  >
    <div
      className="h-8 w-8 rounded-full border-2 animate-spin"
      style={{ borderColor: "#0A1F3D33", borderTopColor: "#C9A961" }}
    />
  </div>
);

const PreloadImportantRoutes = () => {
  const { user, authReady } = useApp();
  useEffect(() => {
    if (!authReady || !user) return;
    const run = () => {
      preloadRoleRoutes(user.role);
      if (user.role === "resident") {
        void import("./pages/resident/DealDetail");
        void import("./pages/resident/CategorySuppliers");
        void import("./lib/prefetchTabs").then((m) => m.prefetchResidentTabs());
      }
    };
    const idle = window.requestIdleCallback ?? ((cb: IdleRequestCallback) => window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 }), 1200));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
    const id = idle(run);
    return () => cancelIdle(id as never);
  }, [authReady, user?.role]);
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
                  <Route path="/resident" element={<ResidentDashboard />} />
                  <Route path="/resident/projects" element={<ProjectsList />} />
                  <Route path="/resident/categories" element={<CategoriesList />} />
                  <Route path="/resident/categories/:categoryId" element={<CategorySuppliers />} />
                  <Route path="/resident/deals" element={<DealsList />} />
                  <Route path="/resident/deals/:dealId" element={<DealDetail />} />
                  <Route path="/deals/:dealId" element={<SharedDeal />} />
                  <Route path="/share/deal/:dealId" element={<SharedDeal />} />
                  <Route path="/resident/profile" element={<ResidentProfile />} />
                  <Route path="/resident/profile/edit" element={<ResidentProfileEdit />} />
                  <Route path="/resident/notifications" element={<Notifications />} />
                  <Route path="/resident/my-offers" element={<MyOffers />} />
                  <Route path="/resident/documents" element={<MyDocuments />} />
                  <Route path="/resident/deposits" element={<MyDeposits />} />
                  <Route path="/resident/my-vouchers" element={<MyVouchers />} />
                  <Route path="/resident/search" element={<SearchPage />} />
                  <Route path="/resident/privacy" element={<PrivacyPolicy />} />
                  <Route path="/supplier" element={<SupplierDashboard />} />
                  <Route path="/supplier/profile/edit" element={<SupplierProfileEdit />} />
                  <Route path="/supplier/offers" element={<SupplierOffers />} />
                  <Route path="/supplier/offers/new" element={<OfferEditor />} />
                  <Route path="/supplier/offers/:dealId/marketing" element={<SupplierOfferMarketingEdit />} />
                  <Route path="/settings/notifications" element={<NotificationSettings />} />
                  <Route path="/supplier/leads" element={<SupplierLeads />} />
                  <Route path="/supplier/reviews" element={<SupplierReviews />} />
                  <Route path="/supplier/scan" element={<SupplierScan />} />
                  <Route path="/supplier/redemptions" element={<SupplierRedemptions />} />
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
                  <Route path="/admin/supplier-trust" element={adminRoute(<AdminSupplierTrust />)} />
                  <Route path="/payment/success" element={<PaymentSuccess />} />
                  <Route path="/payment/cancel" element={<PaymentCancel />} />
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
