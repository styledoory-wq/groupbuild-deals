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

/**
 * Server-verified admin check.
 * Returns true only if there is an authenticated Supabase session
 * AND the session's email matches the admin email.
 */
export async function verifyAdminFromSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  const email = data.session?.user?.email;
  return isAdminEmail(email);
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
