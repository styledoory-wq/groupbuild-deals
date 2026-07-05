import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Search, Eye, Calendar, MapPin, Users, Tag } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DEMAND_STATUSES, PROJECT_TYPES, statusMeta, projectTypeLabel } from "@/lib/demandStatus";
import { useApp } from "@/store/AppStore";

type Row = {
  id: string;
  description: string;
  category_id: string | null;
  city_id: string | null;
  region_id: string | null;
  project_type: string | null;
  admin_status: string;
  participants_count: number;
  created_at: string;
  deal_id: string | null;
  resident_user_id: string;
};

export default function AdminDemandList() {
  const navigate = useNavigate();
  const { categories, regions, cities } = useApp() as any;
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [ptype, setPtype] = useState<string>("all");
  const [hasOffer, setHasOffer] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("demand_requests")
      .select("id, description, category_id, city_id, region_id, project_type, admin_status, participants_count, created_at, deal_id, resident_user_id")
      .order("created_at", { ascending: false });
    if (!error) setRows((data as Row[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const catName = (id: string | null) => categories?.find((c: any) => c.id === id)?.name_he ?? "—";
  const regionName = (id: string | null) => regions?.find((r: any) => r.id === id)?.name_he ?? "—";
  const cityName = (id: string | null) => cities?.find((c: any) => c.id === id)?.name_he ?? "—";

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.admin_status !== status) return false;
      if (ptype !== "all" && r.project_type !== ptype) return false;
      if (hasOffer === "yes" && !r.deal_id) return false;
      if (hasOffer === "no" && r.deal_id) return false;
      if (term && !(r.description || "").toLowerCase().includes(term)) return false;
      return true;
    });
  }, [rows, q, status, ptype, hasOffer]);

  return (
    <MobileShell>
      <PageHeader title="ניהול ביקושים" back />
      <div className="p-3 space-y-3 pb-24" dir="rtl">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-3 text-muted-foreground" />
          <Input placeholder="חיפוש בתיאור..." value={q} onChange={(e) => setQ(e.target.value)} className="pr-9" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="סטטוס" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              {DEMAND_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={ptype} onValueChange={setPtype}>
            <SelectTrigger><SelectValue placeholder="סוג" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסוגים</SelectItem>
              {PROJECT_TYPES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={hasOffer} onValueChange={setHasOffer}>
            <SelectTrigger><SelectValue placeholder="הצעה" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              <SelectItem value="yes">יש הצעה</SelectItem>
              <SelectItem value="no">אין הצעה</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">אין ביקושים</div>
        ) : (
          <div className="grid gap-2">
            {filtered.map((r) => {
              const meta = statusMeta(r.admin_status);
              return (
                <button
                  key={r.id}
                  onClick={() => navigate(`/admin/demand/${r.id}`)}
                  className="text-right bg-card border rounded-lg p-3 hover:border-primary transition"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex flex-wrap gap-1">
                      <Badge className={meta.color} variant="outline">{meta.label}</Badge>
                      {r.deal_id && <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">יש הצעה</Badge>}
                    </div>
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="text-sm font-medium line-clamp-2 mb-2">{r.description}</div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1"><Tag className="w-3 h-3" />{catName(r.category_id)}</div>
                    <div>{projectTypeLabel(r.project_type)}</div>
                    <div className="flex items-center gap-1"><MapPin className="w-3 h-3" />{regionName(r.region_id)}</div>
                    <div>{cityName(r.city_id)}</div>
                    <div className="flex items-center gap-1"><Users className="w-3 h-3" />{r.participants_count} משתתפים</div>
                    <div className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(r.created_at).toLocaleDateString("he-IL")}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </MobileShell>
  );
}
