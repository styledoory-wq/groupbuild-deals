import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Users, TrendingUp, ClipboardList, Plus, Bell, Share2, Megaphone, Search, FileText, ChevronLeft, FileEdit } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp, formatILS } from "@/store/AppStore";
import { BackHeader, LoadingState, EmptyState } from "@/components/ds";

interface Stats {
  project_id: string | null;
  active_deals: number;
  joiners: number;
  savings: number;
}

interface BuildingDeal {
  id: string;
  title: string;
  joiners: number;
}

interface Task {
  id: string;
  title: string;
  link?: string;
}

export default function CommitteeDashboard() {
  const navigate = useNavigate();
  const { user, authReady } = useApp();
  const [stats, setStats] = useState<Stats | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [residentsCount, setResidentsCount] = useState<number>(0);
  const [buildingDeals, setBuildingDeals] = useState<BuildingDeal[]>([]);
  const [isCommittee, setIsCommittee] = useState<boolean | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!authReady) return;
    if (!user?.id) { navigate("/auth"); return; }
    let cancelled = false;
    (async () => {
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id);
      const isC = (roles ?? []).some((r) => (r as { role: string }).role === "committee");
      if (cancelled) return;
      setIsCommittee(isC);
      if (!isC) return;

      const { data: statsRes } = await supabase.rpc("get_committee_dashboard" as never, {} as never);
      const s = statsRes as unknown as Stats | null;
      if (cancelled) return;
      setStats(s);

      if (s?.project_id) {
        const [{ data: proj }, { count: rCount }, { data: interests }] = await Promise.all([
          supabase.from("projects").select("name").eq("id", s.project_id).maybeSingle(),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("project_id", s.project_id),
          supabase
            .from("deal_interests")
            .select("deal_id, user_id, profiles!inner(project_id)")
            .eq("profiles.project_id", s.project_id)
            .eq("is_deleted", false),
        ]);
        if (cancelled) return;
        setProjectName((proj as { name?: string } | null)?.name ?? "");
        setResidentsCount(rCount ?? 0);

        // Group joiners by deal
        const dealMap = new Map<string, Set<string>>();
        ((interests ?? []) as { deal_id: string; user_id: string }[]).forEach((r) => {
          if (!dealMap.has(r.deal_id)) dealMap.set(r.deal_id, new Set());
          dealMap.get(r.deal_id)!.add(r.user_id);
        });
        const dealIds = Array.from(dealMap.keys());
        if (dealIds.length) {
          const { data: dealRows } = await supabase
            .from("deals").select("id,title,status,is_deleted")
            .in("id", dealIds).eq("is_deleted", false).eq("status", "active");
          if (cancelled) return;
          const rows = ((dealRows ?? []) as { id: string; title: string }[])
            .map((d) => ({ id: d.id, title: d.title, joiners: dealMap.get(d.id)?.size ?? 0 }))
            .sort((a, b) => b.joiners - a.joiners)
            .slice(0, 5);
          setBuildingDeals(rows);
        }
      }

      const t: Task[] = [];
      if ((s?.active_deals ?? 0) === 0) t.push({ id: "no-deals", title: "אין עסקאות פעילות בבניין — שווה ליזום אחת", link: "/deals" });
      if ((s?.joiners ?? 0) > 0 && (s?.active_deals ?? 0) > 0) t.push({ id: "follow", title: `${s?.joiners} דיירים הצטרפו — מומלץ לשלוח עדכון`, link: "/deals" });
      t.push({ id: "share", title: "שתף את הפלטפורמה עם דיירים נוספים בבניין" });
      if (!cancelled) setTasks(t);
    })();
    return () => { cancelled = true; };
  }, [authReady, user, navigate]);

  const handleShare = async () => {
    const url = window.location.origin;
    const text = projectName
      ? `הצטרפו אליי ל-GroupBuild — קונים יחד לבניין ${projectName} וחוסכים מאות שקלים. ${url}`
      : `הצטרפו אליי ל-GroupBuild — קונים יחד וחוסכים. ${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "GroupBuild", text, url });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("הקישור הועתק");
      }
    } catch { /* user cancelled */ }
  };

  if (isCommittee === null) {
    return <div className="min-h-screen bg-[#F7F6F2]"><LoadingState /></div>;
  }
  if (!isCommittee) {
    return (
      <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center" dir="rtl">
        <EmptyState
          icon={<Building2 className="w-7 h-7 text-[#0E6B5A]" />}
          title="דרוש אישור ועד בית"
          description="העמוד הזה זמין רק לנציגי ועד בית מאושרים. ניתן לבקש הרשאה והבקשה תיבדק על ידי הצוות."
          action={
            <button
              onClick={() => navigate("/committee/request")}
              className="h-12 px-6 rounded-xl bg-[#0E6B5A] text-white text-sm font-medium hover:bg-[#0c5a4c]"
            >בקש הרשאה</button>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F6F2]" dir="rtl">
      <BackHeader
        title="ועד בית"
        subtitle={projectName || undefined}
        right={
          <button
            onClick={() => navigate("/resident/notifications")}
            className="p-2 rounded-full hover:bg-[#F0EEE7]"
            aria-label="התראות"
          >
            <Bell className="w-5 h-5 text-[#1F1F1F]" />
          </button>
        }
      />

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Hero stats */}
        <section className="grid grid-cols-2 gap-3">
          <StatCard icon={<Building2 className="w-4 h-4 text-[#0E6B5A]" />} label="עסקאות פעילות בבניין" value={stats?.active_deals ?? 0} />
          <StatCard icon={<Users className="w-4 h-4 text-[#0E6B5A]" />} label="דיירים שהצטרפו" value={stats?.joiners ?? 0} />
          <StatCard icon={<TrendingUp className="w-4 h-4 text-[#0E6B5A]" />} label="חיסכון מצטבר" value={formatILS(stats?.savings ?? 0)} small />
          <StatCard icon={<Users className="w-4 h-4 text-[#0E6B5A]" />} label="דיירים רשומים" value={residentsCount} />
        </section>

        {/* Primary CTA */}
        <button
          onClick={() => navigate("/deals")}
          className="w-full flex items-center justify-between gap-3 bg-[#0E6B5A] text-white rounded-2xl px-5 py-4 hover:bg-[#0c5a4c] active:scale-[0.99] transition"
        >
          <div className="text-right">
            <div className="text-sm font-semibold">יזום עסקה קבוצתית לבניין</div>
            <div className="text-xs text-white/80 mt-0.5">עיין בעסקאות פתוחות והזמן דיירים להצטרף</div>
          </div>
          <Plus className="w-5 h-5" />
        </button>

        {/* Quick management tiles */}
        <section className="grid grid-cols-2 gap-3">
          <ActionTile icon={Search} title="עסקאות פעילות" desc="חפש והצטרף" onClick={() => navigate("/deals")} />
          <ActionTile icon={Share2} title="הזמן דיירים" desc="שתף קישור הצטרפות" onClick={handleShare} />
          <ActionTile icon={Megaphone} title="שלח עדכון" desc="ליצירת קשר עם דיירי הבניין" onClick={() => toast.info("בקרוב — שליחת הודעה לדיירים")} />
          <ActionTile icon={FileText} title="מסמכי הבניין" desc="פרוטוקולים והצעות מחיר" onClick={() => navigate("/resident/documents")} />
        </section>

        {/* Building deals list */}
        <section className="bg-white rounded-2xl border border-[#EDEAE3] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-[#0E6B5A]" />
            <h2 className="text-sm font-semibold text-[#1F1F1F]">עסקאות עם דיירים מהבניין</h2>
          </div>
          {buildingDeals.length === 0 ? (
            <p className="text-xs text-[#6B6B6B]">עדיין אין עסקאות עם דיירים מהבניין שלך.</p>
          ) : (
            <ul className="divide-y divide-[#F0EEE7]">
              {buildingDeals.map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => navigate(`/resident/deals/${d.id}`)}
                    className="w-full flex items-center justify-between gap-3 py-3 text-right hover:bg-[#F7F6F2] rounded-lg px-2 -mx-2 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-[#1F1F1F] truncate">{d.title}</div>
                      <div className="text-[11px] text-[#0E6B5A] font-semibold mt-0.5">{d.joiners} דיירים מהבניין הצטרפו</div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-[#9CA3AF] shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Tasks */}
        <section className="bg-white rounded-2xl border border-[#EDEAE3] p-5">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4 text-[#0E6B5A]" />
            <h2 className="text-sm font-semibold text-[#1F1F1F]">משימות לטיפול</h2>
          </div>
          {tasks.length === 0 ? (
            <p className="text-xs text-[#6B6B6B]">אין משימות פתוחות.</p>
          ) : (
            <ul className="space-y-2">
              {tasks.map(t => (
                <li key={t.id}>
                  <button
                    onClick={() => t.link && navigate(t.link)}
                    className="w-full text-right text-sm text-[#1F1F1F] py-2.5 px-3 rounded-xl bg-[#F7F6F2] hover:bg-[#EDEAE3]"
                  >{t.title}</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, small }: { icon: React.ReactNode; label: string; value: number | string; small?: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-[#EDEAE3] p-3">
      <div className="w-7 h-7 rounded-full bg-[#E8F1EE] flex items-center justify-center mb-2">{icon}</div>
      <div className={`font-semibold text-[#1F1F1F] ${small ? "text-sm" : "text-lg"}`}>{value}</div>
      <div className="text-[11px] text-[#6B6B6B] leading-tight mt-0.5">{label}</div>
    </div>
  );
}

function ActionTile({ icon: Icon, title, desc, onClick }: { icon: typeof Search; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl border border-[#EDEAE3] p-4 text-right hover:bg-[#FBFAF6] active:scale-[0.99] transition"
    >
      <div className="w-9 h-9 rounded-xl bg-[#E8F1EE] flex items-center justify-center mb-2">
        <Icon className="w-4 h-4 text-[#0E6B5A]" />
      </div>
      <div className="text-sm font-semibold text-[#1F1F1F] tracking-tight">{title}</div>
      <div className="text-[11px] text-[#6B6B6B] mt-0.5 leading-tight">{desc}</div>
    </button>
  );
}
