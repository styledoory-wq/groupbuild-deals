import { useEffect, useMemo, useState } from "react";
import { Search, TrendingUp, Users, CheckCircle2 } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Row = {
  id: string; code: string; status: string; reference_number: string;
  user_id: string; deal_id: string; redeemed_at: string | null;
  deals?: { title: string | null; discounted_price: number | null; original_price: number | null } | null;
  profiles?: { full_name: string | null; project_id: string | null } | null;
};

const STATUSES = ["eligible","appointment","measured","ordered","installed","completed","redeemed"] as const;
const STATUS_LABEL: Record<string, string> = {
  eligible: "זכאי", appointment: "נקבעה פגישה", measured: "נלקחו מידות",
  ordered: "בהזמנה", installed: "הותקן", completed: "הושלם", redeemed: "מומש",
  expired: "פג תוקף", cancelled: "בוטל",
};

export default function SupplierRedemptions() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) { setLoading(false); return; }
      const { data: supplier } = await supabase
        .from("suppliers").select("id").eq("user_id", s.session.user.id).maybeSingle();
      if (!supplier) { setLoading(false); return; }
      const { data } = await supabase
        .from("vouchers")
        .select("id, code, status, reference_number, user_id, deal_id, redeemed_at, deals(title, discounted_price, original_price), profiles:user_id(full_name, project_id)")
        .eq("supplier_id", supplier.id)
        .order("created_at", { ascending: false });
      setRows((data ?? []) as unknown as Row[]);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const redeemed = rows.filter(r => r.status === "redeemed").length;
    const potential = rows.reduce((s, r) => s + (r.deals?.discounted_price ?? r.deals?.original_price ?? 0), 0);
    return { total, redeemed, rate: total ? Math.round((redeemed / total) * 100) : 0, potential };
  }, [rows]);

  const filtered = rows.filter(r =>
    !q || (r.profiles?.full_name ?? "").includes(q) || r.code.includes(q.toUpperCase()) || (r.deals?.title ?? "").includes(q)
  );

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("vouchers").update({ status }).eq("id", id);
    if (error) { toast.error("עדכון נכשל"); return; }
    setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    toast.success("הסטטוס עודכן");
  }

  return (
    <MobileShell>
      <PageHeader title="מימושים" subtitle="לקוחות זכאים והתקדמות המימוש" />

      <div className="px-5 pb-28 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <StatCard icon={Users} label="זכאים" value={stats.total.toString()} />
          <StatCard icon={CheckCircle2} label="מומש" value={stats.redeemed.toString()} />
          <StatCard icon={TrendingUp} label="% מימוש" value={`${stats.rate}%`} />
        </div>
        <div className="rounded-2xl bg-primary text-primary-foreground p-4">
          <div className="text-fs-xs uppercase tracking-wider text-primary-foreground/60">פוטנציאל הכנסה</div>
          <div className="text-2xl font-bold gb-gold-text mt-1">₪{stats.potential.toLocaleString("he-IL")}</div>
        </div>

        <div className="relative">
          <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש לפי שם, קוד או הצעה" className="pr-9" />
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 gb-skeleton rounded-2xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl bg-card border border-border/60 p-10 text-center text-muted-foreground">
            אין עדיין מימושים להצגה
          </div>
        ) : filtered.map(r => (
          <div key={r.id} className="rounded-2xl bg-card border border-border/60 p-4 space-y-2">
            <div className="flex justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold text-foreground truncate">{r.profiles?.full_name ?? "דייר"}</div>
                <div className="text-xs text-muted-foreground truncate">{r.deals?.title} · {r.profiles?.project_id ?? ""}</div>
              </div>
              <span className="font-mono text-fs-xs text-muted-foreground whitespace-nowrap">{r.code}</span>
            </div>
            <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)} disabled={r.status === "redeemed"}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      <BottomNav role="supplier" />
    </MobileShell>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border/60 p-3 text-center">
      <Icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
      <div className="text-lg font-bold text-foreground">{value}</div>
      <div className="text-fs-xs text-muted-foreground">{label}</div>
    </div>
  );
}
