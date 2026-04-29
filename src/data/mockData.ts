import type {
  Category, Deal, Deposit, Project, Review, Supplier, User, AppNotification,
} from "@/types";

export const categories: Category[] = [
  // 1. תכנון ועיצוב
  { id: "architect", name: "אדריכל", icon: "📐" },
  { id: "interior-designer", name: "מעצב פנים", icon: "🎨" },
  { id: "consultant", name: "יועצים (קרקע/אקוסטיקה)", icon: "📋" },

  // 2. שלד ובנייה
  { id: "contractor", name: "קבלן ראשי", icon: "👷" },
  { id: "skeleton", name: "קבלן שלד", icon: "🏗️" },
  { id: "gypsum", name: "גבס ובנייה קלה", icon: "🧱" },

  // 3. מערכות
  { id: "electric", name: "חשמל ושדרוגים", icon: "⚡" },
  { id: "plumbing", name: "אינסטלציה", icon: "🔧" },
  { id: "ac", name: "מיזוג אוויר", icon: "❄️" },
  { id: "smart-home", name: "בית חכם", icon: "📱" },

  // 4. פתחים ובידוד
  { id: "windows", name: "חלונות ותריסים", icon: "🪟" },
  { id: "doors", name: "דלתות פנים", icon: "🚪" },
  { id: "security-door", name: "דלתות כניסה / פלדה", icon: "🛡️" },

  // 5. ריצוף וחיפויים
  { id: "flooring", name: "פרקט / ריצוף", icon: "🪵" },
  { id: "cladding", name: "חיפויי קיר", icon: "🪨" },
  { id: "painting", name: "צבע וטיח", icon: "🎨" },

  // 6. מטבח ואמבט
  { id: "kitchen", name: "מטבחים", icon: "🍳" },
  { id: "bath", name: "ארונות אמבט", icon: "🛁" },
  { id: "showers", name: "מקלחונים", icon: "🚿" },
  { id: "sanitary", name: "כלים סניטריים", icon: "🚽" },

  // 7. נגרות וגימורים
  { id: "carpentry", name: "נגרות מותאמת", icon: "🪚" },
  { id: "closets", name: "ארונות קיר", icon: "🚪" },
  { id: "lighting", name: "תאורה", icon: "💡" },

  // 8. חוץ ופיתוח
  { id: "garden", name: "גינון ופיתוח חוץ", icon: "🌿" },
  { id: "pergola", name: "פרגולות וצל", icon: "⛱️" },
  { id: "cleaning", name: "ניקיון לאחר בנייה", icon: "🧹" },
];

export const projects: Project[] = [];

export const suppliers: Supplier[] = [];

export const deals: Deal[] = [];

export const reviews: Review[] = [];

export const deposits: Deposit[] = [];

export const notifications: AppNotification[] = [];

export const demoUsers: Record<string, User> = {
  resident: { id: "u_demo_resident", role: "resident", name: "נועה כהן", phone: "050-1234567", email: "noa@demo.co", projectId: "p1", apartment: "ב/14" },
  supplier: { id: "u_demo_supplier", role: "supplier", name: "אבי לוי", phone: "052-7654321", email: "avi@royal.co", projectId: undefined },
  admin:    { id: "u_demo_admin", role: "admin", name: "מנהל מערכת", phone: "054-0000000", email: "admin@groupbuild.co" },
};
