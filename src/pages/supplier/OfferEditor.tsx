import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { verifyAdminFromSession } from "@/lib/auth";
import {
  Save, Plus, Trash2, Loader2, ChevronRight, ChevronLeft,
  Eye, Pencil, FileText, Settings2, Sparkles,
} from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BackHeader, LoadingState, ErrorState, EmptyState } from "@/components/ds";
import { BottomNav } from "@/components/layout/BottomNav";
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

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [depositRequired, setDepositRequired] = useState<boolean>(false);
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [supplierPaymentLink, setSupplierPaymentLink] = useState<string>("");
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
        let s: SupplierLite | null = null;
        if (adminTargetSupplierId) {
          const isAdmin = await verifyAdminFromSession();
          if (!isAdmin) {
            if (!cancelled) { setBootError("רק אדמין יכול ליצור הצעה לספק אחר."); setBootLoading(false); }
            return;
          }
          const r = await supabase.from("suppliers")
            .select("id, business_name, approval_status, categories, email, user_id")
            .eq("id", adminTargetSupplierId).maybeSingle();
          s = (r.data as SupplierLite | null) ?? null;
        } else {
          const email = session.user.email ?? "";
          const byUser = await supabase.from("suppliers")
            .select("id, business_name, approval_status, categories, email, user_id")
            .eq("user_id", session.user.id).maybeSingle();
          s = (byUser.data as SupplierLite | null) ?? null;
          if (!s && email) {
            const byEmail = await supabase.from("suppliers")
              .select("id, business_name, approval_status, categories, email, user_id")
              .ilike("email", email).maybeSingle();
            s = (byEmail.data as SupplierLite | null) ?? null;
            if (s && !s.user_id) {
              const { error: claimError } = await (supabase as unknown as ClaimSupplierRpc).rpc("claim_supplier_profile_by_email", { _supplier_id: s.id });
              if (!claimError) s = { ...s, user_id: session.user.id, email: email || s.email };
            }
          }
        }

        const { data: paymentSettings } = await supabase.from("system_settings")
          .select("deposit_default_amount,deposit_min_amount,deposit_max_amount")
          .limit(1).maybeSingle();

        if (cancelled) return;
        setSupplier(s);
        // Do NOT prefill deposit_amount — user asked for empty defaults.
        setDepositLimits({
          min: paymentSettings?.deposit_min_amount == null ? null : Number(paymentSettings.deposit_min_amount),
          max: paymentSettings?.deposit_max_amount == null ? null : Number(paymentSettings.deposit_max_amount),
        });
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
            if (deal.supplier_payment_link) setSupplierPaymentLink(String(deal.supplier_payment_link));
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
              if (firstWithPrice?.original_price != null) setUnitPrice(String(firstWithPrice.original_price));
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
      if (!DEPOSIT_AMOUNT_RE.test(raw)) { toast.error("סכום הפיקדון חייב להיות מספר חיובי"); return null; }
      cleanDepositAmount = Number(raw);
      if (cleanDepositAmount <= 0) { toast.error("סכום הפיקדון חייב להיות גדול מ-0"); return null; }
      if (depositLimits.min !== null && cleanDepositAmount < depositLimits.min) { toast.error(`מינימום פיקדון: ${depositLimits.min}`); return null; }
      if (depositLimits.max !== null && cleanDepositAmount > depositLimits.max) { toast.error(`מקסימום פיקדון: ${depositLimits.max}`); return null; }
      const link = supplierPaymentLink.trim();
      if (!link) { toast.error("קישור תשלום הוא שדה חובה כאשר נדרש פיקדון"); return null; }
      if (!URL_RE.test(link)) { toast.error("קישור תשלום חייב להתחיל ב-https://"); return null; }
    }

    const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
    let unitPriceVal: number | null = null;
    if (listingType === "regular") {
      unitPriceVal = num(unitPrice);
      if (!Number.isFinite(unitPriceVal) || (unitPriceVal as number) <= 0) { toast.error("יש להזין מחיר תקין"); return null; }
    } else if (offerType === "price_comparison") {
      unitPriceVal = num(unitPrice);
      if (!Number.isFinite(unitPriceVal) || (unitPriceVal as number) <= 0) { toast.error("יש להזין מחיר יחידה תקין"); return null; }
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
      supplier_payment_link: !isRegular && depositRequired ? (supplierPaymentLink.trim() || null) : null,
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
      payload.discount_percentage = firstTier?.discount_percentage ?? null;
      payload.base_price = null;
      payload.original_price = 0;
      payload.discounted_price = null;
    } else {
      payload.original_price = firstTier?.original_price ?? 0;
      payload.discounted_price = firstTier?.discounted_price ?? null;
      payload.discount_percentage =
        firstTier?.original_price && firstTier?.discounted_price
          ? Math.round(((firstTier.original_price - firstTier.discounted_price) / firstTier.original_price) * 100)
          : null;
      payload.base_price = null;
    }
    return payload;
  };

  const persist = async (status: "active" | "draft") => {
    if (saving || savingDraft) return;
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
    1: "מה ההצעה",
    2: "מחיר ואזור",
    3: "פרסום",
  };

  const validateStep = (n: number): boolean => {
    if (n === 1) {
      if (!title.trim()) { toast.error("יש להזין שם"); return false; }
      if (!categoryId) { toast.error("יש לבחור קטגוריה"); return false; }
    }
    if (n === 2) {
      if (listingType === "regular") {
        const up = Number(unitPrice);
        if (!Number.isFinite(up) || up <= 0) { toast.error("יש להזין מחיר"); return false; }
      } else {
        if (offerType === "price_comparison") {
          const up = Number(unitPrice);
          if (!Number.isFinite(up) || up <= 0) { toast.error("יש להזין מחיר יחידה"); return false; }
        }
        if (!tiers.length) { toast.error("יש להוסיף לפחות מדרגה אחת"); return false; }
        // Require at least the first tier to be filled.
        const t0 = tiers[0];
        if (!t0.minParticipants || (offerType === "percentage" ? !t0.discount_percentage : !t0.discounted_price)) {
          toast.error("מלא לפחות מדרגה אחת"); return false;
        }
      }
      if (visibilityType === "project_only" && !visibilityProjectId) { toast.error("בחר פרויקט"); return false; }
      if (visibilityType === "region_only" && visibilityRegions.regionIds.length === 0) {
        toast.error("בחר לפחות אזור אחד לקהל היעד"); return false;
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

  return (
    <MobileShell>
      {/* Compact header — title + tiny progress bar together. No BackHeader chrome. */}
      <header className="sticky top-0 z-20 bg-[#F8F6F1]/95 backdrop-blur-md">
        <div className="flex items-center gap-3 px-5 pt-3 pb-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="h-8 w-8 -mr-1 flex items-center justify-center rounded-full text-[#1F2937] hover:bg-black/5 transition-colors"
            aria-label="חזרה"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2.2} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-[#111827] leading-tight truncate">
              {isEditing ? "עריכת הצעה" : "הצעה חדשה"}
            </div>
            <div className="text-[11.5px] text-[#6B7280] leading-tight mt-0.5">
              {stepTitles[step]} · {step}/3
            </div>
          </div>
        </div>
        <div className="h-[2px] bg-black/[0.06] mx-5 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0E6B5A] transition-all duration-300 rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      <div
        className="px-5 pt-5 relative z-10"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 96px)" }}
      >
        {/* ─── STEP 1 ─── */}
        {step === 1 && (
          <div className="space-y-7">
            <Section title="סוג ההצעה">
              <div className="grid grid-cols-2 gap-2">
                <TypeCard active={listingType === "group_buy"} onClick={() => setListingType("group_buy")}
                  title="קבוצת רכישה" desc="מחיר יורד לפי כמות" />
                <TypeCard active={listingType === "regular"} onClick={() => setListingType("regular")}
                  title="הצעה רגילה" desc="מבצע במחיר קבוע" />
              </div>
            </Section>

            <Section title="פרטים">
              <div className="space-y-4">
                <Field label="שם ההצעה">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)}
                    placeholder="לדוגמה: שדרוג מטבח פרימיום"
                    className="h-11 rounded-xl shadow-none ring-1 ring-black/[0.06]" />
                </Field>
                <Field label="קטגוריה">
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                    className="h-11 w-full rounded-xl bg-white ring-1 ring-black/[0.06] px-3 text-[13.5px] text-[#1F2937] focus:outline-none focus:ring-[#0E6B5A]/40">
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </Field>
                <Field label="תיאור" hint="מה כלול, למי זה מתאים">
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
                    placeholder="ספר על ההצעה במילים שלך..."
                    className="rounded-xl min-h-[100px] shadow-none ring-1 ring-black/[0.06] text-[13.5px]" />
                </Field>
              </div>
            </Section>

            {!isEditing && (
              <AiOfferGeneratorCard
                categories={categories.map((c) => ({ id: c.id, name: c.name }))}
                onDraftReady={applyAiDraft}
              />
            )}

            {aiFaqPreview.length > 0 && (
              <Section
                title="שאלות שהוצעו על-ידי AI"
                hint="תצוגה מקדימה — לא נשמר להצעה"
                action={
                  <button type="button" onClick={() => setAiFaqPreview([])}
                    className="text-[11.5px] text-[#6B7280] hover:text-[#1F2937]">נקה</button>
                }
              >
                <div className="divide-y divide-black/[0.06] rounded-xl bg-white ring-1 ring-black/[0.05]">
                  {aiFaqPreview.map((f, i) => (
                    <details key={i} className="group">
                      <summary className="list-none cursor-pointer px-3 py-2.5 flex items-center justify-between gap-2">
                        <span className="text-[12.5px] font-semibold text-[#1F2937] flex-1">{f.q}</span>
                        <ChevronLeft className="h-3.5 w-3.5 text-[#9CA3AF] transition-transform group-open:-rotate-90 shrink-0" />
                      </summary>
                      <div className="px-3 pb-3 text-[12px] text-[#4B5563] leading-relaxed">{f.a}</div>
                    </details>
                  ))}
                </div>
              </Section>
            )}

            <Section title="תמונות" hint="מומלץ להוסיף לפחות תמונה אחת">
              <DealImagesEditor
                cover={coverImage}
                gallery={galleryImages}
                onChange={({ cover, gallery }) => { setCoverImage(cover); setGalleryImages(gallery); }}
              />
            </Section>
          </div>
        )}

        {/* ─── STEP 2 ─── */}
        {step === 2 && (
          <div className="space-y-7">
            {listingType === "regular" ? (
              <Section title="מחיר">
                <Field label="מחיר (₪)">
                  <Input type="number" inputMode="numeric" min={1} value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="h-11 rounded-xl shadow-none ring-1 ring-black/[0.06]"
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
                  {offerType === "price_comparison" && (
                    <div className="mt-3">
                      <Field label="מחיר רגיל (לפני הנחה, ₪)">
                        <Input type="number" inputMode="numeric" min={1} value={unitPrice}
                          onChange={(e) => setUnitPrice(e.target.value)}
                          className="h-11 rounded-xl shadow-none ring-1 ring-black/[0.06]"
                          placeholder="הזן מחיר בסיס" />
                      </Field>
                    </div>
                  )}
                </Section>

                <Section
                  title="מדרגות מחיר"
                  action={
                    <button type="button" onClick={loadRecommendedTiers}
                      className="text-[11.5px] font-semibold text-[#0E6B5A] inline-flex items-center gap-1 hover:underline">
                      <Sparkles className="h-3 w-3" /> מומלץ
                    </button>
                  }
                >
                  <div className="divide-y divide-black/[0.06] rounded-xl bg-white ring-1 ring-black/[0.05] overflow-hidden">
                    {tiers.map((t, i) => (
                      <TierRow
                        key={i}
                        idx={i}
                        tier={t}
                        offerType={offerType}
                        editing={editingTier === i}
                        onEdit={() => setEditingTier(editingTier === i ? null : i)}
                        onChange={(patch) => updateTier(i, patch)}
                        onRemove={() => removeTier(i)}
                        canRemove={tiers.length > 1}
                      />
                    ))}
                  </div>

                  <button type="button" onClick={addTier}
                    className="mt-2.5 w-full h-10 rounded-xl text-[12.5px] font-semibold text-[#0E6B5A] hover:bg-[#0E6B5A]/[0.06] inline-flex items-center justify-center gap-1.5 transition-colors">
                    <Plus className="h-3.5 w-3.5" /> הוסף מדרגה
                  </button>
                </Section>
              </>
            )}

            <Section title="קהל יעד">
              <div className="grid grid-cols-3 gap-2">
                <PillBtn active={visibilityType === "public"} onClick={() => setVisibilityType("public")}>כולם</PillBtn>
                <PillBtn active={visibilityType === "project_only"} onClick={() => setVisibilityType("project_only")}>פרויקט</PillBtn>
                <PillBtn active={visibilityType === "region_only"} onClick={() => setVisibilityType("region_only")}>אזור</PillBtn>
              </div>
              {visibilityType === "project_only" && (
                <div className="mt-3">
                  <Field label="פרויקט">
                    <select value={visibilityProjectId} onChange={(e) => setVisibilityProjectId(e.target.value)}
                      className="h-11 w-full rounded-xl bg-white ring-1 ring-black/[0.06] px-3 text-[13.5px]">
                      <option value="">— בחר פרויקט —</option>
                      {projects.map((p) => (<option key={p.id} value={p.id}>{p.name} · {p.city}</option>))}
                    </select>
                  </Field>
                </div>
              )}
              {visibilityType === "region_only" && (
                <div className="mt-3">
                  <Field label="אזורי יעד" hint="ההצעה תוצג רק לדיירים באזורים הנבחרים">
                    <AreasCombobox value={visibilityRegions} onChange={setVisibilityRegions}
                      placeholder="בחר אזורים..." regionsOnly />
                  </Field>
                </div>
              )}
            </Section>

            <Section title="אזור ביצוע" hint="היכן אתם מספקים את השירות">
              <AreasCombobox value={workAreas} onChange={setWorkAreas}
                placeholder="בחר אזור, עיר או יישוב..." />
            </Section>
          </div>
        )}

        {/* ─── STEP 3 ─── */}
        {step === 3 && (
          <div className="space-y-7">
            <div className="flex items-center gap-2 text-[12px] text-[#6B7280]">
              <Eye className="h-3.5 w-3.5 text-[#0E6B5A]" />
              <span>כך הדיירים יראו את ההצעה</span>
            </div>

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

            {/* Advanced */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="w-full flex items-center justify-between py-2 text-right"
              >
                <div className="flex items-center gap-2">
                  <Settings2 className="h-3.5 w-3.5 text-[#0E6B5A]" />
                  <span className="text-[13px] font-semibold text-[#1F2937]">אפשרויות מתקדמות</span>
                </div>
                <ChevronLeft className={`h-4 w-4 text-[#9CA3AF] transition-transform ${showAdvanced ? "-rotate-90" : ""}`} />
              </button>

              {showAdvanced && (
                <div className="pt-3 space-y-5">
                  {listingType === "group_buy" && (
                    <>
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input type="checkbox" checked={depositRequired}
                          onChange={(e) => setDepositRequired(e.target.checked)}
                          className="h-4 w-4 accent-[#0E6B5A]" />
                        <span className="text-[13px] font-medium text-[#1F2937]">דורש פיקדון להצטרפות</span>
                      </label>

                      {depositRequired && (
                        <div className="space-y-3 pr-6 border-r border-black/[0.06]">
                          <Field label="סכום הפיקדון (₪)">
                            <Input type="number" inputMode="numeric" min={1} step="0.01"
                              value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}
                              className="h-11 rounded-xl shadow-none ring-1 ring-black/[0.06]"
                              placeholder="הזן סכום" />
                            {(depositLimits.min !== null || depositLimits.max !== null) && (
                              <p className="text-[11px] text-[#9CA3AF] mt-1">
                                {depositLimits.min !== null ? `מ-${depositLimits.min}` : ""}
                                {depositLimits.min !== null && depositLimits.max !== null ? " · " : ""}
                                {depositLimits.max !== null ? `עד ${depositLimits.max}` : ""}
                              </p>
                            )}
                          </Field>
                          <Field label="קישור תשלום *" hint="הפיקדון מועבר ישירות אליך">
                            <Input type="url" placeholder="https://..."
                              value={supplierPaymentLink} onChange={(e) => setSupplierPaymentLink(e.target.value)}
                              className="h-11 rounded-xl shadow-none ring-1 ring-black/[0.06]" dir="ltr" />
                          </Field>
                          <Field label="הוראות נוספות (אופציונלי)">
                            <Textarea placeholder='למשל: "Bit ל-050-1234567"'
                              value={supplierPaymentInstructions}
                              onChange={(e) => setSupplierPaymentInstructions(e.target.value)}
                              className="rounded-xl min-h-[60px] shadow-none ring-1 ring-black/[0.06] text-[13px]" />
                          </Field>
                        </div>
                      )}

                      <Field label="יעד משתתפים לסגירה (אופציונלי)">
                        <Input type="number" inputMode="numeric" min={1}
                          value={targetParticipants} onChange={(e) => setTargetParticipants(e.target.value)}
                          placeholder="למשל 20"
                          className="h-11 rounded-xl shadow-none ring-1 ring-black/[0.06]" />
                      </Field>
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Field label="דדליין הצטרפות">
                      <Input type="date" dir="ltr" min={todayISO()} value={joinDeadline}
                        onChange={(e) => setJoinDeadline(e.target.value)}
                        className="h-11 rounded-xl px-2 text-[13px] text-left shadow-none ring-1 ring-black/[0.06]" />
                    </Field>
                    <Field label="דדליין מימוש">
                      <Input type="date" dir="ltr" min={todayISO()} value={redemptionDeadline}
                        onChange={(e) => setRedemptionDeadline(e.target.value)}
                        className="h-11 rounded-xl px-2 text-[13px] text-left shadow-none ring-1 ring-black/[0.06]" />
                    </Field>
                  </div>

                  <Field label="מה כלול (אופציונלי)">
                    <Textarea value={offerTerms} onChange={(e) => setOfferTerms(e.target.value)}
                      placeholder="תנאים, אחריות, מפרט..."
                      className="rounded-xl min-h-[70px] shadow-none ring-1 ring-black/[0.06] text-[13px]" />
                  </Field>
                  <Field label="מה לא כלול / חריגים (אופציונלי)">
                    <Textarea value={restrictions} onChange={(e) => setRestrictions(e.target.value)}
                      placeholder="חריגים..."
                      className="rounded-xl min-h-[60px] shadow-none ring-1 ring-black/[0.06] text-[13px]" />
                  </Field>

                  <Field label="מקסימום מימושים (אופציונלי)">
                    <Input type="number" inputMode="numeric" min={1}
                      value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)}
                      placeholder="ללא הגבלה"
                      className="h-11 rounded-xl shadow-none ring-1 ring-black/[0.06]" />
                  </Field>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={appointmentRequired}
                      onChange={(e) => setAppointmentRequired(e.target.checked)}
                      className="h-4 w-4 accent-[#0E6B5A]" />
                    <span className="text-[13px] text-[#1F2937]">נדרשת קביעת פגישה לפני מימוש</span>
                  </label>
                </div>
              )}
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer py-2 border-t border-black/[0.06] pt-4">
              <input type="checkbox" checked={commitmentAccepted}
                onChange={(e) => setCommitmentAccepted(e.target.checked)}
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

      {/* Slim sticky footer */}
      <div
        className="fixed inset-x-0 z-40 bg-[#F8F6F1]/95 backdrop-blur border-t border-black/[0.06] px-4 py-3 bottom-[calc(env(safe-area-inset-bottom)+var(--nav-h))] [.keyboard-open_&]:bottom-[var(--kb-h,0px)] lg:!bottom-0"
      >
        {step < 3 ? (
          <div className="flex gap-2 max-w-md mx-auto">
            {step > 1 && (
              <button type="button" onClick={goBack}
                className="h-11 px-4 rounded-xl bg-white ring-1 ring-black/[0.08] text-[13.5px] font-semibold text-[#1F2937] inline-flex items-center gap-1 hover:bg-black/[0.02] transition-colors">
                <ChevronRight className="h-4 w-4" /> חזור
              </button>
            )}
            <button type="button" onClick={goNext}
              className="flex-1 h-11 rounded-xl bg-[#0E6B5A] hover:bg-[#0A5446] text-white text-[13.5px] font-semibold inline-flex items-center justify-center gap-1 transition-colors">
              המשך <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2 max-w-md mx-auto">
            <button type="button" onClick={goBack}
              className="h-11 w-11 rounded-xl bg-white ring-1 ring-black/[0.08] text-[#1F2937] inline-flex items-center justify-center hover:bg-black/[0.02] transition-colors"
              aria-label="חזור">
              <ChevronRight className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => persist("draft")} disabled={savingDraft || saving}
              className="h-11 px-3 rounded-xl bg-white ring-1 ring-black/[0.08] text-[12.5px] font-semibold text-[#1F2937] inline-flex items-center gap-1.5 hover:bg-black/[0.02] transition-colors disabled:opacity-50">
              {savingDraft ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><FileText className="h-3.5 w-3.5" /> טיוטה</>}
            </button>
            <button type="button" onClick={() => persist("active")} disabled={saving || savingDraft || !commitmentAccepted}
              className="flex-1 h-11 rounded-xl bg-[#0E6B5A] hover:bg-[#0A5446] text-white text-[13.5px] font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-3.5 w-3.5" /> {isEditing ? "עדכן" : "פרסם"}</>}
            </button>
          </div>
        )}
      </div>

      <BottomNav role="supplier" />
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

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold text-[#374151] mb-1.5 block">{label}</span>
      {hint && <span className="text-[11px] text-[#9CA3AF] block mb-1.5 leading-snug">{hint}</span>}
      {children}
    </label>
  );
}

function TypeCard({ active, onClick, title, desc }: { active: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button type="button" onClick={onClick}
      className={`p-3 rounded-xl text-right transition-colors ${
        active
          ? "bg-[#0E6B5A]/[0.06] ring-1 ring-[#0E6B5A]/40"
          : "bg-white ring-1 ring-black/[0.06] hover:ring-black/[0.12]"
      }`}>
      <div className={`text-[13px] font-semibold ${active ? "text-[#0E6B5A]" : "text-[#1F2937]"}`}>{title}</div>
      <div className="text-[11px] text-[#6B7280] mt-0.5 leading-snug">{desc}</div>
    </button>
  );
}

function PillBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`h-10 rounded-xl text-[12.5px] font-semibold transition-colors ${
        active
          ? "bg-[#1F2937] text-white"
          : "bg-white text-[#6B7280] ring-1 ring-black/[0.06] hover:text-[#1F2937]"
      }`}>
      {children}
    </button>
  );
}

function TierRow({
  idx, tier, offerType, editing, onEdit, onChange, onRemove, canRemove,
}: {
  idx: number;
  tier: TierRow;
  offerType: OfferType;
  editing: boolean;
  onEdit: () => void;
  onChange: (patch: Partial<TierRow>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const min = tier.minParticipants || "?";
  const max = tier.maxParticipants || "∞";
  const hasValue = !!(tier.discount_percentage || tier.discounted_price);
  const value = offerType === "percentage"
    ? (tier.discount_percentage ? `${tier.discount_percentage}%` : "—")
    : (tier.discounted_price ? `₪${tier.discounted_price}` : "—");

  return (
    <div className={`transition-colors ${editing ? "bg-[#0E6B5A]/[0.04]" : ""}`}>
      <button
        type="button"
        onClick={onEdit}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-right"
      >
        <span className="text-[11px] font-bold text-[#9CA3AF] tabular-nums w-4 shrink-0">{idx + 1}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-semibold text-[#1F2937]">{min}–{max} משתתפים</div>
        </div>
        <span className={`text-[13px] font-bold tabular-nums ${hasValue ? "text-[#0E6B5A]" : "text-[#9CA3AF]"}`}>
          {value}
        </span>
        <Pencil className="h-3.5 w-3.5 text-[#9CA3AF] shrink-0" />
      </button>

      {editing && (
        <div className="px-3 pb-3 space-y-2">
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
              <Input type="number" inputMode="numeric" value={tier.discounted_price}
                onChange={(e) => onChange({ discounted_price: e.target.value })}
                className="h-9 rounded-lg text-[13px] shadow-none ring-1 ring-black/[0.06] bg-white" placeholder="הזן מחיר" />
            </label>
          )}
          {Number(tier.minParticipants) === 1 && (
            <p className="text-[10.5px] text-[#8A6A1E] leading-snug pt-0.5">
              ⚠️ מדרגה מ-1 תינתן גם לרוכש בודד. התחל מ-2 לקבוצה אמיתית.
            </p>
          )}
          <div className="flex justify-end pt-1">
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
          <div className="text-[11.5px] bg-[#FFF8E1] text-[#8A6A1E] rounded-lg px-2.5 py-1.5 font-medium">
            נדרש פיקדון: ₪{depositAmount || "—"}
          </div>
        )}
      </div>
    </div>
  );
}

