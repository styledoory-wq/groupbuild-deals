// Budget pricing tables — Israel 2026 baseline.
// Edit values here to update calculations. All numbers in ILS.

export type Track = "new_build" | "full_renovation" | "single_room" | "single_service";

export type Region = "north" | "haifa" | "sharon" | "center" | "jerusalem" | "south";

export const REGION_LABELS: Record<Region, string> = {
  north: "צפון",
  haifa: "חיפה והקריות",
  sharon: "שרון",
  center: "מרכז (גוש דן)",
  jerusalem: "ירושלים",
  south: "דרום",
};

export type FinishLevel = "basic" | "standard" | "premium" | "luxury";

export const FINISH_LABELS: Record<FinishLevel, string> = {
  basic: "בסיסי",
  standard: "סטנדרט",
  premium: "פרימיום",
  luxury: "יוקרה",
};

// === מסלול 1: בנייה חדשה ===
// מחיר בסיס למ"ר בנוי לפי רמת גמר
export const NEW_BUILD_PRICE_PER_SQM: Record<FinishLevel, number> = {
  basic: 5500,
  standard: 7500,
  premium: 9500,
  luxury: 13000,
};

// מקדם אזורי
export const REGION_FACTOR: Record<Region, number> = {
  north: 0.92,
  haifa: 0.96,
  sharon: 1.08,
  center: 1.15,
  jerusalem: 1.05,
  south: 0.9,
};

// חלוקת תקציב לקטגוריות (סכום = 100)
export const NEW_BUILD_CATEGORY_BREAKDOWN: { name: string; pct: number; slug: string }[] = [
  { name: "שלד", pct: 28, slug: "skeleton" },
  { name: "חשמל", pct: 6, slug: "electricity" },
  { name: "אינסטלציה", pct: 7, slug: "plumbing" },
  { name: "אלומיניום", pct: 8, slug: "aluminum" },
  { name: "ריצוף", pct: 9, slug: "flooring" },
  { name: "מטבח", pct: 6, slug: "kitchen" },
  { name: "דלתות", pct: 3, slug: "doors" },
  { name: "מיזוג", pct: 4, slug: "ac" },
  { name: "צבע", pct: 3, slug: "paint" },
  { name: "פיתוח חוץ", pct: 12, slug: "exterior" },
  { name: "תכנון ופיקוח", pct: 8, slug: "design" },
  { name: 'בלת"מ', pct: 6, slug: "contingency" },
];

// === מסלול 2: שיפוץ מלא ===
export type RenovationType = "cosmetic" | "medium" | "full" | "shell";
export const RENO_LABELS: Record<RenovationType, string> = {
  cosmetic: "קוסמטי (צבע, החלפות קטנות)",
  medium: "בינוני (מטבח/אמבט + שדרוגים)",
  full: "מקיף (כולל מטבח, אמבטיות)",
  shell: "עד השלד (תשתיות + הכל)",
};

export const FULL_RENO_BASE_PER_SQM: Record<RenovationType, number> = {
  cosmetic: 800,
  medium: 1800,
  full: 3200,
  shell: 5000,
};

export const FULL_RENO_ADDONS: { key: string; label: string; pct: number }[] = [
  { key: "infra", label: "החלפת תשתיות (חשמל/מים)", pct: 18 },
  { key: "flooring", label: "החלפת ריצוף", pct: 14 },
  { key: "kitchen", label: "מטבח חדש", pct: 16 },
  { key: "doors", label: "החלפת דלתות", pct: 6 },
  { key: "windows", label: "החלפת חלונות/אלומיניום", pct: 10 },
];

// === מסלול 3: שיפוץ חדר בודד ===
export type RoomKind =
  | "kitchen" | "bathroom" | "toilet" | "living" | "bedroom" | "balcony" | "safe_room" | "storage";

export const ROOM_LABELS: Record<RoomKind, string> = {
  kitchen: "מטבח",
  bathroom: "חדר אמבטיה",
  toilet: "שירותים",
  living: "סלון",
  bedroom: "חדר שינה",
  balcony: "מרפסת",
  safe_room: 'ממ"ד',
  storage: "מחסן",
};

// טווחי עלות פר חדר לפי רמת גמר (avg ILS)
export const ROOM_AVG: Record<RoomKind, Record<FinishLevel, number>> = {
  kitchen:   { basic: 35000, standard: 60000, premium: 95000, luxury: 160000 },
  bathroom:  { basic: 18000, standard: 32000, premium: 50000, luxury: 85000 },
  toilet:    { basic: 8000,  standard: 14000, premium: 22000, luxury: 35000 },
  living:    { basic: 15000, standard: 28000, premium: 45000, luxury: 75000 },
  bedroom:   { basic: 9000,  standard: 16000, premium: 26000, luxury: 42000 },
  balcony:   { basic: 7000,  standard: 14000, premium: 24000, luxury: 40000 },
  safe_room: { basic: 6000,  standard: 11000, premium: 18000, luxury: 28000 },
  storage:   { basic: 4000,  standard: 7000,  premium: 11000, luxury: 18000 },
};

// === מסלול 4: שירות בודד ===
export type ServiceKind =
  | "interior_doors" | "entrance_door" | "kitchen_svc" | "parquet" | "flooring_svc"
  | "paint" | "drywall" | "aluminum_svc" | "ac_svc" | "solar" | "fences"
  | "gates" | "pergola" | "cameras" | "furniture" | "electricity_svc" | "plumbing_svc";

export type ServiceUnit = "unit" | "sqm" | "lump";

export interface ServiceDef {
  key: ServiceKind;
  label: string;
  unit: ServiceUnit;
  unitLabel: string;
  avgPerUnit: Record<FinishLevel, number>;
  slug: string; // for matching deals
}

export const SERVICES: ServiceDef[] = [
  { key: "interior_doors", label: "דלתות פנים", unit: "unit", unitLabel: "דלת", slug: "doors",
    avgPerUnit: { basic: 1200, standard: 1900, premium: 2800, luxury: 4500 } },
  { key: "entrance_door", label: "דלת כניסה", unit: "unit", unitLabel: "דלת", slug: "doors",
    avgPerUnit: { basic: 4500, standard: 7500, premium: 12000, luxury: 22000 } },
  { key: "kitchen_svc", label: "מטבח", unit: "lump", unitLabel: 'מ"א ארונות', slug: "kitchen",
    avgPerUnit: { basic: 4500, standard: 7500, premium: 12000, luxury: 22000 } },
  { key: "parquet", label: "פרקט", unit: "sqm", unitLabel: 'מ"ר', slug: "flooring",
    avgPerUnit: { basic: 180, standard: 280, premium: 420, luxury: 700 } },
  { key: "flooring_svc", label: "ריצוף", unit: "sqm", unitLabel: 'מ"ר', slug: "flooring",
    avgPerUnit: { basic: 220, standard: 320, premium: 480, luxury: 800 } },
  { key: "paint", label: "צבע", unit: "sqm", unitLabel: 'מ"ר רצפה', slug: "paint",
    avgPerUnit: { basic: 45, standard: 70, premium: 110, luxury: 170 } },
  { key: "drywall", label: "גבס", unit: "sqm", unitLabel: 'מ"ר', slug: "drywall",
    avgPerUnit: { basic: 120, standard: 180, premium: 260, luxury: 360 } },
  { key: "aluminum_svc", label: "אלומיניום", unit: "sqm", unitLabel: 'מ"ר פתח', slug: "aluminum",
    avgPerUnit: { basic: 1400, standard: 2200, premium: 3200, luxury: 4800 } },
  { key: "ac_svc", label: "מיזוג", unit: "unit", unitLabel: "יחידה", slug: "ac",
    avgPerUnit: { basic: 3500, standard: 5500, premium: 8500, luxury: 14000 } },
  // Solar: priced per kWp installed (Israel 2026 typical: 3000-6500 ₪/kWp)
  { key: "solar", label: "מערכת סולארית", unit: "unit", unitLabel: "kWp", slug: "solar",
    avgPerUnit: { basic: 3000, standard: 3800, premium: 4800, luxury: 6500 } },
  { key: "fences", label: "גדרות", unit: "sqm", unitLabel: 'מ"ר', slug: "fences",
    avgPerUnit: { basic: 250, standard: 400, premium: 650, luxury: 1100 } },
  { key: "gates", label: "שערים", unit: "unit", unitLabel: "שער", slug: "gates",
    avgPerUnit: { basic: 4500, standard: 8500, premium: 14000, luxury: 25000 } },
  { key: "pergola", label: "פרגולות", unit: "sqm", unitLabel: 'מ"ר', slug: "pergola",
    avgPerUnit: { basic: 600, standard: 1100, premium: 1800, luxury: 3000 } },
  { key: "cameras", label: "מצלמות אבטחה", unit: "unit", unitLabel: "מצלמה", slug: "security",
    avgPerUnit: { basic: 800, standard: 1500, premium: 2500, luxury: 4500 } },
  { key: "furniture", label: "ריהוט", unit: "lump", unitLabel: "סט", slug: "furniture",
    avgPerUnit: { basic: 25000, standard: 50000, premium: 90000, luxury: 180000 } },
  { key: "electricity_svc", label: "חשמל", unit: "sqm", unitLabel: 'מ"ר דירה', slug: "electricity",
    avgPerUnit: { basic: 180, standard: 280, premium: 420, luxury: 650 } },
  { key: "plumbing_svc", label: "אינסטלציה", unit: "sqm", unitLabel: 'מ"ר דירה', slug: "plumbing",
    avgPerUnit: { basic: 150, standard: 230, premium: 350, luxury: 550 } },
];

export const SERVICE_DEFAULT_QTY: Record<ServiceKind, number> = {
  interior_doors: 6, entrance_door: 1, kitchen_svc: 6, parquet: 60, flooring_svc: 80,
  paint: 100, drywall: 30, aluminum_svc: 12, ac_svc: 3, solar: 8, fences: 30,
  gates: 1, pergola: 20, cameras: 4, furniture: 1, electricity_svc: 90, plumbing_svc: 90,
};

// Service-specific follow-up questions (multiply / add to the base estimate)
export type ServiceSpecOption = { value: string; label: string; mult?: number; addILS?: number };
export type ServiceSpec = { id: string; title: string; options: ServiceSpecOption[] };

export const SERVICE_SPECS: Partial<Record<ServiceKind, ServiceSpec[]>> = {
  solar: [
    { id: "connection", title: "סוג חיבור המערכת", options: [
      { value: "ongrid", label: "מחוברת לרשת (on-grid)", mult: 1 },
      { value: "hybrid", label: "היברידית (גיבוי חלקי)", mult: 1.25 },
      { value: "offgrid", label: "מנותקת מהרשת (off-grid)", mult: 1.55 },
    ]},
    { id: "battery", title: "סוללת אגירה", options: [
      { value: "none", label: "ללא סוללה", addILS: 0 },
      { value: "small", label: "סוללה 5 kWh", addILS: 18000 },
      { value: "medium", label: "סוללה 10 kWh", addILS: 32000 },
      { value: "large", label: "סוללה 15 kWh+", addILS: 50000 },
    ]},
    { id: "roof", title: "סוג הגג / התקנה", options: [
      { value: "standing_seam", label: "איסכורית / פנלים (פשוט)", mult: 1 },
      { value: "tile", label: "גג רעפים", mult: 1.07 },
      { value: "flat", label: "גג שטוח (קונסטרוקציה)", mult: 1.12 },
      { value: "ground", label: "התקנה קרקעית / חניה סולארית", mult: 1.2 },
    ]},
    { id: "panels", title: "סוג פאנלים", options: [
      { value: "standard", label: "סטנדרט (Tier-1)", mult: 1 },
      { value: "premium", label: "פרימיום (Jinko Tiger / LG)", mult: 1.15 },
      { value: "bifacial", label: "דו-צדדיים / יוקרה", mult: 1.3 },
    ]},
  ],
  ac_svc: [
    { id: "system", title: "סוג המערכת", options: [
      { value: "split", label: "מזגנים עיליים", mult: 1 },
      { value: "mini", label: "מיני מרכזי", mult: 1.4 },
      { value: "vrf", label: "VRF / מרכזי יוקרה", mult: 1.85 },
    ]},
    { id: "install", title: "מורכבות ההתקנה", options: [
      { value: "simple", label: "התקנה רגילה", mult: 1 },
      { value: "long", label: "צנרת ארוכה", mult: 1.15 },
      { value: "concealed", label: "צנרת מוסתרת בגבס", mult: 1.25 },
    ]},
  ],
  kitchen_svc: [
    { id: "doors", title: "חזיתות הארונות", options: [
      { value: "mdf", label: "MDF צבוע", mult: 0.85 },
      { value: "veneer", label: "פורניר עץ", mult: 1.05 },
      { value: "acrylic", label: "אקריליק / לכה", mult: 1.2 },
      { value: "fenix", label: "פניקס / יוקרה", mult: 1.4 },
    ]},
    { id: "top", title: "סוג השיש", options: [
      { value: "caesar", label: "אבן קיסר", mult: 1 },
      { value: "dekton", label: "דקטון / נאוליט", mult: 1.25 },
      { value: "natural", label: "אבן טבעית", mult: 1.4 },
    ]},
    { id: "appliances", title: "מכשירי חשמל", options: [
      { value: "none", label: "ללא (קיים)", addILS: 0 },
      { value: "basic", label: "בסיסי", addILS: 12000 },
      { value: "mid", label: "בינוני (כולל מדיח)", addILS: 22000 },
      { value: "premium", label: "פרימיום מובנים", addILS: 45000 },
    ]},
  ],
  parquet: [
    { id: "kind", title: "סוג הפרקט", options: [
      { value: "laminate", label: "למינציה", mult: 0.7 },
      { value: "engineered", label: "פרקט הנדסי", mult: 1 },
      { value: "solid", label: "עץ מלא", mult: 1.4 },
    ]},
    { id: "remove_old", title: "פירוק רצפה קיימת?", options: [
      { value: "no", label: "לא", mult: 1 },
      { value: "yes", label: "כן — כולל פירוק ופינוי", addILS: 4000 },
    ]},
  ],
  flooring_svc: [
    { id: "type", title: "סוג האריח", options: [
      { value: "ceramic", label: "קרמיקה רגילה", mult: 0.85 },
      { value: "porcelain", label: "פורצלן", mult: 1 },
      { value: "large", label: "פורצלן גדול (60×120+)", mult: 1.25 },
      { value: "marble", label: "שיש / אבן טבעית", mult: 1.6 },
    ]},
    { id: "remove_old", title: "פירוק רצפה קיימת?", options: [
      { value: "no", label: "לא", mult: 1 },
      { value: "yes", label: "כן — כולל פירוק", addILS: 5000 },
    ]},
  ],
  paint: [
    { id: "prep", title: "מצב הקירות", options: [
      { value: "good", label: "טוב — שכבת צבע בלבד", mult: 1 },
      { value: "fix", label: "שפכטל ותיקונים", mult: 1.35 },
      { value: "full", label: "שיוף מלא + פריימר", mult: 1.6 },
    ]},
    { id: "kind", title: "סוג הצבע", options: [
      { value: "standard", label: "סופרקריל סטנדרט", mult: 1 },
      { value: "premium", label: "צבע יוקרה / שטיפה", mult: 1.25 },
      { value: "deco", label: "דקורטיבי / טאדלאקט", mult: 1.8 },
    ]},
  ],
  aluminum_svc: [
    { id: "kind", title: "סוג האלומיניום", options: [
      { value: "regular", label: "סטנדרט", mult: 0.9 },
      { value: "thermal", label: "תרמי / אקוסטי", mult: 1.15 },
      { value: "belgian", label: "בלגי / יוקרה", mult: 1.55 },
    ]},
    { id: "shutters", title: "תריסים", options: [
      { value: "none", label: "ללא תריסים", mult: 1 },
      { value: "manual", label: "תריס ידני", addILS: 800 },
      { value: "electric", label: "תריס חשמלי", addILS: 1600 },
    ]},
  ],
  cameras: [
    { id: "resolution", title: "איכות מצלמה", options: [
      { value: "hd", label: "HD (2MP)", mult: 0.8 },
      { value: "4k", label: "4K (8MP)", mult: 1 },
      { value: "ai", label: "AI / זיהוי פנים", mult: 1.6 },
    ]},
    { id: "nvr", title: "מערכת הקלטה (NVR)", options: [
      { value: "none", label: "ללא", addILS: 0 },
      { value: "basic", label: "NVR בסיסי 4-8 ערוצים", addILS: 1800 },
      { value: "pro", label: "NVR מקצועי + דיסק 4TB", addILS: 4500 },
    ]},
  ],
  pergola: [
    { id: "material", title: "חומר הפרגולה", options: [
      { value: "wood", label: "עץ", mult: 1 },
      { value: "aluminum", label: "אלומיניום", mult: 1.3 },
      { value: "bioclimatic", label: "ביו-קלימטית מתכווננת", mult: 2.2 },
    ]},
  ],
  fences: [
    { id: "material", title: "חומר הגדר", options: [
      { value: "mesh", label: "רשת רביץ", mult: 0.7 },
      { value: "metal", label: "מתכת / ברזל מעוצב", mult: 1 },
      { value: "block", label: "בלוקים + טיח", mult: 1.3 },
      { value: "stone", label: "אבן / חיפוי יוקרה", mult: 1.8 },
    ]},
  ],
};

export type ServiceSpecAnswers = Record<string, string>;

// =============================
// Calculation engines
// =============================

export interface CategoryLine {
  name: string;
  slug: string;
  min: number;
  avg: number;
  max: number;
  note?: string;
}

export interface BudgetResult {
  track: Track;
  total: { min: number; avg: number; max: number };
  categories: CategoryLine[];
  matchedSlugs: string[];
  inputsSummary: string;
}

const RANGE_LOW = 0.82;
const RANGE_HIGH = 1.28;

const r = (n: number) => Math.round(n / 100) * 100;
const range = (avg: number) => ({ min: r(avg * RANGE_LOW), avg: r(avg), max: r(avg * RANGE_HIGH) });

// ---- Track 1: New Build ----
export interface NewBuildInputs {
  builtSqm: number;
  floors: number;
  basement: boolean;
  safeRoom: boolean;
  region: Region;
  finish: FinishLevel;
}

export function calcNewBuild(i: NewBuildInputs): BudgetResult {
  const base = NEW_BUILD_PRICE_PER_SQM[i.finish] * REGION_FACTOR[i.region];
  let total = base * i.builtSqm;
  if (i.basement) total *= 1.18; // 18% extra
  if (i.safeRoom) total += 35000;
  if (i.floors >= 2) total *= 1 + (i.floors - 1) * 0.06; // each extra floor +6%

  const categories: CategoryLine[] = NEW_BUILD_CATEGORY_BREAKDOWN.map((c) => {
    const avg = total * (c.pct / 100);
    return { name: c.name, slug: c.slug, ...range(avg) };
  });
  return {
    track: "new_build",
    total: range(total),
    categories,
    matchedSlugs: categories.map((c) => c.slug),
    inputsSummary: `בנייה חדשה ${i.builtSqm} מ"ר, ${i.floors} קומות, ${FINISH_LABELS[i.finish]}, ${REGION_LABELS[i.region]}${i.basement ? ", עם מרתף" : ""}${i.safeRoom ? ', עם ממ"ד' : ""}`,
  };
}

// ---- Track 2: Full Renovation ----
export interface FullRenoInputs {
  sqm: number;
  type: RenovationType;
  infra: boolean;
  flooring: boolean;
  kitchen: boolean;
  doors: boolean;
  windows: boolean;
  region: Region;
  finish: FinishLevel;
}

export function calcFullReno(i: FullRenoInputs): BudgetResult {
  const finishFactor = { basic: 0.85, standard: 1, premium: 1.3, luxury: 1.65 }[i.finish];
  let total = FULL_RENO_BASE_PER_SQM[i.type] * i.sqm * REGION_FACTOR[i.region] * finishFactor;
  const addons: { name: string; slug: string; amount: number }[] = [];
  for (const a of FULL_RENO_ADDONS) {
    const on = (i as unknown as Record<string, boolean>)[a.key];
    if (on) {
      const amt = total * (a.pct / 100);
      addons.push({ name: a.label, slug: a.key, amount: amt });
      total += amt;
    }
  }

  // Build categories: base buckets + addon lines
  const baseBuckets: { name: string; slug: string; pct: number }[] = [
    { name: "עבודות בנייה ופירוק", slug: "demolition", pct: 22 },
    { name: "חשמל", slug: "electricity", pct: 10 },
    { name: "אינסטלציה", slug: "plumbing", pct: 12 },
    { name: "ריצוף וקירות", slug: "flooring", pct: 18 },
    { name: "צבע וגימור", slug: "paint", pct: 10 },
    { name: "מטבח", slug: "kitchen", pct: 8 },
    { name: "אמבטיות", slug: "bathroom", pct: 8 },
    { name: "תכנון ופיקוח", slug: "design", pct: 7 },
    { name: 'בלת"מ', slug: "contingency", pct: 5 },
  ];
  const baseSum = total - addons.reduce((s, a) => s + a.amount, 0);
  const categories: CategoryLine[] = baseBuckets.map((b) => {
    const avg = baseSum * (b.pct / 100);
    return { name: b.name, slug: b.slug, ...range(avg) };
  });
  for (const a of addons) {
    categories.push({ name: a.name, slug: a.slug, ...range(a.amount) });
  }

  return {
    track: "full_renovation",
    total: range(total),
    categories,
    matchedSlugs: Array.from(new Set([...categories.map((c) => c.slug)])),
    inputsSummary: `שיפוץ ${RENO_LABELS[i.type]}, ${i.sqm} מ"ר, ${FINISH_LABELS[i.finish]}, ${REGION_LABELS[i.region]}`,
  };
}

// ---- Track 3: Single Room ----
export interface SingleRoomInputs {
  room: RoomKind;
  sizeSqm: number; // optional sizing factor (used for living/bedroom/balcony)
  finish: FinishLevel;
  region: Region;
  replacePlumbing?: boolean; // bathroom/kitchen/toilet
  newFurniture?: boolean;    // kitchen/living/bedroom
}

export function calcSingleRoom(i: SingleRoomInputs): BudgetResult {
  let avg = ROOM_AVG[i.room][i.finish] * REGION_FACTOR[i.region];
  // size adjustment for rooms where size matters
  if (["living", "bedroom", "balcony", "safe_room", "storage"].includes(i.room) && i.sizeSqm > 0) {
    avg *= Math.max(0.6, Math.min(2.2, i.sizeSqm / 18));
  }
  if (i.replacePlumbing) avg *= 1.18;
  if (i.newFurniture) avg *= 1.25;

  // category breakdown per room
  const map: Record<RoomKind, { name: string; slug: string; pct: number }[]> = {
    kitchen: [
      { name: "ארונות + שיש", slug: "kitchen", pct: 55 },
      { name: "מכשירי חשמל", slug: "appliances", pct: 18 },
      { name: "אינסטלציה", slug: "plumbing", pct: 8 },
      { name: "חשמל", slug: "electricity", pct: 6 },
      { name: "ריצוף + חיפוי", slug: "flooring", pct: 8 },
      { name: 'בלת"מ', slug: "contingency", pct: 5 },
    ],
    bathroom: [
      { name: "כלים סניטריים", slug: "plumbing", pct: 25 },
      { name: "ריצוף וחיפוי", slug: "flooring", pct: 28 },
      { name: "אינסטלציה", slug: "plumbing", pct: 18 },
      { name: "אביזרים", slug: "bathroom", pct: 14 },
      { name: "עבודות בנאי", slug: "demolition", pct: 10 },
      { name: 'בלת"מ', slug: "contingency", pct: 5 },
    ],
    toilet: [
      { name: "כלים + אסלה", slug: "plumbing", pct: 35 },
      { name: "ריצוף וחיפוי", slug: "flooring", pct: 35 },
      { name: "אינסטלציה", slug: "plumbing", pct: 20 },
      { name: 'בלת"מ', slug: "contingency", pct: 10 },
    ],
    living: [
      { name: "ריצוף/פרקט", slug: "flooring", pct: 35 },
      { name: "צבע וגבס", slug: "paint", pct: 18 },
      { name: "תאורה וחשמל", slug: "electricity", pct: 15 },
      { name: "ריהוט", slug: "furniture", pct: 25 },
      { name: 'בלת"מ', slug: "contingency", pct: 7 },
    ],
    bedroom: [
      { name: "ריצוף/פרקט", slug: "flooring", pct: 30 },
      { name: "צבע", slug: "paint", pct: 15 },
      { name: "ארונות", slug: "furniture", pct: 35 },
      { name: "תאורה וחשמל", slug: "electricity", pct: 13 },
      { name: 'בלת"מ', slug: "contingency", pct: 7 },
    ],
    balcony: [
      { name: "ריצוף חוץ", slug: "flooring", pct: 35 },
      { name: "פרגולה/הצללה", slug: "pergola", pct: 30 },
      { name: "מעקה/אלומיניום", slug: "aluminum", pct: 20 },
      { name: 'בלת"מ', slug: "contingency", pct: 15 },
    ],
    safe_room: [
      { name: "ריצוף", slug: "flooring", pct: 25 },
      { name: "צבע", slug: "paint", pct: 15 },
      { name: "אטימה ודלת", slug: "doors", pct: 35 },
      { name: "חשמל", slug: "electricity", pct: 15 },
      { name: 'בלת"מ', slug: "contingency", pct: 10 },
    ],
    storage: [
      { name: "ארונות/מדפים", slug: "furniture", pct: 60 },
      { name: "תאורה", slug: "electricity", pct: 20 },
      { name: "צבע", slug: "paint", pct: 15 },
      { name: 'בלת"מ', slug: "contingency", pct: 5 },
    ],
  };

  const categories: CategoryLine[] = map[i.room].map((c) => {
    const a = avg * (c.pct / 100);
    return { name: c.name, slug: c.slug, ...range(a) };
  });

  return {
    track: "single_room",
    total: range(avg),
    categories,
    matchedSlugs: Array.from(new Set(categories.map((c) => c.slug))),
    inputsSummary: `שיפוץ ${ROOM_LABELS[i.room]} ${i.sizeSqm ? `(${i.sizeSqm} מ"ר) ` : ""}ברמת ${FINISH_LABELS[i.finish]}, ${REGION_LABELS[i.region]}`,
  };
}

// ---- Track 4: Single Service ----
export interface SingleServiceInputs {
  service: ServiceKind;
  quantity: number;
  finish: FinishLevel;
  region: Region;
}

export function calcSingleService(i: SingleServiceInputs): BudgetResult {
  const svc = SERVICES.find((s) => s.key === i.service);
  if (!svc) throw new Error("שירות לא נמצא");
  const avg = svc.avgPerUnit[i.finish] * i.quantity * REGION_FACTOR[i.region];
  const categories: CategoryLine[] = [
    { name: svc.label, slug: svc.slug, ...range(avg * 0.88), note: `${i.quantity} ${svc.unitLabel}` },
    { name: "הובלה והתקנה", slug: svc.slug, ...range(avg * 0.08) },
    { name: 'בלת"מ', slug: "contingency", ...range(avg * 0.04) },
  ];
  return {
    track: "single_service",
    total: range(avg),
    categories,
    matchedSlugs: [svc.slug],
    inputsSummary: `${svc.label} — ${i.quantity} ${svc.unitLabel}, רמת ${FINISH_LABELS[i.finish]}, ${REGION_LABELS[i.region]}`,
  };
}

export const ILS = (n: number) => `${Math.round(n).toLocaleString("he-IL")} ₪`;
