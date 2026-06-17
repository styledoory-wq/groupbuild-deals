// Budget Wizard — precision modifiers that refine BudgetResult.
// Each answer applies a multiplier to total + optional category-specific multipliers
// and/or a fixed addition. After all modifiers, the range tightens (±10% instead of ±28%).

import { BudgetResult, CategoryLine, Track } from "./budgetPricing";

export type WizardOption = {
  value: string;
  label: string;
  // Total multiplier (1.0 = no change). e.g. 1.08 = +8%
  totalMult?: number;
  // Per-category-slug multipliers
  catMult?: Record<string, number>;
  // Fixed shekel addition to total (also distributed to a specific slug if provided)
  addILS?: number;
  addToSlug?: string;
  // Recommended description shown in result summary
  note?: string;
};

export type WizardQuestion = {
  id: string;
  step: number; // grouping step
  stepTitle: string;
  title: string;
  subtitle?: string;
  // "single" = pick one, "multi" = checkboxes (each option applies), "number" = numeric input
  type: "single" | "multi" | "number";
  options?: WizardOption[];
  // For number questions:
  numberConfig?: {
    unit: string;
    min: number;
    max: number;
    default: number;
    // Multiplier per unit above baseline
    baselineUnits: number;
    perUnitOverBaselineMult?: number; // e.g. 1.005 = +0.5% per unit above baseline
    perUnitAddILS?: number;          // alternative: fixed ILS per unit
    addToSlug?: string;
  };
  // Skip rule: only show when applies (return true to show)
  showIf?: (answers: WizardAnswers) => boolean;
};

export type WizardAnswers = Record<string, string | string[] | number>;

// ============================
// Question banks per track
// ============================

const SHARED_ACCESS: WizardQuestion[] = [
  {
    id: "access",
    step: 1,
    stepTitle: "גישה ואתר",
    title: "איך הגישה לאתר העבודה?",
    subtitle: "משאית גדולה יכולה להגיע ולפרוק קרוב?",
    type: "single",
    options: [
      { value: "easy", label: "קלה מאוד — חניה צמודה", totalMult: 0.98 },
      { value: "normal", label: "רגילה — מרחק קצר", totalMult: 1.0 },
      { value: "hard", label: "קשה — סמטאות / רחוב צר", totalMult: 1.04, note: "תוספת לוגיסטיקה" },
      { value: "very_hard", label: "מאוד מסובכת — נדרשת מנוף/הובלה ידנית", totalMult: 1.09 },
    ],
  },
  {
    id: "floor",
    step: 1,
    stepTitle: "גישה ואתר",
    title: "באיזו קומה הדירה?",
    type: "single",
    options: [
      { value: "ground", label: "קרקע / גן", totalMult: 1.0 },
      { value: "low_elev", label: "קומה 1-3 עם מעלית", totalMult: 1.0 },
      { value: "high_elev", label: "קומה 4+ עם מעלית", totalMult: 1.02 },
      { value: "low_noelev", label: "קומה 1-3 ללא מעלית", totalMult: 1.05 },
      { value: "high_noelev", label: "קומה 4+ ללא מעלית", totalMult: 1.12 },
    ],
  },
  {
    id: "demo",
    step: 1,
    stepTitle: "גישה ואתר",
    title: "כמה פירוק ופינוי פסולת צפוי?",
    type: "single",
    options: [
      { value: "none", label: "אין / מינימלי", totalMult: 1.0 },
      { value: "light", label: "פירוק קל (חדר-שניים)", totalMult: 1.02, addILS: 3500, addToSlug: "demolition" },
      { value: "medium", label: "פירוק בינוני (חצי דירה)", totalMult: 1.04, addILS: 8000, addToSlug: "demolition" },
      { value: "heavy", label: "פירוק מלא עד שלד", totalMult: 1.08, addILS: 16000, addToSlug: "demolition" },
    ],
  },
];

const KITCHEN_DETAIL: WizardQuestion[] = [
  {
    id: "kitchen_length",
    step: 2,
    stepTitle: "מטבח",
    title: 'אורך כולל של ארונות המטבח (מטרים רצים)',
    type: "number",
    numberConfig: { unit: 'מ"א', min: 0, max: 15, default: 5, baselineUnits: 5, perUnitAddILS: 4500, addToSlug: "kitchen" },
  },
  {
    id: "kitchen_doors",
    step: 2,
    stepTitle: "מטבח",
    title: "חומר חזיתות הארונות",
    type: "single",
    options: [
      { value: "mdf", label: "MDF צבוע", catMult: { kitchen: 0.85 } },
      { value: "veneer", label: "פורניר עץ", catMult: { kitchen: 1.05 } },
      { value: "acrylic", label: "אקריליק / לכה", catMult: { kitchen: 1.18 } },
      { value: "fenix", label: "פניקס / יוקרה", catMult: { kitchen: 1.35 } },
    ],
  },
  {
    id: "kitchen_top",
    step: 2,
    stepTitle: "מטבח",
    title: "סוג השיש",
    type: "single",
    options: [
      { value: "caesar_basic", label: "אבן קיסר בסיסי", catMult: { kitchen: 0.92 } },
      { value: "caesar_premium", label: "אבן קיסר פרימיום", catMult: { kitchen: 1.05 } },
      { value: "dekton", label: "דקטון / נאוליט", catMult: { kitchen: 1.22 } },
      { value: "natural", label: "אבן טבעית / חברון", catMult: { kitchen: 1.30 } },
    ],
  },
  {
    id: "kitchen_island",
    step: 2,
    stepTitle: "מטבח",
    title: "האם יש אי במטבח?",
    type: "single",
    options: [
      { value: "no", label: "לא", catMult: { kitchen: 1.0 } },
      { value: "small", label: "אי קטן", catMult: { kitchen: 1.08 }, addILS: 8000, addToSlug: "kitchen" },
      { value: "large", label: "אי גדול עם מושבים", catMult: { kitchen: 1.15 }, addILS: 16000, addToSlug: "kitchen" },
    ],
  },
  {
    id: "appliances",
    step: 2,
    stepTitle: "מטבח",
    title: "רמת מכשירי חשמל",
    type: "single",
    options: [
      { value: "basic", label: "בסיסי (כיריים, תנור, מקרר)", addILS: 12000, addToSlug: "appliances" },
      { value: "mid", label: "בינוני (כולל מדיח ושואב)", addILS: 22000, addToSlug: "appliances" },
      { value: "premium", label: "פרימיום (מותגי יוקרה, מובנים)", addILS: 45000, addToSlug: "appliances" },
      { value: "luxury", label: "יוקרה (Miele/Gaggenau)", addILS: 85000, addToSlug: "appliances" },
    ],
  },
];

const BATHROOM_DETAIL: WizardQuestion[] = [
  {
    id: "bath_count",
    step: 3,
    stepTitle: "אמבטיות וחדרים רטובים",
    title: "כמה חדרי רחצה ושירותים?",
    type: "number",
    numberConfig: { unit: "חדרים", min: 1, max: 6, default: 2, baselineUnits: 2, perUnitAddILS: 22000, addToSlug: "bathroom" },
  },
  {
    id: "bath_level",
    step: 3,
    stepTitle: "אמבטיות וחדרים רטובים",
    title: "רמת חדרי הרחצה",
    type: "single",
    options: [
      { value: "basic", label: "בסיסי — קרמיקה רגילה, כלים סטנדרט", catMult: { bathroom: 0.85, plumbing: 0.9 } },
      { value: "design", label: "מעוצב — חיפוי איכותי, ברז יוקרה אחד", catMult: { bathroom: 1.1, plumbing: 1.05 } },
      { value: "spa", label: "ספא — ניחוח מלון, ברזים נסתרים, אדים", catMult: { bathroom: 1.4, plumbing: 1.2 }, addILS: 12000 },
    ],
  },
  {
    id: "bath_features",
    step: 3,
    stepTitle: "אמבטיות וחדרים רטובים",
    title: "תוספות מיוחדות",
    subtitle: "בחר את כל מה שרלוונטי",
    type: "multi",
    options: [
      { value: "tub", label: "אמבט עומד / פינתי", addILS: 8000, addToSlug: "bathroom" },
      { value: "rain", label: "מקלחת גשם", addILS: 3500, addToSlug: "plumbing" },
      { value: "heated", label: "חימום רצפתי באמבטיה", addILS: 7000, addToSlug: "electricity" },
      { value: "smart_toilet", label: "אסלת יפנית חכמה", addILS: 9000, addToSlug: "plumbing" },
    ],
  },
];

const OPENINGS_DETAIL: WizardQuestion[] = [
  {
    id: "windows_count",
    step: 4,
    stepTitle: "חלונות ודלתות",
    title: "כמה חלונות צריך להחליף/להתקין?",
    type: "number",
    numberConfig: { unit: "חלונות", min: 0, max: 30, default: 8, baselineUnits: 8, perUnitAddILS: 2200, addToSlug: "aluminum" },
  },
  {
    id: "windows_type",
    step: 4,
    stepTitle: "חלונות ודלתות",
    title: "סוג האלומיניום",
    type: "single",
    options: [
      { value: "regular", label: "אלומיניום סטנדרט", catMult: { aluminum: 0.9 } },
      { value: "thermal", label: "תרמי / בידוד אקוסטי", catMult: { aluminum: 1.15 } },
      { value: "belgian", label: "בלגי / יוקרה", catMult: { aluminum: 1.55 } },
    ],
  },
  {
    id: "interior_doors",
    step: 4,
    stepTitle: "חלונות ודלתות",
    title: "כמה דלתות פנים?",
    type: "number",
    numberConfig: { unit: "דלתות", min: 0, max: 20, default: 6, baselineUnits: 6, perUnitAddILS: 1900, addToSlug: "doors" },
  },
  {
    id: "entry_door",
    step: 4,
    stepTitle: "חלונות ודלתות",
    title: "דלת כניסה",
    type: "single",
    options: [
      { value: "keep", label: "משאירים את הקיימת", addILS: 0 },
      { value: "standard", label: "פלדלת סטנדרטית", addILS: 5500, addToSlug: "doors" },
      { value: "premium", label: "דלת ביטחון פרימיום", addILS: 14000, addToSlug: "doors" },
      { value: "luxury", label: "דלת מעוצבת יוקרה", addILS: 24000, addToSlug: "doors" },
    ],
  },
];

const SYSTEMS_DETAIL: WizardQuestion[] = [
  {
    id: "ac_units",
    step: 5,
    stepTitle: "מערכות וחכמה",
    title: "כמה יחידות מיזוג?",
    type: "number",
    numberConfig: { unit: "יחידות", min: 0, max: 12, default: 3, baselineUnits: 3, perUnitAddILS: 5500, addToSlug: "ac" },
  },
  {
    id: "ac_type",
    step: 5,
    stepTitle: "מערכות וחכמה",
    title: "סוג המיזוג",
    type: "single",
    options: [
      { value: "split", label: "מזגנים עיליים", catMult: { ac: 0.85 } },
      { value: "mini", label: "מיני מרכזי", catMult: { ac: 1.1 } },
      { value: "vrf", label: "VRF / מרכזי יוקרה", catMult: { ac: 1.4 } },
    ],
  },
  {
    id: "extras",
    step: 5,
    stepTitle: "מערכות וחכמה",
    title: "מערכות נוספות",
    subtitle: "בחר את כל מה שתרצה",
    type: "multi",
    options: [
      { value: "smart_home", label: "בית חכם (תאורה/תריסים)", addILS: 18000, addToSlug: "electricity" },
      { value: "underfloor", label: "חימום תת-רצפתי", addILS: 28000, addToSlug: "electricity" },
      { value: "solar", label: "מערכת סולארית", addILS: 32000, addToSlug: "solar" },
      { value: "cameras", label: "מצלמות אבטחה ואזעקה", addILS: 9000, addToSlug: "security" },
      { value: "central_vac", label: 'שאיבה מרכזית', addILS: 7500, addToSlug: "electricity" },
    ],
  },
];

const EXTERIOR_DETAIL: WizardQuestion[] = [
  {
    id: "garden",
    step: 6,
    stepTitle: "חוץ וגינה",
    title: "פיתוח חצר וגינה",
    type: "single",
    options: [
      { value: "none", label: "אין צורך", totalMult: 1.0 },
      { value: "basic", label: "דשא + ריצוף בסיסי", addILS: 25000, addToSlug: "exterior" },
      { value: "designed", label: "גינה מעוצבת + פרגולה", addILS: 65000, addToSlug: "exterior" },
      { value: "luxury", label: "גינה יוקרה + בריכה קטנה", addILS: 180000, addToSlug: "exterior" },
    ],
    showIf: (a) => a.track_kind !== "single_room",
  },
  {
    id: "parking",
    step: 6,
    stepTitle: "חוץ וגינה",
    title: "פתרון חנייה",
    type: "single",
    options: [
      { value: "open", label: "פתוחה", totalMult: 1.0 },
      { value: "shade", label: "סככת צל", addILS: 12000, addToSlug: "exterior" },
      { value: "covered", label: "חנייה מקורה / מוסך", addILS: 35000, addToSlug: "exterior" },
    ],
    showIf: (a) => a.track_kind === "new_build",
  },
];

const PERMITS_DETAIL: WizardQuestion[] = [
  {
    id: "permits",
    step: 7,
    stepTitle: "תכנון ופיקוח",
    title: "האם נדרשים היתרים ותכנון מקצועי?",
    type: "single",
    options: [
      { value: "none", label: "לא נדרש (פנים בלבד)", totalMult: 1.0 },
      { value: "design", label: "אדריכל / מעצבת פנים", totalMult: 1.04, addToSlug: "design" },
      { value: "permit", label: "היתר בנייה + יועצים", totalMult: 1.09, addILS: 22000, addToSlug: "design" },
      { value: "full", label: "תוספת בנייה + פיקוח מלא", totalMult: 1.14, addILS: 45000, addToSlug: "design" },
    ],
  },
  {
    id: "contingency",
    step: 7,
    stepTitle: "תכנון ופיקוח",
    title: "מרווח בלת\"מ רצוי",
    subtitle: "המלצה: לפחות 10% לבנייה חדשה, 8% לשיפוץ",
    type: "single",
    options: [
      { value: "low", label: "5% — דק", totalMult: 1.0 },
      { value: "med", label: "10% — בטוח", totalMult: 1.05 },
      { value: "high", label: "15% — שקט נפשי", totalMult: 1.10 },
    ],
  },
];

// ============================
// Question sets per track
// ============================
export function getWizardQuestions(track: Track): WizardQuestion[] {
  switch (track) {
    case "new_build":
      return [
        ...SHARED_ACCESS.filter((q) => q.id !== "floor"), // ground build
        ...KITCHEN_DETAIL,
        ...BATHROOM_DETAIL,
        ...OPENINGS_DETAIL,
        ...SYSTEMS_DETAIL,
        ...EXTERIOR_DETAIL,
        ...PERMITS_DETAIL,
      ];
    case "full_renovation":
      return [
        ...SHARED_ACCESS,
        ...KITCHEN_DETAIL,
        ...BATHROOM_DETAIL,
        ...OPENINGS_DETAIL,
        ...SYSTEMS_DETAIL,
        ...PERMITS_DETAIL,
      ];
    case "single_room":
      return [
        ...SHARED_ACCESS.filter((q) => q.id !== "demo"),
        ...KITCHEN_DETAIL,
        ...BATHROOM_DETAIL,
        ...PERMITS_DETAIL.filter((q) => q.id === "contingency"),
      ];
    case "single_service":
      return [
        SHARED_ACCESS[0], // access
        SHARED_ACCESS[1], // floor
        PERMITS_DETAIL[1], // contingency
      ];
  }
}

// ============================
// Apply answers → refined BudgetResult
// ============================
export function applyWizardAnswers(base: BudgetResult, questions: WizardQuestion[], answers: WizardAnswers): BudgetResult {
  let totalMult = 1;
  const catMultMap: Record<string, number> = {};
  const addBySlug: Record<string, number> = {};
  let addTotal = 0;
  const notes: string[] = [];

  for (const q of questions) {
    if (q.showIf && !q.showIf(answers)) continue;
    const ans = answers[q.id];
    if (ans === undefined || ans === "") continue;

    if (q.type === "number" && q.numberConfig) {
      const cfg = q.numberConfig;
      const n = Number(ans) || 0;
      const delta = n - cfg.baselineUnits;
      if (cfg.perUnitOverBaselineMult) {
        totalMult *= Math.pow(cfg.perUnitOverBaselineMult, delta);
      }
      if (cfg.perUnitAddILS && cfg.addToSlug) {
        const add = delta * cfg.perUnitAddILS;
        addBySlug[cfg.addToSlug] = (addBySlug[cfg.addToSlug] ?? 0) + add;
        addTotal += add;
      }
      continue;
    }

    const selected: WizardOption[] = [];
    const opts = q.options ?? [];
    if (q.type === "single") {
      const opt = opts.find((o) => o.value === ans);
      if (opt) selected.push(opt);
    } else if (q.type === "multi") {
      const arr = Array.isArray(ans) ? ans : [];
      for (const v of arr) {
        const opt = opts.find((o) => o.value === v);
        if (opt) selected.push(opt);
      }
    }

    for (const opt of selected) {
      if (opt.totalMult) totalMult *= opt.totalMult;
      if (opt.catMult) {
        for (const [slug, m] of Object.entries(opt.catMult)) {
          catMultMap[slug] = (catMultMap[slug] ?? 1) * m;
        }
      }
      if (opt.addILS) {
        addTotal += opt.addILS;
        if (opt.addToSlug) {
          addBySlug[opt.addToSlug] = (addBySlug[opt.addToSlug] ?? 0) + opt.addILS;
        }
      }
      if (opt.note) notes.push(opt.note);
    }
  }

  // Apply to categories
  const r = (n: number) => Math.round(n / 100) * 100;
  const newCats: CategoryLine[] = base.categories.map((c) => {
    const catMult = catMultMap[c.slug] ?? 1;
    const add = addBySlug[c.slug] ?? 0;
    const avg = c.avg * totalMult * catMult + add;
    return {
      ...c,
      min: r(avg * 0.92), // tighter range — wizard answered = ±8%
      avg: r(avg),
      max: r(avg * 1.10),
    };
  });

  // Add any "addBySlug" slugs that don't exist as categories — append them
  const existingSlugs = new Set(base.categories.map((c) => c.slug));
  for (const [slug, add] of Object.entries(addBySlug)) {
    if (!existingSlugs.has(slug) && add > 0) {
      const name = SLUG_LABELS[slug] ?? slug;
      newCats.push({
        name,
        slug,
        min: r(add * 0.92),
        avg: r(add),
        max: r(add * 1.10),
      });
    }
  }

  // Recompute total from categories for consistency
  const sumAvg = newCats.reduce((s, c) => s + c.avg, 0);
  // Also factor in any unallocated total adds (none — addTotal is allocated via addBySlug)
  void addTotal;

  return {
    ...base,
    categories: newCats,
    total: { min: r(sumAvg * 0.92), avg: r(sumAvg), max: r(sumAvg * 1.10) },
    matchedSlugs: Array.from(new Set(newCats.map((c) => c.slug))),
    inputsSummary: base.inputsSummary + (notes.length ? ` · ${notes.join(", ")}` : "") + " · אשף מדויק",
  };
}

const SLUG_LABELS: Record<string, string> = {
  kitchen: "מטבח",
  bathroom: "אמבטיות",
  appliances: "מכשירי חשמל",
  plumbing: "אינסטלציה",
  electricity: "חשמל",
  flooring: "ריצוף",
  paint: "צבע",
  aluminum: "אלומיניום",
  doors: "דלתות",
  ac: "מיזוג",
  solar: "מערכת סולארית",
  security: "אבטחה",
  demolition: "פירוק ופינוי",
  exterior: "פיתוח חוץ",
  design: "תכנון ופיקוח",
  contingency: 'בלת"מ',
};

// Group questions by step for UI rendering
export function groupByStep(questions: WizardQuestion[], answers: WizardAnswers) {
  const visible = questions.filter((q) => !q.showIf || q.showIf(answers));
  const steps: { step: number; title: string; questions: WizardQuestion[] }[] = [];
  for (const q of visible) {
    let s = steps.find((x) => x.step === q.step);
    if (!s) {
      s = { step: q.step, title: q.stepTitle, questions: [] };
      steps.push(s);
    }
    s.questions.push(q);
  }
  return steps.sort((a, b) => a.step - b.step);
}
