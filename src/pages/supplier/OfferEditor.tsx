import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { verifyAdminFromSession } from "@/lib/auth";
import { Save, Plus, Trash2, Loader2 } from "lucide-react";
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

type DepositLimits = {
  min: number | null;
  max: number | null;
};

// UI-side tier rows (strings so empty inputs are easy to manage)
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
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [depositRequired, setDepositRequired] = useState<boolean>(false);
  const [depositAmount, setDepositAmount] = useState<string>("1000");
  const [supplierPaymentLink, setSupplierPaymentLink] = useState<string>("");
  const [supplierPaymentInstructions, setSupplierPaymentInstructions] = useState<string>("");
  const [depositLimits, setDepositLimits] = useState<DepositLimits>({ min: null, max: null });
  const [saving, setSaving] = useState(false);

  const [offerType, setOfferType] = useState<OfferType>("percentage");
  const [tiers, setTiers] = useState<TierRow[]>(defaultPercentageTiers());
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  // Closure & redemption mechanics
  const [targetParticipants, setTargetParticipants] = useState<string>("");
  const [joinDeadline, setJoinDeadline] = useState<string>("");
  const [redemptionDeadline, setRedemptionDeadline] = useState<string>("");
  const [offerTerms, setOfferTerms] = useState<string>("");
  const [restrictions, setRestrictions] = useState<string>("");
  const [maxRedemptions, setMaxRedemptions] = useState<string>("");
  const [appointmentRequired, setAppointmentRequired] = useState<boolean>(false);
  const [serviceAreasInput, setServiceAreasInput] = useState<string>("");
  const [commitmentAccepted, setCommitmentAccepted] = useState<boolean>(false);
  const [commitmentError, setCommitmentError] = useState<boolean>(false);
  const commitmentRef = useRef<HTMLDivElement | null>(null);


  // When offer type changes, swap to sensible defaults if user hasn't customized.
  const switchOfferType = (next: OfferType) => {
    if (next === offerType) return;
    setOfferType(next);
    setTiers(next === "percentage" ? defaultPercentageTiers() : defaultPriceTiers());
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        if (!session) {
          if (!cancelled) {
            setBootError("יש להתחבר כספק כדי ליצור הצעה.");
            setBootLoading(false);
          }
          return;
        }

        let s: SupplierLite | null = null;

        // Admin path: explicit supplierId query param overrides current-user lookup.
        if (adminTargetSupplierId) {
          const isAdmin = await verifyAdminFromSession();
          if (!isAdmin) {
            if (!cancelled) {
              setBootError("רק אדמין יכול ליצור הצעה לספק אחר.");
              setBootLoading(false);
            }
            return;
          }
          const r = await supabase
            .from("suppliers")
            .select("id, business_name, approval_status, categories, email, user_id")
            .eq("id", adminTargetSupplierId)
            .maybeSingle();
          s = (r.data as SupplierLite | null) ?? null;
        } else {
          const email = session.user.email ?? "";
          const byUser = await supabase
            .from("suppliers")
            .select("id, business_name, approval_status, categories, email, user_id")
            .eq("user_id", session.user.id)
            .maybeSingle();
          s = (byUser.data as SupplierLite | null) ?? null;
          if (!s && email) {
            const byEmail = await supabase
              .from("suppliers")
              .select("id, business_name, approval_status, categories, email, user_id")
              .ilike("email", email)
              .maybeSingle();
            s = (byEmail.data as SupplierLite | null) ?? null;
            if (s && !s.user_id) {
              const { error: claimError } = await (supabase as unknown as ClaimSupplierRpc).rpc("claim_supplier_profile_by_email", {
                _supplier_id: s.id,
              });
              if (!claimError) {
                s = { ...s, user_id: session.user.id, email: email || s.email };
              } else {
                console.warn("[OfferEditor] supplier claim skipped", claimError);
              }
            }
          }
        }

        const { data: paymentSettings } = await supabase
          .from("system_settings")
          .select("deposit_default_amount,deposit_min_amount,deposit_max_amount")
          .limit(1)
          .maybeSingle();

        if (!cancelled) {
          setSupplier(s);
          if (paymentSettings?.deposit_default_amount != null) {
            setDepositAmount(String(paymentSettings.deposit_default_amount));
          }
          setDepositLimits({
            min: paymentSettings?.deposit_min_amount == null ? null : Number(paymentSettings.deposit_min_amount),
            max: paymentSettings?.deposit_max_amount == null ? null : Number(paymentSettings.deposit_max_amount),
          });
          if (s?.categories?.length && categories.find((c) => c.id === s!.categories![0])) {
            setCategoryId(s.categories[0]);
          } else if (categories.length) {
            setCategoryId(categories[0].id);
          }

          // If editing, load existing deal and populate fields
          if (dealId) {
            const { data: deal } = await supabase
              .from("deals")
              .select("*")
              .eq("id", dealId)
              .maybeSingle();
            if (deal && !cancelled) {
              setTitle(deal.title ?? "");
              setDescription(deal.description ?? "");
              if (deal.category_id) setCategoryId(deal.category_id);
              setDepositRequired(!!deal.deposit_required);
              if (deal.deposit_amount != null) setDepositAmount(String(deal.deposit_amount));
              if (deal.supplier_payment_link) setSupplierPaymentLink(String(deal.supplier_payment_link));
              if (deal.supplier_payment_instructions) setSupplierPaymentInstructions(String(deal.supplier_payment_instructions));
              const rawType = (deal.offer_type ?? "percentage") as OfferType;
              setOfferType(rawType);
              const rawTiers = (Array.isArray(deal.tiers) ? deal.tiers : []) as import("@/lib/offerPricing").OfferTier[];
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
                if (firstWithPrice?.original_price != null) {
                  setUnitPrice(String(firstWithPrice.original_price));
                }
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
              setServiceAreasInput(Array.isArray(deal.service_areas) ? (deal.service_areas as string[]).join(", ") : "");
              setCommitmentAccepted(true);
            }
          }

          setBootLoading(false);
        }
      } catch (e) {
        console.error("[OfferEditor] boot error", e);
        if (!cancelled) {
          setBootError(e instanceof Error ? e.message : "שגיאה בטעינה");
          setBootLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [categories, adminTargetSupplierId, dealId]);

  const updateTier = (i: number, patch: Partial<TierRow>) => {
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  };
  const addTier = () => {
    const last = tiers[tiers.length - 1];
    const nextMin = last?.maxParticipants ? String(Number(last.maxParticipants) + 1) : "";
    setTiers((prev) => [...prev, emptyTier({ minParticipants: nextMin, label: `מדרגה ${prev.length + 1}` })]);
  };
  const removeTier = (i: number) => {
    setTiers((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
  };

  const save = async () => {
    if (saving) return;
    if (!supplier?.id) {
      toast.error("לא נמצא פרופיל ספק. השלם את פרטי הספק לפני יצירת הצעה.");
      return;
    }
    if (supplier.approval_status !== "approved" && supplier.approval_status !== "active") {
      toast.error("ניתן לפרסם הצעות רק לאחר אישור הספק על ידי מנהל המערכת.");
      return;
    }
    if (!title.trim()) {
      toast.error("יש להזין שם להצעה");
      return;
    }
    if (!categoryId) {
      toast.error("יש לבחור קטגוריה");
      return;
    }
    if (!tiers.length) {
      toast.error("יש להוסיף לפחות מדרגה אחת");
      return;
    }
    if (!commitmentAccepted) {
      setCommitmentError(true);
      commitmentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.error("יש לסמן את אישור התחייבות הספק בתחתית הטופס כדי לפרסם את ההצעה");
      return;
    }

    let cleanDepositAmount = 0;
    if (depositRequired) {
      const rawDepositAmount = depositAmount.trim();
      if (!DEPOSIT_AMOUNT_RE.test(rawDepositAmount)) {
        toast.error("סכום הפיקדון חייב להיות מספר חיובי עם עד שתי ספרות אחרי הנקודה");
        return;
      }
      cleanDepositAmount = Number(rawDepositAmount);
      if (!Number.isFinite(cleanDepositAmount) || cleanDepositAmount <= 0) {
        toast.error("סכום הפיקדון חייב להיות גדול מ-0");
        return;
      }
      if (depositLimits.min !== null && cleanDepositAmount < depositLimits.min) {
        toast.error(`סכום הפיקדון חייב להיות לפחות ${depositLimits.min}`);
        return;
      }
      if (depositLimits.max !== null && cleanDepositAmount > depositLimits.max) {
        toast.error(`סכום הפיקדון לא יכול להיות גבוה מ-${depositLimits.max}`);
        return;
      }
    }



    // Validate & build tier payload
    const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
    const cleanTiers: OfferTier[] = [];
    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      const min = num(t.minParticipants);
      if (!Number.isFinite(min) || min < 1) {
        toast.error(`מדרגה ${i + 1}: מינימום מצטרפים חייב להיות 1 ומעלה`);
        return;
      }
      let max: number | null = null;
      if (t.maxParticipants.trim() !== "") {
        const m = num(t.maxParticipants);
        if (!Number.isFinite(m) || m < min) {
          toast.error(`מדרגה ${i + 1}: מקסימום מצטרפים חייב להיות גדול או שווה למינימום`);
          return;
        }
        max = m;
      }

      if (offerType === "percentage") {
        const pct = num(t.discount_percentage);
        if (!Number.isFinite(pct) || pct < 1 || pct > 100) {
          toast.error(`מדרגה ${i + 1}: אחוז הנחה חייב להיות בין 1 ל-100`);
          return;
        }
        cleanTiers.push({
          minParticipants: min,
          maxParticipants: max,
          discount_percentage: pct,
          label: t.label.trim() || null,
        });
      } else {
        const before = num(t.original_price);
        const after = num(t.discounted_price);
        if (!Number.isFinite(before) || before <= 0) {
          toast.error(`מדרגה ${i + 1}: מחיר לפני חייב להיות מספר חיובי`);
          return;
        }
        if (!Number.isFinite(after) || after <= 0) {
          toast.error(`מדרגה ${i + 1}: מחיר אחרי חייב להיות מספר חיובי`);
          return;
        }
        if (after >= before) {
          toast.error(`מדרגה ${i + 1}: המחיר אחרי חייב להיות קטן מהמחיר לפני`);
          return;
        }
        cleanTiers.push({
          minParticipants: min,
          maxParticipants: max,
          original_price: before,
          discounted_price: after,
          label: t.label.trim() || null,
        });
      }
    }

    // Sort by min, ensure at least the lowest is for new offers
    cleanTiers.sort((a, b) => a.minParticipants - b.minParticipants);
    const firstTier = cleanTiers[0];

    if (visibilityType === "project_only" && !visibilityProjectId) {
      toast.error("בחר פרויקט שאליו ההצעה מיועדת");
      return;
    }

    type Json = import("@/integrations/supabase/types").Json;
    const serviceAreas = serviceAreasInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const payload: Record<string, unknown> = {
      supplier_id: supplier.id,
      title: title.trim(),
      description: description.trim() || null,
      category_id: categoryId,
      offer_type: offerType,
      deposit_required: depositRequired,
      deposit_amount: depositRequired ? cleanDepositAmount : 0,
      supplier_payment_link: depositRequired ? (supplierPaymentLink.trim() || null) : null,
      supplier_payment_instructions: depositRequired ? (supplierPaymentInstructions.trim() || null) : null,
      tiers: cleanTiers as unknown as Json,
      highlights: ["מחיר מיוחד", "אחריות מלאה"] as unknown as Json,
      status: "active",
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


    // Mirror first-tier values into top-level fields for backward compatibility & sorting.
    if (offerType === "percentage") {
      payload.discount_percentage = firstTier.discount_percentage ?? null;
      payload.base_price = null;
      payload.original_price = 0;
      payload.discounted_price = null;
    } else {
      payload.original_price = firstTier.original_price ?? 0;
      payload.discounted_price = firstTier.discounted_price ?? null;
      payload.discount_percentage =
        firstTier.original_price && firstTier.discounted_price
          ? Math.round(((firstTier.original_price - firstTier.discounted_price) / firstTier.original_price) * 100)
          : null;
      payload.base_price = null;
    }

    setSaving(true);
    try {
      const { error } = isEditing
        ? await supabase.from("deals").update(payload as never).eq("id", dealId!)
        : await supabase.from("deals").insert([payload as never]);
      if (error) {
        console.error("[OfferEditor] save error", error);
        const msg = error.message?.includes("row-level")
          ? "אין הרשאה לשמור הצעה. ודא שהספק אושר על ידי מנהל המערכת."
          : `שמירת ההצעה נכשלה: ${error.message}`;
        toast.error(msg);
        return;
      }
      toast.success(isEditing ? "ההצעה עודכנה בהצלחה!" : "ההצעה נשמרה בהצלחה!");
      navigate("/supplier/offers", { replace: true });
    } catch (err: unknown) {
      console.error("[OfferEditor] save exception", err);
      toast.error("אירעה שגיאה בשמירת ההצעה. נסה שוב.");
    } finally {
      setSaving(false);
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
          description="לא נמצא פרופיל ספק עבור החשבון שלך. השלם את הפרטים כדי להתחיל לפרסם הצעות."
          action={
            <Button onClick={() => navigate("/supplier/profile/edit")} className="h-11 px-5 rounded-xl bg-[#0E6B5A] text-white font-bold">
              השלמת פרטי ספק
            </Button>
          }
        />
        <BottomNav role="supplier" />
      </MobileShell>
    );
  }

  if (!categories.length) {
    return (
      <MobileShell>
        <BackHeader title="הצעה חדשה" subtitle="לא ניתן ליצור הצעה כרגע" />
        <EmptyState
          title="חסרות קטגוריות"
          description="חסרות קטגוריות במערכת. פנה למנהל המערכת."
          action={
            <Button onClick={() => navigate("/supplier", { replace: true })} className="h-12 rounded-2xl w-full">
              חזרה לדשבורד הספק
            </Button>
          }
        />
        <BottomNav role="supplier" />
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <BackHeader title={isEditing ? "עריכת הצעה" : "הצעה חדשה"} subtitle="הגדירו מדרגות הנחה לפי כמות מצטרפים" />

      <div className="px-5 -mt-4 relative z-10 space-y-4">
        <div className="gb-card p-4 space-y-3">
          <Field label="שם ההצעה">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="לדוגמה: שדרוג מטבח פרימיום" className="h-11 rounded-xl" />
          </Field>
          <Field label="תיאור">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="תארו את ההצעה..." className="rounded-xl min-h-[80px]" />
          </Field>
          <Field label="קטגוריה">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm">
              {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </Field>
          <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={depositRequired}
                onChange={(e) => setDepositRequired(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-sm font-bold text-foreground">דורש פיקדון להצטרפות</span>
            </label>
            {depositRequired && (
              <div className="space-y-3">
                <div>
                  <div className="text-fs-xs font-bold text-muted-foreground mb-1">סכום הפיקדון (₪)</div>
                  <Input
                    type="number"
                    min={1}
                    step="0.01"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                  <p className="text-fs-xs text-muted-foreground mt-1">
                    ניתן להזין כל סכום תקין, למשל 1346 או 1346.50.
                    {depositLimits.min !== null ? ` מינימום: ${depositLimits.min}.` : ""}
                    {depositLimits.max !== null ? ` מקסימום: ${depositLimits.max}.` : ""}
                  </p>
                </div>
                <div>
                  <div className="text-fs-xs font-bold text-muted-foreground mb-1">קישור תשלום ישיר אליך *</div>
                  <Input
                    type="url"
                    placeholder="https://payboxapp.page.link/... או https://pay.bit.co.il/..."
                    value={supplierPaymentLink}
                    onChange={(e) => setSupplierPaymentLink(e.target.value)}
                    className="h-11 rounded-xl"
                    dir="ltr"
                  />
                  <p className="text-fs-xs text-muted-foreground mt-1 leading-relaxed">
                    PayBox / Bit / Tranzila / כל קישור אחר. <b>הפיקדון משולם ישירות אליך</b> — GroupBuild לא גובה ולא מחזיקה את כספי הפיקדון.
                  </p>
                </div>
                <div>
                  <div className="text-fs-xs font-bold text-muted-foreground mb-1">הוראות נוספות (אופציונלי)</div>
                  <Textarea
                    placeholder='לדוגמה: "ניתן גם להעביר ב-Bit ל-050-1234567 / שם משפחה"'
                    value={supplierPaymentInstructions}
                    onChange={(e) => setSupplierPaymentInstructions(e.target.value)}
                    className="rounded-xl min-h-[60px]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Images */}
        <div className="gb-card p-4">
          <h3 className="font-bold text-sm mb-3">תמונות ההצעה</h3>
          <DealImagesEditor
            cover={coverImage}
            gallery={galleryImages}
            onChange={({ cover, gallery }) => {
              setCoverImage(cover);
              setGalleryImages(gallery);
            }}
          />
          <p className="text-fs-xs text-muted-foreground mt-3 leading-relaxed">
            הצעות עם תמונות נראות פרימיום ומגדילות משמעותית את ההצטרפויות.
          </p>
        </div>

        {/* Offer type selector */}
        <div className="gb-card p-4 space-y-3">
          <h3 className="font-bold text-sm">סוג הצעה</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => switchOfferType("percentage")}
              className={`h-12 rounded-xl border-2 text-sm font-bold transition-smooth ${
                offerType === "percentage"
                  ? "border-[#1F2937] bg-[#F4F6FA] text-[#1F2937]"
                  : "border-[#ECEEF2] bg-white text-[#6B7280]"
              }`}
            >
              אחוז הנחה
            </button>
            <button
              type="button"
              onClick={() => switchOfferType("price_comparison")}
              className={`h-12 rounded-xl border-2 text-sm font-bold transition-smooth ${
                offerType === "price_comparison"
                  ? "border-[#1F2937] bg-[#F4F6FA] text-[#1F2937]"
                  : "border-[#ECEEF2] bg-white text-[#6B7280]"
              }`}
            >
              מחיר לפני ואחרי
            </button>
          </div>
          <p className="text-fs-xs text-muted-foreground leading-relaxed">
            ככל שיותר דיירים מצטרפים — ההנחה גדלה.
          </p>
        </div>

        {/* Visibility */}
        <div className="gb-card p-4 space-y-3">
          <h3 className="font-bold text-sm">למי ההצעה מיועדת?</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setVisibilityType("public")}
              className={`h-12 rounded-xl border-2 text-sm font-bold transition-smooth ${
                visibilityType === "public"
                  ? "border-[#1F2937] bg-[#F4F6FA] text-[#1F2937]"
                  : "border-[#ECEEF2] bg-white text-[#6B7280]"
              }`}
            >
              לכל הדיירים
            </button>
            <button
              type="button"
              onClick={() => setVisibilityType("project_only")}
              className={`h-12 rounded-xl border-2 text-sm font-bold transition-smooth ${
                visibilityType === "project_only"
                  ? "border-[#1F2937] bg-[#F4F6FA] text-[#1F2937]"
                  : "border-[#ECEEF2] bg-white text-[#6B7280]"
              }`}
            >
              לפרויקט מסוים
            </button>
          </div>
          {visibilityType === "project_only" && (
            <div>
              <div className="text-fs-xs font-bold text-muted-foreground mb-1">בחר פרויקט</div>
              <select
                value={visibilityProjectId}
                onChange={(e) => setVisibilityProjectId(e.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
              >
                <option value="">— בחר פרויקט —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} · {p.city}</option>
                ))}
              </select>
              <p className="text-fs-xs text-muted-foreground mt-1">
                רק דיירים המשויכים לפרויקט זה יראו את ההצעה.
              </p>
            </div>
          )}
        </div>

        {/* Tiers builder */}
        <div className="gb-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">מדרגות לפי כמות מצטרפים</h3>
            <span className="text-fs-xs text-muted-foreground">{tiers.length} מדרגות</span>
          </div>

          <div className="space-y-3">
            {tiers.map((t, i) => (
              <div key={i} className="rounded-[16px] border border-[#ECEEF2] bg-[#F4F6FA] p-3">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <Input
                    value={t.label}
                    onChange={(e) => updateTier(i, { label: e.target.value })}
                    placeholder={`מדרגה ${i + 1}`}
                    className="h-9 rounded-lg flex-1 bg-card text-sm font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => removeTier(i)}
                    disabled={tiers.length <= 1}
                    className="h-9 w-9 shrink-0 rounded-lg bg-card border border-border flex items-center justify-center text-destructive disabled:opacity-30"
                    aria-label="הסר מדרגה"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <Mini label="מינ׳ מצטרפים">
                    <Input
                      type="number"
                      value={t.minParticipants}
                      onChange={(e) => updateTier(i, { minParticipants: e.target.value })}
                      className="h-9 rounded-lg"
                      placeholder="1"
                    />
                  </Mini>
                  <Mini label="מקס׳ מצטרפים (אופציונלי)">
                    <Input
                      type="number"
                      value={t.maxParticipants}
                      placeholder="∞"
                      onChange={(e) => updateTier(i, { maxParticipants: e.target.value })}
                      className="h-9 rounded-lg"
                    />
                  </Mini>
                </div>

                {offerType === "percentage" ? (
                  <Mini label="אחוז הנחה (1-100)">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={t.discount_percentage}
                      onChange={(e) => updateTier(i, { discount_percentage: e.target.value })}
                      className="h-9 rounded-lg"
                      placeholder="10"
                    />
                  </Mini>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Mini label="מחיר לפני (₪)">
                      <Input
                        type="number"
                        value={t.original_price}
                        onChange={(e) => updateTier(i, { original_price: e.target.value })}
                        className="h-9 rounded-lg"
                        placeholder="5000"
                      />
                    </Mini>
                    <Mini label="מחיר אחרי (₪)">
                      <Input
                        type="number"
                        value={t.discounted_price}
                        onChange={(e) => updateTier(i, { discounted_price: e.target.value })}
                        className="h-9 rounded-lg"
                        placeholder="4500"
                      />
                    </Mini>
                  </div>
                )}
              </div>
            ))}
          </div>

          <Button
            type="button"
            onClick={addTier}
            variant="outline"
            className="w-full h-11 rounded-xl border-dashed border-2"
          >
            <Plus className="h-4 w-4 ml-2" />
            הוסף מדרגה
          </Button>
        </div>

        {/* Closure mechanics */}
        <div className="gb-card p-4 space-y-3">
          <h3 className="font-bold text-sm">סגירת ההצעה ומימוש</h3>
          <div className="grid grid-cols-2 gap-2">
            <Field label="יעד משתתפים לסגירה">
              <Input type="number" min={1} value={targetParticipants} onChange={(e) => setTargetParticipants(e.target.value)} placeholder="לדוגמה 20" className="h-11 rounded-xl" />
            </Field>
            <Field label="מקס׳ מימושים (אופציונלי)">
              <Input type="number" min={1} value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} placeholder="ללא הגבלה" className="h-11 rounded-xl" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="תאריך אחרון להצטרפות">
              <Input type="date" dir="ltr" value={joinDeadline} onChange={(e) => setJoinDeadline(e.target.value)} className="h-9 rounded-xl max-w-[140px] px-2 text-sm text-left" />
            </Field>
            <Field label="תאריך אחרון למימוש">
              <Input type="date" dir="ltr" value={redemptionDeadline} onChange={(e) => setRedemptionDeadline(e.target.value)} className="h-9 rounded-xl max-w-[140px] px-2 text-sm text-left" />
            </Field>
          </div>
          <Field label="אזורי שירות (מופרדים בפסיק)">
            <Input value={serviceAreasInput} onChange={(e) => setServiceAreasInput(e.target.value)} placeholder="תל אביב, רמת גן, חיפה" className="h-11 rounded-xl" />
          </Field>
          <Field label="תנאי הצעה">
            <Textarea value={offerTerms} onChange={(e) => setOfferTerms(e.target.value)} placeholder="מה נכלל בהצעה? תנאי תשלום? אחריות?" className="rounded-xl min-h-[70px]" />
          </Field>
          <Field label="הגבלות / חריגים">
            <Textarea value={restrictions} onChange={(e) => setRestrictions(e.target.value)} placeholder="מה לא נכלל? חריגים?" className="rounded-xl min-h-[60px]" />
          </Field>
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input type="checkbox" checked={appointmentRequired} onChange={(e) => setAppointmentRequired(e.target.checked)} className="h-4 w-4 accent-primary" />
            <span className="text-sm text-foreground">נדרשת קביעת פגישה לפני מימוש</span>
          </label>
        </div>

        {/* Supplier commitment - required */}
        <div
          ref={commitmentRef}
          className={`gb-card p-4 transition-colors ${
            commitmentError && !commitmentAccepted
              ? "border border-destructive bg-destructive/5 animate-pulse"
              : "border border-[#0E6B5A]/40 bg-[#FFF8E1]/40"
          }`}
        >
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={commitmentAccepted}
              onChange={(e) => { setCommitmentAccepted(e.target.checked); if (e.target.checked) setCommitmentError(false); }}
              className="h-5 w-5 mt-0.5 accent-primary shrink-0"
            />
            <div className="text-sm leading-relaxed">
              <span className="font-bold text-foreground">התחייבות הספק <span className="text-destructive">*</span></span>
              <p className="text-xs text-muted-foreground mt-1">
                אני מתחייב לכבד את ההצעה הזו לכל דייר זכאי, לעמוד בלוחות הזמנים שהוגדרו, ולמסור שירות איכותי. אי-עמידה בהתחייבות עלולה לגרור השעיה מהמערכת.
              </p>
              {commitmentError && !commitmentAccepted && (
                <p className="text-xs font-bold text-destructive mt-2">חובה לסמן את ההתחייבות כדי לפרסם את ההצעה</p>
              )}
            </div>
          </label>
        </div>

        <Button onClick={save} disabled={saving} className="w-full h-12 rounded-[16px] bg-[#0E6B5A] hover:bg-[#0E6B5A]/90 text-white font-bold shadow-[0_8px_20px_-10px_rgba(10,31,61,0.45)] disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Save className="h-4 w-4 ml-2" />}
          {saving ? "שומר..." : isEditing ? "עדכון ההצעה" : "שמירת ההצעה"}
        </Button>

      </div>

      <BottomNav role="supplier" />
    </MobileShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-fs-xs font-bold text-muted-foreground mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function Mini({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-fs-xs text-muted-foreground mb-1">{label}</div>
      {children}
    </div>
  );
}
