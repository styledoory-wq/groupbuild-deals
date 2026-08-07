import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Users, TrendingUp, Bell, Wallet, Eye,
  ArrowLeft, Heart, ChevronLeft, Tag,
} from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { LoadingState, ErrorState } from "@/components/ds";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { isShowcase, SHOWCASE_SUPPLIER, SHOWCASE_SUPPLIER_DEALS, SHOWCASE_SUPPLIER_DEAL_COUNTS, SHOWCASE_WEEK_STATS } from "@/lib/showcase";
import { toast } from "sonner";
import { getFriendlyLoadError } from "@/lib/safeAsync";
import { resolveSupplierForUser } from "@/lib/supplierAuth";
import { loadSupplierCompletenessForUser, type SupplierCompleteness } from "@/lib/supplierCompleteness";
import { HelpButton } from "@/components/OnboardingFlow";
import { SmartImg } from "@/components/ui/SmartImg";
import {
  SUPPLIER_PAGE_BG as BG,
  SUPPLIER_GREEN as GREEN,
  SupplierPendingWorkspace,
  SupplierGettingStarted,
} from "@/components/supplier/SupplierWorkspace";
import { SUPPLIER } from "@/lib/supplierUi";

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
  cover_image_url: string | null;
  gallery_images: unknown;
  ends_at?: string | null;
  description?: string | null;
};

type ActivityItem = {
  id: string;
  type: "lead" | "favorite" | "paid";
  title: string;
  subtitle: string;
  at: string;
};

function priceFor(d: DbDeal): number {
  if (d.offer_type === "price_comparison" && d.discounted_price != null) return Number(d.discounted_price);
  if (d.offer_type === "percentage" && d.original_price != null && d.discount_percentage != null) {
    return Number(d.original_price) * (1 - Number(d.discount_percentage) / 100);
  }
  return Number(d.base_price ?? d.original_price ?? 0);
}

function shortILS(n: number): string {
  if (n >= 1_000_000) return `₪${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₪${Math.round(n / 1_000)}K`;
  return `₪${Math.round(n).toLocaleString("he-IL")}`;
}

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - +new Date(iso)) / 60000);
  if (m < 1) return "עכשיו";
  if (m < 60) return `לפני ${m} ד׳`;
  const h = Math.floor(m / 60);
  if (h < 24) return `לפני ${h} שע׳`;
  const d = Math.floor(h / 24);
  return `לפני ${d} ימים`;
}

export default function SupplierDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbSupplier, setDbSupplier] = useState<DbSupplier | null>(null);
  const [myDeals, setMyDeals] = useState<DbDeal[]>([]);
  const [counts, setCounts] = useState<Record<string, { interests: number; paid: number; favorites: number }>>({});
  const [pendingLeads, setPendingLeads] = useState(0);
  const [unrespondedLeads, setUnrespondedLeads] = useState(0);
  const [pendingOffers, setPendingOffers] = useState(0);
  const [endingSoonOffers, setEndingSoonOffers] = useState(0);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [weekStats, setWeekStats] = useState({ leads: 0, favs: 0, paid: 0, revenue: 0 });
  const [customerSavings, setCustomerSavings] = useState(0);
  const [completeness, setCompleteness] = useState<SupplierCompleteness | null>(null);

  useEffect(() => {
    let cancelled = false;
    const safety = window.setTimeout(() => { if (!cancelled) setLoading(false); }, 8000);

    if (isShowcase()) {
      setDbSupplier(SHOWCASE_SUPPLIER as unknown as DbSupplier);
      setMyDeals(SHOWCASE_SUPPLIER_DEALS as unknown as DbDeal[]);
      setCounts(SHOWCASE_SUPPLIER_DEAL_COUNTS);
      setWeekStats({ leads: SHOWCASE_WEEK_STATS.leads, favs: SHOWCASE_WEEK_STATS.views, paid: 18, revenue: 128400 });
      setLoading(false);
      window.clearTimeout(safety);
      return () => { cancelled = true; window.clearTimeout(safety); };
    }
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

        // Load completeness. If incomplete, redirect to onboarding.
        try {
          const { completeness: comp } = await loadSupplierCompletenessForUser(session.user.id);
          if (!cancelled) setCompleteness(comp);
          if (!cancelled && !comp.complete) {
            setLoading(false);
            navigate("/supplier/onboarding", { replace: true });
            return;
          }
        } catch (compErr) {
          console.warn("[dashboard] completeness check failed", compErr);
        }

        if (supplierRow?.id && (supplierRow.approval_status === "approved" || supplierRow.approval_status === "active")) {
          const { data: dealRows, error: dealsErr } = await supabase
            .from("deals")
            .select("id,title,status,original_price,discounted_price,discount_percentage,base_price,offer_type,target_participants,cover_image_url,gallery_images,ends_at,description")
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

          // Action center metrics
          const now = new Date();
          const sevenDaysFromNow = new Date(now.getTime() + 7 * 86400000);
          const ending = list.filter((d) => {
            if (!d.ends_at) return false;
            const e = new Date(d.ends_at);
            return e > now && e <= sevenDaysFromNow;
          }).length;
          if (!cancelled) setEndingSoonOffers(ending);
          if (!cancelled) setPendingOffers(list.filter((d) => d.status === "pending" || d.status === "draft").length);

          if (dealIds.length > 0) {
            // Pending leads (new + unanswered)
            const [{ count: pending }, { count: unresponded }] = await Promise.all([
              supabase.from("deal_interests").select("id", { count: "exact", head: true })
                .in("deal_id", dealIds).eq("is_deleted", false).eq("is_demo", false)
                .is("lead_status", null),
              supabase.from("supplier_inquiries").select("id", { count: "exact", head: true })
                .eq("supplier_id", supplierRow.id).eq("is_deleted", false)
                .in("status", ["new", "pending"]),
            ]);
            if (!cancelled) {
              setPendingLeads(pending ?? 0);
              setUnrespondedLeads(unresponded ?? 0);
            }

            // Week activity + stats
            const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
            const [{ data: leadRows7 }, { data: favRows7 }, { data: paidRows7 }] = await Promise.all([
              supabase.from("deal_interests")
                .select("id,deal_id,created_at,full_name")
                .in("deal_id", dealIds).eq("is_deleted", false).eq("is_demo", false)
                .gte("created_at", sevenDaysAgo.toISOString())
                .order("created_at", { ascending: false }),
              supabase.from("favorites")
                .select("id,deal_id,created_at")
                .in("deal_id", dealIds)
                .gte("created_at", sevenDaysAgo.toISOString())
                .order("created_at", { ascending: false }),
              supabase.from("deposits")
                .select("id,deal_id,created_at,amount")
                .in("deal_id", dealIds).eq("status", "paid").eq("is_deleted", false)
                .gte("created_at", sevenDaysAgo.toISOString())
                .order("created_at", { ascending: false }),
            ]);

            const leads = leadRows7 ?? [];
            const favs = favRows7 ?? [];
            const paids = paidRows7 ?? [];

            const titleMap = new Map(list.map(d => [d.id, d.title]));
            const items: ActivityItem[] = [];
            leads.slice(0, 4).forEach((r) => items.push({
              id: `l-${r.id}`, type: "lead",
              title: `ליד חדש: ${r.full_name ?? "דייר"}`,
              subtitle: titleMap.get(r.deal_id) ?? "הצעה",
              at: r.created_at as string,
            }));
            paids.slice(0, 3).forEach((r) => items.push({
              id: `p-${r.id}`, type: "paid",
              title: "מימוש חדש",
              subtitle: titleMap.get(r.deal_id) ?? "הצעה",
              at: r.created_at as string,
            }));
            favs.slice(0, 3).forEach((r) => items.push({
              id: `f-${r.id}`, type: "favorite",
              title: "הצעה נשמרה למועדפים",
              subtitle: titleMap.get(r.deal_id) ?? "הצעה",
              at: r.created_at as string,
            }));
            items.sort((a, b) => +new Date(b.at) - +new Date(a.at));
            if (!cancelled) setActivity(items.slice(0, 6));

            // Week aggregates
            const weekRevenue = paids.reduce((s, r) => s + (Number(r.amount) || 0), 0);
            const weekFavs = favs.length;
            const weekLeads = leads.length;
            const weekPaid = paids.length;
            const views = weekLeads + weekFavs * 2;
            if (!cancelled) setWeekStats({ leads: weekLeads, favs: views, paid: weekPaid, revenue: weekRevenue });

            // Customer savings (total discount across all paid deposits)
            const savings = paids.reduce((s, r) => {
              const d = list.find((x) => x.id === r.deal_id);
              if (!d) return s;
              const original = Number(d.original_price ?? 0);
              const final = priceFor(d);
              return s + Math.max(0, original - final);
            }, 0);
            if (!cancelled) setCustomerSavings(savings);
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

  const topDeal = useMemo(() => {
    if (!myDeals.length) return null;
    return [...myDeals].sort((a, b) => {
      const ca = counts[a.id] ?? { interests: 0, favorites: 0, paid: 0 };
      const cb = counts[b.id] ?? { interests: 0, favorites: 0, paid: 0 };
      return (cb.interests + cb.paid * 3) - (ca.interests + ca.paid * 3);
    })[0];
  }, [myDeals, counts]);

  const actionTotal = pendingLeads + pendingOffers + endingSoonOffers + unrespondedLeads;
  const primaryAction = (() => {
    if (pendingLeads > 0) return { label: "טפל בלידים", to: "/supplier/leads" };
    if (unrespondedLeads > 0) return { label: "ענה לפניות", to: "/supplier/leads" };
    if (endingSoonOffers > 0) return { label: "בדוק הצעות מסתיימות", to: "/supplier/offers" };
    if (pendingOffers > 0) return { label: "פרסם הצעות", to: "/supplier/offers" };
    return { label: "צור הצעה חדשה", to: "/supplier/offers/new" };
  })();

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
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate("/settings/notifications")}
          className="shrink-0 h-11 w-11 rounded-2xl bg-white border border-[#D5DED9] shadow-sm flex items-center justify-center relative"
          aria-label="התראות"
        >
          <Bell className="h-[18px] w-[18px] text-[#0F172A]" strokeWidth={2} />
          {pendingLeads > 0 && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#EA6A3A] ring-2 ring-white" />
          )}
        </button>
        <div className="flex items-center gap-3 flex-1 justify-end min-w-0">
          <div className="text-right min-w-0">
            <h1 className="text-[20px] font-bold text-[#0F172A] leading-tight tracking-tight truncate">
              שלום, {firstName}
            </h1>
            <div className="text-[12px] text-[#64748B] mt-0.5 truncate">{businessName}</div>
          </div>
          <button
            onClick={() => navigate("/supplier/account")}
            className="shrink-0 h-11 w-11 rounded-full bg-gradient-to-br from-[#0E6B5A] to-[#1A8870] text-white font-bold text-[15px] flex items-center justify-center shadow-sm"
            aria-label="חשבון"
          >
            {initial}
          </button>
        </div>
      </div>
    </header>
  );

  if (!dbSupplier || isPending || isRejected) {
    return (
      <MobileShell>
        <div className="min-h-screen" style={{ background: BG }}>
          <TopBar />
          <div className="mt-4">
            <SupplierPendingWorkspace
              businessName={businessName}
              firstName={firstName}
              status={dbSupplier?.approval_status}
              completeness={completeness}
            />
          </div>
          <BottomNav role="supplier" />
        </div>
      </MobileShell>
    );
  }

  const galleryArr = topDeal && Array.isArray(topDeal.gallery_images) ? (topDeal.gallery_images as string[]) : [];
  const topImage = topDeal ? (topDeal.cover_image_url || galleryArr[0] || null) : null;
  const topCounts = topDeal ? (counts[topDeal.id] ?? { interests: 0, favorites: 0, paid: 0 }) : null;
  const topGoal = topDeal ? Math.max(1, Number(topDeal.target_participants ?? 0) || 10) : 1;
  const topProgress = topCounts ? Math.min(100, Math.round((topCounts.interests / topGoal) * 100)) : 0;
  const topRevenue = topDeal && topCounts ? topCounts.interests * priceFor(topDeal) : 0;

  return (
    <MobileShell>
      <div className="min-h-screen w-full overflow-x-hidden pb-8" style={{ background: BG }}>
        <TopBar />

        {myDeals.length === 0 && (
          <SupplierGettingStarted businessName={businessName} />
        )}

        {/* ===== Action Center — rich list on elevated card ===== */}
        {myDeals.length > 0 && (
        <section className="px-5 mt-5">
          <div className={SUPPLIER.cardPad}>
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center justify-center min-w-[28px] h-[28px] px-2 rounded-full bg-[#0E6B5A] text-white text-[12px] font-bold">
                {actionTotal}
              </span>
              <div className="text-right">
                <h2 className="text-[16px] font-bold text-[#0F172A] tracking-tight">מרכז פעולות</h2>
                <div className="text-[12px] text-[#64748B] mt-0.5">דברים שמחכים לטיפול שלך</div>
              </div>
            </div>

            <div className="rounded-2xl bg-[#F3F7F5] border border-[#D5DED9] divide-y divide-[#D5DED9]/80 overflow-hidden">
              <ActionRow label="לידים חדשים" count={pendingLeads} accent={GREEN} onClick={() => navigate("/supplier/leads")} />
              <ActionRow label="לקוחות ללא מענה" count={unrespondedLeads} accent="#0E6B5A" onClick={() => navigate("/supplier/leads")} />
              <ActionRow label="הצעות לקראת סיום" count={endingSoonOffers} accent="#C2410C" onClick={() => navigate("/supplier/offers")} />
              <ActionRow label="הצעות בטיוטה" count={pendingOffers} accent="#475569" onClick={() => navigate("/supplier/offers")} />
            </div>

            <button
              onClick={() => navigate(primaryAction.to)}
              className={"mt-4 w-full " + SUPPLIER.btnPrimary}
            >
              {primaryAction.label}
              <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
            </button>
          </div>
        </section>
        )}

        {/* ===== Top Offer ===== */}
        {topDeal && topCounts && (
          <section className="px-5 mt-5">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => navigate("/supplier/offers")} className="text-[12px] font-semibold text-[#0E6B5A] flex items-center gap-0.5">
                הכל <ChevronLeft className="h-3 w-3" />
              </button>
              <h2 className="text-[15px] font-bold text-[#0F172A] tracking-tight">ההצעה המובילה</h2>
            </div>
            <div className={SUPPLIER.card + " overflow-hidden"}>
              <div className="relative h-[168px] bg-[#0F172A]">
                {topImage ? (
                  <SmartImg src={topImage} size="card" alt={topDeal.title} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Tag className="h-10 w-10 text-white/40" />
                  </div>
                )}
                <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-white bg-[#0E6B5A]/95">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" /> פעילה
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-left shrink-0">
                    <div className="text-[10px] text-[#64748B] font-medium">מחיר נוכחי</div>
                    <div className="font-bold text-[22px] tracking-tight tabular-nums" style={{ color: GREEN }}>
                      {shortILS(priceFor(topDeal))}
                    </div>
                  </div>
                  <h3 className="font-bold text-[16px] text-[#0F172A] tracking-tight flex-1 text-right line-clamp-2 leading-snug">
                    {topDeal.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-[#0F172A] shrink-0">{topProgress}%</span>
                  <div className="flex-1 h-2 rounded-full bg-[#E8EEEB] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${topProgress}%`, background: GREEN }} />
                  </div>
                  <span className="text-[11px] text-[#64748B] font-semibold shrink-0">{topCounts.interests}/{topGoal}</span>
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="text-left">
                    <div className="text-[10px] text-[#64748B]">הכנסה צפויה</div>
                    <div className="font-bold text-[14px] text-[#0F172A]">{shortILS(topRevenue)}</div>
                  </div>
                  <button
                    onClick={() => navigate(`/supplier/offers/${topDeal.id}/edit`)}
                    className="h-10 px-4 rounded-xl bg-[#0E6B5A] text-white text-[13px] font-bold"
                  >
                    ניהול הצעה
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ===== Recent activity ===== */}
        {activity.length > 0 && (
          <section className="px-5 mt-5">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => navigate("/supplier/leads")} className="text-[12px] font-semibold text-[#0E6B5A] flex items-center gap-0.5">
                הכל <ChevronLeft className="h-3 w-3" />
              </button>
              <h2 className="text-[15px] font-bold text-[#0F172A] tracking-tight">פעילות אחרונה</h2>
            </div>
            <div className={SUPPLIER.card + " p-2"}>
              {activity.map((a, i) => (
                <div key={a.id} className="flex items-center gap-3 px-3 py-3 relative">
                  <div className="text-[10px] text-[#64748B] font-medium shrink-0 w-14 text-left">{timeAgo(a.at)}</div>
                  <div className="flex-1 min-w-0 text-right">
                    <div className="font-semibold text-[13px] text-[#0F172A] truncate">{a.title}</div>
                    <div className="text-[11px] text-[#64748B] truncate mt-0.5">{a.subtitle}</div>
                  </div>
                  <div
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ background: a.type === "lead" ? GREEN : a.type === "paid" ? "#0E6B5A" : "#C2410C" }}
                  />
                  {i < activity.length - 1 && (
                    <div className="absolute bottom-0 right-3 left-3 h-px bg-[#E8EEEB]" />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ===== Week stats ===== */}
        <section className="px-5 mt-5">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigate("/supplier/analytics")}
              className="text-[12px] font-semibold text-[#0E6B5A] flex items-center gap-0.5"
            >
              אנליטיקס <ChevronLeft className="h-3 w-3" />
            </button>
            <h2 className="text-[15px] font-bold text-[#0F172A] tracking-tight">ביצועי השבוע</h2>
          </div>
          <div className={SUPPLIER.cardPad}>
            <div className="grid grid-cols-4 gap-2">
              <WeekStat icon={Eye} value={weekStats.favs.toString()} label="צפיות" />
              <WeekStat icon={Users} value={weekStats.leads.toString()} label="לידים" />
              <WeekStat icon={Heart} value={weekStats.paid.toString()} label="הצטרפויות" />
              <WeekStat icon={Wallet} value={shortILS(weekStats.revenue)} label="הכנסה" />
            </div>
          </div>
        </section>

        {customerSavings > 0 && (
          <section className="px-5 mt-4">
            <div className={SUPPLIER.card + " p-4 flex items-center gap-3"}>
              <div className="h-10 w-10 rounded-xl bg-[#E8F5F1] flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5" style={{ color: GREEN }} strokeWidth={2.2} />
              </div>
              <div className="flex-1 min-w-0 text-right">
                <div className="text-[11px] text-[#64748B] font-medium">חסכת ללקוחות שלך</div>
                <div className="font-bold text-[16px] text-[#0F172A]">{shortILS(customerSavings)}</div>
              </div>
            </div>
          </section>
        )}

        <div className="px-5 mt-5 space-y-2 pb-2">
          <button onClick={() => navigate("/supplier/offers/new")} className={"w-full " + SUPPLIER.btnInk}>
            <Plus className="h-4 w-4" strokeWidth={2.6} /> הצעה חדשה
          </button>
          <button onClick={() => navigate("/supplier/demand-inbox")} className={"w-full " + SUPPLIER.btnGhost}>
            <Bell className="h-4 w-4 text-[#0E6B5A]" strokeWidth={2.4} /> ביקושים פתוחים באזור שלך
          </button>
          <button onClick={() => navigate("/supplier/deposits")} className={"w-full " + SUPPLIER.btnGhost}>
            <Wallet className="h-4 w-4 text-[#0E6B5A]" strokeWidth={2.4} /> פיקדונות לאישור
          </button>
        </div>
      </div>

      <BottomNav role="supplier" />
      <HelpButton role="supplier" />
    </MobileShell>
  );
}

function ActionRow({
  label, count, accent, onClick,
}: { label: string; count: number; accent: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="tap-target w-full flex items-center justify-between py-3.5 px-3.5 text-right active:bg-white/70 transition">
      <div className="font-bold text-[15px] tabular-nums" style={{ color: count > 0 ? accent : "#94A3B8" }}>
        {count}
      </div>
      <div className="text-[14px] text-[#0F172A] font-semibold flex-1 mr-3">{label}</div>
    </button>
  );
}

function WeekStat({ icon: Icon, value, label }: { icon: typeof Users; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center text-center py-1">
      <div className="h-8 w-8 rounded-xl bg-[#E8F5F1] flex items-center justify-center mb-2">
        <Icon className="h-4 w-4 text-[#0E6B5A]" strokeWidth={2} />
      </div>
      <div className="font-bold text-[15px] text-[#0F172A] leading-none tracking-tight truncate w-full">{value}</div>
      <div className="text-[10px] text-[#64748B] font-medium mt-1.5">{label}</div>
    </div>
  );
}
