import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Users, TrendingUp, ClipboardList, Plus, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp, formatILS } from "@/store/AppStore";

interface Stats {
  project_id: string | null;
  active_deals: number;
  joiners: number;
  savings: number;
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
        const { data: proj } = await supabase
          .from("projects").select("name").eq("id", s.project_id).maybeSingle();
        if (!cancelled) setProjectName((proj as { name?: string } | null)?.name ?? "");
      }

      // Simple tasks list
      const t: Task[] = [];
      if ((s?.active_deals ?? 0) === 0) t.push({ id: "no-deals", title: "אין עסקאות פעילות בבניין — שווה ליזום אחת" });
      if ((s?.joiners ?? 0) > 0 && (s?.active_deals ?? 0) > 0) t.push({ id: "follow", title: `${s?.joiners} דיירים הצטרפו — מומלץ לשלוח עדכון`, link: "/deals" });
      t.push({ id: "share", title: "שתף את הפלטפורמה עם דיירים נוספים בבניין" });
      if (!cancelled) setTasks(t);
    })();
    return () => { cancelled = true; };
  }, [authReady, user, navigate]);

  if (isCommittee === null) {
    return <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center text-[#6B6B6B]">טוען…</div>;
  }
  if (!isCommittee) {
    return (
      <div className="min-h-screen bg-[#F7F6F2] flex flex-col items-center justify-center px-6 text-center" dir="rtl">
        <div className="w-14 h-14 rounded-full bg-[#E8F1EE] flex items-center justify-center mb-4">
          <Building2 className="w-7 h-7 text-[#0E6B5A]" />
        </div>
        <h1 className="text-lg font-semibold text-[#1F1F1F] mb-2">דרוש אישור ועד בית</h1>
        <p className="text-sm text-[#6B6B6B] mb-6 max-w-sm">העמוד הזה זמין רק לנציגי ועד בית מאושרים. ניתן לבקש הרשאה והבקשה תיבדק על ידי הצוות.</p>
        <button onClick={() => navigate("/committee/request")} className="h-12 px-6 rounded-xl bg-[#0E6B5A] text-white text-sm font-medium hover:bg-[#0c5a4c]">בקש הרשאה</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F6F2]" dir="rtl">
      <header className="sticky top-0 z-10 bg-white border-b border-[#EDEAE3]">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -mr-2 rounded-full hover:bg-[#F0EEE7]">
            <ArrowRight className="w-5 h-5 text-[#1F1F1F]" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-[#1F1F1F] truncate">ועד בית</h1>
            {projectName && <p className="text-xs text-[#6B6B6B] truncate">{projectName}</p>}
          </div>
          <button onClick={() => navigate("/resident/notifications")} className="p-2 rounded-full hover:bg-[#F0EEE7]">
            <Bell className="w-5 h-5 text-[#1F1F1F]" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Stats */}
        <section className="grid grid-cols-3 gap-3">
          <StatCard icon={<Building2 className="w-4 h-4 text-[#0E6B5A]" />} label="עסקאות פעילות" value={stats?.active_deals ?? 0} />
          <StatCard icon={<Users className="w-4 h-4 text-[#0E6B5A]" />} label="דיירים שהצטרפו" value={stats?.joiners ?? 0} />
          <StatCard icon={<TrendingUp className="w-4 h-4 text-[#0E6B5A]" />} label="חיסכון מצטבר" value={formatILS(stats?.savings ?? 0)} small />
        </section>

        {/* CTA */}
        <button
          onClick={() => navigate("/deals")}
          className="w-full flex items-center justify-between gap-3 bg-[#0E6B5A] text-white rounded-2xl px-5 py-4 hover:bg-[#0c5a4c]"
        >
          <div className="text-right">
            <div className="text-sm font-semibold">יזום עסקה קבוצתית לבניין</div>
            <div className="text-xs text-white/80 mt-0.5">עיין בעסקאות פתוחות והזמן דיירים להצטרף</div>
          </div>
          <Plus className="w-5 h-5" />
        </button>

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
