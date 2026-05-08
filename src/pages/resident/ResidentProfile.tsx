import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Building2, Phone, Mail, History, Pencil, FileText, EyeOff, Eye } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { formatILS, useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type DbDeposit = {
  id: string;
  deal_id: string;
  amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  refunded_at: string | null;
  is_hidden: boolean;
};

type DealMap = Record<string, { title: string }>;

const ACTIVE_STATUSES = new Set(["pending", "paid"]);
const HISTORY_STATUSES = new Set(["refunded", "cancelled", "failed"]);

export default function ResidentProfile() {
  const navigate = useNavigate();
  const { user, logout, projects } = useApp();
  const project = projects.find((p) => p.id === user?.projectId);
  const [myDeposits, setMyDeposits] = useState<DbDeposit[]>([]);
  const [deals, setDeals] = useState<DealMap>({});
  const [showHidden, setShowHidden] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadDeposits = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from("deposits")
      .select("id,deal_id,amount,status,created_at,paid_at,refunded_at,is_hidden")
      .eq("user_id", uid)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[ResidentProfile] deposits", error);
      return;
    }
    const list = (data ?? []) as DbDeposit[];
    setMyDeposits(list);
    const dealIds = Array.from(new Set(list.map((d) => d.deal_id)));
    if (dealIds.length) {
      const { data: dealRows } = await supabase.from("deals").select("id,title").in("id", dealIds);
      const m: DealMap = {};
      (dealRows ?? []).forEach((d: { id: string; title: string }) => { m[d.id] = { title: d.title }; });
      setDeals(m);
    } else {
      setDeals({});
    }
  }, []);

  const toggleHidden = async (id: string, currentlyHidden: boolean) => {
    setBusyId(id);
    try {
      const { error } = await supabase.from("deposits").update({ is_hidden: !currentlyHidden }).eq("id", id);
      if (error) throw error;
      toast.success(currentlyHidden ? "הוחזר לתצוגה" : "הוסתר מהתצוגה");
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (uid) await loadDeposits(uid);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "פעולה נכשלה");
    }
    setBusyId(null);
  };

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) return;

      await loadDeposits(uid);

      channel = supabase
        .channel(`resident-deposits-${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "deposits", filter: `user_id=eq.${uid}` },
          () => { void loadDeposits(uid); }
        )
        .subscribe();
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [loadDeposits]);

  const handleLogout = async () => {
    await logout();
    toast.success("התנתקת בהצלחה");
    navigate("/", { replace: true });
  };

  return (
    <MobileShell>
      <PageHeader title="הפרופיל שלי" subtitle="הפרטים והעסקאות שלך" back={false} />

      <div className="px-5 -mt-6 relative z-10 mb-5">
        <div className="gb-card p-5 text-center">
          <div className="h-20 w-20 rounded-full bg-gradient-gold mx-auto flex items-center justify-center text-3xl font-extrabold text-primary shadow-gold">
            {user?.name?.charAt(0)}
          </div>
          <h2 className="font-bold text-lg mt-3">{user?.name}</h2>
          <div className="text-xs text-muted-foreground">דייר{project ? ` · ${project.name}` : ""}</div>

          <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
            {user?.phone && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 text-gold" /> {user.phone}
              </div>
            )}
            {user?.email && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 text-gold" /> {user.email}
              </div>
            )}
            {project && user?.apartment && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4 text-gold" /> דירה {user.apartment}
              </div>
            )}
          </div>
        </div>
      </div>

      {(() => {
        const visibleDeposits = myDeposits.filter((d) => showHidden || !d.is_hidden);
        const activeDeposits = visibleDeposits.filter((d) => ACTIVE_STATUSES.has(d.status));
        const historyDeposits = visibleDeposits.filter((d) => HISTORY_STATUSES.has(d.status));
        const hiddenCount = myDeposits.filter((d) => d.is_hidden).length;

        const renderItem = (dep: DbDeposit) => {
          const dealMissing = !deals[dep.deal_id];
          const dealTitle = deals[dep.deal_id]?.title ?? "עסקה שנמחקה";
          const status = dep.status;
          const meta: { label: string; cls: string } =
            status === "paid" ? { label: "שולם", cls: "text-success bg-success/10" }
            : status === "pending" ? { label: "ממתין", cls: "text-primary bg-gold/15" }
            : status === "refunded" ? { label: "פיקדון הוחזר", cls: "text-muted-foreground bg-muted" }
            : status === "cancelled" ? { label: "בוטל", cls: "text-muted-foreground bg-muted" }
            : status === "failed" ? { label: "נכשל", cls: "text-destructive bg-destructive/10" }
            : { label: status, cls: "text-muted-foreground bg-muted" };
          const stampDate = status === "refunded" && dep.refunded_at
            ? new Date(dep.refunded_at).toLocaleDateString("he-IL")
            : status === "paid" && dep.paid_at
            ? new Date(dep.paid_at).toLocaleDateString("he-IL")
            : new Date(dep.created_at).toLocaleDateString("he-IL");
          return (
            <div key={dep.id} className={"gb-card p-4 " + (dep.is_hidden ? "opacity-60" : "")}>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-hero flex items-center justify-center text-xl shrink-0">🛒</div>
                <div className="flex-1 min-w-0">
                  <div className={"font-bold text-sm truncate " + (dealMissing ? "text-muted-foreground italic" : "")}>{dealTitle}</div>
                  <div className="text-[11px] text-muted-foreground">
                    פיקדון {formatILS(Number(dep.amount))} · {stampDate}
                    {status === "refunded" && dep.refunded_at ? " · הוחזר" : ""}
                  </div>
                </div>
                <div className="text-left">
                  <div className={"text-xs font-bold px-2 py-1 rounded-full " + meta.cls}>{meta.label}</div>
                </div>
              </div>
              <button
                onClick={() => toggleHidden(dep.id, dep.is_hidden)}
                disabled={busyId === dep.id}
                className="mt-2 w-full h-7 rounded-lg text-[11px] text-muted-foreground hover:text-primary hover:bg-muted/40 flex items-center justify-center gap-1 transition-smooth disabled:opacity-50"
              >
                {dep.is_hidden ? <><Eye className="h-3 w-3" /> החזר לתצוגה</> : <><EyeOff className="h-3 w-3" /> הסתר מהתצוגה</>}
              </button>
            </div>
          );
        };

        return (
          <>
            <section className="px-5 mb-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <History className="h-4 w-4 text-gold" />
                  פיקדונות פעילים
                </h2>
                {hiddenCount > 0 && (
                  <button
                    onClick={() => setShowHidden((v) => !v)}
                    className="text-[11px] text-muted-foreground hover:text-primary"
                  >
                    {showHidden ? `הסתר מוסתרים (${hiddenCount})` : `הצג מוסתרים (${hiddenCount})`}
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {activeDeposits.length === 0 && (
                  <div className="gb-card p-6 text-center text-sm text-muted-foreground">
                    אין פיקדונות פעילים.
                  </div>
                )}
                {activeDeposits.map(renderItem)}
              </div>
            </section>

            {historyDeposits.length > 0 && (
              <section className="px-5 mb-5">
                <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  היסטוריית פיקדונות
                </h2>
                <div className="space-y-2">{historyDeposits.map(renderItem)}</div>
              </section>
            )}
          </>
        );
      })()}

      <div className="px-5 space-y-2">
        <Button onClick={() => navigate("/resident/profile/edit")} className="w-full h-12 rounded-2xl bg-primary text-primary-foreground">
          <Pencil className="h-4 w-4 ml-2" /> עריכת פרופיל
        </Button>
        <Button onClick={() => navigate("/resident/documents")} variant="outline" className="w-full h-12 rounded-2xl border-secondary text-secondary">
          <FileText className="h-4 w-4 ml-2" /> המסמכים שלי
        </Button>
        <Button onClick={handleLogout} variant="outline" className="w-full h-12 rounded-2xl border-border">
          <LogOut className="h-4 w-4 ml-2" /> התנתקות
        </Button>
      </div>

      <BottomNav role="resident" />
    </MobileShell>
  );
}
