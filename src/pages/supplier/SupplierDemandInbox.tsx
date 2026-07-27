import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Inbox, MapPin, Tag, Users, Calendar, Clock, ThumbsUp, X, Send } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { ScreenHeader, LoadingState, ErrorState, EmptyState } from "@/components/ds";
import { supabase } from "@/integrations/supabase/client";
import { resolveSupplierForUser } from "@/lib/supplierAuth";
import { useApp } from "@/store/AppStore";
import { SUPPLIER } from "@/lib/supplierUi";

type InviteStatus = "pending" | "viewed" | "interested" | "declined" | "submitted_offer";

type Row = {
  invitation_id: string;
  status: InviteStatus;
  invited_at: string;
  demand_id: string;
  category_id: string | null;
  city_id: string | null;
  region_id: string | null;
  description: string;
  target_qty: number | null;
  deadline: string | null;
  created_at: string;
};

const GREEN = "#0E6B5A";
const BG = SUPPLIER.pageBg;

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - +new Date(iso)) / 60000);
  if (m < 1) return "עכשיו";
  if (m < 60) return `לפני ${m} ד׳`;
  const h = Math.floor(m / 60);
  if (h < 24) return `לפני ${h} שע׳`;
  const d = Math.floor(h / 24);
  return `לפני ${d} ימים`;
}

function StatusBadge({ s }: { s: InviteStatus }) {
  const map: Record<InviteStatus, { label: string; bg: string; fg: string }> = {
    pending: { label: "חדש", bg: "#FEF3C7", fg: "#92400E" },
    viewed: { label: "נצפה", bg: "#E5E7EB", fg: "#374151" },
    interested: { label: "מעוניין", bg: "#DCFCE7", fg: "#166534" },
    declined: { label: "לא רלוונטי", bg: "#FEE2E2", fg: "#991B1B" },
    submitted_offer: { label: "הוגשה הצעה", bg: "#DBEAFE", fg: "#1E40AF" },
  };
  const c = map[s];
  return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.fg }}>
      {c.label}
    </span>
  );
}

export default function SupplierDemandInbox() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusDemandId = searchParams.get("demand_id");
  const { categories } = useApp();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [regions, setRegions] = useState<Record<string, string>>({});
  const [cities, setCities] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        setError("יש להתחבר כספק כדי לצפות בביקושים.");
        setLoading(false);
        return;
      }
      const supplier = await resolveSupplierForUser<{ id: string }>(session.user.id, session.user.email, "id");
      if (!supplier) {
        setError("לא נמצא פרופיל ספק.");
        setLoading(false);
        return;
      }
      setSupplierId(supplier.id);

      const { data, error: qErr } = await supabase
        .from("demand_invitations")
        .select("id,status,invited_at,demand_id,demand_requests(id,category_id,city_id,region_id,description,target_qty,deadline,created_at)")
        .eq("supplier_id", supplier.id)
        .in("status", ["pending", "viewed", "interested"])
        .order("invited_at", { ascending: false });
      if (qErr) throw qErr;

      const list: Row[] = ((data ?? []) as unknown as Array<{
        id: string; status: InviteStatus; invited_at: string; demand_id: string;
        demand_requests: {
          id: string; category_id: string | null; city_id: string | null; region_id: string | null;
          description: string; target_qty: number | null; deadline: string | null; created_at: string;
        } | null;
      }>).map((r) => ({
        invitation_id: r.id,
        status: r.status,
        invited_at: r.invited_at,
        demand_id: r.demand_id,
        category_id: r.demand_requests?.category_id ?? null,
        city_id: r.demand_requests?.city_id ?? null,
        region_id: r.demand_requests?.region_id ?? null,
        description: r.demand_requests?.description ?? "",
        target_qty: r.demand_requests?.target_qty ?? null,
        deadline: r.demand_requests?.deadline ?? null,
        created_at: r.demand_requests?.created_at ?? r.invited_at,
      }));
      setRows(list);

      // Lookup city/region names
      const cityIds = Array.from(new Set(list.map((r) => r.city_id).filter(Boolean))) as string[];
      const regionIds = Array.from(new Set(list.map((r) => r.region_id).filter(Boolean))) as string[];
      if (cityIds.length) {
        const { data: cs } = await supabase.from("cities").select("id,name_he").in("id", cityIds);
        const map: Record<string, string> = {};
        (cs ?? []).forEach((c: { id: string; name_he: string }) => { map[c.id] = c.name_he; });
        setCities(map);
      }
      if (regionIds.length) {
        const { data: rs } = await supabase.from("regions").select("id,name_he").in("id", regionIds);
        const map: Record<string, string> = {};
        (rs ?? []).forEach((r: { id: string; name_he: string }) => { map[r.id] = r.name_he; });
        setRegions(map);
      }
    } catch (e) {
      console.error("[SupplierDemandInbox]", e);
      setError(e instanceof Error ? e.message : "שגיאה בטעינה");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const categoryName = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((c) => { map[c.id] = c.name; });
    return map;
  }, [categories]);

  // Auto-mark pending → viewed when opened, especially the focused one from notification
  useEffect(() => {
    if (!rows.length) return;
    const targets = rows.filter((r) => r.status === "pending" && (!focusDemandId || r.demand_id === focusDemandId));
    if (!targets.length) return;
    void (async () => {
      const ids = targets.map((t) => t.invitation_id);
      await supabase
        .from("demand_invitations")
        .update({ status: "viewed", viewed_at: new Date().toISOString() })
        .in("id", ids);
      setRows((prev) => prev.map((r) => (ids.includes(r.invitation_id) ? { ...r, status: "viewed" } : r)));
    })();
  }, [rows.length, focusDemandId]);

  const updateStatus = async (row: Row, next: InviteStatus) => {
    setBusy(row.invitation_id);
    const patch = {
      status: next,
      responded_at:
        next === "declined" || next === "interested" || next === "submitted_offer"
          ? new Date().toISOString()
          : null,
    };
    const { error: uErr } = await supabase
      .from("demand_invitations")
      .update(patch)
      .eq("id", row.invitation_id);
    setBusy(null);
    if (uErr) { toast.error(uErr.message); return; }
    if (next === "interested") {
      setRows((prev) => prev.map((r) => (r.invitation_id === row.invitation_id ? { ...r, status: next } : r)));
      toast.success("סימנת עניין בביקוש");
    } else {
      setRows((prev) => prev.filter((r) => r.invitation_id !== row.invitation_id));
      toast.success(next === "declined" ? "הביקוש הוסר מהתיבה" : "עברת ליצירת הצעה");
    }
  };

  const submitOffer = async (row: Row) => {
    await updateStatus(row, "submitted_offer");
    const q = new URLSearchParams();
    q.set("demand_id", row.demand_id);
    if (row.category_id) q.set("category_id", row.category_id);
    if (row.description) q.set("description", row.description.slice(0, 500));
    navigate(`/supplier/offers/new?${q.toString()}`);
  };

  return (
    <MobileShell>
      <ScreenHeader title="ביקושים באזור שלך" subtitle="בקשות פתוחות מדיירים — הגב מהר וזכה בהזדמנות" />
      <div className="px-5 pb-28" style={{ background: BG, minHeight: "100vh" }}>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState description={error} onRetry={() => { setLoading(true); void load(); }} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-8 w-8 text-[#9CA3AF]" />}
            title="אין ביקושים פתוחים כרגע"
            description="ברגע שיפורסם ביקוש בקטגוריה או באזור השירות שלך — הוא יופיע כאן."
          />
        ) : (
          <div className="space-y-3 mt-2">
            {rows.map((r) => {
              const highlight = focusDemandId && r.demand_id === focusDemandId;
              const location = [regions[r.region_id ?? ""], cities[r.city_id ?? ""]].filter(Boolean).join(" · ");
              return (
                <article
                  key={r.invitation_id}
                  className="bg-white rounded-2xl p-4 border transition"
                  style={{
                    borderColor: highlight ? GREEN : "#D5DED9",
                    boxShadow: highlight ? "0 4px 20px rgba(14,107,90,0.10)" : "0 1px 2px rgba(15,23,42,0.04)",
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Tag className="h-4 w-4 text-[#0E6B5A] shrink-0" strokeWidth={2.2} />
                      <span className="font-extrabold text-[15px] text-[#0F172A] truncate">
                        {r.category_id ? categoryName[r.category_id] ?? "בקשה" : "בקשה"}
                      </span>
                    </div>
                    <StatusBadge s={r.status} />
                  </div>

                  <p className="text-[14px] text-[#374151] leading-relaxed whitespace-pre-wrap">
                    {r.description}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-[#6B7280]">
                    {location && (
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {location}</span>
                    )}
                    {r.target_qty != null && (
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {r.target_qty} מתעניינים</span>
                    )}
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {timeAgo(r.created_at)}</span>
                    {r.deadline && (
                      <span className="flex items-center gap-1 text-[#B45309]">
                        <Clock className="h-3.5 w-3.5" /> עד {new Date(r.deadline).toLocaleDateString("he-IL")}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button
                      disabled={busy === r.invitation_id || r.status === "interested"}
                      onClick={() => updateStatus(r, "interested")}
                      className="h-10 rounded-xl border border-[#0E6B5A] text-[#0E6B5A] font-bold text-[13px] flex items-center justify-center gap-1 disabled:opacity-60"
                    >
                      <ThumbsUp className="h-4 w-4" /> מעוניין
                    </button>
                    <button
                      disabled={busy === r.invitation_id}
                      onClick={() => updateStatus(r, "declined")}
                      className="h-10 rounded-xl border border-[#D5DED9] text-[#6B7280] font-semibold text-[13px] flex items-center justify-center gap-1 disabled:opacity-60"
                    >
                      <X className="h-4 w-4" /> לא רלוונטי
                    </button>
                    <button
                      disabled={busy === r.invitation_id}
                      onClick={() => submitOffer(r)}
                      className="h-10 rounded-xl bg-[#0E6B5A] text-white font-bold text-[13px] flex items-center justify-center gap-1 disabled:opacity-60"
                    >
                      <Send className="h-4 w-4" /> הגש הצעה
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav role="supplier" />
    </MobileShell>
  );
}
