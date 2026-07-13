import { supabase } from "@/integrations/supabase/client";

export type SupplierAccount = {
  id: string;
  business_name?: string | null;
  contact_name?: string | null;
  phone?: string | null;
  approval_status?: string | null;
  is_active?: boolean | null;
  user_id?: string | null;
  email?: string | null;
  description?: string | null;
  categories?: string[] | null;
  short_description?: string | null;
  logo_url?: string | null;
  website_url?: string | null;
  whatsapp_url?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  catalog_url?: string | null;
  serves_all_country?: boolean | null;
};

const DEFAULT_SUPPLIER_SELECT = "id,business_name,approval_status,is_active,user_id,email,categories";

async function claimSupplierByEmail(): Promise<string | null> {
  // IMPORTANT: call supabase.rpc directly (do NOT destructure / reassign),
  // otherwise `this` is lost inside supabase-js and you get
  // "undefined is not an object (evaluating 'this.rest')".
  const { data, error } = await supabase.rpc("claim_supplier_profile_by_email");
  if (error) {
    console.warn("[supplierAuth] supplier claim skipped", error);
    return null;
  }
  return typeof data === "string" ? data : null;
}

export async function resolveSupplierForUser<T extends SupplierAccount = SupplierAccount>(
  userId: string,
  email?: string | null,
  select = DEFAULT_SUPPLIER_SELECT,
): Promise<T | null> {
  const byUser = await supabase
    .from("suppliers")
    .select(select)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (byUser.error) throw byUser.error;
  if (byUser.data) return byUser.data as unknown as T;

  const claimedId = await claimSupplierByEmail();
  if (claimedId) {
    const byClaim = await supabase
      .from("suppliers")
      .select(select)
      .eq("id", claimedId)
      .maybeSingle();
    if (byClaim.error) throw byClaim.error;
    if (byClaim.data) return byClaim.data as unknown as T;
  }

  if (email) {
    const byEmail = await supabase
      .from("suppliers")
      .select(select)
      .ilike("email", email)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (byEmail.error) throw byEmail.error;
    if (byEmail.data) return byEmail.data as unknown as T;
  }

  return null;
}

export async function getCurrentSupplier<T extends SupplierAccount = SupplierAccount>(select = DEFAULT_SUPPLIER_SELECT) {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) return { session: null, supplier: null as T | null };

  const supplier = await resolveSupplierForUser<T>(session.user.id, session.user.email, select);
  return { session, supplier };
}