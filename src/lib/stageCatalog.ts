/**
 * Single source of truth for project-type stage labels/emojis.
 * Stage ORDER and CATEGORY ASSIGNMENTS come from the DB table
 * `category_project_stages` (rows are sorted by `display_order`).
 * This file only maps stage_key → display title/emoji for each project type.
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
 * Human titles per stage_key. Fallback = capitalize the key.
 * Keys must match rows in DB table `category_project_stages`.
 */
export const STAGE_LABELS: Record<ProjectType, Record<string, StageMeta>> = {
  new: {
    // 9-stage execution order for בנייה חדשה
    planning:        { title: "תכנון ורישוי",              emoji: "📐" },
    "site-prep":     { title: "הכנת מגרש",                 emoji: "⛏️" },
    foundation:      { title: "יסודות ושלד",                emoji: "🏗️" },
    envelope:        { title: "מעטפת ואיטום",              emoji: "🧱" },
    systems:         { title: "מערכות",                     emoji: "⚡" },
    "interior-prep": { title: "טיח, בידוד וגבס",           emoji: "🎨" },
    finishes:        { title: "גמרים",                      emoji: "🛋️" },
    outdoor:         { title: "פיתוח חוץ",                  emoji: "🌳" },
    handover:        { title: "מסירה ואכלוס",              emoji: "🔑" },
  },
  reno: {
    "kitchen-bath":  { title: "מטבח ואמבטיה", emoji: "🚿" },
    "paint-gypsum":  { title: "צבע וגבס",      emoji: "🎨" },
    electric:        { title: "חשמל",          emoji: "⚡" },
    plumbing:        { title: "אינסטלציה",     emoji: "🔧" },
    ac:              { title: "מיזוג",         emoji: "❄️" },
    flooring:        { title: "ריצוף",         emoji: "🟫" },
    "doors-windows": { title: "דלתות וחלונות", emoji: "🚪" },
  },
  building: {
    elevators:         { title: "מעליות",           emoji: "🛗" },
    cleaning:          { title: "ניקיון",           emoji: "🧽" },
    garden:            { title: "גינון",            emoji: "🌿" },
    cctv:              { title: "מצלמות",           emoji: "📹" },
    entrance:          { title: "דלתות כניסה",     emoji: "🚪" },
    "shared-electric": { title: "חשמל משותף",       emoji: "💡" },
    facade:            { title: "שיפוץ חזית",       emoji: "🏛️" },
    solar:             { title: "סולארי",           emoji: "☀️" },
  },
  maintenance: {
    routine:       { title: "אחזקה שוטפת", emoji: "🧹" },
    "systems-fix": { title: "תיקוני מערכות", emoji: "🔧" },
    "building-work": { title: "עבודות בניין", emoji: "🧱" },
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
