import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Inbox, Loader2, Phone, Mail, MessageCircle, Building2, CheckCircle2, Check, X,
  Trash2, RotateCcw, Archive, Clock, PlusCircle, Search, ArrowUpDown, Star,
  StickyNote, Send, Flame,
} from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/layout/MobileShell";
import { ScreenHeader, LoadingState, ErrorState } from "@/components/ds";
import { BottomNav } from "@/components/layout/BottomNav";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ils } from "@/lib/offerPricing";
import { normalizeWhatsappUrl } from "@/lib/whatsapp";
import { isAdminEmail } from "@/lib/auth";
import { getFriendlyLoadError } from "@/lib/safeAsync";
import { resolveSupplierForUser } from "@/lib/supplierAuth";
import { SmartImg } from "@/components/ui/SmartImg";
import { SupplierPendingBanner, isSupplierLocked } from "@/components/supplier/SupplierWorkspace";
import { SUPPLIER } from "@/lib/supplierUi";

type DealLite = { id: string; title: string; cover_image_url?: string | null; gallery_images?: string[] | null };
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
  supplier_notes?: string | null;
  supplier_starred?: boolean | null;
  is_deleted?: boolean;
  deleted_at?: string | null;
  direct_deposit_status?: string | null;
  direct_deposit_amount?: number | null;
  resident_marked_paid_at?: string | null;
  supplier_confirmed_at?: string | null;
};
type ProfileLite = { id: string; full_name: string | null; phone: string | null; email: string | null };

const TRASH_DAYS = 30;
const HOURS_24 = 24 * 3600_000;

type LeadStage = "new" | "in_progress" | "offer_sent" | "closed";
type TabKey = "all" | "open" | "closed";
type SortKey = "newest" | "oldest" | "status" | "deal" | "joiners";

const daysLeftToPurge = (deletedAt?: string | null) => {
  if (!deletedAt) return TRASH_DAYS;
  const ms = new Date(deletedAt).getTime() + TRASH_DAYS * 86400_000 - Date.now();
  return Math.max(0, Math.ceil(ms / 86400_000));
};

function initialsOf(name: string | null | undefined): string {
  const t = (name ?? "").trim();
  if (!t) return "ד";
  const parts = t.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).trim() || "ד";
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
  if (i.lead_status === "approved" || i.direct_deposit_status === "marked_paid_by_resident" || i.direct_deposit_status === "awaiting_payment") return "offer_sent";
  if (i.status === "pending_deposit") return "in_progress";
  return "new";
}
function isHot(createdAt: string, stage: LeadStage): boolean {
  const age = Date.now() - new Date(createdAt).getTime();
  return stage !== "closed" && age < HOURS_24;
}

function StageChip({ stage, hot }: { stage: LeadStage; hot: boolean }) {
  const cfg: Record<LeadStage, { bg: string; fg: string; label: string }> = {
    new:         { bg: "#E8F5F1", fg: "#0E6B5A", label: "חדש" },
    in_progress: { bg: "#F1F5F9", fg: "#334155", label: "בטיפול" },
    offer_sent:  { bg: "#EEF2FF", fg: "#4338CA", label: "הצעה" },
    closed:      { bg: "#F8FAFC", fg: "#64748B", label: "נסגר" },
  };
  if (hot) {
    return (
      <span className="inline-flex items-center gap-1 px-2 h-5 rounded-full text-[10px] font-bold bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]">
        <Flame className="h-3 w-3" /> חם
      </span>
    );
  }
  const c = cfg[stage];
  return (
    <span className="inline-flex items-center gap-1 px-2 h-5 rounded-full text-[10px] font-bold border" style={{ background: c.bg, color: c.fg, borderColor: `${c.fg}22` }}>
      {c.label}
    </span>
  );
}

export default function SupplierLeads() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deals, setDeals] = useState<DealLite[]>([]);
  const [interests, setInterests] = useState<InterestRow[]>([]);
  const [trashedInterests, setTrashedInterests] = useState<InterestRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [swipeId, setSwipeId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string } | null>(null);
  const [tab, setTab] = useState<TabKey>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [noteEdit, setNoteEdit] = useState<{ id: string; value: string } | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
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
      toast.success(status === "approved" ? "הליד אושר — סטטוס: הצעה נשלחה" : "הליד סומן כלא רלוונטי");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "עדכון נכשל");
    } finally {
      setStatusBusy(null);
    }
  };

  const toggleStar = async (i: InterestRow) => {
    const next = !i.supplier_starred;
    setInterests((prev) => prev.map((x) => (x.id === i.id ? { ...x, supplier_starred: next } : x)));
    try {
      const { error } = await (supabase.rpc as any)("supplier_update_interest_meta", {
        _interest_id: i.id, _starred: next, _notes: null,
      });
      if (error) throw error;
    } catch (e) {
      setInterests((prev) => prev.map((x) => (x.id === i.id ? { ...x, supplier_starred: !next } : x)));
      toast.error(e instanceof Error ? e.message : "פעולה נכשלה");
    }
  };

  const saveNotes = async () => {
    if (!noteEdit) return;
    setStatusBusy(noteEdit.id);
    try {
      const { error } = await (supabase.rpc as any)("supplier_update_interest_meta", {
        _interest_id: noteEdit.id, _notes: noteEdit.value, _starred: null,
      });
      if (error) throw error;
      setInterests((prev) => prev.map((x) => (x.id === noteEdit.id ? { ...x, supplier_notes: noteEdit.value } : x)));
      toast.success("ההערה נשמרה");
      setNoteEdit(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שמירה נכשלה");
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

  const markDepositPaid = async (userId: string, dealId: string) => {
    const key = userId + dealId;
    setBusyKey(key);
    try {
      const { data: pending, error: pErr } = await supabase
        .from("deposits").select("id").eq("user_id", userId).eq("deal_id", dealId)
        .eq("status", "pending").eq("is_deleted", false)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (pErr) throw pErr;
      if (!pending) { toast.message("אין תשלום דמי השתתפות ממתין לאישור"); return; }
      const { error: uErr } = await supabase.from("deposits")
        .update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", pending.id);
      if (uErr) throw uErr;
      setInterests((prev) => prev.map((i) => (
        i.user_id === userId && i.deal_id === dealId
          ? { ...i, status: "paid", lead_status: "approved", deposit_status: "paid" }
          : i
      )));
      toast.success("דמי ההשתתפות סומנו כשולמו");
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
        ...i, direct_deposit_status: "confirmed_by_supplier",
        supplier_confirmed_at: new Date().toISOString(),
        status: "paid", lead_status: "approved", deposit_status: "paid",
      } : i)));
      toast.success("דמי ההשתתפות אושרו — הדייר הצטרף לעסקה");
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
      setInterests((prev) => prev.map((i) => (i.id === interestId ? { ...i, direct_deposit_status: "disputed" } : i)));
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
      if (!cancelled) { setError("טעינת הלידים נמשכת יותר מדי זמן. נסו לרענן."); setLoading(false); }
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

        const sup = await resolveSupplierForUser<{ id: string; approval_status: string }>(
          userId, email, "id, approval_status",
        );
        if (!sup) {
          if (!cancelled) { setError("לא נמצא פרופיל ספק. השלם את הפרטים תחילה."); setLoading(false); }
          return;
        }
        if (!cancelled) setApprovalStatus(sup.approval_status);

        const { data: dealsData } = await supabase
          .from("deals").select("id,title,cover_image_url,gallery_images,is_deleted").eq("supplier_id", sup.id);
        const allDeals = (dealsData ?? []) as Array<DealLite & { is_deleted?: boolean }>;
        if (!cancelled) setDeals(allDeals);

        let activeList: InterestRow[] = [];
        let trashedList: InterestRow[] = [];
        if (allDeals.length) {
          const dealIds = allDeals.map((d) => d.id);
          const { data: ints, error: iErr } = await (supabase
            .from("deal_interests") as any)
            .select("id,user_id,deal_id,status,deposit_required,deposit_amount,deposit_status,created_at,is_demo,full_name,phone,city,project_name,estimated_quantity,lead_status,notes,supplier_notes,supplier_starred,is_deleted,deleted_at,direct_deposit_status,direct_deposit_amount,resident_marked_paid_at,supplier_confirmed_at")
            .in("deal_id", dealIds)
            .eq("is_demo", false)
            .order("created_at", { ascending: false });
          if (iErr) throw iErr;
          const all = (ints ?? []) as InterestRow[];
          activeList = all.filter((i) => !i.is_deleted);
          trashedList = all.filter((i) => i.is_deleted);
          if (!cancelled) { setInterests(activeList); setTrashedInterests(trashedList); }
        }

        const userIds = Array.from(new Set([
          ...activeList.map((i) => i.user_id), ...trashedList.map((i) => i.user_id),
        ]));
        if (userIds.length) {
          const { data: profs } = await supabase
            .from("profiles").select("id,full_name,phone,email").in("id", userIds);
          const map: Record<string, ProfileLite> = {};
          (profs ?? []).forEach((p) => { map[(p as ProfileLite).id] = p as ProfileLite; });
          if (!cancelled) setProfiles(map);
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
  const dealCover = (id: string): string | null => {
    const d = deals.find((x) => x.id === id);
    return d?.cover_image_url || (d?.gallery_images && d.gallery_images[0]) || null;
  };

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const makeSwipeEnd = (id: string) => (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 60) setSwipeId(id);
    else if (Math.abs(dx) < 10 && swipeId === id) setSwipeId(null);
  };

  // === Stats ===
  const stats = useMemo(() => {
    let s_new = 0, s_in = 0, s_off = 0, s_closed = 0;
    for (const i of interests) {
      const st = interestStage(i);
      if (st === "new") s_new++;
      else if (st === "in_progress") s_in++;
      else if (st === "offer_sent") s_off++;
      else s_closed++;
    }
    return {
      total: interests.length,
      open: s_new + s_in + s_off,
      closed: s_closed,
      new: s_new,
      in_progress: s_in,
      offer_sent: s_off,
    };
  }, [interests]);

  // === Filter + search + sort ===
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = interests.filter((i) => {
      const st = interestStage(i);
      if (tab === "all") return true;
      if (tab === "closed") return st === "closed";
      return st !== "closed";
    });
    if (q) {
      arr = arr.filter((i) => {
        const p = profiles[i.user_id];
        const name = (i.full_name || p?.full_name || "").toLowerCase();
        const phone = (i.phone || p?.phone || "").toLowerCase();
        const proj = (i.project_name || "").toLowerCase();
        const deal = dealTitle(i.deal_id).toLowerCase();
        return name.includes(q) || phone.includes(q) || proj.includes(q) || deal.includes(q);
      });
    }
    const stageOrder: Record<LeadStage, number> = { new: 0, in_progress: 1, offer_sent: 2, closed: 3 };
    const sorted = [...arr];
    if (sort === "newest") sorted.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    else if (sort === "oldest") sorted.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    else if (sort === "status") sorted.sort((a, b) => stageOrder[interestStage(a)] - stageOrder[interestStage(b)]);
    else if (sort === "deal") sorted.sort((a, b) => dealTitle(a.deal_id).localeCompare(dealTitle(b.deal_id), "he"));
    else if (sort === "joiners") sorted.sort((a, b) => (b.estimated_quantity ?? 0) - (a.estimated_quantity ?? 0));
    // Starred first regardless of sort
    sorted.sort((a, b) => Number(!!b.supplier_starred) - Number(!!a.supplier_starred));
    return sorted;
  }, [interests, profiles, tab, query, sort, deals]);

  const renderLead = (i: InterestRow, trashed: boolean) => {
    const p = profiles[i.user_id];
    const name = i.full_name?.trim() || p?.full_name?.trim() || "דייר";
    const phone = i.phone?.trim() || p?.phone?.trim() || null;
    const email = p?.email ?? null;
    const wa = normalizeWhatsappUrl(phone);
    const stage = interestStage(i);
    const hot = isHot(i.created_at, stage);
    const cover = dealCover(i.deal_id);
    const isSwiped = swipeId === i.id && !trashed;
    const starred = !!i.supplier_starred;
    const joiners = i.estimated_quantity ?? 1;

    return (
      <div key={i.id} className="relative overflow-hidden rounded-2xl">
        {isSwiped && (
          <button onClick={() => setConfirmDelete({ id: i.id })}
            className="absolute top-0 bottom-0 left-0 w-20 bg-destructive text-destructive-foreground rounded-2xl flex items-center justify-center gap-1 text-[12px] font-bold z-0">
            <Trash2 className="h-4 w-4" /> מחק
          </button>
        )}
          <div
          className={"p-3.5 transition-transform relative z-10 " + SUPPLIER.card + " !rounded-2xl"}
          style={isSwiped ? { transform: "translateX(80px)" } : undefined}
          onTouchStart={trashed ? undefined : onTouchStart}
          onTouchEnd={trashed ? undefined : makeSwipeEnd(i.id)}
        >
          {/* Row 1: cover + name/deal/meta + star */}
          <div className="flex items-start gap-2.5">
            {cover ? (
              <SmartImg src={cover} size="thumb" alt=""
                className="h-14 w-14 rounded-xl object-cover shrink-0 border border-[#D5DED9]" />
            ) : (
              <div className="h-14 w-14 rounded-xl flex items-center justify-center text-[#0E6B5A] font-extrabold text-[15px] shrink-0"
                style={{ background: avatarHue(name) }}>
                {initialsOf(name).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="font-extrabold text-[14px] text-foreground truncate max-w-[150px]">{name}</h4>
                <StageChip stage={stage} hot={hot} />
              </div>
              <Link to={`/deals/${i.deal_id}`}
                className="block text-[12px] text-[#0E6B5A] font-bold truncate mt-0.5">
                {i.project_name || dealTitle(i.deal_id)}
              </Link>
              <div className="mt-0.5 text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> {timeAgoHe(i.created_at)}
                <span className="opacity-50">·</span>
                <span>{joiners} {joiners === 1 ? "מצטרף" : "מצטרפים"}</span>
              </div>
            </div>
            {!trashed && (
              <button onClick={() => toggleStar(i)} aria-label={starred ? "הסר חשוב" : "סמן חשוב"}
                className="h-8 w-8 rounded-lg inline-flex items-center justify-center shrink-0"
                style={{
                  background: starred ? "#FFFBEB" : "transparent",
                  color: starred ? "#B45309" : "#94A3B8",
                }}>
                <Star className="h-4 w-4" fill={starred ? "#F59E0B" : "none"} />
              </button>
            )}
          </div>

          {/* Internal notes preview */}
          {i.supplier_notes && (
            <button onClick={() => setNoteEdit({ id: i.id, value: i.supplier_notes ?? "" })}
              className="mt-2 w-full text-right text-[11px] text-foreground/80 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-2 py-1.5 flex items-start gap-1.5">
              <StickyNote className="h-3 w-3 mt-0.5 shrink-0 text-[#B45309]" />
              <span className="line-clamp-2 whitespace-pre-line">{i.supplier_notes}</span>
            </button>
          )}

          {/* Direct deposit blocks */}
          {!trashed && i.direct_deposit_status === "marked_paid_by_resident" && (
            <div className="mt-2 rounded-xl border border-[#0E6B5A] bg-[#F0F9F6] p-2">
              <div className="text-[11px] font-bold text-[#0E6B5A] mb-1.5">
                דייר סימן ששילם {ils(Number(i.direct_deposit_amount ?? i.deposit_amount))}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={() => confirmDirectDeposit(i.id)} disabled={statusBusy === i.id}
                  className="h-8 rounded-md bg-[#0E6B5A] text-white text-[11px] font-bold inline-flex items-center justify-center gap-1 disabled:opacity-50">
                  <CheckCircle2 className="h-3 w-3" /> אשר
                </button>
                <button onClick={() => disputeDirectDeposit(i.id)} disabled={statusBusy === i.id}
                  className="h-8 rounded-md bg-destructive/10 text-destructive border border-destructive/30 text-[11px] font-bold inline-flex items-center justify-center gap-1 disabled:opacity-50">
                  <X className="h-3 w-3" /> לא התקבל
                </button>
              </div>
            </div>
          )}

          {trashed ? (
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">ימחק בעוד {daysLeftToPurge(i.deleted_at)} ימים</span>
              <button onClick={() => restoreInterest(i.id)} disabled={statusBusy === i.id}
                className="h-7 px-2.5 rounded-md bg-muted text-foreground text-[11px] font-bold inline-flex items-center gap-1 disabled:opacity-50">
                <RotateCcw className="h-3 w-3" /> שחזר
              </button>
            </div>
          ) : (
            /* Quick action bar */
            <div className="mt-3 flex items-center gap-2">
              {phone ? (
                <a href={`tel:${phone}`} aria-label="חיוג"
                  className="flex-1 h-11 rounded-2xl bg-[#0E6B5A] text-white text-[13px] font-bold inline-flex items-center justify-center gap-1.5">
                  <Phone className="h-4 w-4" /> חיוג
                </a>
              ) : (
                <div className="flex-1 h-11 rounded-2xl bg-[#F1F5F9] text-[#94A3B8] text-[13px] inline-flex items-center justify-center">אין טלפון</div>
              )}
              {wa ? (
                <a href={wa} target="_blank" rel="noreferrer" aria-label="וואטסאפ"
                  className="flex-1 h-11 rounded-2xl bg-white text-[#0E6B5A] border border-[#0E6B5A]/30 text-[13px] font-bold inline-flex items-center justify-center gap-1.5">
                  <MessageCircle className="h-4 w-4" /> וואטסאפ
                </a>
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button aria-label="עוד"
                    className="h-11 w-11 rounded-2xl bg-[#F3F7F5] text-[#64748B] border border-[#D5DED9] inline-flex items-center justify-center shrink-0">
                    ⋯
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="text-[12px]">
                  <DropdownMenuItem onClick={() => setNoteEdit({ id: i.id, value: i.supplier_notes ?? "" })}>
                    <StickyNote className="h-3.5 w-3.5 ml-1" /> הערה פנימית
                  </DropdownMenuItem>
                  {i.lead_status !== "approved" && (
                    <DropdownMenuItem onClick={() => updateLeadStatus(i.id, "approved")} disabled={statusBusy === i.id}>
                      <Send className="h-3.5 w-3.5 ml-1" /> סמן כהצעה נשלחה
                    </DropdownMenuItem>
                  )}
                  {email && (
                    <DropdownMenuItem onClick={() => window.location.assign(`mailto:${email}`)}>
                      <Mail className="h-3.5 w-3.5 ml-1" /> שלח אימייל
                    </DropdownMenuItem>
                  )}
                  {i.lead_status !== "rejected" && (
                    <DropdownMenuItem onClick={() => updateLeadStatus(i.id, "rejected")}>
                      <X className="h-3.5 w-3.5 ml-1" /> סמן כלא רלוונטי
                    </DropdownMenuItem>
                  )}
                  {isAdmin && i.deposit_required && i.deposit_status !== "paid" && (
                    <DropdownMenuItem onClick={() => markDepositPaid(i.user_id, i.deal_id)}
                      disabled={busyKey === i.user_id + i.deal_id}>
                      <Check className="h-3.5 w-3.5 ml-1" /> סמן דמי השתתפות כשולמו (אדמין)
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDelete({ id: i.id })}>
                    <Trash2 className="h-3.5 w-3.5 ml-1" /> מחק ליד
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    );
  };

  const totalTrashed = trashedInterests.length;

  return (
    <MobileShell className="bg-[#E4EBE7]">
      <ScreenHeader title="לידים" subtitle="פניות שממתינות לכם" />

      <div className="px-4 -mt-2 relative z-10 pb-24 space-y-3">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState title="שגיאה בטעינה" description={error} />
        ) : (
          <>
            <SupplierPendingBanner status={approvalStatus} />

            {/* Stage filters — 3 calm segments */}
            <div className={SUPPLIER.card + " p-1 grid grid-cols-3 gap-1 !rounded-2xl"}>
              {([
                { k: "all" as TabKey, label: "הכל", count: stats.total },
                { k: "open" as TabKey, label: "פתוחים", count: stats.open },
                { k: "closed" as TabKey, label: "נסגרו", count: stats.closed },
              ]).map((t) => {
                const active = tab === t.k;
                return (
                  <button
                    key={t.k}
                    type="button"
                    onClick={() => { setTab(t.k); setShowTrash(false); }}
                    className={
                      "rounded-xl px-2 py-2.5 text-center transition-colors " +
                      (active
                        ? "bg-[#0E6B5A] text-white shadow-[0_6px_16px_-10px_rgba(14,107,90,0.7)]"
                        : "text-[#475569]")
                    }
                  >
                    <div className={"text-[16px] font-bold tabular-nums leading-none " + (active ? "text-white" : "text-[#0F172A]")}>
                      {t.count}
                    </div>
                    <div className={"text-[11px] font-semibold mt-1 " + (active ? "text-white/85" : "text-[#8E95A2]")}>
                      {t.label}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Search + Sort */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="חיפוש שם, טלפון או הצעה"
                  className={"w-full pr-9 pl-3 text-[13px] font-medium text-foreground placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0E6B5A] " + SUPPLIER.input}
                />
                {query && (
                  <button onClick={() => setQuery("")} aria-label="נקה"
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center text-[#94A3B8]">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-11 px-3.5 rounded-2xl bg-white border border-[#D5DED9] shadow-sm inline-flex items-center gap-1.5 text-[12px] font-bold text-[#0F172A] shrink-0">
                    <ArrowUpDown className="h-3.5 w-3.5" /> מיון
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="text-[12px]">
                  <DropdownMenuLabel>מיון לפי</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                    <DropdownMenuRadioItem value="newest">חדש ביותר</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="oldest">ישן ביותר</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="status">סטטוס</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="deal">הצעה</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="joiners">מספר מצטרפים</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Trash toggle */}
            {(totalTrashed > 0 || showTrash) && (
              <div className="flex items-center justify-end">
                <button onClick={() => { setShowTrash((v) => !v); setSwipeId(null); }}
                  className="text-[11px] font-bold inline-flex items-center gap-1 px-2.5 h-7 rounded-lg bg-muted text-foreground">
                  <Archive className="h-3 w-3" />
                  {showTrash ? "חזרה ללידים" : `סל מחזור${totalTrashed ? ` (${totalTrashed})` : ""}`}
                </button>
              </div>
            )}

            {/* List */}
            {showTrash ? (
              totalTrashed === 0 ? (
                <div className={SUPPLIER.card + " p-6 text-center !rounded-2xl"}>
                  <div className="mx-auto h-12 w-12 rounded-xl bg-[#F0F9F6] flex items-center justify-center mb-2">
                    <Archive className="h-5 w-5 text-[#9CA3AF]" />
                  </div>
                  <h3 className="text-[13px] font-extrabold">סל המחזור ריק</h3>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground">פריטים נמחקים אחרי {TRASH_DAYS} ימים.</p>
                  {trashedInterests.map((i) => renderLead(i, true))}
                </div>
              )
            ) : visible.length === 0 ? (
              <div className={SUPPLIER.card + " p-7 text-center !rounded-2xl"}>
                <div className="mx-auto h-14 w-14 rounded-2xl bg-[#E8F5F1] flex items-center justify-center mb-3">
                  <Inbox className="h-6 w-6 text-[#0E6B5A]" />
                </div>
                <h3 className="text-[15px] font-bold text-[#0F172A]">
                  {query
                    ? "לא נמצאו לידים תואמים"
                    : isSupplierLocked(approvalStatus)
                      ? "עוד אין לידים — והחשבון בבדיקה"
                      : tab === "all"
                        ? "עוד אין לידים"
                        : tab === "open"
                          ? "אין לידים פתוחים"
                          : "אין לידים שנסגרו"}
                </h3>
                <p className="text-[13px] text-[#8E95A2] mt-1.5 leading-relaxed max-w-[280px] mx-auto">
                  {query
                    ? "נסו מילים אחרות או נקו את החיפוש"
                    : isSupplierLocked(approvalStatus)
                      ? "אחרי האישור, פניות מדיירים יופיעו כאן עם טלפון ושלב טיפול."
                      : tab === "all"
                        ? "פרסמו הצעה פעילה — דיירים בפרויקטים רלוונטיים יוכלו לפנות אליכם."
                        : "עברו ל״הכל״ או המתינו לפניות חדשות."}
                </p>
                {!query && tab === "all" && !isSupplierLocked(approvalStatus) && (
                  <Link to="/supplier/offers/new"
                    className="mt-4 inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#0E6B5A] text-white text-[13px] font-bold">
                    <PlusCircle className="h-4 w-4" /> יצירת הצעה
                  </Link>
                )}
                {!query && isSupplierLocked(approvalStatus) && (
                  <Link to="/supplier/profile/edit"
                    className="mt-4 inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#0E6B5A] text-white text-[13px] font-bold">
                    השלמת פרופיל
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {visible.map((i) => renderLead(i, false))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Notes dialog */}
      <Dialog open={!!noteEdit} onOpenChange={(o) => !o && setNoteEdit(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">הערות פנימיות</DialogTitle>
            <DialogDescription className="text-right text-[12px] text-muted-foreground">
              ההערות גלויות רק לך — הדייר לא רואה אותן.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={noteEdit?.value ?? ""}
            onChange={(e) => setNoteEdit((n) => n ? { ...n, value: e.target.value } : n)}
            placeholder="לדוגמה: התקשרתי, ביקש לחזור ביום ראשון..."
            rows={5}
            className="text-[13px]"
            dir="rtl"
          />
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setNoteEdit(null)}>ביטול</Button>
            <Button onClick={saveNotes} disabled={!noteEdit || statusBusy === noteEdit?.id}
              className="bg-[#0E6B5A] hover:bg-[#0E6B5A]/90 text-white">
              {statusBusy === noteEdit?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "שמור"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>להעביר לסל המחזור?</AlertDialogTitle>
            <AlertDialogDescription>
              הליד יישמר {TRASH_DAYS} ימים ואז יימחק לצמיתות. אפשר לשחזר בכל עת.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault();
                if (!confirmDelete) return;
                await softDeleteInterest(confirmDelete.id);
                setConfirmDelete(null);
              }}>
              העבר לסל מחזור
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav role="supplier" />
    </MobileShell>
  );
}
