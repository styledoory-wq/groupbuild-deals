import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Wallet, CheckCircle2, Ticket, ChevronLeft } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { LoadingState } from "@/components/ds";
import { supabase } from "@/integrations/supabase/client";
import { resolveSupplierForUser } from "@/lib/supplierAuth";

type Tx = {
  id: string;
  title: string;
  amount: number;
  status: string;
  at: string;
  customer: string;
};

const GREEN = "#0E6B5A";

function formatILS(n: number): string {
  return `₪${Math.round(n).toLocaleString("he-IL")}`;
}
function shortILS(n: number): string {
  if (n >= 1_000_000) return `₪${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₪${Math.round(n / 1_000)}K`;
  return formatILS(n);
}
function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - +new Date(iso)) / 60000);
  if (m < 60) return `לפני ${m} ד׳`;
  const h = Math.floor(m / 60);
  if (h < 24) return `לפני ${h} שע׳`;
  const d = Math.floor(h / 24);
  return `לפני ${d} ימים`;
}

export default function SupplierRevenue() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [monthly, setMonthly] = useState<number[]>(Array(6).fill(0));
  const [totals, setTotals] = useState({ revenue: 0, redemptions: 0, pending: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          if (!cancelled) setLoading(false);
          return;
        }
        const sup = await resolveSupplierForUser<{ id: string }>(
          session.session.user.id,
          session.session.user.email ?? "",
          "id",
        );
        if (!sup) {
          if (!cancelled) setLoading(false);
          return;
        }

        const { data: dealsData } = await supabase
          .from("deals")
          .select("id,title,discounted_price,original_price,base_price,offer_type,discount_percentage")
          .eq("supplier_id", sup.id)
          .eq("is_deleted", false);
        const deals = dealsData ?? [];
        const dealMap = new Map(deals.map((d) => [d.id, d]));
        const priceOf = (d: typeof deals[0]) => {
          if (d.offer_type === "price_comparison" && d.discounted_price != null) return Number(d.discounted_price);
          if (d.offer_type === "percentage" && d.original_price != null && d.discount_percentage != null) {
            return Number(d.original_price) * (1 - Number(d.discount_percentage) / 100);
          }
          return Number(d.base_price ?? d.original_price ?? 0);
        };

        const dealIds = deals.map((d) => d.id);
        if (dealIds.length === 0) {
          if (!cancelled) setLoading(false);
          return;
        }

        const { data: depositRows } = await supabase
          .from("deposits")
          .select("id,deal_id,user_id,status,amount,created_at,paid_at")
          .in("deal_id", dealIds)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .limit(50);

        const rows = depositRows ?? [];
        const paid = rows.filter((r) => r.status === "paid");
        const pending = rows.filter((r) => r.status === "pending");

        const totalRevenue = paid.reduce((s, r) => {
          const d = dealMap.get(r.deal_id);
          return s + (Number(r.amount) || (d ? priceOf(d) : 0));
        }, 0);

        // 6-month series
        const series = Array(6).fill(0);
        const now = new Date();
        const refMonth = now.getFullYear() * 12 + now.getMonth();
        paid.forEach((r) => {
          const t = new Date((r.paid_at ?? r.created_at) as string);
          const mIdx = 5 - (refMonth - (t.getFullYear() * 12 + t.getMonth()));
          if (mIdx >= 0 && mIdx < 6) {
            const d = dealMap.get(r.deal_id);
            series[mIdx] += Number(r.amount) || (d ? priceOf(d) : 0);
          }
        });

        // Customer names lookup
        const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
        let profileMap = new Map<string, string>();
        if (userIds.length > 0) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id,full_name")
            .in("id", userIds);
          profileMap = new Map((profs ?? []).map((p) => [p.id, p.full_name || "לקוח"]));
        }

        const txs: Tx[] = rows.slice(0, 25).map((r) => {
          const d = dealMap.get(r.deal_id);
          return {
            id: r.id,
            title: d?.title ?? "עסקה",
            amount: Number(r.amount) || (d ? priceOf(d) : 0),
            status: r.status,
            at: (r.paid_at ?? r.created_at) as string,
            customer: profileMap.get(r.user_id) ?? "לקוח",
          };
        });

        if (!cancelled) {
          setTransactions(txs);
          setMonthly(series);
          setTotals({ revenue: totalRevenue, redemptions: paid.length, pending: pending.length });
        }
      } catch (e) {
        console.error("[SupplierRevenue]", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const maxBar = useMemo(() => Math.max(...monthly, 1), [monthly]);
  const monthLabels = useMemo(() => {
    const labels: string[] = [];
    const months = ["ינו", "פבר", "מרץ", "אפר", "מאי", "יונ", "יול", "אוג", "ספט", "אוק", "נוב", "דצמ"];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(months[d.getMonth()]);
    }
    return labels;
  }, []);

  if (loading) {
    return (
      <MobileShell>
        <div className="min-h-[60vh] flex items-center justify-center bg-[#F7F8FA]">
          <LoadingState label="טוען נתוני הכנסות..." />
        </div>
        <BottomNav role="supplier" />
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <div className="min-h-screen bg-[#F7F8FA] pb-8" dir="rtl">
        <header className="px-5 pt-6 pb-5">
          <h1 className="text-[22px] font-bold text-[#0F172A] tracking-tight">הכנסות</h1>
          <p className="text-[13px] text-[#8E95A2] mt-1">סך הכנסות, מימושים ועסקאות</p>
        </header>

        {/* Hero revenue card */}
        <section className="px-5">
          <div className="rounded-3xl p-6 text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${GREEN} 0%, #1A8870 100%)` }}>
            <div className="flex items-center gap-2 text-white/80 text-[12px] font-medium">
              <Wallet className="h-3.5 w-3.5" /> סה״כ הכנסות
            </div>
            <div className="text-[34px] font-bold mt-2 tracking-tight leading-none">{shortILS(totals.revenue)}</div>
            <div className="text-[12px] text-white/70 mt-1">{formatILS(totals.revenue)}</div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="bg-white/10 rounded-2xl p-3">
                <div className="flex items-center gap-1.5 text-white/80 text-[11px]"><CheckCircle2 className="h-3 w-3" /> מימושים</div>
                <div className="text-[18px] font-bold mt-1">{totals.redemptions}</div>
              </div>
              <div className="bg-white/10 rounded-2xl p-3">
                <div className="flex items-center gap-1.5 text-white/80 text-[11px]"><Ticket className="h-3 w-3" /> ממתינים</div>
                <div className="text-[18px] font-bold mt-1">{totals.pending}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Monthly chart */}
        <section className="px-5 mt-6">
          <div className="bg-white rounded-3xl border border-[#EEF0F3] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-bold text-[#0F172A]">הכנסות חודשיות</h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8E95A2]">
                <TrendingUp className="h-3 w-3" /> 6 חודשים אחרונים
              </span>
            </div>
            <div className="flex items-end justify-between gap-2 h-[140px]">
              {monthly.map((v, i) => {
                const h = Math.max(4, (v / maxBar) * 120);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                    <div className="text-[10px] font-bold text-[#0F172A] leading-none">{v > 0 ? shortILS(v) : ""}</div>
                    <div
                      className="w-full rounded-t-xl"
                      style={{ height: h, background: `linear-gradient(180deg, ${GREEN} 0%, rgba(14,107,90,0.4) 100%)` }}
                    />
                    <div className="text-[10px] text-[#8E95A2] font-medium">{monthLabels[i]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Transactions */}
        <section className="px-5 mt-6">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigate("/supplier/redemptions")}
              className="text-[12px] font-semibold text-[#0E6B5A] flex items-center gap-0.5"
            >
              לכל המימושים <ChevronLeft className="h-3 w-3" />
            </button>
            <h2 className="text-[15px] font-bold text-[#0F172A]">עסקאות אחרונות</h2>
          </div>
          {transactions.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#EEF0F3] p-8 text-center shadow-sm">
              <div className="h-12 w-12 mx-auto rounded-2xl bg-[#F4F6F9] flex items-center justify-center mb-3">
                <Wallet className="h-5 w-5 text-[#8E95A2]" />
              </div>
              <div className="text-[14px] font-semibold text-[#0F172A]">עוד לא נכנסו עסקאות</div>
              <div className="text-[12px] text-[#8E95A2] mt-1">העסקאות הראשונות שלך יופיעו כאן</div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-[#EEF0F3] overflow-hidden shadow-sm">
              {transactions.map((t, i) => (
                <div key={t.id} className={`flex items-center gap-3 p-4 ${i < transactions.length - 1 ? "border-b border-[#F2F4F7]" : ""}`}>
                  <div className="text-left shrink-0">
                    <div className="font-bold text-[14px]" style={{ color: t.status === "paid" ? GREEN : "#B45309" }}>
                      {formatILS(t.amount)}
                    </div>
                    <div className="text-[10px] text-[#8E95A2] mt-0.5">{timeAgo(t.at)}</div>
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <div className="font-semibold text-[14px] text-[#0F172A] truncate">{t.title}</div>
                    <div className="text-[12px] text-[#8E95A2] truncate mt-0.5">{t.customer}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <BottomNav role="supplier" />
    </MobileShell>
  );
}
