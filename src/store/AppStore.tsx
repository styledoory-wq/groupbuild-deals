import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AppNotification, Category, Project, Role, User } from "@/types";
import { demoUsers } from "@/data/mockData";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/safeAsync";
import { isAdminEmail, setAdminSession } from "@/lib/auth";

const CACHE_TTL = 5 * 60_000;
let projectsCache: { data: Project[]; at: number } | null = null;
let categoriesCache: { data: Category[]; at: number } | null = null;
let projectsInflight: Promise<Project[]> | null = null;
let categoriesInflight: Promise<Category[]> | null = null;
let notificationsCache: Record<string, { data: AppNotification[]; at: number }> = {};

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

const loadProjectsOnce = async () => {
  if (projectsCache && Date.now() - projectsCache.at < CACHE_TTL) return projectsCache.data;
  if (projectsInflight) return projectsInflight;
  projectsInflight = (async () => {
    const { data, error } = await withTimeout(supabase
      .from("projects")
      .select("id,name,city,building_count,apartment_count,status")
      .eq("is_active", true)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false }), "טעינת פרויקטים");
    if (error) throw error;
    const mapped = (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      city: p.city,
      buildingCount: p.building_count ?? 0,
      apartmentCount: p.apartment_count ?? 0,
      status: (p.status as Project["status"]) ?? "planning",
    }));
    projectsCache = { data: mapped, at: Date.now() };
    projectsInflight = null;
    return mapped;
  })().catch((err) => { projectsInflight = null; throw err; });
  return projectsInflight;
};

const loadCategoriesOnce = async () => {
  if (categoriesCache && Date.now() - categoriesCache.at < CACHE_TTL) return categoriesCache.data;
  if (categoriesInflight) return categoriesInflight;
  categoriesInflight = (async () => {
    const { data, error } = await withTimeout(supabase
      .from("categories")
      .select("id,name,icon")
      .eq("is_active", true)
      .eq("is_deleted", false)
      .order("display_order", { ascending: true }), "טעינת תחומים");
    if (error) throw error;
    const mapped = ((data ?? []) as DbCategoryRow[]).map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon ?? "📦",
    }));
    categoriesCache = { data: mapped, at: Date.now() };
    categoriesInflight = null;
    return mapped;
  })().catch((err) => { categoriesInflight = null; throw err; });
  return categoriesInflight;
};

export function AppProvider({ children }: { children: ReactNode }) {
  const hydratingUserRef = useRef<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [projects, setProjects] = useState<Project[]>(() => projectsCache?.data ?? []);
  const [categories, setCategories] = useState<Category[]>(() => categoriesCache?.data ?? []);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const loginDemo = (role: "resident" | "supplier" | "admin") => {
    const u = demoUsers[role];
    setUser(u);
    return u;
  };

  const logout = async () => {
    try { await supabase.auth.signOut(); } catch (e) { console.warn("[AppStore] signOut", e); }
    setAdminSession(false);
    hydratingUserRef.current = null;
    setUser(null);
    setNotifications([]);
  };

  // Hydrate user from existing Supabase session (with timeout + safe fallback)
  useEffect(() => {
    let cancelled = false;

    const hydrate = async (uid: string, email: string) => {
      if (hydratingUserRef.current === uid) return;
      hydratingUserRef.current = uid;
      try {
        const [profileRes, rolesRes, supplierRes] = await Promise.all([
          withTimeout(supabase.from("profiles").select("id,full_name,business_name,phone,email,project_id,user_type").eq("id", uid).maybeSingle(), "טעינת פרופיל", 8000),
          withTimeout(supabase.from("user_roles").select("role").eq("user_id", uid), "טעינת הרשאות", 8000),
          withTimeout(supabase.from("suppliers").select("id").eq("user_id", uid).maybeSingle(), "טעינת ספק", 8000),
        ]);

        const profile = profileRes.data as { full_name?: string | null; business_name?: string | null; phone?: string | null; email?: string | null; project_id?: string | null; user_type?: string | null } | null;
        const roles = (rolesRes.data ?? []) as { role: string }[];
        const supplierRow = supplierRes.data as { id?: string } | null;

        let resolvedRole: Role = "resident";
        if (isAdminEmail(email)) resolvedRole = "admin";
        else if (roles.some((r) => r.role === "supplier")) resolvedRole = "supplier";
        else if (profile?.user_type === "supplier") resolvedRole = "supplier";
        else if (supplierRow?.id) resolvedRole = "supplier";

        if (cancelled) return;
        setUser({
          id: uid,
          role: resolvedRole,
          name: profile?.full_name ?? profile?.business_name ?? email,
          phone: profile?.phone ?? "",
          email: profile?.email ?? email,
          projectId: profile?.project_id ?? undefined,
        });
        if (resolvedRole === "admin") setAdminSession(true);
      } catch (err) {
        console.error("[AppStore] hydrate failed", err);
        if (cancelled) return;
        // Fallback: set a minimal user so UI isn't stuck and logout button works
        setUser({
          id: uid,
          role: isAdminEmail(email) ? "admin" : "resident",
          name: email,
          phone: "",
          email,
        });
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    };

    void (async () => {
      try {
        const { data } = await withTimeout(supabase.auth.getSession(), "בדיקת התחברות", 6000);
        const session = data.session;
        if (!session) {
          if (!cancelled) { setUser(null); setAuthReady(true); }
          return;
        }
        await hydrate(session.user.id, session.user.email ?? "");
      } catch (err) {
        console.error("[AppStore] session check failed", err);
        if (!cancelled) { setUser(null); setAuthReady(true); }
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        hydratingUserRef.current = null;
        setUser(null);
        setAdminSession(false);
        setAuthReady(true);
        return;
      }
      void hydrate(session.user.id, session.user.email ?? "");
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  // Load projects (active, not deleted) once on mount
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await loadProjectsOnce();
        if (active) setProjects(data);
      } catch (error) {
        console.error("[AppStore] projects load failed", error);
      }
    })();
    return () => { active = false; };
  }, []);

  // Load categories from Supabase
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await loadCategoriesOnce();
        if (active) setCategories(data);
      } catch (error) {
        console.error("[AppStore] categories load failed", error);
      }
    })();
    return () => { active = false; };
  }, []);

  // Load notifications for current authenticated user (and refresh on auth change)
  const refreshNotifications = useCallback(async () => {
    try {
      const uid = user?.id;
      if (!uid) {
        setNotifications([]);
        return;
      }
      const cached = notificationsCache[uid];
      if (cached && Date.now() - cached.at < 45_000) {
        setNotifications(cached.data);
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
      const mapped = ((data ?? []) as DbNotificationRow[]).map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body ?? "",
        type: ((n.type as AppNotification["type"]) ?? "system"),
        unread: !n.is_read,
        createdAt: n.created_at,
      }));
      notificationsCache[uid] = { data: mapped, at: Date.now() };
      setNotifications(mapped);
    } catch (error) {
      console.error("[AppStore] notifications load failed", error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authReady) return;
    void refreshNotifications();
  }, [authReady, refreshNotifications]);

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
    if (notificationsCache[uid]) {
      notificationsCache[uid] = { data: notificationsCache[uid].data.map((n) => ({ ...n, unread: false })), at: Date.now() };
    }
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  const value = useMemo<AppState>(
    () => ({
      user, setUser, loginDemo, logout, authReady,
      projects, setProjects,
      categories, setCategories,
      notifications, unreadCount, refreshNotifications, markNotificationsRead,
    }),
    [user, authReady, projects, categories, notifications, unreadCount]
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
