import { useEffect, useState } from "react";
import { Trash2, Loader2, Inbox, Phone, MapPin, Building2, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

type Tab = "interests" | "inquiries" | "waitlist";

type InterestRow = {
  id: string; deal_id: string; user_id: string; full_name: string | null;
  phone: string | null; city: string | null; lead_status: string | null;
  status: string; created_at: string;
};
type InquiryRow = {
  id: string; supplier_id: string; full_name: string | null; phone: string | null;
  email: string | null; city: string | null; message: string | null;
  source: string; status: string; created_at: string;
};
type WaitlistRow = {
  id: string; lead_type: string; full_name: string | null; phone: string | null;
  city: string | null; business_name: string | null; category: string | null;
  created_at: string;
};

export default function AdminLeads() {
  const [tab, setTab] = useState<Tab>("interests");
  const [loading, setLoading] = useState(true);
  const [interests, setInterests] = useState<InterestRow[]>([]);
  const [inquiries, setInquiries] = useState<InquiryRow[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: Tab; id: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [i, q, w] = await Promise.all([
        supabase.from("deal_interests")
          .select("id,deal_id,user_id,full_name,phone,city,lead_status,status,created_at")
          .eq("is_deleted", false).order("created_at", { ascending: false }).limit(500),
        supabase.from("supplier_inquiries")
          .select("id,supplier_id,full_name,phone,email,city,message,source,status,created_at")
          .eq("is_deleted", false).order("created_at", { ascending: false }).limit(500),
        supabase.from("waitlist_leads")
          .select("id,lead_type,full_name,phone,city,business_name,category,created_at")
          .eq("is_deleted", false).order("created_at", { ascending: false }).limit(500),
      ]);
      if (i.error) throw i.error;
      if (q.error) throw q.error;
      if (w.error) throw w.error;
      setInterests((i.data ?? []) as InterestRow[]);
      setInquiries((q.data ?? []) as InquiryRow[]);
      setWaitlist((w.data ?? []) as WaitlistRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "טעינה נכשלה");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const doDelete = async () => {
    if (!confirm) return;
    const { kind, id } = confirm;
    setBusy(id);
    try {
      if (kind === "interests") {
        const { error } = await supabase.rpc("supplier_soft_delete_interest", { _interest_id: id });
        if (error) throw error;
        setInterests((p) => p.filter((r) => r.id !== id));
      } else if (kind === "inquiries") {
        const { error } = await supabase.rpc("supplier_soft_delete_inquiry", { _inquiry_id: id });
        if (error) throw error;
        setInquiries((p) => p.filter((r) => r.id !== id));
      } else {
        const { error } = await supabase.from("waitlist_leads")
          .update({ is_deleted: true, deleted_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
        setWaitlist((p) => p.filter((r) => r.id !== id));
      }
      toast.success("הליד נמחק");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "מחיקה נכשלה");
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  };

  const counts = { interests: interests.length, inquiries: inquiries.length, waitlist: waitlist.length };

  return (
    <MobileShell>
      <PageHeader size="large" title="ניהול לידים" subtitle="לידים, פניות ורשימת המתנה" />

      <div className="px-5 mt-1 mb-3">
        <div className="bg-white rounded-[14px] border border-[#ECEEF2] p-1 flex gap-1">
          {(["interests","inquiries","waitlist"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 h-10 rounded-[10px] text-[12px] font-extrabold transition-all ${
                tab === t ? "bg-[#0E6B5A] text-white shadow-sm" : "text-[#6B7280]"
              }`}
            >
              {t === "interests" ? `עניין בהצעות (${counts.interests})` : t === "inquiries" ? `פניות לספקים (${counts.inquiries})` : `רשימת המתנה (${counts.waitlist})`}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pb-10 space-y-2.5">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[#0E6B5A]" /></div>
        ) : tab === "interests" ? (
          interests.length === 0 ? <Empty /> : interests.map((r) => (
            <LeadCard key={r.id} busy={busy === r.id} onDelete={() => setConfirm({ kind: "interests", id: r.id })}
              title={r.full_name || "ללא שם"}
              subtitle={`עסקה: ${r.deal_id.slice(0, 8)}…`}
              badge={r.lead_status || r.status}
              meta={[r.phone, r.city].filter(Boolean) as string[]}
              date={r.created_at}
            />
          ))
        ) : tab === "inquiries" ? (
          inquiries.length === 0 ? <Empty /> : inquiries.map((r) => (
            <LeadCard key={r.id} busy={busy === r.id} onDelete={() => setConfirm({ kind: "inquiries", id: r.id })}
              title={r.full_name || "ללא שם"}
              subtitle={r.message || `מקור: ${r.source}`}
              badge={r.status}
              meta={[r.phone, r.email, r.city].filter(Boolean) as string[]}
              date={r.created_at}
            />
          ))
        ) : (
          waitlist.length === 0 ? <Empty /> : waitlist.map((r) => (
            <LeadCard key={r.id} busy={busy === r.id} onDelete={() => setConfirm({ kind: "waitlist", id: r.id })}
              title={r.full_name || r.business_name || "ללא שם"}
              subtitle={r.category || r.lead_type}
              badge={r.lead_type}
              meta={[r.phone, r.city].filter(Boolean) as string[]}
              date={r.created_at}
            />
          ))
        )}
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>למחוק את הליד?</AlertDialogTitle>
            <AlertDialogDescription>
              הליד יועבר לסל המחזור ויימחק לצמיתות לאחר 30 ימים.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-[#DC2626] hover:bg-[#B91C1C]">מחק</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav role="admin" />
    </MobileShell>
  );
}

function Empty() {
  return (
    <div className="text-center py-12 bg-white rounded-[16px] border border-[#ECEEF2]">
      <Inbox className="h-10 w-10 text-[#9CA3AF] mx-auto mb-2" />
      <div className="text-[13px] font-bold text-[#6B7280]">אין לידים</div>
    </div>
  );
}

function LeadCard({ title, subtitle, badge, meta, date, busy, onDelete }: {
  title: string; subtitle?: string | null; badge?: string | null; meta: string[]; date: string;
  busy: boolean; onDelete: () => void;
}) {
  return (
    <div className="bg-white rounded-[16px] p-3.5 border border-[#ECEEF2] shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)]">
      <div className="flex items-start gap-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="font-extrabold text-[14px] text-[#1F2937] truncate">{title}</div>
            {badge && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#FFF8E1] text-[#0E6B5A] shrink-0">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <div className="text-[12px] text-[#6B7280] mb-1.5 line-clamp-2">{subtitle}</div>}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-[#6B7280]">
            {meta.map((m, i) => <span key={i} className="font-medium">{m}</span>)}
            <span className="font-medium">{new Date(date).toLocaleDateString("he-IL")}</span>
          </div>
        </div>
        <button
          onClick={onDelete}
          disabled={busy}
          className="h-9 w-9 rounded-[10px] bg-[#FEE2E2] flex items-center justify-center shrink-0 active:scale-95 transition-transform disabled:opacity-50"
          aria-label="מחק ליד"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin text-[#DC2626]" /> : <Trash2 className="h-4 w-4 text-[#DC2626]" />}
        </button>
      </div>
    </div>
  );
}
