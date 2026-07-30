import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Loader2, ArrowRight, Tag, Users, MessageCircle, Phone, CheckCircle2, Clock, Share2, CalendarDays, MapPin, Handshake, Target, PhoneCall, Wrench, BadgeCheck, ChevronLeft, ChevronRight, Link2, Pencil, Shield, Lock, TrendingDown, Sparkles } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { SmartImg } from "@/components/ui/SmartImg";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { PaymentInstructionsCard, type SupplierPaymentInfo } from "@/components/deals/PaymentInstructionsCard";
import { FavoriteButton } from "@/components/deals/FavoriteButton";
import { Reveal } from "@/components/resident-home/Reveal";
import { SupplierRatingBadge } from "@/components/reviews/SupplierRatingBadge";
import { useApp } from "@/store/AppStore";
import { useGuestGate } from "@/hooks/useGuestGate";
import { getFriendlyLoadError } from "@/lib/safeAsync";
import { EditableField } from "@/components/admin/EditableField";
import { getCategoryCover } from "@/lib/categoryCover";
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
  product_details: string | null;
  listing_type: "group_buy" | "regular" | null;

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
  const [showPaymentInstructions, setShowPaymentInstructions] = useState(false);
  const [pendingDepositId, setPendingDepositId] = useState<string | null>(null);
  const [pendingDepositAmount, setPendingDepositAmount] = useState<number>(0);
  const [supplierPaymentInfo, setSupplierPaymentInfo] = useState<SupplierPaymentInfo | null>(null);

  const openPaymentInstructions = (
    depositId: string,
    amount: number,
    info: SupplierPaymentInfo | null,
  ) => {
    setPendingDepositId(depositId);
    setPendingDepositAmount(amount);
    setSupplierPaymentInfo(info);
    setShowPaymentInstructions(true);
  };

  const handleResumePayment = async () => {
    if (!deal) return;
    setResumingPayment(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      if (!uid) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: dep } = await (supabase.from("deposits") as any)
        .select("id,amount,status")
        .eq("user_id", uid)
        .eq("deal_id", deal.id)
        .eq("is_deleted", false)
        .in("status", ["pending", "awaiting_confirmation"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: supRows } = await (supabase as any).rpc("get_deal_supplier_payment_info", { _deal_id: deal.id });
      const sup = Array.isArray(supRows) && supRows.length > 0 ? supRows[0] : null;
      if (dep) {
        openPaymentInstructions(dep.id as string, Number(dep.amount ?? deal.deposit_amount ?? 0), (sup ?? null) as SupplierPaymentInfo | null);
      } else {
        toast.error("לא נמצא פיקדון פעיל");
      }
    } finally {
      setResumingPayment(false);
    }
  };

  // Join modal state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const [showRequestGroupBuy, setShowRequestGroupBuy] = useState(false);
  const [submittingGroupBuyRequest, setSubmittingGroupBuyRequest] = useState(false);
  const [groupBuyRequested, setGroupBuyRequested] = useState(false);

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
    // RPC requires authentication; guests see the base tier without a 401 request.
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setParticipantCount(0);
      return;
    }
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
            "id,title,description,status,category_id,supplier_id,offer_type,original_price,discounted_price,discount_percentage,base_price,tiers,ends_at,deposit_required,deposit_amount,cover_image_url,gallery_images,offer_terms,restrictions,service_areas,join_deadline,redemption_deadline,appointment_required,product_details,listing_type",

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

        const { data: supData } = await supabase
          .from("suppliers")
          .select("id,business_name,logo_url,approval_status,service_areas,phone,whatsapp_url,user_id")
          .eq("id", d.supplier_id)
          .maybeSingle();
        const sup = (supData as (SupplierRow & { user_id?: string | null }) | null) ?? null;

        // Status gating: only active/closed are publicly viewable.
        // Drafts (and other non-public statuses) are accessible only to the owning supplier or admins.
        const publicStatuses = ["active", "closed"];
        if (!publicStatuses.includes(String(d.status))) {
          const { data: session } = await supabase.auth.getSession();
          const uid = session.session?.user.id;
          const isOwner = !!uid && !!sup?.user_id && sup.user_id === uid;
          let isAdmin = false;
          if (uid && !isOwner) {
            const { data: roleRow } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", uid)
              .eq("role", "admin")
              .maybeSingle();
            isAdmin = !!roleRow;
          }
          if (!isOwner && !isAdmin) {
            if (!cancelled) {
              setError("העסקה לא נמצאה");
              setLoading(false);
            }
            return;
          }
        }

        if (!cancelled) {
          setDeal(d);
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

  const { requireAuth } = useGuestGate();

  const handleJoinClick = () => {
    if (!deal) return;
    requireAuth("להצטרף להצעות קבוצתיות", () => setShowJoinModal(true));
  };

  const handleRequestGroupBuy = () => {
    if (!deal) return;
    requireAuth("לבקש קבוצת רכישה", () => setShowRequestGroupBuy(true));
  };


  const submitRequestGroupBuy = async () => {
    if (!deal) return;
    const { guardPreview } = await import("@/lib/previewMode");
    if (guardPreview(toast)) return;
    setSubmittingGroupBuyRequest(true);
    try {
      const { error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ error: { message: string } | null }>)("request_group_buy", { p_deal_id: deal.id });
      if (error) throw new Error(error.message);
      setGroupBuyRequested(true);
      toast.success("הבקשה נשלחה! הספק יקבל התראה על הביקוש");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "אירעה שגיאה";
      toast.error(msg);
    } finally {
      setSubmittingGroupBuyRequest(false);
    }
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

      let depositId: string | null = null;
      let depositAmount: number = Number(deal.deposit_amount ?? 0);
      let paymentInfo: SupplierPaymentInfo | null = null;
      if (depositRequired) {
        const { data: paymentResponse, error: paymentErr } = await supabase.functions.invoke("create-deposit", {
          body: { deal_id: deal.id, user_id: session.session.user.id, interest_id: interestId ?? undefined },
        });
        if (paymentErr) {
          console.error("[create_deposit_failed]", paymentErr);
          toast.error("יצירת הפיקדון נכשלה, נסה שנית");
          return;
        }
        if (paymentResponse?.error) {
          console.error("[create_deposit_error_response]", paymentResponse);
          toast.error(paymentResponse.message ?? "יצירת הפיקדון נכשלה");
          return;
        }
        depositId = typeof paymentResponse?.deposit_id === "string" ? paymentResponse.deposit_id : null;
        if (typeof paymentResponse?.amount === "number") depositAmount = paymentResponse.amount;
        paymentInfo = (paymentResponse?.supplier_payment_info ?? null) as SupplierPaymentInfo | null;
        if (!depositId) {
          toast.error("שגיאה ביצירת הפיקדון — פנה לתמיכה");
          return;
        }
      }


      if (depositRequired) {
        setInterested(true);
        setInterestStatus("pending_deposit");
        setInterestDepositStatus("pending");
        setPendingPaymentUrl(null);
        setShowJoinModal(false);
        toast.success("פרטי הבקשה נשמרו — סיים את ההעברה לספק להשלמת ההצטרפות");
        if (depositId) {
          openPaymentInstructions(depositId, depositAmount, paymentInfo);
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
        <BottomNav role={user?.role === "supplier" ? "supplier" : "resident"} />
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
        <BottomNav role={user?.role === "supplier" ? "supplier" : "resident"} />
      </MobileShell>
    );
  }

  const offerType = ((deal.offer_type as OfferType | null) ?? "percentage") as OfferType;
  const isRegularListing = (deal.listing_type ?? "group_buy") === "regular";
  const tiers = isRegularListing ? [] : (Array.isArray(deal.tiers) ? deal.tiers : []);

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
  const activeDisplay = activeTier ? describeTier(offerType, activeTier) : null;

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
  // When nobody has joined yet, show the BASE price (reference) so the user
  // understands the group discount hasn't kicked in. Falls back to the first
  // tier / display price only if no reference price is configured.
  const currentEffectivePrice = hasAnyJoiners
    ? (activeDisplay?.effectivePrice ?? display.effectivePrice ?? null)
    : (display.referencePrice ?? display.effectivePrice ?? null);

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
  // Total group savings — relative to the FIRST tier's price (entry-point price),
  // so we don't show fake savings just because someone joined the lowest tier.
  const firstTier = sortedTiers[0];
  const firstTierDisplay = firstTier ? describeTier(offerType, firstTier) : null;
  const groupSavings =
    firstTierDisplay?.effectivePrice != null && currentEffectivePrice != null
      ? Math.max(0, firstTierDisplay.effectivePrice - currentEffectivePrice) * participantCount
      : 0;
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

  const heroCoverStyle =
    heroImages.length > 0
      ? undefined
      : getCategoryCover({
          categoryId: deal.category_id,
          categoryName: category?.name,
          categoryIcon: category?.icon,
          seed: deal.id,
        }).gradient;

  const renderHeroMedia = (className: string, options?: { kenBurns?: boolean }) => (
    <div
      className={cn("relative overflow-hidden", className)}
      style={heroImages.length === 0 ? { background: heroCoverStyle } : undefined}
    >
      {heroImages.length > 0 ? (
        <div className="absolute inset-0">
          <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar h-full">
            {heroImages.map((url, i) => (
              <SmartImg
                key={url + i}
                src={url}
                size="detail"
                alt={`${deal.title} ${i + 1}`}
                priority={i === 0}
                eager={i === 0}
                className={cn(
                  "w-full h-full object-cover shrink-0 snap-start",
                  options?.kenBurns && i === 0 && heroImages.length === 1 && "gb-hero-drift",
                )}
                style={{ flex: "0 0 100%" }}
              />
            ))}
          </div>
          {heroImages.length > 1 && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/35 backdrop-blur-md px-2.5 py-1 rounded-full">
              {heroImages.map((_, i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/90" />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <div className="text-[56px] leading-none mb-2 drop-shadow-md">{category?.icon || "✨"}</div>
          <div className="text-white/95 text-[14px] font-extrabold drop-shadow">{category?.name || deal.title}</div>
        </div>
      )}
    </div>
  );

  const joinCtaLabel = submittingInterest
    ? null
    : isGuest
      ? "הצטרפו לקבוצה"
      : depositRequired
        ? `שמרו מקום · ${ils(Number(deal.deposit_amount))}`
        : "שמרו את המקום שלכם";

  const locationLine =
    deal.service_areas && deal.service_areas.length > 0
      ? deal.service_areas.slice(0, 2).join(" · ")
      : category?.name ?? null;

  const currentTierHeadline =
    activeDisplay?.discountPercent != null
      ? `${activeDisplay.discountPercent}% הנחה`
      : activeDisplay?.effectivePrice != null
        ? ils(activeDisplay.effectivePrice)
        : currentEffectivePrice != null
          ? ils(currentEffectivePrice)
          : display.headline;

  const dealFactCells: Array<{ icon: typeof Tag; label: string; value: string }> = [];
  if (deal.join_deadline) {
    dealFactCells.push({
      icon: CalendarDays,
      label: "הצטרפות עד",
      value: new Date(deal.join_deadline).toLocaleDateString("he-IL", { day: "numeric", month: "short" }),
    });
  }
  if (depositRequired && deal.deposit_amount) {
    dealFactCells.push({
      icon: Lock,
      label: "פיקדון",
      value: ils(Number(deal.deposit_amount)),
    });
  }
  if (deal.service_areas && deal.service_areas.length > 0) {
    dealFactCells.push({
      icon: MapPin,
      label: "אזור שירות",
      value: deal.service_areas.slice(0, 2).join(" · "),
    });
  }
  if (deal.appointment_required) {
    dealFactCells.push({
      icon: Clock,
      label: "לפני מימוש",
      value: "נדרשת פגישה",
    });
  }
  if (daysRemaining !== null && dealFactCells.length < 4) {
    dealFactCells.push({
      icon: Clock,
      label: "סגירת הצעה",
      value: `${daysRemaining} ימים`,
    });
  }

  const lastTier = sortedTiers.length > 0 ? sortedTiers[sortedTiers.length - 1] : null;
  const lastTierDisplay = lastTier ? describeTier(offerType, lastTier) : null;
  const peakSavings =
    display.referencePrice != null && lastTierDisplay?.effectivePrice != null
      ? Math.max(0, display.referencePrice - lastTierDisplay.effectivePrice)
      : savingsAmount;
  const neighborAvatarCount = Math.min(Math.max(participantCount, 0), 4);
  const neighborAvatarGradients = [
    "bg-gradient-to-br from-[#0E6B5A] to-[#34A88E]",
    "bg-gradient-to-br from-[#1A7F6E] to-[#0A5447]",
    "bg-gradient-to-br from-[#34A88E] to-[#0E6B5A]",
    "bg-gradient-to-br from-[#0A5447] to-[#1A7F6E]",
  ];

  return (
    <MobileShell>
      {sortedTiers.length === 0 && (
        <div className="px-2 pt-2">
          <PageHeader title="" subtitle="" back variant="navy" />
        </div>
      )}

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

      {sortedTiers.length > 0 ? (
        <>
          {/* ===== Pro Invite — data-rich, uncluttered (app palette) ===== */}
          <div className="px-2 mt-1">
            <div className="relative h-[340px] rounded-[28px] overflow-hidden shadow-[0_24px_48px_-28px_rgba(11,18,32,0.4)]">
              {renderHeroMedia("absolute inset-0", { kenBurns: true })}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1220]/85 via-[#0B1220]/35 to-[#0B1220]/25 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#0E6B5A]/15 via-transparent to-transparent pointer-events-none mix-blend-soft-light" aria-hidden />

              <div className="relative z-[2] flex items-center justify-between px-3 pt-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="h-11 w-11 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center active:scale-95 transition-transform"
                  aria-label="חזרה"
                >
                  <ChevronRight className="h-[18px] w-[18px] text-white" strokeWidth={2.2} />
                </button>
                <div className="flex items-center gap-2">
                  <FavoriteButton dealId={deal.id} className="!bg-white/15 !border-white/20 backdrop-blur-md" />
                  <ShareButton deal={deal} compact />
                </div>
              </div>

              <div className="absolute top-14 right-3 z-[2] flex flex-col items-end gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-white/95 text-[#0E6B5A] shadow-sm">
                  {deal.status !== "closed" && deal.status !== "completed" ? (
                    <span className="gb-live-dot shrink-0 scale-75" aria-hidden />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: statusMeta.dot }} />
                  )}
                  {statusMeta.label}
                </span>
                {peakSavings != null && peakSavings > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-[#0B1220]/55 backdrop-blur-md text-white border border-white/15 shadow-sm">
                    <Sparkles className="w-3 h-3 text-[#34A88E]" strokeWidth={2.4} />
                    עד {ils(peakSavings)} חיסכון
                  </span>
                )}
              </div>

              {nextTier && peopleNeeded > 0 && (
                <div className="absolute top-[7.5rem] left-3 z-[2] gb-float">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-3 py-1.5 rounded-full bg-white/92 text-[#0A5447] shadow-[0_12px_28px_-16px_rgba(11,18,32,0.45)] border border-white/80">
                    <Users className="w-3.5 h-3.5 text-[#0E6B5A]" strokeWidth={2.4} />
                    עוד {peopleNeeded} שכנים ליעד
                  </span>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 z-[2] p-5 pt-16 text-right text-white">
                {locationLine && (
                  <div className="flex items-center justify-end gap-1.5 text-[12px] font-semibold text-white/85 mb-2">
                    <span>{locationLine}</span>
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-[#34A88E]" strokeWidth={2.4} />
                  </div>
                )}
                <EditableField
                  table="deals"
                  id={deal.id}
                  field="title"
                  value={deal.title}
                  as="h1"
                  className="text-[26px] leading-[1.18] font-black tracking-tight text-white drop-shadow-sm max-w-[16ch] ml-auto"
                />
                {supplier && (
                  <div className="flex items-center justify-end gap-1.5 mt-2.5 min-w-0">
                    <span className="text-[12px] font-semibold text-white/80 truncate">{supplier.business_name}</span>
                    {supplier.approval_status === "approved" && (
                      <BadgeCheck className="h-4 w-4 text-[#34A88E] shrink-0" strokeWidth={2.4} />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="px-4 -mt-8 relative z-10 space-y-4 pb-2">
            <Reveal>
            {/* Live group status — one card, three zones */}
            <div className="bg-white rounded-[24px] p-3.5 shadow-[0_16px_40px_-24px_rgba(11,18,32,0.28)] border border-[#E8EBEF]/90 ring-1 ring-[#0E6B5A]/[0.07]">
              {(neighborAvatarCount > 0 || participantCount === 0) && (
                <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-[#F0F2F5]">
                  <div className="flex items-center -space-x-2 space-x-reverse">
                    {neighborAvatarCount > 0 ? (
                      Array.from({ length: neighborAvatarCount }).map((_, i) => (
                        <span
                          key={i}
                          className={cn(
                            "h-8 w-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-sm",
                            neighborAvatarGradients[i % neighborAvatarGradients.length],
                          )}
                          aria-hidden
                        >
                          {String.fromCharCode(0x05d0 + (i % 4))}
                        </span>
                      ))
                    ) : (
                      <>
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="h-8 w-8 rounded-full border-2 border-dashed border-[#CBD5E0] bg-[#F4F6FA] flex items-center justify-center text-[11px] font-bold text-[#9CA3AF]"
                            aria-hidden
                          >
                            ?
                          </span>
                        ))}
                      </>
                    )}
                    {participantCount > 4 && (
                      <span className="h-8 min-w-[2rem] px-1.5 rounded-full border-2 border-white bg-[#E8F4F1] text-[10px] font-extrabold text-[#0A5447] flex items-center justify-center shadow-sm gb-num">
                        +{participantCount - 4}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-bold text-[#6B7280] text-right leading-snug">
                    {participantCount > 0
                      ? `${participantCount} שכנים כבר בפנים`
                      : "תהיו הראשונים בקבוצה"}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-[minmax(0,88px)_1fr_minmax(0,52px)] gap-2.5 items-stretch">
                <div className="rounded-2xl bg-gradient-to-br from-[#0E6B5A] to-[#0A5447] text-white p-2.5 flex flex-col justify-center text-center min-h-[88px]">
                  <div className="text-[9px] font-bold text-white/75 mb-1">המחיר כרגע</div>
                  <div className="text-[15px] font-black leading-tight gb-num">{currentTierHeadline}</div>
                </div>
                <div className="flex flex-col justify-center min-w-0 py-0.5">
                  <div className="flex items-baseline justify-end gap-1.5 mb-2">
                    <span className="text-[11px] font-bold text-[#6B7280]">מצטרפים</span>
                    <span className="text-[22px] font-black text-[#0B1220] gb-num leading-none">{participantCount}</span>
                    <Users className="w-4 h-4 text-[#0E6B5A] mb-0.5" strokeWidth={2.4} />
                  </div>
                  <div className="h-2 bg-[#EEF1F4] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 bg-gradient-to-l from-[#34A88E] to-[#0E6B5A]"
                      style={{ width: `${Math.max(progressPct, participantCount > 0 ? 8 : 4)}%` }}
                    />
                  </div>
                  <p className="text-[10.5px] font-semibold text-[#6B7280] mt-2 leading-snug text-right">
                    {nextTier && peopleNeeded > 0
                      ? `עוד ${peopleNeeded} שכנים ליעד הבא${
                          nextDisplay?.discountPercent != null
                            ? ` · ${nextDisplay.discountPercent}%`
                            : nextDisplay?.effectivePrice != null
                              ? ` · ${ils(nextDisplay.effectivePrice)}`
                              : ""
                        }`
                      : "הגעתם למדרגת המחיר הנוכחית"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="rounded-2xl bg-[#F4F6FA] border border-[#E8EBEF] flex flex-col items-center justify-center gap-1 text-[#0E6B5A] active:scale-[0.97] transition-transform min-h-[88px]"
                >
                  <Share2 className="w-5 h-5" strokeWidth={2.2} />
                  <span className="text-[9px] font-extrabold leading-tight text-center px-1">שתפו עם שכנים</span>
                </button>
              </div>
            </div>
            </Reveal>

            <Reveal delayMs={90}>
            {/* Discount ladder — full tiers, scroll if needed */}
            <div>
              <div className="flex items-center justify-between mb-3 px-0.5">
                <h2 className="text-[15px] font-black text-[#0B1220]">מדרגות ההנחה</h2>
                <button
                  type="button"
                  onClick={() => setHowOpen(true)}
                  className="text-[12px] font-bold text-[#0E6B5A]"
                >
                  איך זה עובד?
                </button>
              </div>
              <div className="overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
                <div
                  className="relative flex items-start justify-between gap-1 min-w-full"
                  style={{ minWidth: `${72 + sortedTiers.length * 76}px` }}
                >
                  <div className="absolute top-[13px] right-6 left-6 h-px bg-[#E8EBEF]" aria-hidden />
                  <div className="relative z-[1] flex flex-col items-center w-[68px] shrink-0 text-center">
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full mb-2 flex items-center justify-center text-[10px] font-black",
                        !hasAnyJoiners
                          ? "bg-[#0E6B5A] text-white shadow-[0_0_0_4px_rgba(14,107,90,0.15)]"
                          : "bg-white border-2 border-[#CBD5E0] text-[#6B7280]",
                      )}
                    >
                      0
                    </div>
                    <span className="text-[9px] font-bold text-[#6B7280] gb-num">0</span>
                    <span className="text-[11px] font-black text-[#0B1220] mt-0.5 leading-tight">
                      {display.referencePrice != null ? ils(display.referencePrice) : "בסיס"}
                    </span>
                    {!hasAnyJoiners && (
                      <span className="mt-1 text-[8px] font-extrabold text-white bg-[#0E6B5A] px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        אנחנו כאן
                      </span>
                    )}
                  </div>
                  {sortedTiers.map((tier, idx) => {
                    const td = describeTier(offerType, tier);
                    const priceLabel = td.effectivePrice != null ? ils(td.effectivePrice) : td.headline;
                    const isHere = hasAnyJoiners && idx === activeIdx;
                    const isNext = nextTier && tier.minParticipants === nextTier.minParticipants;
                    return (
                      <div key={tier.minParticipants} className="relative z-[1] flex flex-col items-center w-[68px] shrink-0 text-center">
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full mb-2 flex items-center justify-center text-[10px] font-black border-2",
                            isHere
                              ? "bg-[#0E6B5A] border-[#0E6B5A] text-white shadow-[0_0_0_4px_rgba(14,107,90,0.15)]"
                              : "bg-white border-[#D5DBE3] text-[#6B7280]",
                          )}
                        >
                          {tier.minParticipants}
                        </div>
                        <span className="text-[9px] font-bold text-[#6B7280] gb-num">{tierRange(tier)}</span>
                        <span className={cn("text-[11px] font-black mt-0.5 leading-tight gb-num", isHere ? "text-[#0E6B5A]" : "text-[#0B1220]")}>
                          {priceLabel}
                        </span>
                        {isHere && (
                          <span className="mt-1 text-[8px] font-extrabold text-white bg-[#0E6B5A] px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            אנחנו כאן
                          </span>
                        )}
                        {!isHere && isNext && (
                          <span className="mt-1 text-[8px] font-extrabold text-[#0A5447] bg-[#E8F4F1] px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            היעד הבא
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            </Reveal>

            <Reveal delayMs={160}>
            {/* WhatsApp — single focused invite */}
            <div className="rounded-[24px] bg-[#F7F5F0] border border-[#E8EBEF] px-4 py-4 text-center">
              <p className="text-[15px] font-extrabold text-[#0B1220] mb-3 leading-snug">רוצים להוזיל לכולם את המחיר?</p>
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="w-full h-12 rounded-2xl bg-[#0E6B5A] hover:bg-[#0A5447] text-white text-[14px] font-extrabold inline-flex items-center justify-center gap-2 shadow-[0_12px_28px_-14px_rgba(14,107,90,0.45)] active:scale-[0.98] transition-transform"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                שתפו בוואטסאפ
              </button>
            </div>
            </Reveal>

            <Reveal delayMs={220}>
            {/* Why join — compact trust grid */}
            <div>
              <h2 className="text-[15px] font-black text-[#0B1220] mb-3 px-0.5">למה להצטרף?</h2>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  {
                    icon: Lock,
                    title: "תשלום מאובטח",
                    sub: depositRequired ? `פיקדון ${ils(Number(deal.deposit_amount))}` : "ללא חיוב מלא בהתחלה",
                  },
                  {
                    icon: BadgeCheck,
                    title: "ספק מאומת",
                    sub: supplier?.approval_status === "approved" ? "נבדק בפלטפורמה" : "פרטי ספק שקופים",
                  },
                  { icon: TrendingDown, title: "מחיר לכולם", sub: "ככל שמצטרפים — יורד" },
                  { icon: Shield, title: "ללא התחייבות", sub: "המחיר מתעדכן אוטומטית" },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[18px] border border-[#E8EBEF] bg-white p-3 flex gap-2.5 items-start"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#E8F4F1] flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-[#0E6B5A]" strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0 text-right">
                      <div className="text-[12px] font-extrabold text-[#0B1220] leading-tight">{item.title}</div>
                      <div className="text-[10px] font-medium text-[#6B7280] mt-0.5 leading-snug">{item.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </Reveal>

            {dealFactCells.length > 0 && (
            <Reveal delayMs={280}>
              <div>
                <h2 className="text-[15px] font-black text-[#0B1220] mb-3 px-0.5">בקצרה</h2>
                <div className="grid grid-cols-2 gap-2.5">
                  {dealFactCells.slice(0, 4).map((cell) => (
                    <div
                      key={cell.label}
                      className="rounded-[18px] border border-[#E8EBEF] bg-white p-3 flex gap-2.5 items-center"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#F4F6FA] flex items-center justify-center shrink-0">
                        <cell.icon className="w-4 h-4 text-[#0E6B5A]" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 text-right">
                        <div className="text-[10px] font-bold text-[#6B7280]">{cell.label}</div>
                        <div className="text-[12px] font-extrabold text-[#0B1220] truncate">{cell.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="px-3 mt-1">
            <div
              className="relative rounded-[28px] overflow-hidden h-[300px] shadow-[0_24px_48px_-28px_rgba(11,18,32,0.45)]"
            >
              {renderHeroMedia("h-full w-full")}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1220]/55 via-[#0B1220]/10 to-black/25 pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#F3F1EB] to-transparent pointer-events-none" />
              <span className="absolute top-4 right-4 inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-xl shadow-[0_8px_20px_-12px_rgba(10,31,61,0.45)] border border-white/80 text-[#0E6B5A]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 rounded-full opacity-60 animate-ping" style={{ background: statusMeta.dot }} />
                  <span className="relative h-2 w-2 rounded-full" style={{ background: statusMeta.dot }} />
                </span>
                {statusMeta.label}
              </span>
            </div>
          </div>

          <div className="px-4 -mt-8 relative z-10">
            <div className="rounded-[26px] bg-white/95 backdrop-blur-sm p-5 shadow-[0_20px_50px_-28px_rgba(11,18,32,0.35)] border border-white">
              {supplier && (
                <div className="flex items-center gap-1.5 mb-2.5 min-w-0">
                  <span className="text-[12px] font-semibold text-[#6B7280] truncate tracking-wide">{supplier.business_name}</span>
                  {supplier.approval_status === "approved" && (
                    <BadgeCheck className="h-3.5 w-3.5 text-[#2EA85A] shrink-0" strokeWidth={2.4} />
                  )}
                </div>
              )}
              <EditableField
                table="deals"
                id={deal.id}
                field="title"
                value={deal.title}
                as="h1"
                className="text-[24px] leading-[1.22] font-black text-[#0B1220] tracking-tight"
              />
              {category?.name && (
                <div className="mt-3 text-[12px] font-bold text-[#0E6B5A]/80">
                  {category.icon ? `${category.icon} ` : ""}
                  {category.name}
                </div>
              )}
              {display.effectivePrice != null ? (
                <div className="space-y-1.5 mt-4 pt-4 border-t border-[#F0F2F5]">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-[30px] font-black text-[#0B1220] gb-num leading-none tracking-tight">{ils(display.effectivePrice)}</span>
                    {savingsAmount ? (
                      <span className="text-[11px] font-extrabold text-[#0E6B5A] bg-[#E8F4F1] px-2.5 py-1 rounded-full">חיסכון {ils(savingsAmount)}</span>
                    ) : discountPct ? (
                      <span className="text-[11px] font-extrabold text-[#0E6B5A] bg-[#E8F4F1] px-2.5 py-1 rounded-full">{discountPct}% הנחה</span>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="text-[16px] font-black text-[#0B1220] mt-3">{display.headline}</p>
              )}
            </div>
          </div>
        </>
      )}
      {/* ===== SECTION 3 — OFFER DETAILS ===== */}
      {(deal.description || (deal as { product_details?: string | null }).product_details || deal.offer_terms || deal.restrictions || (deal.service_areas && deal.service_areas.length > 0) || deal.join_deadline || deal.redemption_deadline || deal.appointment_required) && (
        <div className="px-4 mt-6">
          <div className="flex items-center justify-between gap-2 mb-3 px-1">
            <h2 className="text-[16px] font-extrabold text-[#1F2937] flex items-center gap-2">
              <span className="w-1 h-5 bg-[#0E6B5A] rounded-full" />
              פרטי ההצעה
            </h2>
            {sortedTiers.length === 0 && (
              <button
                type="button"
                onClick={() => setHowOpen(true)}
                className="text-[12px] font-bold text-[#0E6B5A] hover:underline underline-offset-2 shrink-0"
              >
                איך זה עובד?
              </button>
            )}
          </div>
          <div className="bg-white rounded-[24px] p-5 shadow-[0_8px_20px_-10px_rgba(10,31,61,0.18)] space-y-1">
            {/* Lead summary: first non-empty short block stays visible */}
            {deal.description && (
              <div className="pb-4">
                <div className="text-[11px] font-extrabold text-[#6B7280] mb-1.5">תיאור</div>
                <p className="text-[14px] text-[#1F2937] leading-relaxed whitespace-pre-wrap">{deal.description}</p>
              </div>
            )}
            {(deal as { product_details?: string | null }).product_details && (
              <div className={cn("pb-4", deal.description && "border-t border-[#F0F2F5] pt-4")}>
                <div className="text-[11px] font-extrabold text-[#6B7280] mb-1.5">פירוט מוצר</div>
                <p className="text-[14px] text-[#1F2937] leading-relaxed whitespace-pre-wrap">{(deal as { product_details?: string | null }).product_details}</p>
              </div>
            )}

            <Accordion type="multiple" className="w-full">
              {deal.offer_terms && (
                <AccordionItem value="terms" className="border-[#F0F2F5]">
                  <AccordionTrigger className="text-[13px] font-extrabold text-[#1F2937] py-3 hover:no-underline">
                    תנאי ההצעה
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-[13px] text-[#1F2937] leading-relaxed whitespace-pre-wrap pb-1">{deal.offer_terms}</p>
                  </AccordionContent>
                </AccordionItem>
              )}
              {deal.restrictions && (
                <AccordionItem value="restrictions" className="border-[#F0F2F5]">
                  <AccordionTrigger className="text-[13px] font-extrabold text-[#1F2937] py-3 hover:no-underline">
                    הגבלות / חריגים
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-[13px] text-[#1F2937] leading-relaxed whitespace-pre-wrap pb-1">{deal.restrictions}</p>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>

            {deal.service_areas && deal.service_areas.length > 0 && (
              <div className="flex items-start gap-2 pt-3 border-t border-[#F0F2F5]">
                <MapPin className="h-4 w-4 text-[#0E6B5A] mt-0.5 shrink-0" />
                <div>
                  <div className="text-[11px] font-extrabold text-[#6B7280] mb-0.5">אזורי שירות</div>
                  <p className="text-[13px] text-[#1F2937]">{deal.service_areas.join(", ")}</p>
                </div>
              </div>
            )}
            {(deal.join_deadline || deal.redemption_deadline) && (
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#F0F2F5]">
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
              <div className="flex items-center gap-2 bg-[#FFF8E1] rounded-xl px-3 py-2 mt-3">
                <Clock className="h-4 w-4 text-[#B07E2E] shrink-0" />
                <span className="text-[12px] font-bold text-[#1F2937]">נדרשת קביעת פגישה לפני המימוש</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== SECTION 4 — HOW IT WORKS (modal, triggered by floating button) ===== */}
      <Dialog open={howOpen} onOpenChange={setHowOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-5" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-[17px] font-black text-[#1F2937]">איך זה עובד</DialogTitle>
          </DialogHeader>
          <ol className="relative mt-2">
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
        </DialogContent>
      </Dialog>

      {/* ===== Payment instructions (manual Bit / bank transfer) ===== */}
      <Dialog open={showPaymentInstructions} onOpenChange={setShowPaymentInstructions}>
        <DialogContent className="max-w-sm rounded-3xl p-5" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-[17px] font-black text-[#1F2937]">השלמת הפיקדון</DialogTitle>
            <DialogDescription className="text-right text-[12px] text-muted-foreground">
              העבר/י לספק בביט או בהעברה בנקאית, ואז סמן/י שביצעת.
            </DialogDescription>
          </DialogHeader>
          {pendingDepositId && (
            <PaymentInstructionsCard
              depositId={pendingDepositId}
              amount={pendingDepositAmount}
              supplierPaymentInfo={supplierPaymentInfo}
              onDeclared={() => {
                setShowPaymentInstructions(false);
                setInterestDepositStatus("awaiting_confirmation");
              }}
            />
          )}
        </DialogContent>
      </Dialog>


      {/* ===== SECTION 5 — SUPPLIER CARD ===== */}
      {supplier && (
        <div className="px-4 mt-6">
          <SectionTitle>על הספק</SectionTitle>
          <div className="bg-white rounded-[26px] p-5 shadow-[0_16px_40px_-24px_rgba(11,18,32,0.22)] border border-[#E8EBEF]/80">
            <div className="flex items-center gap-3">
              <SupplierLogo name={supplier.business_name} logoUrl={supplier.logo_url} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-[15px] font-extrabold text-[#0B1220] truncate">{supplier.business_name}</p>
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
              className="mt-4 flex items-center justify-center gap-1 h-11 rounded-2xl bg-[#F7F5F0] text-[#0E6B5A] text-[13px] font-bold active:scale-[0.98] transition-transform"
            >
              צפייה בפרופיל הספק
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Spacer for sticky CTA */}
      <div aria-hidden className="h-44" />



      {/* ===== SECTION 7 — STICKY CTA (residents only) ===== */}
      {!isSupplierPreview && !isRegularListing && (
      <div
        className="fixed inset-x-0 z-50 flex justify-center pointer-events-none"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 8px)" }}
      >
        <div className="pointer-events-auto w-full max-w-screen-sm px-4 pt-6 pb-2 bg-gradient-to-t from-[#F3F1EB] via-[#F3F1EB]/95 to-transparent">
          {interested ? (
            <div className="flex items-center gap-2.5 bg-[#0A5447] text-white p-3.5 rounded-[22px] shadow-[0_20px_44px_-18px_rgba(10,84,71,0.55)] border border-white/10">
              <div className="w-10 h-10 bg-white/15 rounded-full flex items-center justify-center shrink-0">
                {hasCompletedJoin ? (
                  <CheckCircle2 className="w-5 h-5 text-[#34A88E]" strokeWidth={2.6} />
                ) : (
                  <Clock className="w-5 h-5 text-[#34A88E]" strokeWidth={2.6} />
                )}
              </div>
              <div className="flex-1 text-right">
                <p className="text-[14px] font-extrabold leading-tight">{hasCompletedJoin ? "המקום שלכם שמור" : "ממתין לתשלום פיקדון"}</p>
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
                  className="h-10 px-3 rounded-2xl bg-white text-[#0A5447] text-[11px] font-extrabold active:scale-[0.97] transition-transform disabled:opacity-60"
                >
                  {resumingPayment ? "..." : "לתשלום"}
                </button>
              ) : (
                <ShareButton deal={deal} compact />
              )}
            </div>
          ) : (
            <div className="rounded-[22px] bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_44px_-18px_rgba(11,18,32,0.28)] p-2.5">
              <div className="flex items-stretch gap-2">
                <Button
                  onClick={handleJoinClick}
                  disabled={submittingInterest}
                  className={cn(
                    "flex-1 rounded-2xl bg-gradient-to-l from-[#0A5447] to-[#0E6B5A] hover:from-[#0A5447] hover:to-[#0E6B5A] text-white font-extrabold shadow-[0_12px_28px_-12px_rgba(10,84,71,0.55)] border-0",
                    sortedTiers.length > 0 ? "h-[54px] rounded-[18px] flex flex-col items-center justify-center gap-0 py-2 gb-cta-glow" : "h-[52px] rounded-full",
                  )}
                >
                  {submittingInterest ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : sortedTiers.length > 0 ? (
                    <>
                      <span className="text-[15px] leading-tight">הצטרפו להצעה</span>
                      <span className="text-[11px] font-semibold text-white/85 leading-tight">חסכו יותר, ביחד!</span>
                    </>
                  ) : (
                    joinCtaLabel ?? "הצטרפו לקבוצה"
                  )}
                </Button>
                <ShareButton deal={deal} />
              </div>
              <p className="text-center text-[10.5px] font-semibold text-[#6B7280] mt-1.5 pb-0.5">
                ללא התחייבות
                {nextTier && peopleNeeded > 0
                  ? ` · עוד ${peopleNeeded} שכנים ליעד הבא`
                  : " · המחיר יורד ככל שמצטרפים"}
              </p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* ===== SECTION 7C — REGULAR LISTING CTA ===== */}
      {!isSupplierPreview && isRegularListing && (
        <div
          className="fixed inset-x-0 z-50 flex justify-center pointer-events-none"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 8px)" }}
        >
          <div className="pointer-events-auto w-full max-w-screen-sm px-4 pt-5 pb-2 bg-gradient-to-t from-[#F7F5F0] via-[#F7F5F0]/95 to-transparent">
            <div className="flex items-stretch gap-2">
              <Button
                onClick={handleRequestGroupBuy}
                disabled={groupBuyRequested}
                className="flex-1 h-14 rounded-2xl bg-[#0E6B5A] hover:bg-[#0E6B5A]/95 text-white font-extrabold text-[15px] shadow-[0_12px_28px_-10px_rgba(10,31,61,0.6)] border border-[#0E6B5A]/40"
              >
                <Users className="h-4 w-4 ml-1.5" />
                {groupBuyRequested ? "הבקשה נשלחה ✓" : "בקש קבוצת רכישה"}
              </Button>
              <ShareButton deal={deal} />
            </div>
            {supplier?.phone && (
              <a
                href={`tel:${supplier.phone}`}
                className="mt-2 flex items-center justify-center h-11 rounded-2xl bg-white border-2 border-[#0E6B5A]/25 text-[#0E6B5A] font-extrabold text-[13px]"
              >
                צור קשר עם הספק
              </a>
            )}
          </div>
        </div>
      )}

      {/* ===== SECTION 7B — SUPPLIER PREVIEW STICKY (edit shortcut) ===== */}

      {isSupplierPreview && (
        <div
          className="fixed inset-x-0 z-50 flex justify-center pointer-events-none"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 8px)" }}
        >
          <div className="pointer-events-auto w-full max-w-screen-sm px-4 pt-5 pb-2 bg-gradient-to-t from-[#F7F5F0] via-[#F7F5F0]/95 to-transparent">
            <div className="flex items-stretch gap-2">
              <Link
                to={`/supplier/offers/${deal.id}/edit`}
                className="flex-1 h-14 rounded-2xl bg-[#0E6B5A] hover:bg-[#0E6B5A]/95 text-white font-extrabold text-[15px] shadow-[0_12px_28px_-10px_rgba(10,31,61,0.6)] border border-[#0E6B5A]/40 flex items-center justify-center gap-2"
              >
                <Pencil className="h-4 w-4" />
                עריכת ההצעה
              </Link>
              <Link
                to="/supplier/offers"
                className="h-14 px-4 rounded-2xl bg-white border-2 border-[#0E6B5A]/25 text-[#0E6B5A] font-extrabold text-[13px] flex items-center justify-center"
              >
                סגור
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* How-it-works lives in group-goal / offer-details headers — no floating overlay */}






      {/* Request Group Buy modal (for regular listings) */}
      <Dialog open={showRequestGroupBuy} onOpenChange={setShowRequestGroupBuy}>
        <DialogContent dir="rtl" className="text-right">
          <DialogHeader>
            <DialogTitle>פתיחת קבוצת רכישה</DialogTitle>
            <DialogDescription className="text-right leading-relaxed">
              <span className="block font-bold text-foreground">{deal.title}</span>
              <span className="block mt-2 text-[13px] text-muted-foreground">
                זוהי הצעה רגילה. אם יהיו מספיק מתעניינים, ניתן להפוך אותה לקבוצת רכישה ולקבל מחיר טוב יותר.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-xl bg-[#F7F5F0] p-3 text-[12px] leading-relaxed text-[#1F2937]">
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 mt-0.5 text-[#0E6B5A] shrink-0" />
                <div>
                  בלחיצה על שליחת הבקשה, הספק יקבל התראה שיש ביקוש לפתיחת קבוצת רכישה. ככל שיותר שכנים יבקשו —
                  כך גדל הסיכוי שייפתח מבצע קבוצתי.
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={submitRequestGroupBuy}
                disabled={submittingGroupBuyRequest || groupBuyRequested}
                className="h-12 rounded-2xl bg-[#0E6B5A] hover:bg-[#0E6B5A]/95 text-white font-extrabold"
              >
                {submittingGroupBuyRequest ? <Loader2 className="h-4 w-4 animate-spin" /> : groupBuyRequested ? "הבקשה כבר נשלחה ✓" : "שלח בקשה"}
              </Button>
              <div className="text-[12px] font-bold text-[#1F2937]/70 text-center mt-1">שתף עם שכנים כדי להגדיל את הסיכוי</div>
              <ShareButton deal={deal} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join modal */}
      <Dialog open={showJoinModal && !isSupplierPreview && !isRegularListing} onOpenChange={setShowJoinModal}>

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

      <BottomNav role={isSupplierPreview ? "supplier" : "resident"} />
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

