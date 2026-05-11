import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { clearStaleAppCaches } from "@/lib/safeAsync";
import { registerServiceWorker } from "@/lib/registerSW";

void clearStaleAppCaches();
registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
);
