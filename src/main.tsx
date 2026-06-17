import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// @ts-expect-error - fontsource has no types
import "@fontsource-variable/urbanist";
// @ts-expect-error - fontsource has no types
import "@fontsource-variable/epilogue";


import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { initNative } from "@/lib/nativeInit";

// Fire-and-forget — no-op on web, sets up keyboard handling on iOS/Android.
initNative();

createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
);
