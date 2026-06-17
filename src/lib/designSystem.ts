/**
 * GroupBuild Design System — Single source of truth
 * Use these tokens across the app. Don't define stage colors elsewhere.
 */

export type StageId =
  | "planning"
  | "structure"
  | "systems"
  | "openings"
  | "finishes"
  | "kitchen-bath"
  | "outdoor"
  | "moving";

export interface StageTheme {
  id: StageId;
  index: number;
  title: string;
  shortTitle: string;
  /** strong accent — text / icon / fills */
  accent: string;
  /** light tint — section backgrounds */
  tint: string;
  /** subtle border (kept for legacy callers; prefer shadows) */
  border: string;
}

export const STAGE_THEMES: StageTheme[] = [
  { id: "planning",     index: 1, title: "תכנון ועיצוב",     shortTitle: "תכנון",
    accent: "#2563EB", tint: "#EEF4FF", border: "#DBE6FF" },
  { id: "structure",    index: 2, title: "שלד ובנייה",        shortTitle: "בנייה",
    accent: "#E8742C", tint: "#FFF5EB", border: "#FFE2C7" },
  { id: "systems",      index: 3, title: "מערכות הבית",       shortTitle: "מערכות",
    accent: "#0891B2", tint: "#ECFEFF", border: "#CFF5F9" },
  { id: "openings",     index: 4, title: "פתחים ובטחון",      shortTitle: "פתחים",
    accent: "#16A34A", tint: "#F0FDF4", border: "#CFEFD8" },
  { id: "finishes",     index: 5, title: "גמרים",              shortTitle: "גמר",
    accent: "#7C3AED", tint: "#F5F3FF", border: "#E2DBFB" },
  { id: "kitchen-bath", index: 6, title: "מטבחים ואמבטיות",  shortTitle: "מטבח",
    accent: "#0E6B5A", tint: "#EAF7F2", border: "#D6F0E8" },
  { id: "outdoor",      index: 7, title: "חצר ופיתוח",         shortTitle: "חצר",
    accent: "#6E8A2E", tint: "#F7FEE7", border: "#DFEFBE" },
  { id: "moving",       index: 8, title: "כניסה לבית",         shortTitle: "כניסה",
    accent: "#0E6B5A", tint: "#EAF7F2", border: "#D6F0E8" },
];

export const getStage = (id: StageId): StageTheme =>
  STAGE_THEMES.find((s) => s.id === id) ?? STAGE_THEMES[0];

/* ---------- Status tokens ---------- */
export type StatusKind = "active" | "coming-soon" | "finished" | "pending";

export const STATUS_PRESETS: Record<StatusKind, {
  label: string;
  dot: string;
  fg: string;
  bg: string;
}> = {
  active:        { label: "פעיל",   dot: "#10B981", fg: "#1F2937", bg: "#FFFFFF" },
  "coming-soon": { label: "בקרוב",  dot: "#F59E0B", fg: "#9CA3AF", bg: "#FFFFFFE6" },
  finished:      { label: "הסתיים", dot: "#6B7280", fg: "#6B7280", bg: "#F4F6FA" },
  pending:       { label: "ממתין",  dot: "#3B82F6", fg: "#1E40AF", bg: "#EAF2FF" },
};

/* ---------- Motion ---------- */
export const MOTION = {
  fast: "150ms",
  base: "180ms",
  slow: "220ms",
  ease: "cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

/* ---------- Shadows ----------
 * Shadows live in CSS variables (see index.css):
 *   --shadow-soft, --shadow-card, --shadow-elevated, --shadow-floating, --shadow-gold
 * Use them via `boxShadow: "var(--shadow-card)"` or Tailwind arbitrary values.
 */
