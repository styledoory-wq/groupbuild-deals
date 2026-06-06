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
  | "outdoor";

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
    accent: "#2F6BFF", tint: "#EAF2FF", border: "#BFD7FF" },
  { id: "structure",    index: 2, title: "שלד ובנייה",        shortTitle: "בנייה",
    accent: "#E8742C", tint: "#FFF1E4", border: "#FFD4B0" },
  { id: "systems",      index: 3, title: "מערכות הבית",       shortTitle: "מערכות",
    accent: "#0FB5C9", tint: "#E7F8FB", border: "#B5E8EF" },
  { id: "openings",     index: 4, title: "פתחים ואבטחה",      shortTitle: "פתחים",
    accent: "#2EA85A", tint: "#E8F7EC", border: "#BFE9C6" },
  { id: "finishes",     index: 5, title: "עבודות גמר",         shortTitle: "גמר",
    accent: "#7A4FCF", tint: "#F2ECFB", border: "#D8C9F0" },
  { id: "kitchen-bath", index: 6, title: "מטבחים ואמבטיות",  shortTitle: "מטבח",
    accent: "#B07E2E", tint: "#F8F1E4", border: "#E9D9BD" },
  { id: "outdoor",      index: 7, title: "חצר ופיתוח",         shortTitle: "חצר",
    accent: "#6E8A2E", tint: "#F1F5E4", border: "#D2DEB5" },
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
  active:        { label: "פעיל",   dot: "#10B981", fg: "#0A1F3D", bg: "#FFFFFF" },
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

/* ---------- Shadows ---------- */
export const SHADOWS = {
  card:    "0 8px 20px -10px rgba(10,31,61,0.18), 0 2px 4px -2px rgba(10,31,61,0.05)",
  cardDim: "0 2px 6px -2px rgba(10,31,61,0.06)",
  press:   "0 14px 28px -10px rgba(10,31,61,0.28)",
  chip:    "0 1px 3px rgba(10,31,61,0.06)",
  pill:    "0 3px 8px -2px rgba(10,31,61,0.10)",
} as const;
