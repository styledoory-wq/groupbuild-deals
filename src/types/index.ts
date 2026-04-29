export type Role = "resident" | "supplier" | "admin";

export type ProjectStatus = "planning" | "construction" | "delivery" | "completed";

export interface Project {
  id: string;
  name: string;
  city: string;
  buildingCount: number;
  apartmentCount: number;
  status: ProjectStatus;
  image?: string;
}

export interface User {
  id: string;
  role: Role;
  name: string;
  phone: string;
  email: string;
  projectId?: string;
  apartment?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string; // emoji fallback
}

export interface Supplier {
  id: string;
  businessName: string;
  ownerName: string;
  categoryIds: string[];
  serviceArea: string;
  verified: boolean;
  featured?: boolean;
  rating: number;
  reviewsCount: number;
  commissionPercent: number;
  approvalStatus: "approved" | "pending" | "rejected";
  logoEmoji: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  whatsappUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  catalogUrl?: string | null;
}

export interface PricingTier {
  minParticipants: number;
  maxParticipants: number | null; // null = +
  price: number;
  label: string;
}

export type DealStatus = "active" | "closing-soon" | "closed" | "draft";

export interface Deal {
  id: string;
  title: string;
  categoryId: string;
  projectId: string;
  supplierId: string;
  description: string;
  originalPrice: number;
  tiers: PricingTier[];
  paidParticipants: number;
  joinedParticipants: number;
  status: DealStatus;
  depositAmount: number;
  endsAt: string; // ISO
  highlights: string[];
}

export interface Deposit {
  id: string;
  userId: string;
  dealId: string;
  amount: number;
  status: "pending" | "paid" | "refunded";
  createdAt: string;
}

export interface Review {
  id: string;
  supplierId: string;
  userId: string;
  userName: string;
  rating: number;
  text: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  unread: boolean;
  type: "deal" | "deposit" | "system";
}
