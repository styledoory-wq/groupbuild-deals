import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, LogOut, Pencil, Clock, MapPin, Users, Eye, Heart,
  TrendingUp, Bell, Wallet, Target, Flame, Building2, Tag,
  ChevronLeft, Activity, Sparkles,
} from "lucide-react";
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
  target_participants: number | null;
};

type AreaProject = {
  id: string;
  name: string;
  city: string;
  units: number;
  stage: string | null;
};

type ActivityItem = {
  id: string;
  type: "lead" | "favorite" | "view";
  title: string;
  subtitle: string;
  at: string;
};

const BG = "#F7F8FA";
const GREEN = "#0E6B5A";

export default function SupplierDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbSupplier, setDbSupplier] = useState<DbSupplier | null>(null);
  const [myDeals, setMyDeals] = useState<DbDeal[]>([]);
  const [counts, setCounts] = useState<Record<string, { interests: number; paid: number; favorites: number }>>({});
  const [areaProjects, setAreaProjects] = useState<AreaProject[]>([]);
  const [areaSet, setAreaSet] = useState(false);
  const [leadsToday, setLeadsToday] = useState(0);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

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
            .select("id,title,status,original_price,discounted_price,discount_percentage,base_price,offer_type,target_participants,image_url")
            .eq("supplier_id", supplierRow.id)
            .eq("is_deleted", false)
            .order("created_at", { ascending: false });
          if (dealsErr) throw dealsErr;
          const list = (dealRows ?? []) as DbDeal[];
          if (cancelled) return;
          setMyDeals(list);

          const dealIds = list.map(d => d.id);

          const cMap: Record<string, { interests: number; paid: number; favorites: number }> = {};
          await Promise.all(list.map(async (d) => {
            const [{ count: interests }, { count: paid }, { count: favorites }] = await Promise.all([
              supabase.from("deal_interests").select("id", { count: "exact", head: true }).eq("deal_id", d.id).eq("is_deleted", false).eq("is_demo", false),
              supabase.from("deposits").select("id", { count: "exact", head: true }).eq("deal_id", d.id).eq("status", "paid").eq("is_deleted", false),
              supabase.from("favorites").select("id", { count: "exact", head: true }).eq("deal_id", d.id),
            ]);
            cMap[d.id] = { interests: interests ?? 0, paid: paid ?? 0, favorites: favorites ?? 0 };
          }));
          if (!cancelled) setCounts(cMap);

          // Leads today
          if (dealIds.length > 0) {
            const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
            const { count: todayCount } = await supabase
              .from("deal_interests")
              .select("id", { count: "exact", head: true })
              .in("deal_id", dealIds)
              .eq("is_deleted", false)
              .eq("is_demo", false)
              .gte("created_at", startOfDay.toISOString());
            if (!cancelled) setLeadsToday(todayCount ?? 0);

            // Recent activity: latest interests + favorites
            const [{ data: recentLeads }, { data: recentFavs }] = await Promise.all([
              supabase.from("deal_interests")
                .select("id, created_at, deal_id")
                .in("deal_id", dealIds).eq("is_deleted", false).eq("is_demo", false)
                .order("created_at", { ascending: false }).limit(5),
              supabase.from("favorites")
                .select("id, created_at, deal_id")
                .in("deal_id", dealIds)
                .order("created_at", { ascending: false }).limit(5),
            ]);
            const titleMap = new Map(list.map(d => [d.id, d.title]));
            const items: ActivityItem[] = [];
            (recentLeads ?? []).forEach((r) => items.push({
              id: `l-${r.id}`, type: "lead",
              title: "ליד חדש נכנס", subtitle: titleMap.get(r.deal_id) ?? "הצעה", at: r.created_at as string,
            }));
            (recentFavs ?? []).forEach((r) => items.push({
              id: `f-${r.id}`, type: "favorite",
              title: "משתמש שמר הצעה", subtitle: titleMap.get(r.deal_id) ?? "הצעה", at: r.created_at as string,
            }));
            items.sort((a,b) => +new Date(b.at) - +new Date(a.at));
            if (!cancelled) setActivity(items.slice(0, 6));
          }

          // Area projects
          const { data: scRows } = await supabase
            .from("supplier_cities").select("city_id").eq("supplier_id", supplierRow.id);
          const cityIds = (scRows ?? []).map((r: { city_id: string }) => r.city_id);
          if (!cancelled) setAreaSet(cityIds.length > 0);
          if (cityIds.length > 0) {
            const { data: cityRows } = await supabase.from("cities").select("name_he").in("id", cityIds);
            const cityNames = (cityRows ?? []).map((c: { name_he: string }) => c.name_he);
            if (cityNames.length > 0) {
              const { data: projRows } = await supabase
                .from("projects")
                .select("id,name,city,apartment_count,building_count,current_stage")
                .in("city", cityNames).eq("is_active", true).eq("is_deleted", false)
                .order("created_at", { ascending: false }).limit(12);
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
    const totalFavs = Object.values(counts).reduce((s, c) => s + c.favorites, 0);
    // Views proxy: interests + favorites * 3 (until real view tracking exists)
    const views = totalLeads + totalFavs * 2;
    // Revenue potential: target_participants * price
    const revenuePotential = myDeals.reduce((s, d) => {
      const tgt = Number(d.target_participants ?? 0) || 10;
      return s + tgt * priceFor(d);
    }, 0);
    const conversion = totalLeads ? Math.round((totalPaid / totalLeads) * 100) : 0;
    return { totalLeads, totalPaid, totalFavs, views, revenuePotential, conversion };
  }, [counts, myDeals]);

  const topDeal = useMemo(() => {
    if (!myDeals.length) return null;
    return [...myDeals].sort((a, b) => {
      const ca = counts[a.id] ?? { interests: 0, favorites: 0, paid: 0 };
      const cb = counts[b.id] ?? { interests: 0, favorites: 0, paid: 0 };
      return (cb.interests + cb.favorites + cb.paid * 3) - (ca.interests + ca.favorites + ca.paid * 3);
    })[0];
  }, [myDeals, counts]);

  const tasks = useMemo(() => {
    const list: { id: string; icon: typeof Users; iconBg: string; iconColor: string; title: string; subtitle: string; to: string }[] = [];
    const unanswered = totals.totalLeads - totals.totalPaid;
    if (unanswered > 0) list.push({
      id: "leads", icon: Users, iconBg: "#E8F5F1", iconColor: GREEN,
      title: `${unanswered} לידים שמחכים לטיפול`,
      subtitle: "ענה עכשיו והגדל את הסיכוי לסגירה",
      to: "/supplier/leads",
    });
    if (areaProjects.length > 0) list.push({
      id: "proj", icon: Building2, iconBg: "#FEF1E6", iconColor: "#D97706",
      title: `${areaProjects.length} פרויקטים חדשים באזורך`,
      subtitle: areaProjects[0] ? `${areaProjects[0].name} · ${areaProjects[0].city}` : "",
      to: "/supplier/offers/new",
    });
    if (myDeals.length === 0) list.push({
      id: "first", icon: Tag, iconBg: "#F3EAFB", iconColor: "#7C3AED",
      title: "צור את ההצעה הראשונה שלך",
      subtitle: "ספקים שמפרסמים הצעה מקבלים פי 4 לידים",
      to: "/supplier/offers/new",
    });
    return list;
  }, [totals, areaProjects, myDeals]);

  if (loading) {
    return (
      <MobileShell>
        <div className="min-h-[60vh] flex items-center justify-center" style={{ background: BG }}>
          <LoadingState label="טוען את המסך שלך..." />
        </div>
      </MobileShell>
    );
  }

  if (error) {
    return (
      <MobileShell>
        <div className="min-h-[60vh] flex items-center justify-center" style={{ background: BG }}>
          <ErrorState title="שגיאה בטעינה" description={error} onRetry={handleLogout} retryLabel="חזרה למסך התחברות" />
        </div>
      </MobileShell>
    );
  }

  const isPending = dbSupplier?.approval_status === "pending";
  const isRejected = dbSupplier?.approval_status === "rejected";
  const businessName = dbSupplier?.business_name || user?.name || "החשבון שלי";
  const firstName = businessName.split(/[ ,]/)[0];
  const initial = (firstName?.[0] ?? "ס").toUpperCase();

  const TopBar = () => (
    <header className="px-5 pt-6 pb-2">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/supplier/leads")}
          className="shrink-0 h-11 w-11 rounded-2xl bg-white border border-[#EEF0F3] flex items-center justify-center shadow-sm active:scale-95 transition relative"
          aria-label="התראות"
        >
          <Bell className="h-[18px] w-[18px] text-[#1C1C1E]" strokeWidth={2} />
          {leadsToday > 0 && (
            <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-[#0E6B5A] ring-2 ring-white" />
          )}
        </button>
        <div className="flex-1" />
        <div className="text-right">
          <div className="text-[13px] text-[#8E95A2] font-medium leading-tight">בוקר טוב,</div>
          <h1 className="text-[20px] font-bold text-[#0F172A] leading-tight tracking-[-0.02em] flex items-center gap-1.5 justify-end">
            {firstName} <span className="text-[18px]">👋</span>
          </h1>
        </div>
        <button
          onClick={() => navigate("/supplier/profile/edit")}
          className="h-11 w-11 rounded-full bg-gradient-to-br from-[#0E6B5A] to-[#1A8870] text-white font-bold flex items-center justify-center shadow-md active:scale-95 transition"
          aria-label="פרופיל"
        >
          {initial}
        </button>
      </div>
      {leadsToday > 0 && (
        <div className="mt-4 inline-flex items-center gap-2 bg-white border border-[#EEF0F3] rounded-full pl-3 pr-2 py-1.5 shadow-sm">
          <span className="h-6 w-6 rounded-full bg-[#E8F5F1] flex items-center justify-center">
            <Users className="h-3.5 w-3.5" style={{ color: GREEN }} strokeWidth={2.4} />
          </span>
          <span className="text-[12px] font-semibold text-[#0F172A]">לידים חדשים היום</span>
          <span className="text-[12px] font-bold" style={{ color: GREEN }}>{leadsToday}</span>
        </div>
      )}
    </header>
  );

  if (!dbSupplier || isPending || isRejected) {
    return (
      <MobileShell>
        <div className="min-h-screen" style={{ background: BG }}>
          <TopBar />
          <div className="px-5 mt-6">
            <div className="bg-white rounded-3xl p-7 border border-[#EEF0F3] shadow-sm text-center">
              <div className="h-14 w-14 mx-auto rounded-2xl bg-[#E8F5F1] flex items-center justify-center mb-4">
                <Clock className="h-6 w-6" style={{ color: GREEN }} strokeWidth={2} />
              </div>
              <h2 className="font-semibold text-[#0F172A] text-[18px] mb-2 tracking-tight">
                {isRejected ? "ההרשמה נדחתה" : "ממתין לאישור מנהל"}
              </h2>
              <p className="text-[14px] text-[#8E95A2] leading-relaxed mb-5">
                {isRejected ? "לצערנו ההרשמה לא אושרה. ניתן לפנות לתמיכה." : "נעדכן אותך לאחר האישור ותוכל להתחיל לפרסם הצעות ולקבל לידים."}
              </p>
              <Button onClick={() => navigate("/supplier/profile/edit")} className="w-full h-12 rounded-2xl bg-[#0F172A] hover:bg-black text-white font-semibold">
                <Pencil className="h-4 w-4 ml-2" /> השלמת פרטי הספק
              </Button>
              <Button variant="ghost" onClick={handleLogout} className="mt-3 w-full h-10 text-[#8E95A2]">
                <LogOut className="h-4 w-4 ml-1.5" /> יציאה
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
      <div className="min-h-screen w-full overflow-x-hidden pb-8" style={{ background: BG }}>
        <TopBar />

        {/* KPI cards — 4 in a row */}
        <section className="px-5 mt-5">
          <div className="grid grid-cols-4 gap-2">
            <KpiCard
              icon={Wallet}
              iconBg="#E8F5F1"
              iconColor={GREEN}
              value={formatShortILS(totals.revenuePotential)}
              label="פוטנציאל"
              trendColor={GREEN}
              sparklinePoints={genSparkline(7, totals.revenuePotential)}
            />
            <KpiCard
              icon={Users}
              iconBg="#FEEFE9"
              iconColor="#EA6A3A"
              value={totals.totalLeads.toString()}
              label="לידים"
              trendColor="#EA6A3A"
              sparklinePoints={genSparkline(7, totals.totalLeads)}
            />
            <KpiCard
              icon={Eye}
              iconBg="#E6F0FB"
              iconColor="#3B82F6"
              value={totals.views.toString()}
              label="צפיות"
              trendColor="#3B82F6"
              sparklinePoints={genSparkline(7, totals.views)}
            />
            <KpiCard
              icon={TrendingUp}
              iconBg="#F1EAFB"
              iconColor="#7C3AED"
              value={`${totals.conversion}%`}
              label="המרה"
              trendColor="#7C3AED"
              sparklinePoints={genSparkline(7, totals.conversion)}
            />
          </div>
        </section>

        {/* Tasks inbox */}
        {tasks.length > 0 && (
          <>
            <SectionHeader title="משימות שמחכות לך" badge={tasks.length.toString()} />
            <div className="px-5 mt-3 bg-white rounded-3xl border border-[#EEF0F3] shadow-sm overflow-hidden mx-5">
              <div className="bg-white rounded-3xl border border-[#EEF0F3] shadow-sm overflow-hidden">
                {tasks.map((t, i) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => navigate(t.to)}
                      className={`w-full flex items-center gap-3 p-4 text-right active:bg-[#F7F8FA] transition ${i < tasks.length - 1 ? "border-b border-[#F2F4F7]" : ""}`}
                    >
                      <ChevronLeft className="h-4 w-4 text-[#C7CCD4] shrink-0" />
                      <div className="flex-1 min-w-0 text-right">
                        <div className="font-semibold text-[14px] text-[#0F172A] tracking-tight truncate">{t.title}</div>
                        <div className="text-[12px] text-[#8E95A2] truncate mt-0.5">{t.subtitle}</div>
                      </div>
                      <div className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: t.iconBg }}>
                        <Icon className="h-[18px] w-[18px]" style={{ color: t.iconColor }} strokeWidth={2.2} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Hot opportunities carousel */}
        {areaProjects.length > 0 && (
          <>
            <SectionHeader
              title="הזדמנויות חמות באזור"
              action={<button onClick={() => navigate("/supplier/offers/new")} className="text-[13px] font-semibold" style={{ color: GREEN }}>הצג הכל</button>}
            />
            <div className="mt-3 overflow-x-auto no-scrollbar">
              <div className="flex gap-3 px-5 pb-1 snap-x snap-mandatory" dir="rtl">
                {areaProjects.slice(0, 8).map((p, i) => (
                  <div key={p.id} className="snap-start min-w-[200px] w-[200px] bg-white rounded-3xl border border-[#EEF0F3] shadow-sm overflow-hidden">
                    <div className="relative h-[110px] bg-gradient-to-br from-[#E8F0F5] to-[#D4DEE8] flex items-center justify-center">
                      <Building2 className="h-10 w-10 text-white/80" strokeWidth={1.5} />
                      <span className={`absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold text-white ${i === 0 ? "bg-[#EA6A3A]" : "bg-[#0E6B5A]"}`}>
                        {i === 0 ? <><Flame className="h-2.5 w-2.5" strokeWidth={3} /> חם</> : "חדש"}
                      </span>
                    </div>
                    <div className="p-3 text-right">
                      <h3 className="font-bold text-[14px] text-[#0F172A] tracking-tight truncate">{p.name}</h3>
                      <p className="text-[#8E95A2] text-[11px] truncate mt-0.5">{p.city}{p.units ? ` · ${p.units} יח״ד` : ""}</p>
                      <div className="mt-2 text-[10px] text-[#8E95A2]">פוטנציאל הכנסה</div>
                      <div className="font-bold text-[14px]" style={{ color: GREEN }}>{formatShortILS((p.units || 10) * 4000)}</div>
                      <button
                        onClick={() => navigate("/supplier/offers/new")}
                        className={`mt-2.5 w-full h-9 rounded-full text-[12px] font-bold active:scale-95 transition ${i === 0 ? "text-white" : "border bg-white"}`}
                        style={i === 0 ? { background: GREEN } : { borderColor: GREEN, color: GREEN }}
                      >
                        צור הצעה
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Featured top deal */}
        {topDeal && (() => {
          const c = counts[topDeal.id] ?? { interests: 0, paid: 0, favorites: 0 };
          const goal = Math.max(1, Number(topDeal.target_participants ?? 0) || 10);
          const progress = Math.min(100, Math.round((c.interests / goal) * 100));
          return (
            <>
              <SectionHeader
                title="ההצעה המובילה שלך"
                icon={<Flame className="h-4 w-4 text-[#EA6A3A]" />}
              />
              <div className="px-5 mt-3">
                <button
                  onClick={() => navigate(`/supplier/offers/${topDeal.id}/edit`)}
                  className="block w-full text-right bg-white rounded-3xl border border-[#EEF0F3] shadow-sm overflow-hidden active:scale-[0.99] transition"
                >
                  <div className="relative h-[160px] bg-gradient-to-br from-[#1F2937] to-[#0F172A]">
                    {topDeal.image_url && (
                      <img src={topDeal.image_url} alt={topDeal.title} className="absolute inset-0 w-full h-full object-cover opacity-90" />
                    )}
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white bg-[#0E6B5A]/90 backdrop-blur">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> פעילה
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="text-left">
                        <div className="text-[10px] text-[#8E95A2] font-medium">מחיר נוכחי</div>
                        <div className="font-bold text-[22px] tracking-tight" style={{ color: GREEN }}>{formatILS(priceFor(topDeal))}</div>
                      </div>
                      <h3 className="font-bold text-[17px] text-[#0F172A] tracking-tight leading-tight flex-1">{topDeal.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-[11px] font-semibold text-[#8E95A2] shrink-0">{progress}%</span>
                      <div className="flex-1 h-2 rounded-full bg-[#F2F4F7] overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${GREEN}, #1A8870)` }} />
                      </div>
                      <span className="text-[11px] font-medium text-[#8E95A2] shrink-0">{c.interests}/{goal}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#F2F4F7]">
                      <MiniStat icon={Eye} color="#3B82F6" value={(c.interests + c.favorites * 2).toString()} label="צפיות" />
                      <MiniStat icon={Heart} color="#EA6A3A" value={c.favorites.toString()} label="שמירות" />
                      <MiniStat icon={Users} color={GREEN} value={c.interests.toString()} label="מצטרפים" />
                    </div>
                  </div>
                </button>
              </div>
            </>
          );
        })()}

        {/* Weekly business stats */}
        {myDeals.length > 0 && (
          <>
            <SectionHeader title="העסק שלך השבוע" icon={<Activity className="h-4 w-4" style={{ color: GREEN }} />} />
            <div className="px-5 mt-3">
              <div className="bg-white rounded-3xl border border-[#EEF0F3] shadow-sm p-5">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <WeekStat icon={Users} color="#EA6A3A" value={totals.totalLeads.toString()} label="לידים" />
                  <WeekStat icon={Eye} color="#3B82F6" value={totals.views.toString()} label="צפיות" />
                  <WeekStat icon={Target} color="#7C3AED" value={`${totals.conversion}%`} label="המרה" />
                </div>
                <WeeklyChart leads={totals.totalLeads} views={totals.views} conv={totals.conversion} />
              </div>
            </div>
          </>
        )}

        {/* Recent activity */}
        {activity.length > 0 && (
          <>
            <SectionHeader title="פעילות אחרונה" action={<button onClick={() => navigate("/supplier/leads")} className="text-[13px] font-semibold" style={{ color: GREEN }}>הצג הכל</button>} />
            <div className="px-5 mt-3">
              <div className="bg-white rounded-3xl border border-[#EEF0F3] shadow-sm overflow-hidden">
                {activity.map((a, i) => {
                  const Icon = a.type === "lead" ? Users : a.type === "favorite" ? Heart : Eye;
                  const color = a.type === "lead" ? GREEN : a.type === "favorite" ? "#EA6A3A" : "#3B82F6";
                  const bg = a.type === "lead" ? "#E8F5F1" : a.type === "favorite" ? "#FEEFE9" : "#E6F0FB";
                  return (
                    <div key={a.id} className={`flex items-center gap-3 p-4 ${i < activity.length - 1 ? "border-b border-[#F2F4F7]" : ""}`}>
                      <div className="text-[11px] text-[#8E95A2] font-medium shrink-0 w-16 text-left">{timeAgo(a.at)}</div>
                      <div className="flex-1 min-w-0 text-right">
                        <div className="font-semibold text-[14px] text-[#0F172A] truncate">{a.title}</div>
                        <div className="text-[12px] text-[#8E95A2] truncate mt-0.5">{a.subtitle}</div>
                      </div>
                      <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
                        <Icon className="h-4 w-4" style={{ color }} strokeWidth={2.2} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* New offer CTA */}
        <div className="px-5 mt-6">
          <button
            onClick={() => navigate("/supplier/offers/new")}
            className="w-full h-12 rounded-2xl bg-[#0F172A] text-white font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-sm"
          >
            <Plus className="h-4 w-4" strokeWidth={2.6} /> צור הצעה חדשה
          </button>
        </div>
      </div>

      <BottomNav role="supplier" />
    </MobileShell>
  );
}

/* ───────── helpers ───────── */

function formatShortILS(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ₪`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K ₪`;
  return `${Math.round(n)} ₪`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - +new Date(iso);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "עכשיו";
  if (m < 60) return `לפני ${m} דק׳`;
  const h = Math.floor(m / 60);
  if (h < 24) return `לפני ${h} שע׳`;
  const d = Math.floor(h / 24);
  return `לפני ${d} ימים`;
}

// Deterministic sparkline based on the value (so it doesn't randomize on render)
function genSparkline(n: number, seed: number): number[] {
  const points: number[] = [];
  let v = Math.max(1, seed);
  for (let i = 0; i < n; i++) {
    const ratio = 0.6 + ((seed * (i + 3)) % 40) / 100;
    points.push(v * ratio);
    v = v * (0.85 + ((seed * (i + 1)) % 30) / 100);
    if (!isFinite(v) || v <= 0) v = Math.max(1, seed) * 0.5;
  }
  return points;
}

function Sparkline({ points, color }: { points: number[]; color: string }) {
  if (points.length < 2) return <div className="h-6" />;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const w = 60, h = 20;
  const step = w / (points.length - 1);
  const path = points.map((p, i) => {
    const x = i * step;
    const y = h - ((p - min) / range) * h;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-6" preserveAspectRatio="none">
      <path d={`${path} L${w},${h} L0,${h} Z`} fill={color} opacity="0.12" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KpiCard({
  icon: Icon, iconBg, iconColor, value, label, trendColor, sparklinePoints,
}: {
  icon: typeof Wallet; iconBg: string; iconColor: string; value: string; label: string; trendColor: string; sparklinePoints: number[];
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#EEF0F3] shadow-sm p-2.5 flex flex-col">
      <div className="h-7 w-7 rounded-xl flex items-center justify-center mb-1.5" style={{ background: iconBg }}>
        <Icon className="h-3.5 w-3.5" style={{ color: iconColor }} strokeWidth={2.4} />
      </div>
      <div className="text-[14px] font-bold text-[#0F172A] tracking-tight leading-tight truncate">{value}</div>
      <div className="text-[10px] text-[#8E95A2] font-medium leading-tight mt-0.5 truncate">{label}</div>
      <div className="mt-1.5 -mb-0.5">
        <Sparkline points={sparklinePoints} color={trendColor} />
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, color, value, label }: { icon: typeof Eye; color: string; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <Icon className="h-4 w-4 mb-1" style={{ color }} strokeWidth={2.2} />
      <div className="font-bold text-[14px] text-[#0F172A] leading-none">{value}</div>
      <div className="text-[10px] text-[#8E95A2] font-medium mt-1">{label}</div>
    </div>
  );
}

function WeekStat({ icon: Icon, color, value, label }: { icon: typeof Users; color: string; value: string; label: string }) {
  return (
    <div className="bg-[#F7F8FA] rounded-2xl p-3 text-center">
      <Icon className="h-4 w-4 mx-auto mb-1.5" style={{ color }} strokeWidth={2.2} />
      <div className="font-bold text-[16px] text-[#0F172A] leading-none">{value}</div>
      <div className="text-[10px] text-[#8E95A2] font-medium mt-1">{label}</div>
    </div>
  );
}

function WeeklyChart({ leads, views, conv }: { leads: number; views: number; conv: number }) {
  const days = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
  const seed = leads + views + conv + 1;
  const series = (base: number) => days.map((_, i) => Math.max(2, Math.round(base * (0.4 + ((seed * (i + 2)) % 60) / 100))));
  const sLeads = series(Math.max(leads, 3));
  const sViews = series(Math.max(views, 5));
  const sConv = series(Math.max(conv, 2));
  const all = [...sLeads, ...sViews, ...sConv];
  const max = Math.max(...all, 1);
  const w = 300, h = 100;
  const step = w / (days.length - 1);
  const toPath = (arr: number[]) => arr.map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h + 16}`} className="w-full h-[120px]" preserveAspectRatio="none">
        <path d={toPath(sViews)} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={toPath(sLeads)} fill="none" stroke="#EA6A3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={toPath(sConv)} fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {days.map((d, i) => (
          <text key={i} x={i * step} y={h + 12} fontSize="9" fill="#8E95A2" textAnchor="middle">{d}</text>
        ))}
      </svg>
    </div>
  );
}

function SectionHeader({ title, subtitle, action, badge, icon }: { title: string; subtitle?: string; action?: React.ReactNode; badge?: string; icon?: React.ReactNode }) {
  return (
    <div className="px-5 mt-7 flex items-end justify-between gap-3">
      <div>{action}</div>
      <div className="text-right flex items-center gap-2">
        {badge && <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#0F172A] text-white text-[11px] font-bold">{badge}</span>}
        <div>
          <h2 className="text-[17px] font-bold text-[#0F172A] tracking-[-0.01em] leading-tight flex items-center gap-1.5 justify-end">
            {title}{icon}
          </h2>
          {subtitle && <div className="text-[12px] text-[#8E95A2] mt-0.5">{subtitle}</div>}
        </div>
      </div>
    </div>
  );
}
