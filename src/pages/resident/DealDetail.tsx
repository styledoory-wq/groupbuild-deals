import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Star, Shield, Sparkles, Loader2, ArrowRight, ShieldCheck, Tag, Users, TrendingUp, MessageCircle, Phone, CheckCircle2, CreditCard, Clock, Share2 } from "lucide-react";
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
          // Only consider ACTIVE interest statuses as "already joined".
          // rejected / cancelled / refunded / withdrawn → user can re-join.
          const ACTIVE_INTEREST = ["interested", "committed", "paid", "pending_deposit", "joined", "approved"];
          const { data: interestRows } = await supabase
            .from("deal_interests")
            .select("id,status,deposit_status,lead_status,created_at")
            .eq("user_id", session.session.user.id)
            .eq("deal_id", d.id)
            .eq("is_deleted", false)
            .order("created_at", { ascending: false })
            .limit(5);
          const activeInterest = (interestRows ?? []).find((r) =>
            ACTIVE_INTEREST.includes(r.status) && r.lead_status !== "rejected"
          );
          if (!cancelled && activeInterest) {
            // For pending_deposit, double-check a real deposit row exists; if not, allow re-join.
            if (activeInterest.status === "pending_deposit") {
              const { data: dep } = await supabase
                .from("deposits")
                .select("id,status")
                .eq("user_id", session.session.user.id)
                .eq("deal_id", d.id)
                .eq("is_deleted", false)
                .in("status", ["pending", "paid"])
                .maybeSingle();
              if (dep) {
                setInterested(true);
                setInterestStatus(activeInterest.status);
                setInterestDepositStatus(dep.status ?? activeInterest.deposit_status ?? "pending");
              }
              // else: stale pending_deposit without deposit row → treat as not joined
            } else {
              setInterested(true);
              setInterestStatus(activeInterest.status);
              setInterestDepositStatus(activeInterest.deposit_status ?? "none");
            }
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
      let interestId: string | null = null;
      const { data: insertedInterest, error: insErr } = await supabase
        .from("deal_interests")
        .insert(payload)
        .select("id")
        .single();
      if (insErr) {
        if (!insErr.message.toLowerCase().includes("duplicate")) throw insErr;
        const { data: existingInterest, error: existingInterestErr } = await supabase
          .from("deal_interests")
          .select("id")
          .eq("user_id", session.session.user.id)
          .eq("deal_id", deal.id)
          .eq("is_deleted", false)
          .maybeSingle();
        if (existingInterestErr) throw existingInterestErr;
        interestId = existingInterest?.id ?? null;
      } else {
        interestId = insertedInterest?.id ?? null;
      }

      let paymentUrl: string | null = null;
      if (depositRequired) {
        const { data: depositResponse, error: depositErr } = await supabase.functions.invoke("create-deposit", {
          body: { deal_id: deal.id },
        });
        if (depositErr) {
          console.error("[create_deposit_failed]", depositErr);
          throw new Error("לא הצלחנו ליצור קישור תשלום. נסו שוב או פנו לתמיכה.");
        }
        if (depositResponse?.error) {
          console.error("[create_deposit_error_response]", depositResponse);
          throw new Error(depositResponse.message ?? "לא הצלחנו ליצור קישור תשלום.");
        }
        paymentUrl = typeof depositResponse?.payment_url === "string" ? depositResponse.payment_url : null;
        if (!paymentUrl) {
          console.error("[create_deposit_missing_payment_url]", depositResponse);
          throw new Error("לא התקבל קישור תשלום. נסו שוב או פנו לתמיכה.");
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
      if (deal.supplier_id && interestId) {
        supabase.functions
          .invoke("send-email", {
            body: {
              type: "new_lead",
              interest_id: interestId,
            },
          })
          .catch((e) => console.warn("[email] new_lead failed", e));
      }

      // Confirmation email to resident
      supabase.functions
        .invoke("send-email", {
          body: {
            type: "deal_joined",
            user_id: session.session.user.id,
            deal_id: deal.id,
            deal_title: deal.title,
          },
        })
        .catch((e) => console.warn("[email] deal_joined failed", e));

      // Check if joining pushed the deal to a new price tier
      if (tiersNow.length > 0) {
        const { data: newCount } = await supabase.rpc("get_deal_paid_count", { _deal_id: deal.id });
        const newCountNum = typeof newCount === "number" ? newCount : 0;
        const activeTierAfter = getActiveTier(tiersNow, newCountNum);
        if (activeTierAfter && activeTierNow && activeTierAfter.minParticipants !== activeTierNow.minParticipants) {
          supabase.functions
            .invoke("send-email", { body: { type: "tier_unlocked", deal_id: deal.id } })
            .catch((e) => console.warn("[email] tier_unlocked failed", e));
        }
      }

      if (paymentUrl) {
        window.location.href = paymentUrl;
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
      {/* Top bar */}
      <div className="px-2 pt-2">
        <PageHeader title="" subtitle="" back variant="navy" />
      </div>

      {/* HERO — clean white card with cover image */}
      <div className="px-4 mt-2">
        <div className="relative bg-card rounded-[28px] overflow-hidden border border-border/60">
          {deal.cover_image_url ? (
            <img
              src={deal.cover_image_url}
              alt={deal.title}
              className="w-full h-[220px] object-cover"
            />
          ) : (
            <div className="w-full h-[160px] bg-gradient-to-br from-primary/10 to-gold/10" />
          )}

          {/* Success badge when joined */}
          {interested && (
            <div className="absolute top-4 right-4 bg-gradient-to-l from-gold to-gold-light text-primary px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-extrabold">כבר הצטרפת</span>
            </div>
          )}

          <div className="p-5">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-fs-xs font-bold uppercase tracking-[0.08em] text-success">
                <span className="gb-live-dot" />
                עסקה פעילה
              </span>
              {category?.name && (
                <span className="text-fs-xs font-bold text-muted-foreground">· {category.icon ?? "🏷️"} {category.name}</span>
              )}
            </div>
            <h1 className="text-fs-xl font-extrabold text-foreground leading-tight tracking-tight">
              {deal.title}
            </h1>
            {deal.description && (
              <p className="text-fs-sm text-muted-foreground leading-relaxed mt-3 whitespace-pre-line line-clamp-3">
                {deal.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* GALLERY */}
      {Array.isArray(deal.gallery_images) && deal.gallery_images.length > 0 && (
        <div className="mt-4">
          <div className="flex gap-2 overflow-x-auto px-4 pb-1 snap-x snap-mandatory no-scrollbar">
            {deal.gallery_images.map((url, i) => (
              <a
                key={url + i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative shrink-0 w-32 h-24 rounded-2xl overflow-hidden border border-border/60 snap-start"
              >
                <img src={url} alt={`gallery-${i}`} loading="lazy" className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Stacked info cards — generous whitespace */}
      <div className="px-4 mt-5 space-y-4">

        {/* PRICING + LIVE PROGRESS */}
        <div className="bg-card rounded-3xl p-6 border border-border/60">
          <div className="flex justify-between items-end mb-6">
            <div className="space-y-1">
              <p className="text-fs-xs font-medium text-muted-foreground">מחיר קבוצתי נוכחי</p>
              <div className="text-fs-3xl font-black text-primary leading-none tracking-tight">
                {display.headline}
              </div>
            </div>
            {(display.savings || display.discountPercent) && (
              <div className="bg-gold/10 px-3 py-1.5 rounded-xl">
                <span className="text-gold font-bold text-xs">
                  {display.savings
                    ? display.savings.replace("חיסכון:", "חיסכון")
                    : `חיסכון ${display.discountPercent}%`}
                </span>
              </div>
            )}
          </div>

          {progressTarget > 0 && (
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-fs-xs font-bold text-foreground">
                  {participantCount} דיירים הצטרפו
                </span>
                {nextTier ? (
                  <span className="text-fs-xs font-medium text-gold">
                    עוד {peopleNeeded} למדרגה הבאה
                  </span>
                ) : (
                  <span className="text-fs-xs font-bold text-success">המדרגה הטובה ביותר</span>
                )}
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.round((participantCount / progressTarget) * 100))}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* TIERS LADDER */}
        {tiers.length > 0 && (
          <div className="bg-card rounded-3xl p-6 border border-border/60">
            <h3 className="text-fs-sm font-extrabold text-foreground mb-4">מדרגות מחיר לפי כמות</h3>
            <div className="space-y-3">
              {tiers.map((t, idx) => {
                const td = describeTier(offerType, t);
                const isActive = !!activeTier && t.minParticipants === activeTier.minParticipants;
                const isPast = activeTier ? t.minParticipants < activeTier.minParticipants : false;
                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center justify-between transition-colors",
                      isActive
                        ? "p-3 bg-muted/60 rounded-2xl border border-gold/30"
                        : isPast
                          ? "opacity-40"
                          : "opacity-70",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "rounded-full",
                          isActive
                            ? "w-2.5 h-2.5 bg-gold ring-4 ring-gold/15"
                            : isPast
                              ? "w-1.5 h-1.5 bg-muted-foreground"
                              : "w-1.5 h-1.5 border border-border",
                        )}
                      />
                      <span className={cn("text-fs-sm", isActive ? "font-bold text-foreground" : "text-foreground")}>
                        {tierRange(t)} דיירים{isActive ? " (פעיל)" : ""}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "text-fs-sm gb-num",
                        isActive ? "font-black text-primary" : isPast ? "font-bold" : "font-bold text-gold",
                      )}
                    >
                      {td.headline}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DEPOSIT */}
        {depositRequired && (
          <div className="bg-card rounded-3xl p-5 border border-border/60 flex items-center gap-4">
            <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6 text-gold" strokeWidth={1.5} />
            </div>
            <div className="space-y-0.5 min-w-0">
              <p className="text-fs-xs text-muted-foreground">פיקדון להבטחת המקום</p>
              <p className="text-fs-sm font-bold text-foreground">
                {ils(Number(deal.deposit_amount))} · מאושר ידנית על ידי המערכת
              </p>
            </div>
          </div>
        )}

        {/* SUPPLIER */}
        {supplier && (
          <Link
            to={`/suppliers/${supplier.id}`}
            className="block bg-card rounded-3xl p-5 border border-border/60 flex items-center justify-between"
          >
            <div className="flex items-center gap-3 min-w-0">
              <SupplierLogo name={supplier.business_name} logoUrl={supplier.logo_url} size="md" />
              <div className="min-w-0">
                <p className="text-fs-sm font-bold text-foreground truncate">{supplier.business_name}</p>
                <div className="text-fs-xs text-muted-foreground">
                  <SupplierRatingBadge supplierId={supplier.id} showEmpty />
                </div>
              </div>
            </div>
            <span className="text-fs-xs font-bold text-primary px-3 py-1.5 bg-muted rounded-lg shrink-0">
              פרופיל ספק
            </span>
          </Link>
        )}
      </div>

      {/* Spacer for fixed CTA + BottomNav */}
      <div aria-hidden className="h-64" />

      {/* FIXED ACTION DOCK */}
      <div
        className="fixed inset-x-0 z-50 flex justify-center pointer-events-none"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 8px)" }}
      >
        <div className="pointer-events-auto w-full max-w-screen-sm px-4 pt-4 pb-2 bg-gradient-to-t from-background via-background to-background/0">
          {interested ? (
            <div className="space-y-3">
              {/* Festive joined card */}
              <div className="bg-primary text-primary-foreground p-4 rounded-2xl flex items-center justify-center gap-3 border border-gold/30">
                <div className="w-9 h-9 bg-gradient-to-l from-gold to-gold-light rounded-full flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-primary" strokeWidth={2.5} />
                </div>
                <div className="text-right">
                  <p className="text-fs-sm font-extrabold leading-tight">הצטרפת בהצלחה!</p>
                  <p className="text-fs-xs text-primary-foreground/70 leading-tight mt-0.5">
                    {interestDepositStatus === "paid"
                      ? "פיקדון שולם — המקום מובטח"
                      : interestStatus === "pending_deposit"
                        ? "ממתין לאישור פיקדון"
                        : "הספק יצור קשר בהקדם"}
                  </p>
                </div>
              </div>
              {/* Secondary outline actions */}
              <SecondaryActions deal={deal} supplier={supplier} />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Primary dominant CTA */}
              <Button
                onClick={handleJoinClick}
                disabled={submittingInterest}
                className="w-full h-16 rounded-2xl bg-[#0A1F3D] hover:bg-[#0A1F3D]/90 text-white font-extrabold text-base shadow-[0_12px_28px_-10px_rgba(10,31,61,0.6)] border-2 border-[#D4AF37]/30"
              >
                {submittingInterest ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isGuest ? (
                  "התחבר כדי להצטרף"
                ) : depositRequired ? (
                  `הצטרף להצעה · פיקדון ${ils(Number(deal.deposit_amount))}`
                ) : (
                  "הצטרף להצעה"
                )}
              </Button>

              {/* Secondary outline actions */}
              <SecondaryActions deal={deal} supplier={supplier} />
            </div>
          )}
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
                <span className="block text-fs-xs text-muted-foreground mt-0.5">{supplier.business_name}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-fs-xs mb-1 block">שם מלא *</Label>
              <Input
                value={joinForm.full_name}
                onChange={(e) => setJoinForm({ ...joinForm, full_name: e.target.value })}
                placeholder="ישראל ישראלי"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-fs-xs mb-1 block">טלפון *</Label>
                <Input
                  type="tel"
                  value={joinForm.phone}
                  onChange={(e) => setJoinForm({ ...joinForm, phone: e.target.value })}
                  placeholder="0501234567"
                />
              </div>
              <div>
                <Label className="text-fs-xs mb-1 block">עיר</Label>
                <Input
                  value={joinForm.city}
                  onChange={(e) => setJoinForm({ ...joinForm, city: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-fs-xs mb-1 block">פרויקט</Label>
                <Input
                  value={joinForm.project_name}
                  onChange={(e) => setJoinForm({ ...joinForm, project_name: e.target.value })}
                  placeholder="שם הפרויקט"
                />
              </div>
              <div>
                <Label className="text-fs-xs mb-1 block">כמות משוערת</Label>
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
              <Label className="text-fs-xs mb-1 block">הערות / מה אני צריך</Label>
              <Textarea
                rows={3}
                value={joinForm.notes}
                onChange={(e) => setJoinForm({ ...joinForm, notes: e.target.value })}
                placeholder="פרטים נוספים שיעזרו לספק להכין הצעת מחיר אישית"
              />
            </div>

            {depositRequired && (
              <div className="rounded-xl border border-gold/40 bg-gold/5 px-3 py-2 text-fs-xs text-foreground">
                <div className="font-bold mb-0.5">פיקדון נדרש: {ils(Number(deal.deposit_amount ?? 0))}</div>
                <div className="text-muted-foreground">
                  הצטרפות כרוכה בפיקדון אשר יאושר ידנית על ידי מנהל המערכת.
                </div>
              </div>
            )}

            {/* Join condition */}
            <div className="rounded-2xl border border-border bg-muted/40 p-3 space-y-2">
              <div className="text-fs-xs font-extrabold text-foreground">תנאי ההצטרפות שלי</div>
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
                <div className="text-fs-xs leading-relaxed">
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
                <div className="text-fs-xs leading-relaxed">
                  <div className="font-bold text-foreground">הצטרפות מותנית</div>
                  <div className="text-muted-foreground">
                    אני מצטרף רק אם המדרגה הנוכחית
                    {activeTier ? ` (${describeTier(offerType, activeTier)})` : ""}
                    {" "}נשמרת או עולה. אם תרד — אעבור ל״ממתין לאישור מחדש״.
                  </div>
                </div>
              </label>
            </div>

            <div className="rounded-xl bg-muted/60 px-3 py-2 text-fs-xs text-muted-foreground leading-relaxed">
              💡 המחיר הסופי נקבע לפי מספר המשתתפים הפעילים בעת סגירת הקבוצה.
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="h-4 w-4 mt-0.5 accent-primary shrink-0"
              />
              <span className="text-fs-xs text-foreground leading-relaxed">
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
              className="rounded-xl bg-[#0A1F3D] text-white font-bold"
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

/** Outline secondary actions row: invite neighbor + whatsapp + call. */
function SecondaryActions({
  deal,
  supplier,
}: {
  deal: { id: string; title: string };
  supplier: SupplierRow | null;
}) {
  const wa = supplier ? normalizeWhatsappUrl(supplier.whatsapp_url || supplier.phone) : null;
  const tel = supplier?.phone ? `tel:${supplier.phone.replace(/\s+/g, "")}` : null;
  const [shareOpen, setShareOpen] = useState(false);

  const shareUrl = `${window.location.origin}/share/deal/${deal.id}`;
  const shareText = `מצטרפים יחד למחיר משתלם: ${deal.title}\n${shareUrl}`;

  const handleInvite = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: deal.title, text: `מצטרפים יחד למחיר משתלם: ${deal.title}`, url: shareUrl });
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
      }
    }
    setShareOpen(true);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("הקישור הועתק", { description: "אפשר להדביק ולשלוח לשכנים" });
      setShareOpen(false);
    } catch {
      toast.error("העתקה נכשלה");
    }
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={handleInvite}
          className="h-11 rounded-2xl border border-border bg-card text-foreground text-fs-xs font-bold flex flex-col items-center justify-center gap-0.5 hover:border-gold/40 transition-colors"
        >
          <Share2 className="h-4 w-4 text-gold" strokeWidth={1.5} />
          הזמן שכן
        </button>
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="h-11 rounded-2xl border border-border bg-card text-foreground text-fs-xs font-bold flex flex-col items-center justify-center gap-0.5 hover:border-gold/40 transition-colors"
          >
            <MessageCircle className="h-4 w-4 text-gold" strokeWidth={1.5} />
            וואטסאפ
          </a>
        ) : (
          <div className="h-11 rounded-2xl border border-dashed border-border/60 opacity-40 flex items-center justify-center text-fs-xs text-muted-foreground">
            לא זמין
          </div>
        )}
        {tel ? (
          <a
            href={tel}
            className="h-11 rounded-2xl border border-border bg-card text-foreground text-fs-xs font-bold flex flex-col items-center justify-center gap-0.5 hover:border-gold/40 transition-colors"
          >
            <Phone className="h-4 w-4 text-gold" strokeWidth={1.5} />
            התקשר
          </a>
        ) : (
          <div className="h-11 rounded-2xl border border-dashed border-border/60 opacity-40 flex items-center justify-center text-fs-xs text-muted-foreground">
            לא זמין
          </div>
        )}
      </div>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent dir="rtl" className="text-right max-w-sm">
          <DialogHeader>
            <DialogTitle>שיתוף ההצעה</DialogTitle>
            <DialogDescription className="text-right">בחרו איך לשלוח את ההצעה לשכנים</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2 mt-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShareOpen(false)}
              className="h-12 rounded-xl bg-[#25D366] text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition"
            >
              <MessageCircle className="h-5 w-5" />
              שיתוף בוואטסאפ
            </a>
            <a
              href={`sms:?&body=${encodeURIComponent(shareText)}`}
              onClick={() => setShareOpen(false)}
              className="h-12 rounded-xl bg-[#0A1F3D] text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition"
            >
              <Phone className="h-5 w-5" />
              שליחה ב-SMS
            </a>
            <button
              type="button"
              onClick={copyLink}
              className="h-12 rounded-xl border-2 border-[#D4AF37] bg-white text-[#0A1F3D] font-bold flex items-center justify-center gap-2 hover:bg-[#FFFBEB] transition"
            >
              <Share2 className="h-5 w-5" />
              העתק קישור
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
