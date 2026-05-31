// Centralized auth/role logic.
// Admin access is restricted to a single hardcoded email,
// verified against the authenticated Supabase session.

import { supabase } from "@/integrations/supabase/client";

export const ADMIN_EMAIL = "styledoor.y@gmail.com";

function normalizeEmail(e: string): string {
  return (e || "").trim().toLowerCase();
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return normalizeEmail(email) === normalizeEmail(ADMIN_EMAIL);
}

export async function hasAdminRole(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) {
    console.warn("[auth] admin role check failed", error);
    return false;
  }
  return !!data;
}

/**
 * Server-verified admin check.
 * Returns true only if there is an authenticated Supabase session
 * and the user has the admin role. The hardcoded admin email remains as
 * a bootstrap fallback for the original owner account.
 */
export async function verifyAdminFromSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return false;
  return (await hasAdminRole(user.id)) || isAdminEmail(user.email);
}

const ADMIN_SESSION_KEY = "gb_admin_session";

export function setAdminSession(active: boolean) {
  try {
    if (active) sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
    else sessionStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function hasAdminSession(): boolean {
  try {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

// Legacy helpers kept for backward compatibility with existing imports.
export function isAdminIdentifier(identifier: string): boolean {
  return isAdminEmail(identifier);
}

export type ResolvedRole = "resident" | "supplier" | "admin";

export function resolveRoleForIdentifier(
  chosenRole: "resident" | "supplier",
  identifier: string
): ResolvedRole {
  if (isAdminEmail(identifier)) return "admin";
  return chosenRole;
}
