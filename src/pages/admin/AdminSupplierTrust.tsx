import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search, ShieldCheck, AlertTriangle, BadgeCheck, BadgeX, Ban, Star } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingState } from "@/components/ds";
import { BottomNav } from "@/components/layout/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Row = {
  id: string;
  business_name: string;
  verified_supplier: boolean;
  trust_score: number;
  complaints_count: number;
  successful_redemptions: number;
  is_suspended: boolean;
  is_active: boolean;
  approval_status: string;
};

export default function AdminSupplierTrust() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("suppliers")
      .select("id,business_name,verified_supplier,trust_score,complaints_count,successful_redemptions,is_suspended,is_active,approval_status")
      .eq("is_deleted", false)
      .order("trust_score", { ascending: false });
    if (error) toast.error("טעינה נכשלה");
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggle(id: string, field: "verified_supplier" | "is_suspended", value: boolean) {
    setBusy(id);
    const patch: Record<string, boolean> = { [field]: value };
    const { error } = await supabase.from("suppliers").update(patch as never).eq("id", id);
    setBusy(null);
    if (error) { toast.error("העדכון נכשל"); return; }
    toast.success("עודכן");
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
  }


  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(r => r.business_name.toLowerCase().includes(t));
  }, [rows, q]);

  return (
    <MobileShell>
      <PageHeader title="אמון ספקים" subtitle={`${filtered.length} ספקים`} />
      <div className="px-5 -mt-2 mb-3">
        <div className="relative">
          <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש ספק" className="h-10 pr-9 text-sm" />
        </div>
      </div>
      {loading ? (
        <div className="px-5 py-12 text-center text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> טוען…
        </div>
      ) : (
        <div className="px-5 space-y-3 pb-24">
          {filtered.map((r) => {
            const total = r.successful_redemptions + r.complaints_count;
            const rate = total > 0 ? Math.round((r.successful_redemptions / total) * 100) : 0;
            return (
              <div key={r.id} className="gb-card p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm truncate">{r.business_name}</h3>
                      {r.verified_supplier && (
                        <span className="text-fs-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 inline-flex items-center gap-1">
                          <BadgeCheck className="h-3 w-3" /> מאומת
                        </span>
                      )}
                      {r.is_suspended && (
                        <span className="text-fs-xs font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive inline-flex items-center gap-1">
                          <Ban className="h-3 w-3" /> מושעה
                        </span>
                      )}
                    </div>
                    <div className="text-fs-xs text-muted-foreground mt-0.5">
                      סטטוס: {r.approval_status} · {r.is_active ? "פעיל" : "כבוי"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-fs-xs py-2 border-t border-b border-border">
                  <div>
                    <div className="font-bold text-foreground inline-flex items-center gap-0.5 justify-center">
                      <Star className="h-3 w-3 text-[#0E6B5A]" /> {Number(r.trust_score).toFixed(1)}
                    </div>
                    <div className="text-muted-foreground">אמון</div>
                  </div>
                  <div className="border-x border-border">
                    <div className="font-bold text-emerald-700">{r.successful_redemptions}</div>
                    <div className="text-muted-foreground">מומשו</div>
                  </div>
                  <div className="border-l border-border">
                    <div className="font-bold text-destructive">{r.complaints_count}</div>
                    <div className="text-muted-foreground">תלונות</div>
                  </div>
                  <div>
                    <div className="font-bold text-primary">{rate}%</div>
                    <div className="text-muted-foreground">הצלחה</div>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant={r.verified_supplier ? "outline" : "default"}
                    disabled={busy === r.id}
                    onClick={() => toggle(r.id, "verified_supplier", !r.verified_supplier)}
                    className="flex-1"
                  >
                    {r.verified_supplier ? <BadgeX className="h-4 w-4 ml-1" /> : <ShieldCheck className="h-4 w-4 ml-1" />}
                    {r.verified_supplier ? "בטל אימות" : "אמת ספק"}
                  </Button>
                  <Button
                    size="sm"
                    variant={r.is_suspended ? "outline" : "destructive"}
                    disabled={busy === r.id}
                    onClick={() => toggle(r.id, "is_suspended", !r.is_suspended)}
                    className="flex-1"
                  >
                    {r.is_suspended ? "בטל השעיה" : "השעה"}
                  </Button>
                  <Link to={`/admin/complaints?supplier=${r.id}`} className="inline-flex items-center justify-center px-3 rounded-md border border-border text-fs-sm font-bold">
                    <AlertTriangle className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <BottomNav role="admin" />
    </MobileShell>
  );
}
