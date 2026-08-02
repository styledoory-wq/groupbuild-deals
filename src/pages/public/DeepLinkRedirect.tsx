import { Navigate, useLocation } from "react-router-dom";

/**
 * Universal Link entry points.
 *
 * - `/r/*` → residents app namespace (resident deep links)
 * - `/b/*` → suppliers app namespace (business/supplier deep links)
 *
 * These short paths are what the apple-app-site-association file claims for
 * each Bundle ID, so the OS knows which app to open. In the browser (and in
 * the webview once the app is open) they simply forward to the real route.
 */
export default function DeepLinkRedirect({ base }: { base: "resident" | "supplier" }) {
  const { pathname, search, hash } = useLocation();
  const prefix = base === "resident" ? "/r" : "/b";
  const rest = pathname.slice(prefix.length).replace(/^\/+/, "");
  const target = rest ? `/${base}/${rest}` : `/${base}`;
  return <Navigate to={`${target}${search}${hash}`} replace />;
}
