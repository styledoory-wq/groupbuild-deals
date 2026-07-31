import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@fontsource/urbanist/400.css";
import "@fontsource/urbanist/600.css";
import "@fontsource/urbanist/700.css";
import "@fontsource/urbanist/800.css";
import "@fontsource/epilogue/400.css";
import "@fontsource/epilogue/500.css";
import "@fontsource/epilogue/600.css";
import "@fontsource/epilogue/700.css";

import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { initNative } from "@/lib/nativeInit";
import { registerServiceWorker } from "@/lib/registerSW";
import { prefetchEntryHero } from "@/lib/prefetchEntryHero";

// Fire-and-forget — no-op on web, sets up keyboard handling on iOS/Android.
initNative();
// Registers /sw.js in production only (skipped in Lovable preview/dev).
registerServiceWorker();
// Start hero photo download before React paints the landing (avoids black→photo flash).
void prefetchEntryHero();

createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
);
