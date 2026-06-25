import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/store/AppStore";
import { isAdminEmail } from "@/lib/auth";

/**
 * Entry route. The global SplashScreen overlays until authReady.
 * Once ready, route the user: dashboard if logged in, otherwise /auth.
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
    if (isAdminEmail(user.email)) {
      navigate("/admin", { replace: true });
      return;
    }
    if (needsOnboarding) {
      navigate("/onboarding", { replace: true });
      return;
    }
    navigate(user.role === "supplier" ? "/supplier" : "/resident", { replace: true });
  }, [authReady, user, needsOnboarding, navigate]);

  // Splash overlay handles the visual; render nothing underneath.
  return <div style={{ minHeight: "100dvh", background: "#071C3B" }} aria-hidden />;
}
