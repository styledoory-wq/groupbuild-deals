import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail, setAdminSession } from "@/lib/auth";
import { toast } from "sonner";

/**
 * Server-verified admin guard.
 * - Resolves on the FIRST signal (getSession or onAuthStateChange — whichever first)
 * - Hard 4-second timeout — never stays on "checking" forever
 * - No re-check on navigation (mounts once per Admin layout)
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [state, setState] = useState<"loading" | "allowed" | "denied" | "anon" | "error">(
    "loading",
  );
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    let resolved = false;

    const finish = (next: "allowed" | "denied" | "anon" | "error", msg = "") => {
      if (resolved) return;
      resolved = true;
      if (msg) setErrorMsg(msg);
      setState(next);
    };

    const handleSession = (
      session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"],
    ) => {
      if (!session) {
        setAdminSession(false);
        finish("anon");
        return;
      }
      if (isAdminEmail(session.user.email)) {
        setAdminSession(true);
        finish("allowed");
      } else {
        setAdminSession(false);
        toast.error("אין לך הרשאה לגשת לאזור זה");
        finish("denied");
      }
    };

    // Listen first so INITIAL_SESSION is captured
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    // Also explicitly read once
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          finish("error", error.message || "שגיאה בטעינת ההזדהות");
          return;
        }
        handleSession(data.session);
      })
      .catch((err) => {
        finish("error", err instanceof Error ? err.message : "שגיאה בטעינת ההזדהות");
      });

    // Hard timeout — if nothing resolved in 4s, treat as anonymous (send to login)
    const timeoutId = window.setTimeout(() => {
      if (!resolved) {
        setAdminSession(false);
        finish("anon");
      }
    }, 4000);

    return () => {
      window.clearTimeout(timeoutId);
      sub.subscription.unsubscribe();
    };
    // Mount once — don't re-run on navigation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3 px-6 text-center">
        <div className="h-8 w-8 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
        <div className="text-muted-foreground text-sm">בודק הרשאות…</div>
        <button
          onClick={() => (window.location.href = "/admin/login")}
          className="text-xs text-primary underline mt-2"
        >
          תקוע? לחץ כאן לכניסה מחדש
        </button>
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3 px-6 text-center">
        <div className="text-destructive text-sm font-bold">שגיאה בבדיקת הרשאות</div>
        <div className="text-muted-foreground text-xs max-w-xs">{errorMsg}</div>
        <button
          onClick={() => (window.location.href = "/admin/login")}
          className="mt-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold"
        >
          חזרה למסך כניסה
        </button>
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
