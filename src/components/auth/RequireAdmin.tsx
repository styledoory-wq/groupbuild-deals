import { Navigate, useLocation } from "react-router-dom";
import { useApp } from "@/store/AppStore";
import { hasAdminSession } from "@/lib/auth";

/**
 * Guards admin routes. Allows access only when:
 * - current user has role "admin", OR
 * - admin session flag is set (after admin login screen).
 *
 * When swapping to Supabase Auth, replace these checks with
 * a query against `user_roles` (has_role(auth.uid(), 'admin')).
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useApp();
  const location = useLocation();
  const isAdmin = user?.role === "admin" || hasAdminSession();
  if (!isAdmin) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
