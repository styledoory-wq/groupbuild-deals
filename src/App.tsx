import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useApp } from "@/store/AppStore";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { RouteTransition } from "@/components/layout/RouteTransition";
import { MobileShell } from "@/components/layout/MobileShell";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound.tsx";
import ThankYou from "./pages/ThankYou";
import SupplierProfile from "./pages/SupplierProfile";
import NotificationSettings from "./pages/NotificationSettings";
import TermsResidents from "./pages/TermsResidents";
import TermsSuppliers from "./pages/TermsSuppliers";
import { TermsAcceptanceGate } from "./components/terms/TermsAcceptanceGate";

import ResidentDashboard from "./pages/resident/ResidentDashboard";
import ProjectsList from "./pages/resident/ProjectsList";
import CategoriesList from "./pages/resident/CategoriesList";
import DealsList from "./pages/resident/DealsList";
import CategorySuppliers from "./pages/resident/CategorySuppliers";
import DealDetail from "./pages/resident/DealDetail";
import ResidentProfile from "./pages/resident/ResidentProfile";
import ResidentProfileEdit from "./pages/resident/ResidentProfileEdit";
import Notifications from "./pages/resident/Notifications";
import MyOffers from "./pages/resident/MyOffers";
import MyDocuments from "./pages/resident/MyDocuments";

import SupplierDashboard from "./pages/supplier/SupplierDashboard";
import SupplierProfileEdit from "./pages/supplier/SupplierProfileEdit";
import SupplierOffers from "./pages/supplier/SupplierOffers";
import OfferEditor from "./pages/supplier/OfferEditor";
import SupplierOfferMarketingEdit from "./pages/supplier/SupplierOfferMarketingEdit";
import SupplierLeads from "./pages/supplier/SupplierLeads";
import SupplierReviews from "./pages/supplier/SupplierReviews";

const preloadResidentRoutes = () => {
  void import("./pages/resident/DealDetail");
  void import("./pages/resident/DealsList");
  void import("./pages/resident/MyOffers");
};

const preloadSupplierRoutes = () => {
  void import("./pages/supplier/SupplierLeads");
  void import("./pages/supplier/SupplierOffers");
};

// Admin routes — lazy loaded (rarely used by end-users, heavy bundle)
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

import PaymentSuccess from "./pages/payment/PaymentSuccess";
import PaymentCancel from "./pages/payment/PaymentCancel";

// React Query — sensible defaults to eliminate flicker between pages.
// Cached data is reused immediately, then refetched silently in the background.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,            // 1 min — reuse without immediate refetch
      gcTime: 5 * 60_000,           // keep in cache 5 min
      refetchOnWindowFocus: false,  // no surprise refetches when switching tabs
      refetchOnMount: false,        // trust cache on remount
      retry: 1,
    },
  },
});

const adminRoute = (el: React.ReactNode) => <RequireAdmin>{el}</RequireAdmin>;

const SuspenseFallback = () => (
  <MobileShell>
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
    </div>
  </MobileShell>
);

const PreloadImportantRoutes = () => {
  const { user, authReady } = useApp();

  useEffect(() => {
    if (!authReady || !user) return;
    const run = user.role === "supplier" ? preloadSupplierRoutes : preloadResidentRoutes;
    const idle = window.requestIdleCallback ?? ((cb: IdleRequestCallback) => window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 }), 1200));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
    const id = idle(run);
    return () => cancelIdle(id as never);
  }, [authReady, user?.role]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" dir="rtl" />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <PreloadImportantRoutes />
          <TermsAcceptanceGate>
            <RouteTransition>
              <Suspense fallback={<SuspenseFallback />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/index" element={<Navigate to="/" replace />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/thank-you" element={<ThankYou />} />
                  <Route path="/terms/residents" element={<TermsResidents />} />
                  <Route path="/terms/suppliers" element={<TermsSuppliers />} />
                  <Route path="/suppliers/:supplierId" element={<SupplierProfile />} />

                  {/* Resident */}
                  <Route path="/resident" element={<ResidentDashboard />} />
                  <Route path="/resident/projects" element={<ProjectsList />} />
                  <Route path="/resident/categories" element={<CategoriesList />} />
                  <Route path="/resident/categories/:categoryId" element={<CategorySuppliers />} />
                  <Route path="/resident/deals" element={<DealsList />} />
                  <Route path="/resident/deals/:dealId" element={<DealDetail />} />
                  <Route path="/resident/profile" element={<ResidentProfile />} />
                  <Route path="/resident/profile/edit" element={<ResidentProfileEdit />} />
                  <Route path="/resident/notifications" element={<Notifications />} />
                  <Route path="/resident/my-offers" element={<MyOffers />} />
                  <Route path="/resident/documents" element={<MyDocuments />} />

                  {/* Supplier */}
                  <Route path="/supplier" element={<SupplierDashboard />} />
                  <Route path="/supplier/profile/edit" element={<SupplierProfileEdit />} />
                  <Route path="/supplier/offers" element={<SupplierOffers />} />
                  <Route path="/supplier/offers/new" element={<OfferEditor />} />
                  <Route path="/supplier/offers/:dealId/marketing" element={<SupplierOfferMarketingEdit />} />
                  <Route path="/settings/notifications" element={<NotificationSettings />} />
                  <Route path="/supplier/leads" element={<SupplierLeads />} />
                  <Route path="/supplier/reviews" element={<SupplierReviews />} />

                  {/* Admin — hidden, gated, lazy */}
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

                  {/* Payment callbacks */}
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
