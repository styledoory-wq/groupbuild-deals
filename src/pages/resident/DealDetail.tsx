import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Star, Shield, Sparkles, Loader2, ArrowRight, ShieldCheck, Tag, Users, TrendingUp, MessageCircle, Phone, CheckCircle2, CreditCard, Clock } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { normalizeWhatsappUrl } from "@/lib/whatsapp";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { SupplierRatingBadge } from "@/components/reviews/SupplierRatingBadge";
import { useApp } from "@/store/AppStore";
import { getFriendlyLoadError } from "@/lib/safeAsync";
import {
  describeOffer,
  describeTier,
  getActiveTier,
  getNextTier,
  ils,
  tierRange,
  tierShortValue,
  type OfferTier,
  type OfferType,
} from "@/lib/offerPricing";

interface DealRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  category_id: string | null;
  supplier_id: string;
  offer_type: string | null;
  original_price: number | null;
  discounted_price: number | null;
  discount_percentage: number | null;
  base_price: number | null;
  tiers: OfferTier[] | null;
  ends_at: string | null;
  deposit_required: boolean | null;
  deposit_amount: number | null;
  cover_image_url: string | null;
  gallery_images: string[] | null;
}

interface SupplierRow {
  id: string;
  business_name: string;
  logo_url: string | null;
  approval_status: string;
  service_areas: string[] | null;
  phone: string | null;
  whatsapp_url: string | null;
}

export default function DealDetail() {
  const { dealId } = useParams();
  const { categories } = useApp();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deal, setDeal] = useState<DealRow | null>(null);
  const [supplier, setSupplier] = useState<SupplierRow | null>(null);
  const [interested, setInterested] = useState(false);
  const [interestStatus, setInterestStatus] = useState<string | null>(null);
  const [interestDepositStatus, setInterestDepositStatus] = useState<string>("none");
  const [submittingInterest, setSubmittingInterest] = useState(false);
  const [participantCount, setParticipantCount] = useState<number>(0);
  const [isGuest, setIsGuest] = useState<boolean>(false);

  // Join modal state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [joinCondition, setJoinCondition] = useState<"flexible" | "conditional">("flexible");
  const [joinForm, setJoinForm] = useState({
    full_name: "",
    phone: "",
    city: "",
    project_name: "",
    notes: "",
    estimated_quantity: "",
  });

  const loadParticipantCount = async (id: string) => {
    // Pricing tier is driven by PAID deposits only — pending interests do not count.
    const { data, error: rpcErr } = await supabase.rpc("get_deal_paid_count", { _deal_id: id });
    if (!rpcErr && typeof data === "number") setParticipantCount(data);
  };

  useEffect(() => {
    let cancelled = false;
    if (!dealId) return;
    const safety = window.setTimeout(() => {
      if (!cancelled) {
        setError("טעינת העסקה נמשכת יותר מדי זמן. נסו לרענן את המסך.");
        setLoading(false);
      }
    }, 12000);
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: dealData, error: dErr } = await supabase
          .from("deals")
          .select(
            "id,title,description,status,category_id,supplier_id,offer_type,original_price,discounted_price,discount_percentage,base_price,tiers,ends_at,deposit_required,deposit_amount,cover_image_url,gallery_images",
          )
          .eq("id", dealId)
          .eq("is_deleted", false)
          .maybeSingle();
        if (dErr) throw dErr;
        if (!dealData) {
          if (!cancelled) {
            setError("העסקה לא נמצאה");
            setLoading(false);
          }
          return;
        }
        const d = dealData as unknown as DealRow;
        if (!cancelled) setDeal(d);

        const { data: supData } = await supabase
          .from("suppliers")
          .select("id,business_name,logo_url,approval_status,service_areas,phone,whatsapp_url")
          .eq("id", d.supplier_id)
          .maybeSingle();
        if (!cancelled) setSupplier((supData as SupplierRow | null) ?? null);

        await loadParticipantCount(d.id);

        const { data: session } = await supabase.auth.getSession();
        if (!cancelled) setIsGuest(!session.session);
        if (session.session) {
          const { data: interest } = await supabase
            .from("deal_interests")
            .select("id,status,deposit_status")
            .eq("user_id", session.session.user.id)
            .eq("deal_id", d.id)
            .eq("is_deleted", false)
            .maybeSingle();
          if (!cancelled && interest) {
            setInterested(true);
            setInterestStatus(interest.status);
            setInterestDepositStatus(interest.deposit_status ?? "none");
          }

          // Prefill form from profile
          const { data: prof } = await supabase
            .from("profiles")
            .select("full_name,phone,city")
            .eq("id", session.session.user.id)
            .maybeSingle();
          if (!cancelled && prof) {
            setJoinForm((f) => ({
              ...f,
              full_name: f.full_name || (prof.full_name ?? ""),
              phone: f.phone || (prof.phone ?? ""),
              city: f.city || (prof.city ?? ""),
            }));
          }
        }
      } catch (e) {
        console.error("[DealDetail] load error", e);
        if (!cancelled) setError(getFriendlyLoadError(e, "שגיאה בטעינת העסקה"));
      } finally {
        window.clearTimeout(safety);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(safety);
    };
  }, [dealId]);

  // Realtime: refresh paid count whenever a deposit row for this deal changes.
  useEffect(() => {
    if (!dealId) return;
    const refreshDepositState = async () => {
      await loadParticipantCount(dealId);
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      if (!uid) return;
      const { data: interest } = await supabase
        .from("deal_interests")
        .select("status,deposit_status")
        .eq("user_id", uid)
        .eq("deal_id", dealId)
        .eq("is_deleted", false)
        .maybeSingle();
      if (interest) {
        setInterestStatus(interest.status);
        setInterestDepositStatus(interest.deposit_status ?? "none");
      }
    };
    const channel = supabase
      .channel(`deal-deposits-${dealId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deposits", filter: `deal_id=eq.${dealId}` },
        () => { void refreshDepositState(); },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [dealId]);

  const handleJoinClick = async () => {
    if (!deal) return;
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      window.location.href = `/auth?redirect=/resident/deals/${deal.id}`;
      return;
    }
    setAcceptedTerms(false);
    setShowJoinModal(true);
  };

  const submitJoin = async () => {
    if (!deal) return;
    if (!joinForm.full_name.trim() || !joinForm.phone.trim()) {
      toast.error("נא למלא שם וטלפון");
      return;
    }
    if (!acceptedTerms) {
      toast.error("יש לאשר את התקנון ותנאי השימוש");
      return;
    }
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      toast.error("יש להתחבר כדי להצטרף להצעה");
      return;
    }
    const depositRequired = !!deal.deposit_required && Number(deal.deposit_amount ?? 0) > 0;
    const tiersNow = Array.isArray(deal.tiers) ? deal.tiers : [];
    const activeTierNow = tiersNow.length > 0 ? getActiveTier(tiersNow, participantCount) : null;
    setSubmittingInterest(true);
    try {
      const qty = joinForm.estimated_quantity.trim()
        ? Number(joinForm.estimated_quantity)
        : null;
      const payload = {
        user_id: session.session.user.id,
        deal_id: deal.id,
        status: depositRequired ? "pending_deposit" : "interested",
        deposit_required: depositRequired,
        deposit_amount: depositRequired ? Number(deal.deposit_amount ?? 0) : 0,
        deposit_status: depositRequired ? "pending" : "none",
        full_name: joinForm.full_name.trim(),
        phone: joinForm.phone.trim(),
        city: joinForm.city.trim() || null,
        project_name: joinForm.project_name.trim() || null,
        notes: joinForm.notes.trim() || null,
        estimated_quantity: qty && !Number.isNaN(qty) ? qty : null,
        terms_accepted_at: new Date().toISOString(),
        lead_status: "new",
        join_condition: joinCondition,
        min_tier_locked: joinCondition === "conditional" && activeTierNow ? activeTierNow.minParticipants : null,
        conditional_status: "ok",
      };
      const { error: insErr } = await supabase.from("deal_interests").insert(payload);
      if (insErr && !insErr.message.toLowerCase().includes("duplicate")) throw insErr;

      // Create a real pending deposit row (only if one doesn't already exist for this user+deal).
      if (depositRequired) {
        const { data: existingDep } = await supabase
          .from("deposits")
          .select("id,status")
          .eq("user_id", session.session.user.id)
          .eq("deal_id", deal.id)
          .eq("is_deleted", false)
          .in("status", ["pending", "paid"])
          .maybeSingle();
        if (!existingDep) {
          // amount + status are enforced server-side by the integrity trigger.
          const { error: depErr } = await supabase.from("deposits").insert({
            user_id: session.session.user.id,
            deal_id: deal.id,
            amount: 0, // overridden by trigger from deals.deposit_amount
            currency: "ILS",
            payment_provider: "grow",
            status: "pending",
            metadata: { source: "resident_join", deal_title: deal.title },
          });
          if (depErr) {
            console.error("[deposit_insert_failed]", depErr);
            await supabase.from("deposit_attempt_logs").insert({
              user_id: session.session.user.id,
              deal_id: deal.id,
              attempted_amount: Number(deal.deposit_amount ?? 0),
              reason: depErr.message ?? "unknown",
              metadata: { code: depErr.code ?? null, source: "resident_join" },
            });
            throw depErr;
          }
        }
      }

      setInterested(true);
      setInterestStatus(depositRequired ? "pending_deposit" : "interested");
      setInterestDepositStatus(depositRequired ? "pending" : "none");
      setShowJoinModal(false);
      toast.success(
        depositRequired
          ? "בקשת ההצטרפות נקלטה, ממתינה לאישור פיקדון"
          : "נרשמת בהצלחה! הספק יצור איתך קשר בהקדם.",
      );
      await loadParticipantCount(deal.id);

      // In-app notification to the supplier (best-effort, don't break the flow).
      try {
        const { data: supRow } = await supabase
          .from("suppliers")
          .select("user_id,business_name")
          .eq("id", deal.supplier_id)
          .maybeSingle();
        if (supRow?.user_id) {
          const detailsLine = [
            payload.full_name,
            payload.phone,
            payload.city,
            payload.project_name,
          ].filter(Boolean).join(" · ");
          await supabase.from("notifications").insert({
            user_id: supRow.user_id,
            type: "lead",
            title: `ליד חדש להצעה: ${deal.title}`,
            body: detailsLine || "דייר חדש הביע עניין בהצעה",
            link: "/supplier/leads",
            metadata: {
              deal_id: deal.id,
              deal_title: deal.title,
              full_name: payload.full_name,
              phone: payload.phone,
              city: payload.city,
              project_name: payload.project_name,
              estimated_quantity: payload.estimated_quantity,
              category_id: deal.category_id,
            },
          });
        }
      } catch (notifyErr) {
        console.warn("[supplier_notification_failed]", notifyErr);
      }

      supabase.functions
        .invoke("notify-admin", {
          body: {
            event: "deal_interest",
            title: depositRequired ? "הצטרפות להצעה (ממתין לפיקדון)" : "מתעניין חדש בעסקה",
            details: {
              deal_id: deal.id,
              deal_title: deal.title,
              deposit_required: depositRequired,
              deposit_amount: depositRequired ? Number(deal.deposit_amount ?? 0) : 0,
              user_id: session.session.user.id,
              user_email: session.session.user.email,
              full_name: payload.full_name,
              phone: payload.phone,
              city: payload.city,
              project_name: payload.project_name,
            },
          },
        })
        .catch(() => {});

      // Send Resend email to supplier about new lead
      if (deal.supplier_id) {
        supabase.functions
          .invoke("send-email", {
            body: {
              type: "new_lead",
              supplier_id: deal.supplier_id,
              deal_title: deal.title,
              lead_name: payload.full_name,
              lead_phone: payload.phone,
              lead_city: payload.city,
              project_name: payload.project_name,
            },
          })
          .catch((e) => console.warn("[email] new_lead failed", e));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירה נכשלה");
    } finally {
      setSubmittingInterest(false);
    }
  };

  if (loading) {
    return (
      <MobileShell>
        <PageHeader title="טוען עסקה..." back />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
        <BottomNav role="resident" />
      </MobileShell>
    );
  }

  if (error || !deal) {
    return (
      <MobileShell>
        <PageHeader title="עסקה לא נמצאה" back />
        <div className="px-5 mt-6">
          <div className="gb-card p-6 text-center">
            <p className="text-sm font-bold text-foreground">{error ?? "העסקה לא נמצאה"}</p>
            <Link to="/resident/deals">
              <Button variant="outline" className="mt-4">
                <ArrowRight className="h-4 w-4 ml-2" />
                חזרה לעסקאות
              </Button>
            </Link>
          </div>
        </div>
        <BottomNav role="resident" />
      </MobileShell>
    );
  }

  const offerType = ((deal.offer_type as OfferType | null) ?? "percentage") as OfferType;
  const tiers = Array.isArray(deal.tiers) ? deal.tiers : [];
  const display = describeOffer(
    {
      offer_type: offerType,
      original_price: deal.original_price,
      discounted_price: deal.discounted_price,
      discount_percentage: deal.discount_percentage,
      base_price: deal.base_price,
      tiers,
    },
    participantCount,
  );
  const activeTier = tiers.length > 0 ? getActiveTier(tiers, participantCount) : null;
  const nextTier = tiers.length > 0 ? getNextTier(tiers, participantCount) : null;
  const peopleNeeded = nextTier ? Math.max(0, nextTier.minParticipants - participantCount) : 0;
  // Progress target: next tier's threshold, or the highest tier's min if maxed out.
  const progressTarget = nextTier
    ? nextTier.minParticipants
    : tiers.length > 0
      ? Math.max(...tiers.map((t) => t.minParticipants))
      : 0;
  const category = categories.find((c) => c.id === deal.category_id);
  const depositRequired = !!deal.deposit_required && Number(deal.deposit_amount ?? 0) > 0;

  return (
    <MobileShell>
      {/* HERO — premium gradient with glow & live badges */}
      <div className="gb-hero-premium px-5 pt-6 pb-12 rounded-b-[36px]">
        <div className="absolute -top-16 -left-16 h-56 w-56 rounded-full bg-gold/15 blur-3xl pointer-events-none" />
        <div className="absolute top-10 -right-10 h-40 w-40 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />

        <PageHeader title="" subtitle="" back variant="navy" />

        <div className="-mt-10 relative">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-success/15 text-success border border-success/30">
              <span className="gb-live-dot" />
              עסקה חיה
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-gold/15 text-gold-light border border-gold/30">
              <Sparkles className="h-3 w-3" />
              מחיר קבוצתי
            </span>
            {category?.name && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/10 text-primary-foreground/85 border border-white/15">
                {category.icon ?? "🏷️"} {category.name}
              </span>
            )}
          </div>

          <h1 className="text-[26px] font-extrabold leading-[1.15] mb-2 text-primary-foreground">
            {deal.title}
          </h1>
          <div className="gb-divider-gold mb-3" />
          {deal.description && (
            <p className="text-primary-foreground/80 text-[13px] leading-relaxed whitespace-pre-line line-clamp-4">
              {deal.description}
            </p>
          )}

          {/* Live counters on glass */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="gb-glass px-3 py-2.5 text-center">
              <div className="text-[10px] text-primary-foreground/65 mb-0.5">הצטרפו</div>
              <div className="text-base font-extrabold text-gold-light">{participantCount}</div>
            </div>
            <div className="gb-glass px-3 py-2.5 text-center">
              <div className="text-[10px] text-primary-foreground/65 mb-0.5">למדרגה הבאה</div>
              <div className="text-base font-extrabold text-gold-light">
                {nextTier ? `+${peopleNeeded}` : "✓"}
              </div>
            </div>
            <div className="gb-glass px-3 py-2.5 text-center">
              <div className="text-[10px] text-primary-foreground/65 mb-0.5">סטטוס</div>
              <div className="text-[11px] font-extrabold text-success inline-flex items-center gap-1 mt-0.5">
                <span className="gb-live-dot" /> פעיל
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PRICING — big number, savings, FOMO */}
      <div className="px-5 -mt-8 relative z-10 mb-4">
        <div className="gb-card-premium p-5 gb-float-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
              המחיר הנוכחי
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success bg-success/10 border border-success/30 rounded-full px-2 py-0.5">
              <span className="gb-live-dot" />
              הנחה חיה
            </span>
          </div>

          <div className="text-[40px] font-extrabold text-primary leading-none tracking-tight">
            {display.headline}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {display.savings ? (
              <div className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-success bg-success/10 border border-success/30 rounded-full px-3 py-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                {display.savings.startsWith("חיסכון")
                  ? `חסכת ${display.savings.replace("חיסכון:", "").trim()}`
                  : display.savings}
              </div>
            ) : display.discountPercent ? (
              <div className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-success bg-success/10 border border-success/30 rounded-full px-3 py-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                חוסכים {display.discountPercent}% מול מחיר אישי
              </div>
            ) : null}
            {nextTier && peopleNeeded > 0 && peopleNeeded <= 3 && (
              <div className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-primary bg-gold/15 border border-gold/40 rounded-full px-3 py-1.5">
                🔥 עוד {peopleNeeded} {peopleNeeded === 1 ? "דייר" : "דיירים"} והמחיר יורד
              </div>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
            ככל שיותר דיירים מצטרפים — ההנחה גדלה. המחיר מתעדכן בזמן אמת.
          </p>
        </div>
      </div>

      {/* LIVE PROGRESS */}
      <div className="px-5 mb-4">
        <div className="gb-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] font-bold text-foreground">
              <Users className="h-4 w-4 text-gold" />
              {progressTarget > 0
                ? `${participantCount} מתוך ${progressTarget} הצטרפו`
                : "כמות מצטרפים כרגע"}
            </div>
            <div className="text-xl font-extrabold text-primary">{participantCount}</div>
          </div>
          {progressTarget > 0 && (
            <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-gold to-gold-light rounded-full transition-all duration-700 relative overflow-hidden"
                style={{
                  width: `${Math.min(100, Math.round((participantCount / progressTarget) * 100))}%`,
                }}
              >
                <div className="absolute inset-0 gb-shimmer" />
              </div>
            </div>
          )}
          {nextTier ? (
            <div className="rounded-xl bg-gradient-to-l from-gold/15 to-gold/5 border border-gold/40 px-3 py-2.5 flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-gold mt-0.5 shrink-0" />
              <div className="text-[12px] text-foreground leading-relaxed">
                עוד <span className="font-extrabold text-primary">{peopleNeeded}</span>{" "}
                {peopleNeeded === 1 ? "דייר" : "דיירים"} והמחיר יורד ל-
                <span className="font-extrabold text-primary">
                  {tierShortValue(offerType, nextTier)}
                </span>
              </div>
            </div>
          ) : tiers.length > 0 ? (
            <div className="rounded-xl bg-success/10 border border-success/30 px-3 py-2.5 text-[12px] font-bold text-success">
              ✓ הגעתם למדרגה הטובה ביותר
            </div>
          ) : null}
        </div>
      </div>

      {/* DEPOSIT — premium trust card */}
      {depositRequired && (
        <div className="px-5 mb-4">
          <div className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 via-card to-card px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="text-[13px] font-extrabold text-foreground">
                    פיקדון להבטחת רצינות
                  </div>
                  <div className="text-[14px] font-extrabold text-primary">
                    {ils(Number(deal.deposit_amount))}
                  </div>
                </div>
                <ul className="text-[11.5px] text-muted-foreground leading-relaxed space-y-0.5">
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-success" /> פיקדון לאימות רצינות בלבד</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-success" /> מאושר ידנית על ידי מנהל המערכת</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-success" /> נועד לשמור על איכות ההצעות</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TIERS LADDER — modern timeline */}
      {tiers.length > 0 && (
        <section className="px-5 mb-5">
          <h2 className="text-[13px] font-extrabold text-foreground mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold" />
            סולם הנחות קבוצתיות
          </h2>
          <div className="space-y-2">
            {tiers.map((t, idx) => {
              const td = describeTier(offerType, t);
              const isActive = !!activeTier && t.minParticipants === activeTier.minParticipants;
              const isPast = activeTier ? t.minParticipants < activeTier.minParticipants : false;
              return (
                <div
                  key={idx}
                  className={cn(
                    "relative rounded-2xl border px-4 py-3 flex items-center gap-3 transition-smooth",
                    isActive
                      ? "border-gold/60 bg-gradient-to-l from-gold/15 to-card shadow-gold"
                      : isPast
                      ? "border-success/30 bg-success/5"
                      : "border-border bg-card hover:border-gold/30",
                  )}
                >
                  <div
                    className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center text-[12px] font-extrabold shrink-0 border",
                      isActive
                        ? "bg-gradient-gold text-primary border-gold"
                        : isPast
                        ? "bg-success/15 text-success border-success/40"
                        : "bg-muted text-muted-foreground border-border",
                    )}
                  >
                    {isPast ? "✓" : idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-muted-foreground font-bold">{tierRange(t)}</div>
                    <div className="text-base font-extrabold text-primary leading-tight">
                      {td.headline}
                    </div>
                  </div>
                  {isActive && (
                    <span className="text-[10px] font-extrabold px-2 py-1 rounded-full bg-primary text-primary-foreground inline-flex items-center gap-1">
                      <span className="gb-live-dot" />
                      פעיל עכשיו
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SUPPLIER — premium card */}
      {supplier && (
        <section className="px-5 mb-28">
          <h2 className="text-[13px] font-extrabold text-foreground mb-3">הספק שמאחורי ההצעה</h2>
          <Link
            to={`/suppliers/${supplier.id}`}
            className="block gb-card-premium p-4 hover:border-gold/50 transition-smooth"
          >
            <div className="flex items-start gap-3">
              <div className="relative shrink-0">
                <SupplierLogo name={supplier.business_name} logoUrl={supplier.logo_url} size="lg" />
                {supplier.approval_status === "approved" && (
                  <div className="absolute -bottom-1 -left-1 h-5 w-5 rounded-full bg-gradient-gold border-2 border-card flex items-center justify-center">
                    <ShieldCheck className="h-3 w-3 text-primary" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <h3 className="font-extrabold text-foreground truncate text-[15px]">
                    {supplier.business_name}
                  </h3>
                  {supplier.approval_status === "approved" && (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/30">
                      מאומת
                    </span>
                  )}
                </div>
                <div className="text-[12px] text-muted-foreground">
                  <SupplierRatingBadge supplierId={supplier.id} showEmpty />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-foreground inline-flex items-center gap-1">
                    <Clock className="h-3 w-3 text-gold" /> מענה מהיר
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-foreground inline-flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-gold" /> ספק מאומת
                  </span>
                  {supplier.service_areas && supplier.service_areas.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-foreground">
                      📍 {supplier.service_areas.length} אזורי שירות
                    </span>
                  )}
                </div>
              </div>
              <Star className="h-4 w-4 text-gold shrink-0" />
            </div>
          </Link>
        </section>
      )}

      {/* Spacer so page content is not hidden behind the fixed CTA + BottomNav */}
      <div aria-hidden className="h-40" />

      {/* CTA — sits above BottomNav (~80px tall incl. safe-area) */}
      <div className="fixed bottom-20 inset-x-0 z-50 flex justify-center pointer-events-none">
        <div className="pointer-events-auto w-full max-w-[480px] px-4 pt-4 pb-2 bg-gradient-to-t from-background via-background to-background/0">
          <div className="gb-card p-3 shadow-elevated space-y-2">
            {interested ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-success bg-success/10 rounded-xl py-3 px-4">
                  <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                  <span>הצטרפת להצעה בהצלחה</span>
                </div>
                {interestStatus === "pending_deposit" && interestDepositStatus !== "paid" && (
                  <div className="flex items-start gap-2 text-xs font-bold text-foreground bg-gold/10 border border-gold/30 rounded-xl py-3 px-4">
                    <Clock className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                    <span className="leading-relaxed">
                      הצטרפות כרוכה בפיקדון אשר יאושר ידנית על ידי מנהל המערכת
                    </span>
                  </div>
                )}
                {interestDepositStatus === "paid" && (
                  <div className="flex items-center gap-2 text-xs font-bold text-success bg-success/10 rounded-xl py-2.5 px-4">
                    <CreditCard className="h-4 w-4 text-success shrink-0" />
                    <span>פיקדון שולם — המקום שלך מובטח ✨</span>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground text-center">הספק יצור איתך קשר בהקדם לתיאום פרטים</p>
              </div>
            ) : (
              <Button
                onClick={handleJoinClick}
                disabled={submittingInterest}
                className="w-full h-12 rounded-2xl bg-gradient-gold text-primary font-bold shadow-gold"
              >
                {submittingInterest ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isGuest ? (
                  "התחבר כדי להצטרף"
                ) : depositRequired ? (
                  `הצטרף להצעה · פיקדון ${ils(Number(deal.deposit_amount))}`
                ) : (
                  "אני מעוניין להצטרף להצעה"
                )}
              </Button>
            )}
            {supplier && (() => {
              const wa = normalizeWhatsappUrl(supplier.whatsapp_url || supplier.phone);
              const tel = supplier.phone ? `tel:${supplier.phone.replace(/\s+/g, "")}` : null;
              if (!wa && !tel) return null;
              return (
                <div className="grid grid-cols-2 gap-2">
                  {wa ? (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-10 rounded-xl border border-border bg-card text-foreground text-xs font-bold flex items-center justify-center gap-1.5 hover:border-gold/40 transition-smooth"
                    >
                      <MessageCircle className="h-3.5 w-3.5 text-gold" />
                      וואטסאפ
                    </a>
                  ) : <div />}
                  {tel ? (
                    <a
                      href={tel}
                      className="h-10 rounded-xl border border-border bg-card text-foreground text-xs font-bold flex items-center justify-center gap-1.5 hover:border-gold/40 transition-smooth"
                    >
                      <Phone className="h-3.5 w-3.5 text-gold" />
                      התקשר לספק
                    </a>
                  ) : <div />}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Join modal */}
      <Dialog open={showJoinModal} onOpenChange={setShowJoinModal}>
        <DialogContent dir="rtl" className="text-right max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>הצטרפות להצעה</DialogTitle>
            <DialogDescription className="text-right leading-relaxed">
              <span className="block font-bold text-foreground">{deal.title}</span>
              {supplier?.business_name && (
                <span className="block text-[12px] text-muted-foreground mt-0.5">{supplier.business_name}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-[12px] mb-1 block">שם מלא *</Label>
              <Input
                value={joinForm.full_name}
                onChange={(e) => setJoinForm({ ...joinForm, full_name: e.target.value })}
                placeholder="ישראל ישראלי"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[12px] mb-1 block">טלפון *</Label>
                <Input
                  type="tel"
                  value={joinForm.phone}
                  onChange={(e) => setJoinForm({ ...joinForm, phone: e.target.value })}
                  placeholder="0501234567"
                />
              </div>
              <div>
                <Label className="text-[12px] mb-1 block">עיר</Label>
                <Input
                  value={joinForm.city}
                  onChange={(e) => setJoinForm({ ...joinForm, city: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[12px] mb-1 block">פרויקט</Label>
                <Input
                  value={joinForm.project_name}
                  onChange={(e) => setJoinForm({ ...joinForm, project_name: e.target.value })}
                  placeholder="שם הפרויקט"
                />
              </div>
              <div>
                <Label className="text-[12px] mb-1 block">כמות משוערת</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={joinForm.estimated_quantity}
                  onChange={(e) => setJoinForm({ ...joinForm, estimated_quantity: e.target.value })}
                  placeholder="לדוגמה 8"
                />
              </div>
            </div>
            <div>
              <Label className="text-[12px] mb-1 block">הערות / מה אני צריך</Label>
              <Textarea
                rows={3}
                value={joinForm.notes}
                onChange={(e) => setJoinForm({ ...joinForm, notes: e.target.value })}
                placeholder="פרטים נוספים שיעזרו לספק להכין הצעת מחיר אישית"
              />
            </div>

            {depositRequired && (
              <div className="rounded-xl border border-gold/40 bg-gold/5 px-3 py-2 text-[12px] text-foreground">
                <div className="font-bold mb-0.5">פיקדון נדרש: {ils(Number(deal.deposit_amount ?? 0))}</div>
                <div className="text-muted-foreground">
                  הצטרפות כרוכה בפיקדון אשר יאושר ידנית על ידי מנהל המערכת.
                </div>
              </div>
            )}

            {/* Join condition */}
            <div className="rounded-2xl border border-border bg-muted/40 p-3 space-y-2">
              <div className="text-[12px] font-extrabold text-foreground">תנאי ההצטרפות שלי</div>
              <label className={cn(
                "flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-smooth",
                joinCondition === "flexible" ? "border-gold bg-gold/5" : "border-border bg-card"
              )}>
                <input
                  type="radio"
                  name="join-condition"
                  className="mt-0.5 accent-primary"
                  checked={joinCondition === "flexible"}
                  onChange={() => setJoinCondition("flexible")}
                />
                <div className="text-[12px] leading-relaxed">
                  <div className="font-bold text-foreground">הצטרפות גמישה</div>
                  <div className="text-muted-foreground">אני מצטרף בכל מצב, גם אם מדרגת ההנחה תרד בהמשך.</div>
                </div>
              </label>
              <label className={cn(
                "flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-smooth",
                joinCondition === "conditional" ? "border-gold bg-gold/5" : "border-border bg-card"
              )}>
                <input
                  type="radio"
                  name="join-condition"
                  className="mt-0.5 accent-primary"
                  checked={joinCondition === "conditional"}
                  onChange={() => setJoinCondition("conditional")}
                />
                <div className="text-[12px] leading-relaxed">
                  <div className="font-bold text-foreground">הצטרפות מותנית</div>
                  <div className="text-muted-foreground">
                    אני מצטרף רק אם המדרגה הנוכחית
                    {activeTier ? ` (${describeTier(offerType, activeTier)})` : ""}
                    {" "}נשמרת או עולה. אם תרד — אעבור ל״ממתין לאישור מחדש״.
                  </div>
                </div>
              </label>
            </div>

            <div className="rounded-xl bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground leading-relaxed">
              💡 המחיר הסופי נקבע לפי מספר המשתתפים הפעילים בעת סגירת הקבוצה.
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="h-4 w-4 mt-0.5 accent-primary shrink-0"
              />
              <span className="text-[12px] text-foreground leading-relaxed">
                אני מאשר/ת קריאת התקנון ותנאי השימוש, ויצירת קשר מצד הספק או מנהל המערכת.
                ההצטרפות אינה מחייבת רכישה — המחיר הסופי, האחריות והאספקה ייקבעו ישירות מול הספק.
              </span>
            </label>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => setShowJoinModal(false)}
              className="rounded-xl"
              disabled={submittingInterest}
            >
              ביטול
            </Button>
            <Button
              onClick={submitJoin}
              disabled={!acceptedTerms || submittingInterest}
              className="rounded-xl bg-gradient-gold text-primary font-bold"
            >
              {submittingInterest ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : depositRequired ? (
                "אישור הצטרפות + שמירת פיקדון"
              ) : (
                "אשר הצטרפות"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav role="resident" />
    </MobileShell>
  );
}
