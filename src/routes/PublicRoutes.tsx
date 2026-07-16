import { lazy } from "react";
import { Navigate, Route } from "react-router-dom";

const Gateway = lazy(() => import("@/pages/marketing/Gateway"));
const SuppliersLanding = lazy(() => import("@/pages/marketing/SuppliersLanding"));
const ResidentsLanding = lazy(() => import("@/pages/marketing/ResidentsLanding"));
const Auth = lazy(() => import("@/pages/Auth"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const ThankYou = lazy(() => import("@/pages/ThankYou"));
const Unsubscribe = lazy(() => import("@/pages/Unsubscribe"));
const TermsResidents = lazy(() => import("@/pages/TermsResidents"));
const TermsSuppliers = lazy(() => import("@/pages/TermsSuppliers"));
const SupplierProfile = lazy(() => import("@/pages/SupplierProfile"));
const PublicSupplierRedirect = lazy(() => import("@/pages/public/PublicSupplierRedirect"));
const PublicCategoryRedirect = lazy(() => import("@/pages/public/PublicCategoryRedirect"));
const CityCategoryPage = lazy(() => import("@/pages/public/CityCategoryPage"));
const CategoriesList = lazy(() => import("@/pages/resident/CategoriesList"));
const CategorySuppliers = lazy(() => import("@/pages/resident/CategorySuppliers"));
const DealsList = lazy(() => import("@/pages/resident/DealsList"));
const DealDetail = lazy(() => import("@/pages/resident/DealDetail"));
const SharedDeal = lazy(() => import("@/pages/SharedDeal"));
const Browse = lazy(() => import("@/pages/Browse"));
const SearchPage = lazy(() => import("@/pages/resident/Search"));
const PublicPrivacy = lazy(() => import("@/pages/Privacy"));
const PublicSupport = lazy(() => import("@/pages/Support"));
const NotificationSettings = lazy(() => import("@/pages/NotificationSettings"));
const MarketingTemplatesPreview = lazy(() => import("@/pages/supplier/MarketingTemplatesPreview"));
const MarketingMockups = lazy(() => import("@/pages/supplier/MarketingMockups"));
const CommitteeDashboard = lazy(() => import("@/pages/committee/CommitteeDashboard"));
const CommitteeRequest = lazy(() => import("@/pages/committee/CommitteeRequest"));
const CommitteeQuoteRequest = lazy(() => import("@/pages/committee/CommitteeQuoteRequest"));

/**
 * Routes available in every build (residents, suppliers, web).
 * Marketing, auth, terms, public browsing, share links, committee.
 */
export const publicRoutes = (
  <>
    <Route path="/" element={<Gateway />} />
    <Route path="/welcome" element={<Navigate to="/" replace />} />
    <Route path="/site" element={<Navigate to="/" replace />} />
    <Route path="/landing" element={<Navigate to="/" replace />} />
    <Route path="/about" element={<Navigate to="/" replace />} />
    <Route path="/index" element={<Navigate to="/" replace />} />
    <Route path="/suppliers" element={<SuppliersLanding />} />
    <Route path="/residents" element={<ResidentsLanding />} />
    <Route path="/auth" element={<Auth />} />
    <Route path="/auth/supplier" element={<Auth lockedRole="supplier" />} />
    <Route path="/auth/resident" element={<Auth lockedRole="resident" />} />
    <Route path="/onboarding" element={<Onboarding />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/thank-you" element={<ThankYou />} />
    <Route path="/unsubscribe" element={<Unsubscribe />} />
    <Route path="/terms/residents" element={<TermsResidents />} />
    <Route path="/terms/suppliers" element={<TermsSuppliers />} />
    <Route path="/suppliers/:supplierId" element={<SupplierProfile />} />
    <Route path="/supplier/:slug" element={<PublicSupplierRedirect />} />
    <Route path="/category/:slug" element={<PublicCategoryRedirect />} />
    <Route path="/city/:citySlug/:categorySlug" element={<CityCategoryPage />} />
    <Route path="/categories" element={<CategoriesList />} />
    <Route path="/categories/:categoryId" element={<CategorySuppliers />} />
    <Route path="/deals" element={<DealsList />} />
    <Route path="/deals/:dealId" element={<DealDetail />} />
    <Route path="/share/deal/:dealId" element={<SharedDeal />} />
    <Route path="/browse" element={<Browse />} />
    <Route path="/search" element={<SearchPage />} />
    <Route path="/privacy" element={<PublicPrivacy />} />
    <Route path="/support" element={<PublicSupport />} />
    <Route path="/settings/notifications" element={<NotificationSettings />} />
    <Route path="/marketing-templates-preview" element={<MarketingTemplatesPreview />} />
    <Route path="/marketing-mockups" element={<MarketingMockups />} />
    <Route path="/committee" element={<CommitteeDashboard />} />
    <Route path="/committee/request" element={<CommitteeRequest />} />
    <Route path="/committee/quote-request" element={<CommitteeQuoteRequest />} />
  </>
);
