import { useEffect, useState } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { formatILS, useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Building2, Users, Tag, DollarSign, ShieldCheck, type LucideIcon } from "lucide-react";

type DealRow = { id: string; category_id: string | null; original_price: number | null; discounted_price: number | null; discount_percentage: number | null; base_price: number | null; offer_type: string | null };

export default function AdminStats() {
  const { projects, categories } = useApp();
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [paidDepositsByDeal, setPaidByDeal] = useState<Record<string, number>>({});
  const [counts, setCounts] = useState({ suppliers: 0, approvedSuppliers: 0, deposits: 0 });

  useEffect(() => {
    (async () => {
      const [dealsRes, supRes, supApprovedRes, depRes, depPaidRes] = await Promise.all([
        supabase.from("deals").select("id,category_id,original_price,discounted_price,discount_percentage,base_price,offer_type").eq("is_deleted", false),
        supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("is_deleted", false),
        supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("is_deleted", false).in("approval_status", ["approved", "active"]),
        supabase.from("deposits").select("id", { count: "exact", head: true }).eq("is_deleted", false).in("status", ["pending", "paid"]),
        supabase.from("deposits").select("deal_id,gross_deposit_amount,net_deposit_amount").eq("status", "paid").eq("is_deleted", false),
      ]);

      setDeals((dealsRes.data ?? []) as DealRow[]);
      setCounts({
        suppliers: supRes.count ?? 0,
        approvedSuppliers: supApprovedRes.count ?? 0,
        deposits: depRes.count ?? 0,
      });
      const m: Record<string, number> = {};
      (depPaidRes.data ?? []).forEach((d: { deal_id: string; gross_deposit_amount: number | null; net_deposit_amount: number | null }) => {
        m[d.deal_id] = (m[d.deal_id] ?? 0) + 1;
      });
      setPaidByDeal(m);
    })();
  }, []);

  const priceFor = (d: DealRow): number => {
    if (d.offer_type === "price_comparison" && d.discounted_price != null) return Number(d.discounted_price);
    if (d.offer_type === "percentage" && d.original_price != null && d.discount_percentage != null) {
      return Number(d.original_price) * (1 - Number(d.discount_percentage) / 100);
    }
    return Number(d.base_price ?? d.original_price ?? 0);
  };

  const revenue = deals.reduce((s, d) => s + (paidDepositsByDeal[d.id] ?? 0) * priceFor(d), 0);
  const totalApartments = projects.reduce((s, p) => s + p.apartmentCount, 0);
  const avgDealSize = deals.length ? Math.round(deals.reduce((s, d) => s + priceFor(d), 0) / deals.length) : 0;
  const totalSavings = deals.reduce((s, d) => s + ((Number(d.original_price ?? 0) - priceFor(d)) * (paidDepositsByDeal[d.id] ?? 0)), 0);

  const catStats = categories.map((c) => ({
    ...c,
    count: deals.filter((d) => d.category_id === c.id).length,
    revenue: deals.filter((d) => d.category_id === c.id).reduce((s, d) => s + (paidDepositsByDeal[d.id] ?? 0) * priceFor(d), 0),
  })).sort((a, b) => b.count - a.count).slice(0, 6);
  const maxCount = Math.max(1, ...catStats.map((c) => c.count));

  return (
    <MobileShell>
      <PageHeader title="סטטיסטיקות מערכת" subtitle="מבט-על על ביצועי הפלטפורמה" back={false} />

      <div className="px-5 mb-4">
        <div className="rounded-[20px] bg-white p-5 border border-[#ECEEF2] shadow-[0_8px_20px_-10px_rgba(10,31,61,0.18),0_2px_4px_-2px_rgba(10,31,61,0.05)]">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">הכנסה מוערכת</div>
              <div className="text-[26px] font-extrabold text-[#0A1F3D] mt-1 tracking-tight leading-none">
                {formatILS(revenue)}
              </div>
            </div>
            <div className="h-11 w-11 rounded-[12px] bg-[#FFF8E1] flex items-center justify-center shrink-0">
              <TrendingUp className="h-[18px] w-[18px] text-[#D4AF37]" strokeWidth={2.2} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[#ECEEF2]">
            <div>
              <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">חיסכון לדיירים</div>
              <div className="font-extrabold text-[#0A1F3D] mt-1 text-[15px]">{formatILS(totalSavings)}</div>
            </div>
            <div>
              <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">שווי עסקה ממוצע</div>
              <div className="font-extrabold text-[#0A1F3D] mt-1 text-[15px]">{formatILS(avgDealSize)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 grid grid-cols-2 gap-2.5 mb-5">
        <Mini icon={Building2} label="פרויקטים" value={projects.length} />
        <Mini icon={Users} label="ספקים מאושרים" value={counts.approvedSuppliers} />
        <Mini icon={Tag} label="עסקאות" value={deals.length} />
        <Mini icon={DollarSign} label="פיקדונות" value={counts.deposits} />
        <Mini icon={ShieldCheck} label="ספקים סה״כ" value={counts.suppliers} />
        <Mini icon={Building2} label="דירות בפרויקטים" value={totalApartments} />
      </div>

      <section className="px-5 mb-5">
        <h2 className="text-[12px] font-extrabold text-[#0A1F3D] tracking-tight mb-2.5 px-1">קטגוריות מובילות</h2>
        <div className="rounded-[20px] bg-white p-4 border border-[#ECEEF2] shadow-[0_8px_20px_-10px_rgba(10,31,61,0.18),0_2px_4px_-2px_rgba(10,31,61,0.05)] space-y-3">
          {catStats.map((c) => (
            <div key={c.id}>
              <div className="flex items-center justify-between text-[12px] mb-1.5">
                <span className="font-extrabold text-[#0A1F3D] flex items-center gap-1.5">
                  <span className="text-base">{c.icon}</span>
                  {c.name}
                </span>
                <span className="text-[#6B7280] font-medium">{c.count} · {formatILS(c.revenue)}</span>
              </div>
              <div className="h-2 rounded-full bg-[#F4F6FA] overflow-hidden">
                <div className="h-full bg-[#D4AF37]" style={{ width: `${(c.count / maxCount) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <BottomNav role="admin" />
    </MobileShell>
  );
}

function Mini({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="bg-white rounded-[16px] p-4 border border-[#ECEEF2] shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)]">
      <div className="h-9 w-9 rounded-[10px] bg-[#FFF8E1] flex items-center justify-center mb-2.5">
        <Icon className="h-[16px] w-[16px] text-[#D4AF37]" strokeWidth={2.2} />
      </div>
      <div className="text-[20px] font-extrabold text-[#0A1F3D] leading-none tracking-tight">{value.toLocaleString("he-IL")}</div>
      <div className="text-[12px] text-[#6B7280] mt-1.5 font-medium">{label}</div>
    </div>
  );
}

