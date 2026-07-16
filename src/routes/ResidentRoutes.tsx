import { lazy } from "react";
import { Navigate, Route } from "react-router-dom";
import { RequireRole } from "./guards";

const ResidentDashboard = lazy(() => import("@/pages/resident/ResidentDashboard"));
const ProjectsList = lazy(() => import("@/pages/resident/ProjectsList"));
const CategoriesList = lazy(() => import("@/pages/resident/CategoriesList"));
const CategoryStages = lazy(() => import("@/pages/resident/CategoryStages"));
const CategorySuppliers = lazy(() => import("@/pages/resident/CategorySuppliers"));
const ProjectManagement = lazy(() => import("@/pages/resident/ProjectManagement"));
const ProjectJoin = lazy(() => import("@/pages/resident/ProjectJoin"));
const DealsList = lazy(() => import("@/pages/resident/DealsList"));
const DealDetail = lazy(() => import("@/pages/resident/DealDetail"));
const Favorites = lazy(() => import("@/pages/resident/Favorites"));
const BudgetPlanner = lazy(() => import("@/pages/resident/BudgetPlanner"));
const ResidentProfile = lazy(() => import("@/pages/resident/ResidentProfile"));
const ResidentProfileEdit = lazy(() => import("@/pages/resident/ResidentProfileEdit"));
const DeleteAccount = lazy(() => import("@/pages/resident/DeleteAccount"));
const Notifications = lazy(() => import("@/pages/resident/Notifications"));
const MyOffers = lazy(() => import("@/pages/resident/MyOffers"));
const MyDocuments = lazy(() => import("@/pages/resident/MyDocuments"));
const MyDeposits = lazy(() => import("@/pages/resident/MyDeposits"));
const MyVouchers = lazy(() => import("@/pages/resident/MyVouchers"));
const CreateDemand = lazy(() => import("@/pages/resident/CreateDemand"));
const MyDemands = lazy(() => import("@/pages/resident/MyDemands"));
const SearchPage = lazy(() => import("@/pages/resident/Search"));
const PrivacyPolicy = lazy(() => import("@/pages/resident/PrivacyPolicy"));

const r = (el: React.ReactNode) => <RequireRole role="resident">{el}</RequireRole>;

/** Routes bundled in the residents build (and the full web build). */
export const residentRoutes = (
  <>
    <Route path="/resident" element={r(<ResidentDashboard />)} />
    <Route path="/resident/projects" element={r(<ProjectsList />)} />
    <Route path="/resident/categories" element={<CategoriesList />} />
    <Route path="/resident/categories/stages" element={<CategoryStages />} />
    <Route path="/resident/categories/:categoryId" element={<CategorySuppliers />} />
    <Route path="/resident/project-management" element={r(<ProjectManagement />)} />
    <Route path="/project/join/:token" element={<ProjectJoin />} />
    <Route path="/resident/deals" element={<DealsList />} />
    <Route path="/resident/deals/:dealId" element={<DealDetail />} />
    <Route path="/resident/favorites" element={r(<Favorites />)} />
    <Route path="/resident/budget-planner" element={r(<BudgetPlanner />)} />
    <Route path="/resident/profile" element={r(<ResidentProfile />)} />
    <Route path="/resident/profile/edit" element={r(<ResidentProfileEdit />)} />
    <Route path="/resident/delete-account" element={r(<DeleteAccount />)} />
    <Route path="/resident/notifications" element={r(<Notifications />)} />
    <Route path="/resident/my-offers" element={r(<MyOffers />)} />
    <Route path="/resident/documents" element={r(<MyDocuments />)} />
    <Route path="/resident/deposits" element={r(<MyDeposits />)} />
    <Route path="/resident/my-vouchers" element={r(<MyVouchers />)} />
    <Route path="/my-offers" element={<Navigate to="/resident/my-offers" replace />} />
    <Route path="/my-vouchers" element={<Navigate to="/resident/my-vouchers" replace />} />
    <Route path="/resident/demand/new" element={r(<CreateDemand />)} />
    <Route path="/resident/demands" element={r(<MyDemands />)} />
    <Route path="/resident/search" element={<SearchPage />} />
    <Route path="/resident/privacy" element={r(<PrivacyPolicy />)} />
  </>
);
