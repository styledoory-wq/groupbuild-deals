import { useEffect, useState } from "react";

export type PreviewRole = "resident" | "supplier" | null;
const KEY = "previewRole";
const EVT = "previewrole:change";

export function getPreviewRole(): PreviewRole {
  if (typeof window === "undefined") return null;
  const v = window.sessionStorage.getItem(KEY);
  return v === "resident" || v === "supplier" ? v : null;
}

export function setPreviewRole(role: PreviewRole) {
  if (typeof window === "undefined") return;
  if (role) window.sessionStorage.setItem(KEY, role);
  else window.sessionStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVT));
}

export function usePreviewRole(): PreviewRole {
  const [role, setRole] = useState<PreviewRole>(() => getPreviewRole());
  useEffect(() => {
    const handler = () => setRole(getPreviewRole());
    window.addEventListener(EVT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return role;
}

/** Returns true and shows a toast if the user is in preview mode (mutation blocked). */
export function guardPreview(toast?: { error: (msg: string) => void }): boolean {
  const role = getPreviewRole();
  if (role) {
    toast?.error("מצב תצוגה — פעולה זו חסומה לאדמין");
    return true;
  }
  return false;
}
