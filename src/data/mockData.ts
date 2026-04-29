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

export const deals: Deal[] = [];

export const reviews: Review[] = [];

export const deposits: Deposit[] = [];

export const notifications: AppNotification[] = [];

export const demoUsers: Record<string, User> = {
  resident: { id: "u_demo_resident", role: "resident", name: "נועה כהן", phone: "050-1234567", email: "noa@demo.co", projectId: "p1", apartment: "ב/14" },
  supplier: { id: "u_demo_supplier", role: "supplier", name: "אבי לוי", phone: "052-7654321", email: "avi@royal.co", projectId: undefined },
  admin:    { id: "u_demo_admin", role: "admin", name: "מנהל מערכת", phone: "054-0000000", email: "admin@groupbuild.co" },
};
