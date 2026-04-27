// Centralized auth/role logic.
// In demo: identifies admins by phone/email allowlist.
// Later: replace `isAdminIdentifier` and `resolveRoleForIdentifier`
// with a server-side check (Supabase: query user_roles table via has_role()).

const ADMIN_PHONES = ["0526247941", "052-624-7941", "+972526247941"];
const ADMIN_EMAILS = ["styledoor.y@gmail.com"];

function normalizePhone(p: string): string {
  return (p || "").replace(/[\s\-()+]/g, "").replace(/^972/, "0");
}

function normalizeEmail(e: string): string {
  return (e || "").trim().toLowerCase();
}

export function isAdminIdentifier(identifier: string): boolean {
  if (!identifier) return false;
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) {
    return ADMIN_EMAILS.map(normalizeEmail).includes(normalizeEmail(trimmed));
  }
  const phone = normalizePhone(trimmed);
  return ADMIN_PHONES.map(normalizePhone).includes(phone);
}

export type ResolvedRole = "resident" | "supplier" | "admin";

/**
 * Resolve a role given the chosen role and the identifier (phone/email).
 * Admin is granted ONLY by identifier match — not by user selection.
 */
export function resolveRoleForIdentifier(
  chosenRole: "resident" | "supplier",
  identifier: string
): ResolvedRole {
  if (isAdminIdentifier(identifier)) return "admin";
  return chosenRole;
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
