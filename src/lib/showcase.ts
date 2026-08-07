/**
 * Showcase (Demo) Mode — App Store screenshots only.
 *
 * Activated with `?showcase=1` (persisted for the browser session).
 * When active, screens render static, high-quality demo data INSTEAD of
 * querying the backend. Nothing is written to production data, and the
 * mode is never reachable for regular users unless the flag is in the URL.
 *
 * Turn off with `?showcase=0`.
 */
import kitchenImg from "@/assets/showcase/deal-kitchen.jpg";
import solarImg from "@/assets/showcase/deal-solar.jpg";
import flooringImg from "@/assets/showcase/deal-flooring.jpg";
import acImg from "@/assets/showcase/deal-ac.jpg";
import {
  PROJECT_INFO_KEY,
  BUDGET_KEY,
  BUDGET_TOTAL_KEY,
} from "@/lib/projectStore";

const SESSION_KEY = "gb:showcase";

let cached: boolean | null = null;

/** Is showcase (demo) mode active for this session? */
export function isShowcase(): boolean {
  if (typeof window === "undefined") return false;
  if (cached !== null) return cached;
  let on = false;
  try {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get("showcase");
    if (flag === "1") {
      sessionStorage.setItem(SESSION_KEY, "1");
      on = true;
    } else if (flag === "0") {
      sessionStorage.removeItem(SESSION_KEY);
      on = false;
    } else {
      on = sessionStorage.getItem(SESSION_KEY) === "1";
    }
  } catch {
    on = false;
  }
  cached = on;
  if (on) seedShowcaseProject();
  return on;
}

export const SHOWCASE_IMAGES = {
  kitchen: kitchenImg,
  solar: solarImg,
  flooring: flooringImg,
  ac: acImg,
};

const inDays = (d: number) => new Date(Date.now() + d * 86400_000).toISOString();
const agoHours = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

/* ---------------------------------- supplier --------------------------------- */

export const SHOWCASE_SUPPLIER = {
  id: "showcase-supplier-1",
  user_id: "showcase-user-1",
  business_name: "אלמוג מטבחים ועיצוב פנים",
  contact_name: "רון אלמוג",
  phone: "03-000-0000",
  email: "demo@groupbuild.co.il",
  approval_status: "approved",
  is_active: true,
  logo_url: null as string | null,
  website_url: "https://groupbuild.co.il",
  whatsapp_url: null as string | null,
  instagram_url: null as string | null,
  facebook_url: null as string | null,
  catalog_url: null as string | null,
  supplier_kind: "both",
  offers_services: true,
  offers_products: true,
  serves_all_country: false,
  categories: ["מטבחים", "נגרות ואחסון", "עיצוב פנים"],
  service_areas: ["גוש דן", "השרון", "שפלה"],
  short_description: "מטבחים בהתאמה אישית, נגרות פרימיום וליווי עיצובי מלא — 18 שנות ניסיון.",
  description:
    "אלמוג מטבחים ועיצוב פנים מתמחה בתכנון וייצור מטבחים בהתאמה אישית, ארונות אמבטיה וארונות קיר. " +
    "הצוות שלנו מלווה את הלקוח משלב התכנון והמדידה ועד ההתקנה הסופית, עם התחייבות ללוחות זמנים " +
    "ואחריות מלאה של 10 שנים. אנחנו עובדים עם קבוצות רוכשים בכל גוש דן והשרון ומעניקים תנאים " +
    "מיוחדים לפרויקטים משותפים של בניינים ושכונות.",
};

/* ----------------------------------- deals ----------------------------------- */

type ShowcaseDeal = {
  id: string;
  title: string;
  description: string;
  status: string;
  category_id: string | null;
  supplier_id: string;
  supplier_name: string;
  supplier_logo_url: string | null;
  offer_type: string;
  listing_type: string;
  original_price: number | null;
  discounted_price: number | null;
  discount_percentage: number | null;
  base_price: number | null;
  tiers: Array<{
    minParticipants: number;
    maxParticipants: number | null;
    original_price?: number | null;
    discounted_price?: number | null;
    discount_percentage?: number | null;
  }>;
  ends_at: string | null;
  join_deadline: string | null;
  redemption_deadline: string | null;
  auto_closed_at: string | null;
  visibility_type: string;
  visibility_project_id: string | null;
  cover_image_url: string;
  gallery_images: string[];
  target_participants: number;
  service_areas: string[];
  deposit_required: boolean;
  deposit_amount: number | null;
  offer_terms: string | null;
  restrictions: string | null;
  appointment_required: boolean;
  product_details: string | null;
  joiners: number;
};

export const SHOWCASE_DEALS: ShowcaseDeal[] = [
  {
    id: "showcase-deal-kitchen",
    title: "מטבח מלא בהתאמה אישית — כולל התקנה",
    description:
      "מטבח בהתאמה אישית עם חזיתות אקריל, משטח קוורץ, פתיחות בלו-מושן ואחריות 10 שנים. " +
      "המחיר כולל מדידה, תכנון תלת־ממדי, ייצור והתקנה מלאה. ככל שיצטרפו יותר רוכשים — המחיר יורד.",
    status: "active",
    category_id: "sc-kitchen",
    supplier_id: SHOWCASE_SUPPLIER.id,
    supplier_name: SHOWCASE_SUPPLIER.business_name,
    supplier_logo_url: null,
    offer_type: "price_comparison",
    listing_type: "group_buy",
    original_price: 42000,
    discounted_price: 31500,
    discount_percentage: 25,
    base_price: 42000,
    tiers: [
      { minParticipants: 5, maxParticipants: 9, original_price: 42000, discounted_price: 37800 },
      { minParticipants: 10, maxParticipants: 19, original_price: 42000, discounted_price: 34400 },
      { minParticipants: 20, maxParticipants: 29, original_price: 42000, discounted_price: 32400 },
      { minParticipants: 30, maxParticipants: null, original_price: 42000, discounted_price: 31500 },
    ],
    ends_at: inDays(11),
    join_deadline: inDays(11),
    redemption_deadline: inDays(90),
    auto_closed_at: null,
    visibility_type: "public",
    visibility_project_id: null,
    cover_image_url: kitchenImg,
    gallery_images: [kitchenImg, flooringImg],
    target_participants: 30,
    service_areas: ["גוש דן", "השרון"],
    deposit_required: true,
    deposit_amount: 250,
    offer_terms: "ההצעה תמומש רק אם ייסגרו לפחות 5 משתתפים. המחיר הסופי נקבע לפי מספר המצטרפים בסיום התקופה.",
    restrictions: "ההצעה תקפה לדירות בגוש דן והשרון בלבד.",
    appointment_required: true,
    product_details: "חזיתות אקריל · משטח קוורץ 20 מ\"מ · צירי בלו-מושן · אחריות 10 שנים",
    joiners: 23,
  },
  {
    id: "showcase-deal-solar",
    title: "מערכת סולארית ביתית 10 קילוואט",
    description: "התקנה מלאה של מערכת סולארית כולל ממיר, חיבור לחברת חשמל וליווי רגולטורי.",
    status: "active",
    category_id: "sc-elec",
    supplier_id: "showcase-supplier-2",
    supplier_name: "סולאר גרין אנרגיה",
    supplier_logo_url: null,
    offer_type: "price_comparison",
    listing_type: "group_buy",
    original_price: 38000,
    discounted_price: 29900,
    discount_percentage: 21,
    base_price: 38000,
    tiers: [
      { minParticipants: 5, maxParticipants: 14, original_price: 38000, discounted_price: 33900 },
      { minParticipants: 15, maxParticipants: null, original_price: 38000, discounted_price: 29900 },
    ],
    ends_at: inDays(6),
    join_deadline: inDays(6),
    redemption_deadline: inDays(120),
    auto_closed_at: null,
    visibility_type: "public",
    visibility_project_id: null,
    cover_image_url: solarImg,
    gallery_images: [solarImg],
    target_participants: 15,
    service_areas: ["שפלה", "ירושלים"],
    deposit_required: true,
    deposit_amount: 200,
    offer_terms: "כולל אחריות יצרן 12 שנה על הפאנלים.",
    restrictions: null,
    appointment_required: true,
    product_details: "10kW · ממיר תלת־פאזי · אחריות 12 שנה",
    joiners: 12,
  },
  {
    id: "showcase-deal-flooring",
    title: "ריצוף גרניט פורצלן 60x120 — כולל הובלה",
    description: "אריחי גרניט פורצלן איטלקיים בגימור מט, מלאי זמין, הובלה עד הבית.",
    status: "active",
    category_id: "sc-floor",
    supplier_id: "showcase-supplier-3",
    supplier_name: "קרמיקה ישראלי",
    supplier_logo_url: null,
    offer_type: "percentage",
    listing_type: "group_buy",
    original_price: null,
    discounted_price: null,
    discount_percentage: 30,
    base_price: null,
    tiers: [
      { minParticipants: 10, maxParticipants: 24, discount_percentage: 22 },
      { minParticipants: 25, maxParticipants: null, discount_percentage: 30 },
    ],
    ends_at: inDays(14),
    join_deadline: inDays(14),
    redemption_deadline: inDays(60),
    auto_closed_at: null,
    visibility_type: "public",
    visibility_project_id: null,
    cover_image_url: flooringImg,
    gallery_images: [flooringImg],
    target_participants: 25,
    service_areas: ["גוש דן"],
    deposit_required: false,
    deposit_amount: null,
    offer_terms: null,
    restrictions: null,
    appointment_required: false,
    product_details: "גרניט פורצלן 60x120 · גימור מט · מלאי זמין",
    joiners: 31,
  },
  {
    id: "showcase-deal-ac",
    title: "מזגן עילי אינוורטר 1.5 כ\"ס + התקנה",
    description: "מזגן אינוורטר חסכוני עם התקנה סטנדרטית מלאה ואחריות יצרן 3 שנים.",
    status: "active",
    category_id: "sc-climate",
    supplier_id: "showcase-supplier-4",
    supplier_name: "מיזוג פלוס",
    supplier_logo_url: null,
    offer_type: "price_comparison",
    listing_type: "group_buy",
    original_price: 3900,
    discounted_price: 2790,
    discount_percentage: 28,
    base_price: 3900,
    tiers: [
      { minParticipants: 10, maxParticipants: 29, original_price: 3900, discounted_price: 3190 },
      { minParticipants: 30, maxParticipants: null, original_price: 3900, discounted_price: 2790 },
    ],
    ends_at: inDays(4),
    join_deadline: inDays(4),
    redemption_deadline: inDays(45),
    auto_closed_at: null,
    visibility_type: "public",
    visibility_project_id: null,
    cover_image_url: acImg,
    gallery_images: [acImg],
    target_participants: 30,
    service_areas: ["גוש דן", "שפלה"],
    deposit_required: true,
    deposit_amount: 100,
    offer_terms: null,
    restrictions: null,
    appointment_required: true,
    product_details: "אינוורטר · 1.5 כ\"ס · אחריות 3 שנים",
    joiners: 27,
  },
  {
    id: "showcase-deal-doors",
    title: "דלתות פנים מלמין — סט ל־4 חדרים",
    description: "סט דלתות פנים כולל משקופים, ידיות והתקנה. מבחר גוונים.",
    status: "active",
    category_id: "sc-doors",
    supplier_id: "showcase-supplier-5",
    supplier_name: "דלתות שחר",
    supplier_logo_url: null,
    offer_type: "price_comparison",
    listing_type: "group_buy",
    original_price: 7200,
    discounted_price: 5400,
    discount_percentage: 25,
    base_price: 7200,
    tiers: [
      { minParticipants: 8, maxParticipants: 19, original_price: 7200, discounted_price: 6200 },
      { minParticipants: 20, maxParticipants: null, original_price: 7200, discounted_price: 5400 },
    ],
    ends_at: inDays(9),
    join_deadline: inDays(9),
    redemption_deadline: inDays(75),
    auto_closed_at: null,
    visibility_type: "public",
    visibility_project_id: null,
    cover_image_url: flooringImg,
    gallery_images: [flooringImg],
    target_participants: 20,
    service_areas: ["השרון"],
    deposit_required: false,
    deposit_amount: null,
    offer_terms: null,
    restrictions: null,
    appointment_required: false,
    product_details: "4 דלתות · משקוף מתכוונן · התקנה כלולה",
    joiners: 14,
  },
  {
    id: "showcase-deal-paint",
    title: "צביעת דירה מלאה עד 100 מ\"ר",
    description: "צביעת דירה בשתי שכבות, כולל שפכטל, חומרים וכיסוי ריהוט.",
    status: "active",
    category_id: "sc-paint",
    supplier_id: "showcase-supplier-6",
    supplier_name: "צבע וסגנון",
    supplier_logo_url: null,
    offer_type: "price_comparison",
    listing_type: "group_buy",
    original_price: 6500,
    discounted_price: 4900,
    discount_percentage: 24,
    base_price: 6500,
    tiers: [
      { minParticipants: 6, maxParticipants: 14, original_price: 6500, discounted_price: 5600 },
      { minParticipants: 15, maxParticipants: null, original_price: 6500, discounted_price: 4900 },
    ],
    ends_at: inDays(17),
    join_deadline: inDays(17),
    redemption_deadline: inDays(60),
    auto_closed_at: null,
    visibility_type: "public",
    visibility_project_id: null,
    cover_image_url: acImg,
    gallery_images: [acImg],
    target_participants: 15,
    service_areas: ["גוש דן"],
    deposit_required: false,
    deposit_amount: null,
    offer_terms: null,
    restrictions: null,
    appointment_required: false,
    product_details: "2 שכבות · שפכטל אמריקאי · חומרים כלולים",
    joiners: 9,
  },
];

export const SHOWCASE_DEAL_COUNTS: Record<string, number> = Object.fromEntries(
  SHOWCASE_DEALS.map((d) => [d.id, d.joiners]),
);

export function showcaseDealById(id: string) {
  return SHOWCASE_DEALS.find((d) => d.id === id) ?? null;
}

/** Deals shaped for the resident cards grid (RealDealCardData). */
export function showcaseDealCards() {
  return SHOWCASE_DEALS.map((d) => ({ ...d }));
}

/** Deals shaped for the public home hook (PublicDeal). */
export function showcasePublicDeals(limit = 4) {
  return SHOWCASE_DEALS.slice(0, limit).map((d) => ({
    id: d.id,
    title: d.title,
    discount_percentage: d.discount_percentage,
    cover_image_url: d.cover_image_url,
    service_areas: d.service_areas,
    supplier: { id: d.supplier_id, business_name: d.supplier_name, logo_url: null },
  }));
}

/* ---------------------------------- search ---------------------------------- */

export const SHOWCASE_SUPPLIERS_LIST = [
  {
    id: SHOWCASE_SUPPLIER.id,
    business_name: SHOWCASE_SUPPLIER.business_name,
    short_description: SHOWCASE_SUPPLIER.short_description,
    logo_url: null,
    categories: ["מטבחים", "נגרות"],
    service_areas: ["גוש דן", "השרון"],
    is_active: true,
    approval_status: "approved",
  },
  {
    id: "showcase-supplier-7",
    business_name: "מטבחי דורון",
    short_description: "מטבחים מודרניים בייצור עצמי, אספקה תוך 30 יום.",
    logo_url: null,
    categories: ["מטבחים"],
    service_areas: ["גוש דן"],
    is_active: true,
    approval_status: "approved",
  },
  {
    id: "showcase-supplier-8",
    business_name: "Kitchen Studio",
    short_description: "סטודיו לתכנון מטבחי יוקרה וארונות אמבטיה.",
    logo_url: null,
    categories: ["מטבחים", "עיצוב פנים"],
    service_areas: ["השרון"],
    is_active: true,
    approval_status: "approved",
  },
  {
    id: "showcase-supplier-9",
    business_name: "נגריית האחים לוי",
    short_description: "נגרות אישית: ארונות קיר, מטבחים ופתרונות אחסון.",
    logo_url: null,
    categories: ["נגרות", "ארונות"],
    service_areas: ["שפלה"],
    is_active: true,
    approval_status: "approved",
  },
];

export const SHOWCASE_SEARCH_QUERY = "מטבחים";

export const SHOWCASE_CATALOG = [
  { id: "sc-kitchen", kind: "category", name: "מטבחים", parent_name: "גמרים" },
  { id: "sc-carpentry", kind: "category", name: "נגרות", parent_name: "גמרים" },
  { id: "sc-closets", kind: "category", name: "ארונות ואחסון", parent_name: "גמרים" },
  { id: "sc-interior", kind: "category", name: "עיצוב פנים", parent_name: "תכנון ועיצוב" },
];

/* -------------------------------- supplier app ------------------------------- */

export const SHOWCASE_SUPPLIER_DEALS = SHOWCASE_DEALS.slice(0, 4).map((d) => ({
  ...d,
  supplier_id: SHOWCASE_SUPPLIER.id,
  created_at: agoHours(72),
}));

export const SHOWCASE_SUPPLIER_DEAL_COUNTS: Record<
  string,
  { interests: number; paid: number; favorites: number }
> = {
  "showcase-deal-kitchen": { interests: 34, paid: 26, favorites: 128 },
  "showcase-deal-solar": { interests: 12, paid: 9, favorites: 38 },
  "showcase-deal-flooring": { interests: 23, paid: 17, favorites: 91 },
  "showcase-deal-ac": { interests: 27, paid: 21, favorites: 55 },
};

export const SHOWCASE_WEEK_STATS = { views: 1284, leads: 37, whatsapp: 52, calls: 21 };

export const SHOWCASE_LEADS = [
  {
    id: "showcase-lead-1",
    user_id: "showcase-resident-1",
    deal_id: "showcase-deal-kitchen",
    status: "interested",
    deposit_required: true,
    deposit_amount: 250,
    deposit_status: "paid",
    created_at: agoHours(3),
    is_demo: false,
    full_name: "נועה ברק",
    phone: "050-000-0001",
    city: "רמת גן",
    project_name: "שיפוץ דירת 4 חדרים",
    estimated_quantity: 1,
    lead_status: "new",
    notes: "מעוניינת בתכנון תלת־ממדי לפני החלטה.",
    supplier_notes: null,
    supplier_starred: true,
    is_deleted: false,
    deleted_at: null,
    direct_deposit_status: null,
    direct_deposit_amount: null,
    resident_marked_paid_at: null,
    supplier_confirmed_at: null,
  },
  {
    id: "showcase-lead-2",
    user_id: "showcase-resident-2",
    deal_id: "showcase-deal-kitchen",
    status: "interested",
    deposit_required: true,
    deposit_amount: 250,
    deposit_status: "paid",
    created_at: agoHours(26),
    is_demo: false,
    full_name: "אורי כהן",
    phone: "050-000-0002",
    city: "תל אביב",
    project_name: "דירה חדשה מקבלן",
    estimated_quantity: 1,
    lead_status: "contacted",
    notes: null,
    supplier_notes: null,
    supplier_starred: false,
    is_deleted: false,
    deleted_at: null,
    direct_deposit_status: null,
    direct_deposit_amount: null,
    resident_marked_paid_at: null,
    supplier_confirmed_at: null,
  },
  {
    id: "showcase-lead-3",
    user_id: "showcase-resident-3",
    deal_id: "showcase-deal-flooring",
    status: "paid",
    deposit_required: false,
    deposit_amount: null,
    deposit_status: null,
    created_at: agoHours(50),
    is_demo: false,
    full_name: "מיכל אדרי",
    phone: "050-000-0003",
    city: "הרצליה",
    project_name: "בית פרטי — שלב גמרים",
    estimated_quantity: 120,
    lead_status: "quoted",
    notes: "מבקשת הצעת מחיר ל־120 מ\"ר.",
    supplier_notes: null,
    supplier_starred: false,
    is_deleted: false,
    deleted_at: null,
    direct_deposit_status: null,
    direct_deposit_amount: null,
    resident_marked_paid_at: null,
    supplier_confirmed_at: null,
  },
  {
    id: "showcase-lead-4",
    user_id: "showcase-resident-4",
    deal_id: "showcase-deal-ac",
    status: "paid",
    deposit_required: true,
    deposit_amount: 100,
    deposit_status: "paid",
    created_at: agoHours(96),
    is_demo: false,
    full_name: "יואב שמש",
    phone: "050-000-0004",
    city: "פתח תקווה",
    project_name: "שדרוג מיזוג בדירה",
    estimated_quantity: 3,
    lead_status: "won",
    notes: null,
    supplier_notes: "נסגר — התקנה נקבעה.",
    supplier_starred: false,
    is_deleted: false,
    deleted_at: null,
    direct_deposit_status: null,
    direct_deposit_amount: null,
    resident_marked_paid_at: null,
    supplier_confirmed_at: agoHours(20),
  },
];

export const SHOWCASE_ANALYTICS = {
  summary: [
    { event_type: "profile_view", current_count: 1284, previous_count: 1042 },
    { event_type: "deal_view", current_count: 866, previous_count: 705 },
    { event_type: "whatsapp_click", current_count: 52, previous_count: 39 },
    { event_type: "call_click", current_count: 21, previous_count: 18 },
  ],
  series: Array.from({ length: 30 }, (_, i) => {
    const day = new Date(Date.now() - (29 - i) * 86400_000).toISOString().slice(0, 10);
    const base = 22 + Math.round(18 * Math.sin(i / 3.2) + i * 0.9);
    return { day, views: base + 12, calls: Math.max(0, Math.round(base / 9)), whatsapp: Math.max(1, Math.round(base / 5)) };
  }),
  sources: [
    { source: "חיפוש באפליקציה", count: 512 },
    { source: "עמוד קטגוריה", count: 348 },
    { source: "שיתוף בוואטסאפ", count: 231 },
    { source: "עמוד הבית", count: 193 },
  ],
  terms: [
    { query: "מטבחים", count: 143 },
    { query: "ארונות קיר", count: 87 },
    { query: "מטבח בהתאמה אישית", count: 64 },
    { query: "נגרות", count: 41 },
  ],
};

/* ------------------------------- resident project ---------------------------- */

const SHOWCASE_PROJECT_INFO = {
  name: "שיפוץ דירת 4 חדרים",
  subtitle: "רמת גן · מגדלי הפארק",
  manager: "נועה ברק",
  targetDate: new Date(Date.now() + 120 * 86400_000).toISOString().slice(0, 10),
  groupSavings: 18400,
  projectType: "renovation",
  city: "רמת גן",
  address: "הרצל 24",
  area: 95,
  standard: "standard",
};

const SHOWCASE_BUDGET = {
  "sc-kitchen": 34400,
  "sc-floor": 21000,
  "sc-paint": 5600,
  "sc-climate": 9300,
  "sc-elec": 12500,
};

/** Seed the local (device-only) project data used by the project screen. */
export function seedShowcaseProject() {
  try {
    localStorage.setItem(PROJECT_INFO_KEY, JSON.stringify(SHOWCASE_PROJECT_INFO));
    localStorage.setItem(BUDGET_KEY, JSON.stringify(SHOWCASE_BUDGET));
    localStorage.setItem(BUDGET_TOTAL_KEY, JSON.stringify(320000));
  } catch {
    /* ignore */
  }
}
