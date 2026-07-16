import { useCallback, useState } from "react";
import { useApp } from "@/store/AppStore";
import { SignupPromptSheet } from "@/components/guest/SignupPromptSheet";

/**
 * Gate a personal action behind auth. Usage:
 *   const { requireAuth, promptElement } = useRequireAuth();
 *   <button onClick={() => requireAuth(() => addFavorite(id), { featureLabel: "לשמור למועדפים" })}>...</button>
 *   {promptElement}
 */
export function useRequireAuth() {
  const { user } = useApp();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState<string | undefined>(undefined);

  const requireAuth = useCallback(
    (action: () => void, opts?: { featureLabel?: string }) => {
      if (user) {
        action();
        return;
      }
      setLabel(opts?.featureLabel);
      setOpen(true);
    },
    [user],
  );

  const promptElement = (
    <SignupPromptSheet open={open} onOpenChange={setOpen} featureLabel={label} />
  );

  return { requireAuth, promptElement, isGuest: !user };
}
