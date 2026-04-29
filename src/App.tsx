import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/store/AppStore";
import { RequireAdmin } from "@/components/auth/RequireAdmin";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound.tsx";
import ThankYou from "./pages/ThankYou";
import SupplierProfile from "./pages/SupplierProfile";

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

import SupplierDashboard from "./pages/supplier/SupplierDashboard";
import SupplierProfileEdit from "./pages/supplier/SupplierProfileEdit";
import SupplierOffers from "./pages/supplier/SupplierOffers";
import OfferEditor from "./pages/supplier/OfferEditor";
import SupplierLeads from "./pages/supplier/SupplierLeads";
import SupplierReviews from "./pages/supplier/SupplierReviews";

import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProjects from "./pages/admin/AdminProjects";
import AdminSuppliers from "./pages/admin/AdminSuppliers";
import AdminResidents from "./pages/admin/AdminResidents";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminDeals from "./pages/admin/AdminDeals";
import AdminDeposits from "./pages/admin/AdminDeposits";
import AdminStats from "./pages/admin/AdminStats";
import AdminPaymentSettings from "./pages/admin/AdminPaymentSettings";
import AdminRegions from "./pages/admin/AdminRegions";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminSupplierAreas from "./pages/admin/AdminSupplierAreas";
import AdminSupplierMedia from "./pages/admin/AdminSupplierMedia";
import AdminDbSuppliers from "./pages/admin/AdminDbSuppliers";

import PaymentSuccess from "./pages/payment/PaymentSuccess";
import PaymentCancel from "./pages/payment/PaymentCancel";

const queryClient = new QueryClient();

const adminRoute = (el: React.ReactNode) => <RequireAdmin>{el}</RequireAdmin>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" dir="rtl" />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/thank-you" element={<ThankYou />} />
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

            {/* Supplier */}
            <Route path="/supplier" element={<SupplierDashboard />} />
            <Route path="/supplier/profile/edit" element={<SupplierProfileEdit />} />
            <Route path="/supplier/offers" element={<SupplierOffers />} />
            <Route path="/supplier/offers/new" element={<OfferEditor />} />
            <Route path="/supplier/leads" element={<SupplierLeads />} />
            <Route path="/supplier/reviews" element={<SupplierReviews />} />

            {/* Admin — hidden, gated */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin" element={adminRoute(<AdminDashboard />)} />
            <Route path="/admin/projects" element={adminRoute(<AdminProjects />)} />
            <Route path="/admin/suppliers" element={adminRoute(<AdminDbSuppliers />)} />
            <Route path="/admin/suppliers-mock" element={adminRoute(<AdminSuppliers />)} />
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
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
