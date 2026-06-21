import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, Ticket, Wallet, TrendingUp, MoreVertical, Calendar, Tag, User as UserIcon, Plus, CheckCircle2, Clock, XCircle, Truck, Send } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { ScreenHeader, SkeletonList } from "@/components/ds";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentSupplier } from "@/lib/supplierAuth";
import { toast } from "sonner";

type Row = {
  id: string; code: string; status: string; reference_number: string;
  user_id: string; deal_id: string; redeemed_at: string | null; created_at?: string;
  deals?: { title: string | null; discounted_price: number | null; original_price: number | null; cover_image_url: string | null } | null;
  profiles?: { full_name: string | null; project_id: string | null } | null;
};

type RawVoucherRow = Omit<Row, "deals" | "profiles">;

const STATUSES = ["eligible","in_progress","redeemed","cancelled"] as const;
const STATUS_LABEL: Record<string, string> = {
  eligible: "ממתין",
  in_progress: "בתהליך",
  redeemed: "שולם",
  cancelled: "בוטל",
  expired: "פג תוקף",
};

const TABS = [
  { id: "all", label: "הכל" },
  { id: "in_progress", label: "ממתין" },
  { id: "redeemed", label: "שולם" },
  { id: "completed", label: "הושלם" },
  { id: "cancelled", label: "בוטל" },
] as const;

function priceOf(r: Row) {
  return r.deals?.discounted_price ?? r.deals?.original_price ?? 0;
}

function statusPill(status: string) {
  switch (status) {
    case "redeemed":
      return { label: "שולם", bg: "bg-[#ECFDF5]", text: "text-[#047857]", border: "border-[#A7F3D0]", Icon: CheckCircle2 };
    case "in_progress":
      return { label: "ממתין", bg: "bg-[#FFF7ED]", text: "text-[#C2410C]", border: "border-[#FED7AA]", Icon: Clock };
    case "eligible":
      return { label: "ממתין", bg: "bg-[#FFF7ED]", text: "text-[#C2410C]", border: "border-[#FED7AA]", Icon: Clock };
    case "cancelled":
      return { label: "בוטל", bg: "bg-[#FEF2F2]", text: "text-[#B91C1C]", border: "border-[#FECACA]", Icon: XCircle };
    case "expired":
      return { label: "פג תוקף", bg: "bg-[#F3F4F6]", text: "text-[#4B5563]", border: "border-[#E5E7EB]", Icon: Clock };
    default:
      return { label: STATUS_LABEL[status] ?? status, bg: "bg-[#F3F4F6]", text: "text-[#4B5563]", border: "border-[#E5E7EB]", Icon: Clock };
  }
}

function Sparkline({ points, className }: { points: number[]; className?: string }) {
  const W = 280, H = 80, P = 4;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = max - min || 1;
  const step = (W - P * 2) / Math.max(points.length - 1, 1);
  const coords = points.map((v, i) => [P + i * step, P + (H - P * 2) * (1 - (v - min) / span)] as const);
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`).join(" ");
  const areaPath = `${path} L ${(W - P).toFixed(1)} ${(H - P).toFixed(1)} L ${P} ${(H - P).toFixed(1)} Z`;
  const last = coords[coords.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0E6B5A" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#0E6B5A" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#spark-fill)" />
      <path d={path} stroke="#0E6B5A" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {last && (
        <>
          <circle cx={last[0]} cy={last[1]} r="6" fill="#0E6B5A" fillOpacity="0.15" />
          <circle cx={last[0]} cy={last[1]} r="3.5" fill="#fff" stroke="#0E6B5A" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}

export default function SupplierRedemptions() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [supplierId, setSupplierId] = useState<string | null>(null);

  const loadRows = async (sid: string) => {
    const { data, error } = await supabase
      .from("vouchers")
      .select("id, code, status, reference_number, user_id, deal_id, redeemed_at, created_at")
      .eq("supplier_id", sid)
      .order("created_at", { ascending: false });
    if (error) { console.error(error); toast.error("שגיאה בטעינת הכנסות"); return; }
    const rawRows = (data ?? []) as RawVoucherRow[];
    const dealIds = Array.from(new Set(rawRows.map((r) => r.deal_id).filter(Boolean)));
    const userIds = Array.from(new Set(rawRows.map((r) => r.user_id).filter(Boolean)));
    const [dealsRes, profilesRes] = await Promise.all([
      dealIds.length
        ? supabase.from("deals").select("id, title, discounted_price, original_price, cover_image_url, is_deleted").in("id", dealIds)
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
  };

  useEffect(() => {
    (async () => {
      const { supplier } = await getCurrentSupplier<{ id: string }>("id");
      if (!supplier) { setLoading(false); return; }
      setSupplierId(supplier.id);
      await loadRows(supplier.id);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!supplierId) return;
    const channel = supabase
      .channel(`supplier-vouchers-${supplierId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vouchers", filter: `supplier_id=eq.${supplierId}` },
        () => { void loadRows(supplierId); },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [supplierId]);

  const stats = useMemo(() => {
    const paid = rows.filter(r => r.status === "redeemed");
    const totalIncome = paid.reduce((s, r) => s + priceOf(r), 0);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthIncome = paid
      .filter(r => r.redeemed_at && new Date(r.redeemed_at) >= monthStart)
      .reduce((s, r) => s + priceOf(r), 0);
    const customers = new Set(rows.map(r => r.user_id)).size;

    // 12-bucket sparkline by week of recent activity
    const buckets = new Array(12).fill(0);
    const refDate = now.getTime();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    paid.forEach((r) => {
      const t = r.redeemed_at ? new Date(r.redeemed_at).getTime() : null;
      if (!t) return;
      const weeksAgo = Math.floor((refDate - t) / weekMs);
      if (weeksAgo >= 0 && weeksAgo < 12) buckets[11 - weeksAgo] += priceOf(r);
    });
    if (buckets.every(b => b === 0)) {
      // demo curve when no data so the chart still feels alive
      for (let i = 0; i < 12; i++) buckets[i] = Math.round(8 + i * 1.5 + Math.sin(i) * 2);
    }

    return { totalIncome, monthIncome, customers, count: rows.length, spark: buckets };
  }, [rows]);

  const filtered = rows.filter(r => {
    if (tab !== "all" && r.status !== tab) return false;
    if (!q) return true;
    return (r.profiles?.full_name ?? "").includes(q)
      || r.code.toLowerCase().includes(q.toLowerCase())
      || (r.deals?.title ?? "").includes(q)
      || (r.reference_number ?? "").includes(q);
  });

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("vouchers").update({ status }).eq("id", id);
    if (error) { toast.error("עדכון נכשל"); return; }
    setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    toast.success("הסטטוס עודכן");
  }

  const fmt = (n: number) => n.toLocaleString("he-IL");
  const fmtDate = (s?: string | null) => s ? new Date(s).toLocaleDateString("he-IL") : "—";

  return (
    <MobileShell>
      <ScreenHeader title="הכנסות ותשלומים" subtitle="כל המימושים וההכנסות שלך" />

      <div className="px-5 pb-28 space-y-4">
        {/* Stripe-style income card */}
        <div className="rounded-[22px] bg-white p-5 shadow-[0_4px_18px_-8px_rgba(10,31,61,0.10)] border border-[#F1F2F4]">
          <div className="flex items-start justify-between gap-3">
            <div className="text-right">
              <div className="text-fs-xs font-semibold text-[#6B7280] tracking-wide">סה״כ הכנסות</div>
              <div className="mt-1 flex items-baseline gap-1 justify-end">
                <span className="text-3xl font-extrabold text-[#0F172A] tabular-nums">₪{fmt(stats.totalIncome)}</span>
              </div>
              <div className="mt-1 text-fs-xs text-[#047857] font-semibold tabular-nums">₪{fmt(stats.monthIncome)} החודש</div>
            </div>
            <Select defaultValue="month">
              <SelectTrigger className="h-8 w-auto gap-1 rounded-full border-[#E5E7EB] bg-[#FAFBFC] text-fs-xs font-medium text-[#374151] px-3 shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="week">השבוע</SelectItem>
                <SelectItem value="month">החודש</SelectItem>
                <SelectItem value="quarter">רבעון</SelectItem>
                <SelectItem value="year">שנה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-3 -mx-1">
            <Sparkline points={stats.spark} className="w-full h-20" />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2.5">
          <KpiCard icon={Users} value={fmt(stats.customers)} label="לקוחות" tint="#EEF2FF" iconColor="#4F46E5" />
          <KpiCard icon={Ticket} value={fmt(stats.count)} label="מימושים" tint="#F5F3FF" iconColor="#7C3AED" />
          <KpiCard icon={Wallet} value={`₪${fmt(stats.totalIncome)}`} label="הכנסות" tint="#ECFDF5" iconColor="#0E6B5A" />
        </div>

        {/* Tabs */}
        <div className="relative rounded-full bg-[#F3F4F6] p-1 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 min-w-max">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-1.5 rounded-full text-fs-sm font-semibold whitespace-nowrap transition-all ${
                  tab === t.id ? "bg-[#0E6B5A] text-white shadow-sm" : "text-[#6B7280] hover:text-[#0F172A]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש לפי לקוח, הצעה או מספר" className="pr-9 rounded-2xl border border-[#F1F2F4] bg-white shadow-none focus-visible:ring-[#0E6B5A]/40" />
        </div>

        {/* Transactions */}
        {loading ? (
          <SkeletonList count={3} itemClassName="h-24" />
        ) : filtered.length === 0 ? (
          <EmptyIncome onCreate={() => navigate("/supplier/offers/new")} />
        ) : (
          <div className="space-y-2.5">
            {filtered.map((r) => {
              const pill = statusPill(r.status);
              const PIcon = pill.Icon;
              const cover = r.deals?.cover_image_url;
              const dateStr = fmtDate(r.redeemed_at ?? r.created_at);
              return (
                <div
                  key={r.id}
                  className="rounded-[18px] bg-white border border-[#F1F2F4] p-3 shadow-[0_2px_8px_-4px_rgba(10,31,61,0.06)] transition-all hover:shadow-[0_8px_22px_-12px_rgba(10,31,61,0.14)]"
                >
                  <div className="flex items-stretch gap-3">
                    {/* Cover */}
                    <div className="relative shrink-0">
                      <div className="h-[72px] w-[72px] rounded-2xl overflow-hidden bg-[#F3F4F6]">
                        {cover ? (
                          <img src={cover} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[#9CA3AF]">
                            <Tag className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <span className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${pill.bg} ${pill.text} border ${pill.border} whitespace-nowrap`}>
                        <PIcon className="h-2.5 w-2.5" />
                        {pill.label}
                      </span>
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="font-bold text-[15px] text-[#0F172A] truncate text-right">{r.deals?.title ?? "הצעה"}</div>
                        <div className="mt-0.5 flex items-center gap-1 justify-end text-fs-xs text-[#6B7280] truncate">
                          <span className="truncate">{r.profiles?.full_name ?? "דייר"}</span>
                          <UserIcon className="h-3 w-3 shrink-0" />
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 justify-end text-fs-xs text-[#6B7280]">
                          <span>הצעה #{r.reference_number || r.code}</span>
                          <Tag className="h-3 w-3 shrink-0" />
                        </div>
                      </div>
                    </div>

                    {/* Amount + menu */}
                    <div className="flex flex-col items-start justify-between shrink-0">
                      <div className="text-right">
                        <div className="text-[17px] font-extrabold text-[#0F172A] tabular-nums whitespace-nowrap">₪{fmt(priceOf(r))}</div>
                        <div className="mt-1 flex items-center gap-1 justify-end text-[11px] text-[#9CA3AF]">
                          <span className="tabular-nums">{dateStr}</span>
                          <Calendar className="h-3 w-3" />
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="mt-2 h-7 w-7 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#0F172A] transition">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-44">
                          {STATUSES.map(s => (
                            <DropdownMenuItem key={s} onClick={() => updateStatus(r.id, s)} disabled={r.status === s}>
                              סמן כ"{STATUS_LABEL[s]}"
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
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

function KpiCard({ icon: Icon, value, label, tint, iconColor }: { icon: any; value: string; label: string; tint: string; iconColor: string }) {
  return (
    <div className="rounded-[18px] bg-white border border-[#F1F2F4] p-3 shadow-[0_2px_8px_-4px_rgba(10,31,61,0.05)]">
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: tint }}>
          <Icon className="h-4 w-4" style={{ color: iconColor }} />
        </div>
        <div className="min-w-0 text-right flex-1">
          <div className="text-[15px] font-extrabold text-[#0F172A] truncate tabular-nums">{value}</div>
          <div className="text-[11px] text-[#6B7280] font-medium truncate">{label}</div>
        </div>
      </div>
    </div>
  );
}

function EmptyIncome({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-[22px] bg-white border border-[#F1F2F4] p-6 shadow-[0_4px_18px_-8px_rgba(10,31,61,0.08)]">
      <div className="flex items-center gap-4">
        {/* Illustration */}
        <div className="relative shrink-0 w-[110px] h-[110px]">
          <div className="absolute inset-0 rounded-full bg-[#ECFDF5]" />
          <svg viewBox="0 0 120 120" className="absolute inset-0">
            <rect x="22" y="50" width="64" height="44" rx="10" fill="#0E6B5A" />
            <rect x="22" y="50" width="64" height="14" rx="10" fill="#0A5446" />
            <circle cx="74" cy="76" r="6" fill="#0A5446" />
            <circle cx="74" cy="76" r="2.5" fill="#9CC4B0" />
            <path d="M70 30 L98 18 L94 38 L102 36 L78 56" fill="none" stroke="#0E6B5A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 4" />
            <path d="M98 18 L90 26 L94 38 L102 36 Z" fill="#0E6B5A" />
          </svg>
          <Send className="absolute top-2 right-1 h-4 w-4 text-[#0E6B5A]" />
        </div>
        <div className="flex-1 min-w-0 text-right">
          <div className="text-[17px] font-extrabold text-[#0F172A]">אין עדיין הכנסות</div>
          <div className="mt-1 text-fs-sm text-[#6B7280] leading-relaxed">כשתתחיל לקבל הזמנות,<br/>הן יופיעו כאן</div>
        </div>
      </div>
      <Button
        onClick={onCreate}
        className="mt-4 w-full h-11 rounded-xl bg-[#0E6B5A] hover:bg-[#0A5446] text-white font-bold shadow-[0_6px_16px_-8px_rgba(14,107,90,0.6)]"
      >
        <Plus className="h-4 w-4 ml-1" />
        צור הצעה חדשה
      </Button>
    </div>
  );
}
