import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, CheckCircle2, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/store/AppStore";
import { BackHeader, LoadingState, EmptyState } from "@/components/ds";
import { statusMeta, projectTypeLabel } from "@/lib/demandStatus";

interface DemandRow {
  id: string;
  description: string;
  project_type: string | null;
  admin_status: string;
  participants_count: number;
  created_at: string;
  category_id: string | null;
  city_id: string | null;
  deal_id: string | null;
}

export default function MyDemands() {
  const navigate = useNavigate();
  const { user, authReady } = useApp();
  const [params] = useSearchParams();
  const [rows, setRows] = useState<DemandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({});
  const [cityNames, setCityNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (params.get("created") === "1") {
      toast.success("הבקשה שלך נשלחה! נעדכן אותך בהתקדמות.");
    }
  }, [params]);

  useEffect(() => {
    if (!authReady) return;
    if (!user?.id) { navigate("/auth/resident"); return; }
    (async () => {
      const { data } = await supabase
        .from("demand_requests")
        .select("id, description, project_type, admin_status, participants_count, created_at, category_id, city_id, deal_id")
        .eq("resident_user_id", user.id)
        .order("created_at", { ascending: false });
      const list = (data ?? []) as DemandRow[];
      setRows(list);
      const catIds = Array.from(new Set(list.map((r) => r.category_id).filter(Boolean))) as string[];
      const cityIds = Array.from(new Set(list.map((r) => r.city_id).filter(Boolean))) as string[];
      const [{ data: cats }, { data: cts }] = await Promise.all([
        catIds.length ? supabase.from("categories").select("id,name").in("id", catIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
        cityIds.length ? supabase.from("cities").select("id,name_he").in("id", cityIds) : Promise.resolve({ data: [] as { id: string; name_he: string }[] }),
      ]);
      const cm: Record<string, string> = {};
      (cats ?? []).forEach((c) => { cm[c.id] = c.name; });
      setCategoryNames(cm);
      const ctm: Record<string, string> = {};
      (cts ?? []).forEach((c) => { ctm[c.id] = c.name_he; });
      setCityNames(ctm);
      setLoading(false);
    })();
  }, [authReady, user, navigate]);

  if (loading) {
    return <div className="min-h-screen bg-[#F7F6F2]"><LoadingState /></div>;
  }

  return (
    <div className="min-h-screen bg-[#F7F6F2] pb-24" dir="rtl">
      <BackHeader title="הבקשות שלי" onBack={() => navigate("/resident")} />

      <div className="px-5 pt-4">
        <button
          onClick={() => navigate("/resident/demand/new")}
          className="w-full h-12 rounded-xl bg-[#0E6B5A] text-white text-[14px] font-semibold inline-flex items-center justify-center gap-2 mb-4"
        >
          <Plus className="h-4 w-4" strokeWidth={2.6} /> בקשה חדשה
        </button>

        {rows.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="w-7 h-7 text-[#0E6B5A]" />}
            title="אין עדיין בקשות"
            description="פתח בקשה קבוצתית ואנחנו נאתר עבורך ספקים במחירים משתלמים."
          />
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const meta = statusMeta(r.admin_status);
              return (
                <div key={r.id} className="bg-white rounded-2xl border border-[#E5E5EA] p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="text-[14px] font-semibold text-[#1C1C1E] flex-1">
                      {r.category_id ? (categoryNames[r.category_id] ?? "בקשה") : "בקשה"}
                      {r.project_type && <span className="text-[12px] text-[#8E8E93] font-normal"> · {projectTypeLabel(r.project_type)}</span>}
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${meta.color}`}>{meta.label}</span>
                  </div>
                  <div className="text-[12px] text-[#8E8E93] line-clamp-2 mb-2">{r.description}</div>
                  <div className="flex items-center gap-3 text-[11px] text-[#8E8E93]">
                    {r.city_id && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {cityNames[r.city_id] ?? ""}</span>}
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(r.created_at).toLocaleDateString("he-IL")}</span>
                    <span>· {r.participants_count} משתתפים</span>
                  </div>
                  {r.deal_id && (
                    <button
                      onClick={() => navigate(`/resident/deals/${r.deal_id}`)}
                      className="mt-3 w-full h-9 rounded-lg bg-[#0E6B5A]/10 text-[#0E6B5A] text-[12px] font-semibold"
                    >
                      צפה בהצעה שנוצרה
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
