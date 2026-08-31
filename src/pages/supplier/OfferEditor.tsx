import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { verifyAdminFromSession } from "@/lib/auth";
import {
  Save, Plus, Trash2, Loader2, ChevronRight, ChevronLeft,
  Pencil, FileText, Settings2,
} from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { LoadingState, ErrorState, EmptyState } from "@/components/ds";
import { BackHeader } from "@/components/ds";
import { BottomNav } from "@/components/layout/BottomNav";
import { CategorySinglePicker } from "@/components/categories/CategorySinglePicker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { OfferTier, OfferType } from "@/lib/offerPricing";
import { DealImagesEditor } from "@/components/deals/DealImagesEditor";
import { AreasCombobox, type AreasComboboxValue } from "@/components/areas/AreasCombobox";
import { useRegions } from "@/hooks/useRegions";
import { AiOfferGeneratorCard, type AiOfferDraft } from "@/components/supplier/AiOfferGeneratorCard";
import { loadSupplierCompletenessForUser, type SupplierCompleteness } from "@/lib/supplierCompleteness";
import { loadSupplierTermsStatus } from "@/lib/supplierTerms";
import { SupplierTermsReacceptDialog } from "@/components/terms/SupplierTermsReacceptDialog";

type SupplierLite = {
  id: string;
  business_name: string;
  approval_status: string;
  categories: string[] | null;
  email: string | null;
  user_id: string | null;
};

type ClaimSupplierRpc = {
  rpc: (
    fn: "claim_supplier_profile_by_email",
    args: { _supplier_id: string },
  ) => Promise<{ error: unknown }>;
};

type DepositLimits = { min: number | null; max: number | null };

type TierRow = {
  minParticipants: string;
  maxParticipants: string;
  discount_percentage: string;
  original_price: string;
  discounted_price: string;
  label: string;
};

const emptyTier = (overrides: Partial<TierRow> = {}): TierRow => ({
  minParticipants: "",
  maxParticipants: "",
  discount_percentage: "",
  original_price: "",
  discounted_price: "",
  label: "",
  ...overrides,
});

const DEPOSIT_AMOUNT_RE = /^\d+(\.\d{1,2})?$/;
const URL_RE = /^https?:\/\/.+/i;

// Start with ONE empty tier — supplier fills numbers themselves.
const initialTiers = (): TierRow[] => [emptyTier({ minParticipants: "" })];

// Optional template loaded only when the supplier clicks "recommended tiers".
const recommendedPercentageTiers = (): TierRow[] => [
  emptyTier({ minParticipants: "2", maxParticipants: "4", discount_percentage: "5", label: "מדרגה ראשונה" }),
  emptyTier({ minParticipants: "5", maxParticipants: "9", discount_percentage: "10", label: "מדרגה שנייה" }),
  emptyTier({ minParticipants: "10", maxParticipants: "", discount_percentage: "15", label: "המחיר הטוב ביותר" }),
];
const recommendedPriceTiers = (): TierRow[] => [
  emptyTier({ minParticipants: "2", maxParticipants: "4", label: "מדרגה ראשונה" }),
  emptyTier({ minParticipants: "5", maxParticipants: "9", label: "מדרגה שנייה" }),
  emptyTier({ minParticipants: "10", maxParticipants: "", label: "המחיר הטוב ביותר" }),
];

const todayISO = () => {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
};

type StepNum = 1 | 2 | 3;

export default function OfferEditor() {
  const navigate = useNavigate();
  const { dealId } = useParams<{ dealId: string }>();
  const isEditing = !!dealId;
  const [needsTermsAccept, setNeedsTermsAccept] = useState(false);
  const [searchParams] = useSearchParams();
  const adminTargetSupplierId = searchParams.get("supplierId");
  const { categories, projects } = useApp();

  const { regionById, cityById } = useRegions();
  const [visibilityType, setVisibilityType] = useState<"public" | "project_only" | "region_only">("public");
  const [visibilityProjectId, setVisibilityProjectId] = useState<string>("");
  const [visibilityRegions, setVisibilityRegions] = useState<AreasComboboxValue>({
    servesAllCountry: false, regionIds: [], cityIds: [],
  });
  const [workAreas, setWorkAreas] = useState<AreasComboboxValue>({
    servesAllCountry: false, regionIds: [], cityIds: [],
  });

  const [bootLoading, setBootLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [supplier, setSupplier] = useState<SupplierLite | null>(null);
  const [profileBlock, setProfileBlock] = useState<SupplierCompleteness | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [supplierCategoryIds, setSupplierCategoryIds] = useState<string[]>([]);
  const [depositRequired, setDepositRequired] = useState<boolean>(false);
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [supplierPaymentInstructions, setSupplierPaymentInstructions] = useState<string>("");
  const [depositLimits, setDepositLimits] = useState<DepositLimits>({ min: null, max: null });
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [step, setStep] = useState<StepNum>(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [listingType, setListingType] = useState<"group_buy" | "regular">(
    (searchParams.get("type") as "group_buy" | "regular") === "regular" ? "regular" : "group_buy",
  );

  const [offerType, setOfferType] = useState<OfferType>("percentage");
  const [tiers, setTiers] = useState<TierRow[]>(initialTiers());
  const [editingTier, setEditingTier] = useState<number | null>(0);
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  const [targetParticipants, setTargetParticipants] = useState<string>("");
  const [joinDeadline, setJoinDeadline] = useState<string>("");
  const [redemptionDeadline, setRedemptionDeadline] = useState<string>("");
  const [offerTerms, setOfferTerms] = useState<string>("");
  const [restrictions, setRestrictions] = useState<string>("");
  const [maxRedemptions, setMaxRedemptions] = useState<string>("");
  const [appointmentRequired, setAppointmentRequired] = useState<boolean>(false);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [commitmentAccepted, setCommitmentAccepted] = useState<boolean>(false);
  // AI-suggested FAQ — preview only, never persisted (no dedicated column yet).
  const [aiFaqPreview, setAiFaqPreview] = useState<{ q: string; a: string }[]>([]);

  const switchOfferType = (next: OfferType) => {
    if (next === offerType) return;
    setOfferType(next);
    // Don't autofill anything — respect supplier input.
    setTiers((prev) => prev.map((t) => ({
      ...t,
      discount_percentage: next === "percentage" ? t.discount_percentage : "",
      original_price: next === "price_comparison" ? t.original_price : "",
      discounted_price: next === "price_comparison" ? t.discounted_price : "",
    })));
  };

  const loadRecommendedTiers = () => {
    setTiers(offerType === "percentage" ? recommendedPercentageTiers() : recommendedPriceTiers());
    setEditingTier(null);
    toast.success("נטענו מדרגות מומלצות — ערוך לפי הצורך");
  };

  const applyAiDraft = (draft: AiOfferDraft) => {
    // Fill only fields the AI is confident about. Never touch pricing/deposit/dates.
    if (draft.title) setTitle(draft.title);
    if (draft.category_id && categories.find((c) => c.id === draft.category_id)) {
      setCategoryId(draft.category_id);
    }
    const parts: string[] = [];
    if (draft.description) parts.push(draft.description.trim());
    if (draft.what_included?.length) {
      parts.push("מה כלול:\n" + draft.what_included.map((x) => `• ${x}`).join("\n"));
    }
    if (draft.what_not_included?.length) {
      parts.push("מה לא כלול:\n" + draft.what_not_included.map((x) => `• ${x}`).join("\n"));
    }
    if (draft.highlights?.length) {
      parts.push("יתרונות:\n" + draft.highlights.map((x) => `• ${x}`).join("\n"));
    }
    if (parts.length) setDescription(parts.join("\n\n"));

    // FAQ: preview only (no dedicated column yet). Never write to offer_terms.
    setAiFaqPreview(draft.faq?.length ? draft.faq : []);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        if (!session) {
          if (!cancelled) { setBootError("יש להתחבר כספק כדי ליצור הצעה."); setBootLoading(false); }
          return;
        }
        const supplierSelect = "id, business_name, approval_status, categories, email, user_id";
        let s: SupplierLite | null = null;
        // True when an admin manages an offer that belongs to another supplier.
        let adminMode = false;

        // When editing, find which supplier owns the offer.
        let dealSupplierId: string | null = null;
        if (isEditing && dealId) {
          const { data: ownerRow } = await supabase
            .from("deals").select("supplier_id").eq("id", dealId).maybeSingle();
          dealSupplierId = (ownerRow?.supplier_id as string | null) ?? null;
        }

        if (adminTargetSupplierId) {
          const isAdmin = await verifyAdminFromSession();
          if (!isAdmin) {
            if (!cancelled) { setBootError("רק אדמין יכול ליצור הצעה לספק אחר."); setBootLoading(false); }
            return;
          }
          adminMode = true;
          const r = await supabase.from("suppliers")
            .select(supplierSelect)
            .eq("id", adminTargetSupplierId).maybeSingle();
          s = (r.data as SupplierLite | null) ?? null;
        } else {
          const email = session.user.email ?? "";
          const byUser = await supabase.from("suppliers")
            .select(supplierSelect)
            .eq("user_id", session.user.id).maybeSingle();
          s = (byUser.data as SupplierLite | null) ?? null;
          if (!s && email) {
            const byEmail = await supabase.from("suppliers")
              .select(supplierSelect)
              .ilike("email", email).maybeSingle();
            s = (byEmail.data as SupplierLite | null) ?? null;
            if (s && !s.user_id) {
              const { error: claimError } = await (supabase as unknown as ClaimSupplierRpc).rpc("claim_supplier_profile_by_email", { _supplier_id: s.id });
              if (!claimError) s = { ...s, user_id: session.user.id, email: email || s.email };
            }
          }

          // Admin editing an offer of another supplier (e.g. from /admin/offers/:id/edit):
          // load the offer's supplier instead of blocking on the admin's own profile.
          if (dealSupplierId && (!s || s.id !== dealSupplierId)) {
            const isAdmin = await verifyAdminFromSession();
            if (isAdmin) {
              const r = await supabase.from("suppliers")
                .select(supplierSelect)
                .eq("id", dealSupplierId).maybeSingle();
              if (r.data) {
                s = r.data as SupplierLite;
                adminMode = true;
              }
            }
          }
        }

        // Supplier agreement re-acceptance: blocks NEW offers only.
        if (!adminMode && !isEditing) {
          const termsStatus = await loadSupplierTermsStatus(session.user.id);
          if (!cancelled) setNeedsTermsAccept(termsStatus.blocksNewActivity);
        }

        const { data: paymentSettings } = await supabase.from("system_settings")
          .select("deposit_default_amount,deposit_min_amount,deposit_max_amount")
          .limit(1).maybeSingle();


        if (cancelled) return;
        setSupplier(s);

        // Gate publishing: enforce profile completeness for supplier flow (skip for admin acting on behalf).
        if (!adminMode) {
          try {
            const { completeness } = await loadSupplierCompletenessForUser(session.user.id);
            if (!cancelled && !completeness.complete) {
              setProfileBlock(completeness);
              setBootLoading(false);
              return;
            }
          } catch (compErr) {
            console.warn("[offer-editor] completeness check failed", compErr);
          }
        }

        // Do NOT prefill deposit_amount — user asked for empty defaults.
        setDepositLimits({
          min: paymentSettings?.deposit_min_amount == null ? null : Number(paymentSettings.deposit_min_amount),
          max: paymentSettings?.deposit_max_amount == null ? null : Number(paymentSettings.deposit_max_amount),
        });
        if (s?.categories?.length) setSupplierCategoryIds(s.categories);
        if (s?.categories?.length && categories.find((c) => c.id === s!.categories![0])) setCategoryId(s.categories[0]);
        else if (categories.length) setCategoryId(categories[0].id);

        if (dealId) {
          const { data: deal } = await supabase.from("deals").select("*").eq("id", dealId).maybeSingle();
          if (deal && !cancelled) {
            setTitle(deal.title ?? "");
            const legacyDetails = (deal as { product_details?: string | null }).product_details ?? "";
            const desc = deal.description ?? "";
            setDescription([desc, legacyDetails].filter(Boolean).join("\n\n"));
            const lt = ((deal as { listing_type?: string | null }).listing_type ?? "group_buy") as "group_buy" | "regular";
            setListingType(lt);
            if (deal.category_id) setCategoryId(deal.category_id);
            setDepositRequired(!!deal.deposit_required);
            if (deal.deposit_amount != null && Number(deal.deposit_amount) > 0) setDepositAmount(String(deal.deposit_amount));
            if (deal.supplier_payment_instructions) setSupplierPaymentInstructions(String(deal.supplier_payment_instructions));
            const rawType = (deal.offer_type ?? "percentage") as OfferType;
            setOfferType(rawType);
            const rawTiers = (Array.isArray(deal.tiers) ? deal.tiers : []) as OfferTier[];
            if (rawTiers.length) {
              setTiers(rawTiers.map((t) => ({
                minParticipants: String(t.minParticipants ?? ""),
                maxParticipants: t.maxParticipants != null ? String(t.maxParticipants) : "",
                discount_percentage: t.discount_percentage != null ? String(t.discount_percentage) : "",
                original_price: t.original_price != null ? String(t.original_price) : "",
                discounted_price: t.discounted_price != null ? String(t.discounted_price) : "",
                label: t.label ?? "",
              })));
              setEditingTier(null);
              const firstWithPrice = rawTiers.find((t) => t.original_price != null);
              const loadedBase =
                (deal as { base_price?: number | null }).base_price ??
                firstWithPrice?.original_price ??
                (deal.original_price && Number(deal.original_price) > 0 ? deal.original_price : null);
              if (loadedBase != null) setUnitPrice(String(loadedBase));

            }
            setCoverImage(deal.cover_image_url ?? null);
            setGalleryImages((deal.gallery_images as string[] | null) ?? []);
            const dealAny = deal as unknown as {
              visibility_type?: string | null;
              visibility_project_id?: string | null;
              visibility_region_ids?: string[] | null;
              serves_all_country?: boolean | null;
            };
            setVisibilityType(((dealAny.visibility_type as "public" | "project_only" | "region_only") ?? "public"));
            setVisibilityProjectId(dealAny.visibility_project_id ?? "");
            setVisibilityRegions({
              servesAllCountry: false,
              regionIds: Array.isArray(dealAny.visibility_region_ids) ? dealAny.visibility_region_ids : [],
              cityIds: [],
            });
            setTargetParticipants(deal.target_participants != null ? String(deal.target_participants) : "");
            setJoinDeadline(deal.join_deadline ? deal.join_deadline.split("T")[0] : "");
            setRedemptionDeadline(deal.redemption_deadline ? deal.redemption_deadline.split("T")[0] : "");
            setOfferTerms(deal.offer_terms ?? "");
            setRestrictions(deal.restrictions ?? "");
            setMaxRedemptions(deal.max_redemptions != null ? String(deal.max_redemptions) : "");
            setAppointmentRequired(!!deal.appointment_required);
            setServiceAreas(Array.isArray(deal.service_areas) ? (deal.service_areas as string[]) : []);
            const [{ data: dRegs }, { data: dCits }] = await Promise.all([
              supabase.from("deal_regions").select("region_id").eq("deal_id", dealId),
              supabase.from("deal_cities").select("city_id").eq("deal_id", dealId),
            ]);
            setWorkAreas({
              servesAllCountry: !!dealAny.serves_all_country,
              regionIds: (dRegs ?? []).map((r) => (r as { region_id: string }).region_id),
              cityIds: (dCits ?? []).map((c) => (c as { city_id: string }).city_id),
            });
            setCommitmentAccepted(true);
            // If any advanced field is set, open the advanced panel by default.
            if (deal.offer_terms || deal.restrictions || deal.max_redemptions || deal.appointment_required || deal.join_deadline || deal.redemption_deadline || deal.deposit_required) {
              setShowAdvanced(true);
            }
          }
        }
        setBootLoading(false);
      } catch (e) {
        if (!cancelled) { setBootError(e instanceof Error ? e.message : "שגיאה בטעינה"); setBootLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [categories, adminTargetSupplierId, dealId]);

  useEffect(() => {
    if (isEditing) return;
    const demandId = searchParams.get("demand_id");
    const catParam = searchParams.get("category_id");
    const descParam = searchParams.get("description");
    if (!demandId && !catParam && !descParam) return;
    if (catParam && categories.find((c) => c.id === catParam)) setCategoryId(catParam);
    if (descParam && !description) setDescription(descParam);
    if (!demandId) return;
    (async () => {
      const { data } = await supabase.from("demand_requests")
        .select("category_id,description,target_qty").eq("id", demandId).maybeSingle();
      if (!data) return;
      if (data.category_id && categories.find((c) => c.id === data.category_id)) setCategoryId(data.category_id);
      setDescription((prev) => (prev ? prev : data.description ?? ""));
      if (data.target_qty && !targetParticipants) setTargetParticipants(String(data.target_qty));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, isEditing]);

  const updateTier = (i: number, patch: Partial<TierRow>) => {
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  };
  const addTier = () => {
    const last = tiers[tiers.length - 1];
    const nextMin = last?.maxParticipants ? String(Number(last.maxParticipants) + 1) : "";
    setTiers((prev) => [...prev, emptyTier({ minParticipants: nextMin })]);
    setEditingTier(tiers.length);
  };
  const removeTier = (i: number) => {
    setTiers((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
    setEditingTier(null);
  };

  const buildAndValidate = (): Record<string, unknown> | null => {
    if (!supplier?.id) { toast.error("לא נמצא פרופיל ספק."); return null; }
    if (!title.trim()) { toast.error("יש להזין שם להצעה"); return null; }
    if (!categoryId) { toast.error("יש לבחור קטגוריה"); return null; }
    const today = todayISO();
    if (joinDeadline && joinDeadline < today) { toast.error("תאריך אחרון להצטרפות לא יכול להיות בעבר"); return null; }
    if (redemptionDeadline && redemptionDeadline < today) { toast.error("תאריך אחרון למימוש לא יכול להיות בעבר"); return null; }
    if (joinDeadline && redemptionDeadline && redemptionDeadline < joinDeadline) {
      toast.error("תאריך המימוש חייב להיות אחרי תאריך ההצטרפות"); return null;
    }

    let cleanDepositAmount = 0;
    if (listingType === "group_buy" && depositRequired) {
      const raw = depositAmount.trim();
      if (!DEPOSIT_AMOUNT_RE.test(raw)) { toast.error("סכום דמי ההשתתפות חייב להיות מספר חיובי"); return null; }
      cleanDepositAmount = Number(raw);
      if (cleanDepositAmount <= 0) { toast.error("סכום דמי ההשתתפות חייב להיות גדול מ-0"); return null; }
      if (depositLimits.min !== null && cleanDepositAmount < depositLimits.min) { toast.error(`מינימום דמי השתתפות: ${depositLimits.min}`); return null; }
      if (depositLimits.max !== null && cleanDepositAmount > depositLimits.max) { toast.error(`מקסימום דמי השתתפות: ${depositLimits.max}`); return null; }
    }

    const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
    let unitPriceVal: number | null = null;
    if (listingType === "regular") {
      unitPriceVal = num(unitPrice);
      if (!Number.isFinite(unitPriceVal) || (unitPriceVal as number) <= 0) { toast.error("יש להזין מחיר תקין"); return null; }
    } else {
      // Group buy: a base (published) price is mandatory for BOTH offer types —
      // it is the canonical price used to calculate the platform service fee.
      unitPriceVal = num(unitPrice);
      if (!Number.isFinite(unitPriceVal) || (unitPriceVal as number) <= 0) { toast.error("יש להזין מחיר מקורי תקין"); return null; }
    }


    const cleanTiers: OfferTier[] = [];
    if (listingType === "group_buy") {
      if (!tiers.length) { toast.error("יש להוסיף לפחות מדרגה אחת"); return null; }
      for (let i = 0; i < tiers.length; i++) {
        const t = tiers[i];
        const min = num(t.minParticipants);
        if (!Number.isFinite(min) || min < 1) { toast.error(`מדרגה ${i + 1}: מינימום מצטרפים לא תקין`); return null; }
        let max: number | null = null;
        if (t.maxParticipants.trim() !== "") {
          const m = num(t.maxParticipants);
          if (!Number.isFinite(m) || m < min) { toast.error(`מדרגה ${i + 1}: מקסימום חייב להיות ≥ מינימום`); return null; }
          max = m;
        }
        if (offerType === "percentage") {
          const pct = num(t.discount_percentage);
          if (!Number.isFinite(pct) || pct < 1 || pct > 100) { toast.error(`מדרגה ${i + 1}: אחוז בין 1-100`); return null; }
          cleanTiers.push({ minParticipants: min, maxParticipants: max, discount_percentage: pct, label: t.label.trim() || null });
        } else {
          const before = unitPriceVal as number;
          const after = num(t.discounted_price);
          if (!Number.isFinite(after) || after <= 0) { toast.error(`מדרגה ${i + 1}: מחיר אחרי לא תקין`); return null; }
          if (after >= before) { toast.error(`מדרגה ${i + 1}: מחיר אחרי חייב להיות קטן מהמחיר המקורי`); return null; }
          cleanTiers.push({ minParticipants: min, maxParticipants: max, original_price: before, discounted_price: after, label: t.label.trim() || null });
        }
      }
      cleanTiers.sort((a, b) => a.minParticipants - b.minParticipants);
    }

    if (visibilityType === "project_only" && !visibilityProjectId) { toast.error("בחר פרויקט"); return null; }
    if (visibilityType === "region_only" && visibilityRegions.regionIds.length === 0) {
      toast.error("בחר לפחות אזור אחד לקהל היעד"); return null;
    }

    const workAreaNames: string[] = workAreas.servesAllCountry
      ? ["כל הארץ"]
      : [
          ...workAreas.regionIds.map((id) => regionById(id)?.name_he).filter(Boolean) as string[],
          ...workAreas.cityIds.map((id) => cityById(id)?.name_he).filter(Boolean) as string[],
        ];
    const effectiveServiceAreas = workAreaNames.length > 0 ? workAreaNames : serviceAreas;

    type Json = import("@/integrations/supabase/types").Json;
    const isRegular = listingType === "regular";
    const firstTier = cleanTiers[0];
    const payload: Record<string, unknown> = {
      supplier_id: supplier.id,
      title: title.trim(),
      description: description.trim() || null,
      product_details: null,
      category_id: categoryId,
      listing_type: listingType,
      offer_type: offerType,
      deposit_required: isRegular ? false : depositRequired,
      deposit_amount: !isRegular && depositRequired ? cleanDepositAmount : 0,
      supplier_payment_link: null,
      supplier_payment_instructions: !isRegular && depositRequired ? (supplierPaymentInstructions.trim() || null) : null,
      tiers: cleanTiers as unknown as Json,
      highlights: [] as unknown as Json,
      ends_at: joinDeadline ? new Date(joinDeadline).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString(),
      visibility_type: visibilityType,
      visibility_project_id: visibilityType === "project_only" ? visibilityProjectId : null,
      visibility_region_ids: visibilityType === "region_only" ? visibilityRegions.regionIds : [],
      serves_all_country: workAreas.servesAllCountry,
      cover_image_url: coverImage,
      gallery_images: galleryImages as unknown as Json,
      target_participants: targetParticipants ? Number(targetParticipants) : null,
      join_deadline: joinDeadline ? new Date(joinDeadline).toISOString() : null,
      redemption_deadline: redemptionDeadline ? new Date(redemptionDeadline).toISOString() : null,
      offer_terms: offerTerms.trim() || null,
      restrictions: restrictions.trim() || null,
      max_redemptions: maxRedemptions ? Number(maxRedemptions) : null,
      appointment_required: appointmentRequired,
      service_areas: effectiveServiceAreas,
      supplier_commitment_accepted: true,
    };

    if (isRegular) {
      payload.original_price = unitPriceVal ?? 0;
      payload.discounted_price = null;
      payload.discount_percentage = null;
      payload.base_price = null;
    } else if (offerType === "percentage") {
      const pct = firstTier?.discount_percentage ?? null;
      payload.discount_percentage = pct != null && pct >= 1 && pct <= 100 ? pct : null;
      payload.base_price = unitPriceVal ?? null;
      payload.original_price = unitPriceVal ?? 0;
      payload.discounted_price = null;

    } else {
      payload.original_price = firstTier?.original_price ?? 0;
      payload.discounted_price = firstTier?.discounted_price ?? null;
      const rawPct =
        firstTier?.original_price && firstTier?.discounted_price
          ? Math.round(((firstTier.original_price - firstTier.discounted_price) / firstTier.original_price) * 100)
          : null;
      // DB check constraint requires 1-100 or NULL. Clamp/drop out-of-range values (e.g. 0% when prices are equal).
      payload.discount_percentage = rawPct != null && rawPct >= 1 && rawPct <= 100 ? rawPct : null;
      payload.base_price = unitPriceVal ?? null;

    }
    return payload;
  };

  const persist = async (status: "active" | "draft") => {
    if (saving || savingDraft) return;
    if (!isEditing && needsTermsAccept) {
      toast.error("יש לאשר את הסכם הספקים המעודכן לפני יצירת הצעה חדשה");
      return;
    }
    if (status === "active" && !commitmentAccepted) {
      toast.error("יש לסמן את התחייבות הספק כדי לפרסם");
      return;
    }
    if (supplier?.approval_status !== "approved" && supplier?.approval_status !== "active" && status === "active") {
      toast.error("ניתן לפרסם רק לאחר אישור הספק על ידי מנהל המערכת");
      return;
    }
    const payload = buildAndValidate();
    if (!payload) return;
    payload.status = status;

    const setLoading = status === "draft" ? setSavingDraft : setSaving;
    setLoading(true);
    try {
      let savedId = dealId;
      if (isEditing) {
        const { error } = await supabase.from("deals").update(payload as never).eq("id", dealId!);
        if (error) {
          const msg = error.message?.includes("row-level")
            ? "אין הרשאה לשמור. ודא שהספק אושר."
            : `שמירה נכשלה: ${error.message}`;
          toast.error(msg);
          return;
        }
      } else {
        const { data, error } = await supabase.from("deals").insert([payload as never]).select("id").single();
        if (error) {
          const msg = error.message?.includes("row-level")
            ? "אין הרשאה לשמור. ודא שהספק אושר."
            : `שמירה נכשלה: ${error.message}`;
          toast.error(msg);
          return;
        }
        savedId = (data as { id: string }).id;
      }

      if (savedId) {
        try {
          await Promise.all([
            supabase.from("deal_regions").delete().eq("deal_id", savedId),
            supabase.from("deal_cities").delete().eq("deal_id", savedId),
          ]);
          if (!workAreas.servesAllCountry) {
            if (workAreas.regionIds.length) {
              await supabase.from("deal_regions").insert(
                workAreas.regionIds.map((rid) => ({ deal_id: savedId!, region_id: rid })),
              );
            }
            if (workAreas.cityIds.length) {
              await supabase.from("deal_cities").insert(
                workAreas.cityIds.map((cid) => ({ deal_id: savedId!, city_id: cid })),
              );
            }
          }
        } catch (e) {
          console.warn("[OfferEditor] failed to sync deal areas", e);
        }
      }
      toast.success(
        status === "draft"
          ? "הטיוטה נשמרה"
          : isEditing ? "ההצעה עודכנה!" : "ההצעה פורסמה!"
      );
      if (status === "active" && !isEditing && savedId) {
        navigate(`/supplier/offers/${savedId}/marketing-tools?welcome=1`, { replace: true });
      } else {
        navigate("/supplier/offers", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  // Track "touched" fields so we only show inline errors after the user leaves them.
  // NOTE: hooks must be declared before any early returns below.
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const markTouched = (name: string) => setTouched((s) => (s.has(name) ? s : new Set(s).add(name)));

  const missingForStep = (n: StepNum): { key: string; label: string }[] => {
    const miss: { key: string; label: string }[] = [];
    if (n === 1) {
      if (!title.trim()) miss.push({ key: "title", label: "שם ההצעה" });
      if (!categoryId) miss.push({ key: "category", label: "קטגוריה" });
    }
    if (n === 2) {
      if (listingType === "regular") {
        const up = Number(unitPrice);
        if (!Number.isFinite(up) || up <= 0) miss.push({ key: "unitPrice", label: "מחיר" });
      } else {
        const up = Number(unitPrice);
        if (!Number.isFinite(up) || up <= 0) miss.push({ key: "unitPrice", label: "מחיר בסיס" });

        const t0 = tiers[0];
        if (!t0 || !t0.minParticipants || (offerType === "percentage" ? !t0.discount_percentage : !t0.discounted_price)) {
          miss.push({ key: "tier0", label: "מדרגת מחיר ראשונה" });
        }
        if (depositRequired) {
          if (!depositAmount.trim()) miss.push({ key: "depositAmount", label: "סכום דמי השתתפות" });
          
        }
      }
      if (visibilityType === "project_only" && !visibilityProjectId) miss.push({ key: "project", label: "פרויקט יעד" });
      if (visibilityType === "region_only" && visibilityRegions.regionIds.length === 0) {
        miss.push({ key: "regions", label: "אזורי יעד" });
      }
    }
    if (n === 3) {
      if (!commitmentAccepted) miss.push({ key: "commitment", label: "אישור התחייבות ספק" });
    }
    return miss;
  };

  const stepMissing = useMemo(() => missingForStep(step), // eslint-disable-line react-hooks/exhaustive-deps
    [step, title, categoryId, listingType, unitPrice, offerType, tiers, depositRequired, depositAmount,
      visibilityType, visibilityProjectId, visibilityRegions, commitmentAccepted]);
  const missingKeys = useMemo(() => new Set(stepMissing.map((m) => m.key)), [stepMissing]);

  if (bootLoading) {
    return (
      <MobileShell>
        <BackHeader title={isEditing ? "עריכת הצעה" : "הצעה חדשה"} subtitle="טוען…" />
        <LoadingState />
        <BottomNav role="supplier" />
      </MobileShell>
    );
  }
  if (bootError) {
    return (
      <MobileShell>
        <BackHeader title={isEditing ? "עריכת הצעה" : "הצעה חדשה"} />
        <ErrorState title="שגיאה" description={bootError} onRetry={() => window.location.reload()} />
        <BottomNav role="supplier" />
      </MobileShell>
    );
  }
  if (profileBlock) {
    return (
      <MobileShell>
        <BackHeader title="פרסום הצעה" />
        <div className="px-4 py-8 space-y-4 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center text-2xl">🔒</div>
          <h2 className="text-fs-lg font-extrabold">השלם את פרופיל העסק כדי לפרסם</h2>
          <p className="text-fs-sm text-muted-foreground max-w-sm mx-auto">
            כדי לפרסם הצעות ולקבל פניות מדיירים, יש להשלים את פרטי העסק. חסר: <b>{profileBlock.missing.join(", ")}</b> ({profileBlock.percent}%)
          </p>
          <div className="max-w-xs mx-auto h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${profileBlock.percent}%`, background: "linear-gradient(90deg,#0E6B5A,#34A88E)" }}
            />
          </div>
          <Button
            onClick={() => navigate("/supplier/onboarding")}
            className="h-12 px-6 rounded-xl bg-[#0E6B5A] hover:bg-[#0A5446] text-white font-extrabold"
          >
            השלמת פרופיל עכשיו
          </Button>
        </div>
        <BottomNav role="supplier" />
      </MobileShell>
    );
  }
  if (!supplier) {
    return (
      <MobileShell>
        <BackHeader title={isEditing ? "עריכת הצעה" : "הצעה חדשה"} />
        <EmptyState
          title="חסר פרופיל ספק"
          description="השלם את פרטי הספק כדי לפרסם הצעות."
          action={<Button onClick={() => navigate("/supplier/profile/edit")} className="h-11 px-5 rounded-xl bg-[#0E6B5A] text-white font-bold">השלמת פרטים</Button>}
        />
        <BottomNav role="supplier" />
      </MobileShell>
    );
  }
  if (!categories.length) {
    return (
      <MobileShell>
        <BackHeader title="הצעה חדשה" />
        <EmptyState title="חסרות קטגוריות" description="פנה למנהל המערכת." action={<Button onClick={() => navigate("/supplier", { replace: true })} className="h-12 rounded-2xl w-full">חזרה</Button>} />
        <BottomNav role="supplier" />
      </MobileShell>
    );
  }

  const stepTitles: Record<StepNum, string> = {
    1: "פרטי ההצעה",
    2: "מחיר וקהל",
    3: "תנאים ופרסום",
  };

  const stepSubtitles: Record<StepNum, string> = {
    1: "הזהות של ההצעה",
    2: "כמה זה עולה, למי זה מיועד",
    3: "מה כלול, סקירה ופרסום",
  };

  const shouldShowError = (key: string) => touched.has(key) && missingKeys.has(key);


  const validateStep = (n: number): boolean => {
    const miss = missingForStep(n as StepNum);
    if (miss.length) {
      // Mark all missing as touched so inline errors appear.
      setTouched((s) => {
        const next = new Set(s);
        miss.forEach((m) => next.add(m.key));
        return next;
      });
      toast.error(miss.length === 1 ? `חסר: ${miss[0].label}` : `חסרים ${miss.length} שדות`);
      return false;
    }
    if (n === 2 && listingType === "group_buy") {
      // extra numeric sanity for tier 0
      const t0 = tiers[0];
      if (offerType === "percentage") {
        const p = Number(t0.discount_percentage);
        if (!(p >= 1 && p <= 100)) { toast.error("אחוז הנחה בין 1–100"); return false; }
      }
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    if (step < 3) { setStep((step + 1) as StepNum); window.scrollTo({ top: 0, behavior: "smooth" }); }
  };
  const goBack = () => {
    if (step > 1) { setStep((step - 1) as StepNum); window.scrollTo({ top: 0, behavior: "smooth" }); }
  };

  const progressPct = (step / 3) * 100;

  // Inline AI FAQ helper removed — draft creation lives in the AI card on Step 1.


  return (
    <MobileShell>
      {/* Compact header — title + tiny progress bar. */}
      <header className="sticky top-0 z-20 bg-[#F8F6F1]/95 backdrop-blur-md">
        <div className="flex items-center gap-3 px-5 pt-3 pb-2">
          <button type="button" onClick={() => navigate(-1)}
            className="h-8 w-8 -mr-1 flex items-center justify-center rounded-full text-[#1F2937] hover:bg-black/5 transition-colors"
            aria-label="חזרה">
            <ChevronRight className="h-5 w-5" strokeWidth={2.2} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-[#111827] leading-tight truncate">
              {isEditing ? "עריכת הצעה" : "הצעה חדשה"}
            </div>
            <div className="text-[11.5px] text-[#6B7280] leading-tight mt-0.5">
              שלב {step}/3 · {stepTitles[step]}
            </div>
          </div>
        </div>
        <div className="h-[2px] bg-black/[0.06] mx-5 rounded-full overflow-hidden">
          <div className="h-full bg-[#0E6B5A] transition-all duration-300 rounded-full"
            style={{ width: `${progressPct}%` }} />
        </div>
      </header>

      <div className="px-5 pt-6 relative z-10"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 108px)" }}>

        {/* Step lead — large title + subtitle */}
        <div className="mb-6">
          <h1 className="text-[22px] font-extrabold text-[#111827] leading-tight tracking-tight">
            {stepTitles[step]}
          </h1>
          <p className="text-[13px] text-[#6B7280] mt-1 leading-relaxed">{stepSubtitles[step]}</p>
        </div>

        {/* ─── STEP 1 — Basics ─── */}
        {step === 1 && (
          <div className="space-y-7">
            <AiOfferGeneratorCard
              categories={categories.map((c) => ({ id: c.id, name: c.name }))}
              onDraftReady={applyAiDraft}
            />

            <div className="space-y-4">
              <Field label="שם ההצעה" required
                error={shouldShowError("title") ? "יש להזין שם" : undefined}>
                <Input value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => markTouched("title")}
                  placeholder="לדוגמה: שדרוג מטבח פרימיום"
                  className={`h-11 rounded-xl shadow-none ring-1 ${shouldShowError("title") ? "ring-destructive/50" : "ring-black/[0.06]"}`} />
              </Field>

              <Field label="קטגוריה" required
                error={shouldShowError("category") ? "יש לבחור קטגוריה" : undefined}>
                <CategorySinglePicker
                  categories={categories}
                  value={categoryId}
                  suggestedIds={supplierCategoryIds}
                  invalid={shouldShowError("category")}
                  onChange={(id) => { setCategoryId(id); markTouched("category"); }}
                />

              </Field>

              <Field label="תיאור" hint="מה כלול, למי זה מתאים">
                <Textarea value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ספר על ההצעה במילים שלך…"
                  className="rounded-xl min-h-[110px] shadow-none ring-1 ring-black/[0.06] text-[13.5px]" />
              </Field>

              <Field label="תמונות" hint="תמונה טובה מגדילה את שיעור ההצטרפות">
                <DealImagesEditor
                  cover={coverImage}
                  gallery={galleryImages}
                  onChange={({ cover, gallery }) => { setCoverImage(cover); setGalleryImages(gallery); }}
                />
              </Field>
            </div>
          </div>
        )}

        {/* ─── STEP 2 — Pricing & Audience ─── */}
        {step === 2 && (
          <div className="space-y-7">
            <Section title="סוג ההצעה">
              <div className="grid grid-cols-2 gap-2">
                <PillBtn active={listingType === "regular"} onClick={() => setListingType("regular")}>מחיר רגיל</PillBtn>
                <PillBtn active={listingType === "group_buy"} onClick={() => setListingType("group_buy")}>קבוצת רכישה</PillBtn>
              </div>
            </Section>

            {listingType === "regular" ? (
              <Section title="מחיר">
                <Field label="מחיר (₪)" required
                  error={shouldShowError("unitPrice") ? "יש להזין מחיר" : undefined}>
                  <Input type="number" inputMode="decimal" min={1} value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    onBlur={() => markTouched("unitPrice")}
                    className={`h-11 rounded-xl shadow-none ring-1 ${shouldShowError("unitPrice") ? "ring-destructive/50" : "ring-black/[0.06]"}`}
                    placeholder="הזן מחיר" />
                </Field>
                <p className="text-[11.5px] text-[#6B7280] leading-relaxed mt-2">
                  דיירים יוכלו לבקש לפתוח קבוצת רכישה עבור ההצעה.
                </p>
              </Section>
            ) : (
              <>
                <Section title="תצוגת המחיר">
                  <div className="grid grid-cols-2 gap-2">
                    <PillBtn active={offerType === "percentage"} onClick={() => switchOfferType("percentage")}>אחוז הנחה</PillBtn>
                    <PillBtn active={offerType === "price_comparison"} onClick={() => switchOfferType("price_comparison")}>לפני / אחרי</PillBtn>
                  </div>
                  <div className="mt-3">
                    <Field
                      label={offerType === "percentage" ? "מחיר מקורי (לפני הנחה, ₪)" : "מחיר רגיל (לפני הנחה, ₪)"}
                      required
                      error={shouldShowError("unitPrice") ? "יש להזין מחיר בסיס" : undefined}>
                      <Input type="number" inputMode="decimal" min={1} value={unitPrice}
                        onChange={(e) => setUnitPrice(e.target.value)}
                        onBlur={() => markTouched("unitPrice")}
                        className={`h-11 rounded-xl shadow-none ring-1 ${shouldShowError("unitPrice") ? "ring-destructive/50" : "ring-black/[0.06]"}`}
                        placeholder="הזן מחיר בסיס" />
                    </Field>
                    {offerType === "percentage" && (
                      <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                        המחיר המקורי משמש להצגת החיסכון למצטרפים ולחישוב דמי השירות של הפלטפורמה.
                      </p>
                    )}
                  </div>

                </Section>

                <Section
                  title="מדרגות מחיר"
                  hint="ככל שיותר מצטרפים — כך המחיר טוב יותר"
                  action={
                    <button type="button" onClick={loadRecommendedTiers}
                      className="text-[11.5px] font-semibold text-[#0E6B5A] hover:underline">
                      מומלץ
                    </button>
                  }
                >
                  <div className="space-y-2">
                    {tiers.map((t, i) => (
                      <TierCard
                        key={i}
                        idx={i}
                        tier={t}
                        offerType={offerType}
                        editing={editingTier === i}
                        onEdit={() => setEditingTier(editingTier === i ? null : i)}
                        onChange={(patch) => updateTier(i, patch)}
                        onRemove={() => removeTier(i)}
                        canRemove={tiers.length > 1}
                        highlight={i === 0 && shouldShowError("tier0")}
                      />
                    ))}
                  </div>

                  <button type="button" onClick={addTier}
                    className="mt-2.5 w-full h-10 rounded-xl text-[12.5px] font-semibold text-[#0E6B5A] hover:bg-[#0E6B5A]/[0.06] inline-flex items-center justify-center gap-1.5 transition-colors">
                    <Plus className="h-3.5 w-3.5" /> הוסף מדרגה
                  </button>
                  {shouldShowError("tier0") && (
                    <p className="text-[11px] text-destructive mt-2">מלא לפחות מדרגה אחת</p>
                  )}
                </Section>
              </>
            )}

            <Section title="אזור ביצוע" hint="היכן אתם מספקים את השירות">
              <AreasCombobox value={workAreas} onChange={setWorkAreas}
                placeholder="כל הארץ / אזורים / ערים-יישובים" />
            </Section>

            <Section title="קהל היעד" hint="למי ההצעה תוצג">
              <div className="grid grid-cols-3 gap-2">
                <PillBtn active={visibilityType === "public"} onClick={() => setVisibilityType("public")}>כולם</PillBtn>
                <PillBtn active={visibilityType === "project_only"} onClick={() => setVisibilityType("project_only")}>פרויקט</PillBtn>
                <PillBtn active={visibilityType === "region_only"} onClick={() => setVisibilityType("region_only")}>אזור</PillBtn>
              </div>
              {visibilityType === "project_only" && (
                <div className="mt-3">
                  <Field label="פרויקט" required
                    error={shouldShowError("project") ? "בחר פרויקט" : undefined}>
                    <select value={visibilityProjectId}
                      onChange={(e) => { setVisibilityProjectId(e.target.value); markTouched("project"); }}
                      className={`h-11 w-full rounded-xl bg-white ring-1 px-3 text-[13.5px] ${shouldShowError("project") ? "ring-destructive/50" : "ring-black/[0.06]"}`}>
                      <option value="">— בחר פרויקט —</option>
                      {projects.map((p) => (<option key={p.id} value={p.id}>{p.name} · {p.city}</option>))}
                    </select>
                  </Field>
                </div>
              )}
              {visibilityType === "region_only" && (
                <div className="mt-3">
                  <Field label="אזורי יעד" required
                    error={shouldShowError("regions") ? "בחר לפחות אזור אחד" : undefined}>
                    <AreasCombobox value={visibilityRegions}
                      onChange={(v) => { setVisibilityRegions(v); markTouched("regions"); }}
                      placeholder="בחר אזורים..." regionsOnly />
                  </Field>
                </div>
              )}
            </Section>
          </div>
        )}

        {/* ─── STEP 3 — Review & Publish ─── */}
        {step === 3 && (
          <div className="space-y-7">
            {/* Preview at the top — clean, as the resident will see. */}
            <LivePreview
              title={title}
              description={description}
              coverImage={coverImage}
              category={categories.find((c) => c.id === categoryId)?.name ?? ""}
              listingType={listingType}
              offerType={offerType}
              tiers={tiers}
              unitPrice={unitPrice}
              targetParticipants={targetParticipants}
              serviceAreas={
                workAreas.servesAllCountry
                  ? ["כל הארץ"]
                  : [
                      ...workAreas.regionIds.map((id) => regionById(id)?.name_he).filter(Boolean) as string[],
                      ...workAreas.cityIds.map((id) => cityById(id)?.name_he).filter(Boolean) as string[],
                    ]
              }
              depositRequired={depositRequired && listingType === "group_buy"}
              depositAmount={depositAmount}
              supplierName={supplier.business_name}
            />

            {/* Advanced options — collapsed by default */}
            <div className="rounded-xl bg-white ring-1 ring-black/[0.06] overflow-hidden">
              <button type="button" onClick={() => setShowAdvanced((v) => !v)}
                className="w-full flex items-center justify-between px-3.5 py-3 text-right">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-3.5 w-3.5 text-[#6B7280]" />
                  <span className="text-[13px] font-semibold text-[#1F2937]">אפשרויות מתקדמות</span>
                </div>
                <ChevronLeft className={`h-4 w-4 text-[#9CA3AF] transition-transform ${showAdvanced ? "-rotate-90" : ""}`} />
              </button>
              {showAdvanced && (
                <div className="border-t border-black/[0.05] px-3.5 py-4 space-y-4 bg-[#FAFBFC]">
                  <Field label="מה כלול">
                    <Textarea value={offerTerms} onChange={(e) => setOfferTerms(e.target.value)}
                      placeholder="תנאים, אחריות, מפרט…"
                      className="rounded-xl min-h-[80px] shadow-none ring-1 ring-black/[0.06] text-[13px] bg-white" />
                  </Field>
                  <Field label="מה לא כלול / חריגים">
                    <Textarea value={restrictions} onChange={(e) => setRestrictions(e.target.value)}
                      placeholder="למשל: לא כולל חלקי חילוף…"
                      className="rounded-xl min-h-[70px] shadow-none ring-1 ring-black/[0.06] text-[13px] bg-white" />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="דדליין הצטרפות">
                      <Input type="date" dir="ltr" min={todayISO()} value={joinDeadline}
                        onChange={(e) => setJoinDeadline(e.target.value)}
                        className="h-11 rounded-xl px-2 text-[13px] text-left shadow-none ring-1 ring-black/[0.06] bg-white" />
                    </Field>
                    <Field label="דדליין מימוש">
                      <Input type="date" dir="ltr" min={todayISO()} value={redemptionDeadline}
                        onChange={(e) => setRedemptionDeadline(e.target.value)}
                        className="h-11 rounded-xl px-2 text-[13px] text-left shadow-none ring-1 ring-black/[0.06] bg-white" />
                    </Field>
                  </div>
                  <Field label="מקסימום מימושים">
                    <Input type="number" inputMode="numeric" min={1}
                      value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)}
                      placeholder="ללא הגבלה"
                      className="h-11 rounded-xl shadow-none ring-1 ring-black/[0.06] bg-white" />
                  </Field>
                  {listingType === "group_buy" && (
                    <Field label="יעד משתתפים">
                      <Input type="number" inputMode="numeric" min={1}
                        value={targetParticipants} onChange={(e) => setTargetParticipants(e.target.value)}
                        placeholder="למשל 20"
                        className="h-11 rounded-xl shadow-none ring-1 ring-black/[0.06] bg-white" />
                    </Field>
                  )}
                  <label className="flex items-center gap-2.5 cursor-pointer py-1">
                    <input type="checkbox" checked={appointmentRequired}
                      onChange={(e) => setAppointmentRequired(e.target.checked)}
                      className="h-4 w-4 accent-[#0E6B5A]" />
                    <span className="text-[13px] text-[#1F2937]">נדרשת קביעת פגישה לפני מימוש</span>
                  </label>

                  {listingType === "group_buy" && (
                    <div className="pt-2 border-t border-black/[0.05]">
                      <label className="flex items-center gap-2.5 cursor-pointer py-1">
                        <input type="checkbox" checked={depositRequired}
                          onChange={(e) => setDepositRequired(e.target.checked)}
                          className="h-4 w-4 accent-[#0E6B5A]" />
                        <span className="text-[13px] font-medium text-[#1F2937]">דורש תשלום להצטרפות (דמי השתתפות מנוהלים בפלטפורמה)</span>
                      </label>
                      {depositRequired && (
                        <div className="space-y-3 mt-3">
                          <Field label="סכום לתצוגה (₪) — דמי השתתפות נקבעים אוטומטית לפי מחיר העסקה" required
                            error={shouldShowError("depositAmount") ? "הזן סכום" : undefined}>
                            <Input type="number" inputMode="decimal" min={1} step="0.01"
                              value={depositAmount}
                              onChange={(e) => setDepositAmount(e.target.value)}
                              onBlur={() => markTouched("depositAmount")}
                              className={`h-11 rounded-xl shadow-none ring-1 bg-white ${shouldShowError("depositAmount") ? "ring-destructive/50" : "ring-black/[0.06]"}`}
                              placeholder="הזן סכום" />
                          </Field>
                          <p className="text-[11.5px] leading-relaxed text-[#6B7280] bg-[#F4F6FA] rounded-xl px-3 py-2">
                            דמי ההשתתפות נגבים ישירות דרך GroupBuild ומועברים אליכם לאחר סגירת העסקה — אין צורך בקישור תשלום פרטי.
                          </p>
                          <Field label="הוראות נוספות (אופציונלי)">
                            <Textarea placeholder="למשל: מה כולל התשלום"
                              value={supplierPaymentInstructions}
                              onChange={(e) => setSupplierPaymentInstructions(e.target.value)}
                              className="rounded-xl min-h-[60px] shadow-none ring-1 ring-black/[0.06] text-[13px] bg-white" />
                          </Field>

                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Commitment — sits right above the publish button */}
            <label className={`flex items-start gap-2.5 cursor-pointer py-3 px-3 rounded-xl transition-colors ${shouldShowError("commitment") ? "bg-destructive/[0.04] ring-1 ring-destructive/30" : "bg-white ring-1 ring-black/[0.06]"}`}>
              <input type="checkbox" checked={commitmentAccepted}
                onChange={(e) => { setCommitmentAccepted(e.target.checked); markTouched("commitment"); }}
                className="h-4 w-4 mt-0.5 accent-[#0E6B5A] shrink-0" />
              <div className="text-[12.5px] leading-relaxed">
                <span className="font-semibold text-[#1F2937]">התחייבות הספק</span>
                <span className="text-destructive"> *</span>
                <p className="text-[11.5px] text-[#6B7280] mt-0.5">
                  אני מתחייב לכבד את ההצעה, לעמוד בלוחות הזמנים ולמסור שירות איכותי.
                </p>
              </div>
            </label>
          </div>
        )}
      </div>

      {/* Smart sticky footer — Back · missing indicator · Continue/Publish */}
      <div className="fixed inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-black/[0.06] px-4 pt-2 pb-3 bottom-[calc(env(safe-area-inset-bottom)+var(--nav-h))] [.keyboard-open_&]:bottom-[var(--kb-h,0px)] lg:!bottom-0">
        <div className="max-w-md mx-auto">
          {/* Missing-fields indicator */}
          <div className="h-4 mb-1.5 flex items-center justify-center">
            {stepMissing.length > 0 ? (
              <span className="text-[11px] text-[#9CA3AF]">
                {stepMissing.length === 1
                  ? `חסר: ${stepMissing[0].label}`
                  : `${stepMissing.length} שדות חסרים להמשך`}
              </span>
            ) : step < 3 ? (
              <span className="text-[11px] text-[#0E6B5A] font-semibold">
                מוכן להמשך
              </span>
            ) : null}
          </div>

          {step < 3 ? (
            <div className="flex gap-2">
              {step > 1 && (
                <button type="button" onClick={goBack}
                  className="h-12 px-4 rounded-xl bg-white ring-1 ring-black/[0.1] text-[13.5px] font-semibold text-[#1F2937] inline-flex items-center gap-1 hover:bg-black/[0.02] transition-colors">
                  <ChevronRight className="h-4 w-4" /> חזור
                </button>
              )}
              <button type="button" onClick={goNext}
                className={`flex-1 h-12 rounded-xl text-[13.5px] font-semibold inline-flex items-center justify-center gap-1 transition-colors ${
                  stepMissing.length > 0
                    ? "bg-[#0E6B5A]/40 text-white"
                    : "bg-[#0E6B5A] hover:bg-[#0A5446] text-white"
                }`}>
                המשך <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button type="button" onClick={goBack}
                className="h-12 w-12 rounded-xl bg-white ring-1 ring-black/[0.1] text-[#1F2937] inline-flex items-center justify-center hover:bg-black/[0.02] transition-colors"
                aria-label="חזור">
                <ChevronRight className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => persist("draft")} disabled={savingDraft || saving}
                className="h-12 px-3 rounded-xl bg-white ring-1 ring-black/[0.1] text-[12.5px] font-semibold text-[#1F2937] inline-flex items-center gap-1.5 hover:bg-black/[0.02] transition-colors disabled:opacity-50">
                {savingDraft ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><FileText className="h-3.5 w-3.5" /> שמור טיוטה</>}
              </button>
              <button type="button" onClick={() => persist("active")} disabled={saving || savingDraft || !commitmentAccepted}
                className="flex-1 h-12 rounded-xl bg-[#0E6B5A] hover:bg-[#0A5446] text-white text-[13.5px] font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-3.5 w-3.5" /> {isEditing ? "עדכן הצעה" : "פרסם הצעה"}</>}
              </button>
            </div>
          )}
        </div>
      </div>

      <BottomNav role="supplier" />

      <SupplierTermsReacceptDialog
        open={!isEditing && needsTermsAccept}
        onAccepted={() => setNeedsTermsAccept(false)}
        onCancel={() => navigate("/supplier/offers")}
      />
    </MobileShell>

  );
}


// ─────────── Sub-components ───────────

function Section({
  title, hint, action, children,
}: { title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-end justify-between mb-2.5">
        <div>
          <h3 className="text-[11px] font-bold tracking-[0.06em] uppercase text-[#6B7280]">{title}</h3>
          {hint && <p className="text-[11.5px] text-[#9CA3AF] mt-0.5">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({
  label, hint, error, action, required, children,
}: {
  label: string; hint?: string; error?: string; action?: React.ReactNode;
  required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="block">
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <span className="text-[12px] font-semibold text-[#374151]">
          {label}{required && <span className="text-destructive"> *</span>}
        </span>
        {action}
      </div>
      {hint && !error && <span className="text-[11px] text-[#9CA3AF] block mb-1.5 leading-snug">{hint}</span>}
      {children}
      {error && <p className="text-[11px] text-destructive mt-1 leading-snug">{error}</p>}
    </div>
  );
}



function PillBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`tap-target h-10 rounded-xl text-[12.5px] font-semibold transition-colors ${
        active
          ? "bg-[#1F2937] text-white"
          : "bg-white text-[#6B7280] ring-1 ring-black/[0.06] hover:text-[#1F2937]"
      }`}>
      {children}
    </button>
  );
}

function TierCard({
  idx, tier, offerType, editing, onEdit, onChange, onRemove, canRemove, highlight,
}: {
  idx: number;
  tier: TierRow;
  offerType: OfferType;
  editing: boolean;
  onEdit: () => void;
  onChange: (patch: Partial<TierRow>) => void;
  onRemove: () => void;
  canRemove: boolean;
  highlight?: boolean;
}) {
  const min = tier.minParticipants || "?";
  const max = tier.maxParticipants || "∞";
  const hasValue = !!(tier.discount_percentage || tier.discounted_price);
  const value = offerType === "percentage"
    ? (tier.discount_percentage ? `${tier.discount_percentage}%` : "—")
    : (tier.discounted_price ? `₪${Number(tier.discounted_price).toLocaleString()}` : "—");
  const isBest = idx === 0 && hasValue; // first tier surfaced as headline

  return (
    <div className={`rounded-xl bg-white transition-colors overflow-hidden ring-1 ${
      editing ? "ring-[#0E6B5A]/40" : highlight ? "ring-destructive/40" : "ring-black/[0.06]"
    }`}>
      <button type="button" onClick={onEdit}
        className="w-full flex items-center gap-3 px-3.5 py-3 text-right">
        <span className="h-6 w-6 shrink-0 rounded-full bg-[#F4F6FA] text-[11px] font-bold text-[#6B7280] inline-flex items-center justify-center">
          {idx + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-[#1F2937]">{min}–{max} משתתפים</div>
          {isBest && (
            <div className="text-[10.5px] text-[#9CA3AF] mt-0.5">מדרגת בסיס</div>
          )}
        </div>
        <span className={`text-[15px] font-extrabold tabular-nums ${hasValue ? "text-[#0E6B5A]" : "text-[#D1D5DB]"}`}>
          {value}
        </span>
        <Pencil className="h-3.5 w-3.5 text-[#9CA3AF] shrink-0" />
      </button>

      {editing && (
        <div className="border-t border-black/[0.05] px-3.5 py-3 space-y-2.5 bg-[#FAFBFC]">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[10.5px] font-semibold text-[#6B7280] mb-1 block">מ- משתתפים</span>
              <Input type="number" inputMode="numeric" min={1} value={tier.minParticipants}
                onChange={(e) => onChange({ minParticipants: e.target.value })}
                className="h-9 rounded-lg text-[13px] shadow-none ring-1 ring-black/[0.06] bg-white" placeholder="1" />
            </label>
            <label className="block">
              <span className="text-[10.5px] font-semibold text-[#6B7280] mb-1 block">עד (ריק = ∞)</span>
              <Input type="number" inputMode="numeric" value={tier.maxParticipants}
                onChange={(e) => onChange({ maxParticipants: e.target.value })}
                className="h-9 rounded-lg text-[13px] shadow-none ring-1 ring-black/[0.06] bg-white" placeholder="∞" />
            </label>
          </div>
          {offerType === "percentage" ? (
            <label className="block">
              <span className="text-[10.5px] font-semibold text-[#6B7280] mb-1 block">אחוז הנחה</span>
              <Input type="number" inputMode="numeric" min={1} max={100} value={tier.discount_percentage}
                onChange={(e) => onChange({ discount_percentage: e.target.value })}
                className="h-9 rounded-lg text-[13px] shadow-none ring-1 ring-black/[0.06] bg-white" placeholder="10" />
            </label>
          ) : (
            <label className="block">
              <span className="text-[10.5px] font-semibold text-[#6B7280] mb-1 block">מחיר אחרי הנחה (₪)</span>
              <Input type="number" inputMode="decimal" value={tier.discounted_price}
                onChange={(e) => onChange({ discounted_price: e.target.value })}
                className="h-9 rounded-lg text-[13px] shadow-none ring-1 ring-black/[0.06] bg-white" placeholder="הזן מחיר" />
            </label>
          )}
          {Number(tier.minParticipants) === 1 && (
            <p className="text-[10.5px] text-[#6B7280] leading-snug">
              מדרגה מ-1 תינתן גם לרוכש בודד. התחל מ-2 לקבוצה אמיתית.
            </p>
          )}
          <div className="flex justify-end pt-0.5">
            <button type="button" onClick={onRemove} disabled={!canRemove}
              className="text-[11px] font-semibold text-destructive inline-flex items-center gap-1 disabled:opacity-30">
              <Trash2 className="h-3 w-3" /> מחק מדרגה
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


function LivePreview({
  title, description, coverImage, category, listingType, offerType, tiers, unitPrice,
  targetParticipants, serviceAreas, depositRequired, depositAmount, supplierName,
}: {
  title: string; description: string; coverImage: string | null; category: string;
  listingType: "group_buy" | "regular"; offerType: OfferType; tiers: TierRow[]; unitPrice: string;
  targetParticipants: string; serviceAreas: string[];
  depositRequired: boolean; depositAmount: string; supplierName: string;
}) {
  const bestTier = useMemo(() => {
    if (!tiers.length) return null;
    if (offerType === "percentage") {
      return tiers.reduce((best, t) =>
        (Number(t.discount_percentage || 0) > Number(best.discount_percentage || 0) ? t : best), tiers[0]);
    }
    return tiers.reduce((best, t) =>
      (Number(t.discounted_price || Infinity) < Number(best.discounted_price || Infinity) ? t : best), tiers[0]);
  }, [tiers, offerType]);

  const headline = listingType === "regular"
    ? (unitPrice ? `₪${Number(unitPrice).toLocaleString()}` : "מחיר מיוחד")
    : offerType === "percentage"
      ? (bestTier?.discount_percentage ? `עד ${bestTier.discount_percentage}% הנחה` : "מחיר קבוצתי")
      : (bestTier?.discounted_price ? `החל מ-₪${Number(bestTier.discounted_price).toLocaleString()}` : "מחיר קבוצתי");

  return (
    <div className="rounded-2xl overflow-hidden bg-white ring-1 ring-black/[0.06]">
      {coverImage ? (
        <div className="relative h-44 bg-[#F4F6FA]">
          <img src={coverImage} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent" />
          <div className="absolute bottom-2 right-3 text-white">
            <div className="text-[11px] font-bold opacity-90">{category}</div>
            <div className="text-base font-extrabold leading-tight">{title || "שם ההצעה"}</div>
          </div>
        </div>
      ) : (
        <div className="h-32 bg-[#F4F6FA] flex items-center justify-center">
          <span className="text-[11.5px] text-[#9CA3AF]">אין תמונה</span>
        </div>
      )}
      <div className="p-4 space-y-3">
        {!coverImage && (
          <div>
            <div className="text-[11px] font-bold text-[#6B7280]">{category}</div>
            <div className="text-[15px] font-extrabold text-[#1F2937]">{title || "שם ההצעה"}</div>
          </div>
        )}
        <div className="text-[11.5px] text-[#6B7280]">{supplierName}</div>

        <div className="rounded-xl bg-[#0E6B5A]/[0.06] p-3">
          <div className="text-[10.5px] font-bold text-[#0E6B5A] uppercase tracking-wide">
            {listingType === "regular" ? "הצעה מיוחדת" : "קבוצת רכישה"}
          </div>
          <div className="text-[18px] font-extrabold text-[#0E6B5A] mt-0.5">{headline}</div>
          {listingType === "group_buy" && targetParticipants && (
            <div className="text-[11.5px] text-[#6B7280] mt-1">יעד: {targetParticipants} מצטרפים</div>
          )}
        </div>

        {description && (
          <p className="text-[12.5px] text-[#374151] leading-relaxed whitespace-pre-line line-clamp-6">{description}</p>
        )}

        {listingType === "group_buy" && tiers.length > 0 && (
          <div className="space-y-0.5">
            <div className="text-[10.5px] font-bold text-[#6B7280] uppercase tracking-wide mb-1">מדרגות</div>
            {tiers.slice(0, 4).map((t, i) => (
              <div key={i} className="flex justify-between items-center text-[12.5px] py-1.5 border-b border-black/[0.05] last:border-b-0">
                <span className="text-[#6B7280]">{t.minParticipants || "?"}–{t.maxParticipants || "∞"} משתתפים</span>
                <span className="font-bold text-[#0E6B5A] tabular-nums">
                  {offerType === "percentage" ? `${t.discount_percentage || 0}%` : t.discounted_price ? `₪${t.discounted_price}` : "—"}
                </span>
              </div>
            ))}
          </div>
        )}

        {serviceAreas.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {serviceAreas.slice(0, 5).map((a, i) => (
              <span key={i} className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[#F4F6FA] text-[#6B7280]">{a}</span>
            ))}
          </div>
        )}

        {depositRequired && (
        <div className="text-[11.5px] bg-[#F4F6FA] text-[#374151] rounded-lg px-2.5 py-1.5 font-medium">
          דמי השתתפות: לפי מדרגות הפלטפורמה (מחיר עסקה)
        </div>
        )}
      </div>
    </div>
  );
}

