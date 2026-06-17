import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, LogOut, Pencil, Clock, AlertCircle, ArrowLeft, MapPin, Users, TrendingDown,
  TrendingUp, Building2, Sparkles, ChevronLeft, Zap, Radar,
} from "lucide-react";
import { SupplierRatingBadge } from "@/components/reviews/SupplierRatingBadge";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
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
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="h-9 w-9 rounded-full border-2 border-[#0E6B5A] border-t-transparent animate-spin" />
        </div>
      </MobileShell>
    );
  }

  if (error) {
    return (
      <MobileShell>
        <div className="min-h-[60vh] flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <div className="h-12 w-12 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center mb-3">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="font-extrabold text-base mb-2 text-[#0F1B14]">שגיאה בטעינה</h2>
            <p className="text-[13px] text-[#5C6770] mb-5">{error}</p>
            <Button onClick={handleLogout} variant="outline" className="w-full rounded-2xl">חזרה למסך התחברות</Button>
          </div>
        </div>
      </MobileShell>
    );
  }

  const isPending = dbSupplier?.approval_status === "pending";
  const isRejected = dbSupplier?.approval_status === "rejected";
  const businessName = dbSupplier?.business_name || user?.name || "החשבון שלי";

  const TopBar = () => (
    <header className="px-5 pt-4 pb-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0E6B5A]">פעיל · אזור ספק</span>
        </div>
        <button
          onClick={handleLogout}
          className="h-8 w-8 rounded-full bg-white border border-[#E8EAE5] flex items-center justify-center text-[#5C6770] active:scale-95 transition"
          aria-label="יציאה"
        >
          <LogOut className="h-4 w-4" strokeWidth={2.2} />
        </button>
      </div>
      <div className="text-right">
        <div className="text-[12px] text-[#5C6770] font-semibold mb-0.5">שלום,</div>
        <h1 className="text-[26px] font-black text-[#0F1B14] leading-[1.05] tracking-[-0.02em] break-words">
          {businessName}
        </h1>
        {dbSupplier && !isPending && !isRejected && (
          <div className="mt-1.5"><SupplierRatingBadge supplierId={dbSupplier.id} className="text-[12px] text-[#0E6B5A]" /></div>
        )}
      </div>
    </header>
  );

  if (!dbSupplier || isPending || isRejected) {
    return (
      <MobileShell>
        <div className="min-h-screen bg-[#F7F5F0]">
          <TopBar />
          <div className="px-5 mt-5">
            <div className="bg-white rounded-[24px] p-6 border border-[#E8EAE5] text-center">
              <div className="h-14 w-14 mx-auto rounded-2xl bg-[#0E6B5A]/10 flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-[#0E6B5A]" strokeWidth={2.2} />
              </div>
              <h2 className="font-extrabold text-[#0F1B14] text-[17px] mb-2 tracking-tight">
                {isRejected ? "ההרשמה נדחתה" : "ממתין לאישור מנהל"}
              </h2>
              <p className="text-[13px] text-[#5C6770] leading-relaxed mb-5">
                {isRejected
                  ? "לצערנו ההרשמה לא אושרה. ניתן לפנות לתמיכה."
                  : "נעדכן אותך לאחר האישור ותוכל להתחיל לפרסם הצעות ולקבל לידים."}
              </p>
              <Button onClick={() => navigate("/supplier/profile/edit")} className="w-full h-11 rounded-2xl bg-[#0E6B5A] hover:bg-[#0a5648] text-white">
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
      <div className="min-h-screen bg-[#F7F5F0] w-full overflow-x-hidden">
        <TopBar />

        {/* KPI strip */}
        <div className="px-5 mt-3 grid grid-cols-4 gap-2">
          <Kpi label="הכנסה" value={formatILS(totals.revenue)} accent />
          <Kpi label="לידים" value={totals.totalLeads.toString()} />
          <Kpi label="המרה" value={`${totals.conversion}%`} />
          <Kpi label="פעילות" value={myDeals.length.toString()} />
        </div>

        {/* New projects in area */}
        <SectionHeader
          icon={<Building2 className="h-3.5 w-3.5" />}
          title="פרויקטים חדשים באזור שלך"
          subtitle="בניינים פעילים במפת השירות שהגדרת · רק האזור שלך"
          action={<button onClick={() => navigate("/supplier/offers/new")} className="text-[12px] font-bold text-[#0E6B5A]">צור הצעה <ChevronLeft className="h-3 w-3 inline" /></button>}
        />
        <div className="px-5 mt-2 -mr-1 pr-1 overflow-x-auto no-scrollbar">
          <div className="flex gap-2.5 pb-1 snap-x snap-mandatory">
            {DEMO_PROJECTS.map((p) => (
              <div key={p.id} className="snap-start min-w-[230px] bg-white rounded-2xl border border-[#E8EAE5] p-3.5">
                <div className="flex items-center gap-1.5 text-[11px] text-[#5C6770] mb-2">
                  <MapPin className="h-3 w-3 text-[#0E6B5A]" />
                  <span className="font-semibold">{p.city}</span>
                  <span className="text-[#C9CDC4]">·</span>
                  <span>{p.distance}</span>
                </div>
                <div className="font-extrabold text-[14px] text-[#0F1B14] tracking-tight leading-tight mb-1">{p.name}</div>
                <div className="text-[12px] text-[#5C6770] mb-3">{p.units} דירות · {p.category}</div>
                <button
                  onClick={() => navigate("/supplier/offers/new")}
                  className="w-full h-9 rounded-xl bg-[#0F1B14] text-white text-[12px] font-extrabold flex items-center justify-center gap-1 active:scale-95 transition"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.8} /> הצעה ייעודית
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Market — published offers in your area */}
        <SectionHeader
          icon={<Radar className="h-3.5 w-3.5" />}
          title="הצעות פעילות בשוק"
          subtitle="הצעות שמתפרסמות באזור שלך · השווה ועדכן את שלך"
        />
        <div className="px-5 mt-2 space-y-2">
          {DEMO_COMPETITORS.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-[#E8EAE5] p-3.5 flex items-center gap-3">
              <div className="flex-1 min-w-0 text-right">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="font-extrabold text-[13px] text-[#0F1B14] tracking-tight truncate">{c.name}</span>
                  {c.delta < 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#FEF2F0] text-[#C73E1D] text-[10px] font-bold">
                      <TrendingDown className="h-2.5 w-2.5" strokeWidth={3} /> {Math.abs(c.delta)}₪
                    </span>
                  )}
                </div>
                <div className="text-[11.5px] text-[#5C6770] truncate">{c.category}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[14px] font-black text-[#0F1B14] tracking-tight">{formatILS(c.price)}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#5C6770] font-bold">
                    <Users className="h-3 w-3" /> {c.joiners}
                  </span>
                </div>
              </div>
              <button
                onClick={() => navigate("/supplier/offers/new")}
                className="h-9 px-3 rounded-xl bg-[#0E6B5A]/8 text-[#0E6B5A] text-[11.5px] font-extrabold flex items-center gap-1 active:scale-95 transition border border-[#0E6B5A]/15"
              >
                <Zap className="h-3.5 w-3.5" strokeWidth={2.6} /> הורד 5%
              </button>
            </div>
          ))}
        </div>

        {/* My offers */}
        <SectionHeader
          icon={<Sparkles className="h-3.5 w-3.5" />}
          title="ההצעות שלי"
          action={
            <button onClick={() => navigate("/supplier/offers/new")} className="h-8 px-3 rounded-full bg-[#0F1B14] text-white text-[11.5px] font-extrabold flex items-center gap-1 active:scale-95 transition">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.8} /> חדשה
            </button>
          }
        />
        <div className="px-5 mt-2 space-y-2 pb-8">
          {myDeals.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-[#C9CDC4] p-6 text-center">
              <div className="text-[13px] text-[#5C6770] mb-3">עדיין לא יצרת הצעות</div>
              <Button onClick={() => navigate("/supplier/offers/new")} className="h-10 rounded-xl bg-[#0E6B5A] hover:bg-[#0a5648] text-white text-[13px] font-extrabold">
                <Plus className="h-4 w-4 ml-1.5" /> צור הצעה ראשונה
              </Button>
            </div>
          )}
          {myDeals.map((d) => {
            const c = counts[d.id] ?? { interests: 0, paid: 0 };
            const goal = 20; // visual goal — until min_buyers wired
            const progress = Math.min(100, Math.round((c.paid / goal) * 100));
            const active = d.status === "active" || d.status === "approved";
            return (
              <button
                key={d.id}
                onClick={() => navigate(`/supplier/offers/${d.id}/marketing`)}
                className="w-full bg-white rounded-2xl border border-[#E8EAE5] p-3.5 text-right active:scale-[0.99] transition"
              >
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[#10B981]" : "bg-[#C9CDC4]"}`} />
                      <span className="text-[10.5px] uppercase tracking-wider font-bold text-[#5C6770]">{active ? "פעיל" : d.status}</span>
                    </div>
                    <h3 className="font-extrabold text-[14px] text-[#0F1B14] tracking-tight truncate leading-tight">{d.title}</h3>
                  </div>
                  <div className="text-left shrink-0">
                    <div className="font-black text-[#0F1B14] text-[15px] tracking-tight">{formatILS(priceFor(d))}</div>
                    <div className="text-[11px] text-[#0E6B5A] font-extrabold mt-0.5">{c.paid} שילמו</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-1.5 rounded-full bg-[#EFEDE6] overflow-hidden">
                    <div className="h-full bg-[#0E6B5A] rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-[10.5px] font-extrabold text-[#5C6770]">{c.paid}/{goal}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#5C6770]">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 font-bold"><Users className="h-3 w-3" /> {c.interests}</span>
                    <span className="inline-flex items-center gap-1 font-bold"><TrendingUp className="h-3 w-3" /> {c.interests ? Math.round((c.paid / c.interests) * 100) : 0}%</span>
                  </div>
                  <ArrowLeft className="h-3.5 w-3.5 text-[#9CA39A]" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <BottomNav role="supplier" />
    </MobileShell>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl px-2 py-2.5 border ${accent ? "bg-[#0F1B14] border-[#0F1B14] text-white" : "bg-white border-[#E8EAE5] text-[#0F1B14]"}`}>
      <div className={`text-[9.5px] uppercase tracking-wider font-bold mb-0.5 ${accent ? "text-white/60" : "text-[#5C6770]"}`}>{label}</div>
      <div className="text-[13px] font-black tracking-tight leading-none truncate">{value}</div>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle, action }: { icon: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="px-5 mt-6 flex items-end justify-between gap-3">
      <div className="text-right">
        <div className="flex items-center gap-1.5 text-[#0E6B5A] mb-0.5">
          {icon}
          <h2 className="text-[15px] font-black text-[#0F1B14] tracking-tight">{title}</h2>
        </div>
        {subtitle && <div className="text-[11.5px] text-[#5C6770]">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}
