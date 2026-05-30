import { useEffect, useState } from "react";
import { Inbox, Loader2, Users, BadgeCheck, Phone, Mail, MessageCircle, MapPin, Building2, CheckCircle2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { ils } from "@/lib/offerPricing";
import { normalizeWhatsappUrl } from "@/lib/whatsapp";
import { isAdminEmail } from "@/lib/auth";
import { getFriendlyLoadError } from "@/lib/safeAsync";

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
};

export default function SupplierLeads() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deals, setDeals] = useState<DealLite[]>([]);
  const [interests, setInterests] = useState<InterestRow[]>([]);
  const [inquiries, setInquiries] = useState<InquiryRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);

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
        status: status === "approved" ? (i.deposit_required ? "paid" : "approved") : "rejected",
        deposit_status: status === "approved" && i.deposit_required ? "paid" : i.deposit_status,
      } : i)));
      toast.success(status === "approved" ? "הליד אושר והפיקדון סומן כשולם" : "הליד סומן כלא רלוונטי");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "עדכון נכשל");
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
      if (!pending) {
        toast.message("אין פיקדון ממתין לאישור");
        return;
      }
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
          if (!cancelled) {
            setError("יש להתחבר כספק כדי לראות לידים.");
            setLoading(false);
          }
          return;
        }
        const userId = session.session.user.id;
        const email = session.session.user.email ?? "";
        if (!cancelled) setIsAdmin(isAdminEmail(email));

        // Find supplier id
        let { data: sup } = await supabase
          .from("suppliers")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        if (!sup && email) {
          const r = await supabase.from("suppliers").select("id").ilike("email", email).maybeSingle();
          sup = r.data;
        }
        if (!sup) {
          if (!cancelled) {
            setError("לא נמצא פרופיל ספק. השלם את הפרטים תחילה.");
            setLoading(false);
          }
          return;
        }

        // Get ALL supplier deals (including deleted) so historical leads still resolve a title.
        const { data: dealsData } = await supabase
          .from("deals")
          .select("id,title,is_deleted")
          .eq("supplier_id", sup.id);
        const allDeals = (dealsData ?? []) as Array<DealLite & { is_deleted?: boolean }>;
        if (!cancelled) setDeals(allDeals);

        // Always load general inquiries (they don't require a deal)
        const { data: inqData } = await supabase
          .from("supplier_inquiries")
          .select("id,user_id,full_name,phone,email,city,project_name,category_id,message,source,status,created_at")
          .eq("supplier_id", sup.id)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false });
        const inqList = (inqData ?? []) as InquiryRow[];
        if (!cancelled) setInquiries(inqList);

        let list: InterestRow[] = [];
        if (allDeals.length) {
          const dealIds = allDeals.map((d) => d.id);
          const { data: ints, error: iErr } = await supabase
            .from("deal_interests")
            .select("id,user_id,deal_id,status,deposit_required,deposit_amount,deposit_status,created_at,is_demo,full_name,phone,city,project_name,estimated_quantity,lead_status,notes")
            .in("deal_id", dealIds)
            .eq("is_demo", false)
            .eq("is_deleted", false)
            .order("created_at", { ascending: false });
          if (iErr) throw iErr;
          list = (ints ?? []) as InterestRow[];
          if (!cancelled) setInterests(list);
        }

        const userIds = Array.from(new Set([...list.map((i) => i.user_id), ...inqList.map((i) => i.user_id)]));
        if (userIds.length) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id,full_name,phone,email")
            .in("id", userIds);
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
  const totalCount = interests.length + inquiries.length;

  return (
    <MobileShell>
      <PageHeader title="לידים ופניות" subtitle="כל הדיירים שהצטרפו להצעות שלך" back={false} />

      <div className="px-5 -mt-4 relative z-10 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="gb-card p-6 text-center">
            <p className="text-sm text-destructive font-bold">{error}</p>
          </div>
        ) : totalCount === 0 ? (
          <div className="gb-card p-8 flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-3">
              <Inbox className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-base mb-1">אין לידים עדיין</h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              כשדיירים יביעו עניין בהצעות או בשירותים שלך — הם יופיעו כאן.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-4 w-4 text-gold" />
              סה"כ {totalCount} פניות{deals.length ? ` · ${deals.length} הצעות` : " · אין הצעות פעילות"}
            </div>
            {inquiries.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-muted-foreground mt-2">פניות כלליות (ללא הצעה)</h3>
                {inquiries.map((q) => {
                  const p = profiles[q.user_id];
                  const name = q.full_name?.trim() || p?.full_name?.trim() || "דייר";
                  const phone = q.phone?.trim() || p?.phone?.trim() || null;
                  const email = q.email || p?.email || null;
                  const wa = normalizeWhatsappUrl(phone);
                  return (
                    <div key={q.id} className="gb-card p-4 border-r-4 border-gold/40">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-foreground truncate">{name}</h4>
                          <p className="text-fs-xs text-muted-foreground truncate">{q.message ?? "פנייה כללית"}</p>
                        </div>
                        <span className="text-fs-xs font-bold inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gold/10 text-primary border border-gold/30 shrink-0">
                          פנייה חדשה
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-fs-xs text-muted-foreground mb-2">
                        {phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {phone}</span>}
                        {email && <span className="inline-flex items-center gap-1 truncate"><Mail className="h-3 w-3" /> {email}</span>}
                        {q.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {q.city}</span>}
                        {q.project_name && <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" /> {q.project_name}</span>}
                        <span>נרשם: {new Date(q.created_at).toLocaleDateString("he-IL")}</span>
                      </div>
                      {(phone || wa) && (
                        <div className="flex gap-2">
                          {phone && (
                            <a href={`tel:${phone}`} className="flex-1 text-center text-fs-xs font-bold py-2 rounded-lg bg-primary text-primary-foreground">חיוג</a>
                          )}
                          {wa && (
                            <a href={wa} target="_blank" rel="noreferrer" className="flex-1 text-center text-fs-xs font-bold py-2 rounded-lg bg-success/10 text-success border border-success/30 inline-flex items-center justify-center gap-1">
                              <MessageCircle className="h-3 w-3" /> וואטסאפ
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {interests.length > 0 && (
              <h3 className="text-xs font-bold text-muted-foreground mt-3">לידים על הצעות פעילות</h3>
            )}
            {interests.map((i) => {
              const p = profiles[i.user_id];
              const name = i.full_name?.trim() || p?.full_name?.trim() || "דייר";
              const phone = i.phone?.trim() || p?.phone?.trim() || null;
              const email = p?.email ?? null;
              const wa = normalizeWhatsappUrl(phone);
              const committed = i.deposit_required && ["committed", "paid"].includes(i.deposit_status);
              return (
                <div key={i.id} className="gb-card p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-foreground truncate">{name}</h4>
                      <p className="text-fs-xs text-muted-foreground truncate">{dealTitle(i.deal_id)}</p>
                    </div>
                    {committed && (
                      <span className="text-fs-xs font-bold inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gold/10 text-primary border border-gold/30 shrink-0">
                        <BadgeCheck className="h-3 w-3" />
                        {i.deposit_status === "paid" ? "פיקדון שולם" : `התחייב ${ils(Number(i.deposit_amount))}`}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-fs-xs text-muted-foreground mb-2">
                    {phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {phone}
                      </span>
                    )}
                    {email && (
                      <span className="inline-flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3" /> {email}
                      </span>
                    )}
                    {i.city && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {i.city}
                      </span>
                    )}
                    {i.project_name && (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> {i.project_name}
                      </span>
                    )}
                    <span>נרשם: {new Date(i.created_at).toLocaleDateString("he-IL")}</span>
                    {i.lead_status && i.lead_status !== "new" && (
                      <span className={
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold " +
                        (i.lead_status === "approved"
                          ? "bg-success/10 text-success border border-success/30"
                          : i.lead_status === "rejected"
                          ? "bg-muted text-muted-foreground border border-border"
                          : "bg-gold/10 text-primary border border-gold/30")
                      }>
                        {i.lead_status === "approved" ? "מאושר" : i.lead_status === "rejected" ? "לא רלוונטי" : i.lead_status}
                      </span>
                    )}
                  </div>
                  {i.notes && (
                    <p className="text-fs-xs text-foreground/80 bg-muted/40 rounded-lg px-2 py-1.5 mb-2 whitespace-pre-line">
                      {i.notes}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button
                      onClick={() => updateLeadStatus(i.id, "approved")}
                      disabled={statusBusy === i.id || i.lead_status === "approved"}
                      className="h-8 rounded-lg bg-success text-success-foreground text-fs-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <Check className="h-3 w-3" /> מאושר
                    </button>
                    <button
                      onClick={() => updateLeadStatus(i.id, "rejected")}
                      disabled={statusBusy === i.id || i.lead_status === "rejected"}
                      className="h-8 rounded-lg bg-muted text-foreground text-fs-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <X className="h-3 w-3" /> לא רלוונטי
                    </button>
                  </div>
                  {(phone || wa) && (
                    <div className="flex gap-2">
                      {phone && (
                        <a
                          href={`tel:${phone}`}
                          className="flex-1 text-center text-fs-xs font-bold py-2 rounded-lg bg-primary text-primary-foreground"
                        >
                          חיוג
                        </a>
                      )}
                      {wa && (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 text-center text-fs-xs font-bold py-2 rounded-lg bg-success/10 text-success border border-success/30 inline-flex items-center justify-center gap-1"
                        >
                          <MessageCircle className="h-3 w-3" /> וואטסאפ
                        </a>
                      )}
                    </div>
                  )}
                  {isAdmin && i.deposit_required && i.deposit_status !== "paid" && (
                    <button
                      onClick={() => markDepositPaid(i.user_id, i.deal_id)}
                      disabled={busyKey === i.user_id + i.deal_id}
                      className="mt-2 w-full text-fs-xs font-bold py-2 rounded-lg bg-gold/15 text-primary border border-gold/40 inline-flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3 w-3" /> סמן פיקדון כשולם (אדמין)
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav role="supplier" />
    </MobileShell>
  );
}
