import { supabase } from "@/integrations/supabase/client";

/**
 * Supplier agreement version. Bumped when the supplier terms text changes.
 * NOTE: bumping this alone does NOT block anyone — blocking happens only when
 * an admin flags a supplier with `requires_reacceptance = true`.
 */
export const SUPPLIER_TERMS_VERSION = "v4";

export type SupplierTermsStatus = {
  acceptedVersion: string | null;
  acceptedAt: string | null;
  requiresReacceptance: boolean;
  /** true when the supplier must accept before creating NEW activity. */
  blocksNewActivity: boolean;
};

/** Reads the terms state for the signed-in supplier. Fail-open for reads (never blocks existing work). */
export async function loadSupplierTermsStatus(userId: string): Promise<SupplierTermsStatus> {
  const fallback: SupplierTermsStatus = {
    acceptedVersion: null,
    acceptedAt: null,
    requiresReacceptance: false,
    blocksNewActivity: false,
  };
  try {
    const { data, error } = await supabase
      .from("suppliers")
      .select("accepted_terms_version, accepted_terms_at, requires_reacceptance")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return fallback;
    const requires = !!data.requires_reacceptance;
    return {
      acceptedVersion: data.accepted_terms_version ?? null,
      acceptedAt: data.accepted_terms_at ?? null,
      requiresReacceptance: requires,
      blocksNewActivity: requires,
    };
  } catch {
    return fallback;
  }
}

/** Records acceptance of the current supplier agreement version, with lightweight consent metadata. */
export async function acceptSupplierTerms(): Promise<void> {
  const metadata = {
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    accepted_from: typeof window !== "undefined" ? window.location.pathname : null,
    accepted_at_client: new Date().toISOString(),
  };
  const { error } = await supabase.rpc("accept_supplier_terms" as never, {
    _version: SUPPLIER_TERMS_VERSION,
    _metadata: metadata,
  } as never);
  if (error) throw error;
}
