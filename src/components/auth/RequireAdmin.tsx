import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail, setAdminSession } from "@/lib/auth";
import { toast } from "sonner";

/**
 * Server-verified admin guard.
 * - Reads the Supabase session
 * - Allows access ONLY when session.user.email matches the hardcoded admin email
 * - Otherwise shows a toast and redirects (to /admin/login if not authenticated,
 *   or to the user's role dashboard / home if authenticated but not authorized).
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [state, setState] = useState<"loading" | "allowed" | "denied" | "anon">("loading");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!active) return;
      if (!session) {
        setAdminSession(false);
        setState("anon");
        return;
      }
      if (isAdminEmail(session.user.email)) {
        setAdminSession(true);
        setState("allowed");
      } else {
        setAdminSession(false);
        toast.error("אין לך הרשאה לגשת לאזור זה");
        setState("denied");
      }
    })();
    return () => {
      active = false;
    };
  }, [location.pathname]);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        בודק הרשאות…
      </div>
    );
  }
  if (state === "anon") {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }
  if (state === "denied") {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
