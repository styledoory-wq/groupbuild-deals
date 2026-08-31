import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useApp } from "@/store/AppStore";
import { getPreviewRole } from "@/lib/previewMode";
import { isAdminEmail } from "@/lib/auth";
import { setPendingReturnUrl, isSafeReturnUrl } from "@/lib/returnUrl";
import { IS_RESIDENTS_BUILD, IS_SUPPLIERS_BUILD } from "@/config/appMode";
import { isShowcase } from "@/lib/showcase";

const roleHome = (role: "resident" | "supplier" | "admin") => {
  // Role homes that don't exist in a single-role build would render the 404
  // screen (e.g. an admin tapping a supplier CTA inside the suppliers app).
  if (IS_SUPPLIERS_BUILD) return role === "supplier" ? "/supplier" : "/";
  if (IS_RESIDENTS_BUILD) return role === "resident" ? "/resident" : "/";
  if (role === "admin") return "/admin";
  return role === "supplier" ? "/supplier" : "/resident";
};


const authRouteFor = (role: "resident" | "supplier"): string => {
  if (IS_RESIDENTS_BUILD) return "/auth/resident";
  if (IS_SUPPLIERS_BUILD) return "/auth/supplier";
  return role === "supplier" ? "/auth/supplier" : "/auth/resident";
};

/** Thin loader used while auth state hydrates. */
function AuthPending() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShow(true), 350);
    return () => window.clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div className="flex min-h-[45vh] w-full items-center justify-center" role="status" aria-label="טוען">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );
}

/** Save the current location so /auth can bounce the user back after signin. */
function useCaptureReturnUrl(active: boolean) {
  const loc = useLocation();
  useEffect(() => {
    if (!active) return;
    const target = `${loc.pathname}${loc.search}${loc.hash}`;
    if (isSafeReturnUrl(target)) setPendingReturnUrl(target);
  }, [active, loc.pathname, loc.search, loc.hash]);
}

export function RequireRole({
  role,
  children,
}: {
  role: "resident" | "supplier";
  children: React.ReactNode;
}) {
  const { user, authReady } = useApp();
  const notSignedIn = authReady && !user;
  useCaptureReturnUrl(notSignedIn);
  // Showcase (App Store screenshots) — render demo screens without a session.
  if (isShowcase()) return <>{children}</>;
  if (!authReady) return <AuthPending />;
  if (!user) return <Navigate to={authRouteFor(role)} replace />;
  const previewRole = getPreviewRole();
  if (isAdminEmail(user.email) || user.role === "admin") {
    if (previewRole === role) return <>{children}</>;
    // Single-role app builds have no /admin route — keep admins inside the app.
    if (IS_SUPPLIERS_BUILD || IS_RESIDENTS_BUILD) return <>{children}</>;
    return <Navigate to="/admin" replace />;
  }

  if (user.role !== role) return <Navigate to={roleHome(user.role)} replace />;
  return <>{children}</>;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, authReady } = useApp();
  const notSignedIn = authReady && !user;
  useCaptureReturnUrl(notSignedIn);
  if (isShowcase()) return <>{children}</>;
  if (!authReady) return <AuthPending />;
  if (!user) return <Navigate to={IS_SUPPLIERS_BUILD ? "/auth/supplier" : "/auth/resident"} replace />;
  return <>{children}</>;
}
