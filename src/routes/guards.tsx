import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useApp } from "@/store/AppStore";
import { getPreviewRole } from "@/lib/previewMode";
import { isAdminEmail } from "@/lib/auth";

const roleHome = (role: "resident" | "supplier" | "admin") => {
  if (role === "admin") return "/admin";
  return role === "supplier" ? "/supplier" : "/resident";
};

/** Thin loader used while auth state hydrates. */
function AuthPending() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShow(true), 800);
    return () => window.clearTimeout(t);
  }, []);
  if (!show) return null;
  return null;
}

export function RequireRole({
  role,
  children,
}: {
  role: "resident" | "supplier";
  children: React.ReactNode;
}) {
  const { user, authReady } = useApp();
  if (!authReady) return <AuthPending />;
  if (!user) return <Navigate to="/auth" replace />;
  const previewRole = getPreviewRole();
  if (isAdminEmail(user.email) || user.role === "admin") {
    if (previewRole === role) return <>{children}</>;
    return <Navigate to="/admin" replace />;
  }
  if (user.role !== role) return <Navigate to={roleHome(user.role)} replace />;
  return <>{children}</>;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, authReady } = useApp();
  if (!authReady) return <AuthPending />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}
