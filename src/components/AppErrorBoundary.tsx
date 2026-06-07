import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type State = { error: Error | null };

const CHUNK_RECOVERY_KEY = "gb-chunk-recovery-attempted";
const CHUNK_RECOVERY_TTL_MS = 10_000;

function isRecoverableLoadError(error: Error) {
  const message = error.message || "";
  return (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("Loading chunk") ||
    message.includes("ChunkLoadError")
  );
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  componentDidMount() {
    sessionStorage.removeItem(CHUNK_RECOVERY_KEY);
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AppErrorBoundary]", error, info.componentStack);

    if (isRecoverableLoadError(error)) {
      const lastAttempt = Number(sessionStorage.getItem(CHUNK_RECOVERY_KEY) || "0");
      const canRetry = !lastAttempt || Date.now() - lastAttempt > CHUNK_RECOVERY_TTL_MS;

      if (canRetry) {
        sessionStorage.setItem(CHUNK_RECOVERY_KEY, String(Date.now()));
        // Strip stale build hash params so the browser fetches the latest index.html / chunks.
        const url = new URL(window.location.href);
        url.searchParams.delete("__lovable_sha");
        url.searchParams.delete("__lovable_load_id");
        url.searchParams.set("_r", Date.now().toString());
        // Best-effort: clear caches before reload to avoid serving stale chunks again.
        const doReload = () => window.location.replace(url.toString());
        if (typeof caches !== "undefined") {
          caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n)))).finally(doReload);
        } else {
          doReload();
        }
      }
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-5" dir="rtl">
        <div className="w-full max-w-sm gb-card p-6 text-center">
          <div className="h-12 w-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-3">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-lg font-bold mb-2">משהו השתבש בטעינת המערכת</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            במקום מסך לבן, שמרנו את השגיאה. נסו לרענן; אם זה חוזר, צלמו את המסך ופנו לתמיכה.
          </p>
          <p className="text-fs-xs text-muted-foreground bg-muted rounded-xl p-2 mb-4 break-words" dir="ltr">
            {this.state.error.message}
          </p>
          <Button onClick={() => window.location.reload()} className="w-full rounded-xl">
            רענון המסך
          </Button>
        </div>
      </div>
    );
  }
}
