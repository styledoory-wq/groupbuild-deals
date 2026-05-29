import { useEffect, useState } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { formatILS, useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Building2, Users, Tag, DollarSign, ShieldCheck } from "lucide-react";

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
        supabase.from("deposits").select("deal_id,amount").eq("status", "paid").eq("is_deleted", false),
      ]);

      setDeals((dealsRes.data ?? []) as DealRow[]);
      setCounts({
        suppliers: supRes.count ?? 0,
        approvedSuppliers: supApprovedRes.count ?? 0,
        deposits: depRes.count ?? 0,
      });
      const m: Record<string, number> = {};
      (depPaidRes.data ?? []).forEach((d: { deal_id: string; amount: number | null }) => {
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

      <div className="px-5 -mt-4 relative z-10 mb-5">
        <div className="gb-card p-5 bg-gradient-hero text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-fs-xs text-primary-foreground/60">הכנסה מוערכת</div>
              <div className="text-3xl font-extrabold gb-gold-text mt-1">{formatILS(revenue)}</div>
            </div>
            <TrendingUp className="h-10 w-10 text-gold" />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10 text-sm">
            <div>
              <div className="text-fs-xs text-primary-foreground/60">חיסכון לדיירים</div>
              <div className="font-bold gb-gold-text">{formatILS(totalSavings)}</div>
            </div>
            <div>
              <div className="text-fs-xs text-primary-foreground/60">שווי עסקה ממוצע</div>
              <div className="font-bold">{formatILS(avgDealSize)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 grid grid-cols-2 gap-3 mb-5">
        <Mini icon={Building2} label="פרויקטים" value={projects.length} />
        <Mini icon={Users} label="ספקים מאושרים" value={counts.approvedSuppliers} />
        <Mini icon={Tag} label="עסקאות" value={deals.length} />
        <Mini icon={DollarSign} label="פיקדונות" value={counts.deposits} />
        <Mini icon={ShieldCheck} label="ספקים סה״כ" value={counts.suppliers} />
        <Mini icon={Building2} label="דירות בפרויקטים" value={totalApartments} />
      </div>

      <section className="px-5 mb-5">
        <h2 className="text-sm font-bold mb-3">קטגוריות מובילות</h2>
        <div className="gb-card p-4 space-y-3">
          {catStats.map((c) => (
            <div key={c.id}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold flex items-center gap-1.5">
                  <span className="text-base">{c.icon}</span>
                  {c.name}
                </span>
                <span className="text-muted-foreground">{c.count} עסקאות · {formatILS(c.revenue)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-gold" style={{ width: `${(c.count / maxCount) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <BottomNav role="admin" />
    </MobileShell>
  );
}

function Mini({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="gb-card p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-8 w-8 rounded-lg bg-primary/5 text-primary flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="text-xl font-extrabold text-primary">{value.toLocaleString("he-IL")}</div>
      <div className="text-fs-xs text-muted-foreground">{label}</div>
    </div>
  );
}
