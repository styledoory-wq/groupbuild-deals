/**
 * Single source of truth for project-type stage labels/emojis and their
 * canonical display ORDER (based on the real user journey).
 *
 * Stage → category mapping still lives in DB table `category_project_stages`.
 * This file drives what stages are RENDERED and in what order — even if a
 * stage has no categories yet (renders as "בקרוב").
 */

export type ProjectType = "new" | "reno" | "building" | "maintenance" | "outdoor";

export type StageMeta = { title: string; emoji: string };

export const PROJECT_TYPE_META: Record<
  ProjectType,
  { label: string; emoji: string; sectionTitle: string }
> = {
  new:         { label: "בנייה חדשה",   emoji: "🏡", sectionTitle: "שלבי הבנייה" },
  reno:        { label: "שיפוץ",         emoji: "🧰", sectionTitle: "תחומי השיפוץ" },
  building:    { label: "בניין משותף",  emoji: "🏢", sectionTitle: "תחומי הבניין" },
  maintenance: { label: "אחזקה",         emoji: "🛠️", sectionTitle: "תחומי האחזקה" },
  outdoor:     { label: "פיתוח חוץ",     emoji: "🌳", sectionTitle: "שלבי פיתוח החוץ" },
};

/**
 * Canonical ordered stage list per project type (user-journey order).
 * The array order IS the display order.
 */
export const STAGE_ORDER: Record<ProjectType, string[]> = {
  new: [
    "pre-plan",
    "planning",
    "site-prep",
    "foundation",
    "envelope",
    "systems",
    "finishes",
    "outdoor",
    "handover",
    "turnkey",
  ],
  reno: [
    "reno-design",
    "reno-demo",
    "kitchen-bath",
    "electric",
    "plumbing",
    "ac",
    "paint-gypsum",
    "flooring",
    "reno-finishes",
  ],
  building: [
    "management",
    "cleaning",
    "garden",
    "elevators",
    "shared-electric",
    "cctv",
    "entrance",
    "facade",
    "solar",
    "extras",
  ],
  maintenance: ["routine", "systems-fix", "building-work"],
  outdoor: ["design", "build", "plants", "water"],
};

/**
 * Human titles per stage_key. Keys must match rows in DB table
 * `category_project_stages` where mapping exists.
 */
export const STAGE_LABELS: Record<ProjectType, Record<string, StageMeta>> = {
  new: {
    "pre-plan":      { title: "רעיון ותכנון",      emoji: "💡" },
    planning:        { title: "תכנון ורישוי",      emoji: "📐" },
    "site-prep":     { title: "עבודות הכנה",       emoji: "⛏️" },
    foundation:      { title: "שלד ובנייה",        emoji: "🏗️" },
    envelope:        { title: "מעטפת ואיטום",     emoji: "🧱" },
    systems:         { title: "מערכות הבית",       emoji: "⚡" },
    finishes:        { title: "גמרים ועיצוב פנים", emoji: "🛋️" },
    outdoor:         { title: "פיתוח חוץ",         emoji: "🌳" },
    handover:        { title: "מסירה ואכלוס",     emoji: "🔑" },
    turnkey:         { title: "קבלן מפתח",         emoji: "🏘️" },
  },
  reno: {
    "reno-design":    { title: "תכנון ועיצוב",     emoji: "📐" },
    "reno-demo":      { title: "הריסה והכנה",       emoji: "⛏️" },
    "kitchen-bath":   { title: "מטבח ואמבטיה",     emoji: "🚿" },
    electric:         { title: "חשמל ותקשורת",      emoji: "⚡" },
    plumbing:         { title: "אינסטלציה",         emoji: "🔧" },
    ac:               { title: "מיזוג ואוורור",     emoji: "❄️" },
    "paint-gypsum":   { title: "צבע, גבס וטיח",     emoji: "🎨" },
    flooring:         { title: "ריצוף ודלתות",      emoji: "🚪" },
    "reno-finishes":  { title: "גמרים והרכבות",    emoji: "🛋️" },
    // legacy keys (kept for backwards-compat with existing DB rows)
    "doors-windows":  { title: "דלתות וחלונות",    emoji: "🚪" },
  },
  building: {
    management:        { title: "ניהול ואחזקה",     emoji: "📋" },
    cleaning:          { title: "ניקיון",           emoji: "🧽" },
    garden:            { title: "גינון משותף",      emoji: "🌿" },
    elevators:         { title: "מעליות",           emoji: "🛗" },
    "shared-electric": { title: "חשמל משותף",       emoji: "💡" },
    cctv:              { title: "מצלמות ואבטחה",   emoji: "📹" },
    entrance:          { title: "דלתות וכניסות",    emoji: "🚪" },
    facade:            { title: "שיפוץ חזית",       emoji: "🏛️" },
    solar:             { title: "סולארי ואנרגיה",   emoji: "☀️" },
    extras:            { title: "שירותים נוספים",   emoji: "✨" },
  },
  maintenance: {
    routine:         { title: "אחזקה שוטפת",  emoji: "🧹" },
    "systems-fix":   { title: "תיקוני מערכות", emoji: "🔧" },
    "building-work": { title: "עבודות בניין",   emoji: "🧱" },
  },
  outdoor: {
    design: { title: "תכנון ועיצוב", emoji: "📐" },
    build:  { title: "פיתוח ובנייה", emoji: "🧱" },
    plants: { title: "גינון והשקיה",  emoji: "🌱" },
    water:  { title: "בריכות ומים",    emoji: "💧" },
  },
};

export const stageMeta = (type: ProjectType, key: string): StageMeta =>
  STAGE_LABELS[type]?.[key] ?? { title: key, emoji: "🏷️" };
