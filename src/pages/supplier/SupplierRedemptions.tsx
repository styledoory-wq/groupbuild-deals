import { useEffect, useMemo, useState } from "react";
import { Search, TrendingUp, Users, CheckCircle2, Clock, XCircle, Award, Wallet } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentSupplier } from "@/lib/supplierAuth";
import { toast } from "sonner";

type Row = {
  id: string; code: string; status: string; reference_number: string;
  user_id: string; deal_id: string; redeemed_at: string | null;
  deals?: { title: string | null; discounted_price: number | null; original_price: number | null } | null;
  profiles?: { full_name: string | null; project_id: string | null } | null;
};

type RawVoucherRow = Omit<Row, "deals" | "profiles">;

const STATUSES = ["eligible","appointment","measured","ordered","installed","completed","redeemed"] as const;
const STATUS_LABEL: Record<string, string> = {
  eligible: "זכאי", appointment: "נקבעה פגישה", measured: "נלקחו מידות",
  ordered: "בהזמנה", installed: "הותקן", completed: "הושלם", redeemed: "מומש",
  expired: "פג תוקף", cancelled: "בוטל",
};

function statusBadgeStyle(status: string) {
  switch (status) {
    case "eligible":
      return { bg: "bg-[#EEF2FF]", text: "text-[#1E3A8A]", border: "border-[#BFDBFE]", iconColor: "#1E3A8A" };
    case "redeemed":
      return { bg: "bg-[#ECFDF5]", text: "text-[#065F46]", border: "border-[#A7F3D0]", iconColor: "#065F46" };
    case "cancelled":
      return { bg: "bg-[#FEF2F2]", text: "text-[#991B1B]", border: "border-[#FECACA]", iconColor: "#991B1B" };
    case "expired":
      return { bg: "bg-[#F3F4F6]", text: "text-[#4B5563]", border: "border-[#D1D5DB]", iconColor: "#4B5563" };
    default:
      return { bg: "bg-[#FFFBEB]", text: "text-[#92400E]", border: "border-[#FDE68A]", iconColor: "#92400E" };
  }
}

function cardAccent(status: string) {
  switch (status) {
    case "eligible": return "border-r-[3px] border-r-[#3B82F6]";
    case "redeemed": return "border-r-[3px] border-r-[#10B981]";
    case "cancelled": return "border-r-[3px] border-r-[#EF4444]";
    case "expired": return "border-r-[3px] border-r-[#9CA3AF]";
    default: return "border-r-[3px] border-r-[#F59E0B]";
  }
}

function StatusIcon({ status }: { status: string }) {
  if (status === "redeemed") return <CheckCircle2 className="h-3 w-3" />;
  if (status === "cancelled") return <XCircle className="h-3 w-3" />;
  if (status === "expired") return <Clock className="h-3 w-3" />;
  return <Award className="h-3 w-3" />;
}

export default function SupplierRedemptions() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { supplier } = await getCurrentSupplier<{ id: string }>("id");
      if (!supplier) { setLoading(false); return; }
      const { data, error } = await supabase
        .from("vouchers")
        .select("id, code, status, reference_number, user_id, deal_id, redeemed_at")
        .eq("supplier_id", supplier.id)
        .order("created_at", { ascending: false });
      if (error) { console.error("vouchers fetch error", error); toast.error("שגיאה בטעינת מימושים"); setLoading(false); return; }
      const rawRows = (data ?? []) as RawVoucherRow[];
      const dealIds = Array.from(new Set(rawRows.map((r) => r.deal_id).filter(Boolean)));
      const userIds = Array.from(new Set(rawRows.map((r) => r.user_id).filter(Boolean)));
      const [dealsRes, profilesRes] = await Promise.all([
        dealIds.length
          ? supabase.from("deals").select("id, title, discounted_price, original_price, is_deleted").in("id", dealIds)
          : Promise.resolve({ data: [] as any[] } as any),
        userIds.length
          ? supabase.rpc("get_voucher_resident_profiles", { _user_ids: userIds })
          : Promise.resolve({ data: [] as any[] } as any),
      ]);
      const dealsById = new Map(((dealsRes.data ?? []) as any[]).map((d) => [String(d.id), d]));
      const profilesById = new Map(((profilesRes.data ?? []) as any[]).map((p) => [String(p.id), p]));
      const filtered = rawRows
        .map((r) => ({
          ...r,
          deals: dealsById.get(r.deal_id) ?? null,
          profiles: profilesById.get(r.user_id) ?? null,
        }))
        .filter((r) => r.deals && !(r.deals as any).is_deleted);
      setRows(filtered);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const redeemed = rows.filter(r => r.status === "redeemed").length;
    const potential = rows.reduce((s, r) => s + (r.deals?.discounted_price ?? r.deals?.original_price ?? 0), 0);
    return { total, redeemed, rate: total ? Math.round((redeemed / total) * 100) : 0, potential };
  }, [rows]);

  const filtered = rows.filter(r =>
    !q || (r.profiles?.full_name ?? "").includes(q) || r.code.includes(q.toUpperCase()) || (r.deals?.title ?? "").includes(q)
  );

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("vouchers").update({ status }).eq("id", id);
    if (error) { toast.error("עדכון נכשל"); return; }
    setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    toast.success("הסטטוס עודכן");
  }

  return (
    <MobileShell>
      <PageHeader title="מימושים" subtitle="לקוחות זכאים והתקדמות המימוש" />

      <div className="px-5 pb-28 space-y-5">
        {/* Hero Banner — Navy/Gold */}
        <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#0A1F3D] to-[#1A3A5C] p-5 text-white shadow-[0_8px_20px_-10px_rgba(10,31,61,0.45)]">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none"
               style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #D4AF37, transparent 60%)" }} />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div>
              <div className="text-fs-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-1">סה"כ זכאים</div>
              <div className="text-3xl font-extrabold">{stats.total}</div>
              <div className="text-fs-sm text-white/70 mt-0.5">לקוחות פעילים</div>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/30">
              <Users className="h-7 w-7 text-[#D4AF37]" />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          <StatCard icon={Users} label="זכאים" value={stats.total.toString()} color="#0A1F3D" bg="#EEF2FF" />
          <StatCard icon={CheckCircle2} label="מומש" value={stats.redeemed.toString()} color="#065F46" bg="#ECFDF5" />
          <StatCard icon={TrendingUp} label="% מימוש" value={`${stats.rate}%`} color="#92400E" bg="#FFFBEB" />
        </div>

        {/* Income Potential */}
        <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-r from-[#FEF9E7] to-[#FFF8F0] p-4 border border-[#FDE68A]/60 shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37]/15">
              <Wallet className="h-5 w-5 text-[#B8923F]" />
            </div>
            <div className="flex-1">
              <div className="text-fs-xs font-bold text-[#6B7280] uppercase tracking-wider">פוטנציאל הכנסה</div>
              <div className="text-2xl font-extrabold text-[#0A1F3D] mt-0.5">₪{stats.potential.toLocaleString("he-IL")}</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש לפי שם, קוד או הצעה" className="pr-9 rounded-2xl border-0 bg-white shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)] focus-visible:ring-[#D4AF37]/40" />
        </div>

        {/* Cards */}
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 gb-skeleton rounded-[20px]" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="gb-card p-10 text-center text-muted-foreground">
            אין עדיין מימושים להצגה
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r, idx) => {
              const badge = statusBadgeStyle(r.status);
              return (
                <div
                  key={r.id}
                  className={`rounded-[20px] p-4 space-y-3 bg-gradient-to-br from-white to-[#FAFBFC] shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)] transition-all duration-300 hover:shadow-[0_8px_24px_-10px_rgba(10,31,61,0.16)] hover:-translate-y-0.5 ${cardAccent(r.status)}`}
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  {/* Top row: name + code + badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-bold text-foreground truncate">{r.profiles?.full_name ?? "דייר"}</div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-fs-xs font-bold ${badge.bg} ${badge.text} border ${badge.border}`}>
                          <StatusIcon status={r.status} />
                          {STATUS_LABEL[r.status] ?? r.status}
                        </span>
                      </div>
                      <div className="text-fs-xs text-muted-foreground truncate">{r.deals?.title} · {r.profiles?.project_id ?? ""}</div>
                    </div>
                    <span className="font-mono text-fs-xs text-muted-foreground whitespace-nowrap bg-[#F3F4F6] px-2 py-1 rounded-lg">{r.code}</span>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-[#E5E7EB] to-transparent" />

                  {/* Status selector */}
                  <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)} disabled={r.status === "redeemed"}>
                    <SelectTrigger className="h-9 text-sm bg-white/80 border-0 rounded-xl shadow-none hover:bg-white transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
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

function StatCard({ icon: Icon, label, value, color, bg }: { icon: typeof Users; label: string; value: string; color: string; bg: string }) {
  return (
    <div className="rounded-[20px] p-3 text-center bg-white shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)] transition-all duration-300 hover:shadow-[0_8px_24px_-10px_rgba(10,31,61,0.12)] hover:-translate-y-0.5">
      <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: bg }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="text-lg font-extrabold text-foreground">{value}</div>
      <div className="text-fs-xs text-muted-foreground font-medium mt-0.5">{label}</div>
    </div>
  );
}
