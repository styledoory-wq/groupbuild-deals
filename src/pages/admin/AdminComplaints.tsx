import { useEffect, useState } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Row = {
  id: string; issue_type: string; description: string; status: string;
  created_at: string; user_id: string; deal_id: string | null; supplier_id: string | null;
  suppliers?: { business_name: string | null } | null;
  profiles?: { full_name: string | null; email: string | null; phone: string | null } | null;
};

const STATUS = ["open", "in_review", "resolved", "dismissed"] as const;
const STATUS_LABEL: Record<string, string> = {
  open: "פתוח", in_review: "בטיפול", resolved: "נפתר", dismissed: "נדחה",
};

export default function AdminComplaints() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("complaints")
        .select("id, issue_type, description, status, created_at, user_id, deal_id, supplier_id")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[AdminComplaints] load failed", error);
        toast.error("שגיאה בטעינת תלונות");
        setLoading(false);
        return;
      }
      const base = (data ?? []) as unknown as Row[];
      // Enrich via separate lookups — no FK exists in DB, so embeds can't be used.
      const supplierIds = Array.from(new Set(base.map((r) => r.supplier_id).filter(Boolean))) as string[];
      const userIds = Array.from(new Set(base.map((r) => r.user_id).filter(Boolean))) as string[];
      const [supRes, profRes] = await Promise.all([
        supplierIds.length
          ? supabase.from("suppliers").select("id, business_name").in("id", supplierIds)
          : Promise.resolve({ data: [] as { id: string; business_name: string | null }[] }),
        userIds.length
          ? supabase.from("profiles").select("id, full_name, email, phone").in("id", userIds)
          : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null; phone: string | null }[] }),
      ]);
      const supMap = new Map((supRes.data ?? []).map((s) => [s.id, s]));
      const profMap = new Map((profRes.data ?? []).map((p) => [p.id, p]));
      setRows(base.map((r) => ({
        ...r,
        suppliers: r.supplier_id ? { business_name: supMap.get(r.supplier_id)?.business_name ?? null } : null,
        profiles: r.user_id ? {
          full_name: profMap.get(r.user_id)?.full_name ?? null,
          email: profMap.get(r.user_id)?.email ?? null,
          phone: profMap.get(r.user_id)?.phone ?? null,
        } : null,
      })));
      setLoading(false);
    })();
  }, []);

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("complaints").update({ status }).eq("id", id);
    if (error) { toast.error("עדכון נכשל"); return; }
    setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  }

  return (
    <MobileShell>
      <PageHeader title="תלונות" subtitle="דיווחי דיירים" />
      <div className="px-5 pb-28 space-y-3">
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-28 gb-skeleton rounded-2xl" />)}</div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl bg-card border border-border/60 p-10 text-center text-muted-foreground">
            אין תלונות פעילות
          </div>
        ) : rows.map(r => (
          <div key={r.id} className="rounded-2xl bg-card border border-border/60 p-4 space-y-3">
            <div className="flex justify-between gap-2">
              <div>
                <div className="font-bold text-foreground">{r.issue_type}</div>
                <div className="text-xs text-muted-foreground">
                  {r.profiles?.full_name ?? "—"} · {r.profiles?.phone ?? r.profiles?.email ?? ""}
                </div>
                {r.suppliers?.business_name && (
                  <div className="text-xs text-muted-foreground mt-0.5">ספק: {r.suppliers.business_name}</div>
                )}
              </div>
              <span className="text-fs-xs text-muted-foreground whitespace-nowrap">
                {new Date(r.created_at).toLocaleDateString("he-IL")}
              </span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{r.description}</p>
            <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      <BottomNav role="admin" />
    </MobileShell>
  );
}
