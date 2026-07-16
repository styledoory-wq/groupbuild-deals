import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useApp } from "@/store/AppStore";
import { SignupPromptSheet } from "@/components/guest/SignupPromptSheet";

type PendingAction = () => void | Promise<void>;

interface GuestGateContextValue {
  /**
   * Wrap a callback that requires authentication.
   * If the user is signed in, runs immediately.
   * Otherwise opens the unified SignupPromptSheet with a returnUrl to the current page.
   * The user completes auth on /auth/resident and returns to this page — they can retry the action then.
   */
  requireAuth: (reason: string, action: PendingAction) => void;
}

const Ctx = createContext<GuestGateContextValue | null>(null);

export function useGuestGate(): GuestGateContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useGuestGate must be used inside <GuestGateProvider>");
  return v;
}

/**
 * Global provider. Exactly ONE prompt sheet in the app.
 * Renders the shared `SignupPromptSheet` — no bespoke modals anywhere else.
 */
export function GuestGateProvider({ children }: { children: ReactNode }) {
  const { user } = useApp();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");

  const requireAuth = useCallback<GuestGateContextValue["requireAuth"]>(
    (r, action) => {
      if (user) {
        void action();
        return;
      }
      setReason(r);
      setOpen(true);
    },
    [user],
  );

  const value = useMemo(() => ({ requireAuth }), [requireAuth]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <SignupPromptSheet
        open={open}
        onOpenChange={setOpen}
        featureLabel={reason || undefined}
      />
    </Ctx.Provider>
  );
}
