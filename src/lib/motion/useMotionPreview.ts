import { useLocation, useSearchParams } from "react-router-dom";

const LANDING_PATHS = new Set(["/", "/residents", "/suppliers"]);

/**
 * Landing-page motion is ON by default.
 * Kill switch: `?motion=off`
 * Legacy preview flag still forces ON: `?motion=preview`
 */
export function useLandingMotion(): boolean {
  const location = useLocation();
  const [params] = useSearchParams();
  if (!LANDING_PATHS.has(location.pathname)) return false;
  const flag = params.get("motion");
  if (flag === "off") return false;
  return true;
}

/** @deprecated Use useLandingMotion — kept so older imports keep working. */
export function useMotionPreview(): boolean {
  return useLandingMotion();
}
