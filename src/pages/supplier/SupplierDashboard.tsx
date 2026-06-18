import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, LogOut, Pencil, Clock, MapPin, Users,
  TrendingUp, Zap, Radar,
} from "lucide-react";
import { SupplierRatingBadge } from "@/components/reviews/SupplierRatingBadge";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { LoadingState, ErrorState } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { formatILS, useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getFriendlyLoadError } from "@/lib/safeAsync";
import { resolveSupplierForUser } from "@/lib/supplierAuth";

type DbSupplier = {
  id: string;
  business_name: string;
  approval_status: string;
  is_active: boolean;
  user_id?: string | null;
  email?: string | null;
};

type DbDeal = {
  id: string;
  title: string;
  status: string;
  original_price: number | null;
  discounted_price: number | null;
  discount_percentage: number | null;
  base_price: number | null;
  offer_type: string | null;
};

type AreaProject = {
  id: string;
  name: string;
  city: string;
  units: number;
  stage: string | null;
};

const DEMO_COMPETITORS = [
  { id: "c1", name: "התקנת מזגן 2.5 כ״ס · רמת גן", category: "מיזוג אוויר · ספק אחר", price: 2390, joiners: 47, delta: -120 },
  { id: "c2", name: "שירות שנתי + ניקוי 4 מזגנים", category: "תחזוקה · ספק אחר", price: 690, joiners: 31, delta: 0 },
  { id: "c3", name: "החלפת דוד שמש 150 ליטר", category: "אינסטלציה · ספק אחר", price: 2890, joiners: 22, delta: -40 },
];


export default function SupplierDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbSupplier, setDbSupplier] = useState<DbSupplier | null>(null);
  const [myDeals, setMyDeals] = useState<DbDeal[]>([]);
  const [counts, setCounts] = useState<Record<string, { interests: number; paid: number }>>({});
  const [areaProjects, setAreaProjects] = useState<AreaProject[]>([]);
  const [areaSet, setAreaSet] = useState(false);
  

  useEffect(() => {
    let cancelled = false;
    const safety = window.setTimeout(() => { if (!cancelled) setLoading(false); }, 8000);

    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        if (!session) {
          if (!cancelled) { setLoading(false); navigate("/auth", { replace: true }); }
          return;
        }
        const email = session.user.email ?? "";
        let supplierRow = await resolveSupplierForUser<DbSupplier>(
          session.user.id, email,
          "id, business_name, approval_status, is_active, user_id, email",
        );
        if (!supplierRow) {
          const meta = (session.user.user_metadata ?? {}) as Record<string, string>;
          const businessName = meta.business_name?.trim() || meta.full_name?.trim() || session.user.email || "ספק חדש";
          const { data: created, error: insertErr } = await supabase
            .from("suppliers")
            .insert({
              user_id: session.user.id,
              business_name: businessName,
              contact_name: meta.full_name ?? null,
              email: session.user.email ?? null,
              phone: meta.phone ?? null,
              approval_status: "pending",
              is_active: true,
            })
            .select("id, business_name, approval_status, is_active, user_id, email")
            .maybeSingle();
          if (insertErr) throw insertErr;
          supplierRow = created as DbSupplier;
        }
        if (cancelled) return;
        setDbSupplier(supplierRow);

        if (supplierRow?.id && (supplierRow.approval_status === "approved" || supplierRow.approval_status === "active")) {
          const { data: dealRows, error: dealsErr } = await supabase
            .from("deals")
            .select("id,title,status,original_price,discounted_price,discount_percentage,base_price,offer_type")
            .eq("supplier_id", supplierRow.id)
            .eq("is_deleted", false)
            .order("created_at", { ascending: false });
          if (dealsErr) throw dealsErr;
          const list = (dealRows ?? []) as DbDeal[];
          if (cancelled) return;
          setMyDeals(list);

          const cMap: Record<string, { interests: number; paid: number }> = {};
          await Promise.all(list.map(async (d) => {
            const [{ count: interests }, { count: paid }] = await Promise.all([
              supabase.from("deal_interests").select("id", { count: "exact", head: true }).eq("deal_id", d.id).eq("is_deleted", false),
              supabase.from("deposits").select("id", { count: "exact", head: true }).eq("deal_id", d.id).eq("status", "paid").eq("is_deleted", false),
            ]);
            cMap[d.id] = { interests: interests ?? 0, paid: paid ?? 0 };
          }));
          if (!cancelled) setCounts(cMap);

          // Load supplier work-area cities, then projects in those cities only
          const { data: scRows } = await supabase
            .from("supplier_cities")
            .select("city_id")
            .eq("supplier_id", supplierRow.id);
          const cityIds = (scRows ?? []).map((r: { city_id: string }) => r.city_id);
          if (!cancelled) setAreaSet(cityIds.length > 0);
          if (cityIds.length > 0) {
            const { data: cityRows } = await supabase
              .from("cities")
              .select("name_he")
              .in("id", cityIds);
            const cityNames = (cityRows ?? []).map((c: { name_he: string }) => c.name_he);
            if (cityNames.length > 0) {
              const { data: projRows } = await supabase
                .from("projects")
                .select("id,name,city,apartment_count,building_count,current_stage")
                .in("city", cityNames)
                .eq("is_active", true)
                .eq("is_deleted", false)
                .order("created_at", { ascending: false })
                .limit(12);
              if (!cancelled) {
                setAreaProjects((projRows ?? []).map((p: { id: string; name: string; city: string; apartment_count: number | null; building_count: number | null; current_stage: string | null }) => ({
                  id: p.id, name: p.name, city: p.city,
                  units: (p.apartment_count ?? 0) || (p.building_count ?? 0),
                  stage: p.current_stage,
                })));
              }
            }
          }
        }
      } catch (e) {
        console.error("[SupplierDashboard] load error", e);
        if (!cancelled) setError(getFriendlyLoadError(e, "שגיאה בטעינת פרופיל הספק"));
      } finally {
        if (!cancelled) setLoading(false);
        window.clearTimeout(safety);
      }
    })();

    return () => { cancelled = true; window.clearTimeout(safety); };
  }, [navigate]);

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch (e) { console.warn(e); }
    logout();
    toast.success("התנתקת בהצלחה");
    navigate("/", { replace: true });
  };

  const priceFor = (d: DbDeal): number => {
    if (d.offer_type === "price_comparison" && d.discounted_price != null) return Number(d.discounted_price);
    if (d.offer_type === "percentage" && d.original_price != null && d.discount_percentage != null) {
      return Number(d.original_price) * (1 - Number(d.discount_percentage) / 100);
    }
    return Number(d.base_price ?? d.original_price ?? 0);
  };

  const totals = useMemo(() => {
    const totalLeads = Object.values(counts).reduce((s, c) => s + c.interests, 0);
    const totalPaid = Object.values(counts).reduce((s, c) => s + c.paid, 0);
    const revenue = myDeals.reduce((s, d) => s + (counts[d.id]?.paid ?? 0) * priceFor(d), 0);
    const conversion = totalLeads ? Math.round((totalPaid / totalLeads) * 100) : 0;
    return { totalLeads, totalPaid, revenue, conversion };
  }, [counts, myDeals]);

  if (loading) {
    return (
      <MobileShell>
        <div className="min-h-[60vh] flex items-center justify-center bg-[#F2F2F7]">
          <LoadingState label="טוען את המסך שלך..." />
        </div>
      </MobileShell>
    );
  }

  if (error) {
    return (
      <MobileShell>
        <div className="min-h-[60vh] flex items-center justify-center bg-[#F2F2F7]">
          <ErrorState
            title="שגיאה בטעינה"
            description={error}
            onRetry={handleLogout}
            retryLabel="חזרה למסך התחברות"
          />
        </div>
      </MobileShell>
    );
  }

  const isPending = dbSupplier?.approval_status === "pending";
  const isRejected = dbSupplier?.approval_status === "rejected";
  const businessName = dbSupplier?.business_name || user?.name || "החשבון שלי";

  const TopBar = () => (
    <header className="px-5 pt-5 pb-1">
      <div className="flex items-start justify-between">
        <div className="text-right flex-1 min-w-0">
          <div className="text-[13px] text-[#8E8E93] font-medium mb-0.5">שלום,</div>
          <h1 className="text-[28px] font-bold text-[#1C1C1E] leading-[1.1] tracking-[-0.03em] break-words">
            {businessName}
          </h1>
          {dbSupplier && !isPending && !isRejected && (
            <div className="mt-1.5"><SupplierRatingBadge supplierId={dbSupplier.id} className="text-[12px] text-[#0E6B5A]" /></div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="shrink-0 h-10 w-10 rounded-full bg-white border border-[#E5E5EA] flex items-center justify-center text-[#8E8E93] active:scale-95 transition shadow-sm"
          aria-label="יציאה"
        >
          <LogOut className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </header>
  );

  if (!dbSupplier || isPending || isRejected) {
    return (
      <MobileShell>
        <div className="min-h-screen bg-[#F2F2F7]">
          <TopBar />
          <div className="px-5 mt-6">
            <div className="bg-white rounded-3xl p-7 border border-[#E5E5EA] shadow-sm text-center">
              <div className="h-14 w-14 mx-auto rounded-2xl bg-[#0E6B5A]/10 flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-[#0E6B5A]" strokeWidth={2} />
              </div>
              <h2 className="font-semibold text-[#1C1C1E] text-[18px] mb-2 tracking-tight">
                {isRejected ? "ההרשמה נדחתה" : "ממתין לאישור מנהל"}
              </h2>
              <p className="text-[14px] text-[#8E8E93] leading-relaxed mb-5">
                {isRejected
                  ? "לצערנו ההרשמה לא אושרה. ניתן לפנות לתמיכה."
                  : "נעדכן אותך לאחר האישור ותוכל להתחיל לפרסם הצעות ולקבל לידים."}
              </p>
              <Button onClick={() => navigate("/supplier/profile/edit")} className="w-full h-12 rounded-2xl bg-[#1C1C1E] hover:bg-black text-white font-semibold">
                <Pencil className="h-4 w-4 ml-2" /> השלמת פרטי הספק
              </Button>
            </div>
          </div>
          <BottomNav role="supplier" />
        </div>
      </MobileShell>
    );
  }


  return (
    <MobileShell>
      <div className="min-h-screen bg-[#F2F2F7] w-full overflow-x-hidden pb-8">
        <TopBar />

        {/* KPI strip — 2x2 Apple-style tiles */}
        <section className="px-5 mt-6 grid grid-cols-2 gap-3">
          <Kpi label="הכנסה החודש" value={formatILS(totals.revenue)} highlight />
          <Kpi label="פרויקטים פעילים" value={myDeals.length.toString()} accent />
          <Kpi label="לידים" value={totals.totalLeads.toString()} />
          <Kpi label="המרה" value={`${totals.conversion}%`} />
        </section>

        {/* New projects in area */}
        <SectionHeader
          title="פרויקטים באזורך"
          subtitle={areaSet ? "בערים שהגדרת בלבד" : undefined}
          action={<button onClick={() => navigate("/supplier/profile/edit")} className="text-[14px] font-medium text-[#0E6B5A]">{areaSet ? "ערוך אזור" : "הגדר אזור"}</button>}
        />
        {!areaSet ? (
          <div className="px-5 mt-3">
            <div className="bg-white rounded-3xl border border-[#E5E5EA] shadow-sm p-6 text-center">
              <div className="h-12 w-12 mx-auto rounded-2xl bg-[#0E6B5A]/10 flex items-center justify-center mb-3">
                <MapPin className="h-5 w-5 text-[#0E6B5A]" strokeWidth={2} />
              </div>
              <div className="text-[15px] font-semibold text-[#1C1C1E] mb-1 tracking-tight">לא הוגדר אזור עבודה</div>
              <div className="text-[13px] text-[#8E8E93] leading-relaxed mb-4">בחר את הערים שבהן אתה נותן שירות כדי שנציג רק פרויקטים רלוונטיים.</div>
              <Button onClick={() => navigate("/supplier/profile/edit")} className="h-11 px-5 rounded-full bg-[#1C1C1E] hover:bg-black text-white text-[14px] font-semibold">
                הגדר אזור שירות
              </Button>
            </div>
          </div>
        ) : areaProjects.length === 0 ? (
          <div className="px-5 mt-3">
            <div className="bg-white rounded-3xl border border-[#E5E5EA] shadow-sm p-6 text-center text-[13px] text-[#8E8E93]">
              אין כרגע פרויקטים פעילים באזור שלך. נעדכן אותך ברגע שיתפרסמו.
            </div>
          </div>
        ) : (
          <div className="px-5 mt-3 -mr-1 pr-1 overflow-x-auto no-scrollbar">
            <div className="flex gap-3 pb-1 snap-x snap-mandatory">
              {areaProjects.map((p) => (
                <div key={p.id} className="snap-start min-w-[260px] bg-white rounded-3xl border border-[#E5E5EA] shadow-sm p-5">
                  <div className="flex items-start justify-between mb-3">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#0E6B5A]/10 text-[#0E6B5A] text-[10px] font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#0E6B5A]" /> חדש
                    </span>
                    {p.stage && <span className="text-[#8E8E93] text-[11px] font-medium">{p.stage}</span>}
                  </div>
                  <h3 className="font-semibold text-[17px] text-[#1C1C1E] tracking-tight leading-tight mb-1">{p.name}</h3>
                  <p className="text-[#8E8E93] text-[13px] mb-4 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {p.city}{p.units ? ` · ${p.units} יחידות` : ""}
                  </p>
                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => navigate("/supplier/offers/new")}
                      className="bg-[#1C1C1E] text-white px-4 py-2 rounded-full text-[12px] font-semibold active:scale-95 transition"
                    >
                      צור הצעה
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Market — published offers in your area */}
        <SectionHeader
          title="הצעות שוק פעילות"
          subtitle="השווה ועדכן את שלך"
          action={<button className="text-[14px] font-medium text-[#0E6B5A]">הצג הכל</button>}
        />
        <div className="px-5 mt-3 space-y-3">
          {DEMO_COMPETITORS.map((c) => (
            <div key={c.id} className="bg-white rounded-3xl border border-[#E5E5EA] shadow-sm p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-[#F2F2F7] rounded-2xl flex items-center justify-center shrink-0">
                <Radar className="w-5 h-5 text-[#1C1C1E]" strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0 text-right">
                <h4 className="font-semibold text-[15px] text-[#1C1C1E] tracking-tight truncate">{c.name}</h4>
                <p className="text-[#8E8E93] text-[12px] truncate">{c.category}</p>
              </div>
              <div className="text-left shrink-0">
                <p className="font-semibold text-[15px] text-[#1C1C1E] tracking-tight">{formatILS(c.price)}</p>
                <button
                  onClick={() => navigate("/supplier/offers/new")}
                  className="mt-1 inline-flex items-center gap-1 text-[#0E6B5A] text-[11px] font-semibold active:opacity-70"
                >
                  <Zap className="h-3 w-3" strokeWidth={2.4} /> הורד 5%
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* My offers */}
        <SectionHeader
          title="ההצעות שלי"
          action={
            <button onClick={() => navigate("/supplier/offers/new")} className="inline-flex items-center gap-1 h-9 px-4 rounded-full bg-[#1C1C1E] text-white text-[12px] font-semibold active:scale-95 transition">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} /> חדשה
            </button>
          }
        />
        <div className="px-5 mt-3">
          {myDeals.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#E5E5EA] shadow-sm p-7 text-center">
              <div className="text-[14px] text-[#8E8E93] mb-4">עדיין לא יצרת הצעות</div>
              <Button onClick={() => navigate("/supplier/offers/new")} className="h-11 px-5 rounded-full bg-[#1C1C1E] hover:bg-black text-white text-[14px] font-semibold">
                <Plus className="h-4 w-4 ml-1.5" /> צור הצעה ראשונה
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-[#E5E5EA] shadow-sm overflow-hidden">
              {myDeals.map((d, i) => {
                const c = counts[d.id] ?? { interests: 0, paid: 0 };
                const goal = 20;
                const progress = Math.min(100, Math.round((c.paid / goal) * 100));
                const active = d.status === "active" || d.status === "approved";
                return (
                  <button
                    key={d.id}
                    onClick={() => navigate(`/supplier/offers/${d.id}/marketing`)}
                    className={`w-full p-4 text-right active:bg-[#F2F2F7] transition ${i < myDeals.length - 1 ? "border-b border-[#F2F2F7]" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[15px] text-[#1C1C1E] tracking-tight truncate leading-tight mb-1">{d.title}</h3>
                        <div className="flex items-center gap-2 text-[12px] text-[#8E8E93]">
                          <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {c.interests}</span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {c.interests ? Math.round((c.paid / c.interests) * 100) : 0}%</span>
                        </div>
                      </div>
                      <div className="text-left shrink-0">
                        <div className="font-semibold text-[15px] text-[#1C1C1E] tracking-tight">{formatILS(priceFor(d))}</div>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${active ? "bg-[#0E6B5A]/10 text-[#0E6B5A]" : "bg-[#F2F2F7] text-[#8E8E93]"}`}>
                          {active ? "פעיל" : d.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full bg-[#F2F2F7] overflow-hidden">
                        <div className="h-full bg-[#0E6B5A] rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-[11px] font-medium text-[#8E8E93]">{c.paid}/{goal}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <BottomNav role="supplier" />
    </MobileShell>
  );
}

function Kpi({ label, value, accent, highlight }: { label: string; value: string; accent?: boolean; highlight?: boolean }) {
  const base = "rounded-2xl p-4 border shadow-sm";
  if (highlight) {
    return (
      <div className={`${base} bg-[#1C1C1E] border-[#1C1C1E]`}>
        <div className="text-[11px] font-medium text-white/60 mb-1">{label}</div>
        <div className="text-[20px] font-bold text-white tracking-tight leading-none truncate">{value}</div>
      </div>
    );
  }
  return (
    <div className={`${base} bg-white border-[#E5E5EA]`}>
      <div className="text-[11px] font-medium text-[#8E8E93] mb-1">{label}</div>
      <div className={`text-[20px] font-bold tracking-tight leading-none truncate ${accent ? "text-[#0E6B5A]" : "text-[#1C1C1E]"}`}>{value}</div>
    </div>
  );
}

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="px-5 mt-8 flex items-end justify-between gap-3">
      <div className="text-right">
        <h2 className="text-[22px] font-bold text-[#1C1C1E] tracking-[-0.02em] leading-tight">{title}</h2>
        {subtitle && <div className="text-[13px] text-[#8E8E93] mt-0.5">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}
