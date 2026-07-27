import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/store/AppStore";
import ResidentsHome from "@/pages/marketing/ResidentsHome";

/**
 * Public resident landing at "/residents" (web build / Lovable).
 * Same approved opening experience as the residents-app home ("/").
 * Logged-in residents go straight to their dashboard.
 */
export default function ResidentsLanding() {
  const navigate = useNavigate();
  const { user, authReady } = useApp();

  useEffect(() => {
    if (!authReady || !user) return;
    if (user.role === "resident") navigate("/resident", { replace: true });
  }, [authReady, user, navigate]);

  return <ResidentsHome />;
}
