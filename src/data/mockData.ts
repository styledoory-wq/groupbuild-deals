import type {
  Category, Deal, Deposit, Project, Review, Supplier, User, AppNotification,
} from "@/types";

export const categories: Category[] = [
  { id: "kitchen", name: "מטבחים", icon: "🍳" },
  { id: "doors", name: "דלתות פנים", icon: "🚪" },
  { id: "ac", name: "מיזוג אוויר", icon: "❄️" },
  { id: "showers", name: "מקלחונים", icon: "🚿" },
  { id: "cladding", name: "חיפויי קיר", icon: "🧱" },
  { id: "flooring", name: "פרקט / ריצוף", icon: "🪵" },
  { id: "lighting", name: "תאורה", icon: "💡" },
  { id: "gypsum", name: "גבס ובנייה", icon: "🏗️" },
  { id: "windows", name: "חלונות ותריסים", icon: "🪟" },
  { id: "bath", name: "ארונות אמבט", icon: "🛁" },
  { id: "electric", name: "שדרוגי חשמל", icon: "⚡" },
  { id: "carpentry", name: "נגרות מותאמת", icon: "🪚" },
];

export const projects: Project[] = [
  { id: "p1", name: "מגדלי הים — נווה צדק", city: "תל אביב", buildingCount: 3, apartmentCount: 124, status: "construction" },
  { id: "p2", name: "פארק הצפון", city: "רמת גן", buildingCount: 2, apartmentCount: 86, status: "delivery" },
  { id: "p3", name: "גני המושבה", city: "רעננה", buildingCount: 4, apartmentCount: 156, status: "construction" },
  { id: "p4", name: "מצפה היין", city: "זכרון יעקב", buildingCount: 2, apartmentCount: 64, status: "planning" },
  { id: "p5", name: "מרינה הרצליה", city: "הרצליה", buildingCount: 1, apartmentCount: 48, status: "delivery" },
];

export const suppliers: Supplier[] = [];

export const deals: Deal[] = [
  {
    id: "d1",
    title: "שדרוג מטבח פרימיום — Royal Line",
    categoryId: "kitchen",
    projectId: "p1",
    supplierId: "s1",
    description: "שדרוג מטבח כולל חזיתות אקריליות, משטח קוריאן, מגירות בלום ועיצוב אישי לכל דירה. כולל תכנון אדריכלי והתקנה מלאה.",
    originalPrice: 68000,
    tiers: [
      { minParticipants: 1, maxParticipants: 4, price: 62000, label: "מחיר מחירון" },
      { minParticipants: 5, maxParticipants: 9, price: 55000, label: "הנחה ראשונה" },
      { minParticipants: 10, maxParticipants: 19, price: 49000, label: "הנחה שנייה" },
      { minParticipants: 20, maxParticipants: null, price: 42000, label: "המחיר הטוב ביותר" },
    ],
    paidParticipants: 12,
    joinedParticipants: 19,
    status: "active",
    depositAmount: 1500,
    endsAt: "2026-05-30",
    highlights: ["תכנון אישי", "10 שנות אחריות", "התקנה כלולה"],
  },
  {
    id: "d2",
    title: "מערכת מיזוג מרכזית — Inverter",
    categoryId: "ac",
    projectId: "p1",
    supplierId: "s2",
    description: "מערכת VRF איכותית לכל הדירה. כולל תכנון, פריסה, התקנה ובדיקת לחץ. תקופת אחריות מורחבת.",
    originalPrice: 32000,
    tiers: [
      { minParticipants: 1, maxParticipants: 4, price: 29000, label: "מחיר מחירון" },
      { minParticipants: 5, maxParticipants: 9, price: 26500, label: "הנחה ראשונה" },
      { minParticipants: 10, maxParticipants: 19, price: 23900, label: "הנחה שנייה" },
      { minParticipants: 20, maxParticipants: null, price: 21500, label: "המחיר הטוב ביותר" },
    ],
    paidParticipants: 7,
    joinedParticipants: 11,
    status: "active",
    depositAmount: 800,
    endsAt: "2026-05-15",
    highlights: ["VRF Inverter", "5 שנות אחריות", "סינון אוויר"],
  },
  {
    id: "d3",
    title: "פרקט אלון אירופאי 14 מ\"מ",
    categoryId: "flooring",
    projectId: "p1",
    supplierId: "s3",
    description: "פרקט עץ מהונדס אלון אירופאי איכותי. כולל פירוק קרמיקה, יישור משטח והתקנה.",
    originalPrice: 22000,
    tiers: [
      { minParticipants: 1, maxParticipants: 4, price: 20000, label: "מחיר מחירון" },
      { minParticipants: 5, maxParticipants: 9, price: 17500, label: "הנחה ראשונה" },
      { minParticipants: 10, maxParticipants: 19, price: 15800, label: "הנחה שנייה" },
      { minParticipants: 20, maxParticipants: null, price: 13900, label: "המחיר הטוב ביותר" },
    ],
    paidParticipants: 22,
    joinedParticipants: 27,
    status: "closing-soon",
    depositAmount: 600,
    endsAt: "2026-05-05",
    highlights: ["אלון אירופאי", "ציפוי UV", "הובלה חינם"],
  },
  {
    id: "d4",
    title: "סט דלתות פנים מילאנו — 6 דלתות",
    categoryId: "doors",
    projectId: "p1",
    supplierId: "s4",
    description: "סט של 6 דלתות פנים בעיצוב איטלקי, כולל משקופים נסתרים וידיות פרימיום.",
    originalPrice: 14500,
    tiers: [
      { minParticipants: 1, maxParticipants: 4, price: 13000, label: "מחיר מחירון" },
      { minParticipants: 5, maxParticipants: 9, price: 11500, label: "הנחה ראשונה" },
      { minParticipants: 10, maxParticipants: 19, price: 9900, label: "הנחה שנייה" },
      { minParticipants: 20, maxParticipants: null, price: 8500, label: "המחיר הטוב ביותר" },
    ],
    paidParticipants: 4,
    joinedParticipants: 6,
    status: "active",
    depositAmount: 400,
    endsAt: "2026-06-10",
    highlights: ["משקוף נסתר", "6 דלתות", "התקנה כלולה"],
  },
  {
    id: "d5",
    title: "תאורה אדריכלית מלאה לדירה",
    categoryId: "lighting",
    projectId: "p1",
    supplierId: "s5",
    description: "תכנון תאורה מקצועי, גופי תאורה שקועים, פסי LED ובקרת תאורה חכמה.",
    originalPrice: 11000,
    tiers: [
      { minParticipants: 1, maxParticipants: 4, price: 9800, label: "מחיר מחירון" },
      { minParticipants: 5, maxParticipants: 9, price: 8500, label: "הנחה ראשונה" },
      { minParticipants: 10, maxParticipants: 19, price: 7400, label: "הנחה שנייה" },
      { minParticipants: 20, maxParticipants: null, price: 6300, label: "המחיר הטוב ביותר" },
    ],
    paidParticipants: 9,
    joinedParticipants: 14,
    status: "active",
    depositAmount: 350,
    endsAt: "2026-05-22",
    highlights: ["תכנון אישי", "LED פרימיום", "בקרה חכמה"],
  },
  {
    id: "d6",
    title: "מקלחון זכוכית פרימיום",
    categoryId: "showers",
    projectId: "p1",
    supplierId: "s6",
    description: "מקלחון זכוכית מחוסמת 8 מ\"מ, פרופילים שחורים מט, התקנה מלאה.",
    originalPrice: 4800,
    tiers: [
      { minParticipants: 1, maxParticipants: 4, price: 4300, label: "מחיר מחירון" },
      { minParticipants: 5, maxParticipants: 9, price: 3700, label: "הנחה ראשונה" },
      { minParticipants: 10, maxParticipants: 19, price: 3200, label: "הנחה שנייה" },
      { minParticipants: 20, maxParticipants: null, price: 2790, label: "המחיר הטוב ביותר" },
    ],
    paidParticipants: 3,
    joinedParticipants: 5,
    status: "active",
    depositAmount: 200,
    endsAt: "2026-06-20",
    highlights: ["זכוכית 8 מ\"מ", "פרופיל שחור", "אחריות 3 שנים"],
  },
];

export const reviews: Review[] = [
  { id: "r1", supplierId: "s1", userId: "u1", userName: "מיכל א.", rating: 5, text: "שירות יוצא מן הכלל, מטבח מהחלומות. ממליצה בחום!", createdAt: "2026-03-01" },
  { id: "r2", supplierId: "s1", userId: "u2", userName: "רן ל.", rating: 5, text: "תכנון מדויק והתקנה ללא דופי.", createdAt: "2026-02-12" },
  { id: "r3", supplierId: "s2", userId: "u3", userName: "ענת ב.", rating: 4, text: "מקצועיים מאוד, לוחות הזמנים נשמרו.", createdAt: "2026-01-20" },
];

export const deposits: Deposit[] = [
  { id: "dp1", userId: "u_demo_resident", dealId: "d1", amount: 1500, status: "paid", createdAt: "2026-04-10" },
  { id: "dp2", userId: "u_demo_resident", dealId: "d3", amount: 600, status: "paid", createdAt: "2026-04-15" },
];

export const notifications: AppNotification[] = [
  { id: "n1", title: "הגעתם לדרגת מחיר חדשה!", body: "עסקת המטבחים עברה ל-10 משתתפים — חסכתם עוד 6,000 ₪.", createdAt: "2026-04-20", unread: true, type: "deal" },
  { id: "n2", title: "פיקדון אושר", body: "הפיקדון עבור פרקט אלון התקבל בהצלחה.", createdAt: "2026-04-15", unread: true, type: "deposit" },
  { id: "n3", title: "עסקה חדשה בקטגוריית תאורה", body: "ספק חדש פרסם הצעה בפרויקט שלכם.", createdAt: "2026-04-12", unread: false, type: "system" },
];

export const demoUsers: Record<string, User> = {
  resident: { id: "u_demo_resident", role: "resident", name: "נועה כהן", phone: "050-1234567", email: "noa@demo.co", projectId: "p1", apartment: "ב/14" },
  supplier: { id: "u_demo_supplier", role: "supplier", name: "אבי לוי", phone: "052-7654321", email: "avi@royal.co", projectId: undefined },
  admin:    { id: "u_demo_admin", role: "admin", name: "מנהל מערכת", phone: "054-0000000", email: "admin@groupbuild.co" },
};
