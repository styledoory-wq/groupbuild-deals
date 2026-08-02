import { lazy } from "react";
import { Navigate, Route } from "react-router-dom";
import { IS_RESIDENTS_BUILD, IS_SUPPLIERS_BUILD } from "@/config/appMode";

// Entry landings are eager — lazy chunks delay hero photo paint (black flash).
import ResidentsHome from "@/pages/marketing/ResidentsHome";
import SuppliersHome from "@/pages/marketing/SuppliersHome";
import Gateway from "@/pages/marketing/Gateway";
import SuppliersLanding from "@/pages/marketing/SuppliersLanding";
import ResidentsLanding from "@/pages/marketing/ResidentsLanding";

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
const DeepLinkRedirect = lazy(() => import("@/pages/public/DeepLinkRedirect"));
const Browse = lazy(() => import("@/pages/Browse"));
const SearchPage = lazy(() => import("@/pages/resident/Search"));
const PublicPrivacy = lazy(() => import("@/pages/Privacy"));
const PublicSupport = lazy(() => import("@/pages/Support"));
const NotificationSettings = lazy(() => import("@/pages/NotificationSettings"));
const PaymentSuccess = lazy(() => import("@/pages/PaymentSuccess"));
const PaymentCancel = lazy(() => import("@/pages/PaymentCancel"));
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
    {/* Role-specific app homes:
        - residents build → ResidentsHome
        - suppliers build → SuppliersHome
        - web → Gateway chooser */}
    <Route
      path="/"
      element={
        IS_RESIDENTS_BUILD ? <ResidentsHome /> : IS_SUPPLIERS_BUILD ? <SuppliersHome /> : <Gateway />
      }
    />
    {/* Guest app home — never the role-split Gateway. */}
    <Route
      path="/home"
      element={IS_SUPPLIERS_BUILD ? <SuppliersHome /> : <ResidentsHome />}
    />
    <Route path="/welcome" element={<Navigate to="/" replace />} />

    <Route path="/site" element={<Navigate to="/" replace />} />
    <Route path="/landing" element={<Navigate to="/" replace />} />
    <Route path="/about" element={<Navigate to="/" replace />} />
    <Route path="/index" element={<Navigate to="/" replace />} />
    {!IS_RESIDENTS_BUILD && <Route path="/suppliers" element={<SuppliersLanding />} />}
    {!IS_SUPPLIERS_BUILD && <Route path="/residents" element={<ResidentsLanding />} />}
    <Route path="/auth" element={<Auth />} />
    {!IS_RESIDENTS_BUILD && <Route path="/auth/supplier" element={<Auth lockedRole="supplier" />} />}
    {!IS_SUPPLIERS_BUILD && <Route path="/auth/resident" element={<Auth lockedRole="resident" />} />}
    {IS_RESIDENTS_BUILD && <Route path="/suppliers" element={<Navigate to="/" replace />} />}
    {IS_RESIDENTS_BUILD && <Route path="/auth/supplier" element={<Navigate to="/auth/resident" replace />} />}
    {IS_SUPPLIERS_BUILD && <Route path="/residents" element={<Navigate to="/" replace />} />}
    {IS_SUPPLIERS_BUILD && <Route path="/auth/resident" element={<Navigate to="/auth/supplier" replace />} />}
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
    {/* Universal Link namespaces — residents: /r/*, suppliers: /b/* */}
    {!IS_SUPPLIERS_BUILD && <Route path="/r/*" element={<DeepLinkRedirect base="resident" />} />}
    {!IS_RESIDENTS_BUILD && <Route path="/b/*" element={<DeepLinkRedirect base="supplier" />} />}
    {IS_SUPPLIERS_BUILD && <Route path="/r/*" element={<Navigate to="/" replace />} />}
    {IS_RESIDENTS_BUILD && <Route path="/b/*" element={<Navigate to="/" replace />} />}
    <Route path="/browse" element={<Browse />} />
    <Route path="/search" element={<SearchPage />} />
    <Route path="/privacy" element={<PublicPrivacy />} />
    <Route path="/support" element={<PublicSupport />} />
    <Route path="/payment/success" element={<PaymentSuccess />} />
    <Route path="/payment/cancel" element={<PaymentCancel />} />
    <Route path="/settings/notifications" element={<NotificationSettings />} />
    <Route path="/marketing-templates-preview" element={<MarketingTemplatesPreview />} />
    <Route path="/marketing-mockups" element={<MarketingMockups />} />
    <Route path="/committee" element={<CommitteeDashboard />} />
    <Route path="/committee/request" element={<CommitteeRequest />} />
    <Route path="/committee/quote-request" element={<CommitteeQuoteRequest />} />
  </>
);
