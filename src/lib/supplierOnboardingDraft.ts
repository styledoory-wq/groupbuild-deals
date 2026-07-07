/**
 * Local, per-user draft persistence for the supplier onboarding flow.
 * Survives refresh, network errors, and accidental navigation. Cleared
 * only after the profile is successfully completed.
 */

const KEY_PREFIX = "gb_supplier_onboarding_draft_v1";

export type SupplierOnboardingStep =
  | "business"
  | "contact"
  | "category"
  | "area"
  | "description"
  | "logo";

export type SupplierOnboardingDraft = {
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  selectedCategories: string[];
  areas: {
    servesAllCountry: boolean;
    regionIds: string[];
    cityIds: string[];
  };
  shortDescription: string;
  logoUrl: string | null;
  openStep: SupplierOnboardingStep;
  savedAt: number;
};

function keyFor(userId: string) {
  return `${KEY_PREFIX}:${userId}`;
}

export function loadSupplierDraft(userId: string): SupplierOnboardingDraft | null {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SupplierOnboardingDraft>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      businessName: parsed.businessName ?? "",
      contactName: parsed.contactName ?? "",
      phone: parsed.phone ?? "",
      email: parsed.email ?? "",
      selectedCategories: Array.isArray(parsed.selectedCategories) ? parsed.selectedCategories : [],
      areas: {
        servesAllCountry: !!parsed.areas?.servesAllCountry,
        regionIds: Array.isArray(parsed.areas?.regionIds) ? parsed.areas!.regionIds : [],
        cityIds: Array.isArray(parsed.areas?.cityIds) ? parsed.areas!.cityIds : [],
      },
      shortDescription: parsed.shortDescription ?? "",
      logoUrl: parsed.logoUrl ?? null,
      openStep: (parsed.openStep as SupplierOnboardingStep) ?? "business",
      savedAt: parsed.savedAt ?? Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveSupplierDraft(userId: string, draft: Omit<SupplierOnboardingDraft, "savedAt">) {
  try {
    const payload: SupplierOnboardingDraft = { ...draft, savedAt: Date.now() };
    localStorage.setItem(keyFor(userId), JSON.stringify(payload));
  } catch {
    /* localStorage quota / private mode — silent fallback */
  }
}

export function clearSupplierDraft(userId: string) {
  try {
    localStorage.removeItem(keyFor(userId));
  } catch {
    /* ignore */
  }
}

/** True when the draft holds anything worth restoring. */
export function draftHasContent(d: SupplierOnboardingDraft | null): boolean {
  if (!d) return false;
  return !!(
    d.businessName?.trim() ||
    d.contactName?.trim() ||
    d.phone?.trim() ||
    d.selectedCategories.length ||
    d.areas.servesAllCountry ||
    d.areas.regionIds.length ||
    d.areas.cityIds.length ||
    d.shortDescription?.trim() ||
    d.logoUrl
  );
}
