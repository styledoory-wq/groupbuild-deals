import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/store/AppStore";
import SuppliersHome from "@/pages/marketing/SuppliersHome";

/**
 * Public supplier landing at "/suppliers" (web / Lovable).
 * Same opening experience as the suppliers-app home ("/").
 * Logged-in suppliers go straight to their dashboard.
 */
export default function SuppliersLanding() {
  const navigate = useNavigate();
  const { user, authReady } = useApp();

  useEffect(() => {
    if (!authReady || !user) return;
    if (user.role === "supplier") navigate("/supplier", { replace: true });
  }, [authReady, user, navigate]);

  return <SuppliersHome />;
}
