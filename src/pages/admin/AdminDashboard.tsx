import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Eye, Store, Tag, Building2, Inbox, CreditCard, BadgeDollarSign, Settings, Users, type LucideIcon } from "lucide-react";
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

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { logout, user } = useApp();
  const [snapshot, setSnapshot] = useState<Snapshot>({
    suppliersTotal: 0, newSuppliersWeek: 0,
    dealsTotal: 0, activeDeals: 0,
    projectsTotal: 0, activeProjects: 0,
    leadsTotal: 0, newLeadsWeek: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const weekAgo = new Date(Date.now() - WEEK_MS).toISOString();
        const [supTotal, newSup, dealsTotal, activeDeals, projTotal, activeProjects, leadsTotal, newLeads] = await Promise.all([
          supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("is_deleted", false),
          supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("is_deleted", false).gte("created_at", weekAgo),
          supabase.from("deals").select("id", { count: "exact", head: true }).eq("is_deleted", false),
          supabase.from("deals").select("id", { count: "exact", head: true }).eq("is_deleted", false).in("status", ["active", "closing-soon"]),
          supabase.from("projects").select("id", { count: "exact", head: true }).eq("is_deleted", false),
          supabase.from("projects").select("id", { count: "exact", head: true }).eq("is_deleted", false).eq("is_active", true),
          supabase.from("deal_interests").select("id", { count: "exact", head: true }).eq("is_deleted", false),
          supabase.from("deal_interests").select("id", { count: "exact", head: true }).eq("is_deleted", false).gte("created_at", weekAgo),
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
          description="ניהול ותפעול GroupBuild"
          actions={
            <>
              <button onClick={() => { setPreviewRole("resident"); navigate("/resident"); }} className="hidden sm:inline-flex h-9 px-3 rounded-full bg-white border border-[#EEF0F4] items-center gap-1.5 text-[12px] font-semibold text-[#4B5563] hover:bg-[#FAFBFC] transition-all duration-200">
                <Eye className="h-3.5 w-3.5" strokeWidth={1.75} /> תצוגת דייר
              </button>
              <button onClick={() => { setPreviewRole("supplier"); navigate("/supplier"); }} className="hidden sm:inline-flex h-9 px-3 rounded-full bg-white border border-[#EEF0F4] items-center gap-1.5 text-[12px] font-semibold text-[#4B5563] hover:bg-[#FAFBFC] transition-all duration-200">
                <Eye className="h-3.5 w-3.5" strokeWidth={1.75} /> תצוגת ספק
              </button>
              <button onClick={handleLogout} className="h-9 px-3 rounded-full bg-white border border-[#EEF0F4] flex items-center gap-1.5 text-[12px] font-semibold text-[#4B5563] hover:bg-[#FAFBFC] transition-all duration-200">
                <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} /> יציאה
              </button>
            </>
          }
        />

        <div dir="rtl" className="px-5 lg:px-8 pb-24 pt-2 space-y-5 max-w-6xl">
          <AttentionPanel />

          <section>
            <div className="mb-3">
              <h2 className="text-[16px] font-extrabold text-[#0F172A]">פעולות מהירות</h2>
              <p className="text-[12px] text-[#8B94A3] mt-0.5">הדברים שצריך להגיע אליהם בלי לחפש</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <ActionCard icon={Tag} title="ניהול הצעות" description="עריכה, הפעלה וביטול" onClick={() => navigate("/admin/deals")} />
              <ActionCard icon={BadgeDollarSign} title="דמי הצטרפות" description="סכום לפי עסקה או ללא תשלום" onClick={() => navigate("/admin/deal-fees")} emphasize />
              <ActionCard icon={Users} title="לידים" description="מי התעניין ומה דורש טיפול" onClick={() => navigate("/admin/leads")} />
              <ActionCard icon={CreditCard} title="תשלומים" description="חיובים, תשלומים וסטטוסים" onClick={() => navigate("/admin/payments")} />
              <ActionCard icon={Store} title="ספקים" description="אישור וניהול ספקים" onClick={() => navigate("/admin/suppliers")} />
              <ActionCard icon={Building2} title="פרויקטים" description="פרויקטים וקבוצות" onClick={() => navigate("/admin/projects")} />
              <ActionCard icon={Settings} title="הגדרות" description="הגדרות מערכת" onClick={() => navigate("/admin/settings")} />
            </div>
          </section>

          <section>
            <h2 className="text-[16px] font-extrabold text-[#0F172A] mb-3">מצב המערכת</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard icon={Store} label="ספקים" value={snapshot.suppliersTotal} sub={`${snapshot.newSuppliersWeek > 0 ? "+" : ""}${snapshot.newSuppliersWeek} השבוע`} onClick={() => navigate("/admin/suppliers")} loading={loading} />
              <KpiCard icon={Tag} label="הצעות" value={snapshot.dealsTotal} sub={`${snapshot.activeDeals} פעילות`} onClick={() => navigate("/admin/deals")} loading={loading} />
              <KpiCard icon={Building2} label="פרויקטים" value={snapshot.projectsTotal} sub={`${snapshot.activeProjects} פעילים`} onClick={() => navigate("/admin/projects")} loading={loading} />
              <KpiCard icon={Inbox} label="לידים" value={snapshot.leadsTotal} sub={`${snapshot.newLeadsWeek > 0 ? "+" : ""}${snapshot.newLeadsWeek} השבוע`} onClick={() => navigate("/admin/leads")} loading={loading} />
            </div>
          </section>
        </div>
      </div>
      <BottomNav role="admin" />
    </MobileShell>
  );
}

function ActionCard({ icon: Icon, title, description, onClick, emphasize = false }: { icon: LucideIcon; title: string; description: string; onClick: () => void; emphasize?: boolean }) {
  return (
    <button onClick={onClick} className={`text-right rounded-[16px] p-4 border transition-all ${emphasize ? "bg-[#0F172A] border-[#0F172A] text-white" : "bg-white border-[#EEF0F4] hover:border-[#D9DEE6]"}`}>
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center mb-3 ${emphasize ? "bg-white/10" : "bg-[#F4F6FA]"}`}>
        <Icon className={`h-4.5 w-4.5 ${emphasize ? "text-[#D6B56B]" : "text-[#0E6B5A]"}`} strokeWidth={1.9} />
      </div>
      <div className={`text-[14px] font-extrabold ${emphasize ? "text-white" : "text-[#0F172A]"}`}>{title}</div>
      <div className={`text-[11.5px] mt-1 leading-5 ${emphasize ? "text-white/65" : "text-[#8B94A3]"}`}>{description}</div>
    </button>
  );
}

function KpiCard({ icon: Icon, label, value, sub, onClick, loading }: { icon: LucideIcon; label: string; value: number; sub: string; onClick: () => void; loading: boolean }) {
  return (
    <button onClick={onClick} className="tap-target text-right rounded-[16px] bg-white border border-[#EEF0F4] p-4 hover:border-[#D9DEE6] transition-all group">
      <div className="flex items-start justify-between mb-2"><span className="h-8 w-8 rounded-[10px] bg-[#F4F6FA] flex items-center justify-center"><Icon className="h-[15px] w-[15px] text-[#4B5563] group-hover:text-[#0E6B5A]" strokeWidth={1.75} /></span></div>
      <div className="text-[24px] font-bold text-[#0F172A] tabular-nums leading-none">{loading ? <span className="inline-block h-6 w-10 bg-[#F1F3F7] rounded animate-pulse" /> : value.toLocaleString("he-IL")}</div>
      <div className="text-[12.5px] font-semibold text-[#4B5563] mt-2">{label}</div>
      <div className="text-[11px] text-[#8B94A3] mt-0.5">{sub}</div>
    </button>
  );
}
