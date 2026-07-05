/**
 * Lightweight stage metadata (just what the stepper needs) — kept separate
 * from ProjectManagement.tsx so the resident dashboard can render the shared
 * stepper without pulling the whole management page into its bundle.
 * Keep in sync with the stage lists in ProjectManagement.tsx.
 */

export type ProjectTypeKey =
  | "new_build"
  | "renovation"
  | "extension"
  | "mamad"
  | "committee"
  | "point_service";

export type StageLite = { key: string; num: number; short: string };

const NEW_BUILD: StageLite[] = [
  { key: "planning", num: 1, short: "תכנון" },
  { key: "structure", num: 2, short: "שלד" },
  { key: "envelope", num: 3, short: "מעטפת" },
  { key: "systems", num: 4, short: "מערכות" },
  { key: "finishes", num: 5, short: "גמרים" },
  { key: "outdoor", num: 6, short: "פיתוח" },
  { key: "qa", num: 7, short: "בדק" },
  { key: "done", num: 8, short: "סיום" },
];

const RENOVATION: StageLite[] = [
  { key: "reno-plan", num: 1, short: "תכנון" },
  { key: "reno-demo", num: 2, short: "פירוקים" },
  { key: "reno-systems", num: 3, short: "מערכות" },
  { key: "reno-kitchen-bath", num: 4, short: "מטבח" },
  { key: "reno-floor-paint", num: 5, short: "גמרים" },
  { key: "reno-handoff", num: 6, short: "מסירה" },
];

const EXTENSION: StageLite[] = [
  { key: "ext-plan", num: 1, short: "תכנון" },
  { key: "ext-structure", num: 2, short: "שלד" },
  { key: "ext-envelope", num: 3, short: "מעטפת" },
  { key: "ext-systems", num: 4, short: "גמרים" },
  { key: "ext-handoff", num: 5, short: "מסירה" },
];

const MAMAD: StageLite[] = [
  { key: "mamad-plan", num: 1, short: "תכנון" },
  { key: "mamad-structure", num: 2, short: "יציקה" },
  { key: "mamad-door", num: 3, short: "דלת" },
  { key: "mamad-finish", num: 4, short: "אישור" },
];

const COMMITTEE: StageLite[] = [
  { key: "com-needs", num: 1, short: "אפיון" },
  { key: "com-quotes", num: 2, short: "הצעות" },
  { key: "com-select", num: 3, short: "חוזה" },
  { key: "com-exec", num: 4, short: "ביצוע" },
  { key: "com-handoff", num: 5, short: "סיכום" },
];

const POINT_SERVICE: StageLite[] = [
  { key: "ps-request", num: 1, short: "הגדרה" },
  { key: "ps-quotes", num: 2, short: "הצעות" },
  { key: "ps-exec", num: 3, short: "ביצוע" },
  { key: "ps-review", num: 4, short: "סיכום" },
];

const BY_TYPE: Record<ProjectTypeKey, StageLite[]> = {
  new_build: NEW_BUILD,
  renovation: RENOVATION,
  extension: EXTENSION,
  mamad: MAMAD,
  committee: COMMITTEE,
  point_service: POINT_SERVICE,
};

export const getStagesLite = (t: string | undefined): StageLite[] =>
  BY_TYPE[(t as ProjectTypeKey) ?? "new_build"] ?? NEW_BUILD;
