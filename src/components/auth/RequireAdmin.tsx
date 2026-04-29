import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail, setAdminSession } from "@/lib/auth";
import { toast } from "sonner";

/**
 * Server-verified admin guard.
 * - Sets up onAuthStateChange listener BEFORE getSession (Supabase best practice)
 * - Has a 6-second hard timeout — never stays on "checking" forever
 * - Allows access ONLY when session.user.email matches the hardcoded admin email
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [state, setState] = useState<"loading" | "allowed" | "denied" | "anon" | "error">(
    "loading",
  );
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    let active = true;
    let resolved = false;

    const resolve = (next: "allowed" | "denied" | "anon" | "error", msg = "") => {
      if (!active || resolved) return;
      resolved = true;
      if (msg) setErrorMsg(msg);
      setState(next);
    };

    const handleSession = (session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) => {
      if (!session) {
        setAdminSession(false);
        resolve("anon");
        return;
      }
      if (isAdminEmail(session.user.email)) {
        setAdminSession(true);
        resolve("allowed");
      } else {
        setAdminSession(false);
        toast.error("אין לך הרשאה לגשת לאזור זה");
        resolve("denied");
      }
    };

    // 1. Listen first
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    // 2. Then read current session
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          resolve("error", error.message || "שגיאה בטעינת ההזדהות");
          return;
        }
        handleSession(data.session);
      })
      .catch((err) => {
        resolve("error", err instanceof Error ? err.message : "שגיאה בטעינת ההזדהות");
      });

    // 3. Hard timeout — never get stuck
    const timeoutId = window.setTimeout(() => {
      if (!resolved) {
        resolve("error", "הבדיקה נמשכה זמן רב מדי. נסה להתחבר מחדש.");
      }
    }, 6000);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      sub.subscription.unsubscribe();
    };
  }, [location.pathname]);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3 px-6 text-center">
        <div className="text-muted-foreground text-sm">בודק הרשאות…</div>
        <button
          onClick={() => (window.location.href = "/admin/login")}
          className="text-xs text-primary underline"
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
