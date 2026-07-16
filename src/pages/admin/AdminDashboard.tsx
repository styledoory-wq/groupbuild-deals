import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Eye, Store, Tag, Building2, Inbox, BarChart3, type LucideIcon } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AttentionPanel } from "@/components/admin/AttentionPanel";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { setPreviewRole } from "@/lib/previewMode";
import { toast } from "sonner";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type Snapshot = {
  suppliersTotal: number;
  newSuppliersWeek: number;
  dealsTotal: number;
  activeDeals: number;
  projectsTotal: number;
  activeProjects: number;
  leadsTotal: number;
  newLeadsWeek: number;
};

type ActivityItem = { id: string; label: string; time: string };

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { logout, user } = useApp();
  const [snapshot, setSnapshot] = useState<Snapshot>({
    suppliersTotal: 0, newSuppliersWeek: 0,
    dealsTotal: 0, activeDeals: 0,
    projectsTotal: 0, activeProjects: 0,
    leadsTotal: 0, newLeadsWeek: 0,
  });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const weekAgo = new Date(Date.now() - WEEK_MS).toISOString();
        const [
          supTotal, newSup, dealsTotal, activeDeals,
          projTotal, activeProjects, leadsTotal, newLeads,
          recentSup, recentLeads,
        ] = await Promise.all([
          supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("is_deleted", false),
          supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("is_deleted", false).gte("created_at", weekAgo),
          supabase.from("deals").select("id", { count: "exact", head: true }).eq("is_deleted", false),
          supabase.from("deals").select("id", { count: "exact", head: true }).eq("is_deleted", false).in("status", ["active", "closing-soon"]),
          supabase.from("projects").select("id", { count: "exact", head: true }).eq("is_deleted", false),
          supabase.from("projects").select("id", { count: "exact", head: true }).eq("is_deleted", false).eq("is_active", true),
          supabase.from("deal_interests").select("id", { count: "exact", head: true }).eq("is_deleted", false),
          supabase.from("deal_interests").select("id", { count: "exact", head: true }).eq("is_deleted", false).gte("created_at", weekAgo),
          supabase.from("suppliers").select("id, business_name, created_at").eq("is_deleted", false).order("created_at", { ascending: false }).limit(4),
          supabase.from("deal_interests").select("id, full_name, created_at").eq("is_deleted", false).order("created_at", { ascending: false }).limit(4),
        ]);
        setSnapshot({
          suppliersTotal: supTotal.count ?? 0,
          newSuppliersWeek: newSup.count ?? 0,
          dealsTotal: dealsTotal.count ?? 0,
          activeDeals: activeDeals.count ?? 0,
          projectsTotal: projTotal.count ?? 0,
          activeProjects: activeProjects.count ?? 0,
          leadsTotal: leadsTotal.count ?? 0,
          newLeadsWeek: newLeads.count ?? 0,
        });
        const acts: ActivityItem[] = [];
        (recentSup.data ?? []).forEach((s) => acts.push({ id: `s-${s.id}`, label: `ספק חדש · ${s.business_name}`, time: s.created_at }));
        (recentLeads.data ?? []).forEach((l) => acts.push({ id: `l-${l.id}`, label: `ליד חדש · ${l.full_name ?? "אנונימי"}`, time: l.created_at }));
        acts.sort((a, b) => (b.time > a.time ? 1 : -1));
        setActivity(acts.slice(0, 8));
      } catch (e) {
        console.error("[AdminDashboard]", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch (e) { console.warn(e); }
    logout();
    toast.success("התנתקת בהצלחה");
    navigate("/", { replace: true });
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "בוקר טוב";
    if (h < 18) return "צהריים טובים";
    return "ערב טוב";
  })();
  const name = user?.name?.split(" ")[0] ?? "";

  return (
    <MobileShell>
      <div className="bg-[#F7F8FA] min-h-screen">
        <AdminPageHeader
          title={name ? `${greeting}, ${name}` : greeting}
          description={new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}
          actions={
            <>
              <button onClick={() => { setPreviewRole("resident"); navigate("/resident"); }}
                className="hidden sm:inline-flex h-9 px-3 rounded-full bg-white border border-[#EEF0F4] items-center gap-1.5 text-[12px] font-semibold text-[#4B5563] hover:bg-[#FAFBFC] transition-all duration-200">
                <Eye className="h-3.5 w-3.5" strokeWidth={1.75} /> תצוגת דייר
              </button>
              <button onClick={() => { setPreviewRole("supplier"); navigate("/supplier"); }}
                className="hidden sm:inline-flex h-9 px-3 rounded-full bg-white border border-[#EEF0F4] items-center gap-1.5 text-[12px] font-semibold text-[#4B5563] hover:bg-[#FAFBFC] transition-all duration-200">
                <Eye className="h-3.5 w-3.5" strokeWidth={1.75} /> תצוגת ספק
              </button>
              <button onClick={handleLogout}
                className="h-9 px-3 rounded-full bg-white border border-[#EEF0F4] flex items-center gap-1.5 text-[12px] font-semibold text-[#4B5563] hover:bg-[#FAFBFC] transition-all duration-200">
                <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} /> יציאה
              </button>
            </>
          }
        />

        <div dir="rtl" className="px-5 lg:px-8 pb-24 pt-2 space-y-6 max-w-6xl">
          {/* ATTENTION — the hero of the dashboard */}
          <AttentionPanel />

          {/* Quiet KPI row */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard icon={Store} label="ספקים" value={snapshot.suppliersTotal} sub={`${snapshot.newSuppliersWeek > 0 ? "+" : ""}${snapshot.newSuppliersWeek} השבוע`} onClick={() => navigate("/admin/suppliers")} loading={loading} />
            <KpiCard icon={Tag} label="הצעות" value={snapshot.dealsTotal} sub={`${snapshot.activeDeals} פעילות`} onClick={() => navigate("/admin/deals")} loading={loading} />
            <KpiCard icon={Building2} label="פרויקטים" value={snapshot.projectsTotal} sub={`${snapshot.activeProjects} פעילים`} onClick={() => navigate("/admin/projects")} loading={loading} />
            <KpiCard icon={Inbox} label="לידים" value={snapshot.leadsTotal} sub={`${snapshot.newLeadsWeek > 0 ? "+" : ""}${snapshot.newLeadsWeek} השבוע`} onClick={() => navigate("/admin/leads")} loading={loading} />
          </section>

          {/* Activity feed */}
          <section className="rounded-[16px] bg-white border border-[#EEF0F4] overflow-hidden">
            <header className="px-6 pt-5 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-bold text-[#0F172A] tracking-tight">פעילות אחרונה</h2>
                <p className="text-[12px] text-[#8B94A3] mt-0.5">אירועים אחרונים במערכת</p>
              </div>
              <button onClick={() => navigate("/admin/stats")} className="text-[12px] font-semibold text-[#0E6B5A] hover:underline flex items-center gap-1">
                <BarChart3 className="h-3.5 w-3.5" strokeWidth={1.75} /> סטטיסטיקות
              </button>
            </header>
            {loading ? (
              <div className="px-6 pb-6 space-y-2">
                {[0, 1, 2].map((i) => <div key={i} className="h-10 bg-[#F7F8FA] rounded-lg animate-pulse" />)}
              </div>
            ) : activity.length === 0 ? (
              <div className="px-6 pb-6 text-[13px] text-[#8B94A3]">אין פעילות להצגה.</div>
            ) : (
              <ul className="divide-y divide-[#F3F5F8]">
                {activity.map((a) => (
                  <li key={a.id} className="px-6 py-3 flex items-center justify-between gap-3">
                    <span className="text-[13.5px] text-[#0F172A] truncate">{a.label}</span>
                    <span className="text-[11.5px] text-[#8B94A3] tabular-nums shrink-0">
                      {new Date(a.time).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <BottomNav role="admin" />
    </MobileShell>
  );
}

function KpiCard({ icon: Icon, label, value, sub, onClick, loading }: {
  icon: LucideIcon; label: string; value: number; sub: string; onClick: () => void; loading: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="text-right rounded-[16px] bg-white border border-[#EEF0F4] p-5 hover:border-[#D9DEE6] hover:shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all duration-200 ease-out group"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="h-8 w-8 rounded-[10px] bg-[#F4F6FA] flex items-center justify-center">
          <Icon className="h-[15px] w-[15px] text-[#4B5563] group-hover:text-[#0E6B5A] transition-colors" strokeWidth={1.75} />
        </span>
      </div>
      <div className="text-[26px] font-bold text-[#0F172A] tabular-nums leading-none tracking-tight">
        {loading ? <span className="inline-block h-6 w-10 bg-[#F1F3F7] rounded animate-pulse" /> : value.toLocaleString("he-IL")}
      </div>
      <div className="text-[12.5px] font-semibold text-[#4B5563] mt-2">{label}</div>
      <div className="text-[11px] text-[#8B94A3] mt-0.5">{sub}</div>
    </button>
  );
}
