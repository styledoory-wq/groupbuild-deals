import { useSyncExternalStore } from "react";

/**
 * Simple client-side feature flags, persisted in localStorage.
 * Admins can toggle from Admin Settings; flags apply per-browser.
 * Defaults are conservative — new experimental features are OFF.
 */
export type FeatureFlagKey = "aiCostEstimate";

const STORAGE_KEY = "gb:features";
const EVT = "gb:features:change";

const DEFAULTS: Record<FeatureFlagKey, boolean> = {
  aiCostEstimate: false,
};

function readAll(): Record<FeatureFlagKey, boolean> {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<Record<FeatureFlagKey, boolean>>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function getFlag(key: FeatureFlagKey): boolean {
  return readAll()[key];
}

export function setFlag(key: FeatureFlagKey, value: boolean) {
  if (typeof window === "undefined") return;
  const next = { ...readAll(), [key]: value };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
  window.dispatchEvent(new Event(EVT));
}

export function useFeatureFlag(key: FeatureFlagKey): boolean {
  return useSyncExternalStore(
    (cb) => {
      const handler = () => cb();
      window.addEventListener(EVT, handler);
      window.addEventListener("storage", handler);
      return () => {
        window.removeEventListener(EVT, handler);
        window.removeEventListener("storage", handler);
      };
    },
    () => getFlag(key),
    () => DEFAULTS[key],
  );
}

export const FEATURE_FLAG_META: { key: FeatureFlagKey; label: string; description: string }[] = [
  {
    key: "aiCostEstimate",
    label: "אומדן עלות AI",
    description: "מציג את כרטיס אומדן העלות של ה-AI בעמוד ניהול הפרויקט (שלב תכנון).",
  },
];
