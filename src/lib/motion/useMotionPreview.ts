import { useLocation, useSearchParams } from "react-router-dom";

const PREVIEW_PATHS = new Set(["/", "/residents", "/suppliers"]);

/** True when `?motion=preview` on a public landing page. */
export function useMotionPreview(): boolean {
  const location = useLocation();
  const [params] = useSearchParams();
  return params.get("motion") === "preview" && PREVIEW_PATHS.has(location.pathname);
}
