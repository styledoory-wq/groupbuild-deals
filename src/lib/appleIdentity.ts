import { supabase } from "@/integrations/supabase/client";

/**
 * Apple only returns the user's real name on the FIRST authorization.
 * Supabase stores it in user_metadata, so we persist it into profiles
 * the first time we see a session with an empty profile name.
 *
 * Also handles Apple "Hide My Email" relay addresses (…@privaterelay.appleid.com):
 * those are perfectly valid login emails, we simply never treat them as contact emails.
 */
export function extractFullName(meta: Record<string, unknown> | undefined | null): string {
  if (!meta) return "";
  const direct = meta["full_name"] ?? meta["name"];
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  if (direct && typeof direct === "object") {
    const o = direct as Record<string, unknown>;
    const parts = [o.firstName ?? o.givenName, o.lastName ?? o.familyName]
      .filter((p): p is string => typeof p === "string" && !!p.trim());
    if (parts.length) return parts.join(" ").trim();
  }
  const given = meta["given_name"];
  const family = meta["family_name"];
  const combo = [given, family].filter((p): p is string => typeof p === "string" && !!p.trim());
  return combo.join(" ").trim();
}

export function isPrivateRelayEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith("@privaterelay.appleid.com");
}

/** Fill profiles.full_name from OAuth metadata when it is still empty. Best-effort, never throws. */
export async function backfillOAuthProfileName(userId: string): Promise<void> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const meta = userRes?.user?.user_metadata as Record<string, unknown> | undefined;
    const name = extractFullName(meta);
    if (!name) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) return;
    if (profile.full_name && profile.full_name.trim()) return;
    await supabase.from("profiles").update({ full_name: name }).eq("id", userId);
  } catch {
    /* best-effort only */
  }
}
