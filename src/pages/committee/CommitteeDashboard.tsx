import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Users, TrendingUp, ClipboardList, Plus, Bell, Share2, Megaphone, Search, FileText, ChevronLeft, FileEdit, X, Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp, formatILS } from "@/store/AppStore";
import { BackHeader, LoadingState, EmptyState } from "@/components/ds";
import { QuoteRequestSheet } from "@/components/committee/QuoteRequestSheet";

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

interface Category { id: string; name: string }
interface Supplier { id: string; business_name: string }

export default function CommitteeDashboard() {
  const navigate = useNavigate();
  const { user, authReady } = useApp();
  const [stats, setStats] = useState<Stats | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [residentsCount, setResidentsCount] = useState<number>(0);
  const [buildingDeals, setBuildingDeals] = useState<BuildingDeal[]>([]);
  const [isCommittee, setIsCommittee] = useState<boolean | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);

  // Quote sheet data
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

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
      if ((s?.active_deals ?? 0) === 0) t.push({ id: "no-deals", title: "אין עסקאות פעילות בקהילה — שווה ליזום אחת", link: "/deals" });
      if ((s?.joiners ?? 0) > 0 && (s?.active_deals ?? 0) > 0) t.push({ id: "follow", title: `${s?.joiners} דיירים הצטרפו — מומלץ לשלוח עדכון`, link: "/deals" });
      t.push({ id: "share", title: "שתף את הפלטפורמה עם דיירים נוספים בקהילה" });
      if (!cancelled) setTasks(t);
    })();
    return () => { cancelled = true; };
  }, [authReady, user, navigate]);

  // Load categories & suppliers when quote sheet opens
  useEffect(() => {
    if (!quoteOpen) return;
    let cancelled = false;
    (async () => {
      const [{ data: cats }, { data: sups }] = await Promise.all([
        supabase.from("categories").select("id,name").eq("is_active", true).order("name"),
        supabase.from("suppliers").select("id,business_name").eq("is_active", true).eq("is_deleted", false).in("approval_status", ["approved", "active"]).order("business_name"),
      ]);
      if (cancelled) return;
      setCategories((cats ?? []) as Category[]);
      setSuppliers((sups ?? []) as Supplier[]);
    })();
    return () => { cancelled = true; };
  }, [quoteOpen]);

  const handleShare = async () => {
    const url = window.location.origin;
    const text = projectName
      ? `הצטרפו אליי ל-GroupBuild — קונים יחד ל${projectName} וחוסכים מאות שקלים. ${url}`
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
          <StatCard icon={<Building2 className="w-4 h-4 text-[#0E6B5A]" />} label="עסקאות פעילות בקהילה" value={stats?.active_deals ?? 0} />
          <StatCard icon={<Users className="w-4 h-4 text-[#0E6B5A]" />} label="דיירים שהצטרפו" value={stats?.joiners ?? 0} />
          <StatCard icon={<TrendingUp className="w-4 h-4 text-[#0E6B5A]" />} label="חיסכון מצטבר" value={formatILS(stats?.savings ?? 0)} small />
          <StatCard icon={<Users className="w-4 h-4 text-[#0E6B5A]" />} label="דיירים רשומים" value={residentsCount} />
        </section>

        {/* Primary CTA */}
        <button
          onClick={() => setQuoteOpen(true)}
          className="w-full flex items-center justify-between gap-3 bg-[#0E6B5A] text-white rounded-2xl px-5 py-4 hover:bg-[#0c5a4c] active:scale-[0.99] transition"
        >
          <div className="text-right">
            <div className="text-sm font-semibold">יזום עסקה קבוצתית בקהילה</div>
            <div className="text-xs text-white/80 mt-0.5">בקש הצעת מחיר מספקים לפי כמות דיירים ומחיר יעד</div>
          </div>
          <Plus className="w-5 h-5" />
        </button>

        {/* Quick management tiles */}
        <section className="grid grid-cols-2 gap-3">
          <ActionTile icon={FileEdit} title="בקש הצעת מחיר" desc="עם מחיר יעד וכמות דיירים" onClick={() => setQuoteOpen(true)} />
          <ActionTile icon={Search} title="עסקאות פעילות" desc="חפש והצטרף" onClick={() => navigate("/deals")} />
          <ActionTile icon={Share2} title="הזמן דיירים" desc="הודעות מוכנות לוואטסאפ" onClick={() => setInviteOpen(true)} />
          <ActionTile icon={Megaphone} title="שלח עדכון" desc="ליצירת קשר עם דיירי הקהילה" onClick={() => toast.info("בקרוב — שליחת הודעה לדיירים")} />
          <ActionTile icon={FileText} title="מסמכי הקהילה" desc="פרוטוקולים והצעות מחיר" onClick={() => navigate("/resident/documents")} />
        </section>

        {/* Building deals list */}
        <section className="bg-white rounded-2xl border border-[#EDEAE3] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-[#0E6B5A]" />
            <h2 className="text-sm font-semibold text-[#1F1F1F]">עסקאות עם דיירים מהקהילה</h2>
          </div>
          {buildingDeals.length === 0 ? (
            <p className="text-xs text-[#6B6B6B]">עדיין אין עסקאות עם דיירים מהקהילה שלך.</p>
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
                      <div className="text-[11px] text-[#0E6B5A] font-semibold mt-0.5">{d.joiners} דיירים מהקהילה הצטרפו</div>
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

      {inviteOpen && (
        <InviteSheet
          projectName={projectName}
          onClose={() => setInviteOpen(false)}
          onNativeShare={handleShare}
        />
      )}

      {quoteOpen && (
        <QuoteRequestSheet
          projectName={projectName}
          projectId={stats?.project_id ?? null}
          categories={categories}
          suppliers={suppliers}
          onClose={() => setQuoteOpen(false)}
        />
      )}
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

function InviteSheet({ projectName, onClose, onNativeShare }: { projectName: string; onClose: () => void; onNativeShare: () => void }) {
  const url = typeof window !== "undefined" ? window.location.origin : "https://groupbuild.co.il";
  const building = projectName ? projectName : "הקהילה שלנו";

  const templates = useMemo(() => [
    {
      id: "general",
      label: "הזמנה כללית",
      text:
`שלום שכנים 👋
פתחנו ב-${building} קבוצת רכישה משותפת ב-GroupBuild — מתאחדים יחד וחוסכים מאות ש״ח על מוצרים ושירותים לבית החדש (מזגנים, ריהוט, מטבחים, מוצרי חשמל ועוד).

🔗 הצטרפו כאן: ${url}

ככל שנהיה יותר — נקבל מחירים טובים יותר 💪`,
    },
    {
      id: "deal",
      label: "יש עסקה חמה",
      text:
`היי שכנים 🔥
יש עסקה קבוצתית חדשה ב-GroupBuild שמתאימה ל-${building} — המחיר יורד ככל שיותר דיירים מצטרפים.

📲 כנסו, בדקו והצטרפו: ${url}

שווה לבדוק לפני שזה נסגר 🙏`,
    },
    {
      id: "reminder",
      label: "תזכורת קצרה",
      text:
`תזכורת קטנה 🙂
מי שעוד לא נרשם ל-GroupBuild של ${building} — מוזמן להירשם בקישור:
${url}

ככה תקבלו עדכון על כל עסקה קבוצתית שאני פותח בקהילה שלנו.`,
    },
    {
      id: "personal",
      label: "פנייה אישית",
      text:
`היי, מה נשמע? 🙂
אני מארגן ב-${building} רכישות קבוצתיות דרך פלטפורמת GroupBuild — חוסכים יחד הרבה כסף על מוצרים לדירה החדשה.
אשמח שתצטרף/י:
${url}`,
    },
  ], [building, url]);

  const send = (text: string) => {
    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(wa, "_blank", "noopener,noreferrer");
  };
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast.success("ההודעה הועתקה"); }
    catch { toast.error("ההעתקה נכשלה"); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose} dir="rtl">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[88vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDEAE3] sticky top-0 bg-white">
          <div>
            <h2 className="text-base font-semibold text-[#1F1F1F]">הזמנת דיירים בוואטסאפ</h2>
            <p className="text-[11px] text-[#6B6B6B] mt-0.5">בחר הודעה מוכנה — שלח או העתק</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[#F0EEE7]" aria-label="סגור">
            <X className="w-4 h-4 text-[#1F1F1F]" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="bg-[#FBFAF6] border border-[#EDEAE3] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#0E6B5A]">{t.label}</span>
              </div>
              <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#1F1F1F] font-sans">{t.text}</pre>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => send(t.text)}
                  className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-[#25D366] text-white text-sm font-semibold hover:brightness-105"
                >
                  <MessageCircle className="w-4 h-4" />
                  שלח בוואטסאפ
                </button>
                <button
                  onClick={() => copy(t.text)}
                  className="inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl border border-[#EDEAE3] text-sm text-[#1F1F1F] hover:bg-[#F7F6F2]"
                >
                  <Copy className="w-4 h-4" />
                  העתק
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={onNativeShare}
            className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl border border-[#EDEAE3] text-sm text-[#1F1F1F] hover:bg-[#F7F6F2]"
          >
            <Share2 className="w-4 h-4" />
            שיתוף כללי (אפליקציות נוספות)
          </button>
        </div>
      </div>
    </div>
  );
}
