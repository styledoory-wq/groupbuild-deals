import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppNotification, Category, Project, Role, User } from "@/types";
import { demoUsers } from "@/data/mockData";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/safeAsync";
import { isAdminEmail, setAdminSession } from "@/lib/auth";

interface AppState {
  user: User | null;
  setUser: (u: User | null) => void;
  loginDemo: (role: "resident" | "supplier" | "admin") => User;
  logout: () => Promise<void>;
  authReady: boolean;

  projects: Project[];
  setProjects: (p: Project[]) => void;
  categories: Category[];
  setCategories: (c: Category[]) => void;

  notifications: AppNotification[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationsRead: () => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

type DbCategoryRow = {
  id: string;
  name: string;
  icon: string | null;
};

type DbNotificationRow = {
  id: string;
  title: string;
  body: string | null;
  type: string | null;
  is_read: boolean | null;
  created_at: string;
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const loginDemo = (role: "resident" | "supplier" | "admin") => {
    const u = demoUsers[role];
    setUser(u);
    return u;
  };

  const logout = () => setUser(null);

  // Load projects (active, not deleted) once on mount
  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await withTimeout(supabase
        .from("projects")
        .select("id,name,city,building_count,apartment_count,status")
        .eq("is_active", true)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false }), "טעינת פרויקטים");

      if (!active) return;
      if (error) {
        console.error("[AppStore] projects load failed", error);
        return;
      }

      setProjects((data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        city: p.city,
        buildingCount: p.building_count ?? 0,
        apartmentCount: p.apartment_count ?? 0,
        status: (p.status as Project["status"]) ?? "planning",
      })));
    })();
    return () => { active = false; };
  }, []);

  // Load categories from Supabase
  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await withTimeout(supabase
        .from("categories")
        .select("id,name,icon")
        .eq("is_active", true)
        .eq("is_deleted", false)
        .order("display_order", { ascending: true }), "טעינת תחומים");

      if (!active) return;
      if (error) {
        console.error("[AppStore] categories load failed", error);
        return;
      }
      setCategories(((data ?? []) as DbCategoryRow[]).map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon ?? "📦",
      })));
    })();
    return () => { active = false; };
  }, []);

  // Load notifications for current authenticated user (and refresh on auth change)
  const refreshNotifications = async () => {
    try {
      const { data: sessionData } = await withTimeout(supabase.auth.getSession(), "בדיקת התחברות");
      const uid = sessionData.session?.user?.id;
      if (!uid) {
        setNotifications([]);
        return;
      }
      const { data, error } = await withTimeout(supabase
        .from("notifications")
        .select("id,title,body,type,is_read,created_at")
        .eq("user_id", uid)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(50), "טעינת התראות");
      if (error) {
        console.error("[AppStore] notifications load failed", error);
        return;
      }
      setNotifications(((data ?? []) as DbNotificationRow[]).map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body ?? "",
        type: ((n.type as AppNotification["type"]) ?? "system"),
        unread: !n.is_read,
        createdAt: n.created_at,
      })));
    } catch (error) {
      console.error("[AppStore] notifications load failed", error);
    }
  };

  useEffect(() => {
    void refreshNotifications();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void refreshNotifications();
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const markNotificationsRead = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (!uid) return;
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", uid)
      .eq("is_read", false);
    if (error) {
      console.error("[AppStore] mark read failed", error);
      return;
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  const value = useMemo<AppState>(
    () => ({
      user, setUser, loginDemo, logout,
      projects, setProjects,
      categories, setCategories,
      notifications, unreadCount, refreshNotifications, markNotificationsRead,
    }),
    [user, projects, categories, notifications, unreadCount]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export function formatILS(n: number) {
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);
}
