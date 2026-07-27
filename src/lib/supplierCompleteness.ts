import { supabase } from "@/integrations/supabase/client";

/**
 * Minimum fields required for a supplier to be considered "complete"
 * and therefore eligible to publish offers, receive leads, and appear
 * to residents.
 */
export type CompletenessStep = {
  key:
    | "business_name"
    | "contact_name"
    | "phone"
    | "email"
    | "category"
    | "area"
    | "description"
    | "logo";
  label: string;
  done: boolean;
};

export type SupplierCompleteness = {
  percent: number;
  complete: boolean;
  missing: string[];
  steps: CompletenessStep[];
};

export type SupplierCompletenessInput = {
  business_name?: string | null;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  categories?: string[] | null;
  serves_all_country?: boolean | null;
  regionsCount: number;
  citiesCount: number;
  short_description?: string | null;
  description?: string | null;
  logo_url?: string | null;
};

export function computeCompleteness(
  s: SupplierCompletenessInput,
): SupplierCompleteness {
  const steps: CompletenessStep[] = [
    {
      key: "business_name",
      label: "שם עסק",
      done: !!s.business_name && s.business_name.trim().length >= 2,
    },
    {
      key: "contact_name",
      label: "איש קשר",
      done: !!s.contact_name && s.contact_name.trim().length >= 2,
    },
    {
      key: "phone",
      label: "טלפון",
      done: !!s.phone && s.phone.replace(/\D/g, "").length >= 9,
    },
    {
      key: "email",
      label: "אימייל",
      done: !!s.email && /.+@.+\..+/.test(s.email),
    },
    {
      key: "category",
      label: "תחום פעילות",
      done: Array.isArray(s.categories) && s.categories.length > 0,
    },
    {
      key: "area",
      label: "אזור/עיר שירות",
      done: !!s.serves_all_country || s.regionsCount > 0 || s.citiesCount > 0,
    },
    {
      key: "description",
      label: "תיאור עסק",
      done:
        (!!s.short_description && s.short_description.trim().length >= 10) ||
        (!!s.description && s.description.trim().length >= 10),
    },
    {
      key: "logo",
      label: "לוגו",
      done: !!s.logo_url && s.logo_url.trim().length > 0,
    },
  ];
  const done = steps.filter((s) => s.done).length;
  const percent = Math.round((done / steps.length) * 100);
  const missing = steps.filter((s) => !s.done).map((s) => s.label);
  return { percent, complete: missing.length === 0, missing, steps };
}

/** Fetch the current authenticated supplier + regions/cities counts and compute completeness. */
export async function loadSupplierCompletenessForUser(
  userId: string,
): Promise<{ supplierId: string | null; completeness: SupplierCompleteness }> {
  const { data: supplier } = await supabase
    .from("suppliers")
    .select("id,business_name,contact_name,phone,email,categories,serves_all_country,short_description,description,logo_url")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!supplier) {
    return {
      supplierId: null,
      completeness: computeCompleteness({
        regionsCount: 0,
        citiesCount: 0,
      }),
    };
  }

  const [{ count: regionsCount }, { count: citiesCount }] = await Promise.all([
    supabase
      .from("supplier_regions")
      .select("region_id", { count: "exact", head: true })
      .eq("supplier_id", supplier.id),
    supabase
      .from("supplier_cities")
      .select("city_id", { count: "exact", head: true })
      .eq("supplier_id", supplier.id),
  ]);

  return {
    supplierId: supplier.id,
    completeness: computeCompleteness({
      business_name: supplier.business_name,
      contact_name: supplier.contact_name,
      phone: supplier.phone,
      email: supplier.email,
      categories: supplier.categories,
      serves_all_country: supplier.serves_all_country,
      regionsCount: regionsCount ?? 0,
      citiesCount: citiesCount ?? 0,
      short_description: supplier.short_description,
      description: supplier.description,
      logo_url: supplier.logo_url,
    }),
  };
}

/** Fetch completeness for a specific supplier id (admin use). */
export async function loadSupplierCompletenessById(
  supplierId: string,
): Promise<SupplierCompleteness> {
  const [{ data: s }, { count: regionsCount }, { count: citiesCount }] = await Promise.all([
    supabase
      .from("suppliers")
      .select("business_name,contact_name,phone,email,categories,serves_all_country,short_description,description,logo_url")
      .eq("id", supplierId)
      .maybeSingle(),
    supabase
      .from("supplier_regions")
      .select("region_id", { count: "exact", head: true })
      .eq("supplier_id", supplierId),
    supabase
      .from("supplier_cities")
      .select("city_id", { count: "exact", head: true })
      .eq("supplier_id", supplierId),
  ]);
  return computeCompleteness({
    business_name: s?.business_name,
    contact_name: s?.contact_name,
    phone: s?.phone,
    email: s?.email,
    categories: s?.categories,
    serves_all_country: s?.serves_all_country,
    regionsCount: regionsCount ?? 0,
    citiesCount: citiesCount ?? 0,
    short_description: s?.short_description,
    description: s?.description,
    logo_url: s?.logo_url,
  });
}
