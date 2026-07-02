import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { verifyAdminFromSession } from "@/lib/auth";
import {
  Save, Plus, Trash2, Loader2, Check, ChevronRight, ChevronLeft,
  Package, Tag, Users, ClipboardList, Eye, X, Pencil, FileText,
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

const defaultPercentageTiers = (): TierRow[] => [
  emptyTier({ minParticipants: "1", maxParticipants: "4", discount_percentage: "5", label: "מדרגה ראשונה" }),
  emptyTier({ minParticipants: "5", maxParticipants: "9", discount_percentage: "10", label: "מדרגה שנייה" }),
  emptyTier({ minParticipants: "10", maxParticipants: "19", discount_percentage: "15", label: "מדרגה שלישית" }),
  emptyTier({ minParticipants: "20", maxParticipants: "", discount_percentage: "20", label: "המחיר הטוב ביותר" }),
];

const defaultPriceTiers = (): TierRow[] => [
  emptyTier({ minParticipants: "1", maxParticipants: "4", original_price: "5000", discounted_price: "4750", label: "מדרגה ראשונה" }),
  emptyTier({ minParticipants: "5", maxParticipants: "9", original_price: "5000", discounted_price: "4500", label: "מדרגה שנייה" }),
  emptyTier({ minParticipants: "10", maxParticipants: "", original_price: "5000", discounted_price: "4200", label: "המחיר הטוב ביותר" }),
];

const todayISO = () => {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
};

export default function OfferEditor() {
  const navigate = useNavigate();
  const { dealId } = useParams<{ dealId: string }>();
  const isEditing = !!dealId;
  const [searchParams] = useSearchParams();
  const adminTargetSupplierId = searchParams.get("supplierId");
  const { categories, projects } = useApp();

  const [visibilityType, setVisibilityType] = useState<"public" | "project_only">("public");
  const [visibilityProjectId, setVisibilityProjectId] = useState<string>("");

  const [bootLoading, setBootLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [supplier, setSupplier] = useState<SupplierLite | null>(null);

  const [title, setTitle] = useState("");
  // Unified description (merged from description + product_details)
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [depositRequired, setDepositRequired] = useState<boolean>(false);
  const [depositAmount, setDepositAmount] = useState<string>("1000");
  const [supplierPaymentLink, setSupplierPaymentLink] = useState<string>("");
  const [supplierPaymentInstructions, setSupplierPaymentInstructions] = useState<string>("");
  const [depositLimits, setDepositLimits] = useState<DepositLimits>({ min: null, max: null });
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [listingType, setListingType] = useState<"group_buy" | "regular">(
    (searchParams.get("type") as "group_buy" | "regular") === "regular" ? "regular" : "group_buy",
  );

  const [offerType, setOfferType] = useState<OfferType>("percentage");
  const [tiers, setTiers] = useState<TierRow[]>(defaultPercentageTiers());
  const [editingTier, setEditingTier] = useState<number | null>(null);
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
  const [serviceAreaInput, setServiceAreaInput] = useState<string>("");
  const [commitmentAccepted, setCommitmentAccepted] = useState<boolean>(false);

  const switchOfferType = (next: OfferType) => {
    if (next === offerType) return;
    setOfferType(next);
    setTiers(next === "percentage" ? defaultPercentageTiers() : defaultPriceTiers());
    if (next === "price_comparison" && !unitPrice) setUnitPrice("5000");
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
        if (paymentSettings?.deposit_default_amount != null) setDepositAmount(String(paymentSettings.deposit_default_amount));
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
            // Merge legacy product_details into description
            const legacyDetails = (deal as { product_details?: string | null }).product_details ?? "";
            const desc = deal.description ?? "";
            setDescription([desc, legacyDetails].filter(Boolean).join("\n\n"));
            const lt = ((deal as { listing_type?: string | null }).listing_type ?? "group_buy") as "group_buy" | "regular";
            setListingType(lt);
            if (deal.category_id) setCategoryId(deal.category_id);
            setDepositRequired(!!deal.deposit_required);
            if (deal.deposit_amount != null) setDepositAmount(String(deal.deposit_amount));
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
              const firstWithPrice = rawTiers.find((t) => t.original_price != null);
              if (firstWithPrice?.original_price != null) setUnitPrice(String(firstWithPrice.original_price));
            }
            setCoverImage(deal.cover_image_url ?? null);
            setGalleryImages((deal.gallery_images as string[] | null) ?? []);
            setVisibilityType((deal.visibility_type as "public" | "project_only") ?? "public");
            setVisibilityProjectId(deal.visibility_project_id ?? "");
            setTargetParticipants(deal.target_participants != null ? String(deal.target_participants) : "");
            setJoinDeadline(deal.join_deadline ? deal.join_deadline.split("T")[0] : "");
            setRedemptionDeadline(deal.redemption_deadline ? deal.redemption_deadline.split("T")[0] : "");
            setOfferTerms(deal.offer_terms ?? "");
            setRestrictions(deal.restrictions ?? "");
            setMaxRedemptions(deal.max_redemptions != null ? String(deal.max_redemptions) : "");
            setAppointmentRequired(!!deal.appointment_required);
            setServiceAreas(Array.isArray(deal.service_areas) ? (deal.service_areas as string[]) : []);
            setCommitmentAccepted(true);
          }
        }
        setBootLoading(false);
      } catch (e) {
        if (!cancelled) { setBootError(e instanceof Error ? e.message : "שגיאה בטעינה"); setBootLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [categories, adminTargetSupplierId, dealId]);

  // Demand prefill
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

  // ─────────── Tier operations ───────────
  const updateTier = (i: number, patch: Partial<TierRow>) => {
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  };
  const addTier = () => {
    const last = tiers[tiers.length - 1];
    const nextMin = last?.maxParticipants ? String(Number(last.maxParticipants) + 1) : "";
    setTiers((prev) => [...prev, emptyTier({ minParticipants: nextMin, label: `מדרגה ${prev.length + 1}` })]);
    setEditingTier(tiers.length);
  };
  const removeTier = (i: number) => {
    setTiers((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
    setEditingTier(null);
  };

  const addServiceArea = () => {
    const v = serviceAreaInput.trim();
    if (!v) return;
    if (serviceAreas.some((a) => a.toLowerCase() === v.toLowerCase())) { setServiceAreaInput(""); return; }
    setServiceAreas([...serviceAreas, v]);
    setServiceAreaInput("");
  };
  const removeArea = (i: number) => setServiceAreas((prev) => prev.filter((_, idx) => idx !== i));

  // ─────────── Save (publish or draft) ───────────
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

    type Json = import("@/integrations/supabase/types").Json;
    const isRegular = listingType === "regular";
    const firstTier = cleanTiers[0];
    const payload: Record<string, unknown> = {
      supplier_id: supplier.id,
      title: title.trim(),
      description: description.trim() || null,
      product_details: null, // merged into description
      category_id: categoryId,
      listing_type: listingType,
      offer_type: offerType,
      deposit_required: isRegular ? false : depositRequired,
      deposit_amount: !isRegular && depositRequired ? cleanDepositAmount : 0,
      supplier_payment_link: !isRegular && depositRequired ? (supplierPaymentLink.trim() || null) : null,
      supplier_payment_instructions: !isRegular && depositRequired ? (supplierPaymentInstructions.trim() || null) : null,
      tiers: cleanTiers as unknown as Json,
      highlights: ["מחיר מיוחד", "אחריות מלאה"] as unknown as Json,
      ends_at: joinDeadline ? new Date(joinDeadline).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString(),
      visibility_type: visibilityType,
      visibility_project_id: visibilityType === "project_only" ? visibilityProjectId : null,
      cover_image_url: coverImage,
      gallery_images: galleryImages as unknown as Json,
      target_participants: targetParticipants ? Number(targetParticipants) : null,
      join_deadline: joinDeadline ? new Date(joinDeadline).toISOString() : null,
      redemption_deadline: redemptionDeadline ? new Date(redemptionDeadline).toISOString() : null,
      offer_terms: offerTerms.trim() || null,
      restrictions: restrictions.trim() || null,
      max_redemptions: maxRedemptions ? Number(maxRedemptions) : null,
      appointment_required: appointmentRequired,
      service_areas: serviceAreas,
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
          // TODO: If 'draft' status is not allowed by DB check-constraint, a migration is needed.
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

  // ─────────── Loading states ───────────
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

  // ─────────── Step navigation ───────────
  const stepTitles = ["מה אתה מציע", "מחיר", "למי זה מתאים", "תנאים", "תצוגה ופרסום"] as const;
  const stepIcons = [Package, Tag, Users, ClipboardList, Eye];

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
      }
      if (listingType === "group_buy" && depositRequired) {
        if (!supplierPaymentLink.trim()) { toast.error("קישור תשלום חובה"); return false; }
        if (!URL_RE.test(supplierPaymentLink.trim())) { toast.error("קישור תשלום חייב להתחיל ב-https://"); return false; }
      }
    }
    if (n === 3) {
      if (visibilityType === "project_only" && !visibilityProjectId) { toast.error("בחר פרויקט"); return false; }
    }
    if (n === 4) {
      const today = todayISO();
      if (joinDeadline && joinDeadline < today) { toast.error("תאריך הצטרפות בעבר"); return false; }
      if (redemptionDeadline && redemptionDeadline < today) { toast.error("תאריך מימוש בעבר"); return false; }
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    if (step < 5) { setStep((step + 1) as 1 | 2 | 3 | 4 | 5); window.scrollTo({ top: 0, behavior: "smooth" }); }
  };
  const goBack = () => {
    if (step > 1) { setStep((step - 1) as 1 | 2 | 3 | 4 | 5); window.scrollTo({ top: 0, behavior: "smooth" }); }
  };

  const progressPct = (step / 5) * 100;

  return (
    <MobileShell>
      <BackHeader title={isEditing ? "עריכת הצעה" : "הצעה חדשה"} subtitle={`שלב ${step} מתוך 5 · ${stepTitles[step - 1]}`} />

      <div className="px-5 -mt-4 relative z-10 space-y-4 pb-6">
        {/* Stepper */}
        <div className="gb-card p-3">
          <div className="flex items-center justify-between gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((n) => {
              const done = step > n;
              const active = step === n;
              const Icon = stepIcons[n - 1];
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => { if (n < step || validateStep(step)) setStep(n as 1 | 2 | 3 | 4 | 5); }}
                  className={`flex-1 flex flex-col items-center gap-1 min-w-0 group`}
                >
                  <div
                    className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center border-2 transition-colors ${
                      done ? "bg-[#0E6B5A] border-[#0E6B5A] text-white"
                        : active ? "bg-white border-[#0E6B5A] text-[#0E6B5A]"
                        : "bg-white border-[#ECEEF2] text-[#9CA3AF]"
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <span className={`hidden xs:block text-[10px] font-bold truncate max-w-full ${active || done ? "text-[#1F2937]" : "text-[#9CA3AF]"}`}>
                    {stepTitles[n - 1]}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="h-1 rounded-full bg-[#ECEEF2] overflow-hidden">
            <div className="h-full bg-[#0E6B5A] transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* ─── STEP 1: What are you offering ─── */}
        {step === 1 && (
          <>
            <div className="gb-card p-4 space-y-3">
              <h3 className="font-bold text-sm text-[#1F2937]">סוג ההצעה</h3>
              <div className="grid grid-cols-2 gap-2">
                <TypeCard active={listingType === "group_buy"} onClick={() => setListingType("group_buy")}
                  title="קבוצת רכישה" desc="המחיר יורד לפי כמות המצטרפים" />
                <TypeCard active={listingType === "regular"} onClick={() => setListingType("regular")}
                  title="הצעה רגילה" desc="מבצע / שירות במחיר קבוע" />
              </div>
            </div>

            <div className="gb-card p-4 space-y-3">
              <Field label="שם ההצעה">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="לדוגמה: שדרוג מטבח פרימיום" className="h-11 rounded-xl" />
              </Field>
              <Field label="קטגוריה">
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm">
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </Field>
              <Field label="תיאור ההצעה" hint="מה כלול, מפרט, גדלים, אחריות, מה מיוחד בהצעה">
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="ספר על ההצעה במילים שלך — מה כלול, למי זה מתאים, ומה מיוחד..."
                  className="rounded-xl min-h-[130px]" />
              </Field>
            </div>

            <div className="gb-card p-4">
              <h3 className="font-bold text-sm mb-3 text-[#1F2937]">תמונות</h3>
              <DealImagesEditor
                cover={coverImage}
                gallery={galleryImages}
                onChange={({ cover, gallery }) => { setCoverImage(cover); setGalleryImages(gallery); }}
              />
              <p className="text-fs-xs text-muted-foreground mt-2 leading-relaxed">
                הצעות עם תמונות איכותיות מגדילות משמעותית את ההצטרפויות.
              </p>
            </div>
          </>
        )}

        {/* ─── STEP 2: Price ─── */}
        {step === 2 && (
          <>
            {listingType === "regular" ? (
              <div className="gb-card p-4 space-y-3">
                <h3 className="font-bold text-sm text-[#1F2937]">מחיר ההצעה</h3>
                <Field label="מחיר (₪)">
                  <Input type="number" min={1} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="h-11 rounded-xl" placeholder="350" />
                </Field>
                <p className="text-fs-xs text-muted-foreground leading-relaxed">
                  אין מנגנון של ירידת מחיר. דיירים יוכלו לבקש לפתוח קבוצת רכישה עבור ההצעה.
                </p>
              </div>
            ) : (
              <>
                <div className="gb-card p-4 space-y-3">
                  <h3 className="font-bold text-sm text-[#1F2937]">איך המחיר יוצג?</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <ToggleBtn active={offerType === "percentage"} onClick={() => switchOfferType("percentage")}>אחוז הנחה</ToggleBtn>
                    <ToggleBtn active={offerType === "price_comparison"} onClick={() => switchOfferType("price_comparison")}>מחיר לפני / אחרי</ToggleBtn>
                  </div>
                  {offerType === "price_comparison" && (
                    <Field label="מחיר רגיל (לפני הנחה, ₪)">
                      <Input type="number" min={1} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="h-11 rounded-xl" placeholder="5000" />
                    </Field>
                  )}
                </div>

                {/* Tier cards */}
                <div className="gb-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-[#1F2937]">מדרגות הנחה</h3>
                    <span className="text-fs-xs text-muted-foreground">{tiers.length} מדרגות</span>
                  </div>

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
                      />
                    ))}
                  </div>

                  <Button type="button" onClick={addTier} variant="outline"
                    className="w-full h-11 rounded-xl border-dashed border-2 text-sm font-bold">
                    <Plus className="h-4 w-4 ml-1" /> הוסף מדרגה
                  </Button>
                </div>

                {/* Deposit — moved into Price step */}
                <div className="gb-card p-4 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={depositRequired} onChange={(e) => setDepositRequired(e.target.checked)} className="h-4 w-4 accent-primary" />
                    <span className="text-sm font-bold text-[#1F2937]">דורש פיקדון להצטרפות</span>
                  </label>
                  {depositRequired && (
                    <div className="space-y-3 pt-1">
                      <Field label="סכום הפיקדון (₪)">
                        <Input type="number" min={1} step="0.01" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className="h-11 rounded-xl" />
                        <p className="text-fs-xs text-muted-foreground mt-1">
                          {depositLimits.min !== null ? `מינימום: ${depositLimits.min}. ` : ""}
                          {depositLimits.max !== null ? `מקסימום: ${depositLimits.max}.` : ""}
                        </p>
                      </Field>
                      <Field label="קישור תשלום ישיר (Bit / PayBox / העברה) *">
                        <Input type="url" placeholder="https://payboxapp.page.link/... או https://pay.bit.co.il/..."
                          value={supplierPaymentLink} onChange={(e) => setSupplierPaymentLink(e.target.value)}
                          className="h-11 rounded-xl" dir="ltr" />
                        <p className="text-fs-xs text-muted-foreground mt-1 leading-relaxed">
                          <b>הפיקדון משולם ישירות אליך</b> — GroupBuild לא גובה.
                        </p>
                      </Field>
                      <Field label="הוראות נוספות (אופציונלי)">
                        <Textarea placeholder='לדוגמה: "ניתן להעביר ב-Bit ל-050-1234567"'
                          value={supplierPaymentInstructions} onChange={(e) => setSupplierPaymentInstructions(e.target.value)}
                          className="rounded-xl min-h-[50px]" />
                      </Field>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ─── STEP 3: Audience ─── */}
        {step === 3 && (
          <>
            <div className="gb-card p-4 space-y-3">
              <h3 className="font-bold text-sm text-[#1F2937]">למי ההצעה מיועדת?</h3>
              <div className="grid grid-cols-2 gap-2">
                <ToggleBtn active={visibilityType === "public"} onClick={() => setVisibilityType("public")}>לכל הדיירים</ToggleBtn>
                <ToggleBtn active={visibilityType === "project_only"} onClick={() => setVisibilityType("project_only")}>לפרויקט מסוים</ToggleBtn>
              </div>
              {visibilityType === "project_only" && (
                <Field label="פרויקט">
                  <select value={visibilityProjectId} onChange={(e) => setVisibilityProjectId(e.target.value)}
                    className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm">
                    <option value="">— בחר פרויקט —</option>
                    {projects.map((p) => (<option key={p.id} value={p.id}>{p.name} · {p.city}</option>))}
                  </select>
                </Field>
              )}
            </div>
            {listingType === "group_buy" && (
              <div className="gb-card p-4">
                <Field label="יעד משתתפים לסגירת הקבוצה" hint="לא חובה — עוזר לדיירים להבין מתי הקבוצה נסגרת">
                  <Input type="number" min={1} value={targetParticipants} onChange={(e) => setTargetParticipants(e.target.value)}
                    placeholder="20" className="h-11 rounded-xl" />
                </Field>
              </div>
            )}
          </>
        )}

        {/* ─── STEP 4: Conditions ─── */}
        {step === 4 && (
          <>
            <div className="gb-card p-4 space-y-3">
              <h3 className="font-bold text-sm text-[#1F2937]">אזורי שירות</h3>
              <div className="flex gap-2">
                <Input value={serviceAreaInput}
                  onChange={(e) => setServiceAreaInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addServiceArea(); } }}
                  placeholder="לדוגמה: תל אביב" className="h-11 rounded-xl flex-1" />
                <Button type="button" onClick={addServiceArea} variant="outline" className="h-11 rounded-xl px-3"><Plus className="h-4 w-4" /></Button>
              </div>
              {serviceAreas.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {serviceAreas.map((a, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 text-fs-sm font-bold px-3 py-1.5 rounded-full bg-[#F4F6FA] text-[#1F2937] border border-[#ECEEF2]">
                      {a}
                      <button type="button" onClick={() => removeArea(i)} className="h-4 w-4 rounded-full bg-white border border-[#ECEEF2] hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="gb-card p-4 space-y-3">
              <Field label="מה כלול בהצעה"><Textarea value={offerTerms} onChange={(e) => setOfferTerms(e.target.value)} placeholder="מה כלול? תנאי תשלום? אחריות?" className="rounded-xl min-h-[70px]" /></Field>
              <Field label="מה לא כלול / חריגים"><Textarea value={restrictions} onChange={(e) => setRestrictions(e.target.value)} placeholder="מה לא נכלל?" className="rounded-xl min-h-[60px]" /></Field>
            </div>

            <div className="gb-card p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Field label="תאריך אחרון להצטרפות">
                  <Input type="date" dir="ltr" min={todayISO()} value={joinDeadline} onChange={(e) => setJoinDeadline(e.target.value)} className="h-11 rounded-xl px-2 text-sm text-left" />
                </Field>
                <Field label="תאריך אחרון למימוש">
                  <Input type="date" dir="ltr" min={todayISO()} value={redemptionDeadline} onChange={(e) => setRedemptionDeadline(e.target.value)} className="h-11 rounded-xl px-2 text-sm text-left" />
                </Field>
              </div>
              <Field label="מקסימום מימושים (אופציונלי)">
                <Input type="number" min={1} value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} placeholder="ללא הגבלה" className="h-11 rounded-xl" />
              </Field>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input type="checkbox" checked={appointmentRequired} onChange={(e) => setAppointmentRequired(e.target.checked)} className="h-4 w-4 accent-primary" />
                <span className="text-sm text-[#1F2937]">נדרשת קביעת פגישה לפני מימוש</span>
              </label>
            </div>
          </>
        )}

        {/* ─── STEP 5: Preview & Publish ─── */}
        {step === 5 && (
          <>
            <div className="rounded-2xl bg-gradient-to-br from-[#0E6B5A]/5 to-transparent border border-[#0E6B5A]/20 p-3 flex items-center gap-2">
              <Eye className="h-4 w-4 text-[#0E6B5A]" />
              <span className="text-fs-xs font-bold text-[#0E6B5A]">כך הדיירים יראו את ההצעה שלך</span>
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
              serviceAreas={serviceAreas}
              depositRequired={depositRequired && listingType === "group_buy"}
              depositAmount={depositAmount}
              supplierName={supplier.business_name}
            />

            <div className="gb-card p-4 border border-[#0E6B5A]/30 bg-[#FFF8E1]/30">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={commitmentAccepted}
                  onChange={(e) => setCommitmentAccepted(e.target.checked)}
                  className="h-5 w-5 mt-0.5 accent-primary shrink-0" />
                <div className="text-sm leading-relaxed">
                  <span className="font-bold text-[#1F2937]">התחייבות הספק <span className="text-destructive">*</span></span>
                  <p className="text-xs text-muted-foreground mt-1">אני מתחייב לכבד את ההצעה, לעמוד בלוחות הזמנים ולמסור שירות איכותי.</p>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button type="button" onClick={() => persist("draft")} disabled={savingDraft || saving}
                variant="outline" className="h-12 rounded-[16px] font-bold">
                {savingDraft ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <FileText className="h-4 w-4 ml-2" />}
                שמור כטיוטה
              </Button>
              <Button onClick={() => persist("active")} disabled={saving || savingDraft || !commitmentAccepted}
                className="h-12 rounded-[16px] bg-[#0E6B5A] hover:bg-[#0E6B5A]/90 text-white font-bold shadow-[0_8px_20px_-10px_rgba(10,31,61,0.45)] disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Save className="h-4 w-4 ml-2" />}
                {isEditing ? "עדכן ופרסם" : "פרסם הצעה"}
              </Button>
            </div>
          </>
        )}

        {/* Navigation buttons (steps 1-4) */}
        {step < 5 && (
          <div className="flex gap-2 pt-1">
            {step > 1 && (
              <Button type="button" onClick={goBack} variant="outline" className="flex-1 h-12 rounded-[16px] font-bold">
                <ChevronRight className="h-4 w-4 ml-1" /> חזור
              </Button>
            )}
            <Button type="button" onClick={goNext}
              className="flex-[2] h-12 rounded-[16px] bg-[#0E6B5A] hover:bg-[#0E6B5A]/90 text-white font-bold">
              המשך <ChevronLeft className="h-4 w-4 mr-1" />
            </Button>
          </div>
        )}
      </div>

      <BottomNav role="supplier" />
    </MobileShell>
  );
}

// ─────────── Sub-components ───────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-fs-xs font-bold text-[#1F2937] mb-1 block">{label}</span>
      {hint && <span className="text-[11px] text-muted-foreground block mb-1.5 leading-snug">{hint}</span>}
      {children}
    </label>
  );
}

function TypeCard({ active, onClick, title, desc }: { active: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button type="button" onClick={onClick}
      className={`p-3 rounded-xl border-2 text-right transition-smooth ${
        active ? "border-[#0E6B5A] bg-[#0E6B5A]/5" : "border-[#ECEEF2] bg-white"
      }`}>
      <div className="text-sm font-bold text-[#1F2937]">{title}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{desc}</div>
    </button>
  );
}

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`h-11 rounded-xl border-2 text-sm font-bold transition-smooth ${
        active ? "border-[#1F2937] bg-[#F4F6FA] text-[#1F2937]" : "border-[#ECEEF2] bg-white text-[#6B7280]"
      }`}>
      {children}
    </button>
  );
}

function TierCard({
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
  const value = offerType === "percentage"
    ? (tier.discount_percentage ? `${tier.discount_percentage}% הנחה` : "—")
    : (tier.discounted_price ? `₪${tier.discounted_price}` : "—");

  return (
    <div className={`rounded-xl border transition-colors ${editing ? "border-[#0E6B5A] bg-[#0E6B5A]/5" : "border-[#ECEEF2] bg-white"}`}>
      <div className="p-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-[#F4F6FA] border border-[#ECEEF2] flex items-center justify-center text-sm font-bold text-[#0E6B5A] shrink-0">
          {idx + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-[#1F2937]">{min}–{max} משתתפים</div>
          <div className="text-fs-xs text-[#0E6B5A] font-bold">{value}</div>
        </div>
        <button type="button" onClick={onEdit} className="h-9 w-9 rounded-lg bg-[#F4F6FA] border border-[#ECEEF2] flex items-center justify-center text-[#1F2937]" aria-label="ערוך">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={onRemove} disabled={!canRemove}
          className="h-9 w-9 rounded-lg bg-white border border-[#ECEEF2] flex items-center justify-center text-destructive disabled:opacity-30" aria-label="מחק">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {editing && (
        <div className="border-t border-[#ECEEF2] p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] font-bold text-muted-foreground mb-1 block">מ- (משתתפים)</span>
              <Input type="number" min={1} value={tier.minParticipants} onChange={(e) => onChange({ minParticipants: e.target.value })} className="h-10 rounded-lg text-sm" placeholder="1" />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold text-muted-foreground mb-1 block">עד (או ריק = ∞)</span>
              <Input type="number" value={tier.maxParticipants} onChange={(e) => onChange({ maxParticipants: e.target.value })} className="h-10 rounded-lg text-sm" placeholder="∞" />
            </label>
          </div>
          {offerType === "percentage" ? (
            <label className="block">
              <span className="text-[11px] font-bold text-muted-foreground mb-1 block">אחוז הנחה</span>
              <Input type="number" min={1} max={100} value={tier.discount_percentage} onChange={(e) => onChange({ discount_percentage: e.target.value })} className="h-10 rounded-lg text-sm" placeholder="10" />
            </label>
          ) : (
            <label className="block">
              <span className="text-[11px] font-bold text-muted-foreground mb-1 block">מחיר אחרי הנחה (₪)</span>
              <Input type="number" value={tier.discounted_price} onChange={(e) => onChange({ discounted_price: e.target.value })} className="h-10 rounded-lg text-sm" placeholder="4500" />
            </label>
          )}
          {Number(tier.minParticipants) === 1 && (
            <div className="flex items-start gap-1.5 rounded-lg bg-[#FFF8E1] border border-[#F5C547]/40 px-2 py-1.5 text-[10px] text-[#8A6A1E] font-medium leading-snug">
              <span>⚠️</span>
              <span>מדרגה מ-1 תינתן גם לרוכש בודד. התחל מ-2 ומעלה לקבוצה אמיתית.</span>
            </div>
          )}
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
  const firstTier = tiers[0];
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
    <div className="rounded-2xl overflow-hidden bg-white shadow-[0_8px_24px_-12px_rgba(10,31,61,0.15)] border border-[#ECEEF2]">
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
        <div className="h-44 bg-gradient-to-br from-[#F4F6FA] to-[#ECEEF2] flex items-center justify-center">
          <span className="text-fs-xs text-muted-foreground">אין תמונה</span>
        </div>
      )}
      <div className="p-4 space-y-3">
        {!coverImage && (
          <div>
            <div className="text-[11px] font-bold text-muted-foreground">{category}</div>
            <div className="text-base font-extrabold text-[#1F2937]">{title || "שם ההצעה"}</div>
          </div>
        )}
        <div className="text-fs-xs text-muted-foreground">{supplierName}</div>

        <div className="rounded-xl bg-gradient-to-br from-[#0E6B5A]/10 to-transparent border border-[#0E6B5A]/20 p-3">
          <div className="text-[11px] font-bold text-[#0E6B5A]">
            {listingType === "regular" ? "הצעה מיוחדת" : "קבוצת רכישה"}
          </div>
          <div className="text-lg font-extrabold text-[#0E6B5A]">{headline}</div>
          {listingType === "group_buy" && targetParticipants && (
            <div className="text-fs-xs text-muted-foreground mt-1">יעד: {targetParticipants} מצטרפים</div>
          )}
        </div>

        {description && (
          <p className="text-fs-sm text-[#1F2937] leading-relaxed whitespace-pre-line line-clamp-6">{description}</p>
        )}

        {listingType === "group_buy" && tiers.length > 0 && (
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-muted-foreground">מדרגות מחיר</div>
            {tiers.slice(0, 4).map((t, i) => (
              <div key={i} className="flex justify-between items-center text-fs-sm py-1 border-b border-[#ECEEF2] last:border-b-0">
                <span className="text-[#6B7280]">{t.minParticipants || "?"}–{t.maxParticipants || "∞"} משתתפים</span>
                <span className="font-bold text-[#0E6B5A]">
                  {offerType === "percentage" ? `${t.discount_percentage || 0}%` : t.discounted_price ? `₪${t.discounted_price}` : "—"}
                </span>
              </div>
            ))}
          </div>
        )}

        {serviceAreas.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {serviceAreas.slice(0, 5).map((a, i) => (
              <span key={i} className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F4F6FA] text-[#6B7280] border border-[#ECEEF2]">{a}</span>
            ))}
          </div>
        )}

        {depositRequired && (
          <div className="text-fs-xs bg-[#FFF8E1] border border-[#F5C547]/40 text-[#8A6A1E] rounded-lg px-2 py-1.5 font-medium">
            נדרש פיקדון להצטרפות: ₪{depositAmount}
          </div>
        )}
      </div>
    </div>
  );
}
