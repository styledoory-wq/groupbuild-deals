import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Star, Shield, Sparkles, Loader2, ArrowRight, ShieldCheck, Tag, Users, TrendingUp, MessageCircle, Phone, CheckCircle2, CreditCard, Clock, Share2, Percent, PiggyBank, CalendarDays, MapPin, Layers, Store, Handshake, Target, PhoneCall, Wrench, BadgeCheck, Award, ChevronLeft } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BackHeader, LoadingState, ErrorState } from "@/components/ds";
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

import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { SupplierRatingBadge } from "@/components/reviews/SupplierRatingBadge";
import { useApp } from "@/store/AppStore";
import { getFriendlyLoadError } from "@/lib/safeAsync";
import { EditableField } from "@/components/admin/EditableField";
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
  offer_terms: string | null;
  restrictions: string | null;
  service_areas: string[] | null;
  join_deadline: string | null;
  redemption_deadline: string | null;
  appointment_required: boolean | null;
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
  const navigate = useNavigate();
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
  const [pendingPaymentUrl, setPendingPaymentUrl] = useState<string | null>(null);
  const [resumingPayment, setResumingPayment] = useState(false);

  const handleResumePayment = async () => {
    if (!deal) return;
    // Direct-to-supplier flow: route back to checkout to show the supplier payment link and "I paid" button.
    navigate(`/checkout/${deal.id}`);
  };

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
            "id,title,description,status,category_id,supplier_id,offer_type,original_price,discounted_price,discount_percentage,base_price,tiers,ends_at,deposit_required,deposit_amount,cover_image_url,gallery_images,offer_terms,restrictions,service_areas,join_deadline,redemption_deadline,appointment_required",
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
                .select("id,status,provider_payment_url")
                .eq("user_id", session.session.user.id)
                .eq("deal_id", d.id)
                .eq("is_deleted", false)
                .in("status", ["pending", "paid"])
                .maybeSingle();
              if (dep) {
                setInterested(true);
                setInterestStatus(activeInterest.status);
                setInterestDepositStatus(dep.status ?? activeInterest.deposit_status ?? "pending");
                setPendingPaymentUrl(dep.status === "pending" ? dep.provider_payment_url ?? null : null);
              }
              // else: stale pending_deposit without deposit row → treat as not joined
            } else {
              setInterested(true);
              setInterestStatus(activeInterest.status);
              setInterestDepositStatus(activeInterest.deposit_status ?? "none");
              setPendingPaymentUrl(null);
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
      const { data: deposit } = await supabase
        .from("deposits")
        .select("status,provider_payment_url")
        .eq("user_id", uid)
        .eq("deal_id", dealId)
        .eq("is_deleted", false)
        .in("status", ["pending", "paid"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setPendingPaymentUrl(deposit?.status === "pending" ? deposit.provider_payment_url ?? null : null);
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
      window.location.href = `/auth?redirect=/checkout/${deal.id}`;
      return;
    }
    navigate(`/checkout/${deal.id}`);
  };

  const submitJoin = async () => {
    if (!deal) return;
    const { guardPreview } = await import("@/lib/previewMode");
    if (guardPreview(toast)) return;
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
      let depositId: string | null = null;
      if (depositRequired) {
        const { data: paymentResponse, error: paymentErr } = await supabase.functions.invoke("create-deposit", {
          body: { deal_id: deal.id, user_id: session.session.user.id },
        });
        if (paymentErr) {
          console.error("[create_deposit_failed]", paymentErr);
          toast.error("התשלום נכשל, נסה שנית");
          return;
        }
        if (paymentResponse?.error) {
          console.error("[create_deposit_error_response]", paymentResponse);
          toast.error(paymentResponse.message ?? "התשלום נכשל, נסה שנית");
          return;
        }
        paymentUrl = typeof paymentResponse?.payment_url === "string" ? paymentResponse.payment_url : null;
        depositId = typeof paymentResponse?.deposit_id === "string" ? paymentResponse.deposit_id : null;

        // Async Make scenario: poll for provider_payment_url for up to ~30s.
        if (!paymentUrl && depositId) {
          toast.loading("ממתינים לקישור התשלום מהספק...", { id: "wait-payment-url" });
          const started = Date.now();
          while (Date.now() - started < 30000) {
            await new Promise((r) => setTimeout(r, 1500));
            const { data: depRow } = await supabase
              .from("deposits")
              .select("provider_payment_url,status")
              .eq("id", depositId)
              .maybeSingle();
            if (depRow?.provider_payment_url) {
              paymentUrl = depRow.provider_payment_url;
              break;
            }
            if (depRow?.status === "failed" || depRow?.status === "cancelled") break;
          }
          toast.dismiss("wait-payment-url");
        }

        if (!paymentUrl) {
          console.error("[create_deposit_missing_url] full response:", paymentResponse);
          toast.error("שגיאה בחיבור לספק התשלום — פנה לתמיכה");
          return;
        }
      }


      if (depositRequired) {
        setInterested(true);
        setInterestStatus("pending_deposit");
        setInterestDepositStatus("pending");
        setPendingPaymentUrl(paymentUrl);
        setShowJoinModal(false);
        toast.success("פרטי הבקשה נשמרו — ההצטרפות תושלם רק אחרי תשלום הפיקדון");
        if (paymentUrl) {
          navigate(`/payment/checkout?url=${encodeURIComponent(paymentUrl)}&deal_id=${encodeURIComponent(deal.id)}`);
          return;
        }
      } else {
        setInterested(true);
        setInterestStatus("interested");
        setInterestDepositStatus("none");
        setPendingPaymentUrl(null);
        setShowJoinModal(false);
        toast.success("נרשמת בהצלחה! הספק יצור איתך קשר בהקדם.");
        await loadParticipantCount(deal.id);
      }

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

      // Confirmation email to resident is sent immediately only when no deposit is required.
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

    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירה נכשלה");
    } finally {
      setSubmittingInterest(false);
    }
  };

  if (loading) {
    return (
      <MobileShell>
        <BackHeader title="טוען עסקה..." />
        <LoadingState label="טוען פרטי עסקה..." />
        <BottomNav role="resident" />
      </MobileShell>
    );
  }

  if (error || !deal) {
    return (
      <MobileShell>
        <BackHeader title="עסקה לא נמצאה" />
        <ErrorState title="עסקה לא נמצאה" description={error ?? "העסקה לא נמצאה"} />
        <div className="px-5 mt-2 flex justify-center">
          <Link to="/resident/deals">
            <Button variant="outline">
              <ArrowRight className="h-4 w-4 ml-2" />
              חזרה לעסקאות
            </Button>
          </Link>
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
  const hasCompletedJoin = interested && (
    !depositRequired ||
    interestDepositStatus === "paid" ||
    interestStatus === "paid" ||
    interestStatus === "joined" ||
    interestStatus === "committed"
  );
  const hasPendingDeposit = interested && depositRequired && !hasCompletedJoin;

  // Computed display values for premium hero stats
  const daysRemaining = (() => {
    if (!deal.ends_at) return null;
    const diff = new Date(deal.ends_at).getTime() - Date.now();
    if (Number.isNaN(diff)) return null;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();
  const savingsAmount =
    display.referencePrice && display.effectivePrice
      ? Math.max(0, display.referencePrice - display.effectivePrice)
      : null;
  const discountPct = display.discountPercent ?? null;
  const progressPct = progressTarget > 0
    ? Math.min(100, Math.round((participantCount / progressTarget) * 100))
    : 0;
  const heroImages = [deal.cover_image_url, ...((deal.gallery_images ?? []))].filter(Boolean) as string[];

  const statusMeta = (() => {
    if (deal.status === "closed" || deal.status === "completed") {
      return { label: "הסתיימה", dot: "#6B7280", fg: "#6B7280", bg: "#F4F6FA" };
    }
    if (deal.status === "closing-soon") {
      return { label: "נסגרת בקרוב", dot: "#F59E0B", fg: "#1F2937", bg: "#FFF8E1" };
    }
    return { label: "פעילה", dot: "#10B981", fg: "#1F2937", bg: "#FFFFFF" };
  })();

  const benefits: Array<{ icon: typeof Tag; title: string; subtitle: string; accent: string; tint: string }> = [
    { icon: Tag,         title: "מחיר משופר",      subtitle: "תמחור קבוצתי שמשתפר ככל שמצטרפים", accent: "#0FB5C9", tint: "#E7F8FB" },
    { icon: Users,       title: "כוח קנייה",        subtitle: "דיירים מהפרויקט קונים יחד",        accent: "#2F6BFF", tint: "#EAF2FF" },
    { icon: ShieldCheck, title: "ספקים מאומתים",    subtitle: "כל ספק נבדק ומאושר ידנית",        accent: "#2EA85A", tint: "#E8F7EC" },
    { icon: Award,       title: "תנאים בלעדיים",    subtitle: "הצעה זמינה רק לחברי הקהילה",      accent: "#B07E2E", tint: "#F8F1E4" },
  ];

  const timeline: Array<{ icon: typeof Tag; title: string; subtitle: string }> = [
    { icon: Handshake, title: "משלמים פיקדון",  subtitle: "ממלאים פרטים וההצטרפות מושלמת רק אחרי תשלום" },
    { icon: Target,    title: "מגיעים ליעד",     subtitle: "הקבוצה ממלאת את מדרגת המחיר" },
    { icon: PhoneCall, title: "הספק יוצר קשר",   subtitle: "תיאום פרטים והצעת מחיר אישית" },
    { icon: Wrench,    title: "ביצוע והתקנה",    subtitle: "הספק מבצע את העבודה אצלכם" },
  ];

  // Tier computations for the integrated green pricing card
  const sortedTiers = [...tiers].sort((a, b) => a.minParticipants - b.minParticipants);
  const activeIdx = activeTier
    ? sortedTiers.findIndex((t) => t.minParticipants === activeTier.minParticipants)
    : -1;
  const stepCount = sortedTiers.length;
  const ladderFill = stepCount > 1 && activeIdx >= 0
    ? Math.round((activeIdx / (stepCount - 1)) * 100)
    : activeIdx >= 0 ? 100 : 0;
  const bestTier = sortedTiers[sortedTiers.length - 1];
  const bestDisplay = bestTier ? describeTier(offerType, bestTier) : null;
  const activeDisplay = activeTier ? describeTier(offerType, activeTier) : null;
  const savingsPerPerson =
    bestDisplay?.effectivePrice != null && activeDisplay?.effectivePrice != null
      ? Math.max(0, activeDisplay.effectivePrice - bestDisplay.effectivePrice)
      : null;

  // ----- Build a 3-slot window of tiers (past / current / next) for the Achievement Blocks -----
  const tierWindow: Array<{ tier: OfferTier; state: "past" | "active" | "future" }> = (() => {
    if (sortedTiers.length === 0) return [];
    if (sortedTiers.length <= 3) {
      return sortedTiers.map((t, idx) => ({
        tier: t,
        state: (idx < activeIdx ? "past" : idx === activeIdx ? "active" : "future") as "past" | "active" | "future",
      }));
    }
    let start = Math.max(0, activeIdx - 1);
    if (activeIdx === -1) start = 0;
    if (start + 3 > sortedTiers.length) start = sortedTiers.length - 3;
    return sortedTiers.slice(start, start + 3).map((t) => {
      const idxInAll = sortedTiers.findIndex((x) => x.minParticipants === t.minParticipants);
      return {
        tier: t,
        state: (idxInAll < activeIdx ? "past" : idxInAll === activeIdx ? "active" : "future") as "past" | "active" | "future",
      };
    });
  })();

  const handleWhatsAppShare = () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const tierLine = nextTier
      ? `עוד ${peopleNeeded} שכנים שמצטרפים = כולם חוסכים עוד${savingsPerPerson && savingsPerPerson > 0 ? ` ${ils(savingsPerPerson)}` : ""}!`
      : `כבר ${participantCount} שכנים בקבוצה — תצטרפו גם אתם!`;
    const text = `🏘️ ${deal.title}\n\n${tierLine}\n\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-[16px] font-extrabold text-[#1F2937] mb-3 px-1 flex items-center gap-2">
      <span className="w-1 h-5 bg-[#0E6B5A] rounded-full" />
      {children}
    </h2>
  );

  return (
    <MobileShell>
      {/* Slim back header */}
      <div className="px-2 pt-2">
        <PageHeader title="" subtitle="" back variant="navy" />
      </div>

      {/* ===== SECTION 1 — HERO IMAGE ===== */}
      <div className="px-4 mt-2">
        <div className="relative rounded-[28px] overflow-hidden h-[260px] bg-gradient-to-br from-[#EAF2FF] to-[#FFF8E1]">
          {heroImages.length > 0 && (
            <div className="absolute inset-0">
              <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar h-full">
                {heroImages.map((url, i) => (
                  <img
                    key={url + i}
                    src={url}
                    alt={`${deal.title} ${i + 1}`}
                    className="w-full h-full object-cover shrink-0 snap-start"
                    style={{ flex: "0 0 100%" }}
                  />
                ))}
              </div>
              {heroImages.length > 1 && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/30 backdrop-blur-md px-2.5 py-1 rounded-full">
                  {heroImages.map((_, i) => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/90" />
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#F7F5F0] via-transparent to-black/20 pointer-events-none" />

          <span
            className="absolute top-4 right-4 inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-2xl bg-white/95 backdrop-blur-md shadow-[0_2px_6px_rgba(10,31,61,0.18)] border border-white text-[#0E6B5A]"
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusMeta.dot }} />
            {statusMeta.label}
          </span>

          {(hasCompletedJoin || hasPendingDeposit) && (
            <div className="absolute top-4 left-4 bg-gradient-to-l from-[#1A8870] to-[#34A88E] text-[#1F2937] px-3 py-1 rounded-full flex items-center gap-1.5 shadow-[0_2px_6px_rgba(10,31,61,0.18)]">
              {hasCompletedJoin ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
              <span className="text-[11px] font-extrabold">{hasCompletedJoin ? "הצטרפת" : "ממתין לתשלום"}</span>
            </div>
          )}
        </div>
      </div>

      {/* ===== SECTION 2 — HEADLINE + PRICE CARD ===== */}
      <div className="px-4 -mt-10 relative z-10">
        <div className="bg-white rounded-[24px] p-5 shadow-[0_12px_30px_-12px_rgba(10,31,61,0.25)]">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {category?.name && (
              <span className="bg-[#0E6B5A]/10 text-[#0E6B5A] px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide">
                {category.icon ? `${category.icon} ` : ""}{category.name}
              </span>
            )}
            {supplier && (
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-[11px] font-bold text-[#6B7280] truncate">{supplier.business_name}</span>
                {supplier.approval_status === "approved" && (
                  <BadgeCheck className="h-3.5 w-3.5 text-[#2EA85A] shrink-0" strokeWidth={2.4} />
                )}
              </div>
            )}
          </div>
          <EditableField
            table="deals"
            id={deal.id}
            field="title"
            value={deal.title}
            as="h1"
            className="text-[22px] leading-[1.2] font-black text-[#1F2937] tracking-tight mb-3"
          />
          {display.effectivePrice != null ? (
            <div className="space-y-1.5">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[28px] font-black text-[#1F2937] gb-num leading-none">{ils(display.effectivePrice)}</span>
                {savingsAmount ? (
                  <span className="text-[11px] font-extrabold text-[#0E6B5A] bg-[#0E6B5A]/10 px-2 py-0.5 rounded-full">
                    חיסכון {ils(savingsAmount)}
                  </span>
                ) : discountPct ? (
                  <span className="text-[11px] font-extrabold text-[#0E6B5A] bg-[#0E6B5A]/10 px-2 py-0.5 rounded-full">
                    {discountPct}% הנחה
                  </span>
                ) : null}
              </div>
              {display.referencePrice && display.referencePrice > display.effectivePrice && (
                <div className="text-[11px] text-[#6B7280] flex items-center gap-1.5">
                  <span>מחיר רגיל ללא רכישה קבוצתית:</span>
                  <span className="line-through gb-num">{ils(display.referencePrice)}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[16px] font-black text-[#1F2937]">{display.headline}</p>
          )}
        </div>
      </div>

      {/* ===== SECTION 3 — ACHIEVEMENT BLOCKS + WHATSAPP SHARE ===== */}
      {sortedTiers.length > 0 && (
        <div className="px-4 mt-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-[16px] font-extrabold text-[#1F2937]">מסלול החיסכון שלכם</h2>
            <span className="text-[#0E6B5A] text-[12px] font-bold">{participantCount} מצטרפים</span>
          </div>

          {/* 3 Achievement Blocks */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {tierWindow.map(({ tier, state }, idx) => {
              const td = describeTier(offerType, tier);
              const range = tierRange(tier);
              if (state === "past") {
                return (
                  <div key={idx} className="bg-white rounded-2xl border-2 border-transparent p-3 h-28 flex flex-col justify-between opacity-50 relative overflow-hidden">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">התחלנו ב</span>
                      <span className="text-[9px] font-bold text-[#9CA3AF] gb-num">{range} מצטרפים</span>
                    </div>
                    <span className="text-[15px] font-black text-[#9CA3AF] line-through gb-num leading-tight">{td.headline}</span>
                  </div>
                );
              }
              if (state === "active") {
                return (
                  <div key={idx} className="bg-[#0E6B5A] rounded-2xl border-2 border-[#0E6B5A] p-3 h-28 flex flex-col justify-between shadow-lg shadow-[#0E6B5A]/30 relative">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-white/70 uppercase tracking-tighter">המחיר כרגע</span>
                      <span className="text-[9px] font-bold text-white/80 gb-num">{range} מצטרפים</span>
                    </div>
                    <span className="text-[17px] font-black text-white gb-num leading-tight">{td.headline}</span>
                    <div className="absolute -top-2 -right-2 bg-[#F5C547] text-[#0E6B5A] text-[9px] px-2 py-0.5 rounded-full font-black shadow-sm whitespace-nowrap">אנחנו כאן</div>
                  </div>
                );
              }
              return (
                <div key={idx} className="bg-white rounded-2xl border-2 border-dashed border-[#0E6B5A]/30 p-3 h-28 flex flex-col justify-between relative">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-[#0E6B5A] uppercase tracking-tighter">היעד הבא</span>
                    <span className="text-[9px] font-bold text-[#0E6B5A]/80 gb-num">{range} מצטרפים</span>
                  </div>
                  <span className="text-[17px] font-black text-[#1F2937] gb-num leading-tight">{td.headline}</span>
                  <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-[#0E6B5A] rounded-full animate-ping" />
                </div>
              );
            })}
          </div>

          {/* Dark motivation card with WhatsApp share */}
          <div className="bg-[#062E27] text-white rounded-[24px] p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3 gap-3">
              <div className="flex flex-col min-w-0">
                {nextTier && peopleNeeded > 0 ? (
                  <>
                    <span className="text-[11px] text-[#34A88E] font-bold">רק עוד {peopleNeeded} שכנים!</span>
                    <span className="text-[16px] font-black leading-tight mt-0.5">
                      {savingsPerPerson && savingsPerPerson > 0
                        ? `כולם יחסכו עוד ${ils(savingsPerPerson)}`
                        : `מגיעים למחיר ${describeTier(offerType, nextTier).headline}`}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] text-[#34A88E] font-bold">הגענו למחיר המקסימלי!</span>
                    <span className="text-[16px] font-black leading-tight mt-0.5">שתפו ותחזקו את הקבוצה</span>
                  </>
                )}
              </div>
              <div className="bg-[#0E6B5A]/40 p-2 rounded-xl shrink-0">
                <TrendingUp className="w-6 h-6 text-[#34A88E]" strokeWidth={2.2} />
              </div>
            </div>

            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mb-4">
              <div
                className="bg-[#34A88E] h-full rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="w-full bg-[#25D366] hover:bg-[#22c35e] text-white font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.97] shadow-lg"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              שתפו בוואטסאפ של הבניין
            </button>
            <p className="text-center text-[11px] text-white/60 mt-2">כל שכן שמצטרף = כולם חוסכים יותר</p>
          </div>

          {daysRemaining !== null && (
            <div className="mt-3 flex items-center justify-center gap-2 text-[11px] font-bold text-[#6B7280]">
              <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{daysRemaining} ימים לסגירה</span>
            </div>
          )}
        </div>
      )}


      {/* ===== SECTION 3 — OFFER DETAILS ===== */}
      {(deal.description || deal.offer_terms || deal.restrictions || (deal.service_areas && deal.service_areas.length > 0) || deal.join_deadline || deal.redemption_deadline || deal.appointment_required) && (
        <div className="px-4 mt-6">
          <SectionTitle>פרטי ההצעה</SectionTitle>
          <div className="bg-white rounded-[24px] p-5 shadow-[0_8px_20px_-10px_rgba(10,31,61,0.18)] space-y-4">
            {deal.description && (
              <div>
                <div className="text-[11px] font-extrabold text-[#6B7280] mb-1">תיאור</div>
                <p className="text-[13px] text-[#1F2937] leading-relaxed whitespace-pre-wrap">{deal.description}</p>
              </div>
            )}
            {deal.offer_terms && (
              <div>
                <div className="text-[11px] font-extrabold text-[#6B7280] mb-1">תנאי ההצעה</div>
                <p className="text-[13px] text-[#1F2937] leading-relaxed whitespace-pre-wrap">{deal.offer_terms}</p>
              </div>
            )}
            {deal.restrictions && (
              <div>
                <div className="text-[11px] font-extrabold text-[#6B7280] mb-1">הגבלות / חריגים</div>
                <p className="text-[13px] text-[#1F2937] leading-relaxed whitespace-pre-wrap">{deal.restrictions}</p>
              </div>
            )}
            {deal.service_areas && deal.service_areas.length > 0 && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-[#0E6B5A] mt-0.5 shrink-0" />
                <div>
                  <div className="text-[11px] font-extrabold text-[#6B7280] mb-0.5">אזורי שירות</div>
                  <p className="text-[13px] text-[#1F2937]">{deal.service_areas.join(", ")}</p>
                </div>
              </div>
            )}
            {(deal.join_deadline || deal.redemption_deadline) && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                {deal.join_deadline && (
                  <div className="bg-[#F4F6FA] rounded-2xl p-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#6B7280] mb-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      תאריך אחרון להצטרפות
                    </div>
                    <div className="text-[13px] font-extrabold text-[#1F2937]">
                      {new Date(deal.join_deadline).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                  </div>
                )}
                {deal.redemption_deadline && (
                  <div className="bg-[#F4F6FA] rounded-2xl p-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#6B7280] mb-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      תאריך אחרון למימוש
                    </div>
                    <div className="text-[13px] font-extrabold text-[#1F2937]">
                      {new Date(deal.redemption_deadline).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                  </div>
                )}
              </div>
            )}
            {deal.appointment_required && (
              <div className="flex items-center gap-2 bg-[#FFF8E1] rounded-xl px-3 py-2">
                <Clock className="h-4 w-4 text-[#B07E2E] shrink-0" />
                <span className="text-[12px] font-bold text-[#1F2937]">נדרשת קביעת פגישה לפני המימוש</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== SECTION 4 — HOW IT WORKS ===== */}
      <div className="px-4 mt-6">
        <SectionTitle>איך זה עובד</SectionTitle>
        <div className="bg-white rounded-[24px] p-5 shadow-[0_8px_20px_-10px_rgba(10,31,61,0.18)]">
          <ol className="relative">
            {timeline.map((step, idx) => {
              const last = idx === timeline.length - 1;
              return (
                <li key={step.title} className="relative flex gap-3 pb-5 last:pb-0">
                  {!last && <span aria-hidden className="absolute right-[19px] top-10 bottom-0 w-px bg-[#ECEEF2]" />}
                  <div className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "#1F2937" }}>
                    <step.icon className="w-[18px] h-[18px] text-white" strokeWidth={2.2} />
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-[13px] font-extrabold text-[#1F2937] leading-tight">
                      <span className="text-[#1A8870] font-black mr-1">{idx + 1}.</span>
                      {step.title}
                    </p>
                    <p className="text-[11px] text-[#6B7280] leading-snug mt-1">{step.subtitle}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* ===== SECTION 5 — SUPPLIER CARD ===== */}
      {supplier && (
        <div className="px-4 mt-6">
          <SectionTitle>על הספק</SectionTitle>
          <div className="bg-white rounded-[24px] p-5 shadow-[0_8px_20px_-10px_rgba(10,31,61,0.18)]">
            <div className="flex items-center gap-3">
              <SupplierLogo name={supplier.business_name} logoUrl={supplier.logo_url} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-[15px] font-extrabold text-[#1F2937] truncate">{supplier.business_name}</p>
                  {supplier.approval_status === "approved" && (
                    <BadgeCheck className="h-4 w-4 text-[#2EA85A] shrink-0" strokeWidth={2.4} />
                  )}
                </div>
                <div className="text-[11px] text-[#6B7280] mt-0.5">
                  <SupplierRatingBadge supplierId={supplier.id} showEmpty />
                </div>
              </div>
            </div>
            <Link
              to={`/suppliers/${supplier.id}`}
              className="mt-4 flex items-center justify-center gap-1 h-11 rounded-2xl border-2 border-[#0E6B5A]/20 text-[#0E6B5A] text-[13px] font-bold active:scale-[0.98] transition-transform"
            >
              צפייה בפרופיל הספק
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Spacer for sticky CTA */}
      <div aria-hidden className="h-40" />



      {/* ===== SECTION 7 — STICKY CTA ===== */}
      <div
        className="fixed inset-x-0 z-50 flex justify-center pointer-events-none"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 8px)" }}
      >
        <div className="pointer-events-auto w-full max-w-screen-sm px-4 pt-5 pb-2 bg-gradient-to-t from-[#F7F5F0] via-[#F7F5F0]/95 to-transparent">
          {interested ? (
            <div className="flex items-center gap-2.5 bg-[#0E6B5A] text-white p-3.5 rounded-2xl shadow-[0_12px_28px_-10px_rgba(10,31,61,0.6)]">
              <div className="w-10 h-10 bg-gradient-to-l from-[#1A8870] to-[#34A88E] rounded-full flex items-center justify-center shrink-0">
                {hasCompletedJoin ? (
                  <CheckCircle2 className="w-5 h-5 text-[#1F2937]" strokeWidth={2.6} />
                ) : (
                  <Clock className="w-5 h-5 text-[#1F2937]" strokeWidth={2.6} />
                )}
              </div>
              <div className="flex-1 text-right">
                <p className="text-[14px] font-extrabold leading-tight">{hasCompletedJoin ? "הצטרפת בהצלחה!" : "ממתין לתשלום פיקדון"}</p>
                <p className="text-[11px] text-white/70 leading-tight mt-0.5">
                  {interestDepositStatus === "paid"
                    ? "פיקדון שולם — המקום מובטח"
                    : interestStatus === "pending_deposit"
                      ? "ההצטרפות תושלם אוטומטית אחרי התשלום"
                      : "הספק יצור קשר בהקדם"}
                </p>
              </div>
              {hasPendingDeposit ? (
                <button
                  type="button"
                  onClick={handleResumePayment}
                  disabled={resumingPayment}
                  className="h-10 px-3 rounded-2xl bg-white text-[#1F2937] text-[11px] font-extrabold active:scale-[0.97] transition-transform disabled:opacity-60"
                >
                  {resumingPayment ? "..." : "לתשלום"}
                </button>
              ) : (
                <ShareButton deal={deal} compact />
              )}
            </div>
          ) : (
            <div className="flex items-stretch gap-2">
              <Button
                onClick={handleJoinClick}
                disabled={submittingInterest}
                className="flex-1 h-14 rounded-2xl bg-[#0E6B5A] hover:bg-[#0E6B5A]/95 text-white font-extrabold text-[15px] shadow-[0_12px_28px_-10px_rgba(10,31,61,0.6)] border border-[#0E6B5A]/40"
              >
                {submittingInterest ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isGuest ? (
                  "התחבר כדי להצטרף"
                ) : depositRequired ? (
                  `הצטרף · ${ils(Number(deal.deposit_amount))}`
                ) : (
                  "הצטרף להצעה"
                )}
              </Button>
              <ShareButton deal={deal} />
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
                  ההצטרפות תושלם אוטומטית רק לאחר תשלום הפיקדון בפועל.
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
                    {activeTier ? ` (${tierRange(activeTier)} דיירים)` : ""}
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
              className="rounded-xl bg-[#0E6B5A] text-white font-bold"
            >
              {submittingInterest ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : depositRequired ? (
                "המשך לתשלום פיקדון"
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

/* ===== Small presentational helpers ===== */

function StatCard({
  icon: Icon, accent, tint, label, value, sub,
}: {
  icon: typeof Tag; accent: string; tint: string; label: string; value: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-[20px] p-4 shadow-[0_4px_12px_-6px_rgba(10,31,61,0.12)]">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: tint }}>
          <Icon className="w-4 h-4" style={{ color: accent }} strokeWidth={2.2} />
        </div>
        <p className="text-[11px] font-bold text-[#6B7280]">{label}</p>
      </div>
      <p className="text-[20px] font-black text-[#1F2937] leading-none tracking-tight gb-num">{value}</p>
      {sub && <p className="text-[10px] font-bold text-[#6B7280] mt-1.5">{sub}</p>}
    </div>
  );
}

function DetailCell({
  icon: Icon, label, value,
}: { icon: typeof Tag; label: string; value: string }) {
  return (
    <div className="bg-white rounded-[18px] p-3.5 shadow-[0_4px_12px_-6px_rgba(10,31,61,0.10)] flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-[#F4F6FA] flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[#1F2937]" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide">{label}</p>
        <p className="text-[13px] font-extrabold text-[#1F2937] truncate">{value}</p>
      </div>
    </div>
  );
}

/** Share button — Web Share API with fallback dialog (WhatsApp / SMS / copy link). */
function ShareButton({ deal, compact = false }: { deal: { id: string; title: string }; compact?: boolean }) {
  const [shareOpen, setShareOpen] = useState(false);
  const shareUrl = `${window.location.origin}/share/deal/${deal.id}`;
  const shareText = `מצטרפים יחד למחיר משתלם: ${deal.title}\n${shareUrl}`;

  const handleShare = async () => {
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
      toast.success("הקישור הועתק");
      setShareOpen(false);
    } catch {
      toast.error("העתקה נכשלה");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        aria-label="שתפו את ההצעה"
        className={cn(
          "rounded-2xl bg-white text-[#1F2937] font-bold flex items-center justify-center gap-2 active:scale-[0.97] transition-transform shadow-[0_4px_12px_-6px_rgba(10,31,61,0.18)]",
          compact ? "h-10 w-10" : "h-14 w-14",
        )}
      >
        <Share2 className={compact ? "h-4 w-4" : "h-5 w-5"} strokeWidth={2.2} />
      </button>

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
              className="h-12 rounded-xl bg-[#0E6B5A] text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition"
            >
              <Phone className="h-5 w-5" />
              שליחה ב-SMS
            </a>
            <button
              type="button"
              onClick={copyLink}
              className="h-12 rounded-xl border-2 border-[#0E6B5A] bg-white text-[#1F2937] font-bold flex items-center justify-center gap-2 hover:bg-[#FFFBEB] transition"
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

