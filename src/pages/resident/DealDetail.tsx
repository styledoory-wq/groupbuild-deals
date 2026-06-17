import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Star, Shield, Sparkles, Loader2, ArrowRight, ShieldCheck, Tag, Users, TrendingUp, MessageCircle, Phone, CheckCircle2, CreditCard, Clock, Share2, Percent, PiggyBank, CalendarDays, MapPin, Layers, Store, Handshake, Target, PhoneCall, Wrench, BadgeCheck, Award, ChevronLeft } from "lucide-react";
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
    if (pendingPaymentUrl) {
      navigate(`/payment/checkout?url=${encodeURIComponent(pendingPaymentUrl)}&deal_id=${encodeURIComponent(deal.id)}`);
      return;
    }
    setResumingPayment(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) { toast.error("נדרשת התחברות"); return; }
      const uid = session.session.user.id;
      // Try existing deposit first
      const { data: dep } = await supabase
        .from("deposits")
        .select("id,status,provider_payment_url")
        .eq("user_id", uid)
        .eq("deal_id", deal.id)
        .eq("is_deleted", false)
        .in("status", ["pending"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      let url = dep?.provider_payment_url ?? null;
      if (!url) {
        const { data: paymentResponse, error: paymentErr } = await supabase.functions.invoke("create-deposit", {
          body: { deal_id: deal.id, user_id: uid },
        });
        if (paymentErr || paymentResponse?.error) {
          toast.error(paymentResponse?.message ?? "התשלום נכשל, נסה שנית");
          return;
        }
        url = typeof paymentResponse?.payment_url === "string" ? paymentResponse.payment_url : null;
        const depositId = typeof paymentResponse?.deposit_id === "string" ? paymentResponse.deposit_id : null;
        if (!url && depositId) {
          toast.loading("ממתינים לקישור התשלום מהספק...", { id: "wait-payment-url" });
          const started = Date.now();
          while (Date.now() - started < 30000) {
            await new Promise((r) => setTimeout(r, 1500));
            const { data: depRow } = await supabase
              .from("deposits")
              .select("provider_payment_url,status")
              .eq("id", depositId)
              .maybeSingle();
            if (depRow?.provider_payment_url) { url = depRow.provider_payment_url; break; }
            if (depRow?.status === "failed" || depRow?.status === "cancelled") break;
          }
          toast.dismiss("wait-payment-url");
        }
      }
      if (!url) { toast.error("שגיאה בחיבור לספק התשלום — פנה לתמיכה"); return; }
      setPendingPaymentUrl(url);
      navigate(`/payment/checkout?url=${encodeURIComponent(url)}&deal_id=${encodeURIComponent(deal.id)}`);
    } finally {
      setResumingPayment(false);
    }
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

  return (
    <MobileShell>
      {/* Slim back header */}
      <div className="px-2 pt-2">
        <PageHeader title="" subtitle="" back variant="navy" />
      </div>

      {/* ===== SECTION 1 — HERO ===== */}
      <div className="px-4 mt-2">
        <div className="relative rounded-[28px] overflow-hidden bg-white shadow-[0_8px_20px_-10px_rgba(10,31,61,0.18)]">
          {heroImages.length > 0 ? (
            <div className="relative">
              <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar">
                {heroImages.map((url, i) => (
                  <img
                    key={url + i}
                    src={url}
                    alt={`${deal.title} ${i + 1}`}
                    className="w-full h-[240px] object-cover shrink-0 snap-start"
                    style={{ flex: "0 0 100%" }}
                  />
                ))}
              </div>
              {heroImages.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/30 backdrop-blur-md px-2.5 py-1 rounded-full">
                  {heroImages.map((_, i) => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/90" />
                  ))}
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent pointer-events-none" />
            </div>
          ) : (
            <div className="w-full h-[180px] bg-gradient-to-br from-[#EAF2FF] to-[#FFF8E1]" />
          )}

          <span
            className="absolute top-4 right-4 inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-full shadow-[0_2px_6px_rgba(10,31,61,0.18)]"
            style={{ color: statusMeta.fg, background: statusMeta.bg }}
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

          <div className="p-5">
            {category?.name && (
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#6B7280] mb-2">
                <span>{category.icon ?? "🏷️"}</span>
                <span>{category.name}</span>
              </div>
            )}
            <EditableField
              table="deals"
              id={deal.id}
              field="title"
              value={deal.title}
              as="h1"
              className="text-[24px] leading-[1.15] font-extrabold text-[#1F2937] tracking-tight"
            />
            {supplier && (
              <div className="flex items-center gap-2 mt-2.5">
                <SupplierLogo name={supplier.business_name} logoUrl={supplier.logo_url} size="sm" />
                <span className="text-[13px] font-bold text-[#1F2937]">{supplier.business_name}</span>
                {supplier.approval_status === "approved" && (
                  <BadgeCheck className="h-4 w-4 text-[#2EA85A]" strokeWidth={2.4} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== SECTION 1b — COMPACT KEY METRICS STRIP ===== */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-[20px] px-4 py-3 shadow-[0_4px_12px_-6px_rgba(10,31,61,0.12)] flex items-center justify-between divide-x divide-x-reverse divide-[#ECEEF2]">
          <div className="flex-1 text-center px-2">
            <div className="text-[18px] font-extrabold text-[#E8742C] leading-none">{discountPct ? `${discountPct}%` : "—"}</div>
            <div className="text-[10px] font-bold text-[#6B7280] mt-1">הנחה</div>
          </div>
          {savingsAmount ? (
            <div className="flex-1 text-center px-2">
              <div className="text-[18px] font-extrabold text-[#2EA85A] leading-none">{ils(savingsAmount)}</div>
              <div className="text-[10px] font-bold text-[#6B7280] mt-1">חיסכון</div>
            </div>
          ) : null}
          {daysRemaining !== null && (
            <div className="flex-1 text-center px-2">
              <div className="text-[18px] font-extrabold text-[#1F2937] leading-none">{daysRemaining}</div>
              <div className="text-[10px] font-bold text-[#6B7280] mt-1">ימים לסגירה</div>
            </div>
          )}
        </div>
      </div>

      {/* Progress + benefits removed — info shown in tiers ladder & how-it-works */}


      {/* SECTION 4 removed — info already shown in hero, metrics strip & supplier card */}

      {/* ===== SECTION 5 — HOW IT WORKS ===== */}
      <div className="px-4 mt-5">
        <h2 className="text-[15px] font-extrabold text-[#1F2937] mb-3 px-1">איך זה עובד</h2>
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

      {/* ===== SECTION 6 — SUPPLIER CARD ===== */}
      {supplier && (
        <div className="px-4 mt-5">
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
              className="mt-4 flex items-center justify-center gap-1 h-11 rounded-2xl bg-[#F4F6FA] text-[#1F2937] text-[13px] font-bold active:scale-[0.98] transition-transform"
            >
              צפייה בפרופיל הספק
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* ===== TIERS LADDER (horizontal stepper) ===== */}
      {tiers.length > 0 && (() => {
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
        return (
          <div className="px-4 mt-5">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-[15px] font-extrabold text-[#1F2937]">מדרגות מחיר לקבוצה</h2>
              <span className="text-[11px] font-extrabold text-[#0E6B5A] bg-[#0E6B5A]/10 px-2 py-0.5 rounded-md">
                {participantCount} משתתפים כרגע
              </span>
            </div>
            <div className="bg-white rounded-[24px] p-5 shadow-[0_8px_20px_-10px_rgba(10,31,61,0.18)]">
              {/* Horizontal stepper */}
              <div className="relative pt-7 pb-2">
                <div className="flex justify-between relative">
                  {/* Track background */}
                  <div className="absolute top-1.5 left-2 right-2 h-1 bg-[#ECEEF2] rounded-full" />
                  {/* Progress fill (RTL: from right) */}
                  <div
                    className="absolute top-1.5 right-2 h-1 bg-[#0E6B5A] rounded-full transition-all duration-700"
                    style={{ width: `calc(${ladderFill}% - ${ladderFill > 0 ? '4px' : '0px'})` }}
                  />
                  {sortedTiers.map((t, idx) => {
                    const td = describeTier(offerType, t);
                    const isActive = idx === activeIdx;
                    const isPast = activeIdx >= 0 && idx < activeIdx;
                    return (
                      <div key={idx} className="relative flex flex-col items-center flex-1 min-w-0">
                        <div
                          className={cn(
                            "rounded-full border-4 border-white z-10 transition-all",
                            isActive
                              ? "w-4 h-4 bg-[#0E6B5A] shadow-md ring-4 ring-[#0E6B5A]/20"
                              : isPast
                                ? "w-4 h-4 bg-[#0E6B5A] shadow-sm"
                                : "w-4 h-4 bg-[#E5E7EB]",
                          )}
                        />
                        <div className={cn("mt-2 text-center", !isActive && !isPast && "opacity-70")}>
                          <div
                            className={cn(
                              "text-[10px] leading-tight",
                              isActive ? "text-[#0E6B5A] font-extrabold" : "text-[#6B7280] font-medium",
                            )}
                          >
                            {tierRange(t)} חברים
                          </div>
                          <div
                            className={cn(
                              "gb-num leading-tight mt-0.5",
                              isActive ? "text-[13px] font-extrabold text-[#1F2937]" : "text-[11px] font-bold text-[#1F2937]",
                            )}
                          >
                            {td.headline}
                          </div>
                        </div>
                        {isActive && (
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full">
                            <div className="bg-[#0E6B5A] text-white text-[9px] px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm">
                              המחיר שלך
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Unlock next tier promo */}
              {nextTier && peopleNeeded > 0 && bestDisplay && (
                <div className="mt-5 bg-[#F7F5F0] border border-[#ECEEF2] rounded-2xl p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center border border-[#ECEEF2] shadow-sm shrink-0">
                      <span className="text-[#0E6B5A] font-black text-sm">+{peopleNeeded}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] font-extrabold text-[#1F2937] leading-tight">
                        עוד {peopleNeeded} חברים למחיר הבא
                      </div>
                      {savingsPerPerson && savingsPerPerson > 0 ? (
                        <div className="text-[10px] text-[#6B7280] leading-snug mt-0.5">
                          חיסכון נוסף של {ils(savingsPerPerson)} לכל אחד מהקבוצה
                        </div>
                      ) : (
                        <div className="text-[10px] text-[#6B7280] leading-snug mt-0.5">
                          המחיר ירד אוטומטית עבור כל הקבוצה
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-[#0E6B5A] font-black text-[15px] gb-num shrink-0">
                    {describeTier(offerType, nextTier).headline}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

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

