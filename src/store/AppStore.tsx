import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type {
  AppNotification, Category, Deal, Deposit, Project, Review, Supplier, User,
} from "@/types";
import {
  categories as seedCategories,
  deals as seedDeals,
  deposits as seedDeposits,
  notifications as seedNotifications,
  projects as seedProjects,
  reviews as seedReviews,
  suppliers as seedSuppliers,
  demoUsers,
} from "@/data/mockData";

interface AppState {
  user: User | null;
  setUser: (u: User | null) => void;
  loginDemo: (role: "resident" | "supplier" | "admin") => User;
  logout: () => void;

  projects: Project[];
  setProjects: (p: Project[]) => void;
  categories: Category[];
  setCategories: (c: Category[]) => void;
  suppliers: Supplier[];
  setSuppliers: (s: Supplier[]) => void;
  deals: Deal[];
  setDeals: (d: Deal[]) => void;
  deposits: Deposit[];
  setDeposits: (d: Deposit[]) => void;
  reviews: Review[];
  notifications: AppNotification[];
  markNotificationsRead: () => void;

  joinDeal: (dealId: string) => void;
  payDeposit: (dealId: string) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>(seedProjects);
  const [categories, setCategories] = useState<Category[]>(seedCategories);
  const [suppliers, setSuppliers] = useState<Supplier[]>(seedSuppliers);
  const [deals, setDeals] = useState<Deal[]>(seedDeals);
  const [deposits, setDeposits] = useState<Deposit[]>(seedDeposits);
  const [reviews] = useState<Review[]>(seedReviews);
  const [notifications, setNotifications] = useState<AppNotification[]>(seedNotifications);

  const loginDemo = (role: "resident" | "supplier" | "admin") => {
    const u = demoUsers[role];
    setUser(u);
    return u;
  };

  const logout = () => setUser(null);

  const markNotificationsRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));

  const joinDeal = (dealId: string) => {
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, joinedParticipants: d.joinedParticipants + 1 } : d))
    );
  };

  const payDeposit = (dealId: string) => {
    if (!user) return;
    const deal = deals.find((d) => d.id === dealId);
    if (!deal) return;
    const dep: Deposit = {
      id: `dp_${Date.now()}`,
      userId: user.id,
      dealId,
      amount: deal.depositAmount,
      status: "paid",
      createdAt: new Date().toISOString(),
    };
    setDeposits((prev) => [dep, ...prev]);
    setDeals((prev) =>
      prev.map((d) =>
        d.id === dealId ? { ...d, paidParticipants: d.paidParticipants + 1, joinedParticipants: Math.max(d.joinedParticipants, d.paidParticipants + 1) } : d
      )
    );
  };

  const value = useMemo<AppState>(
    () => ({
      user, setUser, loginDemo, logout,
      projects, setProjects,
      categories, setCategories,
      suppliers, setSuppliers,
      deals, setDeals,
      deposits, setDeposits,
      reviews,
      notifications, markNotificationsRead,
      joinDeal, payDeposit,
    }),
    [user, projects, categories, suppliers, deals, deposits, reviews, notifications]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

// Pricing helpers
export function getActiveTier(deal: Deal) {
  const paid = deal.paidParticipants;
  const sorted = [...deal.tiers].sort((a, b) => a.minParticipants - b.minParticipants);
  let active = sorted[0];
  for (const t of sorted) {
    const inRange = paid >= t.minParticipants && (t.maxParticipants === null || paid <= t.maxParticipants);
    if (inRange) { active = t; break; }
    if (paid >= t.minParticipants) active = t;
  }
  return active;
}

export function getNextTier(deal: Deal) {
  const paid = deal.paidParticipants;
  const sorted = [...deal.tiers].sort((a, b) => a.minParticipants - b.minParticipants);
  return sorted.find((t) => t.minParticipants > paid) || null;
}

export function formatILS(n: number) {
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);
}
