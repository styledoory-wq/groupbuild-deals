import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/store/AppStore";
import { isAdminEmail } from "@/lib/auth";
import { APP_MODE } from "@/config/appMode";

/**
 * Entry route. The global SplashScreen overlays until authReady.
 * Once ready, route the user: dashboard if logged in, otherwise /auth.
 * Redirect target is constrained by the active build (APP_MODE).
 */
export default function Welcome() {
  const navigate = useNavigate();
  const { user, authReady, needsOnboarding } = useApp();

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    // Admin only exists in the web build.
    if (isAdminEmail(user.email) && APP_MODE === "web") {
      navigate("/admin", { replace: true });
      return;
    }
    if (needsOnboarding) {
      navigate("/onboarding", { replace: true });
      return;
    }
    // Force the correct home per build so a supplier build never lands on /resident etc.
    if (APP_MODE === "residents") {
      navigate("/resident", { replace: true });
      return;
    }
    if (APP_MODE === "suppliers") {
      navigate("/supplier", { replace: true });
      return;
    }
    navigate(user.role === "supplier" ? "/supplier" : "/resident", { replace: true });
  }, [authReady, user, needsOnboarding, navigate]);

  return <div style={{ minHeight: "100dvh", background: "#071C3B" }} aria-hidden />;
}
