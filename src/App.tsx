import { Suspense, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { lazy } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useApp } from "@/store/AppStore";
import { RouteTransition } from "@/components/layout/RouteTransition";
import { SplashScreen } from "@/components/SplashScreen";
import { preloadRoleRoutes } from "@/lib/routePreload";
import { prefetchEntryHero, resolveEntryHeroSrc } from "@/lib/prefetchEntryHero";
import { TermsAcceptanceGate } from "./components/terms/TermsAcceptanceGate";
import { PreviewModeBanner } from "./components/PreviewModeBanner";
import { GuestGateProvider } from "./hooks/useGuestGate";
import { publicRoutes } from "@/routes/PublicRoutes";
import { residentRoutes } from "@/routes/ResidentRoutes";
import { supplierRoutes } from "@/routes/SupplierRoutes";
import { adminRoutes } from "@/routes/AdminRoutes";
import {
  includesAdminRoutes,
  includesResidentRoutes,
  includesSupplierRoutes,
} from "@/config/appMode";

const NotFound = lazy(() => import("./pages/NotFound.tsx"));

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

const PreloadImportantRoutes = () => {
  const { user, authReady } = useApp();
  const role = user?.role;
  useEffect(() => {
    if (!authReady || !role) return;
    const run = () => {
      preloadRoleRoutes(role);
      if (role === "resident" && includesResidentRoutes) {
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
  const [heroReady, setHeroReady] = useState(() => resolveEntryHeroSrc() == null);

  useEffect(() => {
    let cancelled = false;
    void prefetchEntryHero().then(() => {
      if (!cancelled) setHeroReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Hold splash until auth + entry hero are ready so we never flash black→photo.
  return <SplashScreen ready={authReady && heroReady} />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" dir="rtl" />
        <HelmetProvider>
          <BrowserRouter>
            <AppSplash />
            <PreviewModeBanner />
            <PreloadImportantRoutes />
            <TermsAcceptanceGate>
              <GuestGateProvider>
                <RouteTransition>
                  <Suspense fallback={<SuspenseFallback />}>
                    <Routes>
                      {publicRoutes}
                      {includesResidentRoutes && residentRoutes}
                      {includesSupplierRoutes && supplierRoutes}
                      {includesAdminRoutes && adminRoutes}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </RouteTransition>
              </GuestGateProvider>
            </TermsAcceptanceGate>
          </BrowserRouter>
        </HelmetProvider>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
