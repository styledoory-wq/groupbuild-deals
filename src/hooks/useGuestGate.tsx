import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { useApp } from "@/store/AppStore";
import { SignupPromptSheet } from "@/components/guest/SignupPromptSheet";
import {
  clearPendingAction,
  consumePendingAction,
  setPendingAction,
  setPendingReturnUrl,
} from "@/lib/returnUrl";

type PendingActionFn = () => void | Promise<void>;

interface RequireAuthOptions {
  /**
   * Stable key that lets the action resume automatically after sign-in
   * (e.g. "join-deal"). Without it, the user simply returns to the page.
   */
  resumeKey?: string;
  payload?: Record<string, unknown>;
}

interface GuestGateContextValue {
  /**
   * Wrap a callback that requires authentication.
   * Signed in → runs immediately.
   * Guest → persists returnUrl + a pending-action descriptor, then opens the
   * unified SignupPromptSheet. After auth the user lands back on this exact
   * screen and the action re-runs automatically (when `resumeKey` was given).
   */
  requireAuth: (reason: string, action: PendingActionFn, options?: RequireAuthOptions) => void;
}

const Ctx = createContext<GuestGateContextValue | null>(null);

export function useGuestGate(): GuestGateContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useGuestGate must be used inside <GuestGateProvider>");
  return v;
}

/**
 * Re-runs an action that a guest attempted before signing in.
 * Mount this on the page that owns the action, with the same `resumeKey`.
 */
export function useResumeAction(
  resumeKey: string,
  handler: (payload?: Record<string, unknown>) => void | Promise<void>,
) {
  const { user } = useApp();
  const location = useLocation();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const done = useRef(false);

  useEffect(() => {
    if (!user || done.current) return;
    const path = `${location.pathname}${location.search}`;
    const pending = consumePendingAction(resumeKey, path);
    if (!pending) return;
    done.current = true;
    void handlerRef.current(pending.payload);
  }, [user, resumeKey, location.pathname, location.search]);
}

/**
 * Global provider. Exactly ONE prompt sheet in the app.
 */
export function GuestGateProvider({ children }: { children: ReactNode }) {
  const { user } = useApp();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");

  const requireAuth = useCallback<GuestGateContextValue["requireAuth"]>(
    (r, action, options) => {
      if (user) {
        void action();
        return;
      }
      const path = `${location.pathname}${location.search}`;
      setPendingReturnUrl(path);
      setPendingAction(
        options?.resumeKey
          ? { key: options.resumeKey, path, payload: options.payload }
          : null,
      );
      setReason(r);
      setOpen(true);
    },
    [user, location.pathname, location.search],
  );

  // The user dismissed the prompt without signing in → drop the stored intent
  // so it can never fire unexpectedly on a later visit.
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next && !user) clearPendingAction();
      setOpen(next);
    },
    [user],
  );

  const value = useMemo(() => ({ requireAuth }), [requireAuth]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <SignupPromptSheet
        open={open}
        onOpenChange={handleOpenChange}
        featureLabel={reason || undefined}
      />
    </Ctx.Provider>
  );
}
