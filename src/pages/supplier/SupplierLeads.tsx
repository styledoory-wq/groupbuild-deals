import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Inbox, Loader2, Users, BadgeCheck, Phone, Mail, MessageCircle, MapPin, Building2, CheckCircle2, Check, X, Trash2, RotateCcw, Archive, FileText, Calendar, Tag, Coins, Flame, TrendingUp, Clock, Sparkles, ArrowLeft, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/layout/MobileShell";
import { ScreenHeader, LoadingState, ErrorState } from "@/components/ds";
import { BottomNav } from "@/components/layout/BottomNav";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { ils } from "@/lib/offerPricing";
import { normalizeWhatsappUrl } from "@/lib/whatsapp";
import { isAdminEmail } from "@/lib/auth";
import { getFriendlyLoadError } from "@/lib/safeAsync";
import { resolveSupplierForUser } from "@/lib/supplierAuth";

type DealLite = { id: string; title: string };
type InterestRow = {
  id: string;
  user_id: string;
  deal_id: string;
  status: string;
  deposit_required: boolean;
  deposit_amount: number;
  deposit_status: string;
  created_at: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  project_name: string | null;
  estimated_quantity: number | null;
  lead_status: string | null;
  notes: string | null;
  is_deleted?: boolean;
  deleted_at?: string | null;
  direct_deposit_status?: string | null;
  direct_deposit_amount?: number | null;
  resident_marked_paid_at?: string | null;
  supplier_confirmed_at?: string | null;
};
type ProfileLite = { id: string; full_name: string | null; phone: string | null; email: string | null };
type InquiryRow = {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  project_name: string | null;
  category_id: string | null;
  message: string | null;
  source: string;
  status: string;
  created_at: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
};
type QuoteRequestRow = {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  supplier_id: string | null;
  residents_count: number | null;
  target_price_per_unit: number | null;
  deadline: string | null;
  status: string;
  created_at: string;
};

const TRASH_DAYS = 30;
const daysLeftToPurge = (deletedAt?: string | null) => {
  if (!deletedAt) return TRASH_DAYS;
  const ms = new Date(deletedAt).getTime() + TRASH_DAYS * 86400_000 - Date.now();
  return Math.max(0, Math.ceil(ms / 86400_000));
};

type LeadStage = "new" | "in_progress" | "closed";
type TabKey = "all" | "new" | "in_progress" | "closed";

const HOURS_24 = 24 * 3600_000;
const HOURS_72 = 72 * 3600_000;

function initialsOf(name: string | null | undefined): string {
  const t = (name ?? "").trim();
  if (!t) return "ד";
  const parts = t.split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}
function avatarHue(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return `hsl(${h} 55% 92%)`;
}
function timeAgoHe(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "עכשיו";
  if (m < 60) return `לפני ${m} ד׳`;
  const h = Math.floor(m / 60);
  if (h < 24) return `לפני ${h} שע׳`;
  const d = Math.floor(h / 24);
  if (d < 7) return `לפני ${d} ימים`;
  return new Date(iso).toLocaleDateString("he-IL");
}
function interestStage(i: InterestRow): LeadStage {
  if (["paid", "committed"].includes(i.deposit_status) || i.direct_deposit_status === "confirmed_by_supplier") return "closed";
  if (i.lead_status === "approved" || i.direct_deposit_status === "marked_paid_by_resident" || i.direct_deposit_status === "awaiting_payment") return "in_progress";
  return "new";
}
function inquiryStage(q: InquiryRow): LeadStage {
  if (q.status === "closed" || q.status === "won") return "closed";
  if (q.status === "in_progress" || q.status === "contacted") return "in_progress";
  return "new";
}
function isHot(createdAt: string, stage: LeadStage): boolean {
  const age = Date.now() - new Date(createdAt).getTime();
  return stage !== "closed" && age < HOURS_24;
}

function Avatar({ name }: { name: string }) {
  return (
    <div
      className="h-11 w-11 rounded-full flex items-center justify-center text-[#0E6B5A] font-extrabold text-sm shrink-0"
      style={{ background: avatarHue(name) }}
      aria-hidden
    >
      {initialsOf(name).toUpperCase()}
    </div>
  );
}

function StageBadge({ stage, hot }: { stage: LeadStage; hot: boolean }) {
  if (hot) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FFF1ED] text-[#C2410C] border border-[#FED7AA]">
        <Flame className="h-3 w-3" /> ליד חם
      </span>
    );
  }
  if (stage === "closed") {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]"><CheckCircle2 className="h-3 w-3" /> נסגר</span>;
  }
  if (stage === "in_progress") {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">בטיפול</span>;
  }
  if (stage === "new") {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">חדש</span>;
  }
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">ממתין</span>;
}

export default function SupplierLeads() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deals, setDeals] = useState<DealLite[]>([]);
  const [interests, setInterests] = useState<InterestRow[]>([]);
  const [trashedInterests, setTrashedInterests] = useState<InterestRow[]>([]);
  const [inquiries, setInquiries] = useState<InquiryRow[]>([]);
  const [trashedInquiries, setTrashedInquiries] = useState<InquiryRow[]>([]);
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequestRow[]>([]);
  const [requesterProfiles, setRequesterProfiles] = useState<Record<string, ProfileLite>>({});
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [swipeId, setSwipeId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ kind: "interest" | "inquiry"; id: string } | null>(null);
  const [tab, setTab] = useState<TabKey>("all");
  const touchStartX = useRef(0);

  const updateLeadStatus = async (interestId: string, status: "approved" | "rejected") => {
    setStatusBusy(interestId);
    try {
      const { error } = await supabase.rpc("approve_lead_and_deposit", {
        _interest_id: interestId,
        _lead_status: status,
      });
      if (error) throw error;
      setInterests((prev) => prev.map((i) => (i.id === interestId ? {
        ...i,
        lead_status: status,
        status: status === "approved" ? (i.deposit_required ? "pending_deposit" : "approved") : "rejected",
        deposit_status: status === "approved" && i.deposit_required ? "pending" : i.deposit_status,
      } : i)));
      toast.success(status === "approved" ? "הליד אושר" : "הליד סומן כלא רלוונטי");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "עדכון נכשל");
    } finally {
      setStatusBusy(null);
    }
  };

  const softDeleteInterest = async (id: string) => {
    setStatusBusy(id);
    try {
      const { error } = await supabase.rpc("supplier_soft_delete_interest", { _interest_id: id });
      if (error) throw error;
      setInterests((prev) => {
        const removed = prev.find((i) => i.id === id);
        if (removed) setTrashedInterests((t) => [{ ...removed, is_deleted: true, deleted_at: new Date().toISOString() }, ...t]);
        return prev.filter((i) => i.id !== id);
      });
      setSwipeId(null);
      toast.success(`הועבר לסל מחזור · ימחק בעוד ${TRASH_DAYS} ימים`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "מחיקה נכשלה");
    } finally {
      setStatusBusy(null);
    }
  };
  const restoreInterest = async (id: string) => {
    setStatusBusy(id);
    try {
      const { error } = await supabase.rpc("supplier_restore_interest", { _interest_id: id });
      if (error) throw error;
      setTrashedInterests((prev) => {
        const restored = prev.find((i) => i.id === id);
        if (restored) setInterests((arr) => [{ ...restored, is_deleted: false, deleted_at: null }, ...arr]);
        return prev.filter((i) => i.id !== id);
      });
      toast.success("הליד שוחזר");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שחזור נכשל");
    } finally {
      setStatusBusy(null);
    }
  };
  const softDeleteInquiry = async (id: string) => {
    setStatusBusy(id);
    try {
      const { error } = await supabase.rpc("supplier_soft_delete_inquiry", { _inquiry_id: id });
      if (error) throw error;
      setInquiries((prev) => {
        const removed = prev.find((i) => i.id === id);
        if (removed) setTrashedInquiries((t) => [{ ...removed, is_deleted: true, deleted_at: new Date().toISOString() }, ...t]);
        return prev.filter((i) => i.id !== id);
      });
      setSwipeId(null);
      toast.success(`הועבר לסל מחזור · ימחק בעוד ${TRASH_DAYS} ימים`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "מחיקה נכשלה");
    } finally {
      setStatusBusy(null);
    }
  };
  const restoreInquiry = async (id: string) => {
    setStatusBusy(id);
    try {
      const { error } = await supabase.rpc("supplier_restore_inquiry", { _inquiry_id: id });
      if (error) throw error;
      setTrashedInquiries((prev) => {
        const restored = prev.find((i) => i.id === id);
        if (restored) setInquiries((arr) => [{ ...restored, is_deleted: false, deleted_at: null }, ...arr]);
        return prev.filter((i) => i.id !== id);
      });
      toast.success("הפנייה שוחזרה");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שחזור נכשל");
    } finally {
      setStatusBusy(null);
    }
  };

  const markDepositPaid = async (userId: string, dealId: string) => {
    const key = userId + dealId;
    setBusyKey(key);
    try {
      const { data: pending, error: pErr } = await supabase
        .from("deposits")
        .select("id")
        .eq("user_id", userId)
        .eq("deal_id", dealId)
        .eq("status", "pending")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!pending) { toast.message("אין פיקדון ממתין לאישור"); return; }
      const { error: uErr } = await supabase
        .from("deposits")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", pending.id);
      if (uErr) throw uErr;
      setInterests((prev) => prev.map((i) => (
        i.user_id === userId && i.deal_id === dealId
          ? { ...i, status: "paid", lead_status: "approved", deposit_status: "paid" }
          : i
      )));
      toast.success("הפיקדון סומן כשולם");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "עדכון נכשל");
    } finally {
      setBusyKey(null);
    }
  };

  const confirmDirectDeposit = async (interestId: string) => {
    setStatusBusy(interestId);
    try {
      const { error } = await supabase.rpc("supplier_confirm_deposit", { _interest_id: interestId });
      if (error) throw error;
      setInterests((prev) => prev.map((i) => (i.id === interestId ? {
        ...i,
        direct_deposit_status: "confirmed_by_supplier",
        supplier_confirmed_at: new Date().toISOString(),
        status: "paid",
        lead_status: "approved",
        deposit_status: "paid",
      } : i)));
      toast.success("הפיקדון אושר — הדייר הצטרף לעסקה");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "אישור נכשל");
    } finally {
      setStatusBusy(null);
    }
  };

  const disputeDirectDeposit = async (interestId: string) => {
    const reason = window.prompt("סיבה (אופציונלי) — לדוגמה: 'לא התקבל בחשבון'");
    if (reason === null) return;
    setStatusBusy(interestId);
    try {
      const { error } = await supabase.rpc("supplier_dispute_deposit", { _interest_id: interestId, _reason: reason || null });
      if (error) throw error;
      setInterests((prev) => prev.map((i) => (i.id === interestId ? {
        ...i,
        direct_deposit_status: "disputed",
      } : i)));
      toast.success("סומן כלא התקבל — הדייר קיבל הודעה");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "פעולה נכשלה");
    } finally {
      setStatusBusy(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const safety = window.setTimeout(() => {
      if (!cancelled) {
        setError("טעינת הלידים נמשכת יותר מדי זמן. נסו לרענן את המסך.");
        setLoading(false);
      }
    }, 12000);
    (async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          if (!cancelled) { setError("יש להתחבר כספק כדי לראות לידים."); setLoading(false); }
          return;
        }
        const userId = session.session.user.id;
        const email = session.session.user.email ?? "";
        if (!cancelled) setIsAdmin(isAdminEmail(email));

        const sup = await resolveSupplierForUser<{ id: string }>(userId, email, "id");
        if (!sup) {
          if (!cancelled) { setError("לא נמצא פרופיל ספק. השלם את הפרטים תחילה."); setLoading(false); }
          return;
        }

        const { data: dealsData } = await supabase
          .from("deals").select("id,title,is_deleted").eq("supplier_id", sup.id);
        const allDeals = (dealsData ?? []) as Array<DealLite & { is_deleted?: boolean }>;
        if (!cancelled) setDeals(allDeals);

        // Inquiries (active + trashed)
        const { data: inqData } = await supabase
          .from("supplier_inquiries")
          .select("id,user_id,full_name,phone,email,city,project_name,category_id,message,source,status,created_at,is_deleted,deleted_at")
          .eq("supplier_id", sup.id)
          .order("created_at", { ascending: false });
        const allInq = (inqData ?? []) as InquiryRow[];
        if (!cancelled) {
          setInquiries(allInq.filter((q) => !q.is_deleted));
          setTrashedInquiries(allInq.filter((q) => q.is_deleted));
        }

        let activeList: InterestRow[] = [];
        let trashedList: InterestRow[] = [];
        if (allDeals.length) {
          const dealIds = allDeals.map((d) => d.id);
          const { data: ints, error: iErr } = await supabase
            .from("deal_interests")
            .select("id,user_id,deal_id,status,deposit_required,deposit_amount,deposit_status,created_at,is_demo,full_name,phone,city,project_name,estimated_quantity,lead_status,notes,is_deleted,deleted_at,direct_deposit_status,direct_deposit_amount,resident_marked_paid_at,supplier_confirmed_at")
            .in("deal_id", dealIds)
            .eq("is_demo", false)
            .order("created_at", { ascending: false });
          if (iErr) throw iErr;
          const all = (ints ?? []) as InterestRow[];
          activeList = all.filter((i) => !i.is_deleted);
          trashedList = all.filter((i) => i.is_deleted);
          if (!cancelled) { setInterests(activeList); setTrashedInterests(trashedList); }
        }

        // Committee quote requests addressed to this supplier OR matching their categories (RLS-protected)
        const { data: qrData } = await supabase
          .from("committee_quote_requests")
          .select("id,user_id,project_id,title,description,category_id,supplier_id,residents_count,target_price_per_unit,deadline,status,created_at")
          .eq("status", "open")
          .order("created_at", { ascending: false });
        const qrs = (qrData ?? []) as QuoteRequestRow[];
        if (!cancelled) setQuoteRequests(qrs);

        const userIds = Array.from(new Set([
          ...activeList.map((i) => i.user_id), ...trashedList.map((i) => i.user_id),
          ...allInq.map((i) => i.user_id),
        ]));
        if (userIds.length) {
          const { data: profs } = await supabase
            .from("profiles").select("id,full_name,phone,email").in("id", userIds);
          const map: Record<string, ProfileLite> = {};
          (profs ?? []).forEach((p) => { map[(p as ProfileLite).id] = p as ProfileLite; });
          if (!cancelled) setProfiles(map);
        }

        const qrUserIds = Array.from(new Set(qrs.map((q) => q.user_id)));
        if (qrUserIds.length) {
          const { data: rprofs } = await supabase
            .from("profiles").select("id,full_name,phone,email").in("id", qrUserIds);
          const rmap: Record<string, ProfileLite> = {};
          (rprofs ?? []).forEach((p) => { rmap[(p as ProfileLite).id] = p as ProfileLite; });
          if (!cancelled) setRequesterProfiles(rmap);
        }
      } catch (e) {
        console.error("[SupplierLeads] load error", e);
        if (!cancelled) setError(getFriendlyLoadError(e, "שגיאה בטעינת הלידים"));
      } finally {
        window.clearTimeout(safety);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; window.clearTimeout(safety); };
  }, []);

  const dealTitle = (id: string) => deals.find((d) => d.id === id)?.title ?? "עסקה שנמחקה";
  const totalActive = interests.length + inquiries.length;
  const totalTrashed = trashedInterests.length + trashedInquiries.length;

  // Swipe handlers — in RTL, "swipe right" means moving the finger toward the right side of the screen.
  // We reveal the delete action when the user swipes right by >60px (or left by >60px to support both directions).
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const makeSwipeEnd = (id: string) => (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 60) setSwipeId(id);
    else if (Math.abs(dx) < 10 && swipeId === id) setSwipeId(null);
  };

  const renderInquiry = (q: InquiryRow, trashed: boolean) => {
    const p = profiles[q.user_id];
    const name = q.full_name?.trim() || p?.full_name?.trim() || "דייר";
    const phone = q.phone?.trim() || p?.phone?.trim() || null;
    const email = q.email || p?.email || null;
    const wa = normalizeWhatsappUrl(phone);
    const isSwiped = swipeId === q.id && !trashed;
    return (
      <div key={q.id} className="relative overflow-hidden rounded-2xl">
        {isSwiped && (
          <button onClick={() => setConfirmDelete({ kind: "inquiry", id: q.id })}
            className="absolute top-0 bottom-0 left-0 w-20 bg-destructive text-destructive-foreground rounded-2xl flex items-center justify-center gap-1 text-fs-xs font-bold z-0">
            <Trash2 className="h-4 w-4" /> מחק
          </button>
        )}
        <div
          className="gb-card p-4 border-r-4 border-[#0E6B5A]/60 transition-transform relative z-10"
          style={isSwiped ? { transform: "translateX(80px)" } : undefined}
          onTouchStart={trashed ? undefined : onTouchStart}
          onTouchEnd={trashed ? undefined : makeSwipeEnd(q.id)}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-start gap-2.5 min-w-0">
              <Avatar name={name} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-extrabold text-[15px] text-foreground truncate">{name}</h4>
                  <StageBadge stage={inquiryStage(q)} hot={isHot(q.created_at, inquiryStage(q))} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {timeAgoHe(q.created_at)} · פנייה כללית
                </p>
              </div>
            </div>
            {!trashed && (
              <button
                onClick={() => setConfirmDelete({ kind: "inquiry", id: q.id })}
                disabled={statusBusy === q.id}
                aria-label="מחק פנייה"
                className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 disabled:opacity-50 shrink-0"
              >
                {statusBusy === q.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-fs-xs text-muted-foreground mb-2">
            {phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {phone}</span>}
            {email && <span className="inline-flex items-center gap-1 truncate"><Mail className="h-3 w-3" /> {email}</span>}
            {q.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {q.city}</span>}
            {q.project_name && <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" /> {q.project_name}</span>}
            <span>נרשם: {new Date(q.created_at).toLocaleDateString("he-IL")}</span>
          </div>
          {trashed ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-fs-xs text-muted-foreground">ימחק בעוד {daysLeftToPurge(q.deleted_at)} ימים</span>
              <button onClick={() => restoreInquiry(q.id)} disabled={statusBusy === q.id}
                className="h-8 px-3 rounded-lg bg-muted text-foreground text-fs-xs font-bold inline-flex items-center gap-1 disabled:opacity-50">
                <RotateCcw className="h-3 w-3" /> שחזר
              </button>
            </div>
          ) : (
            <>
              {(phone || wa) && (
                <div className="flex gap-2 mt-2">
                  {phone && <a href={`tel:${phone}`} className="flex-1 text-center text-fs-xs font-bold py-2 rounded-lg bg-[#0E6B5A] text-white">חיוג</a>}
                  {wa && (
                    <a href={wa} target="_blank" rel="noreferrer" className="flex-1 text-center text-fs-xs font-bold py-2 rounded-lg bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] inline-flex items-center justify-center gap-1">
                      <MessageCircle className="h-3 w-3" /> וואטסאפ
                    </a>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderInterest = (i: InterestRow, trashed: boolean) => {
    const p = profiles[i.user_id];
    const name = i.full_name?.trim() || p?.full_name?.trim() || "דייר";
    const phone = i.phone?.trim() || p?.phone?.trim() || null;
    const email = p?.email ?? null;
    const wa = normalizeWhatsappUrl(phone);
    const committed = i.deposit_required && ["committed", "paid"].includes(i.deposit_status);
    const isSwiped = swipeId === i.id && !trashed;
    return (
      <div key={i.id} className="relative overflow-hidden rounded-2xl">
        {isSwiped && (
          <button onClick={() => setConfirmDelete({ kind: "interest", id: i.id })}
            className="absolute top-0 bottom-0 left-0 w-20 bg-destructive text-destructive-foreground rounded-2xl flex items-center justify-center gap-1 text-fs-xs font-bold z-0">
            <Trash2 className="h-4 w-4" /> מחק
          </button>
        )}
        <div
          className="gb-card p-4 transition-transform relative z-10"
          style={isSwiped ? { transform: "translateX(80px)" } : undefined}
          onTouchStart={trashed ? undefined : onTouchStart}
          onTouchEnd={trashed ? undefined : makeSwipeEnd(i.id)}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-start gap-2.5 min-w-0">
              <Avatar name={name} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-extrabold text-[15px] text-foreground truncate">{name}</h4>
                  <StageBadge stage={interestStage(i)} hot={isHot(i.created_at, interestStage(i))} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-1 truncate">
                  <Clock className="h-3 w-3" /> {timeAgoHe(i.created_at)} · מקור: {dealTitle(i.deal_id)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {committed && (
                <span className="text-[10px] font-bold inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#FFF8E1] text-[#1F2937] border border-[#0E6B5A]/30">
                  <BadgeCheck className="h-3 w-3" />
                  {i.deposit_status === "paid" ? "שולם" : ils(Number(i.deposit_amount))}
                </span>
              )}
              {!trashed && (
                <button
                  onClick={() => setConfirmDelete({ kind: "interest", id: i.id })}
                  disabled={statusBusy === i.id}
                  aria-label="מחק ליד"
                  className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 disabled:opacity-50"
                >
                  {statusBusy === i.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground mb-2">
            {phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {phone}</span>}
            {email && <span className="inline-flex items-center gap-1 truncate"><Mail className="h-3 w-3" /> {email}</span>}
            {i.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {i.city}</span>}
            {i.project_name && <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" /> {i.project_name}</span>}
            <span>נרשם: {new Date(i.created_at).toLocaleDateString("he-IL")}</span>
          </div>
          {i.notes && (
            <p className="text-fs-xs text-foreground/80 bg-muted/40 rounded-lg px-2 py-1.5 mb-2 whitespace-pre-line">{i.notes}</p>
          )}
          {trashed ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-fs-xs text-muted-foreground">ימחק בעוד {daysLeftToPurge(i.deleted_at)} ימים</span>
              <button onClick={() => restoreInterest(i.id)} disabled={statusBusy === i.id}
                className="h-8 px-3 rounded-lg bg-muted text-foreground text-fs-xs font-bold inline-flex items-center gap-1 disabled:opacity-50">
                <RotateCcw className="h-3 w-3" /> שחזר
              </button>
            </div>
          ) : (
            <>
              {/* Direct deposit (resident → supplier) confirmation */}
              {i.direct_deposit_status === "marked_paid_by_resident" && (
                <div className="mb-2 rounded-xl border-2 border-[#0E6B5A] bg-[#F0F9F6] p-3">
                  <div className="text-fs-xs font-bold text-[#0E6B5A] mb-1 inline-flex items-center gap-1">
                    <Coins className="h-3.5 w-3.5" /> דייר סימן ששילם פיקדון של {ils(Number(i.direct_deposit_amount ?? i.deposit_amount))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed">
                    בדוק בחשבון שלך (PayBox/Bit/בנק) ואשר את הקבלה. רק אחרי האישור שלך — ההצטרפות לעסקה תושלם ושובר ייווצר אם היעד יושלם.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => confirmDirectDeposit(i.id)}
                      disabled={statusBusy === i.id}
                      className="h-9 rounded-lg bg-[#0E6B5A] text-white text-fs-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50">
                      <CheckCircle2 className="h-3.5 w-3.5" /> אשר קבלת פיקדון
                    </button>
                    <button onClick={() => disputeDirectDeposit(i.id)}
                      disabled={statusBusy === i.id}
                      className="h-9 rounded-lg bg-destructive/10 text-destructive border border-destructive/30 text-fs-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50">
                      <X className="h-3.5 w-3.5" /> לא התקבל
                    </button>
                  </div>
                </div>
              )}
              {i.direct_deposit_status === "awaiting_payment" && (
                <div className="mb-2 text-fs-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                  ממתין שהדייר יעביר את הפיקדון ויסמן ששילם
                </div>
              )}
              {i.direct_deposit_status === "confirmed_by_supplier" && (
                <div className="mb-2 text-fs-xs text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg px-3 py-2 inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> פיקדון אושר על ידך
                </div>
              )}
              {i.direct_deposit_status === "disputed" && (
                <div className="mb-2 text-fs-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                  סומן כלא התקבל — הדייר קיבל הודעה
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button onClick={() => updateLeadStatus(i.id, "approved")}
                  disabled={statusBusy === i.id || i.lead_status === "approved"}
                  className="h-8 rounded-lg bg-[#059669] text-white text-fs-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50">
                  <Check className="h-3 w-3" /> מאושר
                </button>
                <button onClick={() => updateLeadStatus(i.id, "rejected")}
                  disabled={statusBusy === i.id || i.lead_status === "rejected"}
                  className="h-8 rounded-lg bg-muted text-foreground text-fs-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50">
                  <X className="h-3 w-3" /> לא רלוונטי
                </button>
              </div>
              {(phone || wa) && (
                <div className="flex gap-2">
                  {phone && <a href={`tel:${phone}`} className="flex-1 text-center text-fs-xs font-bold py-2 rounded-lg bg-[#0E6B5A] text-white">חיוג</a>}
                  {wa && (
                    <a href={wa} target="_blank" rel="noreferrer" className="flex-1 text-center text-fs-xs font-bold py-2 rounded-lg bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] inline-flex items-center justify-center gap-1">
                      <MessageCircle className="h-3 w-3" /> וואטסאפ
                    </a>
                  )}
                </div>
              )}
              {isAdmin && i.deposit_required && i.deposit_status !== "paid" && (
                <button onClick={() => markDepositPaid(i.user_id, i.deal_id)}
                  disabled={busyKey === i.user_id + i.deal_id}
                  className="mt-2 w-full text-fs-xs font-bold py-2 rounded-lg bg-[#FFF8E1] text-[#1F2937] border border-[#0E6B5A]/40 inline-flex items-center justify-center gap-1 disabled:opacity-50">
                  <CheckCircle2 className="h-3 w-3" /> סמן פיקדון כשולם (אדמין)
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <MobileShell>
      <ScreenHeader title="לידים ופניות" subtitle="כל הדיירים שהצטרפו להצעות שלך" />

      <div className="px-5 -mt-4 relative z-10 pb-24">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState title="שגיאה בטעינה" description={error} />
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-4 w-4 text-[#0E6B5A]" />
                {showTrash ? `סל מחזור · ${totalTrashed} פריטים` : `סה"כ ${totalActive} פניות${deals.length ? ` · ${deals.length} הצעות` : ""}`}
              </div>
              <button onClick={() => { setShowTrash((v) => !v); setSwipeId(null); }}
                className="text-fs-xs font-bold inline-flex items-center gap-1 px-3 h-8 rounded-lg bg-muted text-foreground">
                <Archive className="h-3 w-3" />
                {showTrash ? "חזרה ללידים" : `סל מחזור${totalTrashed ? ` (${totalTrashed})` : ""}`}
              </button>
            </div>

            {showTrash ? (
              totalTrashed === 0 ? (
                <EmptyState
                  icon={<Archive className="h-7 w-7 text-[#9CA3AF]" />}
                  title="סל המחזור ריק"
                  description="פריטים שנמחקו יופיעו כאן למשך 30 ימים לפני מחיקה לצמיתות."
                />
              ) : (
                <div className="space-y-3">
                  <p className="text-fs-xs text-muted-foreground">פריטים בסל המחזור נמחקים לצמיתות לאחר {TRASH_DAYS} ימים.</p>
                  {trashedInquiries.map((q) => renderInquiry(q, true))}
                  {trashedInterests.map((i) => renderInterest(i, true))}
                </div>
              )
            ) : totalActive === 0 && quoteRequests.length === 0 ? (
              <EmptyState
                icon={<Inbox className="h-7 w-7 text-[#9CA3AF]" />}
                title="אין לידים עדיין"
                description="כשדיירים יביעו עניין בהצעות או בשירותים שלך — הם יופיעו כאן."
              />
            ) : (
              <div className="space-y-3">
                {quoteRequests.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-muted-foreground mt-2 inline-flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-[#0E6B5A]" />
                      בקשות הצעת מחיר מוועדי בתים ({quoteRequests.length})
                    </h3>
                    {quoteRequests.map((q) => {
                      const p = requesterProfiles[q.user_id];
                      const addressed = !!q.supplier_id;
                      return (
                        <div key={q.id} className="gb-card p-4 border-r-4 border-[#0E6B5A]">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-bold text-[15px] text-[#1C1C1E] leading-tight">{q.title}</h4>
                            {addressed && (
                              <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] whitespace-nowrap">
                                פנייה ישירה
                              </span>
                            )}
                          </div>
                          {q.description && (
                            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{q.description}</p>
                          )}
                          <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-[#1C1C1E] mb-3">
                            {q.residents_count != null && (
                              <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5 text-[#0E6B5A]" />{q.residents_count} דיירים</span>
                            )}
                            {q.category_id && (
                              <span className="inline-flex items-center gap-1"><Tag className="h-3.5 w-3.5 text-[#0E6B5A]" />{q.category_id}</span>
                            )}
                            {q.target_price_per_unit != null && (
                              <span className="inline-flex items-center gap-1"><Coins className="h-3.5 w-3.5 text-[#0E6B5A]" />יעד {ils(q.target_price_per_unit)}</span>
                            )}
                            {q.deadline && (
                              <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-[#0E6B5A]" />עד {new Date(q.deadline).toLocaleDateString("he-IL")}</span>
                            )}
                          </div>
                          {p && (
                            <div className="pt-3 border-t border-border flex flex-wrap gap-2">
                              {p.full_name && <span className="text-xs font-bold">{p.full_name}</span>}
                              {p.phone && (
                                <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 text-xs text-[#0E6B5A] font-bold">
                                  <Phone className="h-3.5 w-3.5" />{p.phone}
                                </a>
                              )}
                              {p.email && (
                                <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1 text-xs text-[#0E6B5A] font-bold">
                                  <Mail className="h-3.5 w-3.5" />שלח הצעה
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {inquiries.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-muted-foreground mt-2">פניות כלליות (ללא הצעה)</h3>
                    {inquiries.map((q) => renderInquiry(q, false))}
                  </div>
                )}
                {interests.length > 0 && (
                  <h3 className="text-xs font-bold text-muted-foreground mt-3">לידים על הצעות פעילות</h3>
                )}
                {interests.map((i) => renderInterest(i, false))}
              </div>
            )}
          </>
        )}
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>להעביר לסל המחזור?</AlertDialogTitle>
            <AlertDialogDescription>
              הליד יישמר בסל המחזור למשך {TRASH_DAYS} ימים, ולאחר מכן יימחק לצמיתות.
              ניתן לשחזר אותו בכל עת מתוך סל המחזור.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault();
                if (!confirmDelete) return;
                if (confirmDelete.kind === "interest") await softDeleteInterest(confirmDelete.id);
                else await softDeleteInquiry(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              העבר לסל מחזור
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav role="supplier" />
    </MobileShell>
  );
}
