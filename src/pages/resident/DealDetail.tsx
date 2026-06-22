import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Star, Shield, Sparkles, Loader2, ArrowRight, ShieldCheck, Tag, Users, TrendingUp, TrendingDown, MessageCircle, Phone, CheckCircle2, CreditCard, Clock, Share2, Percent, PiggyBank, CalendarDays, MapPin, Layers, Store, Handshake, Target, PhoneCall, Wrench, BadgeCheck, Award, ChevronLeft, Building2, PartyPopper, Heart, Link2, Rocket, User as UserIcon, Pencil } from "lucide-react";
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
  const { categories, user } = useApp();
  const [supplierUserId, setSupplierUserId] = useState<string | null>(null);
  const isSupplierPreview =
    !!user && user.role === "supplier" && !!supplierUserId && supplierUserId === user.id;

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
          .select("id,business_name,logo_url,approval_status,service_areas,phone,whatsapp_url,user_id")
          .eq("id", d.supplier_id)
          .maybeSingle();
        if (!cancelled) {
          const sup = (supData as (SupplierRow & { user_id?: string | null }) | null) ?? null;
          setSupplier(sup);
          setSupplierUserId(sup?.user_id ?? null);
        }

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
  // Use the shared helper — preserves the supplier's tier data exactly as configured.
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
  // "Has anyone actually joined?" — drives whether to show a starter slot.
  const hasAnyJoiners = participantCount > 0 && activeIdx >= 0;
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

  // ----- Build a 3-slot window of tier blocks (past / active / future) -----
  // When no one has joined yet, prepend a synthetic "current state" card so the
  // user sees both where things stand now AND the first price-drop target.
  type WindowItem =
    | { kind: "starter"; state: "active" }
    | { kind: "tier"; tier: OfferTier; state: "past" | "active" | "future" };

  const tierWindow: WindowItem[] = (() => {
    if (sortedTiers.length === 0) return [];
    if (!hasAnyJoiners) {
      const visible = sortedTiers.slice(0, 2);
      return [
        { kind: "starter", state: "active" } as const,
        ...visible.map((t) => ({ kind: "tier" as const, tier: t, state: "future" as const })),
      ];
    }
    if (sortedTiers.length <= 3) {
      return sortedTiers.map((t, idx) => ({
        kind: "tier" as const,
        tier: t,
        state: (idx < activeIdx ? "past" : idx === activeIdx ? "active" : "future") as "past" | "active" | "future",
      }));
    }
    let start = Math.max(0, activeIdx - 1);
    if (start + 3 > sortedTiers.length) start = sortedTiers.length - 3;
    return sortedTiers.slice(start, start + 3).map((t) => {
      const idxInAll = sortedTiers.findIndex((x) => x.minParticipants === t.minParticipants);
      return {
        kind: "tier" as const,
        tier: t,
        state: (idxInAll < activeIdx ? "past" : idxInAll === activeIdx ? "active" : "future") as "past" | "active" | "future",
      };
    });
  })();

  // Current effective price — what the user actually pays right now.
  const currentEffectivePrice = activeDisplay?.effectivePrice ?? display.effectivePrice ?? null;

  // Savings per person if we advance to the NEXT tier (immediate motivation)
  const nextDisplay = nextTier ? describeTier(offerType, nextTier) : null;
  const savingsToNext =
    currentEffectivePrice != null && nextDisplay?.effectivePrice != null
      ? Math.max(0, currentEffectivePrice - nextDisplay.effectivePrice)
      : null;
  // For percentage offers (no shekel prices), motivation is shown as extra discount points.
  const extraDiscountToNext =
    nextDisplay?.discountPercent != null && activeDisplay?.discountPercent != null
      ? Math.max(0, nextDisplay.discountPercent - activeDisplay.discountPercent)
      : null;
  // Total max savings possible — from the reference (no-group) price all the way to the best tier
  const maxPossibleSavings =
    display.referencePrice != null && bestDisplay?.effectivePrice != null
      ? Math.max(0, display.referencePrice - bestDisplay.effectivePrice)
      : savingsPerPerson;

  const handleWhatsAppShare = () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const tierLine = nextTier
      ? `עוד ${peopleNeeded} שכנים שמצטרפים = כולם חוסכים עוד${savingsToNext && savingsToNext > 0 ? ` ${ils(savingsToNext)}` : ""}!`
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

      {isSupplierPreview && (
        <div className="px-4 mt-2">
          <div className="rounded-2xl border border-[#0E6B5A]/25 bg-[#E8F4F1] px-3.5 py-2.5 flex items-center gap-2.5 shadow-[0_4px_12px_-8px_rgba(10,31,61,0.18)]">
            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0">
              <span aria-hidden className="text-base">👁️</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-extrabold text-[#0E6B5A] leading-tight">תצוגה מקדימה – כך הדייר רואה את ההצעה שלך</div>
              <div className="text-[10.5px] text-[#1F2937]/70 leading-tight mt-0.5">פעולות הצטרפות ותשלום מוסתרות כאן</div>
            </div>
            <Link
              to={`/supplier/offers/${deal.id}/edit`}
              className="h-9 px-3 rounded-xl bg-[#0E6B5A] text-white text-[11px] font-extrabold inline-flex items-center gap-1 shrink-0"
            >
              <Pencil className="h-3.5 w-3.5" />
              עריכה
            </Link>
          </div>
        </div>
      )}



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

          {!isSupplierPreview && (hasCompletedJoin || hasPendingDeposit) && (
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
          {sortedTiers.length > 0 ? null : display.effectivePrice != null ? (
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

      {/* ===== SECTION 3 — GROUP BUYING CAMPAIGN ===== */}
      {sortedTiers.length > 0 && (
        <div className="px-4 mt-5 space-y-3">
          {/* 3a — HERO STATUS CARD (green) — current price + community message */}
          <div className="relative bg-gradient-to-br from-[#0E6B5A] to-[#0A5447] rounded-[24px] p-5 pt-6 shadow-[0_12px_30px_-12px_rgba(14,107,90,0.45)] overflow-hidden">
            {/* corner ribbon */}
            <div className="absolute -top-1 -right-1 bg-[#F5E6A8] text-[#0A5447] text-[10px] font-black px-3 py-1.5 rounded-bl-2xl rounded-tr-2xl leading-tight max-w-[120px] text-center shadow-md">
              מחיר משתפר<br/>ככל שיותר<br/>מצטרפים!
            </div>
            <div className="flex items-stretch gap-3 mt-2">
              {/* right side — current price card */}
              <div className="bg-white rounded-2xl px-3 py-3 flex-1 min-w-0 text-center shadow-sm">
                <div className="text-[10px] font-bold text-[#6B7280] mb-1">המחיר שלך כרגע</div>
                {currentEffectivePrice != null ? (
                  <div className="text-[26px] font-black text-[#1F2937] gb-num leading-none">{ils(currentEffectivePrice)}</div>
                ) : (
                  <div className="text-[16px] font-black text-[#1F2937]">{display.headline}</div>
                )}
                <div className="text-[9px] font-medium text-[#6B7280] mt-1.5">ללא רכישה קבוצתית</div>
              </div>
              {/* left side — community message */}
              <div className="flex-1 min-w-0 text-white flex flex-col justify-center text-right">
                <div className="flex items-center gap-1.5 justify-end mb-1">
                  <span className="text-[13px] font-black">יחד חוסכים יותר</span>
                  <Users className="w-4 h-4 text-[#F5E6A8]" strokeWidth={2.4} />
                </div>
                <p className="text-[10.5px] leading-snug text-white/85 font-medium">
                  כל הצטרפות מקרבת את כולנו למחיר נמוך יותר
                </p>
              </div>
            </div>
          </div>

          {/* 3b — PROGRESS CARD (white) — neighbors needed + next price */}
          {nextTier && peopleNeeded > 0 && (
            <div className="bg-white rounded-[24px] p-4 shadow-[0_8px_20px_-10px_rgba(10,31,61,0.18)]">
              <div className="flex items-stretch gap-3">
                {/* right — progress */}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-black text-[#1F2937] mb-2 leading-tight text-right">
                    חסרים רק <span className="text-[#0E6B5A]">{peopleNeeded}</span> שכנים לדרגה הבאה!
                  </div>
                  {/* avatar dots */}
                  <div className="flex items-center gap-1.5 justify-end mb-2.5 flex-row-reverse">
                    {Array.from({ length: Math.max(progressTarget, participantCount) }).map((_, i) => {
                      const filled = i < participantCount;
                      return (
                        <div
                          key={i}
                          className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                            filled
                              ? "bg-[#0E6B5A] shadow-sm"
                              : "border-2 border-dashed border-[#0E6B5A]/30 bg-white"
                          )}
                        >
                          <UserIcon
                            className={cn("w-3.5 h-3.5", filled ? "text-white" : "text-[#0E6B5A]/40")}
                            strokeWidth={2.4}
                          />
                        </div>
                      );
                    })}
                  </div>
                  {/* progress bar */}
                  <div className="w-full bg-[#E8EBEF] h-1.5 rounded-full overflow-hidden mb-1.5">
                    <div
                      className="bg-gradient-to-l from-[#0E6B5A] to-[#34A88E] h-full rounded-full transition-all duration-700"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="text-[10px] font-bold text-[#6B7280] text-right gb-num">
                    {participantCount} מתוך {progressTarget} הצטרפו
                  </div>
                </div>

                {/* left — next price / next discount */}
                <div className="bg-[#F0F9F6] border border-[#0E6B5A]/15 rounded-2xl p-3 w-[120px] shrink-0 flex flex-col items-center justify-center text-center relative">
                  <Sparkles className="absolute top-1.5 left-1.5 w-3 h-3 text-[#F5C547]" />
                  <div className="text-[10px] font-bold text-[#0E6B5A] mb-0.5">המחיר הבא</div>
                  {nextDisplay?.effectivePrice != null ? (
                    <div className="text-[20px] font-black text-[#0E6B5A] gb-num leading-none">{ils(nextDisplay.effectivePrice)}</div>
                  ) : nextDisplay?.discountPercent != null ? (
                    <div className="text-[20px] font-black text-[#0E6B5A] gb-num leading-none">{nextDisplay.discountPercent}%<span className="text-[10px] font-bold mr-1">הנחה</span></div>
                  ) : null}
                  {savingsToNext && savingsToNext > 0 ? (
                    <div className="mt-2 bg-[#FFF8E1] text-[#8A6A1E] text-[9.5px] font-black px-2 py-1 rounded-lg leading-tight">
                      תחסכו עוד {ils(savingsToNext)} לאדם
                    </div>
                  ) : extraDiscountToNext && extraDiscountToNext > 0 ? (
                    <div className="mt-2 bg-[#FFF8E1] text-[#8A6A1E] text-[9.5px] font-black px-2 py-1 rounded-lg leading-tight">
                      +{extraDiscountToNext}% הנחה לכולם
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* 3c — TIER TIMELINE */}
          <div className="pt-2">
            <h2 className="text-[14px] font-black text-[#1F2937] text-center mb-3">
              ככל שמצטרפים — המחיר לכולם יורד
            </h2>

            {/* 3 tier cards */}
            <div className="grid grid-cols-3 gap-2">
              {tierWindow.map((item, idx) => {
                const baseCard = "rounded-2xl p-3 h-[110px] flex flex-col items-center justify-center text-center relative";
                if (item.kind === "starter") {
                  // "Current state" — no one has joined yet. Show reference (no-group) price
                  // or a neutral label for percentage offers without a base price.
                  const refPrice = display.referencePrice;
                  return (
                    <div key={idx} className={cn(baseCard, "bg-white border-2 border-[#E8EBEF]")}>
                      <UserIcon className="w-4 h-4 text-[#6B7280] mb-1" strokeWidth={2.4} />
                      <div className="text-[10px] font-bold text-[#6B7280] mb-0.5 gb-num">0 מצטרפים</div>
                      {refPrice != null ? (
                        <div className="text-[18px] font-black text-[#1F2937] gb-num leading-none">{ils(refPrice)}</div>
                      ) : (
                        <div className="text-[13px] font-black text-[#1F2937] leading-tight">מחיר רגיל</div>
                      )}
                      <div className="text-[9px] font-medium text-[#6B7280] mt-1">המצב כרגע</div>
                    </div>
                  );
                }
                const { tier, state } = item;
                const td = describeTier(offerType, tier);
                const tierPrice = td.effectivePrice != null ? ils(td.effectivePrice) : td.headline;
                const range = tierRange(tier);
                const isNextTarget = nextTier && tier.minParticipants === nextTier.minParticipants;
                if (state === "past") {
                  return (
                    <div key={idx} className={cn(baseCard, "bg-[#F4F6FA] border border-[#E8EBEF] opacity-60")}>
                      <Users className="w-4 h-4 text-[#9CA3AF] mb-1" />
                      <div className="text-[10px] font-bold text-[#6B7280] mb-0.5 gb-num">{range} מצטרפים</div>
                      <div className="text-[16px] font-black text-[#6B7280] line-through gb-num leading-none">{tierPrice}</div>
                    </div>
                  );
                }
                if (state === "active") {
                  return (
                    <div key={idx} className={cn(baseCard, "bg-white border-2 border-[#E8EBEF]")}>
                      <Users className="w-4 h-4 text-[#6B7280] mb-1" />
                      <div className="text-[10px] font-bold text-[#6B7280] mb-0.5 gb-num">{range} מצטרפים</div>
                      <div className="text-[18px] font-black text-[#1F2937] gb-num leading-none">{tierPrice}</div>
                      <div className="text-[9px] font-medium text-[#6B7280] mt-1">המחיר הנוכחי</div>
                    </div>
                  );
                }
                // future
                return (
                  <div key={idx} className={cn(baseCard, isNextTarget ? "bg-white border-2 border-[#0E6B5A] shadow-[0_4px_14px_-4px_rgba(14,107,90,0.35)]" : "bg-white border border-[#E8EBEF]")}>
                    {isNextTarget && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#F5C547] text-[#5C3F00] text-[9px] px-2 py-0.5 rounded-full font-black shadow-sm whitespace-nowrap">
                        יעד הבא!
                      </div>
                    )}
                    <Users className={cn("w-4 h-4 mb-1", isNextTarget ? "text-[#0E6B5A]" : "text-[#6B7280]")} />
                    <div className={cn("text-[10px] font-bold mb-0.5 gb-num", isNextTarget ? "text-[#0E6B5A]" : "text-[#6B7280]")}>{range} מצטרפים</div>
                    <div className={cn("text-[18px] font-black gb-num leading-none", isNextTarget ? "text-[#0E6B5A]" : "text-[#1F2937]")}>{tierPrice}</div>
                    {isNextTarget && savingsToNext && savingsToNext > 0 ? (
                      <div className="text-[9px] font-bold text-[#0E6B5A] mt-1">חיסכון של {ils(savingsToNext)} לאדם</div>
                    ) : isNextTarget && extraDiscountToNext && extraDiscountToNext > 0 ? (
                      <div className="text-[9px] font-bold text-[#0E6B5A] mt-1">+{extraDiscountToNext}% הנחה לכולם</div>
                    ) : (
                      <div className="text-[9px] font-medium text-[#6B7280] mt-1">היעד הבא</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* horizontal stepper dots */}
            <div className="relative mt-3 px-2 h-6 flex items-center">
              <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-[3px] bg-[#E8EBEF] rounded-full" />
              <div
                className="absolute right-2 top-1/2 -translate-y-1/2 h-[3px] bg-[#0E6B5A] rounded-full transition-all duration-700"
                style={{ width: `calc(${ladderFill}% - 0px)`, maxWidth: "calc(100% - 16px)" }}
              />
              <div className="relative w-full flex justify-between flex-row-reverse">
                {tierWindow.map((item, idx) => {
                  const isActive = item.kind === "tier" && item.state === "active";
                  const isPast = item.kind === "tier" && item.state === "past";
                  return (
                    <span
                      key={idx}
                      className={cn(
                        "w-3.5 h-3.5 rounded-full border-2 bg-white",
                        isActive ? "border-[#0E6B5A] bg-[#0E6B5A]" : isPast ? "border-[#0E6B5A]" : "border-[#CBD5E0]"
                      )}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3d — FOMO BUILDING CARD */}
          {participantCount > 0 && (
            <div className="bg-gradient-to-l from-[#F0F9F6] to-[#F7FBFA] border border-[#0E6B5A]/15 rounded-[20px] p-4">
              <div className="flex items-center justify-between gap-3">
                {/* right — neighbors joined */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex -space-x-2 flex-row-reverse">
                    {Array.from({ length: Math.min(3, participantCount) }).map((_, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-br from-[#34A88E] to-[#0E6B5A] flex items-center justify-center text-white shadow-sm"
                      >
                        <UserIcon className="w-4 h-4" strokeWidth={2.4} />
                      </div>
                    ))}
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] font-black text-[#1F2937] leading-tight gb-num">
                      {participantCount} שכנים כבר
                    </div>
                    <div className="text-[11px] font-bold text-[#1F2937] leading-tight">הצטרפו 🎉</div>
                  </div>
                </div>

                {/* left — building savings */}
                {maxPossibleSavings && (
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="text-left">
                      <div className="text-[10px] font-bold text-[#6B7280] leading-tight">הבניין כבר חסך יחד</div>
                      <div className="text-[16px] font-black text-[#0E6B5A] gb-num leading-tight mt-0.5">
                        {ils((display.referencePrice ?? 0) - (currentEffectivePrice ?? 0) > 0
                          ? ((display.referencePrice ?? 0) - (currentEffectivePrice ?? 0)) * participantCount
                          : 0)}
                      </div>
                      <div className="text-[9px] font-medium text-[#6B7280] leading-tight">בזכות הצטרפות שכנים</div>
                    </div>
                    <Building2 className="w-8 h-8 text-[#0E6B5A]/70" strokeWidth={1.8} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3e — DARK SHARE CARD */}
          <div className="bg-gradient-to-br from-[#062E27] to-[#0A4438] text-white rounded-[24px] p-5 shadow-xl relative overflow-hidden">
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-[#34A88E]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="text-center mb-1">
              <div className="text-[15px] font-black leading-tight">
                <span className="inline-block animate-bounce ml-1">🚀</span>
                הזמינו שכנים והורידו מחיר לכולם!
              </div>
              <p className="text-[11px] text-white/70 mt-1.5">
                {nextTier && peopleNeeded > 0
                  ? `חסרים רק ${peopleNeeded} שכנים לדרגה הבאה`
                  : "כל שיתוף מחזק את הקבוצה"}
              </p>
            </div>

            {/* 3 stats with arrows */}
            <div className="flex items-center justify-around gap-2 my-4">
              <div className="flex flex-col items-center text-center flex-1">
                <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center mb-1.5">
                  <Share2 className="w-5 h-5 text-white/90" strokeWidth={2.2} />
                </div>
                <div className="text-[11px] font-bold text-white/80 leading-tight">שתפו<br/>עם שכנים</div>
              </div>
              <ArrowRight className="w-4 h-4 text-white/30 shrink-0 rotate-180" />
              <div className="flex flex-col items-center text-center flex-1">
                <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center mb-1.5">
                  <TrendingDown className="w-5 h-5 text-[#F5C547]" strokeWidth={2.4} />
                </div>
                <div className="text-[11px] font-bold text-white/80 leading-tight">המחיר יורד<br/>לכולם</div>
              </div>
              <ArrowRight className="w-4 h-4 text-white/30 shrink-0 rotate-180" />
              <div className="flex flex-col items-center text-center flex-1">
                <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center mb-1.5">
                  <Heart className="w-5 h-5 text-[#FF7A7A]" strokeWidth={2.4} fill="currentColor" />
                </div>
                <div className="text-[11px] font-bold text-white/80 leading-tight">כולם<br/>חוסכים יותר</div>
              </div>
            </div>

            {/* WhatsApp pulse button */}
            <div className="relative">
              <span className="absolute inset-0 rounded-2xl bg-[#25D366] animate-ping opacity-20 pointer-events-none" />
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="relative w-full bg-[#25D366] hover:bg-[#22c35e] text-white font-extrabold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.97] shadow-lg shadow-[#25D366]/30"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                שתפו עכשיו בוואטסאפ
              </button>
            </div>

            {/* copy link */}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  navigator.clipboard?.writeText(window.location.href);
                  toast.success("הקישור הועתק");
                }
              }}
              className="mt-3 w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-white/70 hover:text-white underline underline-offset-4"
            >
              <Link2 className="w-3.5 h-3.5" />
              או העתק קישור
            </button>
          </div>

          {/* footnote */}
          <p className="text-[11px] text-[#6B7280] text-center font-medium px-4">
            ההצטרפות ללא התחייבות. המחיר מתעדכן אוטומטית לפי מספר המצטרפים.
          </p>

          {daysRemaining !== null && (
            <div className="mt-1 flex items-center justify-center gap-2 text-[11px] font-bold text-[#6B7280]">
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

