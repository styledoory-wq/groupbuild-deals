export const DEMAND_STATUSES = [
  { value: "new", label: "חדש", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { value: "in_review", label: "בטיפול", color: "bg-amber-100 text-amber-800 border-amber-300" },
  { value: "group_forming", label: "מגבשים קבוצה", color: "bg-purple-100 text-purple-800 border-purple-300" },
  { value: "suppliers_invited", label: "ספקים הוזמנו", color: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  { value: "offer_published", label: "הצעה פורסמה", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { value: "closed", label: "נסגר", color: "bg-gray-200 text-gray-700 border-gray-300" },
  { value: "rejected", label: "נדחה", color: "bg-red-100 text-red-800 border-red-300" },
] as const;

export type DemandStatus = typeof DEMAND_STATUSES[number]["value"];

export const PROJECT_TYPES = [
  { value: "private_home", label: "בית פרטי" },
  { value: "renovation", label: "שיפוץ" },
  { value: "house_committee", label: "ועד בית" },
  { value: "building", label: "בניין" },
  { value: "neighborhood", label: "שכונה" },
] as const;

export function statusMeta(v: string) {
  return DEMAND_STATUSES.find((s) => s.value === v) ?? DEMAND_STATUSES[0];
}
export function projectTypeLabel(v: string | null | undefined) {
  return PROJECT_TYPES.find((p) => p.value === v)?.label ?? "—";
}

export const PIPELINE_ORDER: DemandStatus[] = [
  "new", "in_review", "group_forming", "suppliers_invited", "offer_published", "closed",
];
